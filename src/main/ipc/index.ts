// src/main/ipc/index.ts
import { ipcMain, BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { HttpClient } from '../services/http-client.js';
import { globalWsSseEngine } from '../services/ws-sse-engine.js';
import { globalSocketEngine } from '../services/socket-engine.js';
import { globalGrpcMqttEngine } from '../services/grpc-mqtt-engine.js';
import { globalStorageService } from '../services/storage-service.js';
import { globalCookieJar } from '../services/cookie-jar.js';
import { globalVirtualStorage } from '../services/virtual-storage.js';
import { ProxyManager } from '../services/proxy-manager.js';
import { NetworkInterfaceService } from '../services/network-interface.js';
import { VariableEngine } from '../services/variable-engine.js';
import { HttpRequestPayload, StreamEvent } from '../../shared/types.js';
import { customChromiumHeaders } from '../index.js';

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  const emitStreamEvent = (event: StreamEvent) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('stream:event', event);
    }
  };

  // =================== HTTP ===================
  ipcMain.handle('http:send', async (_e, req: HttpRequestPayload) => {
    const data = globalStorageService.getData();
    const activeEnv = data.environments.find((env) => env.id === data.activeEnvironmentId);
    const envVars = activeEnv ? activeEnv.variables : [];

    const response = await HttpClient.execute(req, envVars);

    // Save to history
    globalStorageService.addHistoryItem({
      id: req.id,
      protocol: 'HTTP',
      url: req.url,
      method: req.method,
      status: response.status,
      durationMs: response.timing.totalDurationMs,
      timestamp: Date.now(),
      summary: `${response.status} ${response.statusText} (${response.timing.totalDurationMs}ms)`,
    });

    return response;
  });

  // =================== WEBSOCKET ===================
  ipcMain.handle('ws:connect', async (_e, { sessionId, url, headers, subprotocols, proxy, heartbeatIntervalMs, tlsFingerprint }) => {
    const data = globalStorageService.getData();
    const activeEnv = data.environments.find((env) => env.id === data.activeEnvironmentId);
    const envVars = activeEnv ? activeEnv.variables : [];

    const resolvedUrl = VariableEngine.resolve(url || '', { environment: envVars });
    const resolvedHeaders: Record<string, string> = {};
    if (headers && typeof headers === 'object') {
      for (const [k, v] of Object.entries(headers)) {
        resolvedHeaders[k] = VariableEngine.resolve(String(v), { environment: envVars });
      }
    }

    await globalWsSseEngine.connectWs(
      sessionId,
      resolvedUrl,
      { headers: resolvedHeaders, subprotocols, proxy, heartbeatIntervalMs, tlsFingerprint },
      emitStreamEvent
    );
    return { success: true };
  });

  ipcMain.handle('ws:send', async (_e, { sessionId, payload, format }) => {
    globalWsSseEngine.sendWs(sessionId, payload, format, emitStreamEvent);
    return { success: true };
  });

  ipcMain.handle('ws:disconnect', async (_e, { sessionId }) => {
    globalWsSseEngine.disconnectWs(sessionId);
    return { success: true };
  });

  // =================== SSE ===================
  ipcMain.handle('sse:connect', async (_e, { sessionId, url, headers, proxy }) => {
    await globalWsSseEngine.connectSse(sessionId, url, { headers, proxy }, emitStreamEvent);
    return { success: true };
  });

  ipcMain.handle('sse:disconnect', async (_e, { sessionId }) => {
    globalWsSseEngine.disconnectSse(sessionId);
    return { success: true };
  });

  // =================== TCP ===================
  ipcMain.handle('tcp:connect', async (_e, { sessionId, host, port, useTls, localAddress, framing, delimiter, fixedLength }) => {
    await globalSocketEngine.connectTcpClient(sessionId, { host, port, useTls, localAddress, framing, delimiter, fixedLength }, emitStreamEvent);
    return { success: true };
  });

  ipcMain.handle('tcp:startServer', async (_e, { sessionId, host, port }) => {
    await globalSocketEngine.startTcpServer(sessionId, { host, port }, emitStreamEvent);
    return { success: true };
  });

  ipcMain.handle('tcp:send', async (_e, { sessionId, data, format, targetClientId }) => {
    globalSocketEngine.sendTcp(sessionId, data, format, targetClientId, emitStreamEvent);
    return { success: true };
  });

  ipcMain.handle('tcp:disconnect', async (_e, { sessionId }) => {
    globalSocketEngine.disconnectTcp(sessionId);
    return { success: true };
  });

  // =================== UDP ===================
  ipcMain.handle('udp:create', async (_e, { sessionId, bindPort, localAddress, multicastAddress, broadcast }) => {
    await globalSocketEngine.createUdpSocket(sessionId, { bindPort, localAddress, multicastAddress, broadcast }, emitStreamEvent);
    return { success: true };
  });

  ipcMain.handle('udp:send', async (_e, { sessionId, target, data, format }) => {
    globalSocketEngine.sendUdp(sessionId, target, data, format, emitStreamEvent);
    return { success: true };
  });

  ipcMain.handle('udp:disconnect', async (_e, { sessionId }) => {
    globalSocketEngine.disconnectUdp(sessionId);
    return { success: true };
  });

  // =================== MQTT ===================
  ipcMain.handle('mqtt:connect', async (_e, { sessionId, config }) => {
    await globalGrpcMqttEngine.connectMqtt(sessionId, config, emitStreamEvent);
    return { success: true };
  });

  ipcMain.handle('mqtt:subscribe', async (_e, { sessionId, topic, qos }) => {
    globalGrpcMqttEngine.subscribeMqtt(sessionId, topic, qos);
    return { success: true };
  });

  ipcMain.handle('mqtt:publish', async (_e, { sessionId, topic, message, qos, retain, format }) => {
    globalGrpcMqttEngine.publishMqtt(sessionId, topic, message, qos, retain, format, emitStreamEvent);
    return { success: true };
  });

  ipcMain.handle('mqtt:disconnect', async (_e, { sessionId }) => {
    globalGrpcMqttEngine.disconnectMqtt(sessionId);
    return { success: true };
  });

  // =================== gRPC ===================
  ipcMain.handle('grpc:invoke', async (_e, { sessionId, config }) => {
    return await globalGrpcMqttEngine.invokeGrpc(sessionId, config, emitStreamEvent);
  });

  // =================== PROXY & NETWORK INTERFACES ===================
  ipcMain.handle('proxy:test', async (_e, proxyConfig) => {
    return await ProxyManager.testProxyExit(proxyConfig);
  });

  ipcMain.handle('interfaces:list', async () => {
    return NetworkInterfaceService.getAvailableInterfaces();
  });

  // =================== STORAGE & ENVIRONMENTS ===================
  ipcMain.handle('storage:getData', async () => {
    return globalStorageService.getData();
  });

  ipcMain.handle('storage:saveEnv', async (_e, env) => {
    globalStorageService.saveEnvironment(env);
    return { success: true };
  });

  ipcMain.handle('storage:deleteEnv', async (_e, envId) => {
    globalStorageService.deleteEnvironment(envId);
    return { success: true };
  });

  ipcMain.handle('storage:setActiveEnv', async (_e, envId) => {
    globalStorageService.setActiveEnvironment(envId);
    return { success: true };
  });

  ipcMain.handle('storage:clearHistory', async () => {
    globalStorageService.clearHistory();
    return { success: true };
  });

  // =================== COOKIES & VIRTUAL STORAGE ===================
  ipcMain.handle('cookies:getAll', async () => {
    return await globalCookieJar.getAllCookies();
  });

  ipcMain.handle('cookies:clear', async () => {
    await globalCookieJar.clearCookies();
    return { success: true };
  });

  ipcMain.handle('virtualStorage:getAll', async () => {
    return globalVirtualStorage.getAllRecords();
  });

  ipcMain.handle('virtualStorage:setItem', async (_e, { origin, type, key, value }) => {
    globalVirtualStorage.setItem(origin, type, key, value);
    return { success: true };
  });

  ipcMain.handle('virtualStorage:clear', async (_e, { origin, type }) => {
    globalVirtualStorage.clear(origin, type);
    return { success: true };
  });

  // =================== CHROMIUM HEADERS & WORKSPACE COOKIES ===================
  ipcMain.handle('ws:registerChromiumHeaders', async (_e, { domain, headers }) => {
    customChromiumHeaders.set(domain, headers);
    return { success: true };
  });

  ipcMain.handle('ws:clearChromiumHeaders', async (_e, { domain }) => {
    customChromiumHeaders.delete(domain);
    return { success: true };
  });

  ipcMain.handle('cookies:importNetscape', async (_e, { rawText }) => {
    const count = await globalCookieJar.importNetscapeCookies(rawText);
    return { success: true, count };
  });

  ipcMain.handle('cookies:loadFromWorkspace', async () => {
    const filePath = path.resolve(process.cwd(), 'cookies.txt');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const count = await globalCookieJar.importNetscapeCookies(content);
      return { success: true, count, path: filePath };
    }
    return { success: false, count: 0 };
  });

  ipcMain.handle('cookies:getForUrl', async (_e, { url }) => {
    return await globalCookieJar.getCookieHeader(url);
  });
}
