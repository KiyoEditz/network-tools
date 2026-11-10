// src/renderer/src/App.tsx
import React, { useEffect, useState } from 'react';
import { useAppStore } from './stores/app.store.js';
import { Header } from './components/layout/Header.js';
import { Sidebar } from './components/layout/Sidebar.js';
import { HttpTab } from './components/tabs/HttpTab.js';
import { WebSocketTab } from './components/tabs/WebSocketTab.js';
import { SseTab } from './components/tabs/SseTab.js';
import { TcpUdpTab } from './components/tabs/TcpUdpTab.js';
import { MqttTab } from './components/tabs/MqttTab.js';
import { WebRtcTab } from './components/tabs/WebRtcTab.js';
import { ErrorBoundary } from './components/common/ErrorBoundary.js';
import { ProtocolType } from '../../shared/types.js';
import { Plus, X } from 'lucide-react';

export const App: React.FC = () => {
  const { tabs, activeTabId, setActiveTab, closeTab, addTab, loadStorage, appendStreamEvent } = useAppStore();
  const [showAddMenu, setShowAddMenu] = useState(false);

  useEffect(() => {
    loadStorage();

    // Register global stream event listener from Electron IPC once on mount
    if ((window as any).networkAPI) {
      const unsubscribe = (window as any).networkAPI.onStreamEvent((event: any) => {
        useAppStore.getState().appendStreamEvent(event.sessionId, event);
      });
      return () => unsubscribe();
    }
  }, []);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  const handleAdd = (protocol: ProtocolType) => {
    addTab(protocol);
    setShowAddMenu(false);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-900 text-slate-100 font-sans">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        {/* Main Workspace Area */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-900">
          {/* Tabs Bar */}
          <div className="h-10 bg-slate-950/80 border-b border-slate-800 flex items-center px-2 gap-1 overflow-x-auto select-none">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`h-8 px-3 rounded-t flex items-center gap-2 cursor-pointer transition text-xs border-t-2 ${
                    isActive
                      ? 'bg-slate-900 text-slate-100 border-indigo-500 font-medium'
                      : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/50'
                  }`}
                >
                  <span
                    className={`text-[10px] font-bold font-mono px-1 rounded ${
                      tab.protocol === 'HTTP'
                        ? 'text-blue-400 bg-blue-950/60'
                        : tab.protocol === 'WEBSOCKET'
                        ? 'text-amber-400 bg-amber-950/60'
                        : tab.protocol === 'SSE'
                        ? 'text-sky-400 bg-sky-950/60'
                        : tab.protocol === 'MQTT'
                        ? 'text-violet-400 bg-violet-950/60'
                        : tab.protocol === 'WEBRTC'
                        ? 'text-emerald-400 bg-emerald-950/60'
                        : 'text-orange-400 bg-orange-950/60'
                    }`}
                  >
                    {tab.protocol}
                  </span>
                  <span className="truncate max-w-[140px]">{tab.title}</span>
                  {tabs.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.id);
                      }}
                      className="text-slate-500 hover:text-rose-400 rounded p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* New Tab Button */}
            <div className="relative">
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition ml-1"
                title="New Protocol Tab"
              >
                <Plus className="w-4 h-4" />
              </button>

              {/* Protocol Dropdown Menu */}
              {showAddMenu && (
                <div className="absolute left-0 top-8 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1 w-44 z-50 text-xs font-medium">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Select Protocol
                  </div>
                  <button
                    onClick={() => handleAdd('HTTP')}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-200 flex items-center gap-2"
                  >
                    <span className="text-[10px] font-mono font-bold text-blue-400">HTTP</span> REST API
                  </button>
                  <button
                    onClick={() => handleAdd('WEBSOCKET')}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-200 flex items-center gap-2"
                  >
                    <span className="text-[10px] font-mono font-bold text-amber-400">WS</span> WebSocket
                  </button>
                  <button
                    onClick={() => handleAdd('SSE')}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-200 flex items-center gap-2"
                  >
                    <span className="text-[10px] font-mono font-bold text-sky-400">SSE</span> Server-Sent Events
                  </button>
                  <button
                    onClick={() => handleAdd('TCP')}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-200 flex items-center gap-2"
                  >
                    <span className="text-[10px] font-mono font-bold text-orange-400">TCP</span> TCP / UDP Socket
                  </button>
                  <button
                    onClick={() => handleAdd('MQTT')}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-200 flex items-center gap-2"
                  >
                    <span className="text-[10px] font-mono font-bold text-violet-400">MQTT</span> MQTT IoT Broker
                  </button>
                  <button
                    onClick={() => handleAdd('WEBRTC')}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-200 flex items-center gap-2"
                  >
                    <span className="text-[10px] font-mono font-bold text-emerald-400">RTC</span> WebRTC P2P
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Active Tab Content Area */}
          <div className="flex-1 overflow-hidden">
            <ErrorBoundary fallbackTitle="Terjadi Kesalahan pada Tab Ini">
              {activeTab && (
                <>
                  {activeTab.protocol === 'HTTP' && <HttpTab tab={activeTab} />}
                  {activeTab.protocol === 'WEBSOCKET' && <WebSocketTab tab={activeTab} />}
                  {activeTab.protocol === 'SSE' && <SseTab tab={activeTab} />}
                  {(activeTab.protocol === 'TCP' || activeTab.protocol === 'UDP') && <TcpUdpTab tab={activeTab} />}
                  {activeTab.protocol === 'MQTT' && <MqttTab tab={activeTab} />}
                  {activeTab.protocol === 'WEBRTC' && <WebRtcTab tab={activeTab} />}
                </>
              )}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
};
