// src/main/services/socket-engine.ts
import net from 'node:net';
import tls from 'node:tls';
import dgram from 'node:dgram';
import { StreamEvent } from '../../shared/types.js';

export type SocketEventCallback = (event: StreamEvent) => void;

interface ActiveTcpSession {
  type: 'client' | 'server';
  socket?: net.Socket | tls.TLSSocket;
  server?: net.Server;
  connectedClients?: Map<string, net.Socket>;
  framing?: 'raw' | 'delimiter' | 'fixed' | 'length-prefix';
  delimiter?: string;
  fixedLength?: number;
}

interface ActiveUdpSession {
  socket: dgram.Socket;
  multicastGroups: Set<string>;
}

export class SocketEngine {
  private activeTcp = new Map<string, ActiveTcpSession>();
  private activeUdp = new Map<string, ActiveUdpSession>();

  // =================== TCP CLIENT ===================
  public async connectTcpClient(
    sessionId: string,
    config: {
      host: string;
      port: number;
      useTls?: boolean;
      localAddress?: string;
      framing?: 'raw' | 'delimiter' | 'fixed' | 'length-prefix';
      delimiter?: string;
      fixedLength?: number;
    },
    emit: SocketEventCallback
  ): Promise<void> {
    const { host, port, useTls, localAddress, framing, delimiter, fixedLength } = config;

    let socket: net.Socket | tls.TLSSocket;

    if (useTls) {
      const netSocket = net.createConnection({ host, port, localAddress });
      socket = tls.connect({
        socket: netSocket,
        rejectUnauthorized: false,
      });
    } else {
      socket = net.createConnection({
        host,
        port,
        localAddress,
      });
    }

    const session: ActiveTcpSession = {
      type: 'client',
      socket,
      framing: framing || 'raw',
      delimiter: delimiter || '\n',
      fixedLength: fixedLength || 64,
    };
    this.activeTcp.set(sessionId, session);

    socket.on('connect', () => {
      emit({
        sessionId,
        protocol: 'TCP',
        direction: 'SYSTEM',
        timestamp: Date.now(),
        type: 'status',
        payload: `CONNECTED to ${host}:${port}`,
      });
    });

    let buffer = Buffer.alloc(0);

    socket.on('data', (chunk: Buffer) => {
      const timestamp = Date.now();

      if (session.framing === 'raw') {
        emit({
          sessionId,
          protocol: 'TCP',
          direction: 'IN',
          timestamp,
          type: 'packet',
          payload: chunk.toString('utf-8'),
          rawHex: chunk.toString('hex'),
          sizeBytes: chunk.length,
        });
        return;
      }

      buffer = Buffer.concat([buffer, chunk]);

      if (session.framing === 'delimiter') {
        const delim = session.delimiter || '\n';
        const delimBuf = Buffer.from(delim, 'utf-8');

        let index = -1;
        while ((index = buffer.indexOf(delimBuf)) !== -1) {
          const packet = buffer.subarray(0, index);
          buffer = buffer.subarray(index + delimBuf.length);

          emit({
            sessionId,
            protocol: 'TCP',
            direction: 'IN',
            timestamp,
            type: 'packet',
            payload: packet.toString('utf-8'),
            rawHex: packet.toString('hex'),
            sizeBytes: packet.length,
          });
        }
      } else if (session.framing === 'fixed') {
        const len = session.fixedLength || 64;
        while (buffer.length >= len) {
          const packet = buffer.subarray(0, len);
          buffer = buffer.subarray(len);

          emit({
            sessionId,
            protocol: 'TCP',
            direction: 'IN',
            timestamp,
            type: 'packet',
            payload: packet.toString('utf-8'),
            rawHex: packet.toString('hex'),
            sizeBytes: len,
          });
        }
      }
    });

    socket.on('error', (err) => {
      emit({
        sessionId,
        protocol: 'TCP',
        direction: 'SYSTEM',
        timestamp: Date.now(),
        type: 'error',
        payload: err.message,
      });
    });

    socket.on('close', () => {
      this.activeTcp.delete(sessionId);
      emit({
        sessionId,
        protocol: 'TCP',
        direction: 'SYSTEM',
        timestamp: Date.now(),
        type: 'status',
        payload: 'DISCONNECTED',
      });
    });
  }

  // =================== TCP SERVER ===================
  public async startTcpServer(
    sessionId: string,
    config: { host?: string; port: number },
    emit: SocketEventCallback
  ): Promise<void> {
    const host = config.host || '0.0.0.0';
    const port = config.port;

    const connectedClients = new Map<string, net.Socket>();

    const server = net.createServer((clientSocket) => {
      const clientId = `${clientSocket.remoteAddress}:${clientSocket.remotePort}`;
      connectedClients.set(clientId, clientSocket);

      emit({
        sessionId,
        protocol: 'TCP',
        direction: 'SYSTEM',
        timestamp: Date.now(),
        type: 'client_connect',
        payload: `Client connected: ${clientId}`,
        metadata: { clientId },
      });

      clientSocket.on('data', (chunk) => {
        emit({
          sessionId,
          protocol: 'TCP',
          direction: 'IN',
          timestamp: Date.now(),
          type: 'packet',
          payload: chunk.toString('utf-8'),
          rawHex: chunk.toString('hex'),
          sizeBytes: chunk.length,
          metadata: { clientId },
        });
      });

      clientSocket.on('close', () => {
        connectedClients.delete(clientId);
        emit({
          sessionId,
          protocol: 'TCP',
          direction: 'SYSTEM',
          timestamp: Date.now(),
          type: 'client_disconnect',
          payload: `Client disconnected: ${clientId}`,
          metadata: { clientId },
        });
      });
    });

    server.listen(port, host, () => {
      this.activeTcp.set(sessionId, {
        type: 'server',
        server,
        connectedClients,
      });

      emit({
        sessionId,
        protocol: 'TCP',
        direction: 'SYSTEM',
        timestamp: Date.now(),
        type: 'status',
        payload: `TCP Server listening on ${host}:${port}`,
      });
    });

    server.on('error', (err) => {
      emit({
        sessionId,
        protocol: 'TCP',
        direction: 'SYSTEM',
        timestamp: Date.now(),
        type: 'error',
        payload: err.message,
      });
    });
  }

