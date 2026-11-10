// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';
import { HttpRequestPayload, StreamEvent } from '../shared/types.js';

export const electronAPI = {
  // HTTP
  sendHttpRequest: (req: HttpRequestPayload) => ipcRenderer.invoke('http:send', req),

  // WebSocket
  connectWs: (options: any) => ipcRenderer.invoke('ws:connect', options),
  sendWs: (options: any) => ipcRenderer.invoke('ws:send', options),
  disconnectWs: (sessionId: string) => ipcRenderer.invoke('ws:disconnect', { sessionId }),

  // SSE
  connectSse: (options: any) => ipcRenderer.invoke('sse:connect', options),
  disconnectSse: (sessionId: string) => ipcRenderer.invoke('sse:disconnect', { sessionId }),

  // TCP
  connectTcp: (options: any) => ipcRenderer.invoke('tcp:connect', options),
  startTcpServer: (options: any) => ipcRenderer.invoke('tcp:startServer', options),
  sendTcp: (options: any) => ipcRenderer.invoke('tcp:send', options),
  disconnectTcp: (sessionId: string) => ipcRenderer.invoke('tcp:disconnect', { sessionId }),

  // UDP
  createUdp: (options: any) => ipcRenderer.invoke('udp:create', options),
  sendUdp: (options: any) => ipcRenderer.invoke('udp:send', options),
  disconnectUdp: (sessionId: string) => ipcRenderer.invoke('udp:disconnect', { sessionId }),

  // MQTT
  connectMqtt: (options: any) => ipcRenderer.invoke('mqtt:connect', options),
  subscribeMqtt: (options: any) => ipcRenderer.invoke('mqtt:subscribe', options),
  publishMqtt: (options: any) => ipcRenderer.invoke('mqtt:publish', options),
  disconnectMqtt: (sessionId: string) => ipcRenderer.invoke('mqtt:disconnect', { sessionId }),

  // gRPC
  invokeGrpc: (options: any) => ipcRenderer.invoke('grpc:invoke', options),

  // Proxy & Network Interface
  testProxy: (config: any) => ipcRenderer.invoke('proxy:test', config),
  listNetworkInterfaces: () => ipcRenderer.invoke('interfaces:list'),

  // Storage, History & Environment
  getStorageData: () => ipcRenderer.invoke('storage:getData'),
  saveEnvironment: (env: any) => ipcRenderer.invoke('storage:saveEnv', env),
  deleteEnvironment: (id: string) => ipcRenderer.invoke('storage:deleteEnv', id),
  setActiveEnvironment: (id?: string) => ipcRenderer.invoke('storage:setActiveEnv', id),
  clearHistory: () => ipcRenderer.invoke('storage:clearHistory'),

  // Cookies & Virtual Storage
  getAllCookies: () => ipcRenderer.invoke('cookies:getAll'),
  clearCookies: () => ipcRenderer.invoke('cookies:clear'),
  importNetscapeCookies: (rawText: string) => ipcRenderer.invoke('cookies:importNetscape', { rawText }),
  loadWorkspaceCookies: () => ipcRenderer.invoke('cookies:loadFromWorkspace'),
  getCookiesForUrl: (url: string) => ipcRenderer.invoke('cookies:getForUrl', { url }),
  getVirtualStorage: () => ipcRenderer.invoke('virtualStorage:getAll'),
  setVirtualStorageItem: (params: any) => ipcRenderer.invoke('virtualStorage:setItem', params),
  clearVirtualStorage: (params: any) => ipcRenderer.invoke('virtualStorage:clear', params),

  // Chromium Headers for WebSocket
  registerChromiumHeaders: (domain: string, headers: Record<string, string>) =>
    ipcRenderer.invoke('ws:registerChromiumHeaders', { domain, headers }),
  clearChromiumHeaders: (domain: string) =>
    ipcRenderer.invoke('ws:clearChromiumHeaders', { domain }),

  // Real-time Event Stream Listener
  onStreamEvent: (callback: (event: StreamEvent) => void) => {
    const handler = (_event: any, data: StreamEvent) => callback(data);
    ipcRenderer.on('stream:event', handler);
    return () => {
      ipcRenderer.removeListener('stream:event', handler);
    };
  },
};

contextBridge.exposeInMainWorld('networkAPI', electronAPI);
