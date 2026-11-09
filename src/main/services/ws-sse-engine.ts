// src/main/services/ws-sse-engine.ts
import { WebSocket } from 'ws';
import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import { StreamEvent } from '../../shared/types.js';
import { ProxyManager } from './proxy-manager.js';
import { globalCookieJar } from './cookie-jar.js';

export type StreamEventCallback = (event: StreamEvent) => void;

interface ActiveWsSession {
  ws: WebSocket;
  pingTimer?: NodeJS.Timeout;
  lastPingSentAt?: number;
}

interface ActiveSseSession {
  req: http.ClientRequest;
}

export class WsSseEngine {
  private activeWs = new Map<string, ActiveWsSession>();
  private activeSse = new Map<string, ActiveSseSession>();

  // =================== WEBSOCKET ===================
  public async connectWs(
    sessionId: string,
    url: string,
    options: {
      headers?: Record<string, string>;
      subprotocols?: string[];
      proxy?: any;
      heartbeatIntervalMs?: number;
    },
    emit: StreamEventCallback
  ): Promise<void> {
    const parsedUrl = new URL(url);
    const agent = ProxyManager.getAgentForProxy(options.proxy);
    const cookieHeader = await globalCookieJar.getCookieHeader(url);

    const headers: Record<string, string> = { ...(options.headers || {}) };
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    // Filter reserved hop-by-hop headers that ws manages itself to avoid protocol violation
    const reservedHeaders = ['sec-websocket-key', 'sec-websocket-version', 'upgrade', 'connection'];
    const cleanHeaders: Record<string, string> = {};
    let origin: string | undefined;

    for (const [k, v] of Object.entries(headers)) {
      const lower = k.toLowerCase();
      if (lower === 'origin') {
        origin = v;
        cleanHeaders[k] = v;
      } else if (!reservedHeaders.includes(lower)) {
        cleanHeaders[k] = v;
      }
    }

    const ws = new WebSocket(url, options.subprotocols, {
      headers: cleanHeaders,
      origin,
      agent,
      rejectUnauthorized: false,
      handshakeTimeout: 15000,
    });

    const session: ActiveWsSession = { ws };
    this.activeWs.set(sessionId, session);

    ws.on('unexpected-response', (req, res) => {
      if (session.pingTimer) clearInterval(session.pingTimer);
      this.activeWs.delete(sessionId);

      let body = '';
      let emitted = false;

      const triggerEmit = () => {
        if (emitted) return;
        emitted = true;
        try {
          req.destroy();
        } catch {}

        const code = res.statusCode || 0;
        const msg = res.statusMessage || '';
        let hint = '';

        if (code === 403) {
          hint = ' -> Cloudflare 403 Forbidden: Endpoint neo.character.ai menolak koneksi karena tidak ada header Cookie (cf_clearance, sessionid) atau Authorization (Token). Header ini TIDAK disertakan secara otomatis saat Copy as cURL dari Chrome DevTools.';
        } else if (code === 401) {
          hint = ' -> Unauthorized: Token Character.AI tidak valid atau telah kedaluwarsa.';
        }

        emit({
          sessionId,
          protocol: 'WEBSOCKET',
          direction: 'SYSTEM',
          timestamp: Date.now(),
          type: 'error',
          payload: `Handshake Failed: HTTP ${code} ${msg}${hint}`,
          metadata: {
            statusCode: code,
            headers: res.headers,
            body: body.slice(0, 1000),
          },
        });
      };

      // Failsafe timer: emit immediately within 400ms even if stream stays open
      const timer = setTimeout(triggerEmit, 400);

      res.on('data', (c) => (body += c));
      res.on('end', () => {
        clearTimeout(timer);
        triggerEmit();
      });
      res.on('error', () => {
        clearTimeout(timer);
        triggerEmit();
      });
    });

    ws.on('open', () => {
      emit({
        sessionId,
        protocol: 'WEBSOCKET',
        direction: 'SYSTEM',
        timestamp: Date.now(),
        type: 'status',
        payload: 'CONNECTED',
      });

      // Setup Heartbeat Ping-Pong if requested
      if (options.heartbeatIntervalMs && options.heartbeatIntervalMs > 0) {
        session.pingTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            session.lastPingSentAt = Date.now();
            ws.ping();
            emit({
              sessionId,
              protocol: 'WEBSOCKET',
              direction: 'OUT',
              timestamp: Date.now(),
              type: 'ping',
              payload: 'PING',
            });
          }
        }, options.heartbeatIntervalMs);
      }
    });

    ws.on('pong', () => {
      const rtt = session.lastPingSentAt ? Date.now() - session.lastPingSentAt : 0;
      emit({
        sessionId,
        protocol: 'WEBSOCKET',
        direction: 'IN',
        timestamp: Date.now(),
        type: 'pong',
        payload: `PONG (RTT: ${rtt}ms)`,
        metadata: { rttMs: rtt },
      });
    });

    ws.on('message', (data: Buffer | string, isBinary: boolean) => {
      const timestamp = Date.now();
      let payload: string;
      let rawHex: string | undefined;

      if (isBinary) {
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as any);
        payload = buf.toString('base64');
        rawHex = buf.toString('hex');
      } else {
        payload = data.toString();
      }

      emit({
        sessionId,
        protocol: 'WEBSOCKET',
        direction: 'IN',
        timestamp,
        type: 'message',
        payload,
        rawHex,
        sizeBytes: data.length,
        metadata: { isBinary },
      });
    });

    ws.on('error', (err) => {
      emit({
        sessionId,
        protocol: 'WEBSOCKET',
        direction: 'SYSTEM',
        timestamp: Date.now(),
        type: 'error',
        payload: err.message,
      });
    });

    ws.on('close', (code, reason) => {
      if (session.pingTimer) clearInterval(session.pingTimer);
      this.activeWs.delete(sessionId);
      emit({
        sessionId,
        protocol: 'WEBSOCKET',
        direction: 'SYSTEM',
        timestamp: Date.now(),
        type: 'status',
        payload: `DISCONNECTED (${code}: ${reason.toString()})`,
      });
    });
  }

  public sendWs(sessionId: string, payload: string, format: 'text' | 'hex' | 'json', emit: StreamEventCallback): void {
    const session = this.activeWs.get(sessionId);
    if (!session || session.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    let sendData: any = payload;
    let rawHex: string | undefined;

    if (format === 'hex') {
      const cleanHex = payload.replace(/\s+/g, '');
      const buf = Buffer.from(cleanHex, 'hex');
      sendData = buf;
      rawHex = cleanHex;
    }

    session.ws.send(sendData, (err) => {
      if (!err) {
        emit({
          sessionId,
          protocol: 'WEBSOCKET',
          direction: 'OUT',
          timestamp: Date.now(),
          type: 'message',
          payload,
          rawHex,
          sizeBytes: Buffer.byteLength(sendData),
          metadata: { format },
        });
      }
    });
  }

  public disconnectWs(sessionId: string): void {
    const session = this.activeWs.get(sessionId);
    if (session) {
      if (session.pingTimer) clearInterval(session.pingTimer);
      session.ws.close();
      this.activeWs.delete(sessionId);
    }
  }

  // =================== SERVER-SENT EVENTS (SSE) ===================
  public async connectSse(
    sessionId: string,
    url: string,
    options: { headers?: Record<string, string>; proxy?: any },
    emit: StreamEventCallback
  ): Promise<void> {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const transport = isHttps ? https : http;
    const agent = ProxyManager.getAgentForProxy(options.proxy);

    const headers: Record<string, string> = {
      Accept: 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      ...(options.headers || {}),
    };

    const req = transport.request(
      {
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        headers,
        agent,
        rejectUnauthorized: false,
      },
      (res) => {
        emit({
          sessionId,
          protocol: 'SSE',
          direction: 'SYSTEM',
          timestamp: Date.now(),
          type: 'status',
          payload: `CONNECTED (HTTP ${res.statusCode})`,
        });

        let buffer = '';
        res.on('data', (chunk: Buffer) => {
          buffer += chunk.toString('utf-8');
          const lines = buffer.split(/\r\n|\r|\n/);
          buffer = lines.pop() || ''; // keep last incomplete line

          let currentEvent = 'message';
          let currentData = '';
          let currentId = '';

          for (const line of lines) {
            if (!line.trim()) {
              // End of an SSE message block
              if (currentData) {
                emit({
                  sessionId,
                  protocol: 'SSE',
                  direction: 'IN',
                  timestamp: Date.now(),
                  type: currentEvent,
                  payload: currentData.trim(),
                  metadata: { id: currentId },
                });
                currentData = '';
                currentEvent = 'message';
                currentId = '';
              }
              continue;
            }

            if (line.startsWith('event:')) {
              currentEvent = line.substring(6).trim();
            } else if (line.startsWith('data:')) {
              currentData += (currentData ? '\n' : '') + line.substring(5).trim();
            } else if (line.startsWith('id:')) {
              currentId = line.substring(3).trim();
            }
          }
        });

        res.on('end', () => {
          this.activeSse.delete(sessionId);
          emit({
            sessionId,
            protocol: 'SSE',
            direction: 'SYSTEM',
            timestamp: Date.now(),
            type: 'status',
            payload: 'STREAM ENDED',
          });
        });
      }
    );

    req.on('error', (err) => {
      emit({
        sessionId,
        protocol: 'SSE',
        direction: 'SYSTEM',
        timestamp: Date.now(),
        type: 'error',
        payload: err.message,
      });
    });

    req.end();
    this.activeSse.set(sessionId, { req });
  }

  public disconnectSse(sessionId: string): void {
    const session = this.activeSse.get(sessionId);
    if (session) {
      session.req.destroy();
      this.activeSse.delete(sessionId);
    }
  }
}

export const globalWsSseEngine = new WsSseEngine();
