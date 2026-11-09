// src/shared/raw-handshake-parser.ts
import { KeyValuePair } from './types.js';

/**
 * Parses raw handshake text from:
 * 1. Standard Raw HTTP format (e.g. "GET wss://... HTTP/1.1\nHost: ...\nKey: Value")
 * 2. Chrome/Firefox DevTools copied "Request Headers" or "General" text
 * 3. Copied cURL command (bash, cmd, powershell)
 */
export function parseRawHandshake(raw: string): {
  url: string;
  headers: KeyValuePair[];
  subprotocols?: string[];
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { url: '', headers: [] };
  }

  // Check if input is a cURL command
  if (/^curl(?:\.exe)?\s+/i.test(trimmed)) {
    return parseCurlCommand(trimmed);
  }

  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let detectedUrl = '';
  const headers: KeyValuePair[] = [];
  let host = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Ignore DevTools section header labels
    if (/^(?:General|Request Headers|Response Headers|Query String Parameters):?$/i.test(line)) {
      continue;
    }

    // Ignore HTTP/2 pseudo-headers like :method, :authority, :scheme, :path
    if (line.startsWith(':')) {
      if (line.startsWith(':authority:') || line.startsWith(':authority ')) {
        host = line.split(/[:\s]+/).slice(1).join('').trim();
      }
      continue;
    }

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
      let key = line.slice(0, colonIdx).trim();
      let value = line.slice(colonIdx + 1).trim();

      // Normalize pseudo-header if not caught
      if (key.startsWith(':')) continue;

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

function parseCurlCommand(curl: string): {
  url: string;
  headers: KeyValuePair[];
  subprotocols?: string[];
} {
  // Join line continuations (\ or ^ or `)
  const normalized = curl.replace(/\\\r?\n|\^\r?\n|`\r?\n/g, ' ');

  // Extract URL: find the first quoted or unquoted argument after curl that starts with http or ws
  let url = '';
  const urlMatch = normalized.match(/['"](https?:\/\/[^'"]+|wss?:\/\/[^'"]+)['"]|(https?:\/\/[^\s]+|wss?:\/\/[^\s]+)/i);
  if (urlMatch) {
    const rawUrl = urlMatch[1] || urlMatch[2];
    url = rawUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
  }

  const headers: KeyValuePair[] = [];
  // Match -H 'Key: Value' or -H "Key: Value" or --header '...' or --header "..."
  const headerRegex = /(?:-H|--header)\s+(?:'([^']+)'|"([^"]+)")/gi;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = headerRegex.exec(normalized)) !== null) {
    const headerStr = match[1] !== undefined ? match[1] : match[2];
    const colonIdx = headerStr.indexOf(':');
    if (colonIdx > 0) {
      const key = headerStr.slice(0, colonIdx).trim();
      const value = headerStr.slice(colonIdx + 1).trim();

      if (!key.startsWith(':')) {
        headers.push({
          id: `h-${Date.now()}-${idx++}`,
          key,
          value,
          enabled: true,
        });
      }
    }
  }

  const subprotoHeader = headers.find((h) => h.key.toLowerCase() === 'sec-websocket-protocol');
  const subprotocols = subprotoHeader ? subprotoHeader.value.split(',').map((s) => s.trim()) : undefined;

  return { url, headers, subprotocols };
}
