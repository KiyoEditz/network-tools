// src/renderer/src/components/tabs/HttpTab.tsx
import React, { useState } from 'react';
import { TabItem, useAppStore } from '../../stores/app.store.js';
import { ResponseViewer } from '../viewers/ResponseViewer.js';
import { HttpMethod, BodyType, RawBodyFormat } from '../../../../shared/types.js';
import { Play, Plus, Trash2, Shield, Globe, Send, FileCode, Check } from 'lucide-react';

interface HttpTabProps {
  tab: TabItem;
}

export const HttpTab: React.FC<HttpTabProps> = ({ tab }) => {
  const { updateTabRequest, setResponse, updateTabState } = useAppStore();
  const req = tab.request;
  const [subTab, setSubTab] = useState<'params' | 'headers' | 'body' | 'auth' | 'geo-proxy' | 'scripts'>('params');

  const handleSend = async () => {
    updateTabState(tab.id, { status: 'loading' });
    try {
      if ((window as any).networkAPI) {
        const res = await (window as any).networkAPI.sendHttpRequest(req);
        setResponse(tab.id, res);
      }
    } catch (err: any) {
      setResponse(tab.id, {
        requestId: req.id,
        status: 0,
        statusText: 'Client Error',
        headers: {},
        cookies: [],
        body: err.message || 'Request failed',
        isBase64: false,
        contentType: 'text/plain',
        sizeBytes: 0,
        timing: {
          dnsLookupMs: 0,
          tcpHandshakeMs: 0,
          tlsHandshakeMs: 0,
          ttfbMs: 0,
          downloadMs: 0,
          totalDurationMs: 0,
        },
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 overflow-hidden text-xs">
      {/* Top Address & Action Bar */}
      <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center gap-2">
        <select
          value={req.method}
          onChange={(e) => updateTabRequest(tab.id, { method: e.target.value as HttpMethod })}
          className={`px-3 py-2 rounded font-mono font-bold border transition outline-none cursor-pointer ${
            req.method === 'GET'
              ? 'bg-blue-950/40 text-blue-400 border-blue-800/60'
              : req.method === 'POST'
              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60'
              : req.method === 'PUT'
              ? 'bg-amber-950/40 text-amber-400 border-amber-800/60'
              : req.method === 'DELETE'
              ? 'bg-rose-950/40 text-rose-400 border-rose-800/60'
              : 'bg-indigo-950/40 text-indigo-400 border-indigo-800/60'
          }`}
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
          <option value="PATCH">PATCH</option>
          <option value="HEAD">HEAD</option>
          <option value="OPTIONS">OPTIONS</option>
          <option value="CUSTOM">CUSTOM</option>
        </select>

        {req.method === 'CUSTOM' && (
          <input
            type="text"
            placeholder="CUSTOM VERB"
            value={req.customMethod || ''}
            onChange={(e) => updateTabRequest(tab.id, { customMethod: e.target.value.toUpperCase() })}
            className="w-28 px-3 py-2 rounded bg-slate-800 border border-slate-700 font-mono font-bold text-indigo-400 outline-none"
          />
        )}

        <div className="flex-1 flex items-center bg-slate-800 border border-slate-700/80 rounded px-3 py-1 focus-within:border-indigo-500 transition">
          <input
            type="text"
            placeholder="https://api.example.com/v1/resource or {{baseUrl}}/api"
            value={req.url}
            onChange={(e) => updateTabRequest(tab.id, { url: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 font-mono outline-none py-1 text-xs"
          />
        </div>

        <button
          onClick={handleSend}
          disabled={tab.status === 'loading'}
          className="flex items-center gap-2 px-5 py-2 rounded font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-50 cursor-pointer shadow-md shadow-indigo-600/20"
        >
          <Send className="w-3.5 h-3.5" />
          {tab.status === 'loading' ? 'Sending...' : 'Send'}
        </button>
      </div>

      {/* Main Split Body: Request Config on Left, Response Viewer on Right */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: Request Settings */}
        <div className="w-1/2 flex flex-col border-r border-slate-800 overflow-hidden bg-slate-950/50">
          {/* Sub-Tabs Bar */}
          <div className="flex items-center gap-1 px-3 pt-2 bg-slate-800/30 border-b border-slate-800">
            <button
              onClick={() => setSubTab('params')}
              className={`px-3 py-1.5 font-medium rounded-t transition ${
                subTab === 'params' ? 'bg-slate-900 text-indigo-400 border-t-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Params ({req.queryParams?.length || 0})
            </button>
            <button
              onClick={() => setSubTab('headers')}
              className={`px-3 py-1.5 font-medium rounded-t transition ${
                subTab === 'headers' ? 'bg-slate-900 text-indigo-400 border-t-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Headers ({req.headers?.length || 0})
            </button>
            <button
              onClick={() => setSubTab('body')}
              className={`px-3 py-1.5 font-medium rounded-t transition ${
                subTab === 'body' ? 'bg-slate-900 text-indigo-400 border-t-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Body {req.bodyType !== 'none' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block ml-1" />}
            </button>
            <button
              onClick={() => setSubTab('auth')}
              className={`px-3 py-1.5 font-medium rounded-t transition ${
                subTab === 'auth' ? 'bg-slate-900 text-indigo-400 border-t-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Auth
            </button>
            <button
              onClick={() => setSubTab('geo-proxy')}
              className={`px-3 py-1.5 font-medium rounded-t transition ${
                subTab === 'geo-proxy' ? 'bg-slate-900 text-indigo-400 border-t-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              IP & Geo Spoof
            </button>
            <button
              onClick={() => setSubTab('scripts')}
              className={`px-3 py-1.5 font-medium rounded-t transition ${
                subTab === 'scripts' ? 'bg-slate-900 text-indigo-400 border-t-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Scripts
            </button>
          </div>

          {/* SubTab Content */}
          <div className="flex-1 overflow-auto p-4">
            {/* PARAMS */}
            {subTab === 'params' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-slate-400 text-xs">
                  <span>Query Parameters</span>
                  <button
                    onClick={() => {
                      const list = [...(req.queryParams || [])];
                      list.push({ id: String(Date.now()), key: '', value: '', enabled: true });
                      updateTabRequest(tab.id, { queryParams: list });
                    }}
                    className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Param
                  </button>
                </div>
                <div className="space-y-1.5">
                  {(req.queryParams || []).map((p, idx) => (
                    <div key={p.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={p.enabled}
                        onChange={(e) => {
                          const list = [...(req.queryParams || [])];
                          list[idx].enabled = e.target.checked;
                          updateTabRequest(tab.id, { queryParams: list });
                        }}
                        className="rounded bg-slate-800 border-slate-700"
                      />
                      <input
                        type="text"
                        placeholder="Key"
                        value={p.key}
                        onChange={(e) => {
                          const list = [...(req.queryParams || [])];
                          list[idx].key = e.target.value;
                          updateTabRequest(tab.id, { queryParams: list });
                        }}
                        className="flex-1 px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 font-mono text-xs outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Value"
                        value={p.value}
                        onChange={(e) => {
                          const list = [...(req.queryParams || [])];
                          list[idx].value = e.target.value;
                          updateTabRequest(tab.id, { queryParams: list });
                        }}
                        className="flex-1 px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 font-mono text-xs outline-none"
                      />
                      <button
                        onClick={() => {
                          const list = (req.queryParams || []).filter((_, i) => i !== idx);
                          updateTabRequest(tab.id, { queryParams: list });
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* HEADERS */}
            {subTab === 'headers' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-slate-400 text-xs">
                  <span>HTTP Headers</span>
                  <button
                    onClick={() => {
                      const list = [...(req.headers || [])];
                      list.push({ id: String(Date.now()), key: '', value: '', enabled: true });
                      updateTabRequest(tab.id, { headers: list });
                    }}
                    className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Header
                  </button>
                </div>
                <div className="space-y-1.5">
                  {(req.headers || []).map((h, idx) => (
                    <div key={h.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={h.enabled}
                        onChange={(e) => {
                          const list = [...(req.headers || [])];
                          list[idx].enabled = e.target.checked;
                          updateTabRequest(tab.id, { headers: list });
                        }}
                        className="rounded bg-slate-800 border-slate-700"
                      />
                      <input
                        type="text"
                        placeholder="Header Key"
                        value={h.key}
                        onChange={(e) => {
                          const list = [...(req.headers || [])];
                          list[idx].key = e.target.value;
                          updateTabRequest(tab.id, { headers: list });
                        }}
                        className="flex-1 px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 font-mono text-xs outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Header Value"
                        value={h.value}
                        onChange={(e) => {
                          const list = [...(req.headers || [])];
                          list[idx].value = e.target.value;
                          updateTabRequest(tab.id, { headers: list });
                        }}
                        className="flex-1 px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 font-mono text-xs outline-none"
                      />
                      <button
                        onClick={() => {
                          const list = (req.headers || []).filter((_, i) => i !== idx);
                          updateTabRequest(tab.id, { headers: list });
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* BODY */}
            {subTab === 'body' && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="bodyType"
                      checked={req.bodyType === 'none'}
                      onChange={() => updateTabRequest(tab.id, { bodyType: 'none' })}
                    />
                    none
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="bodyType"
                      checked={req.bodyType === 'raw'}
                      onChange={() => updateTabRequest(tab.id, { bodyType: 'raw' })}
                    />
                    raw
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="bodyType"
                      checked={req.bodyType === 'x-www-form-urlencoded'}
                      onChange={() => updateTabRequest(tab.id, { bodyType: 'x-www-form-urlencoded' })}
                    />
                    x-www-form-urlencoded
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="bodyType"
                      checked={req.bodyType === 'graphql'}
                      onChange={() => updateTabRequest(tab.id, { bodyType: 'graphql' })}
                    />
                    GraphQL
                  </label>
                </div>

                {req.bodyType === 'raw' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Format:</span>
                      <select
                        value={req.rawBodyFormat || 'json'}
                        onChange={(e) => updateTabRequest(tab.id, { rawBodyFormat: e.target.value as RawBodyFormat })}
                        className="bg-slate-800 text-indigo-400 border border-slate-700 rounded px-2 py-1 text-xs outline-none"
                      >
                        <option value="json">JSON</option>
                        <option value="xml">XML</option>
                        <option value="html">HTML</option>
                        <option value="text">Text</option>
                      </select>
                    </div>
                    <textarea
                      rows={12}
                      value={req.rawBodyContent || ''}
                      onChange={(e) => updateTabRequest(tab.id, { rawBodyContent: e.target.value })}
                      placeholder="Enter raw payload..."
                      className="w-full p-3 rounded bg-slate-900 border border-slate-800 font-mono text-xs text-slate-200 outline-none focus:border-indigo-500 leading-relaxed"
                    />
                  </div>
                )}
              </div>
            )}

            {/* AUTH */}
            {subTab === 'auth' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Auth Type:</span>
                  <select
                    value={req.auth?.type || 'none'}
                    onChange={(e) => updateTabRequest(tab.id, { auth: { ...req.auth, type: e.target.value as any } })}
                    className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-3 py-1.5 text-xs outline-none"
                  >
                    <option value="none">No Auth</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="basic">Basic Auth</option>
                    <option value="apiKey">API Key</option>
                  </select>
                </div>

                {req.auth?.type === 'bearer' && (
                  <div>
                    <label className="text-slate-400 block mb-1">Token:</label>
                    <input
                      type="text"
                      placeholder="Bearer {{token}}"
                      value={req.auth.bearerToken || ''}
                      onChange={(e) => updateTabRequest(tab.id, { auth: { ...req.auth, bearerToken: e.target.value } })}
                      className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 font-mono text-xs outline-none"
                    />
                  </div>
                )}

                {req.auth?.type === 'basic' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1">Username:</label>
                      <input
                        type="text"
                        value={req.auth.basicUsername || ''}
                        onChange={(e) => updateTabRequest(tab.id, { auth: { ...req.auth, basicUsername: e.target.value } })}
                        className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Password:</label>
                      <input
                        type="password"
                        value={req.auth.basicPassword || ''}
                        onChange={(e) => updateTabRequest(tab.id, { auth: { ...req.auth, basicPassword: e.target.value } })}
                        className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-xs outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* GEO & IP SPOOFING */}
            {subTab === 'geo-proxy' && (
              <div className="space-y-4">
                <div className="p-3 bg-slate-900 rounded border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">Geo & Client IP Spoofing (Reverse Proxy / CDN)</span>
                    <input
                      type="checkbox"
                      checked={req.geoSpoof?.enabled || false}
                      onChange={(e) => updateTabRequest(tab.id, { geoSpoof: { ...req.geoSpoof, enabled: e.target.checked } })}
                      className="rounded bg-slate-800"
                    />
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Injects <code className="text-indigo-400">X-Forwarded-For</code>, <code className="text-indigo-400">CF-Connecting-IP</code>, and <code className="text-indigo-400">CF-IPCountry</code> to simulate requests originating from foreign regions.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1">Simulated Country:</label>
                      <select
                        value={req.geoSpoof?.countryCode || 'US'}
                        onChange={(e) => updateTabRequest(tab.id, { geoSpoof: { ...req.geoSpoof, enabled: true, countryCode: e.target.value } })}
                        className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded px-2.5 py-1.5 text-xs outline-none"
                      >
                        <option value="US">🇺🇸 United States (US)</option>
                        <option value="SG">🇸🇬 Singapore (SG)</option>
                        <option value="JP">🇯🇵 Japan (JP)</option>
                        <option value="ID">🇮🇩 Indonesia (ID)</option>
                        <option value="DE">🇩🇪 Germany (DE)</option>
                        <option value="GB">🇬🇧 United Kingdom (GB)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">Custom IP (optional):</label>
                      <input
                        type="text"
                        placeholder="Auto-generate or enter IP"
                        value={req.geoSpoof?.customIp || ''}
                        onChange={(e) => updateTabRequest(tab.id, { geoSpoof: { ...req.geoSpoof, enabled: true, customIp: e.target.value } })}
                        className="w-full px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 font-mono text-xs outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Local Network Adapter Binding */}
                <div className="p-3 bg-slate-900 rounded border border-slate-800 space-y-2">
                  <span className="font-semibold text-slate-200">Local Network Adapter Binding (`localAddress`)</span>
                  <p className="text-slate-400 text-[11px]">Bind outgoing socket to a specific local interface/IP (Wi-Fi, Ethernet, VPN adapter).</p>
                  <input
                    type="text"
                    placeholder="e.g. 192.168.1.100 (leave blank for OS default)"
                    value={req.networkInterface?.localAddress || ''}
                    onChange={(e) => updateTabRequest(tab.id, { networkInterface: { localAddress: e.target.value } })}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 font-mono text-xs outline-none"
                  />
                </div>
              </div>
            )}

            {/* SCRIPTS */}
            {subTab === 'scripts' && (
              <div className="space-y-4">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Pre-request Script:</label>
                  <textarea
                    rows={6}
                    value={req.preRequestScript || ''}
                    onChange={(e) => updateTabRequest(tab.id, { preRequestScript: e.target.value })}
                    placeholder={`// Example:\npm.environment.set("authTimestamp", Date.now());\npm.variables.set("customHeader", "value");`}
                    className="w-full p-2.5 rounded bg-slate-900 border border-slate-800 font-mono text-xs text-slate-200 outline-none leading-relaxed"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Post-response Tests Script:</label>
                  <textarea
                    rows={6}
                    value={req.testScript || ''}
                    onChange={(e) => updateTabRequest(tab.id, { testScript: e.target.value })}
                    placeholder={`// Example:\npm.test("Status is 200", () => {\n  pm.expect(pm.response.status).to.equal(200);\n});`}
                    className="w-full p-2.5 rounded bg-slate-900 border border-slate-800 font-mono text-xs text-slate-200 outline-none leading-relaxed"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Response Viewer */}
        <ResponseViewer response={tab.response} isLoading={tab.status === 'loading'} />
      </div>
    </div>
  );
};
