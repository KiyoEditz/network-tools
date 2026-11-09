// src/renderer/src/components/viewers/ResponseViewer.tsx
import React, { useState } from 'react';
import { HttpResponsePayload } from '../../../../shared/types.js';
import {
  Code,
  Eye,
  Binary,
  FileText,
  Clock,
  Layers,
  Cookie as CookieIcon,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Maximize2,
} from 'lucide-react';

interface ResponseViewerProps {
  response?: HttpResponsePayload;
  isLoading?: boolean;
}

export const ResponseViewer: React.FC<ResponseViewerProps> = ({ response, isLoading }) => {
  const [activeTab, setActiveTab] = useState<'pretty' | 'raw' | 'preview' | 'hex' | 'headers' | 'cookies' | 'tests'>('pretty');
  const [copied, setCopied] = useState(false);
  const [selectedByteIndex, setSelectedByteIndex] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 bg-slate-900 border-l border-slate-800">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-sm font-medium">Sending request & waiting for response...</span>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-500 bg-slate-900 border-l border-slate-800">
        <Clock className="w-12 h-12 stroke-[1.5] mb-3 text-slate-600" />
        <p className="text-sm font-medium">No response yet</p>
        <p className="text-xs text-slate-600 mt-1">Hit 'Send' to dispatch network request</p>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(response.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isJson = /json/i.test(response.contentType);
  const isImage = /image/i.test(response.contentType);
  const isAudio = /audio/i.test(response.contentType);
  const isVideo = /video/i.test(response.contentType);
  const isPdf = /pdf/i.test(response.contentType);
  const isHtml = /html/i.test(response.contentType);

  // Hex matrix generator (up to first 1024 bytes)
  const hexBytes: number[] = [];
  if (response.isBase64) {
    const rawBinary = atob(response.body);
    for (let i = 0; i < Math.min(rawBinary.length, 1024); i++) {
      hexBytes.push(rawBinary.charCodeAt(i));
    }
  } else {
    for (let i = 0; i < Math.min(response.body.length, 1024); i++) {
      hexBytes.push(response.body.charCodeAt(i));
    }
  }

  // Prettify JSON if applicable
  let formattedBody = response.body;
  if (isJson && !response.isBase64) {
    try {
      formattedBody = JSON.stringify(JSON.parse(response.body), null, 2);
    } catch {}
  }

  // Selected byte representations
  const selectedByte = selectedByteIndex !== null ? hexBytes[selectedByteIndex] : null;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 border-l border-slate-800 overflow-hidden text-xs">
      {/* Response Status Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/80 border-b border-slate-700/60">
        <div className="flex items-center gap-3">
          <span
            className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
              response.status >= 200 && response.status < 300
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : response.status >= 400
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}
          >
            {response.status} {response.statusText}
          </span>
          <span className="text-slate-400">
            Time: <strong className="text-slate-200">{response.timing.totalDurationMs} ms</strong>
          </span>
          <span className="text-slate-400">
            Size: <strong className="text-slate-200">{(response.sizeBytes / 1024).toFixed(2)} KB</strong>
          </span>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* Network Timing Breakdown Bar */}
      <div className="px-4 py-1.5 bg-slate-900/60 border-b border-slate-800/80 flex items-center gap-4 text-[11px] text-slate-400">
        <span>DNS: <strong className="text-slate-300">{response.timing.dnsLookupMs}ms</strong></span>
        <span>TCP: <strong className="text-slate-300">{response.timing.tcpHandshakeMs}ms</strong></span>
        <span>TLS: <strong className="text-slate-300">{response.timing.tlsHandshakeMs}ms</strong></span>
        <span>TTFB: <strong className="text-slate-300">{response.timing.ttfbMs}ms</strong></span>
        <span>Download: <strong className="text-slate-300">{response.timing.downloadMs}ms</strong></span>
      </div>

      {/* Sub-Tabs Nav */}
      <div className="flex items-center gap-1 px-3 pt-2 bg-slate-800/40 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('pretty')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t font-medium transition ${
            activeTab === 'pretty' ? 'bg-slate-900 text-indigo-400 border-t-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code className="w-3.5 h-3.5" /> Pretty
        </button>
        <button
          onClick={() => setActiveTab('raw')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t font-medium transition ${
            activeTab === 'raw' ? 'bg-slate-900 text-indigo-400 border-t-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" /> Raw
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t font-medium transition ${
            activeTab === 'preview' ? 'bg-slate-900 text-indigo-400 border-t-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Eye className="w-3.5 h-3.5" /> Preview
        </button>
        <button
          onClick={() => setActiveTab('hex')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t font-medium transition ${
            activeTab === 'hex' ? 'bg-slate-900 text-indigo-400 border-t-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Binary className="w-3.5 h-3.5" /> Hex
        </button>
        <button
          onClick={() => setActiveTab('headers')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t font-medium transition ${
            activeTab === 'headers' ? 'bg-slate-900 text-indigo-400 border-t-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" /> Headers ({Object.keys(response.headers || {}).length})
        </button>
        <button
          onClick={() => setActiveTab('cookies')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t font-medium transition ${
            activeTab === 'cookies' ? 'bg-slate-900 text-indigo-400 border-t-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CookieIcon className="w-3.5 h-3.5" /> Cookies ({response.cookies?.length || 0})
        </button>
        {response.testResults && response.testResults.length > 0 && (
          <button
            onClick={() => setActiveTab('tests')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t font-medium transition ${
              activeTab === 'tests' ? 'bg-slate-900 text-indigo-400 border-t-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Tests ({response.testResults.filter((t) => t.passed).length}/{response.testResults.length})
          </button>
        )}
      </div>

      {/* Main View Area */}
      <div className="flex-1 overflow-auto p-4 bg-slate-900">
        {/* PRETTY TAB */}
        {activeTab === 'pretty' && (
          <div>
            {isImage ? (
              <div className="flex flex-col items-center justify-center p-6 bg-slate-950 rounded border border-slate-800">
                <img
                  src={`data:${response.contentType};base64,${response.body}`}
                  alt="Response preview"
                  className="max-h-96 object-contain rounded"
                />
                <span className="text-slate-500 text-xs mt-3">{response.contentType} ({(response.sizeBytes / 1024).toFixed(2)} KB)</span>
              </div>
            ) : isAudio ? (
              <div className="flex flex-col items-center justify-center p-6 bg-slate-950 rounded border border-slate-800">
                <audio controls className="w-full max-w-md">
                  <source src={`data:${response.contentType};base64,${response.body}`} type={response.contentType} />
                  Your browser does not support audio playback.
                </audio>
              </div>
            ) : isVideo ? (
              <div className="flex flex-col items-center justify-center p-6 bg-slate-950 rounded border border-slate-800">
                <video controls className="w-full max-w-lg rounded">
                  <source src={`data:${response.contentType};base64,${response.body}`} type={response.contentType} />
                </video>
              </div>
            ) : (
              <pre className="text-slate-200 font-mono text-xs whitespace-pre-wrap leading-relaxed select-text">
                {formattedBody}
              </pre>
            )}
          </div>
        )}

        {/* RAW TAB */}
        {activeTab === 'raw' && (
          <pre className="text-slate-300 font-mono text-xs whitespace-pre-wrap break-all select-text">
            {response.body}
          </pre>
        )}

        {/* PREVIEW TAB */}
        {activeTab === 'preview' && (
          <div className="w-full h-full min-h-[400px] bg-white rounded overflow-hidden">
            {isHtml ? (
              <iframe
                title="HTML Preview"
                srcDoc={response.body}
                sandbox="allow-same-origin"
                className="w-full h-full min-h-[400px] border-none"
              />
            ) : isPdf ? (
              <iframe
                title="PDF Preview"
                src={`data:application/pdf;base64,${response.body}`}
                className="w-full h-full min-h-[400px] border-none"
              />
            ) : isImage ? (
              <div className="flex items-center justify-center h-full p-4 bg-slate-900">
                <img src={`data:${response.contentType};base64,${response.body}`} alt="preview" className="max-h-full" />
              </div>
            ) : (
              <div className="p-4 text-slate-600">No visual HTML/PDF preview available for this Content-Type.</div>
            )}
          </div>
        )}

        {/* HEX INSPECTOR TAB */}
        {activeTab === 'hex' && (
          <div className="flex flex-col gap-4 font-mono text-xs">
            {/* Hex Dump Matrix */}
            <div className="bg-slate-950 p-4 rounded border border-slate-800 overflow-x-auto">
              <div className="text-slate-500 border-b border-slate-800 pb-1 mb-2 flex">
                <span className="w-24">Offset</span>
                <span className="flex-1 tracking-wider">00 01 02 03 04 05 06 07  08 09 0A 0B 0C 0D 0E 0F</span>
                <span className="w-40 ml-4">ASCII</span>
              </div>
              {Array.from({ length: Math.ceil(hexBytes.length / 16) }).map((_, rowIndex) => {
                const rowStart = rowIndex * 16;
                const rowBytes = hexBytes.slice(rowStart, rowStart + 16);
                const offsetStr = rowStart.toString(16).padStart(8, '0').toUpperCase();

                return (
                  <div key={rowIndex} className="flex hover:bg-slate-900/60 leading-6">
                    <span className="w-24 text-slate-500 select-none">{offsetStr}:</span>
                    <span className="flex-1 flex gap-1.5">
                      {rowBytes.map((b, colIndex) => {
                        const globalIndex = rowStart + colIndex;
                        const isSelected = selectedByteIndex === globalIndex;
                        const hexVal = b.toString(16).padStart(2, '0').toUpperCase();
                        return (
                          <span
                            key={colIndex}
                            onClick={() => setSelectedByteIndex(globalIndex)}
                            className={`cursor-pointer px-0.5 rounded transition ${
                              isSelected ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:text-indigo-400'
                            }`}
                          >
                            {hexVal}
                          </span>
                        );
                      })}
                    </span>
                    <span className="w-40 ml-4 text-slate-400 select-none">
                      {rowBytes.map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.')).join('')}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Selected Byte Inspector */}
            {selectedByte !== null && (
              <div className="p-3 bg-slate-800/80 rounded border border-slate-700/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block">Offset:</span>
                  <strong className="text-indigo-300">0x{selectedByteIndex?.toString(16).toUpperCase()} ({selectedByteIndex})</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">UInt8:</span>
                  <strong className="text-slate-200">{selectedByte}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Binary:</span>
                  <strong className="text-slate-200 font-mono">{selectedByte.toString(2).padStart(8, '0')}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">ASCII:</span>
                  <strong className="text-emerald-400">{selectedByte >= 32 && selectedByte <= 126 ? String.fromCharCode(selectedByte) : '(non-printable)'}</strong>
                </div>
              </div>
            )}
          </div>
        )}

        {/* HEADERS TAB */}
        {activeTab === 'headers' && (
          <div className="bg-slate-950 rounded border border-slate-800 overflow-hidden font-mono text-xs">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-800/60 text-slate-400 text-left">
                  <th className="p-2 border-b border-slate-700/60 w-1/3">Header Key</th>
                  <th className="p-2 border-b border-slate-700/60">Value</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(response.headers || {}).map(([key, val], idx) => (
                  <tr key={idx} className="border-b border-slate-800/60 hover:bg-slate-900/40">
                    <td className="p-2 text-indigo-300 font-medium">{key}</td>
                    <td className="p-2 text-slate-300 break-all">{Array.isArray(val) ? val.join(', ') : String(val)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* COOKIES TAB */}
        {activeTab === 'cookies' && (
          <div className="bg-slate-950 rounded border border-slate-800 overflow-hidden font-mono text-xs">
            {response.cookies && response.cookies.length > 0 ? (
              <div className="p-3 space-y-2">
                {response.cookies.map((c, idx) => (
                  <div key={idx} className="p-2 bg-slate-900 rounded border border-slate-800 text-slate-300 break-all">
                    {c}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-slate-500">No Set-Cookie headers in this response.</div>
            )}
          </div>
        )}

        {/* TEST RESULTS TAB */}
        {activeTab === 'tests' && (
          <div className="space-y-2">
            {response.testResults?.map((test, idx) => (
              <div
                key={idx}
                className={`p-3 rounded border flex items-center gap-3 ${
                  test.passed ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300' : 'bg-rose-950/20 border-rose-800/40 text-rose-300'
                }`}
              >
                {test.passed ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />}
                <div className="flex-1">
                  <div className="font-semibold text-xs">{test.name}</div>
                  {test.error && <div className="text-xs text-rose-400/80 mt-1">{test.error}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
