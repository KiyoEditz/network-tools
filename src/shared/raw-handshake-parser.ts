// src/shared/raw-handshake-parser.ts
import { KeyValuePair } from './types.js';

export function parseRawHandshake(raw: string): {
  url: string;
  headers: KeyValuePair[];
  subprotocols?: string[];
} {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let detectedUrl = '';
  const headers: KeyValuePair[] = [];
  let host = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect Request Line: e.g. "GET wss://... HTTP/1.1" or "Request URL: wss://..."
    if (i === 0 || !detectedUrl) {
      const getMatch = line.match(/^(?:GET|CONNECT)\s+([^\s]+)\s+HTTP/i);
      if (getMatch) {
        let uri = getMatch[1];
        if (uri.startsWith('ws://') || uri.startsWith('wss://') || uri.startsWith('http://') || uri.startsWith('https://')) {
          detectedUrl = uri.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
          continue;
        } else if (uri.startsWith('/')) {
          detectedUrl = uri;
          continue;
        }
      }
      const reqUrlMatch = line.match(/^Request URL:\s*(.+)$/i);
      if (reqUrlMatch) {
        detectedUrl = reqUrlMatch[1].trim().replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
        continue;
      }
    }

    // Header line: "Key: Value"
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      if (key.toLowerCase() === 'host') {
        host = value;
      }
      headers.push({
        id: `h-${Date.now()}-${i}`,
        key,
        value,
        enabled: true,
      });
    }
  }

  // If path was relative like "/ws/", prefix with host
  if (detectedUrl.startsWith('/') && host) {
    detectedUrl = `wss://${host}${detectedUrl}`;
  } else if (!detectedUrl && host) {
    detectedUrl = `wss://${host}/`;
  }

  const subprotoHeader = headers.find((h) => h.key.toLowerCase() === 'sec-websocket-protocol');
  const subprotocols = subprotoHeader ? subprotoHeader.value.split(',').map((s) => s.trim()) : undefined;

  return { url: detectedUrl, headers, subprotocols };
}
