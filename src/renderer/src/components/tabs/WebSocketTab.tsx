// src/renderer/src/components/tabs/WebSocketTab.tsx
import React, { useState } from 'react';
import { TabItem, useAppStore } from '../../stores/app.store.js';
import { ArrowDownLeft, ArrowUpRight, Radio, Send, Trash2, Power, PowerOff } from 'lucide-react';

interface WebSocketTabProps {
  tab: TabItem;
}

export const WebSocketTab: React.FC<WebSocketTabProps> = ({ tab }) => {
  const { updateTabState } = useAppStore();
  const [url, setUrl] = useState(tab.request.url || 'ws://localhost:9081');
  const [messageText, setMessageText] = useState('{\n  "event": "greeting",\n  "message": "Hello WebSocket Server!"\n}');
  const [format, setFormat] = useState<'text' | 'json' | 'hex'>('json');
  const [heartbeat, setHeartbeat] = useState(true);

  const isConnected = tab.status === 'connected';

  const handleToggleConnect = async () => {
    if (isConnected) {
      if ((window as any).networkAPI) {
        await (window as any).networkAPI.disconnectWs(tab.id);
      }
      updateTabState(tab.id, { status: 'idle' });
    } else {
      updateTabState(tab.id, { status: 'loading' });
      try {
        if ((window as any).networkAPI) {
          await (window as any).networkAPI.connectWs({
            sessionId: tab.id,
            url,
            heartbeatIntervalMs: heartbeat ? 5000 : 0,
          });
          updateTabState(tab.id, { status: 'connected' });
        }
      } catch (err: any) {
        updateTabState(tab.id, { status: 'error' });
      }
    }
  };

  const handleSendMessage = async () => {
    if (!isConnected || !messageText.trim()) return;
    try {
      if ((window as any).networkAPI) {
        await (window as any).networkAPI.sendWs({
          sessionId: tab.id,
          payload: messageText,
          format,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearMessages = () => {
    updateTabState(tab.id, { streamEvents: [] });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 overflow-hidden text-xs">
      {/* Top Connection Bar */}
      <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center gap-3">
        <span className="font-mono font-bold text-amber-400 bg-amber-950/40 border border-amber-800/60 px-3 py-1.5 rounded">
          WS
        </span>

        <input
          type="text"
          value={url}
          disabled={isConnected}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="ws://localhost:9081 or wss://echo.websocket.org"
          className="flex-1 px-3 py-2 rounded bg-slate-800 border border-slate-700/80 text-slate-100 font-mono text-xs outline-none focus:border-amber-500 disabled:opacity-60"
        />

        <label className="flex items-center gap-1.5 text-slate-400 cursor-pointer text-xs">
          <input
            type="checkbox"
            checked={heartbeat}
            onChange={(e) => setHeartbeat(e.target.checked)}
            disabled={isConnected}
            className="rounded bg-slate-800"
          />
          Heartbeat (5s)
        </label>

        <button
          onClick={handleToggleConnect}
          className={`flex items-center gap-2 px-5 py-2 rounded font-semibold transition cursor-pointer shadow-md ${
            isConnected
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
              : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
          }`}
        >
          {isConnected ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
          {isConnected ? 'Disconnect' : 'Connect'}
        </button>
      </div>

      {/* Main Area: Split Timeline on Top/Left, Message Composer on Bottom */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Timeline Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800/60 border-b border-slate-700/60 text-slate-400">
          <div className="flex items-center gap-2">
            <Radio className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
            <span>Messages Timeline ({tab.streamEvents?.length || 0})</span>
          </div>
          <button
            onClick={handleClearMessages}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </button>
        </div>

        {/* Timeline Stream Messages */}
        <div className="flex-1 overflow-auto p-4 space-y-2 bg-slate-950/60 font-mono text-xs">
          {tab.streamEvents?.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-600">
              No WebSocket messages recorded yet. Connect and send payload to start.
            </div>
          ) : (
            tab.streamEvents?.map((ev, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded border leading-relaxed ${
                  ev.direction === 'OUT'
                    ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                    : ev.direction === 'IN'
                    ? 'bg-blue-950/20 border-blue-800/40 text-blue-300'
                    : 'bg-amber-950/20 border-amber-800/40 text-amber-300'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] opacity-75 mb-1">
                  <span className="flex items-center gap-1 font-semibold">
                    {ev.direction === 'OUT' ? (
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                    ) : ev.direction === 'IN' ? (
                      <ArrowDownLeft className="w-3.5 h-3.5 text-blue-400" />
                    ) : (
                      '●'
                    )}
                    {ev.direction} [{ev.type.toUpperCase()}]
                  </span>
                  <span>{new Date(ev.timestamp).toLocaleTimeString()}.{String(ev.timestamp % 1000).padStart(3, '0')}</span>
                </div>
                <pre className="whitespace-pre-wrap select-text text-slate-200 font-mono text-xs">
                  {typeof ev.payload === 'object' ? JSON.stringify(ev.payload, null, 2) : ev.payload}
                </pre>
              </div>
            ))
          )}
        </div>

        {/* Bottom Message Composer */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-3">
              <span>Compose Message:</span>
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
            <button
              onClick={handleSendMessage}
              disabled={!isConnected}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-40 cursor-pointer shadow"
            >
              <Send className="w-3 h-3" /> Send Frame
            </button>
          </div>

          <textarea
            rows={4}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type payload to send..."
            className="w-full p-2.5 rounded bg-slate-800 border border-slate-700/80 font-mono text-xs text-slate-100 outline-none focus:border-indigo-500 leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
};
