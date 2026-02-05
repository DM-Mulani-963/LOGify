import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import insforgeClient from '../config/insforge';
import { useAuth } from '../contexts/AuthContext';

interface Log {
  id: string;
  source: string;
  level: string;
  message: string;
  timestamp: string;
  synced_at: string;
  meta: any;
  log_type: string;
  servers: {
    server_name: string;
    server_ip: string;
  };
}

const Logs: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    level: 'all',
    logType: 'all',
    search: ''
  });

  useEffect(() => {
    fetchLogs();
    
    // Real-time subscription
    const subscription = insforgeClient
      .channel('logs-changes')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'logs' 
      }, (payload) => {
        console.log('New log:', payload);
        setLogs(prev => [payload.new as Log, ...prev].slice(0, 100));
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, filters]);

  const fetchLogs = async () => {
    if (!user) return;
    
    try {
      let query = insforgeClient
        .from('logs')
        .select(`
          *,
          servers!inner(
            server_name,
            server_ip,
            connection_keys!inner(
              user_id
            )
          )
        `)
        .eq('servers.connection_keys.user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(100);
      
      if (filters.level !== 'all') {
        query = query.eq('level', filters.level.toUpperCase());
      }
      
      if (filters.logType !== 'all') {
        query = query.eq('log_type', filters.logType);
      }
      
      if (filters.search) {
        query = query.ilike('message', `%${filters.search}%`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setLogs(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = (format: 'json' | 'csv') => {
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logs-${Date.now()}.json`;
      a.click();
    } else {
      // CSV export
      const headers = ['Timestamp', 'Server', 'Level', 'Type', 'Source', 'Message'];
      const rows = logs.map(log => [
        log.timestamp,
        log.servers.server_name,
        log.level,
        log.log_type,
        log.source,
        log.message.replace(/,/g, ';')
      ]);
      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logs-${Date.now()}.csv`;
      a.click();
    }
  };

  const getLevelColor = (level: string) => {
    switch (level.toUpperCase()) {
      case 'ERROR': return 'bg-red-500/20 text-red-500 border-red-500/30';
      case 'WARN': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      case 'INFO': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black font-orbitron text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-blue-600">
              Logs
            </h1>
            <p className="text-sm text-slate-400 mt-2">
              Real-time log stream from all connected servers
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => exportLogs('json')}
              className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded text-xs font-bold text-blue-400 transition-all"
            >
              📥 JSON
            </button>
            <button
              onClick={() => exportLogs('csv')}
              className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded text-xs font-bold text-blue-400 transition-all"
            >
              📥 CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4 bg-slate-900/40 backdrop-blur-xl border border-blue-500/10 rounded p-4">
          <input
            type="text"
            placeholder="Search logs..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
            className="flex-grow bg-black/40 border border-blue-500/20 rounded py-2 px-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
          />
          <select
            value={filters.level}
            onChange={(e) => setFilters({ ...filters, level: e.target.value })}
            className="bg-black/40 border border-blue-500/20 rounded py-2 px-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
          >
            <option value="all">All Levels</option>
            <option value="error">ERROR</option>
            <option value="warn">WARN</option>
            <option value="info">INFO</option>
            <option value="debug">DEBUG</option>
          </select>
          <select
            value={filters.logType}
            onChange={(e) => setFilters({ ...filters, logType: e.target.value })}
            className="bg-black/40 border border-blue-500/20 rounded py-2 px-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
          >
            <option value="all">All Types</option>
            <option value="System">System</option>
            <option value="Security">Security</option>
            <option value="Web">Web</option>
            <option value="Database">Database</option>
          </select>
          <button
            onClick={fetchLogs}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded font-bold text-sm tracking-wider transition-all"
          >
            APPLY
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded text-red-400">
            {error}
          </div>
        )}

        {/* Logs Table */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-blue-500/10 rounded overflow-hidden">
          <div className="overflow-auto max-h-[calc(100vh-350px)]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-900/95 z-10 backdrop-blur border-b border-blue-500/10">
                <tr className="text-slate-400 uppercase text-xs font-black tracking-widest">
                  <th className="px-4 py-3 text-left">TIMESTAMP</th>
                  <th className="px-4 py-3 text-left">SERVER</th>
                  <th className="px-4 py-3 text-left">IP ADDRESS</th>
                  <th className="px-4 py-3 text-left">LEVEL</th>
                  <th className="px-4 py-3 text-left">TYPE</th>
                  <th className="px-4 py-3 text-left">SOURCE</th>
                  <th className="px-4 py-3 text-left">MESSAGE</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-800/50 hover:bg-blue-500/5 transition-colors group">
                    <td className="px-4 py-2 text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('en-US', { 
                        hour12: false,
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-blue-400 font-bold">{log.servers.server_name}</span>
                    </td>
                    <td className="px-4 py-2">
                      <code className="text-slate-500 text-[10px]">{log.servers.server_ip || 'N/A'}</code>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded-sm text-[9px] font-black border ${getLevelColor(log.level)}`}>
                        {log.level}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-400">{log.log_type}</td>
                    <td className="px-4 py-2 text-slate-400 uppercase">{log.source}</td>
                    <td className="px-4 py-2 text-slate-300 group-hover:text-white transition-colors">
                      {log.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {loading && (
            <div className="text-center py-10">
              <div className="text-blue-400 animate-pulse">Loading logs...</div>
            </div>
          )}

          {!loading && logs.length === 0 && (
            <div className="text-center py-20">
              <p className="text-slate-500 mb-2">No logs found</p>
              <p className="text-sm text-slate-600">
                Use <code className="px-2 py-1 bg-slate-800 rounded text-blue-400">logify online</code> to sync logs
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Logs;
