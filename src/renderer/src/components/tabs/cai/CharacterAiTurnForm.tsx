// src/renderer/src/components/tabs/cai/CharacterAiTurnForm.tsx
import React, { useState, useEffect } from 'react';
import {
  Send,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  Bot,
  User,
  Check,
  Copy,
  Radio,
  FileCode,
  Zap,
} from 'lucide-react';
import {
  createCaiTurnPayload,
  createCaiGreetingPayload,
  extractCaiContext,
} from '../../../../../shared/cai-protocol.js';
import { TabItem } from '../../../../../shared/types.js';

interface CharacterAiTurnFormProps {
  tab: TabItem;
  isConnected: boolean;
  onSendRawPayload: (payloadStr: string) => Promise<void> | void;
  onLoadJsonToEditor: (jsonStr: string) => void;
}

export const CharacterAiTurnForm: React.FC<CharacterAiTurnFormProps> = ({
  tab,
  isConnected,
  onSendRawPayload,
  onLoadJsonToEditor,
}) => {
  const [chatId, setChatId] = useState('');
  const [characterId, setCharacterId] = useState('');
  const [characterName, setCharacterName] = useState('');
  const [userName, setUserName] = useState('HurtHyena2323');
  const [userAuthorId, setUserAuthorId] = useState('997886988');
  const [messageText, setMessageText] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Automatically sync context from incoming/outgoing stream events
  const syncFromEvents = () => {
    const ctx = extractCaiContext(tab.streamEvents || []);
    if (ctx.chatId) setChatId(ctx.chatId);
    if (ctx.characterId) setCharacterId(ctx.characterId);
    if (ctx.characterName) setCharacterName(ctx.characterName);
    if (ctx.userName && userName === 'HurtHyena2323') setUserName(ctx.userName);
    if (ctx.userAuthorId && userAuthorId === '997886988') setUserAuthorId(ctx.userAuthorId);
  };

  useEffect(() => {
    syncFromEvents();
  }, [tab.streamEvents]);

  const handleSendTurn = async () => {
    if (!isConnected || !messageText.trim() || isSending) return;

    if (!chatId.trim() || !characterId.trim()) {
      alert('Chat ID dan Character ID diperlukan. Silakan isi form atau sinkronkan dari event WebSocket.');
      return;
    }

    try {
      setIsSending(true);
      const payloadObj = createCaiTurnPayload({
        chatId,
        characterId,
        userName,
        userAuthorId,
        messageText: messageText.trim(),
      });

      const payloadStr = JSON.stringify(payloadObj, null, 2);
      await onSendRawPayload(payloadStr);
      setMessageText('');
    } catch (err: any) {
      console.error('Failed to send Character.AI turn:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendGreeting = async () => {
    if (!isConnected || isSending) return;
    if (!chatId.trim() || !characterId.trim()) {
      alert('Chat ID dan Character ID diperlukan untuk generate greeting.');
      return;
    }

    try {
      setIsSending(true);
      const greetingObj = createCaiGreetingPayload(chatId, characterId, userName);
      const greetingStr = JSON.stringify(greetingObj, null, 2);
      await onSendRawPayload(greetingStr);
    } catch (err) {
      console.error('Failed to send greeting:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleLoadToRaw = () => {
    const payloadObj = createCaiTurnPayload({
      chatId: chatId || 'd517aa25-348e-47ab-9059-67028be75d42',
      characterId: characterId || 'w3tOOWtQQqtENJ3NH3elZsylKg6S8gpm6e6oQVrhVnU',
      userName,
      userAuthorId,
      messageText: messageText || 'Hello!',
    });
    onLoadJsonToEditor(JSON.stringify(payloadObj, null, 2));
  };

  const copyText = (val: string, id: string) => {
    navigator.clipboard.writeText(val);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 1800);
  };

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-lg p-3 space-y-3">
      {/* Context Summary Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-950/80 rounded border border-slate-800/80 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-violet-600/30 border border-violet-500/50 flex items-center justify-center text-violet-300">
            <Bot className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-semibold text-slate-200">
              <span>{characterName || 'Character.AI Bot'}</span>
              {characterId ? (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                  {characterId.slice(0, 10)}...
                </span>
              ) : (
                <span className="text-[10px] text-amber-400/90 italic">(Belum terdeteksi)</span>
              )}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <span>Chat:</span>
              {chatId ? (
                <span className="font-mono text-indigo-300">{chatId.slice(0, 14)}...</span>
              ) : (
                <span className="text-amber-400/80 italic">Hubungkan & kirim frame</span>
              )}
            </div>
          </div>
        </div>

        {/* Sync & Toggle Edit Buttons */}
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            type="button"
            onClick={syncFromEvents}
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] transition cursor-pointer"
            title="Sinkronkan ID dari event yang diterima server"
          >
            <RefreshCw className="w-3 h-3 text-emerald-400" />
            <span>Sync</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] transition cursor-pointer ${
              showAdvanced
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>{showAdvanced ? 'Tutup ID' : 'Edit ID'}</span>
          </button>
        </div>
      </div>

      {/* Collapsible Advanced ID Fields */}
      {showAdvanced && (
        <div className="p-2.5 rounded bg-slate-950/90 border border-slate-800 space-y-2 text-xs animate-in fade-in duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                Chat ID (turn_key.chat_id)
              </label>
              <div className="flex items-center bg-slate-900 border border-slate-700 rounded px-2 py-1">
                <input
                  type="text"
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  placeholder="e.g. d517aa25-348e-47ab-9059-67028be75d42"
                  className="w-full bg-transparent text-slate-200 font-mono text-[11px] outline-none"
                />
                {chatId && (
                  <button
                    onClick={() => copyText(chatId, 'chatId')}
                    className="text-slate-400 hover:text-white ml-1"
                    title="Copy Chat ID"
                  >
                    {copiedField === 'chatId' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                Character ID (author_id)
              </label>
              <div className="flex items-center bg-slate-900 border border-slate-700 rounded px-2 py-1">
                <input
                  type="text"
                  value={characterId}
                  onChange={(e) => setCharacterId(e.target.value)}
                  placeholder="e.g. w3tOOWtQQqtENJ3NH3elZsylKg6S8gpm6e6oQVrhVnU"
                  className="w-full bg-transparent text-slate-200 font-mono text-[11px] outline-none"
                />
                {characterId && (
                  <button
                    onClick={() => copyText(characterId, 'charId')}
                    className="text-slate-400 hover:text-white ml-1"
                    title="Copy Character ID"
                  >
                    {copiedField === 'charId' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                Nama Karakter (Display Name)
              </label>
              <input
                type="text"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                placeholder="e.g. kim hyejin"
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-[11px] outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                User Name & ID
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="User Name"
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-[11px] outline-none"
                />
                <input
                  type="text"
                  value={userAuthorId}
                  onChange={(e) => setUserAuthorId(e.target.value)}
                  placeholder="User Author ID"
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-[11px] outline-none font-mono"
                />
              </div>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed italic">
            * Parameter ini otomatis menghasilkan <span className="text-amber-300 font-mono">request_id</span> unik,{' '}
            <span className="text-amber-300 font-mono">turn_id</span>, dan{' '}
            <span className="text-amber-300 font-mono">candidate_id</span> baru setiap pesan dikirim.
          </p>
        </div>
      )}

      {/* Core Message Textarea */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <label className="font-semibold text-slate-300 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-indigo-400" />
            <span>Pesan Balasan (Chat Turn):</span>
          </label>
          <span className="text-[10px] text-slate-400">Ctrl + Enter untuk kirim</span>
        </div>

        <textarea
          rows={3}
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyDown={(e) => {
            if (e.ctrlKey && e.key === 'Enter') {
              e.preventDefault();
              handleSendTurn();
            }
          }}
          placeholder='Ketik dialog atau tindakan roleplay Anda di sini... misal: "yeah.. you are right" atau *smiling softly* Hello there...'
          className="w-full p-2.5 rounded bg-slate-950 border border-slate-700 font-sans text-xs text-slate-100 outline-none focus:border-indigo-500 leading-relaxed resize-none shadow-inner"
        />
      </div>

      {/* Action Buttons Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        {/* Presets */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleSendGreeting}
            disabled={!isConnected || isSending || !chatId || !characterId}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 disabled:opacity-40 text-xs transition cursor-pointer"
            title="Minta Karakter Mengirimkan Salam Awal (generate_greeting)"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Greeting</span>
          </button>

          <button
            type="button"
            onClick={() => onSendRawPayload(JSON.stringify({ command: 'ping' }))}
            disabled={!isConnected}
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 text-xs transition cursor-pointer"
            title="Kirim ping keepalive frame"
          >
            <Zap className="w-3 h-3 text-yellow-400" />
            <span>Ping</span>
          </button>

          <button
            type="button"
            onClick={handleLoadToRaw}
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs transition cursor-pointer"
            title="Muat turn payload lengkap ke tab Raw JSON editor"
          >
            <FileCode className="w-3 h-3" />
            <span>Load ke Raw</span>
          </button>
        </div>

        {/* Primary Send Button */}
        <button
          type="button"
          onClick={handleSendTurn}
          disabled={!isConnected || !messageText.trim() || isSending}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-40 cursor-pointer shadow ml-auto"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{isSending ? 'Mengirim...' : 'Kirim Chat Turn'}</span>
        </button>
      </div>
    </div>
  );
};
