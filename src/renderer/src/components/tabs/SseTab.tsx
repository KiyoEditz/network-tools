// src/renderer/src/components/tabs/SseTab.tsx
import React, { useState } from 'react';
import { TabItem, useAppStore } from '../../stores/app.store.js';
import { Radio, Power, PowerOff, Trash2, Search, Filter } from 'lucide-react';

interface SseTabProps {
  tab: TabItem;
}

export const SseTab: React.FC<SseTabProps> = ({ tab }) => {
  const { updateTabState } = useAppStore();
  const [url, setUrl] = useState(tab.request.url || 'http://localhost:9082/sse');
  const [filterEvent, setFilterEvent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const isConnected = tab.status === 'connected';

  const handleToggleConnect = async () => {
    if (isConnected) {
      if ((window as any).networkAPI) {
        await (window as any).networkAPI.disconnectSse(tab.id);
      }
      updateTabState(tab.id, { status: 'idle' });
    } else {
      updateTabState(tab.id, { status: 'loading' });
      try {
        if ((window as any).networkAPI) {
          await (window as any).networkAPI.connectSse({
            sessionId: tab.id,
            url,
          });
          updateTabState(tab.id, { status: 'connected' });
        }
      } catch (err: any) {
        updateTabState(tab.id, { status: 'error' });
      }
    }
  };

  const handleClear = () => {
    updateTabState(tab.id, { streamEvents: [] });
  };

  const filteredEvents = (tab.streamEvents || []).filter((ev) => {
    const typeStr = ev.type ? String(ev.type).toLowerCase() : '';
    if (filterEvent && !typeStr.includes(filterEvent.toLowerCase())) return false;
    if (searchQuery && typeof ev.payload === 'string' && !ev.payload.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 overflow-hidden text-xs">
      {/* Top Bar */}
      <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center gap-3">
        <span className="font-mono font-bold text-sky-400 bg-sky-950/40 border border-sky-800/60 px-3 py-1.5 rounded">
          SSE
        </span>

        <input
          type="text"
          value={url}
          disabled={isConnected}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="http://localhost:9082/sse"
          className="flex-1 px-3 py-2 rounded bg-slate-800 border border-slate-700/80 text-slate-100 font-mono text-xs outline-none focus:border-sky-500 disabled:opacity-60"
        />

        <button
          onClick={handleToggleConnect}
          className={`flex items-center gap-2 px-5 py-2 rounded font-semibold transition cursor-pointer shadow-md ${
            isConnected
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
              : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/20'
          }`}
        >
          {isConnected ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
          {isConnected ? 'Stop Stream' : 'Listen Stream'}
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/60 border-b border-slate-700/60 text-slate-400">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/60 rounded px-2.5 py-1">
            <Filter className="w-3 h-3 text-slate-500" />
            <input
              type="text"
              placeholder="Filter by event type..."
              value={filterEvent}
              onChange={(e) => setFilterEvent(e.target.value)}
              className="bg-transparent text-slate-200 outline-none text-xs w-36"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/60 rounded px-2.5 py-1 flex-1 max-w-sm">
            <Search className="w-3 h-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search in data payload..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-slate-200 outline-none text-xs w-full"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-400 text-xs">Events: <strong>{filteredEvents.length}</strong></span>
          <button onClick={handleClear} className="flex items-center gap-1 text-slate-400 hover:text-slate-200">
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      </div>

      {/* SSE Events Feed */}
      <div className="flex-1 overflow-auto p-4 space-y-2.5 bg-slate-950 font-mono text-xs">
        {filteredEvents.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-600">
            {isConnected ? 'Listening for Server-Sent Events...' : 'Connect to start listening to SSE event stream.'}
          </div>
        ) : (
          filteredEvents.map((ev, idx) => (
            <div key={idx} className="p-3 bg-slate-900 rounded border border-slate-800 space-y-1.5 hover:border-slate-700 transition">
              <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800/80 pb-1">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-sky-950/60 text-sky-400 border border-sky-800/60 font-semibold">
                    event: {ev.type}
                  </span>
                  {ev.metadata?.id && <span className="text-slate-500">id: {ev.metadata.id}</span>}
                </div>
                <span>{new Date(ev.timestamp).toLocaleTimeString()}.{String(ev.timestamp % 1000).padStart(3, '0')}</span>
              </div>
              <pre className="text-slate-200 whitespace-pre-wrap select-text leading-relaxed">
                {ev.payload}
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
