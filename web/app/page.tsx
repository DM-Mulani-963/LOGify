"use client";

import { useEffect, useState } from "react";
import LogTunnel from "../components/LogTunnel";
import { AlertCircle, Terminal, Activity } from "lucide-react";

export default function Home() {
  const [logs, setLogs] = useState<any[]>([]);
  const [status, setStatus] = useState("disconnected");
  const [errorRate, setErrorRate] = useState(0);

  useEffect(() => {
    // Connect to Backend WebSocket
    const ws = new WebSocket("ws://localhost:8000/ws");

    ws.onopen = () => {
      setStatus("connected");
      console.log("Connected to LOGify Stream");
    };

    ws.onmessage = (event) => {
      try {
        const log = JSON.parse(event.data);
        console.log("Received:", log);

        // Update Live Stream (Keep last 50 for UI list)
        setLogs((prev) => [...prev, log].slice(-50));

        // Calculate Error Rate (Mock logic)
        if (log.level === "ERROR") {
          setErrorRate(prev => Math.min(prev + 5, 100)); // Spike up
        } else {
          setErrorRate(prev => Math.max(prev - 0.5, 0)); // Cool down
        }

      } catch (e) {
        console.error("Parse error", e);
      }
    };

    ws.onclose = () => setStatus("disconnected");
    ws.onerror = (e) => console.error(e);

    return () => ws.close();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 font-mono selection:bg-cyan-500/30">
      {/* Header */}
      <header className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-cyan-500 rounded-sm flex items-center justify-center font-bold text-black">
            L
          </div>
          <h1 className="text-2xl font-bold tracking-tighter bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            LOGify <span className="text-xs text-gray-500 font-normal">v1.0</span>
          </h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800">
            <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="capitalize text-gray-400">{status}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="text-gray-400">{logs.length} events</span>
          </div>
        </div>
      </header>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[800px]">

        {/* Main 3D View (Spans 2 columns) */}
        <div className="lg:col-span-2 relative group">
          <div className="absolute top-4 left-4 z-10 pointer-events-none">
            <h2 className="text-lg font-bold text-cyan-500 mb-1 flex items-center gap-2">
              <Terminal className="w-4 h-4" /> Holographic Stream
            </h2>
            <p className="text-xs text-gray-500">Live ingestion pipeline</p>
          </div>

          {/* The 3D Component */}
          <LogTunnel logs={logs} />

          {/* Overlay Stats */}
          <div className="absolute bottom-4 right-4 z-10 flex gap-2">
            <div className="bg-black/50 backdrop-blur border border-red-500/30 p-2 rounded text-xs text-red-400">
              Error Potential: {errorRate.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Side Panel: Text Logs */}
        <div className="bg-slate-900/50 border border-gray-800 rounded-lg p-4 overflow-hidden flex flex-col">
          <h2 className="text-lg font-bold text-gray-300 mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> Recent Events
          </h2>
          <div className="flex-1 overflow-y-auto space-y-2 font-mono text-xs pr-2">
            {logs.slice().reverse().map((log, i) => (
              <div key={i} className={`p-2 rounded border-l-2 ${log.level === 'ERROR' ? 'border-red-500 bg-red-950/20 text-red-200' :
                  log.level === 'WARN' ? 'border-yellow-500 bg-yellow-950/20 text-yellow-200' :
                    'border-blue-500 bg-blue-950/10 text-gray-300'
                }`}>
                <div className="flex justify-between opacity-50 mb-1">
                  <span>{new Date(log.timestamp * 1000).toLocaleTimeString()}</span>
                  <span>{log.source || 'Standard In'}</span>
                </div>
                <div className="break-all">{log.message}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
