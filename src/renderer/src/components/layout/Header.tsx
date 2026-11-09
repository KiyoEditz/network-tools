// src/renderer/src/components/layout/Header.tsx
import React, { useState } from 'react';
import { useAppStore } from '../../stores/app.store.js';
import {
  Globe,
  Cookie as CookieIcon,
  Database,
  Shield,
  Sun,
  Moon,
  Terminal,
  Activity,
  Layers,
} from 'lucide-react';
import { EnvironmentModal } from '../modals/EnvironmentModal.js';
import { CookieModal } from '../modals/CookieModal.js';
import { StorageModal } from '../modals/StorageModal.js';
import { ProxyModal } from '../modals/ProxyModal.js';
import { CodeExportModal } from '../modals/CodeExportModal.js';

export const Header: React.FC = () => {
  const { environments, activeEnvId, setActiveEnv, isDarkTheme, toggleTheme, tabs, activeTabId } = useAppStore();

  const [envOpen, setEnvOpen] = useState(false);
  const [cookieOpen, setCookieOpen] = useState(false);
  const [storageOpen, setStorageOpen] = useState(false);
  const [proxyOpen, setProxyOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  return (
    <>
      <header className="h-12 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-4 text-xs select-none z-10">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-gradient-to-tr from-indigo-600 to-sky-400 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-indigo-500/20">
            NT
          </div>
          <span className="font-bold text-slate-100 tracking-wide text-xs">
            Network <span className="text-indigo-400">Tester</span>
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700/60 font-mono">
            GUI v1.0
          </span>
        </div>

        {/* Global Toolbar & Modals Buttons */}
        <div className="flex items-center gap-2">
          {/* Environment Selector */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded px-2 py-1 gap-1.5">
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <select
              value={activeEnvId || ''}
              onChange={(e) => setActiveEnv(e.target.value || undefined)}
              className="bg-transparent text-slate-200 outline-none text-xs font-medium cursor-pointer"
            >
              <option value="">No Environment</option>
              {environments.map((env) => (
                <option key={env.id} value={env.id}>
                  {env.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setEnvOpen(true)}
              className="text-slate-500 hover:text-slate-300 ml-1 text-[11px]"
              title="Manage Environments"
            >
              ⚙
            </button>
          </div>

          {/* Quick Access Buttons */}
          <button
            onClick={() => setCookieOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition"
            title="Cookie Jar"
          >
            <CookieIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>Cookies</span>
          </button>

          <button
            onClick={() => setStorageOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition"
            title="Virtual Storage"
          >
            <Database className="w-3.5 h-3.5 text-sky-400" />
            <span>Storage</span>
          </button>

          <button
            onClick={() => setProxyOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition"
            title="Proxy & Network Interface"
          >
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Proxy/Adapters</span>
          </button>

          <button
            onClick={() => setExportOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 transition font-medium"
            title="Export Code Snippets"
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            <span>Code (Node/Python)</span>
          </button>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition"
            title="Toggle Theme"
          >
            {isDarkTheme ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-200" />}
          </button>
        </div>
      </header>

      {/* Modals */}
      <EnvironmentModal isOpen={envOpen} onClose={() => setEnvOpen(false)} />
      <CookieModal isOpen={cookieOpen} onClose={() => setCookieOpen(false)} />
      <StorageModal isOpen={storageOpen} onClose={() => setStorageOpen(false)} />
      <ProxyModal isOpen={proxyOpen} onClose={() => setProxyOpen(false)} />
      <CodeExportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        request={activeTab.request}
      />
    </>
  );
};
