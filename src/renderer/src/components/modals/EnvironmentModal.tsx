// src/renderer/src/components/modals/EnvironmentModal.tsx
import React, { useState } from 'react';
import { useAppStore } from '../../stores/app.store.js';
import { Environment, KeyValuePair } from '../../../../shared/types.js';
import { X, Plus, Trash2, Globe, Check } from 'lucide-react';

interface EnvironmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EnvironmentModal: React.FC<EnvironmentModalProps> = ({ isOpen, onClose }) => {
  const { environments, activeEnvId, loadStorage, setActiveEnv } = useAppStore();
  const [selectedEnvId, setSelectedEnvId] = useState<string>(activeEnvId || environments[0]?.id || '');
  const [editingEnv, setEditingEnv] = useState<Environment | null>(null);

  if (!isOpen) return null;

  const currentEnv = editingEnv || environments.find((e) => e.id === selectedEnvId) || environments[0];

  const handleSelectEnv = (env: Environment) => {
    setSelectedEnvId(env.id);
    setEditingEnv(JSON.parse(JSON.stringify(env)));
  };

  const handleSaveEnv = async () => {
    if (!currentEnv) return;
    if ((window as any).networkAPI) {
      await (window as any).networkAPI.saveEnvironment(currentEnv);
      await loadStorage();
    }
    setEditingEnv(null);
  };

  const handleAddVariable = () => {
    if (!currentEnv) return;
    const updated: Environment = {
      ...currentEnv,
      variables: [
        ...currentEnv.variables,
        { id: String(Date.now()), key: '', value: '', enabled: true },
      ],
    };
    setEditingEnv(updated);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col h-[75vh]">
        {/* Header */}
        <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
            <Globe className="w-4 h-4" />
            <span>Environment & Variables Manager</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Split: Environments list on left, variables table on right */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Environments list */}
          <div className="w-56 bg-slate-950/60 border-r border-slate-800 p-3 space-y-1.5 overflow-auto text-xs">
            <div className="flex items-center justify-between text-slate-400 font-semibold mb-2">
              <span>Environments</span>
              <button
                onClick={() => {
                  const newEnv: Environment = {
                    id: `env-${Date.now()}`,
                    name: 'New Environment',
                    variables: [],
                  };
                  setEditingEnv(newEnv);
                  setSelectedEnvId(newEnv.id);
                }}
                className="text-indigo-400 hover:text-indigo-300"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {environments.map((env) => (
              <div
                key={env.id}
                onClick={() => handleSelectEnv(env)}
                className={`p-2 rounded cursor-pointer flex items-center justify-between transition ${
                  selectedEnvId === env.id
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>{env.name}</span>
                {activeEnvId === env.id && <span className="text-[10px] bg-emerald-500/30 text-emerald-300 px-1.5 py-0.5 rounded">Active</span>}
              </div>
            ))}
          </div>

          {/* Right: Variables Table */}
          <div className="flex-1 flex flex-col p-4 overflow-hidden bg-slate-900 text-xs">
            {currentEnv ? (
              <div className="flex-1 flex flex-col overflow-hidden space-y-3">
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={currentEnv.name}
                    onChange={(e) => setEditingEnv({ ...currentEnv, name: e.target.value })}
                    className="font-bold text-sm text-slate-100 bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 outline-none pb-1"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveEnv(currentEnv.id)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                    >
                      Set as Active
                    </button>
                    <button
                      onClick={handleAddVariable}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600/30 text-indigo-400 hover:bg-indigo-600/50"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Variable
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-auto border border-slate-800 rounded bg-slate-950 p-2 space-y-1.5">
                  <div className="flex items-center text-slate-500 px-2 py-1 text-[11px] font-semibold border-b border-slate-800">
                    <span className="w-6"></span>
                    <span className="flex-1">Variable Name</span>
                    <span className="flex-1 ml-2">Value</span>
                    <span className="w-8"></span>
                  </div>
                  {currentEnv.variables.map((v, idx) => (
                    <div key={v.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={v.enabled}
                        onChange={(e) => {
                          const vars = [...currentEnv.variables];
                          vars[idx].enabled = e.target.checked;
                          setEditingEnv({ ...currentEnv, variables: vars });
                        }}
                        className="rounded bg-slate-800"
                      />
                      <input
                        type="text"
                        placeholder="Variable Key (e.g. baseUrl)"
                        value={v.key}
                        onChange={(e) => {
                          const vars = [...currentEnv.variables];
                          vars[idx].key = e.target.value;
                          setEditingEnv({ ...currentEnv, variables: vars });
                        }}
                        className="flex-1 px-2 py-1 rounded bg-slate-900 border border-slate-800 font-mono text-xs outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Value"
                        value={v.value}
                        onChange={(e) => {
                          const vars = [...currentEnv.variables];
                          vars[idx].value = e.target.value;
                          setEditingEnv({ ...currentEnv, variables: vars });
                        }}
                        className="flex-1 px-2 py-1 rounded bg-slate-900 border border-slate-800 font-mono text-xs outline-none"
                      />
                      <button
                        onClick={() => {
                          const vars = currentEnv.variables.filter((_, i) => i !== idx);
                          setEditingEnv({ ...currentEnv, variables: vars });
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600">Select an environment</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-800/80 border-t border-slate-700 flex justify-end gap-2 text-xs">
          <button onClick={onClose} className="px-4 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300">
            Close
          </button>
          <button onClick={handleSaveEnv} className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
