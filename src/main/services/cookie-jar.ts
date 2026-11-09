// src/main/services/cookie-jar.ts
import { CookieJar as ToughCookieJar, Cookie } from 'tough-cookie';
import { CookieRecord } from '../../shared/types.js';

export class AppCookieJar {
  private jar: ToughCookieJar;

  constructor() {
    this.jar = new ToughCookieJar();
  }

  public async getCookies(url: string): Promise<CookieRecord[]> {
    try {
      const cookies = await this.jar.getCookies(url);
      return cookies.map((c) => ({
        key: c.key,
        value: c.value,
        domain: c.domain || '',
        path: c.path || '/',
        expires: c.expires instanceof Date ? c.expires.toISOString() : undefined,
        httpOnly: c.httpOnly,
        secure: c.secure,
        sameSite: c.sameSite,
      }));
    } catch {
      return [];
    }
  }

  public async getCookieHeader(url: string): Promise<string> {
    try {
      return await this.jar.getCookieString(url);
    } catch {
      return '';
    }
  }

  public async setCookie(rawCookie: string, url: string): Promise<void> {
    try {
      await this.jar.setCookie(rawCookie, url);
    } catch (err) {
      console.warn('Failed to parse and store cookie:', err);
    }
  }

  public async captureSetCookies(setCookieHeaders: string | string[] | undefined, url: string): Promise<void> {
    if (!setCookieHeaders) return;
    const list = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
    for (const raw of list) {
      if (raw) {
        await this.setCookie(raw, url);
      }
    }
  }

  public async getAllCookies(): Promise<CookieRecord[]> {
    return new Promise((resolve) => {
      this.jar.serialize((err, serialized) => {
        if (err || !serialized || !serialized.cookies) {
          resolve([]);
          return;
        }
        const records: CookieRecord[] = [];
        for (const c of (serialized.cookies as any[])) {
          records.push({
            key: String(c.key || ''),
            value: String(c.value || ''),
            domain: String(c.domain || ''),
            path: String(c.path || '/'),
            expires: c.expires ? new Date(c.expires).toISOString() : undefined,
            httpOnly: !!c.httpOnly,
            secure: !!c.secure,
            sameSite: c.sameSite ? String(c.sameSite) : undefined,
          });
        }
        resolve(records);
      });
    });
  }

  public async clearCookies(): Promise<void> {
    await this.jar.removeAllCookies();
  }
}

export const globalCookieJar = new AppCookieJar();
