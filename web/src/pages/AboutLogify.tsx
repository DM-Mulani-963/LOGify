import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Landing3DScene from '../components/Landing3DScene';

const PHASES = [
  {
    num: '01',
    title: 'Discovery',
    subtitle: 'The Smart Scan',
    desc: 'The CLI Agent scans the OS for active services (systemd, docker, nginx) and standard log paths. It creates a map of "Active Log Sources" and alerts you if a service has logging disabled.',
    icon: '🔍',
    color: '#3b82f6',
    cmd: 'logify scan',
  },
  {
    num: '02',
    title: 'Ingestion',
    subtitle: 'The Pipeline',
    desc: 'File system events trigger on new writes using watchdog. Logs are pushed to a local queue, then flushed via HTTP to the server. If the server is unreachable, logs buffer to local SQLite — zero data loss.',
    icon: '⚡',
    color: '#06b6d4',
    cmd: 'logify watch all',
  },
  {
    num: '03',
    title: 'Processing',
    subtitle: 'The Brain',
    desc: 'The Backend API validates API keys, enriches logs with server metadata, broadcasts to Realtime channels, and asynchronously persists to Supabase PostgreSQL — all in under 500ms.',
    icon: '🧠',
    color: '#8b5cf6',
    cmd: 'POST /api/ingest',
  },
  {
    num: '04',
    title: 'Visualization',
    subtitle: 'The Experience',
    desc: 'WebSocket events trigger React hooks. Three.js renders new particles in the holographic tunnel — red for errors, yellow for warnings, blue for info. The audio engine modulates frequency based on error density.',
    icon: '🌐',
    color: '#10b981',
    cmd: 'logify gui',
  },
];

const TECH_STACK = [
  { name: 'Python 3.10', desc: 'CLI Agent & Backend API', icon: '🐍', color: '#3b82f6' },
  { name: 'FastAPI', desc: 'High-performance REST API', icon: '⚡', color: '#06b6d4' },
  { name: 'React + TypeScript', desc: 'Dashboard UI', icon: '⚛️', color: '#61dafb' },
  { name: 'Three.js / R3F', desc: '3D holographic rendering', icon: '🎮', color: '#8b5cf6' },
  { name: 'Supabase', desc: 'Auth, DB & Realtime', icon: '🗄️', color: '#10b981' },
  { name: 'Tone.js', desc: 'Audio monitoring engine', icon: '🎵', color: '#f59e0b' },
  { name: 'Google Gemini AI', desc: 'AI threat detection', icon: '🤖', color: '#ec4899' },
  { name: 'Watchdog', desc: 'Real-time file monitoring', icon: '👁️', color: '#ef4444' },
];

const FEATURES = [
  { icon: '🚀', title: 'Real-Time Streaming', desc: 'Sub-500ms latency from file write to dashboard visual. No polling — pure event-driven architecture using OS file system events.' },
  { icon: '🎮', title: '3D Holographic Dashboard', desc: 'Logs rendered as particles in a 3D tunnel. Velocity = throughput. Color = severity. A living, breathing visualization of your infrastructure.' },
  { icon: '🤖', title: 'AI-Powered Alerts', desc: 'Google Gemini AI analyzes log streams in real-time. Detects anomalies, threats, and unusual patterns. Alerts you before issues escalate.' },
  { icon: '🔊', title: 'Soni-Logs Audio Engine', desc: 'Generative ambient soundscapes reflect system health. A base drone for "system on", modulating pitch/distortion based on error rate — hear your infrastructure.' },
  { icon: '📡', title: 'Multi-Server Support', desc: 'Connect unlimited servers with a single CLI command. Offline buffering ensures zero data loss. Auto-reconnect on network restore.' },
  { icon: '🔒', title: 'Enterprise Security', desc: 'API Key authentication, end-to-end TLS encryption, Role-Based Access Control (Admin, Developer, Auditor). Built for teams.' },
  { icon: '🧹', title: 'Noise Cancellation', desc: 'Smart deduplication reduces 1000 identical log lines to 1 entry with count. Focus on what matters, not the noise.' },
  { icon: '⚙️', title: 'Smart Auto-Discovery', desc: 'Automatically detects running services and their log paths. If Nginx is active but logs are disabled, LOGify tells you exactly how to fix it.' },
];

