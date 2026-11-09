// src/renderer/src/components/modals/StorageModal.tsx
import React, { useState, useEffect } from 'react';
import { VirtualStorageRecord } from '../../../../shared/types.js';
import { X, Trash2, Database, Plus, RefreshCw } from 'lucide-react';

interface StorageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StorageModal: React.FC<StorageModalProps> = ({ isOpen, onClose }) => {
  const [records, setRecords] = useState<VirtualStorageRecord[]>([]);
  const [newOrigin, setNewOrigin] = useState('http://localhost:9080');
  const [newType, setNewType] = useState<'localStorage' | 'sessionStorage'>('localStorage');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const fetchRecords = async () => {
    try {
      if ((window as any).networkAPI) {
        const list = await (window as any).networkAPI.getVirtualStorage();
        setRecords(list || []);
      }
    } catch (err) {
      console.warn(err);
    }
  };

  useEffect(() => {
    if (isOpen) fetchRecords();
  }, [isOpen]);

  const handleAdd = async () => {
    if (!newOrigin.trim() || !newKey.trim()) return;
    try {
      if ((window as any).networkAPI) {
        await (window as any).networkAPI.setVirtualStorageItem({
          origin: newOrigin,
          type: newType,
          key: newKey,
          value: newValue,
        });
        setNewKey('');
        setNewValue('');
        await fetchRecords();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClear = async (origin: string, type: 'localStorage' | 'sessionStorage') => {
    if ((window as any).networkAPI) {
      await (window as any).networkAPI.clearVirtualStorage({ origin, type });
      await fetchRecords();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col h-[75vh]">
        {/* Header */}
        <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
            <Database className="w-4 h-4" />
            <span>Virtual Storage Simulator (LocalStorage & SessionStorage)</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Add Key-Value Form */}
        <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center gap-2 text-xs">
          <input
            type="text"
            placeholder="Origin (e.g. http://localhost:9080)"
            value={newOrigin}
            onChange={(e) => setNewOrigin(e.target.value)}
            className="flex-1 px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs font-mono outline-none"
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as any)}
            className="bg-slate-900 text-slate-300 border border-slate-700 rounded px-2 py-1.5 outline-none"
          >
            <option value="localStorage">LocalStorage</option>
            <option value="sessionStorage">SessionStorage</option>
          </select>
          <input
            type="text"
            placeholder="Key"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            className="w-32 px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs font-mono outline-none"
          />
          <input
            type="text"
            placeholder="Value"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            className="w-44 px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs font-mono outline-none"
          />
          <button
            onClick={handleAdd}
            className="flex items-center gap-1 px-3 py-1.5 rounded font-semibold bg-sky-600 hover:bg-sky-500 text-white cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Set Item
          </button>
        </div>

        {/* Table of Records */}
        <div className="flex-1 overflow-auto p-4 bg-slate-950 text-xs">
          {records.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500">
              <Database className="w-10 h-10 mb-2 stroke-[1.5]" />
              <p>No storage items registered.</p>
              <p className="text-[11px] text-slate-600 mt-1">Set items above or use `pm.localStorage.setItem()` in test scripts.</p>
            </div>
          ) : (
            <div className="border border-slate-800 rounded overflow-hidden">
              <table className="w-full text-left font-mono">
                <thead>
                  <tr className="bg-slate-800/80 text-slate-400 text-[11px]">
                    <th className="p-2.5">Origin</th>
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5">Key</th>
                    <th className="p-2.5">Value</th>
                    <th className="p-2.5 w-12">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, idx) => (
                    <tr key={idx} className="border-b border-slate-800/60 hover:bg-slate-900/60">
                      <td className="p-2.5 text-indigo-300 font-semibold">{r.origin}</td>
                      <td className="p-2.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${r.type === 'localStorage' ? 'bg-sky-950 text-sky-400 border border-sky-800/50' : 'bg-amber-950 text-amber-400 border border-amber-800/50'}`}>
                          {r.type}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-200">{r.key}</td>
                      <td className="p-2.5 text-slate-300 truncate max-w-xs">{r.value}</td>
                      <td className="p-2.5">
                        <button
                          onClick={() => handleClear(r.origin, r.type)}
                          className="text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
          <span className="text-slate-400">Total Items: <strong>{records.length}</strong></span>
          <button onClick={onClose} className="px-4 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
