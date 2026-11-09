// src/main/services/grpc-mqtt-engine.ts
import mqtt, { MqttClient } from 'mqtt';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { StreamEvent } from '../../shared/types.js';

export type ProtocolEventCallback = (event: StreamEvent) => void;

interface ActiveMqttSession {
  client: MqttClient;
  topics: Set<string>;
}

export class GrpcMqttEngine {
  private activeMqtt = new Map<string, ActiveMqttSession>();
  private activeGrpcStreams = new Map<string, any>();

  // =================== MQTT CLIENT ===================
  public async connectMqtt(
    sessionId: string,
    config: {
      brokerUrl: string;
      clientId?: string;
      cleanSession?: boolean;
      keepAlive?: number;
      username?: string;
      password?: string;
      protocolVersion?: 4 | 5; // 4 = v3.1.1, 5 = v5.0
      will?: { topic: string; payload: string; qos: 0 | 1 | 2; retain: boolean };
    },
    emit: ProtocolEventCallback
  ): Promise<void> {
    const opts: mqtt.IClientOptions = {
      clientId: config.clientId || `net-tester-${Math.random().toString(16).substring(2, 8)}`,
      clean: config.cleanSession ?? true,
      keepalive: config.keepAlive ?? 60,
      protocolVersion: config.protocolVersion || 4,
      reconnectPeriod: 5000,
      rejectUnauthorized: false,
    };

    if (config.username) opts.username = config.username;
    if (config.password) opts.password = config.password;
    if (config.will) {
      opts.will = {
        topic: config.will.topic,
        payload: Buffer.from(config.will.payload),
        qos: config.will.qos,
        retain: config.will.retain,
      };
    }

    const client = mqtt.connect(config.brokerUrl, opts);
    const session: ActiveMqttSession = { client, topics: new Set() };
    this.activeMqtt.set(sessionId, session);

    client.on('connect', (connack) => {
      emit({
        sessionId,
        protocol: 'MQTT',
        direction: 'SYSTEM',
        timestamp: Date.now(),
        type: 'status',
        payload: `CONNECTED to ${config.brokerUrl}`,
        metadata: { connack },
      });
    });

    client.on('message', (topic, payload, packet) => {
      emit({
        sessionId,
        protocol: 'MQTT',
        direction: 'IN',
        timestamp: Date.now(),
        type: 'message',
        payload: payload.toString('utf-8'),
        rawHex: payload.toString('hex'),
        sizeBytes: payload.length,
        metadata: {
          topic,
          qos: packet.qos,
          retain: packet.retain,
        },
      });
    });

    client.on('error', (err) => {
      emit({
        sessionId,
        protocol: 'MQTT',
        direction: 'SYSTEM',
        timestamp: Date.now(),
        type: 'error',
        payload: err.message,
      });
    });

    client.on('close', () => {
      emit({
        sessionId,
        protocol: 'MQTT',
        direction: 'SYSTEM',
        timestamp: Date.now(),
        type: 'status',
        payload: 'DISCONNECTED',
      });
    });
  }

  public subscribeMqtt(sessionId: string, topic: string, qos: 0 | 1 | 2 = 0): void {
    const session = this.activeMqtt.get(sessionId);
    if (!session || !session.client.connected) throw new Error('MQTT client not connected');

    session.client.subscribe(topic, { qos });
    session.topics.add(topic);
  }

  public unsubscribeMqtt(sessionId: string, topic: string): void {
    const session = this.activeMqtt.get(sessionId);
    if (!session || !session.client.connected) return;

    session.client.unsubscribe(topic);
    session.topics.delete(topic);
  }

  public publishMqtt(
    sessionId: string,
    topic: string,
    message: string,
    qos: 0 | 1 | 2 = 0,
    retain = false,
    format: 'text' | 'hex' | 'json' = 'text',
    emit?: ProtocolEventCallback
  ): void {
    const session = this.activeMqtt.get(sessionId);
    if (!session || !session.client.connected) throw new Error('MQTT client not connected');

    let buf: Buffer;
    if (format === 'hex') {
      buf = Buffer.from(message.replace(/\s+/g, ''), 'hex');
    } else {
      buf = Buffer.from(message, 'utf-8');
    }

    session.client.publish(topic, buf, { qos, retain }, (err) => {
      if (!err && emit) {
        emit({
          sessionId,
          protocol: 'MQTT',
          direction: 'OUT',
          timestamp: Date.now(),
          type: 'message',
          payload: message,
          rawHex: buf.toString('hex'),
          sizeBytes: buf.length,
          metadata: { topic, qos, retain },
        });
      }
    });
  }

  public disconnectMqtt(sessionId: string): void {
    const session = this.activeMqtt.get(sessionId);
    if (session) {
      session.client.end(true);
      this.activeMqtt.delete(sessionId);
    }
  }

  // =================== gRPC CLIENT ===================
  public async invokeGrpc(
    sessionId: string,
    config: {
      endpoint: string; // host:port
      protoPath?: string;
      protoContent?: string;
      serviceName: string;
      methodName: string;
      payload: any;
      metadata?: Record<string, string>;
      useTls?: boolean;
    },
    emit: ProtocolEventCallback
  ): Promise<any> {
    if (!config.protoPath) {
      throw new Error('Local proto file path required for dynamic gRPC calls');
    }

    const packageDef = await protoLoader.load(config.protoPath, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });

    const protoDescriptor = grpc.loadPackageDefinition(packageDef) as any;

    // Resolve service constructor
    const parts = config.serviceName.split('.');
    let ServiceClass = protoDescriptor;
    for (const part of parts) {
      ServiceClass = ServiceClass[part];
    }

    if (!ServiceClass) {
      throw new Error(`gRPC Service '${config.serviceName}' not found in proto`);
    }

    const creds = config.useTls ? grpc.credentials.createSsl() : grpc.credentials.createInsecure();
    const client = new ServiceClass(config.endpoint, creds);

    const meta = new grpc.Metadata();
    if (config.metadata) {
      for (const [k, v] of Object.entries(config.metadata)) {
        meta.add(k, v);
      }
    }

    const method = client[config.methodName];
    if (typeof method !== 'function') {
      throw new Error(`Method '${config.methodName}' not found on service '${config.serviceName}'`);
    }

    return new Promise((resolve, reject) => {
      const call = client[config.methodName](config.payload, meta, (err: any, response: any) => {
        if (err) {
          emit({
            sessionId,
            protocol: 'GRPC',
            direction: 'SYSTEM',
            timestamp: Date.now(),
            type: 'error',
            payload: err.message,
            metadata: { code: err.code, details: err.details },
          });
          reject(err);
        } else {
          emit({
            sessionId,
            protocol: 'GRPC',
            direction: 'IN',
            timestamp: Date.now(),
            type: 'response',
            payload: response,
          });
          resolve(response);
        }
      });

      call.on('metadata', (responseMetadata: any) => {
        emit({
          sessionId,
          protocol: 'GRPC',
          direction: 'IN',
          timestamp: Date.now(),
          type: 'metadata',
          payload: responseMetadata.getMap(),
        });
      });
    });
  }
}

export const globalGrpcMqttEngine = new GrpcMqttEngine();
