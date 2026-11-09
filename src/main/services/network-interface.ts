// src/main/services/network-interface.ts
import os from 'node:os';

export interface LocalInterfaceInfo {
  name: string;
  address: string;
  family: 'IPv4' | 'IPv6';
  internal: boolean;
}

export class NetworkInterfaceService {
  public static getAvailableInterfaces(): LocalInterfaceInfo[] {
    const interfaces = os.networkInterfaces();
    const result: LocalInterfaceInfo[] = [];

    for (const [name, addrs] of Object.entries(interfaces)) {
      if (!addrs) continue;
      for (const info of addrs) {
        const rawFamily = (info as any).family;
        const family = typeof rawFamily === 'string' ? rawFamily : rawFamily === 4 ? 'IPv4' : 'IPv6';
        result.push({
          name,
          address: info.address,
          family: family as 'IPv4' | 'IPv6',
          internal: info.internal,
        });
      }
    }

    return result;
  }
}
