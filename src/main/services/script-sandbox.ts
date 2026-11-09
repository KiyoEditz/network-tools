// src/main/services/script-sandbox.ts
import vm from 'node:vm';
import { HttpResponsePayload, KeyValuePair } from '../../shared/types.js';
import { globalVirtualStorage } from './virtual-storage.js';

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export class ScriptSandbox {
  public static run(
    code: string,
    context: {
      origin?: string;
      environment?: KeyValuePair[];
      localVars?: Record<string, string>;
      response?: Partial<HttpResponsePayload>;
    }
  ): { testResults: TestResult[]; modifiedLocalVars: Record<string, string> } {
    if (!code || !code.trim()) {
      return { testResults: [], modifiedLocalVars: context.localVars || {} };
    }

    const testResults: TestResult[] = [];
    const localVars = { ...(context.localVars || {}) };
    const origin = context.origin || 'http://localhost';

    const pm = {
      environment: {
        get: (k: string) => {
          const item = context.environment?.find((v) => v.enabled && v.key === k);
          return item ? item.value : undefined;
        },
        set: (k: string, v: string) => {
          if (context.environment) {
            const item = context.environment.find((envItem) => envItem.key === k);
            if (item) {
              item.value = String(v);
            } else {
              context.environment.push({ id: String(Date.now()), key: k, value: String(v), enabled: true });
            }
          }
        },
      },
      variables: {
        get: (k: string) => localVars[k],
        set: (k: string, v: string) => {
          localVars[k] = String(v);
        },
      },
      localStorage: {
        getItem: (k: string) => globalVirtualStorage.getItem(origin, 'localStorage', k),
        setItem: (k: string, v: string) => globalVirtualStorage.setItem(origin, 'localStorage', k, String(v)),
        removeItem: (k: string) => globalVirtualStorage.removeItem(origin, 'localStorage', k),
      },
      sessionStorage: {
        getItem: (k: string) => globalVirtualStorage.getItem(origin, 'sessionStorage', k),
        setItem: (k: string, v: string) => globalVirtualStorage.setItem(origin, 'sessionStorage', k, String(v)),
        removeItem: (k: string) => globalVirtualStorage.removeItem(origin, 'sessionStorage', k),
      },
      response: {
        status: context.response?.status,
        statusText: context.response?.statusText,
        headers: context.response?.headers,
        text: () => context.response?.body || '',
        json: () => {
          try {
            return JSON.parse(context.response?.body || '{}');
          } catch {
            return null;
          }
        },
      },
      test: (name: string, fn: () => void) => {
        try {
          fn();
          testResults.push({ name, passed: true });
        } catch (err: any) {
          testResults.push({ name, passed: false, error: err.message || String(err) });
        }
      },
      expect: (actual: any) => ({
        to: {
          equal: (expected: any) => {
            if (actual !== expected) throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
          },
          include: (expected: any) => {
            if (typeof actual === 'string' || Array.isArray(actual)) {
              if (!actual.includes(expected)) throw new Error(`Expected ${JSON.stringify(actual)} to include ${JSON.stringify(expected)}`);
            } else if (typeof actual === 'object' && actual !== null) {
              if (!(expected in actual)) throw new Error(`Expected object to have property ${expected}`);
            }
          },
          be: {
            a: (typeStr: string) => {
              if (typeof actual !== typeStr) throw new Error(`Expected ${typeof actual} to be a ${typeStr}`);
            },
            true: () => {
              if (actual !== true) throw new Error(`Expected ${actual} to be true`);
            },
            false: () => {
              if (actual !== false) throw new Error(`Expected ${actual} to be false`);
            },
          },
        },
      }),
    };

    const sandbox = {
      pm,
      console: {
        log: (...args: any[]) => console.log('[PM Script]', ...args),
        warn: (...args: any[]) => console.warn('[PM Script]', ...args),
        error: (...args: any[]) => console.error('[PM Script]', ...args),
      },
      btoa: (str: string) => Buffer.from(str).toString('base64'),
      atob: (b64: string) => Buffer.from(b64, 'base64').toString('utf-8'),
    };

    try {
      vm.createContext(sandbox);
      vm.runInContext(code, sandbox, { timeout: 3000 });
    } catch (err: any) {
      testResults.push({ name: 'Script Execution', passed: false, error: err.message || String(err) });
    }

    return { testResults, modifiedLocalVars: localVars };
  }
}
