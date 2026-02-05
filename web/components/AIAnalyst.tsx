
import React, { useState } from 'react';
import { analyzeLogs } from '../services/geminiService';
import { LogEntry } from '../types';

export const AIAnalyst: React.FC<{ logs: LogEntry[] }> = ({ logs }) => {
  const [query, setQuery] = useState('');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!query) return;
    setLoading(true);
    const result = await analyzeLogs(logs, query);
    setAnalysis(result);
    setLoading(false);
  };

  return (
    <div className="bg-slate-900/80 border border-blue-500/30 rounded-lg p-4 backdrop-blur-md">
      <h3 className="text-blue-400 font-orbitron text-sm mb-3 flex items-center gap-2">
        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
        DIRECT AI ANALYST
      </h3>
      
      <div className="flex gap-2 mb-4">
        <input 
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask about your logs..."
          className="bg-black/50 border border-slate-700 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-blue-500 transition-colors"
        />
        <button 
          onClick={handleAnalyze}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white px-4 py-2 rounded text-sm font-bold transition-all"
        >
          {loading ? 'ANALYZING...' : 'RUN'}
        </button>
      </div>

      {analysis && (
        <div className="bg-black/40 border border-blue-900/50 rounded p-3 text-xs leading-relaxed max-h-48 overflow-y-auto font-mono text-slate-300">
          {analysis.split('\n').map((line, i) => (
            <p key={i} className="mb-2 last:mb-0">{line}</p>
          ))}
        </div>
      )}
    </div>
  );
};
