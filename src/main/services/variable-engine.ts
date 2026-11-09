// src/main/services/variable-engine.ts
import crypto from 'node:crypto';
import { KeyValuePair } from '../../shared/types.js';

const COUNTRY_SAMPLE_SUBNETS: Record<string, string[]> = {
  US: ['8.8.8.', '1.1.1.', '104.16.1.', '140.82.112.'],
  SG: ['118.189.1.', '202.166.192.', '103.252.112.'],
  JP: ['133.242.1.', '210.140.10.', '122.215.1.'],
  ID: ['36.68.1.', '180.252.1.', '114.124.1.', '103.28.144.'],
  DE: ['185.12.64.', '178.63.1.', '94.130.1.'],
  GB: ['185.20.1.', '51.140.1.', '82.165.1.'],
};

export class VariableEngine {
  public static resolve(
    input: string,
    context?: {
      environment?: KeyValuePair[];
      globals?: KeyValuePair[];
      localVars?: Record<string, string>;
    }
  ): string {
    if (!input || typeof input !== 'string') return input;

    return input.replace(/\{\{([a-zA-Z0-9_$.(),\s\-]+)\}\}/g, (match, rawKey) => {
      const key = rawKey.trim();

      // Check dynamic built-ins
      const dynamicVal = this.resolveDynamic(key);
      if (dynamicVal !== undefined) return dynamicVal;

      // Check runtime / local variables
      if (context?.localVars && key in context.localVars) {
        return context.localVars[key];
      }

      // Check active environment variables
      if (context?.environment) {
        const found = context.environment.find((v) => v.enabled && v.key === key);
        if (found) return found.value;
      }

      // Check global variables
      if (context?.globals) {
        const found = context.globals.find((v) => v.enabled && v.key === key);
        if (found) return found.value;
      }

      // Keep original if not resolved
      return match;
    });
  }

  private static resolveDynamic(key: string): string | undefined {
    if (key === '$guid' || key === '$uuid') {
      return crypto.randomUUID();
    }
    if (key === '$timestamp') {
      return Math.floor(Date.now() / 1000).toString();
    }
    if (key === '$isoTimestamp') {
      return new Date().toISOString();
    }
    if (key === '$randomEmail') {
      const randStr = crypto.randomBytes(4).toString('hex');
      return `user_${randStr}@example.com`;
    }
    if (key === '$randomIpv4') {
      return `${this.rand(1, 223)}.${this.rand(1, 254)}.${this.rand(1, 254)}.${this.rand(1, 254)}`;
    }

    // $randomInt(min, max)
    const randomIntMatch = key.match(/^\$randomInt\((\d+),\s*(\d+)\)$/);
    if (randomIntMatch) {
      const min = parseInt(randomIntMatch[1], 10);
      const max = parseInt(randomIntMatch[2], 10);
      return this.rand(min, max).toString();
    }

    // $randomCountryIp(CODE)
    const countryIpMatch = key.match(/^\$randomCountryIp\(([A-Z]{2})\)$/);
    if (countryIpMatch) {
      const code = countryIpMatch[1];
      const subnets = COUNTRY_SAMPLE_SUBNETS[code] || COUNTRY_SAMPLE_SUBNETS['US'];
      const subnet = subnets[Math.floor(Math.random() * subnets.length)];
      return `${subnet}${this.rand(1, 254)}`;
    }

    return undefined;
  }

  public static rand(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
