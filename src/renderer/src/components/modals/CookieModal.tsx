// src/renderer/src/components/modals/CookieModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { CookieRecord } from '../../../../shared/types.js';
import {
  X,
  Trash2,
  Cookie as CookieIcon,
  RefreshCw,
  FolderOpen,
  FileText,
  CheckCircle2,
  Search,
  AlertCircle,
} from 'lucide-react';

interface CookieModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CookieModal: React.FC<CookieModalProps> = ({ isOpen, onClose }) => {
  const [cookies, setCookies] = useState<CookieRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCookies = async () => {
    setLoading(true);
    try {
      if ((window as any).networkAPI?.getAllCookies) {
        const list = await (window as any).networkAPI.getAllCookies();
        setCookies(list || []);
      }
    } catch (err: any) {
      setStatusMsg({ text: 'Gagal membaca cookies: ' + err.message, isError: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCookies();
    }
  }, [isOpen]);

  const handleClearAll = async () => {
    if ((window as any).networkAPI?.clearCookies) {
      await (window as any).networkAPI.clearCookies();
      setCookies([]);
      setStatusMsg({ text: 'Semua cookies berhasil dibersihkan.' });
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  // Open native Windows File Explorer dialog or fallback to HTML file picker
  const handleOpenFileDialog = async () => {
    setLoading(true);
    try {
      if ((window as any).networkAPI?.openCookieFileDialog) {
        const res = await (window as any).networkAPI.openCookieFileDialog();
        if (res && res.success) {
          setStatusMsg({
            text: `Berhasil mengimpor ${res.count} cookies dari: ${res.path}`,
          });
          await fetchCookies();
          setTimeout(() => setStatusMsg(null), 5000);
          return;
        } else if (res && res.canceled) {
          setLoading(false);
          return;
        }
      }

      // Fallback to HTML input file picker
      fileInputRef.current?.click();
    } catch (err: any) {
      setStatusMsg({ text: 'Gagal membuka file dialog: ' + err.message, isError: true });
    } finally {
      setLoading(false);
    }
  };

  // Handle HTML file input selection (fallback)
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (text && (window as any).networkAPI?.importNetscapeCookies) {
        try {
          const res = await (window as any).networkAPI.importNetscapeCookies(text);
          setStatusMsg({
            text: `Berhasil mengimpor ${res.count || 0} cookies dari file ${file.name}!`,
          });
          await fetchCookies();
          setTimeout(() => setStatusMsg(null), 5000);
        } catch (err: any) {
          setStatusMsg({ text: 'Gagal mengurai file cookies: ' + err.message, isError: true });
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // One-click workspace cookies.txt loader
  const handleLoadWorkspaceCookies = async () => {
    setLoading(true);
    try {
      if ((window as any).networkAPI?.loadWorkspaceCookies) {
        const res = await (window as any).networkAPI.loadWorkspaceCookies();
        if (res && res.success) {
          setStatusMsg({
            text: `Berhasil memuat ${res.count} cookies dari cookies.txt di workspace!`,
          });
          await fetchCookies();
          setTimeout(() => setStatusMsg(null), 4000);
        } else {
          // If not in root, immediately open Explorer dialog for user convenience!
          await handleOpenFileDialog();
        }
      }
    } catch (err: any) {
      setStatusMsg({ text: 'Gagal memuat cookies: ' + err.message, isError: true });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredCookies = cookies.filter((c) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      (c.domain && c.domain.toLowerCase().includes(q)) ||
      (c.key && c.key.toLowerCase().includes(q)) ||
      (c.value && c.value.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      {/* Hidden file input for web / fallback file picking */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.cookies,.tsv"
        className="hidden"
        onChange={handleFileInputChange}
      />

      <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col h-[75vh]">
        {/* Header */}
        <div className="p-3.5 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-amber-400 font-bold text-sm">
            <CookieIcon className="w-5 h-5 text-amber-400" />
            <span>RFC 6265 Cookie Jar Manager</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-mono font-normal">
              {cookies.length} Cookies
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Filter */}
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari domain / nama..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-7 pr-2.5 py-1 text-xs rounded bg-slate-950 border border-slate-700 text-slate-200 placeholder-slate-500 font-mono outline-none focus:border-amber-500 w-44"
              />
            </div>

            <button
              onClick={fetchCookies}
              disabled={loading}
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded hover:bg-slate-700/60 transition cursor-pointer"
              title="Refresh Cookie Jar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-rose-400 p-1.5 rounded hover:bg-slate-700/60 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Notification Toast */}
        {statusMsg && (
          <div
            className={`px-4 py-2 border-b text-xs flex items-center gap-2 ${
              statusMsg.isError
                ? 'bg-rose-950/80 border-rose-600/50 text-rose-300'
                : 'bg-emerald-950/80 border-emerald-600/50 text-emerald-300'
            }`}
          >
            {statusMsg.isError ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            )}
            <span className="font-medium">{statusMsg.text}</span>
          </div>
        )}

        {/* Content Table */}
        <div className="flex-1 overflow-auto p-4 bg-slate-950 text-xs">
          {filteredCookies.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3">
              <CookieIcon className="w-12 h-12 stroke-[1.5] text-slate-600" />
              <p className="text-sm font-medium">
                {cookies.length === 0
                  ? 'Cookie Jar kosong.'
                  : `Tidak ada cookie yang cocok dengan filter "${searchFilter}".`}
              </p>
              <p className="text-xs text-slate-500 text-center max-w-md">
                Klik tombol <strong>"Buka Explorer"</strong> di bawah untuk memilih file{' '}
                <code>cookies.txt</code> Netscape dari komputer Anda.
              </p>
              <button
                onClick={handleOpenFileDialog}
                className="mt-2 flex items-center gap-2 px-4 py-2 rounded bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs cursor-pointer shadow-lg"
              >
                <FolderOpen className="w-4 h-4" /> Buka Explorer &amp; Pilih File Cookies
              </button>
            </div>
          ) : (
            <div className="border border-slate-800 rounded overflow-hidden">
              <table className="w-full text-left font-mono">
                <thead>
                  <tr className="bg-slate-800/90 text-slate-400 text-[11px] sticky top-0 z-10">
                    <th className="p-2.5">Domain</th>
                    <th className="p-2.5">Name</th>
                    <th className="p-2.5">Value</th>
                    <th className="p-2.5">Path</th>
                    <th className="p-2.5">Attributes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredCookies.map((c, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/60 transition">
                      <td className="p-2.5 text-indigo-300 font-semibold">{c.domain}</td>
                      <td className="p-2.5 text-amber-300 font-medium">{c.key}</td>
                      <td className="p-2.5 text-slate-300 truncate max-w-sm" title={c.value}>
                        {c.value}
                      </td>
                      <td className="p-2.5 text-slate-400">{c.path}</td>
                      <td className="p-2.5 text-[11px] text-slate-400 space-x-1 whitespace-nowrap">
                        {c.httpOnly && (
                          <span className="bg-emerald-950/80 border border-emerald-800/60 px-1.5 py-0.5 rounded text-emerald-400">
                            HttpOnly
                          </span>
                        )}
                        {c.secure && (
                          <span className="bg-sky-950/80 border border-sky-800/60 px-1.5 py-0.5 rounded text-sky-400">
                            Secure
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-slate-800/90 border-t border-slate-700 flex flex-wrap justify-between items-center gap-2 text-xs">
          <div className="flex items-center gap-2">
            {/* Primary: Open File Explorer */}
            <button
              onClick={handleOpenFileDialog}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold cursor-pointer shadow transition disabled:opacity-40"
              title="Buka dialog Windows Explorer untuk memilih file cookies.txt atau .cookies"
            >
              <FolderOpen className="w-4 h-4" /> Buka Explorer (Pilih File)
            </button>

            {/* Secondary: Load from workspace cookies.txt */}
            <button
              onClick={handleLoadWorkspaceCookies}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 cursor-pointer transition disabled:opacity-40"
              title="Baca cookies.txt langsung dari root workspace dan simpan ke Cookie Jar"
            >
              <FileText className="w-3.5 h-3.5" /> Muat dari Workspace (cookies.txt)
            </button>
          </div>

          <div className="flex items-center gap-2">
            {cookies.length > 0 && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1.5 px-3 py-2 rounded bg-rose-950/60 text-rose-300 hover:bg-rose-900/80 border border-rose-800/50 cursor-pointer transition"
              >
                <Trash2 className="w-3.5 h-3.5" /> Bersihkan Semua
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium cursor-pointer transition"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
