import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import insforgeClient from '../config/insforge';
import { useAuth } from '../contexts/AuthContext';

interface Log {
  id: string;
  source: string;
  level: string;
  message: string;
  timestamp: string;
  log_type: string;
  log_category?: string;
  log_subcategory?: string;
  privacy_level?: string;
  source_ip?: string;
  dest_ip?: string;
  event_id?: string;
  servers: { server_name: string; server_ip: string };
}

const LEVEL_STYLE: Record<string, string> = {
  ERROR:    'bg-red-500/20 text-red-400 border-red-500/30',
  WARN:     'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  INFO:     'bg-blue-500/20 text-blue-400 border-blue-500/30',
  DEBUG:    'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const TYPE_STYLE: Record<string, string> = {
  Security:      'bg-red-900/30 text-red-300 border-red-500/20',
  Administrator: 'bg-purple-900/30 text-purple-300 border-purple-500/20',
  'User Activity':'bg-green-900/30 text-green-300 border-green-500/20',
  System:        'bg-slate-800/60 text-slate-400 border-slate-600/20',
  'Web Server':  'bg-orange-900/30 text-orange-300 border-orange-500/20',
  Database:      'bg-cyan-900/30 text-cyan-300 border-cyan-500/20',
};

const SUBCATS: Record<string, string[]> = {
  Security:      ['Login Attempts', 'Failed Authentication', 'Firewall', 'Policy Violations'],
  Administrator: ['Web Server', 'Database', 'Root Actions', 'Configuration Changes'],
  'User Activity': ['Shell History', 'Browser History', 'File Access', 'Session'],
  System:        ['OS Events', 'Kernel', 'Startup/Shutdown', 'Hardware'],
};

