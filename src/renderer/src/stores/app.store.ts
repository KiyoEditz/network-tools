// src/renderer/src/stores/app.store.ts
import { create } from 'zustand';
import {
  ProtocolType,
  HttpRequestPayload,
  HttpResponsePayload,
  StreamEvent,
  Environment,
  ProxyConfig,
} from '../../../shared/types.js';

export interface TabItem {
  id: string;
  title: string;
  protocol: ProtocolType;
  request: HttpRequestPayload;
  response?: HttpResponsePayload;
  streamEvents: StreamEvent[];
  status: 'idle' | 'loading' | 'connected' | 'error';
  targetHost?: string;
  targetPort?: number;
}

interface AppState {
  tabs: TabItem[];
  activeTabId: string;
  environments: Environment[];
  activeEnvId?: string;
  proxyProfiles: ProxyConfig[];
  activeProxy?: ProxyConfig;
  history: any[];
  isDarkTheme: boolean;

  // Actions
  addTab: (protocol?: ProtocolType) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabRequest: (tabId: string, patch: Partial<HttpRequestPayload>) => void;
  updateTabState: (tabId: string, patch: Partial<TabItem>) => void;
  appendStreamEvent: (sessionId: string, event: StreamEvent) => void;
  setResponse: (tabId: string, resp: HttpResponsePayload) => void;
  loadStorage: () => Promise<void>;
  setActiveEnv: (envId?: string) => Promise<void>;
  toggleTheme: () => void;
}

const createDefaultRequest = (id: string, protocol: ProtocolType): HttpRequestPayload => ({
  id,
  method: 'GET',
  url: protocol === 'HTTP' ? 'http://localhost:9080/api/users' : '',
  headers: [{ id: '1', key: 'Accept', value: 'application/json', enabled: true }],
  queryParams: [],
  bodyType: 'none',
  rawBodyFormat: 'json',
  rawBodyContent: '{\n  "name": "Test User",\n  "role": "QA"\n}',
  auth: { type: 'none' },
});

export const useAppStore = create<AppState>((set, get) => ({
  tabs: [
    {
      id: 'tab-1',
      title: 'GET Users',
      protocol: 'HTTP',
      request: createDefaultRequest('tab-1', 'HTTP'),
      streamEvents: [],
      status: 'idle',
    },
  ],
  activeTabId: 'tab-1',
  environments: [],
  proxyProfiles: [],
  history: [],
  isDarkTheme: true,

  addTab: (protocol: ProtocolType = 'HTTP') => {
    const newId = `tab-${Date.now()}`;
    const defaultTitle = `${protocol} Request`;
    const newTab: TabItem = {
      id: newId,
      title: defaultTitle,
      protocol,
      request: createDefaultRequest(newId, protocol),
      streamEvents: [],
      status: 'idle',
    };

    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newId,
    }));
  },

  closeTab: (id: string) => {
    const { tabs, activeTabId } = get();
    if (tabs.length === 1) return; // Keep at least one tab
    const filtered = tabs.filter((t) => t.id !== id);
    const newActive = activeTabId === id ? filtered[0].id : activeTabId;
    set({ tabs: filtered, activeTabId: newActive });
  },

  setActiveTab: (id: string) => set({ activeTabId: id }),

  updateTabRequest: (tabId: string, patch: Partial<HttpRequestPayload>) => {
    set((state) => ({
      tabs: state.tabs.map((tab) => {
        if (tab.id !== tabId) return tab;
        const updatedReq = { ...tab.request, ...patch };
        const methodStr = updatedReq.method === 'CUSTOM' ? updatedReq.customMethod || 'GET' : updatedReq.method;
        const newTitle = tab.protocol === 'HTTP' && updatedReq.url
          ? `${methodStr} ${updatedReq.url.replace(/^https?:\/\//, '').split('/')[1] || updatedReq.url.replace(/^https?:\/\//, '')}`
          : tab.title;

        return {
          ...tab,
          request: updatedReq,
          title: newTitle || tab.title,
        };
      }),
    }));
  },

  updateTabState: (tabId: string, patch: Partial<TabItem>) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, ...patch } : t)),
    }));
  },

  appendStreamEvent: (sessionId: string, event: StreamEvent) => {
    set((state) => ({
      tabs: state.tabs.map((tab) => {
        if (tab.id !== sessionId) return tab;
        let newStatus = tab.status;
        if (event.type === 'error') {
          newStatus = 'error';
        } else if (event.type === 'status') {
          if (event.payload === 'CONNECTED') newStatus = 'connected';
          else if (typeof event.payload === 'string' && event.payload.startsWith('DISCONNECTED')) newStatus = 'idle';
        }
        return {
          ...tab,
          status: newStatus,
          streamEvents: [...tab.streamEvents, event],
        };
      }),
    }));
  },

  setResponse: (tabId: string, resp: HttpResponsePayload) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, response: resp, status: 'idle' } : t)),
    }));
  },

  loadStorage: async () => {
    try {
      if ((window as any).networkAPI) {
        const data = await (window as any).networkAPI.getStorageData();
        if (data) {
          set({
            environments: data.environments || [],
            activeEnvId: data.activeEnvironmentId,
            proxyProfiles: data.proxyProfiles || [],
            history: data.history || [],
          });
        }
      }
    } catch (err) {
      console.warn('Storage load error:', err);
    }
  },

  setActiveEnv: async (envId?: string) => {
    set({ activeEnvId: envId });
    if ((window as any).networkAPI) {
      await (window as any).networkAPI.setActiveEnvironment(envId);
    }
  },

  toggleTheme: () => {
    set((state) => {
      const next = !state.isDarkTheme;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return { isDarkTheme: next };
    });
  },
}));
