import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Layout from '../components/Layout';
import Background3D from '../components/Background3D';
import TunnelMode from '../components/TunnelMode';
import insforgeClient from '../config/insforge';
import { useAuth } from '../contexts/AuthContext';

interface Log {
  id: string;
  source: string;
  level: string;
  message: string;
  timestamp: string;
  log_type?: string;
  log_category?: string;
  log_subcategory?: string;
  source_ip?: string;
  dest_ip?: string;
  event_id?: string;
  servers: {
    server_name: string;
    server_ip: string;
  };
}

interface Stats {
  logsPerSecond: number;
  errorRate: number;
  activeSources: number;
  totalServers: number;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate(); // Initialize useNavigate

  const [tunnelMode, setTunnelMode] = useState(false);
  const [search, setSearch] = useState('');
  const [logs, setLogs] = useState<Log[]>([]); // Changed to Log[]
  const [stats, setStats] = useState<Stats>({ // Changed to Stats interface
    logsPerSecond: 0,
    errorRate: 0,
    activeSources: 0,
    totalServers: 0
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalLogs, setTotalLogs] = useState(0);
  
  // Modal state
  const [selectedLog, setSelectedLog] = useState<Log | null>(null); // Changed to Log | null
  const [showLogModal, setShowLogModal] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    fetchRecentLogs();
    fetchStats();
    
    //TODO: Implement real-time subscriptions using insforge.realtime.subscribe()
    // const subscription = insforgeClient.realtime
    //   .subscribe('dashboard-logs')
    //   .then(() => {
    //     insforgeClient.realtime.on('INSERT', (payload) => {
    //       setLogs(prev => [payload.new as Log, ...prev].slice(0, 50));
    //     });
    //   });

    const logsInterval = setInterval(fetchRecentLogs, 5000); // Reduced from 2s to 5s for performance
    const statsInterval = setInterval(fetchStats, 10000); // Reduced from 5s to 10s

   return () => {
      // subscription?.unsubscribe();
      clearInterval(logsInterval);
      clearInterval(statsInterval);
    };
  }, [user, currentPage, pageSize]);

  const fetchRecentLogs = async () => {
    if (!user) return;
    
    try {
      // Get total count first
      const { count } = await insforgeClient.database
        .from('logs')
        .select('*', { count: 'exact', head: true });
      
      if (count) setTotalLogs(count);
      
      // Fetch paginated data
      const offset = (currentPage - 1) * pageSize;
      const { data } = await insforgeClient.database
        .from('logs')
        .select(`
          *,
          servers!inner(
            server_name,
            server_ip,
            connection_keys!inner(user_id)
          )
        `)
        .eq('servers.connection_keys.user_id', user.id)
        .order('timestamp', { ascending: false })
        .range(offset, offset + pageSize - 1);
      
      setLogs(data || []);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
  };

  const fetchStats = async () => {
    if (!user) return;
    
    try {
      // Get server count with proper join
      const { count: serverCount } = await insforgeClient.database
        .from('connection_keys')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      // Calculate stats from recent logs
      const recentLogs = logs.slice(0, 10);
      const errorCount = recentLogs.filter(l => l.level === 'ERROR').length;
      const errorRate = recentLogs.length > 0 ? errorCount / recentLogs.length : 0;
      
      setStats({
        logsPerSecond: recentLogs.length / 10,
        errorRate,
        activeSources: new Set(recentLogs.map(l => l.source)).size,
        totalServers: serverCount || 0
      });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(l => 
      l.message.toLowerCase().includes(search.toLowerCase()) || 
      l.source.toLowerCase().includes(search.toLowerCase()) ||
      l.level.toLowerCase().includes(search.toLowerCase())
    );
  }, [logs, search]);
  
  const totalPages = Math.ceil(totalLogs / pageSize);
  
  const handleLogClick = (log: Log) => {
    setSelectedLog(log);
    setShowLogModal(true);
  };

  if (tunnelMode) {
    return <TunnelMode logs={logs as any} onClose={() => setTunnelMode(false)} />;
  }

  return (
    <Layout>
      <div className="relative h-full overflow-hidden">
        {/* 3D Background */}
        <div className="absolute inset-0 z-0">
          <Canvas camera={{ position: [0, 0, 10], fov: 60 }}>
            <color attach="background" args={['#020617']} />
            <Background3D />
            <ambientLight intensity={0.3} />
          </Canvas>
        </div>

        {/* Content */}
        <div className="relative z-10 h-full overflow-auto p-4 sm:p-6 lg:p-8">
          {/* Top row: title + tunnel mode button */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-orbitron font-bold text-lg sm:text-xl text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Command Center</h2>
              <p className="text-slate-500 text-xs font-mono">Real-time log monitoring dashboard</p>
            </div>
            <button
              onClick={() => setTunnelMode(true)}
              className="px-3 sm:px-5 py-2 sm:py-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-xl font-bold text-purple-400 transition-all shadow-lg shadow-purple-500/10 flex items-center gap-2 text-xs sm:text-sm whitespace-nowrap"
            >
              🎮 <span className="hidden sm:inline">ENTER </span>TUNNEL MODE
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">
            {[
              { label: 'TOTAL LOGS', value: totalLogs.toLocaleString(), color: 'text-blue-400', glow: 'shadow-[0_0_20px_rgba(59,130,246,0.1)]', icon: '📊' },
              { label: 'ERROR RATE', value: `${(stats.errorRate * 100).toFixed(1)}%`, color: stats.errorRate > 0.1 ? 'text-red-400' : 'text-slate-400', glow: stats.errorRate > 0.1 ? 'shadow-[0_0_20px_rgba(239,68,68,0.2)]' : '', icon: '⚠️' },
              { label: 'ACTIVE SOURCES', value: stats.activeSources, color: 'text-emerald-400', glow: '', icon: '📊' },
              { label: 'SERVERS', value: stats.totalServers, color: 'text-slate-300', glow: '', icon: '🖥️' }
            ].map((stat, i) => (
              <div key={i} className={`p-6 bg-slate-900/60 backdrop-blur-lg border border-slate-700/50 rounded-xl ${stat.glow}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">{stat.label}</span>
                  <span className="text-2xl">{stat.icon}</span>
                </div>
                <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="🔍 Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
            />
          </div>

          {/* Table */}
          <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-800/80 border-b border-slate-700">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-mono text-xs text-slate-400">TIME</th>
                    <th className="px-4 py-3 font-mono text-xs text-slate-400">LEVEL</th>
                    <th className="px-4 py-3 font-mono text-xs text-slate-400">SRC IP</th>
                    <th className="px-4 py-3 font-mono text-xs text-slate-400">DST IP</th>
                    <th className="px-4 py-3 font-mono text-xs text-slate-400">EVENT ID</th>
                    <th className="px-4 py-3 font-mono text-xs text-slate-400">SOURCE</th>
                    <th className="px-4 py-3 font-mono text-xs text-slate-400">MESSAGE</th>
                    <th className="px-4 py-3 font-mono text-xs text-slate-400">SERVER</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log, idx) => (
                    <tr
                      key={log.id || idx}
                      onClick={() => handleLogClick(log)}
                      className="border-b border-slate-800/50 hover:bg-slate-800/50 transition-all cursor-pointer"
                    >
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          log.level === 'ERROR' ? 'bg-red-500/20 text-red-400' :
                          log.level === 'WARN' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {log.level}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-cyan-400/80">
                        {log.source_ip || <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-orange-400/80">
                        {log.dest_ip || <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-purple-400/80">
                        {log.event_id || <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-300 font-mono text-xs max-w-xs truncate">
                        {log.source}
                      </td>
                      <td className="px-4 py-3 text-slate-200 max-w-md truncate">
                        {log.message}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {log.servers?.server_name || 'Unknown'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="bg-slate-800/80 px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-slate-700">
              <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                <span className="text-slate-400 text-xs sm:text-sm">Entries:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 sm:px-3 py-1 bg-slate-900 border border-slate-700 rounded text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                  <option value={500}>500</option>
                </select>
                <span className="text-slate-500 text-xs">
                  {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, totalLogs)} of {totalLogs}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-2 sm:px-3 py-1 bg-slate-700 rounded text-white text-xs sm:text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-600">««</button>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-2 sm:px-3 py-1 bg-slate-700 rounded text-white text-xs sm:text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-600">‹</button>
                <span className="px-3 py-1 text-slate-300 text-xs sm:text-sm whitespace-nowrap">{currentPage}/{totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-2 sm:px-3 py-1 bg-slate-700 rounded text-white text-xs sm:text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-600">›</button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="px-2 sm:px-3 py-1 bg-slate-700 rounded text-white text-xs sm:text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-600">»»</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Log Detail Modal */}
      {showLogModal && selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowLogModal(false)}>
          <div className="bg-slate-900 border-2 border-cyan-500/50 rounded-xl p-6 max-w-4xl w-full max-h-[85vh] overflow-y-auto shadow-2xl shadow-cyan-500/20" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-cyan-400">Log Details</h2>
              <button onClick={() => setShowLogModal(false)} className="text-slate-400 hover:text-white text-3xl leading-none transition-colors">×</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-2">Timestamp</label>
                <p className="text-white bg-slate-800 px-4 py-3 rounded font-mono text-sm">{new Date(selectedLog.timestamp).toLocaleString()}</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-2">Source IP</label>
                  <p className="text-cyan-400 bg-slate-800 px-4 py-3 rounded font-mono text-sm">
                    {selectedLog.source_ip || <span className="text-slate-500">—</span>}
                  </p>
                </div>
                <div>
                  <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-2">Dest IP</label>
                  <p className="text-orange-400 bg-slate-800 px-4 py-3 rounded font-mono text-sm">
                    {selectedLog.dest_ip || <span className="text-slate-500">—</span>}
                  </p>
                </div>
                <div>
                  <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-2">Event ID</label>
                  <p className="text-purple-400 bg-slate-800 px-4 py-3 rounded font-mono text-sm">
                    {selectedLog.event_id || <span className="text-slate-500">—</span>}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-2">Level</label>
                <span className={`inline-block px-4 py-2 rounded font-bold ${
                  selectedLog.level === 'ERROR' ? 'bg-red-500/20 text-red-400' :
                  selectedLog.level === 'WARN' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {selectedLog.level}
                </span>
              </div>

              <div>
                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-2">Source</label>
                <p className="text-white bg-slate-800 px-4 py-3 rounded font-mono text-sm break-all">{selectedLog.source}</p>
              </div>

              <div>
                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-2">Server</label>
                <p className="text-white bg-slate-800 px-4 py-3 rounded">
                  {selectedLog.servers?.server_name || 'Unknown'} ({selectedLog.servers?.server_ip || 'N/A'})
                </p>
              </div>

              <div>
                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-2">Message</label>
                <pre className="text-white bg-slate-800 px-4 py-4 rounded font-mono text-sm whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
{selectedLog.message}
                </pre>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowLogModal(false)}
                className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 rounded text-white font-semibold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Dashboard;