const Logs: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [selected, setSelected] = useState<Log | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    level: 'all', logCategory: 'all', logSubcategory: 'all', search: '',
  });

  // AI Panel
  const [showAI, setShowAI] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiLogCount, setAiLogCount] = useState(300);

  const aiInputRef = useRef<HTMLInputElement>(null);

  const SUGGESTED = [
    'Are there any active threats?',
    'List all failed login attempts',
    'Show suspicious IPs',
    'Any sign of malware or ransomware?',
    'What are the most common errors?',
    'Any privilege escalation attempts?',
  ];

  useEffect(() => {
    fetchLogs();
  }, [user, filters, page, pageSize]);

  const fetchLogs = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Count
      const { count } = await insforgeClient.database
        .from('logs')
        .select('*', { count: 'exact', head: true });
      if (count) setTotal(count);

      const offset = (page - 1) * pageSize;
      let query = insforgeClient.database
        .from('logs')
        .select(`
          *,
          servers!inner(server_name, server_ip, connection_keys!inner(user_id))
        `)
        .eq('servers.connection_keys.user_id', user.id)
        .order('timestamp', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (filters.level !== 'all') query = query.eq('level', filters.level.toUpperCase());
      if (filters.logCategory !== 'all') query = query.eq('log_category', filters.logCategory);
      if (filters.logSubcategory !== 'all') query = query.eq('log_subcategory', filters.logSubcategory);
      if (filters.search) query = query.ilike('message', `%${filters.search}%`);

      const { data, error } = await query;
      if (error) throw error;
      setLogs((data || []) as unknown as Log[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAsk = async () => {
    if (!aiQuestion.trim()) return;
    setAiLoading(true);
    setAiError('');
    setAiResponse('');
    try {
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: aiQuestion, logs: logs.slice(0, aiLogCount) }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const d = await res.json();
      setAiResponse(d.response || d.answer || JSON.stringify(d));
    } catch (e: any) {
      setAiError(e.message || 'AI query failed. Make sure logify web server is running.');
    } finally {
      setAiLoading(false);
    }
  };

  const exportLogs = async (fmt: 'json' | 'csv') => {
    if (!user) return;
    setError('');
    // Show brief export notice
    const allLogs: Log[] = [];
    let offset = 0;
    const batch = 1000;
    // Fetch all pages until we have everything
    while (true) {
      const { data, error: err } = await insforgeClient.database
        .from('logs')
        .select(`*, servers!inner(server_name, server_ip, connection_keys!inner(user_id))`)
        .eq('servers.connection_keys.user_id', user.id)
        .order('timestamp', { ascending: false })
        .range(offset, offset + batch - 1);
      if (err || !data || data.length === 0) break;
      allLogs.push(...(data as unknown as Log[]));
      if (data.length < batch) break;
      offset += batch;
    }

    if (fmt === 'json') {
      const b = new Blob([JSON.stringify(allLogs, null, 2)], { type: 'application/json' });
      Object.assign(document.createElement('a'), { href: URL.createObjectURL(b), download: `logs-all-${Date.now()}.json` }).click();
    } else {
      const cols = ['timestamp','server','server_ip','level','type','category','src_ip','dst_ip','event_id','source','message'];
      const rows = allLogs.map(l => [
        l.timestamp, l.servers?.server_name, l.servers?.server_ip, l.level,
        l.log_type, l.log_category||'', l.source_ip||'', l.dest_ip||'', l.event_id||'',
        l.source, `"${(l.message||'').replace(/"/g,'""')}"`
      ].join(','));
      const b = new Blob([[cols.join(','), ...rows].join('\n')], { type: 'text/csv' });
      Object.assign(document.createElement('a'), { href: URL.createObjectURL(b), download: `logs-all-${Date.now()}.csv` }).click();
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <Layout>
      <div className="flex flex-col h-full overflow-hidden">

        {/* ── AI Panel (slide-down) ── */}
        {showAI && (
          <div className="flex-shrink-0 bg-gradient-to-r from-purple-950/60 to-blue-950/60 border-b border-purple-500/20 backdrop-blur-xl p-4">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">✨</span>
                  <h3 className="font-bold text-purple-300 font-orbitron text-sm">AI Log Analyst</h3>
                </div>

                {/* Log count selector */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">Analyze last</span>
                  <select
                    value={aiLogCount}
                    onChange={e => setAiLogCount(Number(e.target.value))}
                    className="bg-black/40 border border-purple-500/30 rounded px-2 py-1 text-xs text-purple-300 focus:outline-none"
                  >
                    <option value={50}>50 logs</option>
                    <option value={100}>100 logs</option>
                    <option value={200}>200 logs</option>
                    <option value={300}>300 logs</option>
                    <option value={500}>500 logs</option>
                    <option value={1000}>1000 logs</option>
                  </select>
                  <button onClick={() => setShowAI(false)} className="text-slate-500 hover:text-white text-xl">×</button>
                </div>
              </div>

              {/* Suggestions */}
              <div className="flex flex-wrap gap-2 mb-3">
                {SUGGESTED.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => { setAiQuestion(q); setTimeout(() => aiInputRef.current?.focus(), 50); }}
                    className="text-xs bg-purple-900/30 hover:bg-purple-900/50 border border-purple-500/20 text-purple-300 px-3 py-1 rounded-full transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <input
                  ref={aiInputRef}
                  type="text"
                  value={aiQuestion}
                  onChange={e => setAiQuestion(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAsk()}
                  placeholder="Ask AI about your logs..."
                  className="flex-1 bg-black/40 border border-purple-500/30 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={handleAsk}
                  disabled={aiLoading || !aiQuestion.trim()}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-bold text-sm text-white transition-colors flex items-center gap-2"
                >
                  {aiLoading ? <span className="animate-spin">⟳</span> : '→'}
                  {aiLoading ? 'Thinking…' : 'Ask'}
                </button>
              </div>

              {/* Response */}
              {aiError && (
                <div className="mt-3 bg-red-900/20 border border-red-500/30 rounded p-3 text-sm text-red-400">
                  {aiError}
                  <p className="text-xs text-slate-500 mt-1">Configure AI: <code className="bg-black/40 px-2 rounded text-blue-400">logify set-ai-api gemini YOUR_KEY</code></p>
                </div>
              )}
              {aiResponse && (
                <div className="mt-3 bg-black/30 border border-purple-500/20 rounded-lg p-4 text-sm text-slate-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  <span className="text-purple-400 font-semibold">AI: </span>{aiResponse}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Top bar ── */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-slate-800">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black font-orbitron text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-blue-600">Logs</h1>
              <p className="text-xs text-slate-500 mt-0.5">{total.toLocaleString()} total entries from all servers</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => { setShowAI(v => !v); setTimeout(() => aiInputRef.current?.focus(), 100); }}
                className={`px-4 py-2 border rounded text-xs font-bold transition-all ${showAI ? 'bg-purple-600 border-purple-500 text-white' : 'bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20'}`}
              >
                ✨ AI Assistant
              </button>
              <button onClick={() => exportLogs('csv')} className="px-4 py-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded text-xs font-bold text-green-400 transition-all">📥 CSV</button>
              <button onClick={() => exportLogs('json')} className="px-4 py-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded text-xs font-bold text-green-400 transition-all">📥 JSON</button>
            </div>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="flex-shrink-0 px-6 py-3 bg-slate-900/40 border-b border-slate-800 flex flex-wrap gap-2 items-center">
          <input
            type="text"
            placeholder="🔍 Search message..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && fetchLogs()}
            className="bg-black/40 border border-blue-500/20 rounded py-1.5 px-3 text-xs focus:outline-none focus:border-blue-400 text-slate-200 w-48"
          />
          <select value={filters.level} onChange={e => setFilters(f => ({ ...f, level: e.target.value }))}
            className="bg-black/40 border border-blue-500/20 rounded py-1.5 px-2 text-xs focus:outline-none text-slate-200">
            <option value="all">All Levels</option>
            <option value="error">ERROR</option>
            <option value="warn">WARN</option>
            <option value="info">INFO</option>
            <option value="debug">DEBUG</option>
          </select>
          <select value={filters.logCategory} onChange={e => setFilters(f => ({ ...f, logCategory: e.target.value, logSubcategory: 'all' }))}
            className="bg-black/40 border border-blue-500/20 rounded py-1.5 px-2 text-xs focus:outline-none text-slate-200">
            <option value="all">All Categories</option>
            <option value="System">System</option>
            <option value="Security">Security</option>
            <option value="Administrator">Administrator</option>
            <option value="User Activity">User Activity</option>
          </select>
          {filters.logCategory !== 'all' && SUBCATS[filters.logCategory] && (
            <select value={filters.logSubcategory} onChange={e => setFilters(f => ({ ...f, logSubcategory: e.target.value }))}
              className="bg-black/40 border border-blue-500/20 rounded py-1.5 px-2 text-xs focus:outline-none text-slate-200">
              <option value="all">All Subcategories</option>
              {SUBCATS[filters.logCategory].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <button onClick={() => { setPage(1); fetchLogs(); }}
            className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 rounded text-xs font-bold text-white transition-all">
            APPLY
          </button>
          <button onClick={() => { setFilters({ level:'all', logCategory:'all', logSubcategory:'all', search:'' }); setPage(1); }}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-400 transition-all">
            RESET
          </button>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] text-slate-500">Per page:</span>
            {[50,100,200,500].map(n => (
              <button key={n} onClick={() => { setPageSize(n); setPage(1); }}
                className={`w-10 py-1 rounded text-[10px] font-mono transition-all ${pageSize === n ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* ── Table + Detail split view ── */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* Table */}
          <div className={`flex-1 overflow-auto ${selected ? 'hidden lg:block' : ''}`}>
            {error && <div className="m-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">{error}</div>}
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10 border-b border-slate-700">
                <tr className="text-left text-[10px] font-mono text-slate-500 uppercase">
                  <th className="px-3 py-2.5">Time</th>
                  <th className="px-3 py-2.5">Level</th>
                  <th className="px-3 py-2.5">Category</th>
                  <th className="px-3 py-2.5">Subcategory</th>
                  <th className="px-3 py-2.5">SRC IP</th>
                  <th className="px-3 py-2.5">DST IP</th>
                  <th className="px-3 py-2.5">Event ID</th>
                  <th className="px-3 py-2.5">Server</th>
                  <th className="px-3 py-2.5">Source File</th>
                  <th className="px-3 py-2.5">Message</th>
                </tr>
              </thead>
              <tbody className="font-mono divide-y divide-slate-800/40">
                {loading ? (
                  <tr><td colSpan={11} className="text-center py-16 text-blue-400 animate-pulse">Loading logs…</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={11} className="text-center py-16 text-slate-500">No logs found matching filters</td></tr>
                ) : (
                  logs.map(log => (
                    <tr
                      key={log.id}
                      onClick={() => setSelected(log)}
                      className={`hover:bg-blue-500/5 transition-colors cursor-pointer ${selected?.id === log.id ? 'bg-blue-500/10' : ''}`}
                    >
                      <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('en-IN', { hour12: false, dateStyle: 'short', timeStyle: 'medium' })}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded border text-[9px] font-black ${LEVEL_STYLE[log.level] || LEVEL_STYLE.INFO}`}>{log.level}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded border text-[9px] ${TYPE_STYLE[log.log_category || log.log_type] || TYPE_STYLE.System}`}>
                          {log.log_category || log.log_type || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {log.log_subcategory
                          ? <span className="px-1.5 py-0.5 rounded border text-[9px] bg-slate-700/40 text-slate-400 border-slate-600/30">{log.log_subcategory}</span>
                          : <span className="text-slate-700">—</span>
                        }
                      </td>
                      <td className="px-3 py-2 text-cyan-400/80">{log.source_ip || <span className="text-slate-700">—</span>}</td>
                      <td className="px-3 py-2 text-orange-400/80">{log.dest_ip || <span className="text-slate-700">—</span>}</td>
                      <td className="px-3 py-2 text-purple-400/80">{log.event_id || <span className="text-slate-700">—</span>}</td>
                      <td className="px-3 py-2">
                        <span className="text-blue-400 font-semibold">{log.servers?.server_name}</span>
                        <span className="text-slate-600 block text-[9px]">{log.servers?.server_ip}</span>
                      </td>
                      <td className="px-3 py-2 text-slate-500 max-w-[120px] truncate">{log.source?.split('/').pop()}</td>
                      <td className="px-3 py-2 text-slate-300 max-w-xs truncate">{log.message}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Detail Panel */}
          {selected && (
            <div className="w-full lg:w-[420px] flex-shrink-0 border-l border-slate-700 bg-slate-900/80 backdrop-blur flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
                <h3 className="font-bold text-sm text-slate-200">Log Detail</h3>
                <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-white text-xl leading-none">×</button>
              </div>
              <div className="overflow-y-auto p-5 space-y-4 text-sm flex-1">
                {/* Time + Level */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">Timestamp</label>
                    <p className="text-slate-300 font-mono text-xs">{new Date(selected.timestamp).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">Level</label>
                    <span className={`px-2 py-0.5 rounded border text-xs font-black ${LEVEL_STYLE[selected.level] || LEVEL_STYLE.INFO}`}>{selected.level}</span>
                  </div>
                </div>

                {/* Type + Category */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">Type</label>
                    <span className={`px-2 py-0.5 rounded border text-xs ${TYPE_STYLE[selected.log_type] || TYPE_STYLE.System}`}>{selected.log_type || '—'}</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">Category</label>
                    <span className={`px-2 py-0.5 rounded border text-xs ${TYPE_STYLE[selected.log_category || ''] || TYPE_STYLE.System}`}>{selected.log_category || '—'}</span>
                  </div>
                </div>

                {/* 3 network fields */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">Src IP</label>
                    <p className="text-cyan-400 font-mono text-xs">{selected.source_ip || '—'}</p>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">Dst IP</label>
                    <p className="text-orange-400 font-mono text-xs">{selected.dest_ip || '—'}</p>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">Event ID</label>
                    <p className="text-purple-400 font-mono text-xs">{selected.event_id || '—'}</p>
                  </div>
                </div>

                {/* Server */}
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">Server</label>
                  <p className="text-blue-400 font-semibold">{selected.servers?.server_name} <span className="text-slate-500 font-normal text-xs">({selected.servers?.server_ip})</span></p>
                </div>

                {/* Source */}
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">Source File</label>
                  <code className="text-slate-400 text-xs bg-slate-800/60 rounded px-3 py-2 block break-all">{selected.source}</code>
                </div>

                {/* Subcategory + Privacy */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">Subcategory</label>
                    <p className="text-slate-400 text-xs">{selected.log_subcategory || '—'}</p>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">Privacy</label>
                    <p className="text-slate-400 text-xs">{selected.privacy_level || '—'}</p>
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">Message</label>
                  <pre className="text-slate-200 text-xs bg-slate-800/60 rounded p-3 whitespace-pre-wrap break-words max-h-60 overflow-y-auto leading-relaxed">{selected.message}</pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Pagination ── */}
        <div className="flex-shrink-0 px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between flex-wrap gap-3">
          <span className="text-xs text-slate-500">
            {((page-1)*pageSize)+1}–{Math.min(page*pageSize, total)} of {total.toLocaleString()} logs
          </span>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setPage(1)} disabled={page===1} className="px-2.5 py-1 bg-slate-800 rounded text-xs disabled:opacity-30 hover:bg-slate-700">««</button>
            <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="px-2.5 py-1 bg-slate-800 rounded text-xs disabled:opacity-30 hover:bg-slate-700">‹</button>
            <span className="text-xs text-slate-400 px-2">{page}/{totalPages||1}</span>
            <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page>=totalPages} className="px-2.5 py-1 bg-slate-800 rounded text-xs disabled:opacity-30 hover:bg-slate-700">›</button>
            <button onClick={() => setPage(totalPages)} disabled={page>=totalPages} className="px-2.5 py-1 bg-slate-800 rounded text-xs disabled:opacity-30 hover:bg-slate-700">»»</button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Logs;
