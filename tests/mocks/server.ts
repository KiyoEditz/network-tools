// tests/mocks/server.ts
import http from 'node:http';
import net from 'node:net';
import dgram from 'node:dgram';
import { WebSocketServer, WebSocket } from 'ws';
import Aedes from 'aedes';

// Minimal 1x1 transparent PNG
export const SAMPLE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

// Minimal valid PDF
export const SAMPLE_PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 300 144]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF',
  'utf-8'
);

// Minimal valid WAV audio (0.5 second silence)
export const SAMPLE_WAV = Buffer.from(
  'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
  'base64'
);

export interface MockServersHandle {
  httpServer: http.Server;
  wsServer: WebSocketServer;
  sseServer: http.Server;
  tcpServer: net.Server;
  udpServer: dgram.Socket;
  mqttTcpServer: net.Server;
  signalingWs: WebSocketServer;
  stop: () => Promise<void>;
}

function checkMockRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:9080/api/users', (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(400, () => {
      req.destroy();
      resolve(false);
    });
  });
}

export async function startMockServers(): Promise<MockServersHandle> {
  if (await checkMockRunning()) {
    return {
      httpServer: null as any,
      wsServer: null as any,
      sseServer: null as any,
      tcpServer: null as any,
      udpServer: null as any,
      mqttTcpServer: null as any,
      signalingWs: null as any,
      stop: async () => {},
    };
  }

  // 1. HTTP Server (Port 9080)
  const httpServer = http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (url.pathname === '/api/users') {
      if (req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            status: 'success',
            data: [
              { id: 1, name: 'Alice', email: 'alice@network.test', role: 'Admin' },
              { id: 2, name: 'Bob', email: 'bob@network.test', role: 'Tester' },
            ],
          })
        );
      } else if (req.method === 'POST') {
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'created', received: body ? JSON.parse(body) : null }));
        });
      } else if (req.method === 'DELETE') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'deleted' }));
      }
      return;
    }

    if (url.pathname === '/api/cookie-test') {
      res.setHeader('Set-Cookie', [
        'session_id=net_tester_secret_9988; Path=/; HttpOnly; SameSite=Lax',
        'user_role=Engineer; Path=/',
      ]);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'cookies_set' }));
      return;
    }

    if (url.pathname === '/api/cookie-check') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ receivedCookie: req.headers.cookie || null }));
      return;
    }

    if (url.pathname === '/api/geo-check') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          remoteAddress: req.socket.remoteAddress,
          forwardedFor: req.headers['x-forwarded-for'] || null,
          cfConnectingIp: req.headers['cf-connecting-ip'] || null,
          cfCountry: req.headers['cf-ipcountry'] || null,
          realIp: req.headers['x-real-ip'] || null,
        })
      );
      return;
    }

    if (url.pathname === '/api/timing-test') {
      setTimeout(() => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ delayMs: 80, message: 'Simulated network latency completed' }));
      }, 80);
      return;
    }

    if (url.pathname === '/media/sample.png') {
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(SAMPLE_PNG);
      return;
    }
    if (url.pathname === '/media/sample.pdf') {
      res.writeHead(200, { 'Content-Type': 'application/pdf' });
      res.end(SAMPLE_PDF);
      return;
    }
    if (url.pathname === '/media/sample.mp3' || url.pathname === '/media/sample.wav') {
      res.writeHead(200, { 'Content-Type': 'audio/wav' });
      res.end(SAMPLE_WAV);
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', path: url.pathname }));
  });

  await new Promise<void>((resolve) => httpServer.listen(9080, '127.0.0.1', () => resolve()));

  // 2. WebSocket Echo Server (Port 9081)
  const wsServer = new WebSocketServer({ port: 9081 });
  wsServer.on('connection', (ws) => {
    ws.on('message', (data, isBinary) => {
      ws.send(data, { binary: isBinary });
    });
  });

  // 3. SSE Server (Port 9082)
  const sseServer = http.createServer((req, res) => {
    if (req.url === '/sse') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });

      let counter = 1;
      const interval = setInterval(() => {
        res.write(`event: tick\nid: ${counter}\ndata: ${JSON.stringify({ count: counter, time: Date.now() })}\n\n`);
        counter++;
      }, 500);

      req.on('close', () => {
        clearInterval(interval);
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise<void>((resolve) => sseServer.listen(9082, '127.0.0.1', () => resolve()));

  // 4. TCP Server (Port 9001)
  const tcpServer = net.createServer((socket) => {
    socket.on('data', (chunk) => {
      socket.write(chunk);
    });
  });
  await new Promise<void>((resolve) => tcpServer.listen(9001, '127.0.0.1', () => resolve()));

  // 5. UDP Server (Port 9002)
  const udpServer = dgram.createSocket('udp4');
  udpServer.on('message', (msg, rinfo) => {
    udpServer.send(msg, rinfo.port, rinfo.address, (err) => {
      if (err) console.error('Mock UDP server reply error:', err);
    });
  });
  udpServer.on('error', (err) => {
    console.error('Mock UDP server error:', err);
  });
  await new Promise<void>((resolve) => udpServer.bind(9002, '127.0.0.1', () => resolve()));

  // 6. MQTT Broker (Port 1883)
  const aedes = new Aedes();
  const mqttTcpServer = net.createServer(aedes.handle);
  await new Promise<void>((resolve) => mqttTcpServer.listen(1883, '127.0.0.1', () => resolve()));

  // 7. WebRTC Signaling (Port 9083)
  const signalingWs = new WebSocketServer({ port: 9083 });
  signalingWs.on('connection', (ws) => {
    ws.on('message', (msg) => {
      signalingWs.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(msg);
        }
      });
    });
  });

  return {
    httpServer,
    wsServer,
    sseServer,
    tcpServer,
    udpServer,
    mqttTcpServer,
    signalingWs,
    stop: async () => {
      try { httpServer.close(); } catch {}
      try { wsServer.close(); } catch {}
      try { sseServer.close(); } catch {}
      try { tcpServer.close(); } catch {}
      try { udpServer.close(); } catch {}
      try { mqttTcpServer.close(); } catch {}
      try { signalingWs.close(); } catch {}
    },
  };
}

// Auto-run if executed directly via node or tsx
if (process.argv[1]?.includes('server.ts') || process.argv[1]?.includes('server.js')) {
  startMockServers().then(() => {
    console.log('✅ ALL MOCK TEST SERVERS STARTED!');
    console.log('Port 9080: HTTP REST Mock');
    console.log('Port 9081: WebSocket Echo');
    console.log('Port 9082: SSE Event Stream');
    console.log('Port 9001: TCP Echo');
    console.log('Port 9002: UDP Echo');
    console.log('Port 1883: MQTT Broker');
    console.log('Port 9083: WebRTC Signaling');
  });
}
