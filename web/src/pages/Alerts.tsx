import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import insforgeClient from '../config/insforge';
import { useAuth } from '../contexts/AuthContext';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface AlertEntry {
  id: string;
  threat_type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  source_ip: string | null;
  log_source: string | null;
  recommendation: string;
  created_at: string;
  resolved: boolean;
  servers?: { server_name: string; server_ip: string };
}

const SEVERITY_CONFIG = {
  CRITICAL: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', icon: '🚨', glow: 'shadow-red-500/20' },
  HIGH:     { color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30', icon: '⚠️', glow: 'shadow-orange-500/20' },
  MEDIUM:   { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30', icon: '⚡', glow: 'shadow-yellow-500/20' },
  LOW:      { color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30', icon: 'ℹ️', glow: 'shadow-cyan-500/20' },
};

const Alerts: React.FC = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<AlertEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('all');
  const [showResolved, setShowResolved] = useState(false);
  const [selected, setSelected] = useState<AlertEntry | null>(null);

  // AI state
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000);
    return () => clearInterval(interval);
  }, [user, showResolved]);

  useEffect(() => {
    // Reset AI insight when selection changes
    setAiInsight(null);
    setAiError('');
  }, [selected]);

  const fetchAlerts = async () => {
    if (!user) return;
    try {
      let query = insforgeClient.database
        .from('alerts')
        .select(`*, servers(server_name, server_ip)`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200);

      if (!showResolved) query = query.eq('resolved', false);

      const { data, error } = await query;
      if (error) throw error;
      setAlerts(data || []);
    } catch (err: any) {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const resolveAlert = async (id: string) => {
    try {
      await insforgeClient.database
        .from('alerts')
        .update({ resolved: true })
        .eq('id', id);
      setAlerts(prev => prev.filter(a => a.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch {}
  };

  const getAiSecurityAnalysis = async () => {
    if (!selected || !user) return;
    setLoadingAi(true);
    setAiError('');
    try {
      // 1. Fetch user's Gemini key from api_keys table
      const { data: keys, error: keyErr } = await insforgeClient.database
        .from('api_keys')
        .select('key_value')
        .eq('user_id', user.id)
        .eq('provider', 'gemini')
        .limit(1);

      if (keyErr) throw keyErr;
      if (!keys || keys.length === 0) {
        setAiError('Gemini API key not found. Please add it in the Servers tab.');
        return;
      }

      const apiKey = keys[0].key_value;
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `
        You are an expert cybersecurity analyst at LOGify. 
        Analyze this security alert and provide:
        1. Executive summary of the threat.
        2. Technical breakdown of what happened.
        3. 3-step immediate mitigation plan.
        
        Keep it concise and professional.
        
        ALERT DATA:
        Type: ${selected.threat_type}
        Severity: ${selected.severity}
        Description: ${selected.description}
        Source IP: ${selected.source_ip || 'N/A'}
        Log Source: ${selected.log_source || 'N/A'}
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      setAiInsight(response.text());
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'AI analysis failed');
    } finally {
      setLoadingAi(false);
    }
  };

  const filtered = alerts.filter(a => filter === 'all' || a.severity === filter);

  const counts = {
    CRITICAL: alerts.filter(a => a.severity === 'CRITICAL').length,
    HIGH:     alerts.filter(a => a.severity === 'HIGH').length,
    MEDIUM:   alerts.filter(a => a.severity === 'MEDIUM').length,
    LOW:      alerts.filter(a => a.severity === 'LOW').length,
  };

  return (
    <Layout>
      <div className="p-6 h-full flex flex-col gap-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black font-orbitron text-transparent bg-clip-text bg-gradient-to-br from-red-400 to-orange-500">
              Security Alerts
            </h1>
            <p className="text-sm text-slate-400 mt-1">Real-time threat detections from automated log analysis</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showResolved}
              onChange={e => setShowResolved(e.target.checked)}
              className="w-4 h-4 accent-blue-500"
            />
            Show resolved history
          </label>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {(['CRITICAL','HIGH','MEDIUM','LOW'] as const).map(sev => {
            const cfg = SEVERITY_CONFIG[sev];
            return (
              <button
                key={sev}
                onClick={() => setFilter(filter === sev ? 'all' : sev)}
                className={`p-4 rounded-xl border backdrop-blur-sm flex items-center gap-3 transition-all shadow-lg ${cfg.bg} ${cfg.glow} ${filter === sev ? 'ring-2 ring-offset-1 ring-offset-slate-950 ring-current scale-105' : 'hover:scale-102 hover:bg-slate-800/40'}`}
              >
                <span className="text-2xl">{cfg.icon}</span>
                <div className="text-left">
                  <p className={`text-xl font-black ${cfg.color}`}>{counts[sev]}</p>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{sev}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Content Container */}
        <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
          {/* List Section */}
          <div className="flex-1 bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
            <div className="px-5 py-3 border-b border-slate-700/50 flex items-center justify-between bg-slate-800/40">
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                QUEUE: {filtered.length} ACTIVE THREATS
              </span>
              {filter !== 'all' && (
                <button onClick={() => setFilter('all')} className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-300 hover:text-white transition-colors">
                  RESET FILTER
                </button>
              )}
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-slate-800/40 custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center py-20 text-blue-400 animate-pulse font-mono text-sm tracking-widest">SCANNIG INCIDENTS...</div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 gap-4">
                  <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/20">
                    <span className="text-3xl text-blue-400">🛡️</span>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-300 font-bold">Perimeter Secure</p>
                    <p className="text-slate-500 text-xs mt-1 max-w-[240px]">No anomalies detected in the current monitoring cycle.</p>
                  </div>
                </div>
              ) : (
                filtered.map(alert => {
                  const cfg = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.LOW;
                  return (
                    <div
                      key={alert.id}
                      onClick={() => setSelected(alert)}
                      className={`px-5 py-4 cursor-pointer transition-all hover:bg-blue-500/5 ${selected?.id === alert.id ? 'bg-blue-500/10 border-l-2 border-l-blue-400' : ''}`}
                    >
                      <div className="flex items-start gap-4">
                        <span className="text-xl mt-1">{cfg.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${cfg.bg} ${cfg.color}`}>
                              {alert.severity}
                            </span>
                            <span className="font-bold text-sm text-slate-200 truncate">{alert.threat_type}</span>
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-1">{alert.description}</p>
                          <div className="flex items-center gap-4 mt-2 font-mono text-[9px] text-slate-600">
                             <span className="flex items-center gap-1"><span className="text-slate-700">TIME:</span> {new Date(alert.created_at).toLocaleTimeString()}</span>
                             <span className="flex items-center gap-1"><span className="text-slate-700">SOURCE:</span> {alert.source_ip || 'Internal'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Detailed View Section */}
          {selected ? (
            <div className="w-1/3 hidden lg:flex flex-col bg-slate-900/80 backdrop-blur-3xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
              <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between bg-slate-800/60">
                <h3 className="font-black text-xs text-slate-400 uppercase tracking-widest">Incident Dossier</h3>
                <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-white transition-colors">✕</button>
              </div>
              
              <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                {/* Visual Header */}
                <div className={`p-4 rounded-2xl border text-center ${SEVERITY_CONFIG[selected.severity].bg} ${SEVERITY_CONFIG[selected.severity].glow}`}>
                   <span className="text-4xl mb-2 inline-block animate-bounce-slow">{SEVERITY_CONFIG[selected.severity].icon}</span>
                   <p className={`text-xs font-black tracking-widest mb-1 ${SEVERITY_CONFIG[selected.severity].color}`}>{selected.severity} INCIDENT</p>
                   <h2 className="text-xl font-black text-white px-2 leading-tight uppercase">{selected.threat_type}</h2>
                </div>

                <div className="space-y-4">
                  <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                    <label className="text-[10px] font-black text-slate-600 uppercase mb-2 block tracking-widest">Impact Description</label>
                    <p className="text-xs text-slate-300 leading-relaxed">{selected.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 font-mono text-[10px]">
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                      <label className="text-slate-600 mb-1 block">REGISTERED</label>
                      <p className="text-slate-300">{new Date(selected.created_at).toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                      <label className="text-slate-600 mb-1 block">SOURCE NODE</label>
                      <p className="text-blue-400 font-bold">{selected.servers?.server_name || 'N/A'}</p>
                    </div>
                  </div>

                  {/* AI INSIGHTS BUTTON */}
                  <div className="border border-blue-500/20 rounded-2xl p-4 bg-blue-500/5 group relative overflow-hidden">
                    {!aiInsight && !loadingAi && (
                      <div className="flex flex-col items-center gap-3 py-2">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/30">
                          <span className="text-xl">🤖</span>
                        </div>
                        <div className="text-center">
                          <h4 className="text-xs font-black text-blue-400 uppercase">AI Breach Intelligence</h4>
                          <p className="text-[10px] text-slate-500 mt-1">Get an expert breakdown of this threat</p>
                        </div>
                        <button 
                          onClick={getAiSecurityAnalysis}
                          className="w-full mt-2 py-2 bg-blue-500 text-black text-[10px] font-black rounded-lg hover:bg-blue-400 transition-all active:scale-95"
                        >
                          RUN AI ANALYSIS
                        </button>
                      </div>
                    )}

                    {loadingAi && (
                      <div className="flex flex-col items-center gap-4 py-8">
                        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-[10px] font-black text-blue-400 animate-pulse tracking-widest uppercase italic">Decrypting Incident Context...</p>
                      </div>
                    )}

                    {aiError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-[10px] text-center">
                        {aiError}
                      </div>
                    )}

                    {aiInsight && (
                      <div className="space-y-4 animate-fade-in relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                           <span className="w-6 h-6 bg-blue-500 text-black rounded-full flex items-center justify-center text-xs">🤖</span>
                           <h4 className="text-[10px] font-black text-blue-400 uppercase">LOGify AI Intelligence</h4>
                        </div>
                        <div className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-800 italic whitespace-pre-wrap">
                          {aiInsight}
                        </div>
                        <button 
                          onClick={() => setAiInsight(null)} 
                          className="text-[9px] text-slate-600 hover:text-slate-400 underline font-mono"
                        >
                          Clear Analysis
                        </button>
                      </div>
                    )}
                    
                    {/* Background Glow Overlay for group */}
                    <div className="absolute inset-0 bg-blue-500/5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  <div className="bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/20 italic">
                    <label className="text-[10px] font-black text-emerald-500/60 uppercase mb-2 block tracking-widest">Counter-Measures</label>
                    <p className="text-xs text-emerald-300 leading-relaxed font-medium">💡 {selected.recommendation}</p>
                  </div>
                </div>

                <div className="pt-4 flex gap-2">
                  <button
                    onClick={() => resolveAlert(selected.id)}
                    className="flex-1 py-3 bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white border border-slate-700 hover:border-emerald-500 rounded-xl font-black text-[10px] transition-all uppercase tracking-widest"
                  >
                    Mark Resolved
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-1/3 hidden lg:flex flex-col items-center justify-center bg-slate-900/40 border border-slate-700/50 border-dashed rounded-2xl opacity-40">
              <span className="text-4xl mb-4">🔍</span>
              <p className="text-sm font-black text-slate-600 tracking-widest uppercase">Select an event to view dossier</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Alerts;
