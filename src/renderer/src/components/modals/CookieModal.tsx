// src/renderer/src/components/modals/CookieModal.tsx
import React, { useState, useEffect } from 'react';
import { CookieRecord } from '../../../../shared/types.js';
import { X, Trash2, Cookie as CookieIcon, RefreshCw } from 'lucide-react';

interface CookieModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CookieModal: React.FC<CookieModalProps> = ({ isOpen, onClose }) => {
  const [cookies, setCookies] = useState<CookieRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCookies = async () => {
    setLoading(true);
    try {
      if ((window as any).networkAPI) {
        const list = await (window as any).networkAPI.getAllCookies();
        setCookies(list || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchCookies();
  }, [isOpen]);

  const handleClearAll = async () => {
    if ((window as any).networkAPI) {
      await (window as any).networkAPI.clearCookies();
      setCookies([]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col h-[70vh]">
        {/* Header */}
        <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <CookieIcon className="w-4 h-4" />
            <span>RFC 6265 Cookie Jar Manager</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchCookies}
              className="text-slate-400 hover:text-slate-200 p-1"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-auto p-4 bg-slate-950 text-xs">
          {cookies.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500">
              <CookieIcon className="w-10 h-10 mb-2 stroke-[1.5]" />
              <p>Cookie Jar is currently empty.</p>
              <p className="text-[11px] text-slate-600 mt-1">Cookies from response 'Set-Cookie' headers are automatically saved here.</p>
            </div>
          ) : (
            <div className="border border-slate-800 rounded overflow-hidden">
              <table className="w-full text-left font-mono">
                <thead>
                  <tr className="bg-slate-800/80 text-slate-400 text-[11px]">
                    <th className="p-2.5">Domain</th>
                    <th className="p-2.5">Name</th>
                    <th className="p-2.5">Value</th>
                    <th className="p-2.5">Path</th>
                    <th className="p-2.5">Attributes</th>
                  </tr>
                </thead>
                <tbody>
                  {cookies.map((c, idx) => (
                    <tr key={idx} className="border-b border-slate-800/60 hover:bg-slate-900/60">
                      <td className="p-2.5 text-indigo-300 font-semibold">{c.domain}</td>
                      <td className="p-2.5 text-amber-300">{c.key}</td>
                      <td className="p-2.5 text-slate-300 truncate max-w-xs">{c.value}</td>
                      <td className="p-2.5 text-slate-400">{c.path}</td>
                      <td className="p-2.5 text-[11px] text-slate-400 space-x-1">
                        {c.httpOnly && <span className="bg-slate-800 px-1 rounded text-emerald-400">HttpOnly</span>}
                        {c.secure && <span className="bg-slate-800 px-1 rounded text-sky-400">Secure</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-800/80 border-t border-slate-700 flex justify-between items-center text-xs">
          <span className="text-slate-400">Total Cookies: <strong>{cookies.length}</strong></span>
          <div className="flex gap-2">
            {cookies.length > 0 && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-600/30 text-rose-300 hover:bg-rose-600/50"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear All Cookies
              </button>
            )}
            <button onClick={onClose} className="px-4 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