const AboutLogify: React.FC = () => {
  const [scrollY, setScrollY] = useState(0);
  const [activePhase, setActivePhase] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('landing-visible');
      }),
      { threshold: 0.1 }
    );
    document.querySelectorAll('.landing-reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Auto-cycle phases
  useEffect(() => {
    const interval = setInterval(() => {
      setActivePhase((p) => (p + 1) % PHASES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="landing-page min-h-screen">
      <Landing3DScene scrollY={scrollY} />

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-blue-500/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <svg width="36" height="36" viewBox="0 0 36 36" className="group-hover:rotate-12 transition-transform duration-300">
              <defs>
                <linearGradient id="hexGradAL" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
              <polygon points="18,2 32,10 32,26 18,34 4,26 4,10" fill="url(#hexGradAL)" opacity="0.9" />
              <polygon points="18,2 32,10 32,26 18,34 4,26 4,10" fill="none" stroke="rgba(96,165,250,0.4)" strokeWidth="1" />
              <text x="18" y="23" textAnchor="middle" fill="white" fontFamily="Orbitron,sans-serif" fontSize="14" fontWeight="900">L</text>
            </svg>
            <span className="font-orbitron font-bold text-lg tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">LOGify</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-slate-400 hover:text-white text-sm transition-colors">← Home</Link>
            <Link to="/about-me" className="text-slate-400 hover:text-white text-sm transition-colors">About Developer</Link>
            <Link to="/login" className="px-4 py-2 rounded-lg text-sm font-bold border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition-all">Sign In</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 min-h-screen flex items-center justify-center px-6 pt-24">
        <div className="max-w-4xl mx-auto text-center">
          <div className="landing-reveal mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-xs font-mono tracking-wider">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              SOFTWARE REQUIREMENTS SPECIFICATION · v1.0.0 · 2026
            </span>
          </div>
          <h1 className="landing-reveal font-orbitron text-5xl sm:text-7xl font-black mb-4 landing-glow-text" style={{ transitionDelay: '0.1s' }}>
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-blue-400 via-cyan-300 to-emerald-400">
              About LOGify
            </span>
          </h1>
          <p className="landing-reveal text-slate-400 text-lg max-w-2xl mx-auto mb-10 leading-relaxed" style={{ transitionDelay: '0.3s' }}>
            A next-generation log management system. This is the technical deep-dive — 
            the architecture, the vision, and the engineering behind LOGify.
          </p>
          <div className="landing-reveal flex flex-col sm:flex-row items-center justify-center gap-4" style={{ transitionDelay: '0.5s' }}>
            <Link to="/register" className="px-8 py-4 rounded-xl text-sm font-bold tracking-wider bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-blue-500/30 transition-all hover:-translate-y-0.5">
              GET STARTED FREE →
            </Link>
            <button
              onClick={() => document.getElementById('phases')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 rounded-xl text-sm font-bold tracking-wider border border-slate-700 text-slate-300 hover:bg-white/5 transition-all"
            >
              SEE ARCHITECTURE ↓
            </button>
          </div>
        </div>
      </section>

      {/* What is LOGify */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="landing-reveal font-orbitron text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 mb-5">
                What is LOGify?
              </h2>
              <p className="landing-reveal text-slate-400 leading-relaxed mb-5" style={{ transitionDelay: '0.1s' }}>
                LOGify is a distributed log management system that modernizes server monitoring. 
                It replaces traditional text-scroll dashboards with a <span className="text-blue-400">living, breathing 3D experience</span> — 
                logs rendered as particles in a holographic tunnel, with AI-powered threat detection and 
                an audio engine that lets you <em>hear</em> your infrastructure's health.
              </p>
              <p className="landing-reveal text-slate-400 leading-relaxed mb-6" style={{ transitionDelay: '0.2s' }}>
                The system consists of three core components: the <span className="text-cyan-400">CLI Agent</span> (Python, runs on your servers), 
                the <span className="text-purple-400">Backend API</span> (FastAPI + Supabase), and the 
                <span className="text-emerald-400"> Web Dashboard</span> (React + Three.js).
              </p>
              <div className="landing-reveal flex flex-wrap gap-2" style={{ transitionDelay: '0.3s' }}>
                {['Open Source', 'Cross-Platform', 'AI Powered', 'Real-Time', 'Self-Hostable', 'Audio Monitoring'].map((tag) => (
                  <span key={tag} className="px-3 py-1 rounded-full text-xs font-mono border border-slate-700 text-slate-400 bg-slate-800/50">{tag}</span>
                ))}
              </div>
            </div>
            {/* Quick specs */}
            <div className="landing-reveal" style={{ transitionDelay: '0.2s' }}>
              <div className="bg-slate-900/60 backdrop-blur border border-slate-700/40 rounded-2xl p-8 space-y-5">
                {[
                  { label: 'Version', value: '1.0.0 · Active Development', icon: '📦' },
                  { label: 'Language', value: 'Python 3.10 · TypeScript', icon: '💻' },
                  { label: 'AI Model', value: 'Google Gemini Flash', icon: '🤖' },
                  { label: 'Database', value: 'PostgreSQL via Supabase', icon: '🗄️' },
                  { label: 'Latency', value: '< 500ms end-to-end', icon: '⚡' },
                  { label: 'Capacity', value: '1000+ particles @ 60 FPS', icon: '🎮' },
                  { label: 'Platforms', value: 'Linux · macOS · Windows', icon: '🌐' },
                  { label: 'License', value: 'Free & Open Source', icon: '🎉' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-sm border-b border-slate-800 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <span className="text-base">{item.icon}</span>
                      <span className="text-slate-500 font-mono text-xs">{item.label}</span>
                    </div>
                    <span className="text-white font-medium text-xs text-right">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Phases - Animated Timeline */}
      <section id="phases" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="landing-reveal font-orbitron text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-3">
              How LOGify Works
            </h2>
            <p className="landing-reveal text-slate-400 text-sm" style={{ transitionDelay: '0.1s' }}>
              4 Distinct Phases of Operation — from discovery to visualization
            </p>
          </div>

          {/* Phase Tabs */}
          <div className="landing-reveal flex flex-wrap justify-center gap-3 mb-10" style={{ transitionDelay: '0.2s' }}>
            {PHASES.map((phase, i) => (
              <button
                key={phase.num}
                onClick={() => setActivePhase(i)}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold font-mono transition-all duration-300 ${
                  activePhase === i
                    ? 'text-white shadow-lg'
                    : 'text-slate-500 bg-slate-900/50 border border-slate-700/50 hover:text-slate-300'
                }`}
                style={activePhase === i ? {
                  background: `linear-gradient(135deg, ${phase.color}30, ${phase.color}15)`,
                  border: `1px solid ${phase.color}40`,
                  boxShadow: `0 0 20px ${phase.color}20`,
                } : {}}
              >
                {phase.num} · {phase.title}
              </button>
            ))}
          </div>

          {/* Active Phase Display */}
          <div className="landing-reveal" style={{ transitionDelay: '0.3s' }}>
            {PHASES.map((phase, i) => (
              <div
                key={phase.num}
                className={`transition-all duration-500 ${activePhase === i ? 'opacity-100 translate-y-0' : 'opacity-0 absolute pointer-events-none -translate-y-4'}`}
                style={{ display: activePhase === i ? 'block' : 'none' }}
              >
                <div className="bg-slate-900/70 backdrop-blur border rounded-2xl p-10 md:flex gap-10 items-center"
                  style={{ borderColor: `${phase.color}25` }}>
                  <div className="flex-shrink-0 text-center mb-8 md:mb-0">
                    <div className="inline-flex w-28 h-28 rounded-full items-center justify-center text-6xl mb-4"
                      style={{ background: `${phase.color}12`, border: `2px solid ${phase.color}25` }}>
                      {phase.icon}
                    </div>
                    <div className="font-orbitron text-4xl font-black" style={{ color: phase.color }}>{phase.num}</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-mono mb-2" style={{ color: phase.color }}>PHASE {phase.num}</div>
                    <h3 className="font-orbitron text-2xl font-bold text-white mb-1">{phase.title}</h3>
                    <div className="text-sm mb-5" style={{ color: phase.color }}>{phase.subtitle}</div>
                    <p className="text-slate-400 leading-relaxed mb-6">{phase.desc}</p>
                    <div className="flex items-center gap-3 bg-black/40 border border-slate-800 rounded-lg px-4 py-3 font-mono text-sm max-w-xs">
                      <span className="text-slate-600">$</span>
                      <span style={{ color: phase.color }}>{phase.cmd}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mt-8">
            {PHASES.map((_, i) => (
              <button
                key={i}
                onClick={() => setActivePhase(i)}
                className="w-2 h-2 rounded-full transition-all duration-300"
                style={{ background: activePhase === i ? PHASES[i].color : 'rgb(51,65,85)' }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="landing-reveal font-orbitron text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-3">
              Core Features
            </h2>
            <p className="landing-reveal text-slate-400 text-sm" style={{ transitionDelay: '0.1s' }}>
              Every feature designed with purpose
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-5">
            {FEATURES.map((feat, i) => (
              <div
                key={feat.title}
                className="landing-reveal bg-slate-900/50 backdrop-blur border border-slate-700/30 rounded-xl p-6 hover:border-blue-500/20 hover:bg-slate-900/70 transition-all group"
                style={{ transitionDelay: `${i * 0.07}s` }}
              >
                <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">{feat.icon}</div>
                <h3 className="font-orbitron font-bold text-white text-sm mb-2">{feat.title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="landing-reveal font-orbitron text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400 mb-3">
              Technology Stack
            </h2>
            <p className="landing-reveal text-slate-400 text-sm" style={{ transitionDelay: '0.1s' }}>
              Battle-tested technologies powering LOGify
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-5">
            {TECH_STACK.map((tech, i) => (
              <div
                key={tech.name}
                className="landing-reveal landing-3d-card bg-slate-900/60 border border-slate-700/40 rounded-xl p-5 text-center hover:border-blue-500/20 transition-all"
                style={{ transitionDelay: `${i * 0.08}s` }}
              >
                <div className="text-3xl mb-3">{tech.icon}</div>
                <div className="font-mono font-bold text-sm mb-1" style={{ color: tech.color }}>{tech.name}</div>
                <div className="text-slate-500 text-xs">{tech.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Future Vision */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="landing-reveal bg-gradient-to-br from-purple-500/5 to-pink-500/5 border border-purple-500/15 rounded-2xl p-10 backdrop-blur-xl">
            <div className="text-center mb-8">
              <div className="text-4xl mb-4">🔮</div>
              <h2 className="font-orbitron text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-3">
                Future Vision: Direct AI
              </h2>
              <p className="text-slate-400 text-sm">The next frontier of LOGify</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: '💬', title: 'Natural Language Query', desc: 'Ask "Why did the payment server crash at 2 AM?" instead of searching level:ERROR' },
                { icon: '🔗', title: 'Cross-Service Correlation', desc: 'LLM vectorizes logs across all services to find causality chains and root causes' },
                { icon: '🛠️', title: 'Auto-Remediation', desc: 'AI suggests code fixes for specific exceptions found in logs — from error to fix in one step' },
              ].map((item, i) => (
                <div key={item.title} className="text-center p-5 rounded-xl bg-slate-900/50 border border-purple-500/10">
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <h4 className="font-orbitron font-bold text-white text-sm mb-2">{item.title}</h4>
                  <p className="text-slate-500 text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="landing-reveal font-orbitron text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-400 mb-5">
            Ready to Experience It?
          </h2>
          <p className="landing-reveal text-slate-400 mb-8" style={{ transitionDelay: '0.1s' }}>
            Set up LOGify on your infrastructure in under 5 minutes.
          </p>
          <div className="landing-reveal flex flex-col sm:flex-row items-center justify-center gap-4" style={{ transitionDelay: '0.2s' }}>
            <Link to="/register" className="px-8 py-4 rounded-xl text-sm font-bold tracking-wider bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 shadow-xl shadow-blue-500/25 hover:-translate-y-0.5 transition-all">
              CREATE FREE ACCOUNT →
            </Link>
            <Link to="/about-me" className="px-8 py-4 rounded-xl text-sm font-bold tracking-wider border border-slate-700 text-slate-300 hover:bg-white/5 transition-all">
              Meet the Developer
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <svg width="28" height="28" viewBox="0 0 36 36">
              <defs>
                <linearGradient id="hexGradALF" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
              <polygon points="18,2 32,10 32,26 18,34 4,26 4,10" fill="url(#hexGradALF)" opacity="0.9" />
              <text x="18" y="23" textAnchor="middle" fill="white" fontFamily="Orbitron,sans-serif" fontSize="14" fontWeight="900">L</text>
            </svg>
            <span className="font-orbitron font-bold text-sm text-slate-400 tracking-wider">LOGify</span>
          </div>
          <p className="text-slate-600 text-xs font-mono">© 2026 LOGify · Crafted by Dhruvkumar Mulani · Open Source</p>
          <div className="flex gap-5">
            <Link to="/" className="text-slate-500 hover:text-slate-300 text-xs transition-colors">Home</Link>
            <Link to="/about-me" className="text-slate-500 hover:text-slate-300 text-xs transition-colors">About Me</Link>
            <Link to="/login" className="text-slate-500 hover:text-slate-300 text-xs transition-colors">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AboutLogify;
