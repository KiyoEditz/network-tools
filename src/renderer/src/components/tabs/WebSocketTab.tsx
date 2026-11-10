// src/renderer/src/components/tabs/WebSocketTab.tsx
import React, { useState, useEffect, useRef } from 'react';
import { TabItem, useAppStore } from '../../stores/app.store.js';
import { KeyValuePair } from '../../../../shared/types.js';
import { parseRawHandshake } from '../../../../shared/raw-handshake-parser.js';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Radio,
  Send,
  Trash2,
  Power,
  PowerOff,
  Plus,
  Clipboard,
  FileCode,
  Check,
  Search,
  Copy,
  Sparkles,
  Sliders,
  Globe,
  HelpCircle,
  X,
  RotateCcw,
  AlertCircle,
  Shield,
  Lock,
  Cookie as CookieIcon,
  Cpu,
} from 'lucide-react';

interface WebSocketTabProps {
  tab: TabItem;
}

// Preset Character.AI Raw Handshake snippet as requested by user
export const CHARACTER_AI_RAW = `GET wss://neo.character.ai/ws/ HTTP/1.1
Host: neo.character.ai
Connection: Upgrade
Pragma: no-cache
Cache-Control: no-cache
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
Upgrade: websocket
Origin: https://character.ai
Sec-WebSocket-Version: 13
Accept-Encoding: gzip, deflate, br, zstd
Accept-Language: id,en-US;q=0.9,en;q=0.8,ja;q=0.7
Sec-WebSocket-Key: QwkyrWhFzFVx0OrcoQNTHg==
Sec-WebSocket-Extensions: permessage-deflate; client_max_window_bits
Cookie: cf_clearance=YOUR_CF_CLEARANCE_FROM_BROWSER; sessionid=YOUR_SESSIONID_FROM_BROWSER`;

