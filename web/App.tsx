
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Bloom, EffectComposer } from '@react-three/drei';
import { LogStreamer } from './services/mockLogGenerator';
import { LogEntry, LogLevel, SystemStats } from './types';
import { MAX_DISPLAY_LOGS, COLORS } from './constants';
import { Tunnel } from './components/Tunnel';
import { AudioEngine } from './components/AudioEngine';
import { AIAnalyst } from './components/AIAnalyst';

// Declare intrinsic elements as variables to bypass JSX.IntrinsicElements errors
const Color = 'color' as any;
const AmbientLight = 'ambientLight' as any;

const App: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [search, setSearch] = useState('');
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isNoiseCancelled, setIsNoiseCancelled] = useState(true);
  const [isScanning, setIsScanning] = useState(true);
  const [stats, setStats] = useState<SystemStats>({ logsPerSecond: 0, errorRate: 0, activeSources: 5 });
  const [streamSpeed, setStreamSpeed] = useState(800);

  const logCounts = useRef<number>(0);
  const errorCounts = useRef<number>(0);
  const lastLogMessage = useRef<string>('');

  // Discovery Sequence (Simulated)
  useEffect(() => {
    const timer = setTimeout(() => setIsScanning(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Initialize Streamer
  useEffect(() => {
    if (isScanning) return;

    const streamer = new LogStreamer((newLog) => {
      // Simple AI Noise Cancellation logic
      if (isNoiseCancelled && newLog.message === lastLogMessage.current) {
        return; // Suppress duplicate
      }
      lastLogMessage.current = newLog.message;

      setLogs((prev) => [newLog, ...prev].slice(0, MAX_DISPLAY_LOGS));
      logCounts.current++;
      if (newLog.level === LogLevel.ERROR) errorCounts.current++;
    });

    streamer.start(streamSpeed);
    
    const statsTimer = setInterval(() => {
      setStats({
        logsPerSecond: logCounts.current,
        errorRate: logCounts.current > 0 ? (errorCounts.current / logCounts.current) : 0,
        activeSources: 5
      });
      logCounts.current = 0;
      errorCounts.current = 0;
    }, 1000);

    return () => {
      streamer.stop();
      clearInterval(statsTimer);
    };
  }, [streamSpeed, isNoiseCancelled, isScanning]);

  const filteredLogs = useMemo(() => {
    return logs.filter(l => 
      l.message.toLowerCase().includes(search.toLowerCase()) || 
      l.source.toLowerCase().includes(search.toLowerCase()) ||
      l.level.toLowerCase().includes(search.toLowerCase())
    );
  }, [logs, search]);

  if (isScanning) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center font-orbitron text-blue-500 overflow-hidden">
        <div className="relative w-64 h-64 mb-8">
          <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full animate-ping"></div>
          <div className="absolute inset-4 border-2 border-blue-400/40 rounded-full animate-[spin_3s_linear_infinite]"></div>
          <div className="absolute inset-8 border border-blue-300/60 rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold animate-pulse">SCANNING...</span>
          </div>
        </div>
        <h1 className="text-2xl font-black tracking-[0.5em] mb-2">LOGIFY DISCOVERY</h1>
        <p className="font-mono text-[10px] text-slate-500 tracking-widest uppercase">Initializing Smart Log Ingestion Pipeline</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex bg-slate-950 text-slate-200 overflow-hidden relative selection:bg-blue-500 selection:text-white">
      <AudioEngine stats={stats} enabled={isAudioEnabled} />

      {/* 3D Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
          <Color attach="background" args={['#020617']} />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          <Tunnel logs={logs} speedMultiplier={1000 / streamSpeed} />
          <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
          <ambientLight intensity={0.5} />
          {/* Note: In App.tsx line 101, ambientLight is a valid Three element, using Color variable above for line 97 fix */}
          <AmbientLight intensity={0.5} />
        </Canvas>
      </div>

      {/* Sidebar Controls */}
      <aside className="w-80 h-full border-r border-blue-500/10 bg-slate-900/40 backdrop-blur-2xl z-10 flex flex-col p-6 shadow-2xl relative overflow-hidden">
        {/* Subtle scan line effect */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-blue-500/20 animate-[scan_4s_linear_infinite]"></div>
        
        <header className="mb-10 relative">
          <div className="absolute -left-6 top-1 w-1 h-8 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
          <h1 className="text-4xl font-black font-orbitron tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-blue-600 italic">
            LOGify
          </h1>
          <p className="text-[9px] text-blue-400/60 font-mono tracking-widest uppercase mt-1">
            System Holograph v1.0.42
          </p>
        </header>

        <section className="space-y-6 flex-grow custom-scrollbar overflow-y-auto pr-2">
          {/* Audio Toggle */}
          <div className="p-4 rounded border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-blue-400 tracking-wider">SONI-LOGS ENGINE</span>
              <button 
                onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                className={`w-9 h-4 rounded-full transition-all relative ${isAudioEnabled ? 'bg-blue-500' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${isAudioEnabled ? 'right-0.5 shadow-[0_0_5px_white]' : 'left-0.5'}`} />
              </button>
            </div>
            <p className="text-[9px] text-slate-500 leading-tight">Auditory feedback modulated by system throughput and error density.</p>
          </div>

          {/* AI Noise Cancellation */}
          <div className="p-4 rounded border border-purple-500/20 bg-purple-500/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-purple-400 tracking-wider">NOISE CANCELLATION</span>
              <button 
                onClick={() => setIsNoiseCancelled(!isNoiseCancelled)}
                className={`w-9 h-4 rounded-full transition-all relative ${isNoiseCancelled ? 'bg-purple-500' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${isNoiseCancelled ? 'right-0.5 shadow-[0_0_5px_white]' : 'left-0.5'}`} />
              </button>
            </div>
            <p className="text-[9px] text-slate-500 leading-tight">Suppress repetitive log storms via frequency analysis.</p>
          </div>

          {/* Ingestion Speed */}
          <div className="space-y-3 p-1">
            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span>Flux Frequency</span>
              <span className="text-blue-400">{streamSpeed}ms</span>
            </div>
            <input 
              type="range" 
              min="100" 
              max="2000" 
              step="100"
              value={streamSpeed} 
              onChange={(e) => setStreamSpeed(Number(e.target.value))}
              className="w-full accent-blue-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* AI Analyst */}
          <AIAnalyst logs={logs} />
        </section>

        <footer className="mt-auto pt-6 border-t border-blue-500/10">
          <div className="flex items-center gap-4 text-[10px] text-slate-500 font-mono">
            <div className="flex flex-col">
              <span className="text-[8px] uppercase text-slate-600">Local Node</span>
              <span className="text-blue-400/80">0xDEADBEEF</span>
            </div>
            <div className="flex flex-col ml-auto text-right">
              <span className="text-[8px] uppercase text-slate-600">Sync Status</span>
              <span className="text-green-500/80 flex items-center justify-end gap-1">
                LIVE
                <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></span>
              </span>
            </div>
          </div>
        </footer>
      </aside>

      {/* Main Content Dashboard */}
      <main className="flex-grow z-10 p-8 flex flex-col gap-6 overflow-hidden relative">
        {/* Corners decorations */}
        <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-blue-500/30"></div>
        <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-blue-500/30"></div>
        <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-blue-500/30"></div>
        <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-blue-500/30"></div>

        {/* Top Stats Bar */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'THROUGHPUT', value: `${stats.logsPerSecond} L/S`, color: 'text-blue-400', glow: 'shadow-[0_0_20px_rgba(59,130,246,0.1)]' },
            { label: 'ERROR RATE', value: `${(stats.errorRate * 100).toFixed(1)}%`, color: stats.errorRate > 0.1 ? 'text-red-400' : 'text-slate-400', glow: stats.errorRate > 0.1 ? 'shadow-[0_0_20px_rgba(239,68,68,0.2)]' : '' },
            { label: 'BURST LATENCY', value: '14ms', color: 'text-emerald-400', glow: '' },
            { label: 'SOURCES', value: stats.activeSources, color: 'text-slate-300', glow: '' }
          ].map((stat, i) => (
            <div key={i} className={`bg-slate-900/60 backdrop-blur-md border border-blue-500/10 p-5 rounded flex flex-col gap-1 transition-all duration-500 ${stat.glow}`}>
              <span className="text-[9px] uppercase font-black text-slate-500 tracking-[0.2em]">{stat.label}</span>
              <span className={`text-3xl font-orbitron font-black ${stat.color} drop-shadow-sm tracking-tighter`}>{stat.value}</span>
              <div className="w-full h-[2px] bg-slate-800 mt-2 overflow-hidden">
                 <div className={`h-full bg-blue-500/40 animate-[progress_2s_ease-in-out_infinite]`} style={{width: '30%'}}></div>
              </div>
            </div>
          ))}
        </div>

        {/* Search & List Container */}
        <div className="flex-grow flex flex-col min-h-0 bg-slate-900/40 backdrop-blur-xl border border-blue-500/10 rounded overflow-hidden shadow-2xl">
          <div className="px-6 py-4 flex items-center gap-4 bg-slate-900/80 border-b border-blue-500/10">
            <div className="relative flex-grow group">
              <input 
                type="text"
                placeholder="QUERY FILTERS (LVL, SRC, MSG)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-black/40 border border-blue-500/20 rounded py-2 px-10 text-xs font-mono tracking-widest focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600"
              />
              <svg className="w-3.5 h-3.5 absolute left-3.5 top-2.5 text-blue-500/40 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="flex gap-2">
              <button 
                className="px-4 py-2 text-[9px] font-black tracking-widest border border-blue-500/20 rounded bg-blue-500/5 hover:bg-blue-500/20 transition-all active:scale-95"
                onClick={() => setLogs([])}
              >
                PURGE BUFFER
              </button>
            </div>
          </div>

          <div className="flex-grow overflow-y-auto custom-scrollbar px-6">
            <table className="w-full text-left text-[11px] border-separate border-spacing-y-2">
              <thead className="sticky top-0 bg-slate-900/95 z-20 backdrop-blur">
                <tr className="text-slate-500 uppercase font-black text-[9px] tracking-widest">
                  <th className="px-4 py-3">UTC TIMESTAMP</th>
                  <th className="px-4 py-3">SEVERITY</th>
                  <th className="px-4 py-3">ORIGIN</th>
                  <th className="px-4 py-3">DATA PAYLOAD</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="bg-slate-800/10 hover:bg-blue-500/5 transition-all group border-l-2 border-transparent hover:border-blue-500/40">
                    <td className="px-4 py-2 text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}.{new Date(log.timestamp).getMilliseconds()}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded-sm text-[9px] font-black tracking-tighter ${
                        log.level === LogLevel.ERROR ? 'bg-red-500/20 text-red-500 border border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.1)]' :
                        log.level === LogLevel.WARN ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' :
                        'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>
                        {log.level}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-400 font-bold group-hover:text-blue-300 transition-colors uppercase">{log.source}</td>
                    <td className="px-4 py-2 text-slate-300 group-hover:text-white transition-colors break-all opacity-80 group-hover:opacity-100">
                      {log.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredLogs.length === 0 && (
              <div className="h-40 flex items-center justify-center text-slate-600 font-orbitron tracking-widest text-[10px] animate-pulse italic">
                AWAITING INBOUND DATA STREAM...
              </div>
            )}
          </div>
        </div>
      </main>

      <style>{`
        @keyframes scan {
          0% { top: 0; }
          100% { top: 100%; }
        }
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.4);
        }
      `}</style>
    </div>
  );
};

export default App;
