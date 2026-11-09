// src/renderer/src/components/modals/ProxyModal.tsx
import React, { useState, useEffect } from 'react';
import { ProxyConfig } from '../../../../shared/types.js';
import { X, Shield, Plus, Trash2, Activity, Network } from 'lucide-react';

interface ProxyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProxyModal: React.FC<ProxyModalProps> = ({ isOpen, onClose }) => {
  const [profiles, setProfiles] = useState<ProxyConfig[]>([
    {
      enabled: true,
      name: 'US Datacenter SOCKS5',
      type: 'socks5',
      host: '127.0.0.1',
      port: 1080,
      countryCode: 'US',
    },
    {
      enabled: false,
      name: 'Singapore HTTP Proxy',
      type: 'http',
      host: '127.0.0.1',
      port: 8888,
      countryCode: 'SG',
    },
  ]);

  const [interfaces, setInterfaces] = useState<any[]>([]);
  const [testingIdx, setTestingIdx] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<{ idx: number; text: string; success: boolean } | null>(null);

  useEffect(() => {
    if (isOpen && (window as any).networkAPI) {
      (window as any).networkAPI.listNetworkInterfaces().then((list: any) => {
        setInterfaces(list || []);
      });
    }
  }, [isOpen]);

  const handleTestProxy = async (idx: number) => {
    setTestingIdx(idx);
    setTestResult(null);
    try {
      if ((window as any).networkAPI) {
        const res = await (window as any).networkAPI.testProxy(profiles[idx]);
        if (res.success) {
          setTestResult({ idx, text: `Connected! Exit IP: ${res.ip} (${res.latencyMs}ms)`, success: true });
        } else {
          setTestResult({ idx, text: `Failed: ${res.error}`, success: false });
        }
      }
    } finally {
      setTestingIdx(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col h-[78vh]">
        {/* Header */}
        <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <Shield className="w-4 h-4" />
            <span>Multi-Region Proxy & Network Adapters Manager</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-5 bg-slate-950 text-xs">
          {/* Proxy Profiles Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200">Proxy Profiles:</span>
              <button
                onClick={() => {
                  setProfiles([
                    ...profiles,
                    {
                      enabled: false,
                      name: 'New Proxy Profile',
                      type: 'socks5',
                      host: '127.0.0.1',
                      port: 1080,
                      countryCode: 'US',
                    },
                  ]);
                }}
                className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> Add Proxy
              </button>
            </div>

            <div className="space-y-2">
              {profiles.map((p, idx) => (
                <div key={idx} className="p-3 bg-slate-900 rounded border border-slate-800 space-y-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={p.name || ''}
                      onChange={(e) => {
                        const copy = [...profiles];
                        copy[idx].name = e.target.value;
                        setProfiles(copy);
                      }}
                      className="font-bold text-indigo-300 bg-transparent outline-none flex-1"
                    />

                    <select
                      value={p.type}
                      onChange={(e) => {
                        const copy = [...profiles];
                        copy[idx].type = e.target.value as any;
                        setProfiles(copy);
                      }}
                      className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300 outline-none"
                    >
                      <option value="socks5">SOCKS5</option>
                      <option value="socks5h">SOCKS5h (Remote DNS)</option>
                      <option value="http">HTTP</option>
                      <option value="https">HTTPS</option>
                    </select>

                    <button
                      onClick={() => handleTestProxy(idx)}
                      disabled={testingIdx === idx}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1"
                    >
                      <Activity className={`w-3.5 h-3.5 ${testingIdx === idx ? 'animate-spin' : ''}`} /> Test Exit IP
                    </button>

                    <button
                      onClick={() => setProfiles(profiles.filter((_, i) => i !== idx))}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Host"
                      value={p.host}
                      onChange={(e) => {
                        const copy = [...profiles];
                        copy[idx].host = e.target.value;
                        setProfiles(copy);
                      }}
                      className="px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 font-mono text-xs outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Port"
                      value={p.port}
                      onChange={(e) => {
                        const copy = [...profiles];
                        copy[idx].port = Number(e.target.value);
                        setProfiles(copy);
                      }}
                      className="px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 font-mono text-xs outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Country Code (e.g. US)"
                      value={p.countryCode || ''}
                      onChange={(e) => {
                        const copy = [...profiles];
                        copy[idx].countryCode = e.target.value.toUpperCase();
                        setProfiles(copy);
                      }}
                      className="px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 font-mono text-xs outline-none"
                    />
                  </div>

                  {testResult && testResult.idx === idx && (
                    <div className={`p-2 rounded text-[11px] ${testResult.success ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40' : 'bg-rose-950/40 text-rose-300 border border-rose-800/40'}`}>
                      {testResult.text}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Detected Local Network Interfaces Section */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-2 font-semibold text-slate-200">
              <Network className="w-4 h-4 text-indigo-400" />
              <span>Detected Machine Network Adapters (`localAddress` options):</span>
            </div>
            <div className="border border-slate-800 rounded bg-slate-900 p-2.5 space-y-1 font-mono text-[11px]">
              {interfaces.map((iface, i) => (
                <div key={i} className="flex items-center justify-between py-1 border-b border-slate-800/50 last:border-none">
                  <span className="text-indigo-300 font-medium">{iface.name}</span>
                  <span className="text-slate-300 font-bold">{iface.address}</span>
                  <span className="text-slate-500">[{iface.family}] {iface.internal ? '(Internal)' : '(Physical/Virtual)'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-800/80 border-t border-slate-700 flex justify-end text-xs">
          <button onClick={onClose} className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