export const WebSocketTab: React.FC<WebSocketTabProps> = ({ tab }) => {
  const { updateTabState, updateTabRequest, activeProxy } = useAppStore();

  const [url, setUrl] = useState(tab.request.url || 'ws://127.0.0.1:9081');
  const [subTab, setSubTab] = useState<'headers' | 'params' | 'options'>('headers');
  const [messageText, setMessageText] = useState('{\n  "event": "greeting",\n  "message": "Hello WebSocket Server!"\n}');
  const [format, setFormat] = useState<'text' | 'json' | 'hex'>('json');
  const [heartbeat, setHeartbeat] = useState(true);
  const [heartbeatInterval, setHeartbeatInterval] = useState(5);
  const [subprotocolsInput, setSubprotocolsInput] = useState('');
  const [streamFilter, setStreamFilter] = useState<'all' | 'in' | 'out' | 'ping' | 'system'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Raw Import Modal state
  const [showRawModal, setShowRawModal] = useState(false);
  const [rawText, setRawText] = useState('');
  const [parsedPreview, setParsedPreview] = useState<{ url: string; headersCount: number } | null>(null);

  // TLS Fingerprinting (JA3 / JA4 Mimic) state
  const [tlsPreset, setTlsPreset] = useState<'chrome' | 'firefox' | 'safari' | 'custom' | 'default'>('chrome');
  const [customCiphers, setCustomCiphers] = useState('');
  const [customSigalgs, setCustomSigalgs] = useState('');
  const [customCurves, setCustomCurves] = useState('X25519:P-256:P-384');
  const [rejectUnauthorized, setRejectUnauthorized] = useState(false);

  // Engine selection: 'chromium' (Browser TLS / BoringSSL) or 'node' (Node.js OpenSSL)
  const [wsEngine, setWsEngine] = useState<'chromium' | 'node'>('chromium');
  const nativeWsRef = useRef<WebSocket | null>(null);
  const heartbeatTimerRef = useRef<any>(null);
  const [cookieStatus, setCookieStatus] = useState<string | null>(null);

  const timelineEndRef = useRef<HTMLDivElement>(null);
  const isConnected = tab.status === 'connected';
  const isSecure = url.trim().toLowerCase().startsWith('wss://');

  const headers = tab.request.headers || [];
  const queryParams = tab.request.queryParams || [];

  const isCharacterAi = url.toLowerCase().includes('character.ai');
  const hasAuthHeader = headers.some(
    (h) => h.enabled && (h.key.toLowerCase() === 'cookie' || h.key.toLowerCase() === 'authorization')
  );
  const hasMisplacedAuthCookies = headers.some(
    (h) => h.enabled && (h.key.toUpperCase() === 'HTTP_AUTHORIZATION' || h.key.toUpperCase() === 'GCLB')
  );

  const fixAuthHeaders = () => {
    const gclbHeader = headers.find((h) => h.key.toUpperCase() === 'GCLB');
    const authCookieHeader = headers.find((h) => h.key.toUpperCase() === 'HTTP_AUTHORIZATION');

    const gclbVal = gclbHeader ? gclbHeader.value.replace(/^"|"$/g, '') : '';
    const authVal = authCookieHeader ? authCookieHeader.value.replace(/^"|"$/g, '') : '';

    // Remove misplaced headers
    const filtered = headers.filter(
      (h) => h.key.toUpperCase() !== 'GCLB' && h.key.toUpperCase() !== 'HTTP_AUTHORIZATION'
    );

    // Build Cookie string
    const cookieParts: string[] = [];
    if (gclbVal) cookieParts.push(`GCLB="${gclbVal}"`);
    if (authVal) cookieParts.push(`HTTP_AUTHORIZATION="${authVal}"`);

    const existingCookieIdx = filtered.findIndex((h) => h.key.toLowerCase() === 'cookie');
    if (existingCookieIdx >= 0) {
      if (cookieParts.length) {
        filtered[existingCookieIdx].value = filtered[existingCookieIdx].value
          ? `${filtered[existingCookieIdx].value}; ${cookieParts.join('; ')}`
          : cookieParts.join('; ');
      }
    } else if (cookieParts.length) {
      filtered.unshift({
        id: `h-cookie-${Date.now()}`,
        key: 'Cookie',
        value: cookieParts.join('; '),
        enabled: true,
      });
    }

    // Set standard Authorization header
    if (authVal) {
      const existingAuthIdx = filtered.findIndex((h) => h.key.toLowerCase() === 'authorization');
      const cleanToken = authVal.replace(/^"|"$/g, '');
      if (existingAuthIdx >= 0) {
        filtered[existingAuthIdx].value = cleanToken;
      } else {
        filtered.unshift({
          id: `h-auth-${Date.now()}`,
          key: 'Authorization',
          value: cleanToken,
          enabled: true,
        });
      }
    }

    updateTabRequest(tab.id, { headers: filtered });
  };

  // Synchronize URL with Tab Request
  useEffect(() => {
    if (tab.request.url && tab.request.url !== url) {
      setUrl(tab.request.url);
    }
  }, [tab.request.url]);

  // Auto-scroll timeline when new events arrive
  useEffect(() => {
    if (autoScroll && timelineEndRef.current) {
      timelineEndRef.current.scrollTop = timelineEndRef.current.scrollHeight;
    }
  }, [tab.streamEvents, autoScroll]);

  // Update raw text preview whenever rawText changes in modal
  useEffect(() => {
    if (rawText.trim()) {
      const parsed = parseRawHandshake(rawText);
      setParsedPreview({
        url: parsed.url,
        headersCount: parsed.headers.length,
      });
    } else {
      setParsedPreview(null);
    }
  }, [rawText]);

  // Cleanup native WebSocket and heartbeat on unmount
  useEffect(() => {
    return () => {
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      if (nativeWsRef.current) nativeWsRef.current.close();
    };
  }, []);

  // One-click loader for cookies.txt
  const handleLoadWorkspaceCookies = async () => {
    try {
      if ((window as any).networkAPI?.loadWorkspaceCookies) {
        const res = await (window as any).networkAPI.loadWorkspaceCookies();
        if (res.success) {
          const cookieHeaderStr = await (window as any).networkAPI.getCookiesForUrl(url || 'https://character.ai');

          const updated = [...headers];
          const existingIdx = updated.findIndex((h) => h.key.toLowerCase() === 'cookie');
          if (existingIdx >= 0) {
            updated[existingIdx].value = cookieHeaderStr;
            updated[existingIdx].enabled = true;
          } else {
            updated.unshift({
              id: `h-cookie-${Date.now()}`,
              key: 'Cookie',
              value: cookieHeaderStr,
              enabled: true,
            });
          }

          if (!updated.some((h) => h.key.toLowerCase() === 'origin')) {
            updated.push({
              id: `h-origin-${Date.now()}`,
              key: 'Origin',
              value: 'https://character.ai',
              enabled: true,
            });
          }

          updateTabRequest(tab.id, { headers: updated });
          setCookieStatus(`Berhasil memuat ${res.count} cookies dari cookies.txt!`);
          setTimeout(() => setCookieStatus(null), 4000);
        } else {
          setCookieStatus('File cookies.txt tidak ditemukan di workspace root.');
          setTimeout(() => setCookieStatus(null), 4000);
        }
      }
    } catch (err: any) {
      setCookieStatus('Gagal memuat cookies: ' + err.message);
      setTimeout(() => setCookieStatus(null), 4000);
    }
  };

  // Connect / Disconnect Handler
  const handleToggleConnect = async () => {
    if (isConnected || tab.status === 'loading') {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
      if (nativeWsRef.current) {
        nativeWsRef.current.close(1000, 'User disconnected');
        nativeWsRef.current = null;
      }
      if ((window as any).networkAPI) {
        await (window as any).networkAPI.disconnectWs(tab.id);
      }
      updateTabState(tab.id, { status: 'idle' });
      return;
    }

    updateTabState(tab.id, { status: 'loading' });

    // 1. CHROMIUM NATIVE ENGINE (BoringSSL Genuine Chrome TLS / JA3 Match)
    if (wsEngine === 'chromium') {
      try {
        const headersObj: Record<string, string> = {};
        headers.forEach((h) => {
          if (h.enabled && h.key.trim()) {
            headersObj[h.key.trim()] = h.value;
          }
        });

        let domain = 'character.ai';
        try {
          const u = new URL(url);
          domain = u.hostname;
        } catch {
          // fallback
        }

        if ((window as any).networkAPI?.registerChromiumHeaders) {
          await (window as any).networkAPI.registerChromiumHeaders(domain, headersObj);
        }

        const subprotocols = subprotocolsInput
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

        const ws = new WebSocket(url, subprotocols.length ? subprotocols : undefined);
        nativeWsRef.current = ws;

        ws.onopen = () => {
          updateTabState(tab.id, { status: 'connected' });
          useAppStore.getState().appendStreamEvent(tab.id, {
            sessionId: tab.id,
            protocol: 'WEBSOCKET',
            direction: 'SYSTEM',
            timestamp: Date.now(),
            payload: `Connected to ${url} [Chromium Native Engine - 100% Genuine Chrome TLS / JA3 Bypass]`,
          });

          if (heartbeat) {
            heartbeatTimerRef.current = setInterval(() => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ command: 'ping' }));
                useAppStore.getState().appendStreamEvent(tab.id, {
                  sessionId: tab.id,
                  protocol: 'WEBSOCKET',
                  direction: 'PING',
                  timestamp: Date.now(),
                  payload: '{"command":"ping"}',
                });
              }
            }, heartbeatInterval * 1000);
          }
        };

        ws.onmessage = (event) => {
          const payload = typeof event.data === 'string' ? event.data : '[Binary Frame]';
          useAppStore.getState().appendStreamEvent(tab.id, {
            sessionId: tab.id,
            protocol: 'WEBSOCKET',
            direction: 'IN',
            timestamp: Date.now(),
            payload,
          });
        };

        ws.onerror = () => {
          useAppStore.getState().appendStreamEvent(tab.id, {
            sessionId: tab.id,
            protocol: 'WEBSOCKET',
            direction: 'SYSTEM',
            type: 'error',
            timestamp: Date.now(),
            payload: 'WebSocket error occurred in Chromium engine. Pastikan URL dan cookies valid.',
          });
        };

        ws.onclose = (e) => {
          if (heartbeatTimerRef.current) {
            clearInterval(heartbeatTimerRef.current);
            heartbeatTimerRef.current = null;
          }
          nativeWsRef.current = null;
          updateTabState(tab.id, { status: 'idle' });
          useAppStore.getState().appendStreamEvent(tab.id, {
            sessionId: tab.id,
            protocol: 'WEBSOCKET',
            direction: 'SYSTEM',
            timestamp: Date.now(),
            payload: `WebSocket closed: code ${e.code}${e.reason ? ` (${e.reason})` : ''}`,
          });
        };

        setTimeout(() => {
          const curTab = useAppStore.getState().tabs.find((t) => t.id === tab.id);
          if (curTab && curTab.status === 'loading') {
            updateTabState(tab.id, { status: 'error' });
            useAppStore.getState().appendStreamEvent(tab.id, {
              sessionId: tab.id,
              protocol: 'WEBSOCKET',
              direction: 'SYSTEM',
              timestamp: Date.now(),
              type: 'error',
              payload: 'Handshake timeout (Chromium). Silakan periksa kembali URL atau cookie.',
            });
          }
        }, 8000);
      } catch (err: any) {
        updateTabState(tab.id, { status: 'error' });
      }
      return;
    }

    // 2. NODE.JS ENGINE
    updateTabState(tab.id, { status: 'loading' });
    try {
      if ((window as any).networkAPI) {
        const headersObj: Record<string, string> = {};
        headers.forEach((h) => {
          if (h.enabled && h.key.trim()) {
            headersObj[h.key.trim()] = h.value;
          }
        });

        const subprotocols = subprotocolsInput
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

        await (window as any).networkAPI.connectWs({
          sessionId: tab.id,
          url,
          headers: headersObj,
          subprotocols: subprotocols.length ? subprotocols : undefined,
          proxy: activeProxy?.enabled ? activeProxy : undefined,
          heartbeatIntervalMs: heartbeat ? heartbeatInterval * 1000 : 0,
          tlsFingerprint: {
            enabled: true,
            preset: tlsPreset,
            ciphers: customCiphers || undefined,
            sigalgs: customSigalgs || undefined,
            ecdhCurve: customCurves || undefined,
            rejectUnauthorized,
          },
        });

        // Failsafe timeout in case handshake hangs without event
        setTimeout(() => {
          const curTab = useAppStore.getState().tabs.find((t) => t.id === tab.id);
          if (curTab && curTab.status === 'loading') {
            updateTabState(tab.id, { status: 'error' });
            useAppStore.getState().appendStreamEvent(tab.id, {
              sessionId: tab.id,
              protocol: 'WEBSOCKET',
              direction: 'SYSTEM',
              timestamp: Date.now(),
              type: 'error',
              payload: 'Handshake timeout: Server tidak merespon upgrade. Disarankan gunakan Chromium Native Engine.',
            });
          }
        }, 8000);
      }
    } catch (err: any) {
      updateTabState(tab.id, { status: 'error' });
    }
  };

  const handleSendMessage = async () => {
    if (!isConnected || !messageText.trim()) return;
    try {
      if (wsEngine === 'chromium' && nativeWsRef.current?.readyState === WebSocket.OPEN) {
        nativeWsRef.current.send(messageText);
        useAppStore.getState().appendStreamEvent(tab.id, {
          sessionId: tab.id,
          protocol: 'WEBSOCKET',
          direction: 'OUT',
          timestamp: Date.now(),
          payload: messageText,
        });
      } else if ((window as any).networkAPI) {
        await (window as any).networkAPI.sendWs({
          sessionId: tab.id,
          payload: messageText,
          format,
        });
      }
    } catch (err) {
      console.error('Failed to send WebSocket frame:', err);
    }
  };

  const handleClearMessages = () => {
    updateTabState(tab.id, { streamEvents: [] });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatJsonMessage = () => {
    try {
      const parsed = JSON.parse(messageText);
      setMessageText(JSON.stringify(parsed, null, 2));
      setFormat('json');
    } catch {
      // not valid json, ignore
    }
  };

  // Preset Handlers
  const loadCharacterAiPreset = () => {
    const parsed = parseRawHandshake(CHARACTER_AI_RAW);
    setUrl(parsed.url);
    updateTabRequest(tab.id, {
      url: parsed.url,
      headers: parsed.headers,
    });
    setSubTab('headers');
    setMessageText('{\n  "command": "ping"\n}');
  };

  const applyRawHandshake = () => {
    if (!rawText.trim()) return;
    const parsed = parseRawHandshake(rawText);
    if (parsed.url) {
      setUrl(parsed.url);
    }
    updateTabRequest(tab.id, {
      url: parsed.url || url,
      headers: parsed.headers.length ? parsed.headers : headers,
    });
    if (parsed.subprotocols && parsed.subprotocols.length) {
      setSubprotocolsInput(parsed.subprotocols.join(', '));
    }
    setShowRawModal(false);
    setRawText('');
    setSubTab('headers');
  };

  // Header management
  const handleAddHeader = () => {
    const list = [...headers];
    list.push({ id: `h-${Date.now()}`, key: '', value: '', enabled: true });
    updateTabRequest(tab.id, { headers: list });
  };

  const handleUpdateHeader = (index: number, patch: Partial<KeyValuePair>) => {
    const list = [...headers];
    list[index] = { ...list[index], ...patch };
    updateTabRequest(tab.id, { headers: list });
  };

  const handleDeleteHeader = (index: number) => {
    const list = headers.filter((_, i) => i !== index);
    updateTabRequest(tab.id, { headers: list });
  };

  // Query Params management
  const handleAddParam = () => {
    const list = [...queryParams];
    list.push({ id: `p-${Date.now()}`, key: '', value: '', enabled: true });
    updateTabRequest(tab.id, { queryParams: list });
    syncParamsToUrl(list);
  };

  const handleUpdateParam = (index: number, patch: Partial<KeyValuePair>) => {
    const list = [...queryParams];
    list[index] = { ...list[index], ...patch };
    updateTabRequest(tab.id, { queryParams: list });
    syncParamsToUrl(list);
  };

  const handleDeleteParam = (index: number) => {
    const list = queryParams.filter((_, i) => i !== index);
    updateTabRequest(tab.id, { queryParams: list });
    syncParamsToUrl(list);
  };

  const syncParamsToUrl = (paramsList: KeyValuePair[]) => {
    try {
      const u = new URL(url);
      const searchParams = new URLSearchParams();
      paramsList.forEach((p) => {
        if (p.enabled && p.key.trim()) {
          searchParams.append(p.key.trim(), p.value);
        }
      });
      u.search = searchParams.toString();
      const updatedUrl = u.toString();
      setUrl(updatedUrl);
      updateTabRequest(tab.id, { url: updatedUrl });
    } catch {
      // url might be partial/invalid while typing
    }
  };

  // Check if header is auto-managed by RFC 6455
  const isReservedHeader = (key: string) => {
    const lower = key.toLowerCase();
    return ['sec-websocket-key', 'sec-websocket-version', 'upgrade', 'connection'].includes(lower);
  };

  // Filter messages
  const filteredEvents = (tab.streamEvents || []).filter((ev) => {
    if (streamFilter === 'in' && ev.direction !== 'IN') return false;
    if (streamFilter === 'out' && ev.direction !== 'OUT') return false;
    if (streamFilter === 'ping' && ev.type !== 'ping' && ev.type !== 'pong') return false;
    if (streamFilter === 'system' && ev.direction !== 'SYSTEM') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const payloadStr = typeof ev.payload === 'object' ? JSON.stringify(ev.payload) : String(ev.payload);
      return payloadStr.toLowerCase().includes(q) || ev.type.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 overflow-hidden text-xs select-none">
      {/* ================= TOP CONNECTION BAR ================= */}
      <div className="p-3 bg-slate-900/95 border-b border-slate-800 flex items-center gap-2.5 shadow-sm">
        {/* Protocol Badge */}
        <span
          className={`font-mono font-bold px-2.5 py-1.5 rounded border text-xs tracking-wider ${
            isSecure
              ? 'text-cyan-400 bg-cyan-950/40 border-cyan-800/60'
              : 'text-amber-400 bg-amber-950/40 border-amber-800/60'
          }`}
          title={isSecure ? 'WebSocket Secure (TLS/SSL)' : 'Standard WebSocket (Unencrypted)'}
        >
          {isSecure ? 'WSS' : 'WS'}
        </span>

        {/* URL Input */}
        <div className="flex-1 flex items-center bg-slate-800 border border-slate-700/80 rounded px-3 py-1 focus-within:border-amber-500 transition shadow-inner">
          <input
            type="text"
            value={url}
            disabled={isConnected}
            onChange={(e) => {
              setUrl(e.target.value);
              updateTabRequest(tab.id, { url: e.target.value });
            }}
            onKeyDown={(e) => e.key === 'Enter' && !isConnected && handleToggleConnect()}
            placeholder="wss://neo.character.ai/ws/ or ws://127.0.0.1:9081"
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 font-mono text-xs outline-none py-1 disabled:opacity-60"
          />
        </div>

        {/* Import Raw Handshake Button */}
        <button
          onClick={() => {
            setRawText(CHARACTER_AI_RAW);
            setShowRawModal(true);
          }}
          disabled={isConnected}
          className="flex items-center gap-1.5 px-3 py-2 rounded bg-slate-800 hover:bg-slate-700/80 text-amber-300 border border-amber-500/30 transition disabled:opacity-40 cursor-pointer"
          title="Paste raw HTTP request / WebSocket handshake to auto-fill form"
        >
          <FileCode className="w-3.5 h-3.5" />
          <span className="font-medium hidden sm:inline">Import Raw</span>
        </button>

        {/* Quick Character.AI preset button */}
        <button
          onClick={loadCharacterAiPreset}
          disabled={isConnected}
          className="flex items-center gap-1.5 px-3 py-2 rounded bg-indigo-950/50 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-700/40 transition disabled:opacity-40 cursor-pointer"
          title="Load Character.AI Handshake Configuration"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="font-medium hidden md:inline">Character.AI</span>
        </button>

        {/* Quick Cookies.txt loader button */}
        <button
          onClick={handleLoadWorkspaceCookies}
          disabled={isConnected}
          className="flex items-center gap-1.5 px-3 py-2 rounded bg-amber-950/50 hover:bg-amber-900/60 text-amber-300 border border-amber-600/40 transition disabled:opacity-40 cursor-pointer"
          title="Muat cookies dari cookies.txt di workspace"
        >
          <CookieIcon className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-medium hidden lg:inline">Cookies.txt</span>
        </button>

        {/* Connect / Disconnect Action Button */}
        <button
          onClick={handleToggleConnect}
          disabled={tab.status === 'loading'}
          className={`flex items-center gap-2 px-5 py-2 rounded font-semibold transition cursor-pointer shadow-md ${
            isConnected
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
              : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
          } disabled:opacity-50`}
        >
          {isConnected ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
          {tab.status === 'loading' ? 'Connecting...' : isConnected ? 'Disconnect' : 'Connect'}
        </button>
      </div>

      {/* ================= MAIN SPLIT CONTENT ================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* ================= LEFT PANE: HANDSHAKE CONFIG & COMPOSER ================= */}
        <div className="w-1/2 flex flex-col border-r border-slate-800 bg-slate-950/40 overflow-hidden">
          {/* Sub-Tabs Navigation */}
          <div className="flex items-center justify-between px-3 pt-2 bg-slate-800/40 border-b border-slate-800">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSubTab('headers')}
                className={`px-3 py-1.5 font-medium rounded-t transition flex items-center gap-1.5 ${
                  subTab === 'headers'
                    ? 'bg-slate-900 text-amber-400 border-t-2 border-amber-500'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Headers</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                  {headers.filter((h) => h.enabled && h.key).length}/{headers.length}
                </span>
              </button>

              <button
                onClick={() => setSubTab('params')}
                className={`px-3 py-1.5 font-medium rounded-t transition flex items-center gap-1.5 ${
                  subTab === 'params'
                    ? 'bg-slate-900 text-amber-400 border-t-2 border-amber-500'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Params</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                  {queryParams.filter((p) => p.enabled && p.key).length}
                </span>
              </button>

              <button
                onClick={() => setSubTab('options')}
                className={`px-3 py-1.5 font-medium rounded-t transition flex items-center gap-1.5 ${
                  subTab === 'options'
                    ? 'bg-slate-900 text-amber-400 border-t-2 border-amber-500'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sliders className="w-3 h-3" />
                <span>Options</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 uppercase">
                  {wsEngine === 'chromium' ? 'Chromium TLS' : `Node: ${tlsPreset}`}
                </span>
              </button>
            </div>

            {subTab === 'headers' && (
              <button
                onClick={handleAddHeader}
                disabled={isConnected}
                className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 py-1 transition disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" /> Add Header
              </button>
            )}

            {subTab === 'params' && (
              <button
                onClick={handleAddParam}
                disabled={isConnected}
                className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 py-1 transition disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" /> Add Param
              </button>
            )}
          </div>

          {/* Sub-Tab Content View */}
          <div className="flex-1 overflow-auto p-3 space-y-3">
            {/* 1. HEADERS SUB-TAB */}
            {subTab === 'headers' && (
              <div className="space-y-2.5">
                {/* Cookie Import Status Toast */}
                {cookieStatus && (
                  <div className="p-2.5 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-medium">{cookieStatus}</span>
                  </div>
                )}

                {/* Character.AI Cloudflare / TLS Fingerprint Notice */}
                {isCharacterAi && (
                  <div className="p-2.5 rounded bg-sky-950/40 border border-sky-500/50 text-sky-200 text-[11px] leading-relaxed flex items-start gap-2">
                    <Shield className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <strong className="text-sky-300">Cloudflare Bot Management &amp; TLS Fingerprinting:</strong>
                      <p className="mt-0.5 text-slate-300">
                        Endpoint <code>neo.character.ai</code> memeriksa <strong>TLS Fingerprint (JA3 / JA4)</strong> dan token sesi. Engine <strong>Chromium Native</strong> aktif otomatis untuk melewati proteksi bot Cloudflare.
                      </p>
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <button
                          onClick={handleLoadWorkspaceCookies}
                          className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-medium text-[11px] cursor-pointer flex items-center gap-1 shadow"
                        >
                          <CookieIcon className="w-3.5 h-3.5" /> Pasang Cookies dari cookies.txt
                        </button>
                        <button
                          onClick={() => setSubTab('options')}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-500/30 font-medium text-[11px] cursor-pointer flex items-center gap-1"
                        >
                          <Sliders className="w-3.5 h-3.5" /> Engine &amp; TLS Options
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Detected Misplaced Cookie Headers (e.g. HTTP_AUTHORIZATION or GCLB entered as headers) */}
                {hasMisplacedAuthCookies && (
                  <div className="p-2.5 rounded bg-blue-950/40 border border-blue-500/50 text-blue-200 text-[11px] leading-relaxed flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <strong className="text-blue-300">Penyesuaian Format Otomatis Tersedia:</strong>
                      <p className="mt-0.5 text-slate-300">
                        Terdeteksi header <code>HTTP_AUTHORIZATION</code> atau <code>GCLB</code>. Di Character.AI, nilai tersebut adalah <strong>Cookie</strong> dan header <strong>Authorization</strong> resmi (bukan nama header terpisah).
                      </p>
                      <button
                        onClick={fixAuthHeaders}
                        className="mt-2 px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-[11px] cursor-pointer flex items-center gap-1.5 shadow"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Perbaiki Format Otomatis Sekarang
                      </button>
                    </div>
                  </div>
                )}

                {headers.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 border border-dashed border-slate-800 rounded">
                    No handshake headers configured.{' '}
                    <button
                      onClick={loadCharacterAiPreset}
                      className="text-amber-400 hover:underline cursor-pointer ml-1"
                    >
                      Click here to load Character.AI headers
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {headers.map((h, idx) => {
                      const reserved = isReservedHeader(h.key);
                      return (
                        <div key={h.id || idx} className="flex items-center gap-1.5 group">
                          {/* Enabled Checkbox */}
                          <input
                            type="checkbox"
                            checked={h.enabled}
                            disabled={isConnected}
                            onChange={(e) => handleUpdateHeader(idx, { enabled: e.target.checked })}
                            className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                          />

                          {/* Key Input */}
                          <div className="relative w-1/3">
                            <input
                              type="text"
                              value={h.key}
                              disabled={isConnected}
                              placeholder="Header name"
                              onChange={(e) => handleUpdateHeader(idx, { key: e.target.value })}
                              className="w-full px-2.5 py-1.5 rounded bg-slate-800/90 border border-slate-700 font-mono text-xs text-slate-200 outline-none focus:border-amber-500"
                            />
                            {reserved && (
                              <span
                                className="absolute right-1.5 top-1.5 text-[9px] px-1 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-700"
                                title="Auto-managed by WebSocket engine nonce"
                              >
                                Auto
                              </span>
                            )}
                          </div>

                          {/* Value Input */}
                          <input
                            type="text"
                            value={h.value}
                            disabled={isConnected}
                            placeholder="Value"
                            onChange={(e) => handleUpdateHeader(idx, { value: e.target.value })}
                            className="flex-1 px-2.5 py-1.5 rounded bg-slate-800/90 border border-slate-700 font-mono text-xs text-slate-200 outline-none focus:border-amber-500"
                          />

                          {/* Delete Action */}
                          <button
                            onClick={() => handleDeleteHeader(idx)}
                            disabled={isConnected}
                            className="text-slate-500 hover:text-rose-400 p-1 transition opacity-70 group-hover:opacity-100 disabled:opacity-20 cursor-pointer"
                            title="Remove Header"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 2. PARAMS SUB-TAB */}
            {subTab === 'params' && (
              <div className="space-y-2.5">
                <div className="text-slate-400 text-[11px]">
                  URL Query parameters (e.g. <code className="text-amber-400">?token=xxx&version=2</code>) automatically
                  synchronized with the WebSocket URL.
                </div>

                {queryParams.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 border border-dashed border-slate-800 rounded">
                    No query parameters configured.{' '}
                    <button
                      onClick={handleAddParam}
                      className="text-amber-400 hover:underline cursor-pointer ml-1"
                    >
                      Add parameter
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {queryParams.map((p, idx) => (
                      <div key={p.id || idx} className="flex items-center gap-1.5 group">
                        <input
                          type="checkbox"
                          checked={p.enabled}
                          disabled={isConnected}
                          onChange={(e) => handleUpdateParam(idx, { enabled: e.target.checked })}
                          className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={p.key}
                          disabled={isConnected}
                          placeholder="Parameter"
                          onChange={(e) => handleUpdateParam(idx, { key: e.target.value })}
                          className="w-1/3 px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 font-mono text-xs text-slate-200 outline-none focus:border-amber-500"
                        />
                        <input
                          type="text"
                          value={p.value}
                          disabled={isConnected}
                          placeholder="Value"
                          onChange={(e) => handleUpdateParam(idx, { value: e.target.value })}
                          className="flex-1 px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 font-mono text-xs text-slate-200 outline-none focus:border-amber-500"
                        />
                        <button
                          onClick={() => handleDeleteParam(idx)}
                          disabled={isConnected}
                          className="text-slate-500 hover:text-rose-400 p-1 transition opacity-70 group-hover:opacity-100 disabled:opacity-20 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. OPTIONS SUB-TAB */}
            {subTab === 'options' && (
              <div className="space-y-4">
                {/* WebSocket Engine Selection */}
                <div className="p-3 bg-slate-800/50 rounded border border-indigo-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-indigo-400" />
                      <span className="font-semibold text-slate-200">WebSocket Engine Architecture</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700 font-mono font-medium">
                      {wsEngine === 'chromium' ? 'Chromium Native' : 'Node.js Backend'}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Pilih engine koneksi WebSocket yang digunakan. Chromium Native direkomendasikan untuk target yang diproteksi bot Cloudflare.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div
                      onClick={() => !isConnected && setWsEngine('chromium')}
                      className={`p-2.5 rounded border cursor-pointer transition ${
                        wsEngine === 'chromium'
                          ? 'bg-indigo-950/70 border-indigo-500 text-indigo-200 shadow-sm'
                          : 'bg-slate-900 border-slate-700/60 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold text-xs">
                        <span>Chromium Native (Browser TLS)</span>
                        {wsEngine === 'chromium' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                      </div>
                      <p className="mt-1 text-[10px] text-slate-400 leading-normal">
                        BoringSSL stack 100% identik dengan Google Chrome. Melewati Cloudflare Bot Management &amp; deteksi JA3/JA4.
                      </p>
                    </div>

                    <div
                      onClick={() => !isConnected && setWsEngine('node')}
                      className={`p-2.5 rounded border cursor-pointer transition ${
                        wsEngine === 'node'
                          ? 'bg-indigo-950/70 border-indigo-500 text-indigo-200 shadow-sm'
                          : 'bg-slate-900 border-slate-700/60 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold text-xs">
                        <span>Node.js Backend (OpenSSL)</span>
                        {wsEngine === 'node' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                      </div>
                      <p className="mt-1 text-[10px] text-slate-400 leading-normal">
                        Engine Node.js murni dengan konfigurasi cipher suite dan TLS preset manual. Cocok untuk server lokal atau RFC testing.
                      </p>
                    </div>
                  </div>
                </div>

                {/* TLS Fingerprinting (JA3 / JA4 Mimic) */}
                <div className="p-3 bg-slate-800/50 rounded border border-cyan-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-cyan-400" />
                      <span className="font-semibold text-slate-200">TLS Fingerprinting (JA3 / JA4 Mimic)</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
                      Bypass Cloudflare / Akamai
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Meniru tanda tangan TLS ClientHello browser resmi (Ciphers, Elliptic Curves, Signature Algorithms, TLS 1.3) agar tidak diblokir atau di-flag <code>403 Forbidden</code> oleh bot manager seperti Cloudflare.
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300 font-medium block">Browser Profile Preset:</label>
                    <select
                      value={tlsPreset}
                      disabled={isConnected}
                      onChange={(e) => setTlsPreset(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 font-sans text-xs text-slate-200 outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      <option value="chrome">Google Chrome 120+ / Windows (JA3/JA4 Mimic) — Direkomendasikan</option>
                      <option value="firefox">Mozilla Firefox 120+ (JA3/JA4 Mimic)</option>
                      <option value="safari">Apple Safari 17+ (JA3/JA4 Mimic)</option>
                      <option value="custom">Custom Cipher Suite &amp; Curves</option>
                      <option value="default">Default Node.js TLS (OpenSSL Standard)</option>
                    </select>
                  </div>

                  {/* Summary of Active Profile */}
                  <div className="p-2.5 bg-slate-900/90 rounded border border-slate-800 text-[11px] font-mono text-slate-300 space-y-1.5">
                    <div className="flex justify-between items-center text-slate-400">
                      <span>TLS Versions:</span>
                      <span className="text-emerald-400 font-medium">TLSv1.2 ~ TLSv1.3</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Curves:</span>
                      <span className="text-cyan-300 font-medium">
                        {tlsPreset === 'custom' ? customCurves : tlsPreset === 'firefox' ? 'X25519:P-256:P-384:P-521' : 'X25519:P-256:P-384'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Ciphers:</span>
                      <span className="text-amber-300 truncate max-w-[260px]" title={tlsPreset}>
                        {tlsPreset === 'chrome' ? 'TLS_AES_128_GCM, CHACHA20, ECDHE-RSA/ECDSA' : tlsPreset}
                      </span>
                    </div>
                  </div>

                  {tlsPreset === 'custom' && (
                    <div className="space-y-2 pt-2 border-t border-slate-700/50">
                      <div>
                        <label className="text-[11px] text-slate-300 font-medium block">Custom Ciphers (Colon-separated):</label>
                        <input
                          type="text"
                          value={customCiphers}
                          disabled={isConnected}
                          placeholder="e.g. TLS_AES_128_GCM_SHA256:ECDHE-RSA-AES128-GCM-SHA256"
                          onChange={(e) => setCustomCiphers(e.target.value)}
                          className="w-full mt-1 px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 font-mono text-xs text-slate-200 outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-300 font-medium block">Custom Curves:</label>
                        <input
                          type="text"
                          value={customCurves}
                          disabled={isConnected}
                          placeholder="e.g. X25519:P-256:P-384"
                          onChange={(e) => setCustomCurves(e.target.value)}
                          className="w-full mt-1 px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 font-mono text-xs text-slate-200 outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-300">
                      <input
                        type="checkbox"
                        checked={rejectUnauthorized}
                        disabled={isConnected}
                        onChange={(e) => setRejectUnauthorized(e.target.checked)}
                        className="rounded bg-slate-800 border-slate-700 text-cyan-500"
                      />
                      <span>Strict Certificate Validation</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setTlsPreset('chrome');
                        setCustomCurves('X25519:P-256:P-384');
                        setCustomCiphers('');
                        setRejectUnauthorized(false);
                      }}
                      className="text-[10px] text-slate-400 hover:text-cyan-400 flex items-center gap-1 cursor-pointer transition"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset ke Chrome
                    </button>
                  </div>
                </div>

                {/* Heartbeat Configuration */}
                <div className="p-3 bg-slate-800/50 rounded border border-slate-700/60 space-y-2">
                  <div className="font-semibold text-slate-200 flex items-center justify-between">
                    <span>Keep-Alive / Heartbeat (Ping-Pong)</span>
                    <input
                      type="checkbox"
                      checked={heartbeat}
                      disabled={isConnected}
                      onChange={(e) => setHeartbeat(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-amber-500 cursor-pointer"
                    />
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Periodically transmits WebSocket ping control frames to keep connection alive and measure round-trip latency (RTT).
                  </p>
                  {heartbeat && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-slate-400 text-xs">Interval (seconds):</span>
                      <input
                        type="number"
                        min="1"
                        max="300"
                        value={heartbeatInterval}
                        disabled={isConnected}
                        onChange={(e) => setHeartbeatInterval(Number(e.target.value) || 5)}
                        className="w-20 px-2 py-1 rounded bg-slate-900 border border-slate-700 font-mono text-xs text-slate-200 outline-none focus:border-amber-500"
                      />
                    </div>
                  )}
                </div>

                {/* Subprotocols */}
                <div className="p-3 bg-slate-800/50 rounded border border-slate-700/60 space-y-2">
                  <div className="font-semibold text-slate-200">WebSocket Subprotocols</div>
                  <p className="text-slate-400 text-[11px]">
                    Comma-separated protocols passed in <code className="text-slate-300">Sec-WebSocket-Protocol</code> header
                    (e.g. <code className="text-amber-400">graphql-transport-ws, wamp</code>).
                  </p>
                  <input
                    type="text"
                    value={subprotocolsInput}
                    disabled={isConnected}
                    placeholder="e.g. graphql-transport-ws"
                    onChange={(e) => setSubprotocolsInput(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 font-mono text-xs text-slate-200 outline-none focus:border-amber-500"
                  />
                </div>

                {/* Proxy Association */}
                <div className="p-3 bg-slate-800/50 rounded border border-slate-700/60 space-y-1">
                  <div className="font-semibold text-slate-200">Egress Proxy Routing</div>
                  <p className="text-slate-400 text-[11px]">
                    {activeProxy?.enabled
                      ? `Routing via active proxy profile: ${activeProxy.type.toUpperCase()}://${activeProxy.host}:${activeProxy.port}`
                      : 'Direct Connection (No Proxy enabled). Configure proxy profiles in the top bar.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ================= BOTTOM COMPOSER ================= */}
          <div className="p-3 bg-slate-900 border-t border-slate-800 flex flex-col gap-2">
            <div className="flex items-center justify-between text-slate-400">
              <div className="flex items-center gap-3">
                <span className="font-medium text-slate-300">Compose Frame:</span>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input type="radio" checked={format === 'json'} onChange={() => setFormat('json')} /> JSON
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input type="radio" checked={format === 'text'} onChange={() => setFormat('text')} /> Text
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input type="radio" checked={format === 'hex'} onChange={() => setFormat('hex')} /> Hex
                </label>
              </div>

              <div className="flex items-center gap-2">
                {isCharacterAi && (
                  <div className="flex items-center gap-1.5 text-[11px] mr-2">
                    <span className="text-slate-500">Preset:</span>
                    <button
                      onClick={() => {
                        setFormat('json');
                        setMessageText(JSON.stringify({ command: 'ping' }, null, 2));
                      }}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] cursor-pointer"
                    >
                      ping
                    </button>
                    <button
                      onClick={() => {
                        setFormat('json');
                        setMessageText(
                          JSON.stringify(
                            {
                              command: 'update_primary_candidate',
                              origin_id: 'web-next',
                              payload: {
                                candidate_id: 'chatcmpl-239ad3a789c9a219ce6abccf4ca766c1',
                                chat_type: 'TYPE_ONE_ON_ONE',
                                turn_key: {
                                  chat_id: '932a6233-84fa-4000-8d4b-7da858144803',
                                  turn_id: '79f916ad-3aa3-4eb1-9e53-b1f15e55ab28',
                                },
                              },
                            },
                            null,
                            2
                          )
                        );
                      }}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] cursor-pointer"
                    >
                      update_candidate
                    </button>
                  </div>
                )}
                {format === 'json' && (
                  <button
                    onClick={formatJsonMessage}
                    className="text-indigo-400 hover:text-indigo-300 transition text-[11px] cursor-pointer"
                  >
                    Format JSON
                  </button>
                )}
                <button
                  onClick={handleSendMessage}
                  disabled={!isConnected}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-40 cursor-pointer shadow"
                  title="Send WebSocket Message (Ctrl + Enter)"
                >
                  <Send className="w-3 h-3" /> Send Frame
                </button>
              </div>
            </div>

            <textarea
              rows={4}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => {
                if (e.ctrlKey && e.key === 'Enter') {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Enter JSON, text, or hex string to transmit..."
              className="w-full p-2.5 rounded bg-slate-800/90 border border-slate-700/80 font-mono text-xs text-slate-100 outline-none focus:border-indigo-500 leading-relaxed resize-none"
            />
          </div>
        </div>

        {/* ================= RIGHT PANE: MESSAGES TIMELINE ================= */}
        <div className="w-1/2 flex flex-col bg-slate-950/70 overflow-hidden">
          {/* Timeline Toolbar */}
          <div className="p-2.5 bg-slate-800/50 border-b border-slate-800 flex items-center justify-between gap-2">
            {/* Status & Filters */}
            <div className="flex items-center gap-1.5">
              <Radio
                className={`w-3.5 h-3.5 ${
                  isConnected ? 'text-emerald-400 animate-pulse' : 'text-slate-500'
                }`}
              />
              <span className="font-medium text-slate-300">
                Timeline ({filteredEvents.length})
              </span>

              {/* Filter Pills */}
              <div className="flex items-center gap-1 ml-2 text-[11px]">
                {(['all', 'in', 'out', 'ping', 'system'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStreamFilter(filter)}
                    className={`px-2 py-0.5 rounded capitalize transition cursor-pointer ${
                      streamFilter === filter
                        ? 'bg-amber-600/40 text-amber-300 border border-amber-500/50'
                        : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions: Search, AutoScroll, Clear */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-800 border border-slate-700/80 rounded px-2 py-0.5">
                <Search className="w-3 h-3 text-slate-400 mr-1" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter payload..."
                  className="bg-transparent text-slate-200 text-[11px] outline-none w-24 sm:w-28"
                />
              </div>

              <button
                onClick={handleClearMessages}
                className="flex items-center gap-1 text-slate-400 hover:text-rose-400 transition cursor-pointer p-1"
                title="Clear Timeline"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Stream Messages Container */}
          <div
            ref={timelineEndRef}
            className="flex-1 overflow-auto p-3 space-y-2 font-mono text-xs select-text"
          >
            {filteredEvents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                <Radio className="w-8 h-8 opacity-30" />
                <p>No WebSocket frames recorded.</p>
                <p className="text-[11px] text-slate-600">
                  Connect to a WebSocket server and send messages to inspect frames.
                </p>
              </div>
            ) : (
              filteredEvents.map((ev, idx) => {
                const isOut = ev.direction === 'OUT';
                const isIn = ev.direction === 'IN';
                const isPingPong = ev.type === 'ping' || ev.type === 'pong';
                const isError = ev.type === 'error';

                const payloadText =
                  typeof ev.payload === 'object'
                    ? JSON.stringify(ev.payload, null, 2)
                    : String(ev.payload);

                return (
                  <div
                    key={idx}
                    className={`p-2.5 rounded border transition ${
                      isOut
                        ? 'bg-emerald-950/25 border-emerald-800/40 text-emerald-200'
                        : isIn
                        ? 'bg-blue-950/25 border-blue-800/40 text-blue-200'
                        : isPingPong
                        ? 'bg-amber-950/25 border-amber-800/40 text-amber-200'
                        : isError
                        ? 'bg-rose-950/30 border-rose-800/50 text-rose-200'
                        : 'bg-slate-800/40 border-slate-700/50 text-slate-300'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex items-center justify-between text-[11px] opacity-80 mb-1 border-b border-white/5 pb-1">
                      <span className="flex items-center gap-1.5 font-semibold">
                        {isOut ? (
                          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                        ) : isIn ? (
                          <ArrowDownLeft className="w-3.5 h-3.5 text-blue-400" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                        )}
                        <span>{ev.direction}</span>
                        <span className="text-[10px] px-1 py-0.2 rounded bg-black/30 font-normal">
                          {ev.type.toUpperCase()}
                        </span>
                        {ev.sizeBytes ? (
                          <span className="text-[10px] text-slate-400">{ev.sizeBytes} B</span>
                        ) : null}
                      </span>

                      <div className="flex items-center gap-2">
                        <span>
                          {new Date(ev.timestamp).toLocaleTimeString()}.
                          {String(ev.timestamp % 1000).padStart(3, '0')}
                        </span>
                        <button
                          onClick={() => copyToClipboard(payloadText, `copy-${idx}`)}
                          className="hover:text-white transition p-0.5 cursor-pointer"
                          title="Copy payload"
                        >
                          {copiedId === `copy-${idx}` ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3 text-slate-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Payload Body */}
                    <pre className="whitespace-pre-wrap break-all text-slate-200 text-xs leading-relaxed font-mono mt-1">
                      {payloadText}
                    </pre>

                    {/* Raw Hex view if available */}
                    {ev.rawHex && (
                      <div className="mt-1.5 pt-1.5 border-t border-slate-800 text-[10px] text-slate-400">
                        <span className="font-semibold text-slate-500 mr-1">HEX:</span>
                        {ev.rawHex}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ================= RAW HANDSHAKE IMPORT MODAL ================= */}
      {showRawModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-amber-400" />
                <h3 className="font-semibold text-sm text-slate-100">
                  Import Raw WebSocket Handshake
                </h3>
              </div>
              <button
                onClick={() => setShowRawModal(false)}
                className="text-slate-400 hover:text-slate-200 transition p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-3 flex-1 overflow-auto">
              <p className="text-slate-400 text-xs leading-relaxed">
                Paste the raw HTTP request or WebSocket upgrade handshake copied from your Browser DevTools
                (Network &gt; WS &gt; Headers) or cURL. The parser will automatically extract the target URL,
                Origin, User-Agent, and headers.
              </p>

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Raw Request / Handshake:</span>
                <button
                  onClick={() => setRawText(CHARACTER_AI_RAW)}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" /> Load Character.AI Handshake
                </button>
              </div>

              <textarea
                rows={10}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="GET wss://neo.character.ai/ws/ HTTP/1.1&#10;Host: neo.character.ai&#10;Origin: https://character.ai&#10;User-Agent: Mozilla/5.0...&#10;..."
                className="w-full p-3 rounded bg-slate-950 border border-slate-700 font-mono text-xs text-slate-200 outline-none focus:border-amber-500 leading-relaxed"
              />

              {/* Detected Preview Banner */}
              {parsedPreview && (
                <div className="p-2.5 rounded bg-amber-950/30 border border-amber-800/40 text-amber-200 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>
                      Detected URL: <strong className="font-mono text-white">{parsedPreview.url || 'None'}</strong>
                    </span>
                  </div>
                  <span className="text-[11px] bg-amber-900/40 px-2 py-0.5 rounded border border-amber-700/50">
                    {parsedPreview.headersCount} Headers detected
                  </span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowRawModal(false)}
                className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={applyRawHandshake}
                disabled={!rawText.trim()}
                className="px-5 py-2 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold transition disabled:opacity-50 cursor-pointer shadow"
              >
                Parse &amp; Apply to Form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
