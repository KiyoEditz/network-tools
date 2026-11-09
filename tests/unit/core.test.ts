// tests/unit/core.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { VariableEngine } from '../../src/main/services/variable-engine.js';
import { AppCookieJar } from '../../src/main/services/cookie-jar.js';
import { VirtualStorageService } from '../../src/main/services/virtual-storage.js';
import { ScriptSandbox } from '../../src/main/services/script-sandbox.js';
import { parseRawHandshake } from '../../src/shared/raw-handshake-parser.js';

test('VariableEngine: resolves environment variables and built-in generators', () => {
  const env = [
    { id: '1', key: 'baseUrl', value: 'https://api.example.com', enabled: true },
    { id: '2', key: 'apiVersion', value: 'v2', enabled: true },
  ];

  const input = '{{baseUrl}}/{{apiVersion}}/users/{{$guid}}?time={{$timestamp}}&int={{$randomInt(10, 20)}}';
  const resolved = VariableEngine.resolve(input, { environment: env });

  assert.match(resolved, /^https:\/\/api\.example\.com\/v2\/users\/[0-9a-f-]{36}\?time=\d+&int=\d+$/);
});

test('VariableEngine: resolves $randomCountryIp for Japan and US', () => {
  const ipJp = VariableEngine.resolve('{{$randomCountryIp(JP)}}');
  assert.match(ipJp, /^\d+\.\d+\.\d+\.\d+$/);

  const ipUs = VariableEngine.resolve('{{$randomCountryIp(US)}}');
  assert.match(ipUs, /^\d+\.\d+\.\d+\.\d+$/);
});

test('AppCookieJar: parses, stores, and attaches cookies to matching domain and path', async () => {
  const jar = new AppCookieJar();
  await jar.setCookie('session_id=abc12345; Domain=example.com; Path=/; HttpOnly', 'https://example.com/api');

  const cookieHeader = await jar.getCookieHeader('https://example.com/api/v1/profile');
  assert.equal(cookieHeader, 'session_id=abc12345');

  // Should NOT send cookie to mismatched domain
  const otherHeader = await jar.getCookieHeader('https://another-domain.com/api');
  assert.equal(otherHeader, '');
});

test('VirtualStorageService: sets, retrieves, and isolates origin-scoped storage', () => {
  const storage = new VirtualStorageService();
  storage.setItem('https://app.test', 'localStorage', 'jwtToken', 'sample.jwt.token');
  storage.setItem('https://app.test', 'sessionStorage', 'activeSession', 'sess_998');

  assert.equal(storage.getItem('https://app.test', 'localStorage', 'jwtToken'), 'sample.jwt.token');
  assert.equal(storage.getItem('https://app.test', 'sessionStorage', 'activeSession'), 'sess_998');

  // Different origin should not see the keys
  assert.equal(storage.getItem('https://different.test', 'localStorage', 'jwtToken'), null);
});

test('ScriptSandbox: executes pre-request and test assertions correctly', () => {
  const script = `
    pm.test("Status code is 200", () => {
      pm.expect(pm.response.status).to.equal(200);
    });
    pm.test("Body includes success", () => {
      pm.expect(pm.response.text()).to.include("success");
    });
    pm.environment.set("extractedToken", "token_from_test_123");
  `;

  const env = [{ id: '1', key: 'extractedToken', value: '', enabled: true }];
  const result = ScriptSandbox.run(script, {
    origin: 'http://localhost',
    environment: env,
    response: {
      status: 200,
      statusText: 'OK',
      body: JSON.stringify({ status: 'success', data: 'ok' }),
    },
  });

  assert.equal(result.testResults.length, 2);
  assert.equal(result.testResults[0].passed, true);
  assert.equal(result.testResults[1].passed, true);
  assert.equal(env.find((e) => e.key === 'extractedToken')?.value, 'token_from_test_123');
});

test('parseRawHandshake: accurately parses Character.AI raw handshake and DevTools formats', () => {
  const raw = `GET wss://neo.character.ai/ws/ HTTP/1.1
Host: neo.character.ai
Connection: Upgrade
Pragma: no-cache
Cache-Control: no-cache
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
Upgrade: websocket
Origin: https://character.ai
Sec-WebSocket-Version: 13
Accept-Encoding: gzip, deflate, br, zstd
Accept-Language: id,en-US;q=0.9,en;q=0.8,ja;q=0.7
Sec-WebSocket-Key: QwkyrWhFzFVx0OrcoQNTHg==
Sec-WebSocket-Extensions: permessage-deflate; client_max_window_bits`;

  const parsed = parseRawHandshake(raw);
  assert.equal(parsed.url, 'wss://neo.character.ai/ws/');
  assert.equal(parsed.headers.length, 12);

  const originHeader = parsed.headers.find((h) => h.key.toLowerCase() === 'origin');
  assert.equal(originHeader?.value, 'https://character.ai');

  const uaHeader = parsed.headers.find((h) => h.key.toLowerCase() === 'user-agent');
  assert.match(uaHeader?.value || '', /Chrome\/156/);

  // Test relative path + Host header format
  const devToolsRaw = `GET /ws/v2?token=abc HTTP/1.1
Host: chat.example.com
Sec-WebSocket-Protocol: graphql-ws, wamp`;
  const parsedRelative = parseRawHandshake(devToolsRaw);
  assert.equal(parsedRelative.url, 'wss://chat.example.com/ws/v2?token=abc');
  assert.deepEqual(parsedRelative.subprotocols, ['graphql-ws', 'wamp']);

  // Test cURL copied directly from Chrome DevTools
  const curlRaw = `curl 'https://neo.character.ai/ws/' \\
    -H 'Origin: https://character.ai' \\
    -H 'Cookie: GCLB="5f67a5315be3f898"; HTTP_AUTHORIZATION="Token c4d062e3eb831c81ca65fb60b7d4ef5c9f6c"' \\
    -H 'Sec-WebSocket-Protocol: chat-protocol'`;
  const parsedCurl = parseRawHandshake(curlRaw);
  assert.equal(parsedCurl.url, 'wss://neo.character.ai/ws/');
  assert.equal(parsedCurl.headers.length, 3);
  assert.equal(parsedCurl.headers.find((h) => h.key === 'Cookie')?.value, 'GCLB="5f67a5315be3f898"; HTTP_AUTHORIZATION="Token c4d062e3eb831c81ca65fb60b7d4ef5c9f6c"');
  assert.deepEqual(parsedCurl.subprotocols, ['chat-protocol']);
});
