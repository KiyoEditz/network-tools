// src/renderer/src/components/tabs/WebRtcTab.tsx
import React, { useState, useEffect, useRef } from 'react';
import { TabItem } from '../../stores/app.store.js';
import { Video, Activity, Send, CheckCircle2, Copy, Check } from 'lucide-react';

interface WebRtcTabProps {
  tab: TabItem;
}

export const WebRtcTab: React.FC<WebRtcTabProps> = () => {
  const [peerState, setPeerState] = useState<string>('new');
  const [dataChannelState, setDataChannelState] = useState<string>('closed');
  const [localSdp, setLocalSdp] = useState<string>('');
  const [remoteSdp, setRemoteSdp] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; time: number }>>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [copied, setCopied] = useState(false);

  // Telemetry stats
  const [stats, setStats] = useState<{ rttMs: number; bytesSent: number; bytesReceived: number }>({
    rttMs: 0,
    bytesSent: 0,
    bytesReceived: 0,
  });

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    // Initialize RTCPeerConnection using Chromium's native implementation
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    pcRef.current = pc;

    pc.oniceconnectionstatechange = () => {
      setPeerState(pc.iceConnectionState);
    };

    pc.ondatachannel = (e) => {
      const channel = e.channel;
      dcRef.current = channel;
      setupDataChannel(channel);
    };

    pc.ontrack = (event) => {
      if (videoRef.current && event.streams[0]) {
        videoRef.current.srcObject = event.streams[0];
      }
    };

    // Telemetry polling
    const interval = setInterval(async () => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        const report = await pc.getStats();
        report.forEach((stat) => {
          if (stat.type === 'candidate-pair' && stat.currentRoundTripTime) {
            setStats((prev) => ({
              ...prev,
              rttMs: Math.round(stat.currentRoundTripTime * 1000),
            }));
          }
        });
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      pc.close();
    };
  }, []);

  const setupDataChannel = (dc: RTCDataChannel) => {
    dc.onopen = () => setDataChannelState('open');
    dc.onclose = () => setDataChannelState('closed');
    dc.onmessage = (e) => {
      setChatMessages((prev) => [...prev, { sender: 'Peer', text: e.data, time: Date.now() }]);
      setStats((prev) => ({ ...prev, bytesReceived: prev.bytesReceived + e.data.length }));
    };
  };

  const handleCreateOffer = async () => {
    if (!pcRef.current) return;
    const pc = pcRef.current;

    // Create a local data channel
    const dc = pc.createDataChannel('network-tester-channel');
    dcRef.current = dc;
    setupDataChannel(dc);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Wait for ICE gathering to complete for complete SDP
    await new Promise<void>((resolve) => {
      if (pc.iceGatheringState === 'complete') resolve();
      else {
        const check = () => {
          if (pc.iceGatheringState === 'complete') {
            pc.removeEventListener('icegatheringstatechange', check);
            resolve();
          }
        };
        pc.addEventListener('icegatheringstatechange', check);
      }
    });

    setLocalSdp(JSON.stringify(pc.localDescription));
  };

  const handleApplyRemoteSdp = async () => {
    if (!pcRef.current || !remoteSdp.trim()) return;
    const pc = pcRef.current;
    const desc = JSON.parse(remoteSdp);
    await pc.setRemoteDescription(desc);

    if (desc.type === 'offer') {
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      setLocalSdp(JSON.stringify(pc.localDescription));
    }
  };

  const handleSendMessage = () => {
    if (!dcRef.current || dcRef.current.readyState !== 'open' || !inputMsg.trim()) return;
    dcRef.current.send(inputMsg);
    setChatMessages((prev) => [...prev, { sender: 'Me', text: inputMsg, time: Date.now() }]);
    setStats((prev) => ({ ...prev, bytesSent: prev.bytesSent + inputMsg.length }));
    setInputMsg('');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 overflow-hidden text-xs">
      {/* Top Status & Metrics Bar */}
      <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-3 py-1 rounded">
            WebRTC P2P
          </span>
          <span className="text-slate-400">
            ICE: <strong className="text-slate-200 uppercase">{peerState}</strong>
          </span>
          <span className="text-slate-400">
            DataChannel: <strong className="text-emerald-400 uppercase">{dataChannelState}</strong>
          </span>
        </div>

        {/* Real-time Telemetry Metrics */}
        <div className="flex items-center gap-4 text-slate-400">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            RTT: <strong className="text-slate-200">{stats.rttMs} ms</strong>
          </span>
          <span>Sent: <strong className="text-slate-200">{stats.bytesSent} B</strong></span>
          <span>Received: <strong className="text-slate-200">{stats.bytesReceived} B</strong></span>
        </div>
      </div>

      {/* Main Split: Signaling on Left, DataChannel & Video on Right */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: SDP Exchange */}
        <div className="w-1/2 flex flex-col border-r border-slate-800 p-4 space-y-4 overflow-auto bg-slate-950/50">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200">1. Local SDP (Offer / Answer):</span>
              <button
                onClick={handleCreateOffer}
                className="px-3 py-1 rounded font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                Create Offer
              </button>
            </div>
            <textarea
              rows={6}
              readOnly
              value={localSdp}
              placeholder="Click 'Create Offer' to generate local SDP..."
              className="w-full p-2.5 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 outline-none"
            />
            {localSdp && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(localSdp);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied to clipboard' : 'Copy Local SDP'}
              </button>
            )}
          </div>

          <div className="space-y-2">
            <span className="font-semibold text-slate-200 block">2. Remote SDP (Paste Peer's SDP):</span>
            <textarea
              rows={6}
              value={remoteSdp}
              onChange={(e) => setRemoteSdp(e.target.value)}
              placeholder="Paste remote Offer or Answer JSON here..."
              className="w-full p-2.5 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 outline-none"
            />
            <button
              onClick={handleApplyRemoteSdp}
              className="px-4 py-1.5 rounded font-semibold bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              Set Remote Description
            </button>
          </div>
        </div>

        {/* Right: DataChannel Messages & Media */}
        <div className="w-1/2 flex flex-col overflow-hidden bg-slate-950">
          <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between font-semibold text-slate-300">
            <span>RTCDataChannel Stream</span>
            <span className="text-xs text-slate-500 font-normal">Direct Peer-to-Peer</span>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-auto p-4 space-y-2 font-mono text-xs">
            {chatMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-600">
                DataChannel is not active. Connect peers to start messaging.
              </div>
            ) : (
              chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded max-w-sm ${
                    msg.sender === 'Me'
                      ? 'ml-auto bg-indigo-950/40 border border-indigo-800/60 text-indigo-200'
                      : 'mr-auto bg-slate-900 border border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span>{msg.sender}</span>
                    <span>{new Date(msg.time).toLocaleTimeString()}</span>
                  </div>
                  <div>{msg.text}</div>
                </div>
              ))
            )}
          </div>

          {/* DataChannel Input */}
          <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={dataChannelState !== 'open'}
              placeholder={dataChannelState === 'open' ? 'Type message to send over DataChannel...' : 'Channel not open'}
              className="flex-1 px-3 py-1.5 rounded bg-slate-800 border border-slate-700 text-slate-100 text-xs outline-none disabled:opacity-50"
            />
            <button
              onClick={handleSendMessage}
              disabled={dataChannelState !== 'open'}
              className="px-4 py-1.5 rounded font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
