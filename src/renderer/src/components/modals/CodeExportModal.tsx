// src/renderer/src/components/modals/CodeExportModal.tsx
import React, { useState } from 'react';
import { HttpRequestPayload } from '../../../../shared/types.js';
import { CodeGenerator } from '../../utils/code-generator.js';
import { X, Copy, Check, Terminal } from 'lucide-react';

interface CodeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: HttpRequestPayload;
}

export const CodeExportModal: React.FC<CodeExportModalProps> = ({ isOpen, onClose, request }) => {
  const [target, setTarget] = useState<'node-fetch' | 'node-axios' | 'python-requests' | 'python-httpx' | 'curl'>('node-fetch');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const code = CodeGenerator.generate(request, target);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
            <Terminal className="w-4 h-4" />
            <span>Generate Client Code</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Target Language Buttons */}
        <div className="flex items-center gap-2 p-3 bg-slate-950/60 border-b border-slate-800 text-xs overflow-x-auto">
          <button
            onClick={() => setTarget('node-fetch')}
            className={`px-3 py-1.5 rounded font-medium transition ${
              target === 'node-fetch' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Node.js (Fetch)
          </button>
          <button
            onClick={() => setTarget('node-axios')}
            className={`px-3 py-1.5 rounded font-medium transition ${
              target === 'node-axios' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Node.js (Axios)
          </button>
          <button
            onClick={() => setTarget('python-requests')}
            className={`px-3 py-1.5 rounded font-medium transition ${
              target === 'python-requests' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Python (Requests)
          </button>
          <button
            onClick={() => setTarget('python-httpx')}
            className={`px-3 py-1.5 rounded font-medium transition ${
              target === 'python-httpx' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Python (HTTPX)
          </button>
          <button
            onClick={() => setTarget('curl')}
            className={`px-3 py-1.5 rounded font-medium transition ${
              target === 'curl' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            cURL
          </button>
        </div>

        {/* Code Content */}
        <div className="flex-1 p-4 overflow-auto bg-slate-950">
          <pre className="text-slate-200 font-mono text-xs leading-relaxed select-text whitespace-pre-wrap">
            {code}
          </pre>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-800/80 border-t border-slate-700 flex justify-end">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-4 py-2 rounded font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition text-xs shadow-md shadow-indigo-600/20"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied to Clipboard!' : 'Copy Snippet'}
          </button>
        </div>
      </div>
    </div>
  );
};
