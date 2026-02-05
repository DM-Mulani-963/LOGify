import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import insforgeClient from '../config/insforge';
import { useAuth } from '../contexts/AuthContext';

interface ConnectionKey {
  id: string;
  key_value: string;
  created_at: string;
  expires_at: string | null;
  max_servers: number;
  is_active: boolean;
  server_count?: number;
}

const ConnectionKeys: React.FC = () => {
  const { user } = useAuth();
  const [keys, setKeys] = useState<ConnectionKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    fetchKeys();
  }, [user]);

  const fetchKeys = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await insforgeClient.database
        .from('connection_keys')
        .select(`
          *,
          servers(count)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform data to include server count
      const keysWithCount = data?.map(key => ({
        ...key,
        server_count: key.servers?.[0]?.count || 0
      })) || [];
      
      setKeys(keysWithCount);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateKey = async () => {
    if (!user) return;
    
    try {
      // Generate secure random key (in production, this should be a JWT or similar)
      const keyValue = `logify_${Math.random().toString(36).substr(2, 9)}_${Date.now().toString(36)}`;
      
      const { error } = await insforgeClient.database
        .from('connection_keys')
        .insert({
          user_id: user.id,
          key_value: keyValue,
          max_servers: 5,
          is_active: true
        });
      
      if (error) throw error;
      
      await fetchKeys();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const revokeKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this key? All servers using it will lose access.')) {
      return;
    }
    
    try {
      const { error } = await insforgeClient.database
        .from('connection_keys')
        .update({ is_active: false })
        .eq('id', keyId);
      
      if (error) throw error;
      
      await fetchKeys();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-blue-400 animate-pulse">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black font-orbitron text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-blue-600">
              Connection Keys
            </h1>
            <p className="text-sm text-slate-400 mt-2">
              Manage authentication keys for your CLI agents
            </p>
          </div>
          <button
            onClick={generateKey}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded font-bold text-sm tracking-wider transition-all shadow-lg shadow-blue-500/20"
          >
            + GENERATE NEW KEY
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {keys.map((key) => (
            <div
              key={key.id}
              className={`bg-slate-900/60 backdrop-blur-md border rounded-lg p-6 transition-all ${
                key.is_active ? 'border-blue-500/20 hover:border-blue-500/40' : 'border-red-500/20 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                    key.is_active ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {key.is_active ? 'ACTIVE' : 'REVOKED'}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Created</p>
                  <p className="text-xs text-slate-300 font-mono">
                    {new Date(key.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-400 mb-2">KEY VALUE</label>
                <div className="flex items-center gap-2">
                  <code className="flex-grow bg-black/40 border border-blue-500/20 rounded py-2 px-3 text-xs font-mono text-blue-400 truncate">
                    {key.key_value}
                  </code>
                  <button
                    onClick={() => copyKey(key.key_value)}
                    className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded text-xs font-bold transition-all"
                  >
                    {copiedKey === key.key_value ? '✓' : '📋'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-slate-500">Servers</p>
                  <p className="text-lg font-bold text-blue-400">
                    {key.server_count || 0} / {key.max_servers}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Expires</p>
                  <p className="text-sm text-slate-300">
                    {key.expires_at ? new Date(key.expires_at).toLocaleDateString() : 'Never'}
                  </p>
                </div>
              </div>

              {key.is_active && (
                <button
                  onClick={() => revokeKey(key.id)}
                  className="w-full px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded text-xs font-bold text-red-400 transition-all"
                >
                  REVOKE KEY
                </button>
              )}
            </div>
          ))}
        </div>

        {keys.length === 0 && (
          <div className="text-center py-20">
            <p className="text-slate-500 mb-4">No connection keys yet</p>
            <p className="text-sm text-slate-600">Generate your first key to start connecting servers</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ConnectionKeys;
