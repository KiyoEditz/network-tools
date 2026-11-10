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

  public async importNetscapeCookies(rawText: string): Promise<number> {
    const lines = rawText.split('\n');
    let imported = 0;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const parts = trimmed.split('\t');
      if (parts.length >= 7) {
        const domain = parts[0];
        const path = parts[2] || '/';
        const secure = parts[3] === 'TRUE';
        const expiresSec = parseInt(parts[4], 10);
        const name = parts[5];
        const value = parts[6];

        if (!name) continue;

        const cleanDomain = domain.startsWith('.') ? domain.slice(1) : domain;
        const protocol = secure ? 'https://' : 'http://';
        const cookieUrl = `${protocol}${cleanDomain}${path}`;

        try {
          const cookie = new Cookie({
            key: name,
            value: value,
            domain: domain,
            path: path,
            secure: secure,
            expires: expiresSec > 0 ? new Date(expiresSec * 1000) : undefined,
          });
          await this.jar.setCookie(cookie, cookieUrl);
          imported++;
        } catch {
          // ignore parsing error for malformed lines
        }
      }
    }
    return imported;
  }

  public async getCookieHeaderForDomain(domain: string): Promise<string> {
    const clean = domain.startsWith('.') ? domain.slice(1) : domain;
    return await this.getCookieHeader(`https://${clean}/`);
  }
}

export const globalCookieJar = new AppCookieJar();
