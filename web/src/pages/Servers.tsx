import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import insforgeClient from '../config/insforge';
import { useAuth } from '../contexts/AuthContext';

interface ApiKey {
  id: string;
  user_id: string;
  server_id: string | null;
  provider: string;
  key_value: string;
  label: string;
}

interface ConnectionKey {
  id: string;
  key_value: string;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
  max_servers: number;
}

interface Server {
  id: string;
  connection_key_id: string;
  server_name: string;
  server_hostname: string;
  server_ip: string | null;
  os_type: string;
  last_seen: string;
  first_registered: string;
  is_active: boolean;
  description: string | null;
  metadata: any;
  // joined
  _connection_key?: ConnectionKey;
  _ai_key?: ApiKey;
}

const Servers: React.FC = () => {
  const { user } = useAuth();
  const [servers, setServers] = useState<Server[]>([]);
  const [connKeys, setConnKeys] = useState<ConnectionKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // AI Key state
  const [editingServerId, setEditingServerId] = useState<string | null>(null);
  const [aiKeyInput, setAiKeyInput] = useState('');
  const [savingAi, setSavingAi] = useState(false);
  const [aiSuccess, setAiSuccess] = useState('');

  useEffect(() => {
    if (user) {
      fetchAll();
      const interval = setInterval(fetchAll, 15000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchAll = async () => {
    if (!user) return;
    try {
      // 1. Get this user's connection keys
      const { data: keyData, error: keyErr } = await insforgeClient.database
        .from('connection_keys')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (keyErr) throw keyErr;
      const myKeys: ConnectionKey[] = keyData || [];
      setConnKeys(myKeys);

      if (myKeys.length === 0) {
        setServers([]);
        setLoading(false);
        return;
      }

      const keyIds = myKeys.map((k) => k.id).filter(Boolean);
      if (keyIds.length === 0) {
        setServers([]);
        setLoading(false);
        return;
      }

      // 2. Get servers for these keys
      const { data: serverData, error: serverErr } = await insforgeClient.database
        .from('servers')
        .select('*')
        .in('connection_key_id', keyIds)
        .order('last_seen', { ascending: false });

      if (serverErr && (serverErr as any)?.statusCode !== 404) throw serverErr;
      const myServers = serverData || [];

      // 3. Get AI keys for this user
      const { data: apiKeysData, error: apiKeysErr } = await insforgeClient.database
        .from('api_keys')
        .select('*')
        .eq('user_id', user.id);

      if (apiKeysErr) throw apiKeysErr;
      const myApiKeys: ApiKey[] = apiKeysData || [];

      // 4. Enrich servers
      const connKeyMap = Object.fromEntries(myKeys.map((k) => [k.id, k]));
      // Map server-specific keys OR user-level key if no server-specific key exists
      const enriched: Server[] = myServers.map((s: any) => {
        // Prefer key linked to this server_id, then fallback to global (server_id null) key for 'gemini'
        const serverSpecific = myApiKeys.find(ak => ak.server_id === s.id && ak.provider === 'gemini');
        const userLevel = myApiKeys.find(ak => !ak.server_id && ak.provider === 'gemini');
        
        return {
          ...s,
          _connection_key: connKeyMap[s.connection_key_id],
          _ai_key: serverSpecific || userLevel,
        };
      });

      setServers(enriched);
    } catch (err: any) {
      setError(err.message || 'Failed to load servers');
    } finally {
      setLoading(false);
    }
  };

  const removeServer = async (serverId: string) => {
    if (!confirm('Remove this server? Its logs will remain.')) return;
    try {
      const { error } = await insforgeClient.database
        .from('servers')
        .delete()
        .eq('id', serverId);
      if (error) throw error;
      await fetchAll();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const updateAiKey = async (serverId: string) => {
    if (!user) return;
    setSavingAi(true);
    try {
      // Upsert into api_keys table
      const { error: upsertErr } = await insforgeClient.database
        .from('api_keys')
        .upsert([
          {
            user_id: user.id,
            server_id: serverId,
            provider: 'gemini',
            key_value: aiKeyInput,
            label: 'server-specific'
          }
        ], { onConflict: 'user_id,server_id,provider' });

      if (upsertErr) throw upsertErr;

      setAiSuccess('Server key updated!');
      setEditingServerId(null);
      await fetchAll();
      setTimeout(() => setAiSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingAi(false);
    }
  };

  const getStatusStyle = (lastSeen: string) => {
    const h = (Date.now() - new Date(lastSeen).getTime()) / 3_600_000;
    if (h < 1) return { dot: 'bg-emerald-400 animate-pulse', badge: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30', label: 'ONLINE' };
    if (h < 24) return { dot: 'bg-yellow-400', badge: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30', label: 'IDLE' };
    return { dot: 'bg-red-500', badge: 'text-red-400 bg-red-500/15 border-red-500/30', label: 'OFFLINE' };
  };

  const maskKey = (k: string) => k ? (k.slice(0, 8) + '••••••••' + k.slice(-4)) : '';

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm font-mono">Loading servers...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black font-orbitron text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-cyan-300">
              Servers
            </h1>
            <p className="text-sm text-slate-400 mt-1.5">
              {servers.length} connected server{servers.length !== 1 ? 's' : ''} across {connKeys.length} collection point{connKeys.length !== 1 ? 's' : ''}
            </p>
          </div>
          {aiSuccess && (
            <span className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm">
              ✓ {aiSuccess}
            </span>
          )}
        </div>

        {error && (
          <div className="mb-5 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex gap-2">
            <span>⚠️</span> {error}
            <button className="ml-auto text-red-400/60 hover:text-red-400" onClick={() => setError('')}>✕</button>
          </div>
        )}

        {servers.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-16 text-center">
            <div className="text-5xl mb-4">🖥️</div>
            <h3 className="text-lg font-bold text-slate-300 mb-2">No servers connected</h3>
            <p className="text-slate-500 text-sm mb-6">Connect your infra by installing the agent on your nodes.</p>
            <div className="inline-flex flex-col gap-2 text-left bg-slate-800/60 rounded-xl px-6 py-4 text-sm font-mono whitespace-pre overflow-x-auto max-w-full">
              <span className="text-slate-500"># 1. Install agent</span>
              <span className="text-green-400">pip install logify-agent</span>
              <span className="text-slate-500 mt-2"># 2. Add connection key</span>
              <span className="text-blue-400">logify auth add-key <span className="text-yellow-300">&lt;KEY&gt;</span></span>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/40 backdrop-blur-xl border border-blue-500/10 rounded-2xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-900/80 border-b border-slate-800">
                <tr className="text-slate-500 uppercase text-[10px] font-black tracking-widest">
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Node</th>
                  <th className="px-6 py-4 text-center">AI Key</th>
                  <th className="px-6 py-4">IP / Host</th>
                  <th className="px-6 py-4">Last Seen</th>
                  <th className="px-6 py-4 text-right pr-8">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {servers.map((server) => {
                  const status = getStatusStyle(server.last_seen);
                  const isEditing = editingServerId === server.id;
                  
                  return (
                    <tr key={server.id} className="hover:bg-blue-500/5 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${status.dot}`} />
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${status.badge}`}>
                            {status.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="font-bold text-blue-400">{server.server_name}</p>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1">
                          <span className="uppercase text-[9px] px-1 border border-slate-700 rounded text-slate-400">{server.os_type}</span>
                          {server.server_hostname}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-center">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input 
                                type="password" 
                                className="bg-black/50 border border-blue-500/30 rounded px-2 py-1 text-xs font-mono w-40 focus:outline-none focus:border-blue-500 transition-all"
                                placeholder="Paste API Key..."
                                value={aiKeyInput}
                                onChange={e => setAiKeyInput(e.target.value)}
                              />
                              <button 
                                onClick={() => updateAiKey(server.id)}
                                disabled={savingAi}
                                className="p-1 px-2 bg-blue-500 text-black rounded text-[10px] font-bold hover:bg-blue-400 transition-colors disabled:opacity-50"
                              >
                                {savingAi ? '...' : 'SAVE'}
                              </button>
                              <button onClick={() => setEditingServerId(null)} className="text-slate-500 hover:text-white text-xs">✕</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              {server._ai_key ? (
                                <div className="flex flex-col items-center">
                                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                                    {server._ai_key.server_id ? 'SERVER KEY' : 'USER DEFAULT'}
                                  </span>
                                  <code className="text-[9px] text-slate-600 font-mono">{maskKey(server._ai_key.key_value)}</code>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-700 italic">No AI configured</span>
                              )}
                              <button 
                                onClick={() => { setEditingServerId(server.id); setAiKeyInput(server._ai_key?.key_value || ''); }}
                                className="text-[10px] text-blue-400/40 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all font-bold"
                              >
                                {server._ai_key ? 'EDIT' : 'ADD'}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-[11px]">
                        <p className="text-slate-300">{server.server_ip || '—'}</p>
                        <p className="text-slate-600">ID: {server.id.slice(0, 8)}...</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-xs text-slate-400">{new Date(server.last_seen).toLocaleString()}</p>
                        <p className="text-[10px] text-slate-600 uppercase">Joined {new Date(server.first_registered).toLocaleDateString()}</p>
                      </td>
                      <td className="px-6 py-4 text-right pr-8 whitespace-nowrap">
                        <button
                          onClick={() => removeServer(server.id)}
                          className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded text-[10px] font-black text-red-500 transition-all opacity-0 group-hover:opacity-100"
                        >
                          DEREGISTER
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Connection Keys Section */}
        {connKeys.length > 0 && (
          <div className="mt-12">
            <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Infrastructure Gateways</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {connKeys.map(ck => (
                <div key={ck.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-blue-500/20 transition-all group">
                   <div className="flex justify-between items-start mb-3">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Gateway ID</span>
                        <code className="text-xs font-mono text-blue-300">{ck.id.slice(0, 13)}...</code>
                      </div>
                      <span className={`w-2 h-2 rounded-full ${ck.is_active ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-red-500'}`} />
                   </div>
                   <div className="space-y-2">
                    <div className="bg-black/30 rounded-lg p-3 border border-slate-800 group-hover:border-blue-500/10 transition-colors">
                      <p className="text-[9px] text-slate-600 uppercase font-black tracking-widest mb-1">Connection Key</p>
                      <code className="text-[11px] font-mono text-slate-400 break-all">{maskKey(ck.key_value)}</code>
                    </div>
                    <div className="flex justify-between items-end">
                      <p className="text-[10px] text-slate-500 italic">Max Capacity: {ck.max_servers} Nodes</p>
                      <p className="text-[9px] text-slate-700 uppercase font-black">Created {new Date(ck.created_at).toLocaleDateString()}</p>
                    </div>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Servers;
