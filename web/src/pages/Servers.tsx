import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import insforgeClient from '../config/insforge';
import { useAuth } from '../contexts/AuthContext';

interface Server {
  id: string;
  server_name: string;
  server_hostname: string;
  server_ip: string;
  os_type: string;
  last_seen: string;
  first_registered: string;
  is_active: boolean;
  metadata: any;
  connection_keys: {
    key_value: string;
  };
}

const Servers: React.FC = () => {
  const { user } = useAuth();
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchServers();
    
    // Set up real-time subscription
    const subscription = insforgeClient
      .channel('servers-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'servers' 
      }, (payload) => {
        console.log('Server change:', payload);
        fetchServers(); // Refresh on any change
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const fetchServers = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await insforgeClient
        .from('servers')
        .select(`
          *,
          connection_keys!inner(
            key_value,
            user_id
          )
        `)
        .eq('connection_keys.user_id', user.id)
        .order('last_seen', { ascending: false });
      
      if (error) throw error;
      setServers(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeServer = async (serverId: string) => {
    if (!confirm('Are you sure you want to remove this server?')) {
      return;
    }
    
    try {
      const { error } = await insforgeClient
        .from('servers')
        .delete()
        .eq('id', serverId);
      
      if (error) throw error;
      await fetchServers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getStatusColor = (lastSeen: string) => {
    const hoursSince = (Date.now() - new Date(lastSeen).getTime()) / (1000 * 60 * 60);
    if (hoursSince < 1) return 'text-green-400 bg-green-500/20 border-green-500/30';
    if (hoursSince < 24) return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
    return 'text-red-400 bg-red-500/20 border-red-500/30';
  };

  const getStatusText = (lastSeen: string) => {
    const hoursSince = (Date.now() - new Date(lastSeen).getTime()) / (1000 * 60 * 60);
    if (hoursSince < 1) return 'ONLINE';
    if (hoursSince < 24) return 'IDLE';
    return 'OFFLINE';
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
        <div className="mb-8">
          <h1 className="text-3xl font-black font-orbitron text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-blue-600">
            Servers
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Manage all servers connected to your account
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded text-red-400">
            {error}
          </div>
        )}

        <div className="bg-slate-900/40 backdrop-blur-xl border border-blue-500/10 rounded overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-900/80 border-b border-blue-500/10">
              <tr className="text-slate-400 uppercase text-xs font-black tracking-widest">
                <th className="px-6 py-4 text-left">STATUS</th>
                <th className="px-6 py-4 text-left">SERVER NAME</th>
                <th className="px-6 py-4 text-left">HOSTNAME</th>
                <th className="px-6 py-4 text-left">IP ADDRESS</th>
                <th className="px-6 py-4 text-left">OS</th>
                <th className="px-6 py-4 text-left">LAST SEEN</th>
                <th className="px-6 py-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {servers.map((server) => (
                <tr key={server.id} className="hover:bg-blue-500/5 transition-colors group">
                  <td className="px-6 py-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(server.last_seen)}`}>
                      {getStatusText(server.last_seen)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-blue-400">{server.server_name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-sm font-mono text-slate-300">{server.server_hostname}</code>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-sm font-mono text-slate-400">{server.server_ip || 'N/A'}</code>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-300 uppercase">{server.os_type}</span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-400">
                      {new Date(server.last_seen).toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-600">
                      Registered: {new Date(server.first_registered).toLocaleDateString()}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => removeServer(server.id)}
                      className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded text-xs font-bold text-red-400 transition-all opacity-0 group-hover:opacity-100"
                    >
                      REMOVE
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {servers.length === 0 && (
            <div className="text-center py-20">
              <p className="text-slate-500 mb-2">No servers connected yet</p>
              <p className="text-sm text-slate-600">
                Use <code className="px-2 py-1 bg-slate-800 rounded text-blue-400">logify auth add-key</code> on your servers
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Servers;
