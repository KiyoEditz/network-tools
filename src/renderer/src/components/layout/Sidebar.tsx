// src/renderer/src/components/layout/Sidebar.tsx
import React, { useState } from 'react';
import { useAppStore } from '../../stores/app.store.js';
import {
  Folder,
  History,
  Trash2,
  ChevronRight,
  Plus,
  Network,
  Clock,
  Radio,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const [activeSidebarTab, setActiveSidebarTab] = useState<'collections' | 'history'>('collections');
  const { history, addTab, updateTabRequest } = useAppStore();

  const handleSelectHistoryItem = (item: any) => {
    addTab(item.protocol || 'HTTP');
  };

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col h-full text-xs select-none">
      {/* Sidebar Nav Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/40">
        <button
          onClick={() => setActiveSidebarTab('collections')}
          className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 font-medium transition ${
            activeSidebarTab === 'collections'
              ? 'text-indigo-400 border-b-2 border-indigo-500 bg-slate-900/60'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Folder className="w-3.5 h-3.5" /> Collections
        </button>
        <button
          onClick={() => setActiveSidebarTab('history')}
          className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 font-medium transition ${
            activeSidebarTab === 'history'
              ? 'text-indigo-400 border-b-2 border-indigo-500 bg-slate-900/60'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-3.5 h-3.5" /> History ({history.length})
        </button>
      </div>

      {/* Sidebar Content Area */}
      <div className="flex-1 overflow-auto p-3">
        {activeSidebarTab === 'collections' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-slate-400 font-semibold px-1">
              <span>My Collections</span>
              <button
                onClick={() => addTab('HTTP')}
                className="text-indigo-400 hover:text-indigo-300 p-1"
                title="New Request"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Default Collection Tree */}
            <div className="space-y-1">
              <div className="p-2 rounded hover:bg-slate-900/60 flex items-center gap-2 cursor-pointer text-slate-300">
                <ChevronRight className="w-3 h-3 text-slate-500" />
                <Folder className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-medium">User API Mock</span>
              </div>
              <div className="pl-6 space-y-1">
                <div
                  onClick={() => addTab('HTTP')}
                  className="p-1.5 rounded hover:bg-slate-800/80 flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-200"
                >
                  <span className="text-[10px] font-bold text-blue-400">GET</span>
                  <span className="truncate">/api/users</span>
                </div>
                <div
                  onClick={() => addTab('HTTP')}
                  className="p-1.5 rounded hover:bg-slate-800/80 flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-200"
                >
                  <span className="text-[10px] font-bold text-emerald-400">POST</span>
                  <span className="truncate">/api/users</span>
                </div>
              </div>

              <div className="p-2 rounded hover:bg-slate-900/60 flex items-center gap-2 cursor-pointer text-slate-300 mt-2">
                <ChevronRight className="w-3 h-3 text-slate-500" />
                <Radio className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-medium">Real-Time Streams</span>
              </div>
              <div className="pl-6 space-y-1">
                <div
                  onClick={() => addTab('WEBSOCKET')}
                  className="p-1.5 rounded hover:bg-slate-800/80 flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-200"
                >
                  <span className="text-[10px] font-bold text-amber-400">WS</span>
                  <span className="truncate">Echo Chat</span>
                </div>
                <div
                  onClick={() => addTab('SSE')}
                  className="p-1.5 rounded hover:bg-slate-800/80 flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-200"
                >
                  <span className="text-[10px] font-bold text-sky-400">SSE</span>
                  <span className="truncate">Tick Emitter</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSidebarTab === 'history' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-slate-400 font-semibold px-1 mb-2">
              <span>Recent Activity</span>
              <button
                onClick={() => {
                  if ((window as any).networkAPI) (window as any).networkAPI.clearHistory();
                }}
                className="text-slate-500 hover:text-rose-400"
                title="Clear History"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {history.length === 0 ? (
              <div className="p-4 text-center text-slate-600">No requests in history.</div>
            ) : (
              history.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectHistoryItem(item)}
                  className="p-2 rounded bg-slate-900/80 border border-slate-800 hover:border-slate-700 cursor-pointer transition space-y-1"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-indigo-400">{item.method || item.protocol}</span>
                    {item.status && (
                      <span className={`px-1 rounded text-[10px] font-semibold ${item.status === 200 ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {item.status}
                      </span>
                    )}
                  </div>
                  <div className="text-slate-300 truncate font-mono text-[11px]">{item.url}</div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                    {item.durationMs && <span>{item.durationMs}ms</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
