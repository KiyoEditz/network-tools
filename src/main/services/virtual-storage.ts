// src/main/services/virtual-storage.ts
import { VirtualStorageRecord } from '../../shared/types.js';

export class VirtualStorageService {
  private store: Map<string, Map<string, string>> = new Map();

  private getCompositeKey(origin: string, type: 'localStorage' | 'sessionStorage'): string {
    return `${type}:${origin.toLowerCase().trim()}`;
  }

  public setItem(origin: string, type: 'localStorage' | 'sessionStorage', key: string, value: string): void {
    const composite = this.getCompositeKey(origin, type);
    if (!this.store.has(composite)) {
      this.store.set(composite, new Map());
    }
    this.store.get(composite)!.set(key, value);
  }

  public getItem(origin: string, type: 'localStorage' | 'sessionStorage', key: string): string | null {
    const composite = this.getCompositeKey(origin, type);
    const map = this.store.get(composite);
    if (!map) return null;
    return map.get(key) ?? null;
  }

  public removeItem(origin: string, type: 'localStorage' | 'sessionStorage', key: string): void {
    const composite = this.getCompositeKey(origin, type);
    this.store.get(composite)?.delete(key);
  }

  public clear(origin: string, type?: 'localStorage' | 'sessionStorage'): void {
    if (type) {
      this.store.delete(this.getCompositeKey(origin, type));
    } else {
      this.store.delete(this.getCompositeKey(origin, 'localStorage'));
      this.store.delete(this.getCompositeKey(origin, 'sessionStorage'));
    }
  }

  public getAllRecords(): VirtualStorageRecord[] {
    const records: VirtualStorageRecord[] = [];
    for (const [composite, map] of this.store.entries()) {
      const [type, origin] = composite.split(':') as ['localStorage' | 'sessionStorage', string];
      for (const [key, value] of map.entries()) {
        records.push({
          origin,
          type,
          key,
          value,
          updatedAt: Date.now(),
        });
      }
    }
    return records;
  }
}

export const globalVirtualStorage = new VirtualStorageService();
