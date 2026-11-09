// src/main/services/storage-service.ts
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Environment, ProxyConfig, RequestCollectionItem } from '../../shared/types.js';

export interface AppDataSchema {
  environments: Environment[];
  activeEnvironmentId?: string;
  proxyProfiles: ProxyConfig[];
  activeProxyName?: string;
  collections: RequestCollectionItem[];
  history: Array<{
    id: string;
    protocol: string;
    url: string;
    method?: string;
    status?: number;
    durationMs?: number;
    timestamp: number;
    summary?: string;
  }>;
  settings: {
    theme: 'dark' | 'light' | 'system';
    autoSaveCookies: boolean;
  };
}

export class StorageService {
  private filePath: string;
  private data: AppDataSchema;

  constructor() {
    const configDir = path.join(os.homedir(), '.network-tester');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    this.filePath = path.join(configDir, 'data.json');
    this.data = this.load();
  }

  private load(): AppDataSchema {
    try {
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (err) {
      console.warn('Failed to read storage file, initializing default:', err);
    }

    return {
      environments: [
        {
          id: 'default-env-dev',
          name: 'Development',
          variables: [
            { id: '1', key: 'baseUrl', value: 'http://localhost:9080', enabled: true },
            { id: '2', key: 'wsUrl', value: 'ws://localhost:9081', enabled: true },
            { id: '3', key: 'sseUrl', value: 'http://localhost:9082/sse', enabled: true },
          ],
        },
        {
          id: 'default-env-prod',
          name: 'Production',
          variables: [
            { id: '4', key: 'baseUrl', value: 'https://api.github.com', enabled: true },
          ],
        },
      ],
      activeEnvironmentId: 'default-env-dev',
      proxyProfiles: [
        {
          enabled: false,
          type: 'socks5',
          host: '127.0.0.1',
          port: 1080,
          name: 'Local SOCKS5 Proxy',
          countryCode: 'US',
        },
      ],
      collections: [
        {
          id: 'sample-col-1',
          name: 'Sample API Tests',
          type: 'folder',
          protocol: 'HTTP',
          children: [],
        },
      ],
      history: [],
      settings: {
        theme: 'dark',
        autoSaveCookies: true,
      },
    };
  }

  public save(): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save data.json:', err);
    }
  }

  public getData(): AppDataSchema {
    return this.data;
  }

  public getEnvironments(): Environment[] {
    return this.data.environments;
  }

  public saveEnvironment(env: Environment): void {
    const idx = this.data.environments.findIndex((e) => e.id === env.id);
    if (idx >= 0) {
      this.data.environments[idx] = env;
    } else {
      this.data.environments.push(env);
    }
    this.save();
  }

  public deleteEnvironment(envId: string): void {
    this.data.environments = this.data.environments.filter((e) => e.id !== envId);
    if (this.data.activeEnvironmentId === envId) {
      this.data.activeEnvironmentId = undefined;
    }
    this.save();
  }

  public setActiveEnvironment(envId?: string): void {
    this.data.activeEnvironmentId = envId;
    this.save();
  }

  public addHistoryItem(item: AppDataSchema['history'][0]): void {
    this.data.history.unshift(item);
    if (this.data.history.length > 200) {
      this.data.history.pop();
    }
    this.save();
  }

  public clearHistory(): void {
    this.data.history = [];
    this.save();
  }
}

export const globalStorageService = new StorageService();
