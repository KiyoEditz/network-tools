// src/renderer/src/components/tabs/TcpUdpTab.tsx
import React, { useState } from 'react';
import { TabItem, useAppStore } from '../../stores/app.store.js';
import { Power, PowerOff, Send, Trash2, ArrowUpRight, ArrowDownLeft, Network } from 'lucide-react';

interface TcpUdpTabProps {
  tab: TabItem;
}

export const TcpUdpTab: React.FC<TcpUdpTabProps> = ({ tab }) => {
  const { updateTabState } = useAppStore();
  const [protocol, setProtocol] = useState<'TCP' | 'UDP'>((tab.protocol as any) === 'UDP' ? 'UDP' : 'TCP');
  const [mode, setMode] = useState<'client' | 'server'>('client');
  const [host, setHost] = useState('127.0.0.1');
  const [port, setPort] = useState(protocol === 'TCP' ? 9001 : 9002);
  const [useTls, setUseTls] = useState(false);
  const [framing, setFraming] = useState<'raw' | 'delimiter' | 'fixed'>('raw');
  const [format, setFormat] = useState<'text' | 'hex'>('text');
  const [payloadText, setPayloadText] = useState('Hello raw socket server!\n');

  const isConnected = tab.status === 'connected';

  const handleToggle = async () => {
    if (isConnected) {
      if ((window as any).networkAPI) {
        if (protocol === 'TCP') {
          await (window as any).networkAPI.disconnectTcp(tab.id);
        } else {
          await (window as any).networkAPI.disconnectUdp(tab.id);
        }
      }
      updateTabState(tab.id, { status: 'idle' });
    } else {
      updateTabState(tab.id, { status: 'loading' });
      try {
        if ((window as any).networkAPI) {
          if (protocol === 'TCP') {
            if (mode === 'client') {
              await (window as any).networkAPI.connectTcp({
                sessionId: tab.id,
                host,
                port: Number(port),
                useTls,
                framing,
              });
            } else {
              await (window as any).networkAPI.startTcpServer({
                sessionId: tab.id,
                host: '0.0.0.0',
                port: Number(port),
              });
            }
          } else {
            // UDP
            await (window as any).networkAPI.createUdp({
              sessionId: tab.id,
              bindPort: mode === 'server' ? Number(port) : undefined,
            });
          }
          updateTabState(tab.id, { status: 'connected' });
        }
      } catch (err) {
        updateTabState(tab.id, { status: 'error' });
      }
    }
  };

  const handleSend = async () => {
    if (!payloadText.trim()) return;
    try {
      if ((window as any).networkAPI) {
        if (protocol === 'TCP') {
          await (window as any).networkAPI.sendTcp({
            sessionId: tab.id,
            data: payloadText,
            format,
          });
        } else {
          await (window as any).networkAPI.sendUdp({
            sessionId: tab.id,
            target: { host, port: Number(port) },
            data: payloadText,
            format,
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 overflow-hidden text-xs">
      {/* Top Config Bar */}
      <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center gap-3">
        <div className="flex bg-slate-800 rounded p-0.5 border border-slate-700">
          <button
            onClick={() => { setProtocol('TCP'); setPort(9001); }}
            className={`px-3 py-1 font-bold rounded ${protocol === 'TCP' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
          >
            TCP
          </button>
          <button
            onClick={() => { setProtocol('UDP'); setPort(9002); }}
            className={`px-3 py-1 font-bold rounded ${protocol === 'UDP' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
          >
            UDP
          </button>
        </div>

        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as any)}
          disabled={isConnected}
          className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-2.5 py-1.5 outline-none"
        >
          <option value="client">Client Mode</option>
          <option value="server">Server (Listener)</option>
        </select>

        <input
          type="text"
          value={host}
          onChange={(e) => setHost(e.target.value)}
          disabled={isConnected || mode === 'server'}
          placeholder="127.0.0.1"
          className="w-32 px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 font-mono text-xs outline-none"
        />

        <input
          type="number"
          value={port}
          onChange={(e) => setPort(Number(e.target.value))}
          disabled={isConnected}
          placeholder="Port"
          className="w-20 px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 font-mono text-xs outline-none"
        />

        {protocol === 'TCP' && (
          <label className="flex items-center gap-1.5 text-slate-400 cursor-pointer">
            <input type="checkbox" checked={useTls} onChange={(e) => setUseTls(e.target.checked)} disabled={isConnected} />
            TLS (SSL)
          </label>
        )}

        <button
          onClick={handleToggleConnect}
          className={`ml-auto flex items-center gap-2 px-5 py-2 rounded font-semibold transition cursor-pointer shadow-md ${
            isConnected
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
          }`}
        >
          {isConnected ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
          {isConnected ? 'Disconnect' : mode === 'server' ? 'Start Listener' : 'Connect Socket'}
        </button>
      </div>

      {/* Main Split: Packet Timeline & Packet Composer */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Timeline Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800/60 border-b border-slate-700/60 text-slate-400">
          <div className="flex items-center gap-2">
            <Network className="w-3.5 h-3.5 text-indigo-400" />
            <span>Packet Feed ({tab.streamEvents?.length || 0} packets)</span>
          </div>
          <button
            onClick={() => updateTabState(tab.id, { streamEvents: [] })}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-200"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </button>
        </div>

        {/* Packet Stream */}
        <div className="flex-1 overflow-auto p-4 space-y-2 bg-slate-950 font-mono text-xs">
          {tab.streamEvents?.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-600">
              No packets captured yet. Connect socket and dispatch data.
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
                    {ev.direction === 'OUT' ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowDownLeft className="w-3.5 h-3.5 text-blue-400" />}
                    {ev.direction} • {ev.sizeBytes || 0} bytes
                  </span>
                  <span>{new Date(ev.timestamp).toLocaleTimeString()}.{String(ev.timestamp % 1000).padStart(3, '0')}</span>
                </div>
                <div className="text-slate-200 select-text whitespace-pre-wrap">{ev.payload}</div>
                {ev.rawHex && (
                  <div className="text-slate-500 text-[10px] tracking-wider mt-1 select-text">HEX: {ev.rawHex}</div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Bottom Sender */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-3">
              <span>Send Payload:</span>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="radio" checked={format === 'text'} onChange={() => setFormat('text')} /> Text (UTF-8)
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="radio" checked={format === 'hex'} onChange={() => setFormat('hex')} /> Hex Bytes
              </label>
            </div>
            <button
              onClick={handleSend}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded font-medium bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow"
            >
              <Send className="w-3 h-3" /> Transmit Packet
            </button>
          </div>

          <textarea
            rows={3}
            value={payloadText}
            onChange={(e) => setPayloadText(e.target.value)}
            placeholder={format === 'hex' ? 'e.g. 01 03 00 00 00 0A C5 CD' : 'Type raw packet string...'}
            className="w-full p-2.5 rounded bg-slate-800 border border-slate-700 font-mono text-xs text-slate-100 outline-none focus:border-indigo-500"
          />
        </div>
      </div>
    </div>
  );
};
