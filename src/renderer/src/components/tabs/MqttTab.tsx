// src/renderer/src/components/tabs/MqttTab.tsx
import React, { useState } from 'react';
import { TabItem, useAppStore } from '../../stores/app.store.js';
import { Power, PowerOff, Send, Plus, Trash2, Radio } from 'lucide-react';

interface MqttTabProps {
  tab: TabItem;
}

export const MqttTab: React.FC<MqttTabProps> = ({ tab }) => {
  const { updateTabState } = useAppStore();
  const [brokerUrl, setBrokerUrl] = useState('mqtt://127.0.0.1:1883');
  const [clientId, setClientId] = useState(`client-${Math.random().toString(16).substring(2, 6)}`);
  const [subTopic, setSubTopic] = useState('sensors/#');
  const [subQos, setSubQos] = useState<0 | 1 | 2>(0);
  const [subscriptions, setSubscriptions] = useState<string[]>([]);

  const [pubTopic, setPubTopic] = useState('sensors/temp');
  const [pubMessage, setPubMessage] = useState('{\n  "temperature": 26.5,\n  "humidity": 65\n}');
  const [pubQos, setPubQos] = useState<0 | 1 | 2>(0);
  const [pubRetain, setPubRetain] = useState(false);

  const isConnected = tab.status === 'connected';

  const handleToggleConnect = async () => {
    if (isConnected) {
      if ((window as any).networkAPI) {
        await (window as any).networkAPI.disconnectMqtt(tab.id);
      }
      updateTabState(tab.id, { status: 'idle' });
    } else {
      updateTabState(tab.id, { status: 'loading' });
      try {
        if ((window as any).networkAPI) {
          await (window as any).networkAPI.connectMqtt({
            sessionId: tab.id,
            config: { brokerUrl, clientId },
          });
          updateTabState(tab.id, { status: 'connected' });
        }
      } catch {
        updateTabState(tab.id, { status: 'error' });
      }
    }
  };

  const handleSubscribe = async () => {
    if (!subTopic.trim() || !isConnected) return;
    try {
      if ((window as any).networkAPI) {
        await (window as any).networkAPI.subscribeMqtt({
          sessionId: tab.id,
          topic: subTopic,
          qos: subQos,
        });
        if (!subscriptions.includes(subTopic)) {
          setSubscriptions([...subscriptions, subTopic]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePublish = async () => {
    if (!pubTopic.trim() || !isConnected) return;
    try {
      if ((window as any).networkAPI) {
        await (window as any).networkAPI.publishMqtt({
          sessionId: tab.id,
          topic: pubTopic,
          message: pubMessage,
          qos: pubQos,
          retain: pubRetain,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 overflow-hidden text-xs">
      {/* Top Connection Bar */}
      <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center gap-3">
        <span className="font-mono font-bold text-violet-400 bg-violet-950/40 border border-violet-800/60 px-3 py-1.5 rounded">
          MQTT
        </span>

        <input
          type="text"
          value={brokerUrl}
          disabled={isConnected}
          onChange={(e) => setBrokerUrl(e.target.value)}
          placeholder="mqtt://127.0.0.1:1883 or ws://broker:8883"
          className="flex-1 px-3 py-2 rounded bg-slate-800 border border-slate-700/80 text-slate-100 font-mono text-xs outline-none"
        />

        <input
          type="text"
          value={clientId}
          disabled={isConnected}
          onChange={(e) => setClientId(e.target.value)}
          placeholder="Client ID"
          className="w-36 px-2.5 py-2 rounded bg-slate-800 border border-slate-700 text-xs font-mono outline-none"
        />

        <button
          onClick={handleToggleConnect}
          className={`flex items-center gap-2 px-5 py-2 rounded font-semibold transition cursor-pointer shadow-md ${
            isConnected
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
              : 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-600/20'
          }`}
        >
          {isConnected ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
          {isConnected ? 'Disconnect' : 'Connect Broker'}
        </button>
      </div>

      {/* Main Split: Left Sub/Pub Controls, Right Live Message Feed */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Subscriptions & Publish */}
        <div className="w-1/2 flex flex-col border-r border-slate-800 p-4 space-y-4 overflow-auto bg-slate-950/40">
          {/* Subscribe Box */}
          <div className="p-3 bg-slate-900 rounded border border-slate-800 space-y-3">
            <span className="font-semibold text-slate-200 block">Subscribe to Topic:</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={subTopic}
                onChange={(e) => setSubTopic(e.target.value)}
                placeholder="Topic (e.g. sensors/# or home/+/temp)"
                className="flex-1 px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 font-mono text-xs outline-none"
              />
              <select
                value={subQos}
                onChange={(e) => setSubQos(Number(e.target.value) as any)}
                className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 outline-none"
              >
                <option value={0}>QoS 0</option>
                <option value={1}>QoS 1</option>
                <option value={2}>QoS 2</option>
              </select>
              <button
                onClick={handleSubscribe}
                disabled={!isConnected}
                className="px-3 py-1.5 rounded font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
              >
                Subscribe
              </button>
            </div>

            {/* Active Subscriptions List */}
            {subscriptions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {subscriptions.map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded bg-violet-950/60 text-violet-300 border border-violet-800/40 font-mono text-[11px]">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Publish Box */}
          <div className="p-3 bg-slate-900 rounded border border-slate-800 space-y-3 flex-1 flex flex-col">
            <span className="font-semibold text-slate-200 block">Publish Message:</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={pubTopic}
                onChange={(e) => setPubTopic(e.target.value)}
                placeholder="Target Topic"
                className="flex-1 px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 font-mono text-xs outline-none"
              />
              <select
                value={pubQos}
                onChange={(e) => setPubQos(Number(e.target.value) as any)}
                className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 outline-none"
              >
                <option value={0}>QoS 0</option>
                <option value={1}>QoS 1</option>
                <option value={2}>QoS 2</option>
              </select>
              <label className="flex items-center gap-1 text-slate-400 cursor-pointer text-xs">
                <input type="checkbox" checked={pubRetain} onChange={(e) => setPubRetain(e.target.checked)} />
                Retain
              </label>
            </div>

            <textarea
              rows={8}
              value={pubMessage}
              onChange={(e) => setPubMessage(e.target.value)}
              className="flex-1 w-full p-2.5 rounded bg-slate-800 border border-slate-700 font-mono text-xs text-slate-200 outline-none leading-relaxed"
            />

            <button
              onClick={handlePublish}
              disabled={!isConnected}
              className="self-end flex items-center gap-1.5 px-4 py-2 rounded font-semibold bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" /> Publish
            </button>
          </div>
        </div>

        {/* Right Side: Live Messages Feed */}
        <div className="w-1/2 flex flex-col overflow-hidden bg-slate-950 font-mono text-xs">
          <div className="p-2.5 bg-slate-800/60 border-b border-slate-700/60 flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-2">
              <Radio className={`w-3.5 h-3.5 ${isConnected ? 'text-violet-400 animate-pulse' : 'text-slate-500'}`} />
              Topic Message Feed ({tab.streamEvents?.length || 0})
            </span>
            <button
              onClick={() => updateTabState(tab.id, { streamEvents: [] })}
              className="flex items-center gap-1 text-slate-400 hover:text-slate-200"
            >
              <Trash2 className="w-3 h-3" /> Clear
            </button>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-2">
            {tab.streamEvents?.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-600">
                No MQTT messages received.
              </div>
            ) : (
              tab.streamEvents?.map((ev, idx) => (
                <div key={idx} className="p-2.5 bg-slate-900 rounded border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-bold text-violet-400 font-mono">{ev.metadata?.topic || 'SYS'}</span>
                    <span>QoS {ev.metadata?.qos ?? 0} {ev.metadata?.retain && '• Retained'} • {new Date(ev.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <pre className="text-slate-200 select-text whitespace-pre-wrap leading-relaxed">
                    {ev.payload}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
