// src/renderer/src/components/tabs/cai/CharacterAiChatView.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  User,
  Copy,
  Check,
  Code,
  Radio,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ArrowDown,
} from 'lucide-react';
import { aggregateCaiTurns, CaiAggregatedMessage } from '../../../../../shared/cai-protocol.js';
import { StreamEvent } from '../../../../../shared/types.js';

interface CharacterAiChatViewProps {
  events: StreamEvent[];
  autoScroll?: boolean;
}

/**
 * Formats Character.AI roleplay style text (*actions* and "dialogues")
 */
const FormattedDialogue: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return <span className="text-slate-500 italic">Menunggu teks...</span>;

  // Split into paragraphs
  const paragraphs = text.split('\n');

  return (
    <div className="space-y-2 leading-relaxed">
      {paragraphs.map((p, pIdx) => {
        if (!p.trim()) return <div key={pIdx} className="h-1.5" />;

        // Tokenize between asterisks for roleplay actions
        const parts = p.split(/(\*[^*]+\*)/g);

        return (
          <p key={pIdx} className="break-words">
            {parts.map((part, idx) => {
              if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
                return (
                  <span key={idx} className="italic text-slate-300 font-sans">
                    {part}
                  </span>
                );
              }

              // Highlight dialogue inside quotes
              const quoteParts = part.split(/("[^"]+")/g);
              return quoteParts.map((qp, qIdx) => {
                if (qp.startsWith('"') && qp.endsWith('"') && qp.length > 2) {
                  return (
                    <span key={qIdx} className="text-amber-200 font-medium">
                      {qp}
                    </span>
                  );
                }
                return <span key={qIdx}>{qp}</span>;
              });
            })}
          </p>
        );
      })}
    </div>
  );
};

export const CharacterAiChatView: React.FC<CharacterAiChatViewProps> = ({
  events,
  autoScroll = true,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedJsonIds, setExpandedJsonIds] = useState<Set<string>>(new Set());
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const aggregatedMessages = aggregateCaiTurns(events);

  useEffect(() => {
    if (autoScroll) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aggregatedMessages, autoScroll]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const toggleJsonExpand = (id: string) => {
    setExpandedJsonIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (aggregatedMessages.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500 space-y-3">
        <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-indigo-400">
          <Bot className="w-6 h-6" />
        </div>
        <div className="max-w-xs space-y-1">
          <h4 className="font-semibold text-slate-300 text-xs">Belum Ada Percakapan Character.AI</h4>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Hubungkan WebSocket dan kirim pesan di panel kiri untuk mulai mengobrol secara interaktif.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-3 space-y-3 font-sans text-xs select-text">
      {aggregatedMessages.map((msg) => {
        if (msg.sender === 'system') {
          return (
            <div key={msg.id} className="flex justify-center my-1.5">
              <span className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-[10px] text-slate-400 font-mono">
                {msg.rawContent}
              </span>
            </div>
          );
        }

        const isBot = msg.sender === 'bot';
        const isJsonExpanded = expandedJsonIds.has(msg.id);

        return (
          <div
            key={msg.id}
            className={`flex flex-col ${isBot ? 'items-start mr-6' : 'items-end ml-6'}`}
          >
            {/* Author & Status Meta */}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1 px-1">
              {isBot ? (
                <>
                  <div className="w-4 h-4 rounded-full bg-violet-600/30 flex items-center justify-center text-violet-300">
                    <Bot className="w-3 h-3" />
                  </div>
                  <span className="font-semibold text-slate-200">{msg.authorName}</span>
                  {!msg.isFinal && (
                    <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-950/40 border border-amber-800/50 px-1.5 py-0.2 rounded animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block animate-ping" />
                      Streaming ({msg.chunkCount} chunks)...
                    </span>
                  )}
                  {msg.isFinal && (
                    <span className="text-[10px] text-emerald-400 bg-emerald-950/30 px-1.5 py-0.2 rounded border border-emerald-800/40 flex items-center gap-0.5">
                      <Check className="w-2.5 h-2.5" /> Selesai
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="font-semibold text-slate-300">{msg.authorName}</span>
                  <div className="w-4 h-4 rounded-full bg-indigo-600/40 flex items-center justify-center text-indigo-300">
                    <User className="w-3 h-3" />
                  </div>
                </>
              )}
              <span className="text-[10px] text-slate-500">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>

            {/* Bubble Content */}
            <div
              className={`p-3 rounded-lg max-w-full leading-relaxed shadow-md border ${
                isBot
                  ? 'bg-slate-900/90 border-slate-700/80 text-slate-100 rounded-tl-sm'
                  : 'bg-indigo-950/60 border-indigo-700/60 text-indigo-50 rounded-tr-sm'
              }`}
            >
              <FormattedDialogue text={msg.rawContent} />

              {/* Collapsible Raw JSON Viewer */}
              {isJsonExpanded && msg.rawJson && (
                <div className="mt-2.5 pt-2 border-t border-slate-700/70 text-[10px] font-mono">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span>Raw JSON Turn Frame:</span>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(msg.rawJson, null, 2), `raw-json-${msg.id}`)}
                      className="hover:text-white flex items-center gap-0.5"
                    >
                      {copiedId === `raw-json-${msg.id}` ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                      <span>Salin</span>
                    </button>
                  </div>
                  <pre className="p-2 bg-slate-950 rounded border border-slate-800 overflow-x-auto max-h-48 text-slate-300 leading-tight">
                    {JSON.stringify(msg.rawJson, null, 2)}
                  </pre>
                </div>
              )}

              {/* Bubble Footer & Actions */}
              <div className="mt-2 pt-1.5 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">
                <div className="flex items-center gap-2">
                  {msg.modelType && (
                    <span className="font-mono bg-slate-800 px-1.5 py-0.2 rounded text-slate-300">
                      {msg.modelType.replace('MODEL_TYPE_', '')}
                    </span>
                  )}
                  {msg.contextUsage !== undefined && (
                    <span className="text-slate-400">
                      Tokens: <strong className="text-indigo-300">{msg.contextUsage}%</strong>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 ml-auto">
                  <button
                    onClick={() => copyToClipboard(msg.rawContent, `text-${msg.id}`)}
                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                    title="Salin hanya teks pesan"
                  >
                    {copiedId === `text-${msg.id}` ? (
                      <Check className="w-2.5 h-2.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-2.5 h-2.5" />
                    )}
                    <span>Salin Teks</span>
                  </button>

                  {msg.rawJson && (
                    <button
                      onClick={() => toggleJsonExpand(msg.id)}
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                      title="Lihat Raw JSON payload"
                    >
                      <Code className="w-2.5 h-2.5 text-amber-400" />
                      <span>{isJsonExpanded ? 'Tutup JSON' : 'JSON'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={chatBottomRef} />
    </div>
  );
};
