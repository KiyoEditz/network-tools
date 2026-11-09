// src/main/services/proxy-manager.ts
import { ProxyConfig } from '../../shared/types.js';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { request } from 'undici';

export class ProxyManager {
  public static getAgentForProxy(proxy?: ProxyConfig) {
    if (!proxy || !proxy.enabled || !proxy.host || !proxy.port) {
      return undefined;
    }

    const { type, host, port, auth } = proxy;
    let url = `${type}://`;
    if (auth && auth.username) {
      url += `${encodeURIComponent(auth.username)}:${encodeURIComponent(auth.password || '')}@`;
    }
    url += `${host}:${port}`;

    if (type.startsWith('socks')) {
      return new SocksProxyAgent(url);
    }

    // For HTTP/HTTPS proxies, socks-proxy-agent or undici Dispatcher
    return new SocksProxyAgent(url);
  }

  public static async testProxyExit(proxy: ProxyConfig): Promise<{
    success: boolean;
    ip?: string;
    country?: string;
    latencyMs: number;
    error?: string;
  }> {
    const start = Date.now();
    try {
      // Test proxy by contacting a simple IP reflection service
      const agent = this.getAgentForProxy(proxy);
      const res = await request('http://icanhazip.com', {
        dispatcher: agent as any,
        headersTimeout: 8000,
        bodyTimeout: 8000,
      });

      const ip = (await res.body.text()).trim();
      const latencyMs = Date.now() - start;

      return {
        success: true,
        ip,
        latencyMs,
      };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        error: err.message || 'Connection failed',
      };
    }
  }
}
