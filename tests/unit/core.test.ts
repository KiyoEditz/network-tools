// tests/unit/core.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { VariableEngine } from '../../src/main/services/variable-engine.js';
import { AppCookieJar } from '../../src/main/services/cookie-jar.js';
import { VirtualStorageService } from '../../src/main/services/virtual-storage.js';
import { ScriptSandbox } from '../../src/main/services/script-sandbox.js';

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