  public sendTcp(
    sessionId: string,
    data: string,
    format: 'text' | 'hex' | 'base64',
    targetClientId?: string,
    emit?: SocketEventCallback
  ): void {
    const session = this.activeTcp.get(sessionId);
    if (!session) throw new Error('TCP session not found');

    let buf: Buffer;
    if (format === 'hex') {
      buf = Buffer.from(data.replace(/\s+/g, ''), 'hex');
    } else if (format === 'base64') {
      buf = Buffer.from(data, 'base64');
    } else {
      buf = Buffer.from(data, 'utf-8');
    }

    if (session.type === 'client' && session.socket) {
      session.socket.write(buf);
      emit?.({
        sessionId,
        protocol: 'TCP',
        direction: 'OUT',
        timestamp: Date.now(),
        type: 'packet',
        payload: data,
        rawHex: buf.toString('hex'),
        sizeBytes: buf.length,
      });
    } else if (session.type === 'server' && session.connectedClients) {
      if (targetClientId) {
        const client = session.connectedClients.get(targetClientId);
        client?.write(buf);
      } else {
        // Broadcast to all clients
        for (const client of session.connectedClients.values()) {
          client.write(buf);
        }
      }
      emit?.({
        sessionId,
        protocol: 'TCP',
        direction: 'OUT',
        timestamp: Date.now(),
        type: 'packet',
        payload: data,
        rawHex: buf.toString('hex'),
        sizeBytes: buf.length,
        metadata: { targetClientId: targetClientId || 'ALL' },
      });
    }
  }

  public disconnectTcp(sessionId: string): void {
    const session = this.activeTcp.get(sessionId);
    if (session) {
      if (session.socket) session.socket.destroy();
      if (session.server) session.server.close();
      this.activeTcp.delete(sessionId);
    }
  }

  // =================== UDP SOCKET ===================
  public async createUdpSocket(
    sessionId: string,
    config: {
      bindPort?: number;
      localAddress?: string;
      multicastAddress?: string;
      broadcast?: boolean;
    },
    emit: SocketEventCallback
  ): Promise<void> {
    const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    const multicastGroups = new Set<string>();

    const session: ActiveUdpSession = { socket, multicastGroups };
    this.activeUdp.set(sessionId, session);

    socket.on('message', (msg, rinfo) => {
      emit({
        sessionId,
        protocol: 'UDP',
        direction: 'IN',
        timestamp: Date.now(),
        type: 'datagram',
        payload: msg.toString('utf-8'),
        rawHex: msg.toString('hex'),
        sizeBytes: msg.length,
        metadata: {
          remoteAddress: rinfo.address,
          remotePort: rinfo.port,
        },
      });
    });

    socket.on('error', (err) => {
      emit({
        sessionId,
        protocol: 'UDP',
        direction: 'SYSTEM',
        timestamp: Date.now(),
        type: 'error',
        payload: err.message,
      });
    });

    if (config.bindPort) {
      await new Promise<void>((resolve, reject) => {
        socket.once('error', reject);
        socket.bind(config.bindPort, config.localAddress || '127.0.0.1', () => {
          if (config.broadcast) {
            socket.setBroadcast(true);
          }
          if (config.multicastAddress) {
            try {
              socket.addMembership(config.multicastAddress);
              multicastGroups.add(config.multicastAddress);
            } catch (e: any) {
              console.warn('Multicast join error:', e.message);
            }
          }
          emit({
            sessionId,
            protocol: 'UDP',
            direction: 'SYSTEM',
            timestamp: Date.now(),
            type: 'status',
            payload: `UDP bound to ${config.localAddress || '127.0.0.1'}:${config.bindPort}`,
          });
          resolve();
        });
      });
    }
  }

  public sendUdp(
    sessionId: string,
    target: { host: string; port: number },
    data: string,
    format: 'text' | 'hex' | 'base64',
    emit?: SocketEventCallback
  ): void {
    const session = this.activeUdp.get(sessionId);
    if (!session) throw new Error('UDP session not found');

    let buf: Buffer;
    if (format === 'hex') {
      buf = Buffer.from(data.replace(/\s+/g, ''), 'hex');
    } else if (format === 'base64') {
      buf = Buffer.from(data, 'base64');
    } else {
      buf = Buffer.from(data, 'utf-8');
    }

    session.socket.send(buf, target.port, target.host, (err) => {
      if (err) {
        console.error('sendUdp socket error:', err);
        return;
      }
      if (emit) {
        emit({
          sessionId,
          protocol: 'UDP',
          direction: 'OUT',
          timestamp: Date.now(),
          type: 'datagram',
          payload: data,
          rawHex: buf.toString('hex'),
          sizeBytes: buf.length,
          metadata: { targetHost: target.host, targetPort: target.port },
        });
      }
    });
  }

  public disconnectUdp(sessionId: string): void {
    const session = this.activeUdp.get(sessionId);
    if (session) {
      session.socket.close();
      this.activeUdp.delete(sessionId);
    }
  }
}

export const globalSocketEngine = new SocketEngine();
