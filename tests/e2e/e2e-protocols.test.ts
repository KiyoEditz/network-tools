// tests/e2e/e2e-protocols.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { startMockServers, MockServersHandle } from '../mocks/server.js';
import { HttpClient } from '../../src/main/services/http-client.js';
import { globalWsSseEngine } from '../../src/main/services/ws-sse-engine.js';
import { globalSocketEngine } from '../../src/main/services/socket-engine.js';
import { globalGrpcMqttEngine } from '../../src/main/services/grpc-mqtt-engine.js';

function waitMs(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test('E2E: Full Protocol Suite Verification with Mock Server', async (t) => {
  let mockServers: MockServersHandle;

  mockServers = await startMockServers();
  await waitMs(500);

  t.after(async () => {
    await mockServers.stop();
  });

  // =================== TEST 1: HTTP GET /api/users ===================
  await t.test('HTTP: GET /api/users returns 200 OK and JSON users array', async () => {
    const res = await HttpClient.execute({
      id: 'test-1',
      method: 'GET',
      url: 'http://127.0.0.1:9080/api/users',
      headers: [],
      queryParams: [],
      bodyType: 'none',
      auth: { type: 'none' },
    });

    assert.equal(res.status, 200);
    assert.match(res.contentType, /json/);
    const body = JSON.parse(res.body);
    assert.equal(body.status, 'success');
    assert.equal(body.data.length, 2);
    assert.equal(body.data[0].name, 'Alice');
  });

  // =================== TEST 2: HTTP POST /api/users ===================
  await t.test('HTTP: POST /api/users returns 201 Created', async () => {
    const res = await HttpClient.execute({
      id: 'test-2',
      method: 'POST',
      url: 'http://127.0.0.1:9080/api/users',
      headers: [{ id: '1', key: 'Content-Type', value: 'application/json', enabled: true }],
      queryParams: [],
      bodyType: 'raw',
      rawBodyFormat: 'json',
      rawBodyContent: JSON.stringify({ name: 'Charlie', email: 'charlie@test.org' }),
      auth: { type: 'none' },
    });

    assert.equal(res.status, 201);
    const body = JSON.parse(res.body);
    assert.equal(body.status, 'created');
    assert.equal(body.received.name, 'Charlie');
  });

  // =================== TEST 3: COOKIE JAR AUTO-CAPTURE & INJECTION ===================
  await t.test('HTTP: Auto captures Set-Cookie and injects into subsequent requests', async () => {
    // 1. Hit cookie-test endpoint
    const res1 = await HttpClient.execute({
      id: 'test-cookie-1',
      method: 'GET',
      url: 'http://127.0.0.1:9080/api/cookie-test',
      headers: [],
      queryParams: [],
      bodyType: 'none',
      auth: { type: 'none' },
    });

    assert.equal(res1.status, 200);
    assert.ok(res1.cookies.some((c) => c.includes('session_id')));

    // 2. Hit cookie-check endpoint to verify Cookie header is auto-injected
    const res2 = await HttpClient.execute({
      id: 'test-cookie-2',
      method: 'GET',
      url: 'http://127.0.0.1:9080/api/cookie-check',
      headers: [],
      queryParams: [],
      bodyType: 'none',
      auth: { type: 'none' },
    });

    assert.equal(res2.status, 200);
    const checkBody = JSON.parse(res2.body);
    assert.match(checkBody.receivedCookie, /session_id=net_tester_secret_9988/);
  });

  // =================== TEST 4: GEO & CLIENT IP SPOOFING ===================
  await t.test('HTTP: Injects Geo-IP and Client Spoofing Headers', async () => {
    const res = await HttpClient.execute({
      id: 'test-geo',
      method: 'GET',
      url: 'http://127.0.0.1:9080/api/geo-check',
      headers: [],
      queryParams: [],
      bodyType: 'none',
      auth: { type: 'none' },
      geoSpoof: {
        enabled: true,
        customIp: '202.166.192.55',
        countryCode: 'SG',
      },
    });

    assert.equal(res.status, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.forwardedFor, '202.166.192.55');
    assert.equal(body.cfConnectingIp, '202.166.192.55');
    assert.equal(body.cfCountry, 'SG');
  });

  // =================== TEST 5: MEDIA VIEWER (PNG) ===================
  await t.test('HTTP: Fetches binary media and encodes to base64 for viewer', async () => {
    const res = await HttpClient.execute({
      id: 'test-media',
      method: 'GET',
      url: 'http://127.0.0.1:9080/media/sample.png',
      headers: [],
      queryParams: [],
      bodyType: 'none',
      auth: { type: 'none' },
    });

    assert.equal(res.status, 200);
    assert.equal(res.isBase64, true);
    assert.equal(res.contentType, 'image/png');
    assert.ok(res.sizeBytes > 0);
  });

  // =================== TEST 6: WEBSOCKET ECHO ===================
  await t.test('WebSocket: Connects and receives echo messages', async () => {
    let receivedEcho = false;
    const sessionId = 'ws-test-session';

    await globalWsSseEngine.connectWs(
      sessionId,
      'ws://127.0.0.1:9081',
      {},
      (ev) => {
        if (ev.direction === 'IN' && ev.type === 'message' && ev.payload === 'Hello WS Echo!') {
          receivedEcho = true;
        }
      }
    );

    await waitMs(300);
    globalWsSseEngine.sendWs(sessionId, 'Hello WS Echo!', 'text', () => {});
    await waitMs(300);

    assert.equal(receivedEcho, true);
    globalWsSseEngine.disconnectWs(sessionId);
  });

  // =================== TEST 7: TCP ECHO SOCKET ===================
  await t.test('TCP: Connects to socket and receives echoed data', async () => {
    let receivedTcp = false;
    const sessionId = 'tcp-test-session';

    await globalSocketEngine.connectTcpClient(
      sessionId,
      { host: '127.0.0.1', port: 9001 },
      (ev) => {
        if (ev.direction === 'IN' && ev.type === 'packet' && ev.payload.includes('TCP_PACKET_99')) {
          receivedTcp = true;
        }
      }
    );

    await waitMs(300);
    globalSocketEngine.sendTcp(sessionId, 'TCP_PACKET_99\n', 'text');
    await waitMs(300);

    assert.equal(receivedTcp, true);
    globalSocketEngine.disconnectTcp(sessionId);
  });

  // =================== TEST 8: UDP ECHO SOCKET ===================
  await t.test('UDP: Sends datagram and receives echo reply', async () => {
    const sessionId = 'udp-test-session';

    const receivedUdp = await new Promise<boolean>(async (resolve) => {
      const timer = setTimeout(() => resolve(false), 2500);

      await globalSocketEngine.createUdpSocket(
        sessionId,
        { bindPort: 9099 },
        (ev) => {
          if (ev.direction === 'IN' && ev.payload.includes('UDP_ECHO_DATA')) {
            clearTimeout(timer);
            resolve(true);
          }
        }
      );

      await waitMs(100);
      globalSocketEngine.sendUdp(sessionId, { host: '127.0.0.1', port: 9002 }, 'UDP_ECHO_DATA', 'text');
    });

    assert.equal(receivedUdp, true);
    globalSocketEngine.disconnectUdp(sessionId);
  });

  // =================== TEST 9: MQTT BROKER PUB/SUB ===================
  await t.test('MQTT: Connects to broker, subscribes and receives published message', async () => {
    let receivedMqtt = false;
    const sessionId = 'mqtt-test-session';

    await globalGrpcMqttEngine.connectMqtt(
      sessionId,
      { brokerUrl: 'mqtt://127.0.0.1:1883' },
      (ev) => {
        if (ev.direction === 'IN' && ev.payload.includes('mqtt_sensor_value_123')) {
          receivedMqtt = true;
        }
      }
    );

    await waitMs(400);
    globalGrpcMqttEngine.subscribeMqtt(sessionId, 'factory/sensors/#', 1);
    await waitMs(300);

    globalGrpcMqttEngine.publishMqtt(sessionId, 'factory/sensors/temp', '{"temp": 24, "data": "mqtt_sensor_value_123"}', 1, false, 'json');
    await waitMs(400);

    assert.equal(receivedMqtt, true);
    globalGrpcMqttEngine.disconnectMqtt(sessionId);
  });
});
