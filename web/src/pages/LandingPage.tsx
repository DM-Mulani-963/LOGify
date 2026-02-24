import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Landing3DScene from '../components/Landing3DScene';
import LandingNav from '../components/LandingNav';
import { HexLogo } from '../components/LandingNav';

// ===== TYPEWRITER HOOK =====
const PHRASES = [
  'Monitor your infrastructure.',
  'Detect threats with AI.',
  'Visualize logs in 3D.',
  'Hear your system health.',
  'Scale without limits.',
];

const useTypewriter = (phrases: string[], speed = 60, pause = 1800) => {
  const [text, setText] = useState('');
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = phrases[phraseIdx];
    const timeout = setTimeout(() => {
      if (!deleting) {
        setText(current.slice(0, charIdx + 1));
        if (charIdx + 1 === current.length) {
          setTimeout(() => setDeleting(true), pause);
          return;
        }
        setCharIdx((c) => c + 1);
      } else {
        setText(current.slice(0, charIdx - 1));
        if (charIdx - 1 === 0) {
          setDeleting(false);
          setPhraseIdx((p) => (p + 1) % phrases.length);
          setCharIdx(0);
          return;
        }
        setCharIdx((c) => c - 1);
      }
    }, deleting ? speed / 2 : speed);
    return () => clearTimeout(timeout);
  }, [charIdx, deleting, phraseIdx, phrases, speed, pause]);

  return text;
};

// ===== ANIMATED COUNTER =====
const AnimatedCounter: React.FC<{ target: number; suffix: string; prefix?: string; duration?: number }> = ({
  target, suffix, prefix = '', duration = 1800,
}) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const steps = 60;
        const inc = target / steps;
        let current = 0;
        const interval = setInterval(() => {
          current += inc;
          if (current >= target) {
            setCount(target);
            clearInterval(interval);
          } else {
            setCount(Math.floor(current));
          }
        }, duration / steps);
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
};

// ===== INTRO ANIMATION =====
const IntroAnimation: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const [phase, setPhase] = useState<'boot' | 'logo' | 'online' | 'fade'>('boot');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('logo'), 400);
    const t2 = setTimeout(() => setPhase('online'), 1400);
    const t3 = setTimeout(() => setPhase('fade'), 2200);
    const t4 = setTimeout(onDone, 2900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center cursor-pointer"
      style={{
        background: '#020617',
        opacity: phase === 'fade' ? 0 : 1,
        transition: 'opacity 0.7s ease',
      }}
      onClick={onDone}
    >
      {/* Scanline overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(59,130,246,0.02) 2px, rgba(59,130,246,0.02) 4px)',
        }}
      />

      {/* Boot text */}
      <div className={`transition-all duration-300 ${phase === 'boot' ? 'opacity-100' : 'opacity-0'} absolute`}>
        <div className="font-mono text-xs text-blue-500/60 text-center space-y-1">
          <div>INITIALIZING LOGIFY v1.0.0...</div>
          <div className="animate-pulse">LOADING CORE MODULES...</div>
        </div>
      </div>

      {/* Logo reveal */}
      <div className={`transition-all duration-500 ${phase === 'boot' ? 'opacity-0 scale-50' : 'opacity-100 scale-100'} flex flex-col items-center gap-6`}>
        <div
          style={{
            filter: 'drop-shadow(0 0 40px rgba(59,130,246,0.6)) drop-shadow(0 0 80px rgba(6,182,212,0.3))',
          }}
          className={`transition-all duration-700 ${phase === 'fade' ? 'scale-110' : 'scale-100'}`}
        >
          <HexLogo size={100} />
        </div>

        <h1
          className="font-orbitron font-black tracking-widest landing-glow-text"
          style={{
            fontSize: 'clamp(3rem, 10vw, 6rem)',
            background: 'linear-gradient(135deg, #60a5fa, #22d3ee, #818cf8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          LOGify
        </h1>

        {/* Status line */}
        <div className={`transition-all duration-400 ${phase === 'online' || phase === 'fade' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
          <div className="flex items-center gap-3 font-mono text-sm text-emerald-400 border border-emerald-500/25 px-6 py-2.5 rounded-full bg-emerald-500/5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            SYSTEM ONLINE — ALL MODULES READY
          </div>
        </div>

        <p className="font-mono text-[10px] text-slate-600 mt-2">Click anywhere to continue</p>
      </div>

      {/* Corner decorations */}
      <div className="absolute top-6 left-6 w-8 h-8 border-l-2 border-t-2 border-blue-500/30" />
      <div className="absolute top-6 right-6 w-8 h-8 border-r-2 border-t-2 border-blue-500/30" />
      <div className="absolute bottom-6 left-6 w-8 h-8 border-l-2 border-b-2 border-blue-500/30" />
      <div className="absolute bottom-6 right-6 w-8 h-8 border-r-2 border-b-2 border-cyan-500/30" />
    </div>
  );
};

// ===== TECH FLOATING BADGES =====
const FloatingBadges: React.FC = () => {
  const badges = [
    { label: 'React', color: '#61dafb', x: '5%', delay: '0s' },
    { label: 'Python', color: '#3b82f6', x: '88%', delay: '0.5s' },
    { label: 'Three.js', color: '#8b5cf6', x: '15%', delay: '1s' },
    { label: 'Gemini AI', color: '#ec4899', x: '75%', delay: '1.5s' },
    { label: 'Supabase', color: '#10b981', x: '50%', delay: '2s' },
    { label: 'WebGL', color: '#f59e0b', x: '35%', delay: '0.7s' },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {badges.map((badge, i) => (
        <div
          key={badge.label}
          className="absolute top-1/2"
          style={{
            left: badge.x,
            animation: `floatBadge 6s ease-in-out infinite`,
            animationDelay: badge.delay,
          }}
        >
          <span
            className="px-3 py-1 rounded-full text-xs font-mono font-bold border"
            style={{
              color: badge.color,
              borderColor: `${badge.color}30`,
              background: `${badge.color}10`,
              opacity: 0.6,
            }}
          >
            {badge.label}
          </span>
        </div>
      ))}
    </div>
  );
};

// ===== MAIN LANDING PAGE =====
const LandingPage: React.FC = () => {
  const [scrollY, setScrollY] = useState(0);
  const [activeSection, setActiveSection] = useState('hero');
  const [showIntro, setShowIntro] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const typewriterText = useTypewriter(PHRASES);

  // Don't show intro if user already dismissed it this session
  useEffect(() => {
    const seen = sessionStorage.getItem('logify-intro-seen');
    if (seen) setShowIntro(false);
  }, []);

  const handleIntroDone = () => {
    sessionStorage.setItem('logify-intro-seen', '1');
    setShowIntro(false);
  };

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const sections = document.querySelectorAll('[data-section]');
    const revealElements = document.querySelectorAll('.landing-reveal');

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.getAttribute('data-section') || 'hero');
          }
        });
      },
      { threshold: 0.4 }
    );

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('landing-visible');
        });
      },
      { threshold: 0.1 }
    );

    sections.forEach((s) => sectionObserver.observe(s));
    revealElements.forEach((el) => revealObserver.observe(el));

    return () => {
      sectionObserver.disconnect();
      revealObserver.disconnect();
    };
  }, [showIntro]);

  return (
    <>
      {/* Game-like Intro */}
      {showIntro && <IntroAnimation onDone={handleIntroDone} />}

      <div ref={containerRef} className="landing-page">
        {/* 3D Background */}
        <Landing3DScene scrollY={scrollY} />

        {/* Navbar */}
        <LandingNav activeSection={activeSection} />

        {/* ======= SECTION 1: HERO ======= */}
        <section id="hero" data-section="hero" className="relative z-10 min-h-screen flex items-center justify-center px-6">
          <FloatingBadges />
          <div className="text-center max-w-4xl mx-auto">
            <div className="landing-reveal" style={{ transitionDelay: '0.1s' }}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-400 text-xs font-mono tracking-wider mb-8">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                REAL-TIME LOG MANAGEMENT PLATFORM
              </div>
            </div>

            {/* Logo + Name */}
            <div className="landing-reveal flex items-center justify-center gap-5 mb-6" style={{ transitionDelay: '0.15s' }}>
              <div style={{ filter: 'drop-shadow(0 0 24px rgba(59,130,246,0.5))' }}>
                <HexLogo size={80} />
              </div>
              <h1 className="font-orbitron text-5xl sm:text-7xl md:text-8xl font-black leading-tight">
                <span className="text-transparent bg-clip-text bg-gradient-to-br from-blue-400 via-cyan-300 to-blue-600 landing-glow-text">
                  LOGify
                </span>
              </h1>
            </div>

            {/* Typewriter subtitle */}
            <div className="landing-reveal h-8 mb-4" style={{ transitionDelay: '0.25s' }}>
              <p className="text-lg sm:text-xl text-cyan-400 font-mono">
                {typewriterText}
                <span className="inline-block w-0.5 h-5 bg-cyan-400 ml-0.5 animate-pulse" />
              </p>
            </div>

            <p className="landing-reveal text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed" style={{ transitionDelay: '0.4s' }}>
              The next-generation holographic log management platform.
              Monitor, analyze, and secure your infrastructure with AI-powered intelligence.
            </p>

            <div className="landing-reveal flex flex-col sm:flex-row items-center justify-center gap-4" style={{ transitionDelay: '0.6s' }}>
              <Link
                to="/register"
                className="px-8 py-4 rounded-xl text-base font-bold tracking-wider bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 hover:-translate-y-0.5"
              >
                GET STARTED FREE →
              </Link>
              <button
                onClick={() => document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 rounded-xl text-base font-bold tracking-wider border border-slate-700 text-slate-300 hover:bg-white/5 hover:border-slate-500 transition-all duration-300"
              >
                SEE DEMO ↓
              </button>
            </div>

            {/* Scroll indicator */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 landing-reveal" style={{ transitionDelay: '1s' }}>
              <div className="w-6 h-10 rounded-full border-2 border-slate-600 flex items-start justify-center p-1.5">
                <div className="w-1.5 h-3 rounded-full bg-blue-400 animate-bounce" />
              </div>
            </div>
          </div>
        </section>

        {/* ======= STATS COUNTER ======= */}
        <section data-section="stats" className="relative z-10 py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {[
                { target: 1200000, suffix: '+', prefix: '', label: 'Logs Processed', color: 'text-blue-400', icon: '📊' },
                { target: 999, suffix: '%', prefix: '99.', label: 'Uptime SLA', color: 'text-emerald-400', icon: '✅' },
                { target: 500, suffix: 'ms', prefix: '<', label: 'E2E Latency', color: 'text-cyan-400', icon: '⚡' },
                { target: 60, suffix: ' FPS', prefix: '', label: '3D Rendering', color: 'text-purple-400', icon: '🎮' },
              ].map((stat, i) => (
                <div key={stat.label} className="landing-reveal bg-slate-900/60 backdrop-blur border border-slate-700/40 rounded-xl p-6 text-center hover:border-blue-500/20 transition-all" style={{ transitionDelay: `${i * 0.1}s` }}>
                  <div className="text-2xl mb-2">{stat.icon}</div>
                  <div className={`font-orbitron text-2xl font-black ${stat.color} mb-1`}>
                    <AnimatedCounter target={stat.target} suffix={stat.suffix} prefix={stat.prefix} />
                  </div>
                  <div className="text-slate-500 text-xs font-mono">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ======= SECTION 2: DASHBOARD PREVIEW ======= */}
        <section id="dashboard" data-section="dashboard" className="relative z-10 min-h-screen flex items-center justify-center px-6 py-24">
          <div className="max-w-6xl mx-auto w-full">
            <div className="text-center mb-16">
              <h2 className="landing-reveal font-orbitron text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 mb-4">
                Command Center
              </h2>
              <p className="landing-reveal text-slate-400 max-w-xl mx-auto" style={{ transitionDelay: '0.1s' }}>
                A holographic dashboard that brings your infrastructure to life
              </p>
            </div>

            {/* Mock Dashboard Card */}
            <div className="landing-reveal landing-3d-card" style={{ transitionDelay: '0.2s' }}>
              <div className="bg-slate-900/70 backdrop-blur-2xl border border-blue-500/15 rounded-2xl p-8 shadow-2xl shadow-blue-500/5">
                {/* Top bar */}
                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-800">
                  <span className="w-3 h-3 rounded-full bg-red-500/80" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-4 text-slate-600 text-xs font-mono">LOGify Dashboard — Live</span>
                  <span className="ml-auto flex items-center gap-1.5 text-emerald-400 text-xs font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    CONNECTED
                  </span>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  {[
                    { label: 'TOTAL LOGS', value: '1.2M', color: 'text-blue-400', icon: '📊' },
                    { label: 'ERROR RATE', value: '0.3%', color: 'text-emerald-400', icon: '✅' },
                    { label: 'ACTIVE SOURCES', value: '24', color: 'text-cyan-400', icon: '📡' },
                    { label: 'SERVERS', value: '8', color: 'text-purple-400', icon: '🖥️' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">{stat.label}</span>
                        <span className="text-lg">{stat.icon}</span>
                      </div>
                      <p className={`text-2xl sm:text-3xl font-bold font-orbitron ${stat.color}`}>{stat.value}</p>
                    </div>
                  ))}
                </div>

                {/* Mock Log Lines */}
                <div className="bg-black/40 rounded-xl p-4 border border-slate-800 font-mono text-xs space-y-2">
                  {[
                    { time: '09:14:23', level: 'INFO', msg: 'Server health check passed', color: 'text-blue-400' },
                    { time: '09:14:21', level: 'WARN', msg: 'High memory usage detected on node-3', color: 'text-yellow-400' },
                    { time: '09:14:18', level: 'ERROR', msg: 'Connection timeout to database replica', color: 'text-red-400' },
                    { time: '09:14:15', level: 'INFO', msg: 'Auto-scaling triggered: +2 instances', color: 'text-blue-400' },
                    { time: '09:14:12', level: 'INFO', msg: 'SSL certificate renewed successfully', color: 'text-emerald-400' },
                  ].map((log, i) => (
                    <div key={i} className="flex items-center gap-4 text-slate-400 hover:text-slate-200 transition-colors landing-reveal" style={{ transitionDelay: `${0.3 + i * 0.1}s` }}>
                      <span className="text-slate-600">{log.time}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.level === 'ERROR' ? 'bg-red-500/20 text-red-400' :
                        log.level === 'WARN' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-blue-500/15 text-blue-400'
                      }`}>{log.level}</span>
                      <span>{log.msg}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ======= SECTION 3: FEATURES ======= */}
        <section id="features" data-section="features" className="relative z-10 min-h-screen flex items-center justify-center px-6 py-24">
          <div className="max-w-6xl mx-auto w-full">
            <div className="text-center mb-16">
              <h2 className="landing-reveal font-orbitron text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 mb-4">
                Powerful Features
              </h2>
              <p className="landing-reveal text-slate-400 max-w-xl mx-auto" style={{ transitionDelay: '0.1s' }}>
                Everything you need to monitor and manage your infrastructure
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: '⚡',
                  title: 'Real-Time Monitoring',
                  desc: 'Watch logs stream in real-time from all your servers with sub-second latency. Never miss a critical event.',
                  gradient: 'from-blue-500/20 to-cyan-500/20',
                  border: 'border-blue-500/15',
                  iconBg: 'bg-blue-500/10',
                },
                {
                  icon: '🤖',
                  title: 'AI-Powered Analysis',
                  desc: 'Gemini AI automatically detects threats, anomalies, and patterns in your logs. Get intelligent alerts before issues escalate.',
                  gradient: 'from-purple-500/20 to-pink-500/20',
                  border: 'border-purple-500/15',
                  iconBg: 'bg-purple-500/10',
                },
                {
                  icon: '🌐',
                  title: 'Multi-Server Sync',
                  desc: 'Connect unlimited servers with a single CLI command. All logs centralized in one holographic dashboard.',
                  gradient: 'from-cyan-500/20 to-emerald-500/20',
                  border: 'border-cyan-500/15',
                  iconBg: 'bg-cyan-500/10',
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className={`landing-reveal landing-3d-card bg-gradient-to-br ${feature.gradient} backdrop-blur-xl border ${feature.border} rounded-2xl p-8 hover:scale-[1.02] transition-all duration-500`}
                  style={{ transitionDelay: `${i * 0.15}s` }}
                >
                  <div className={`w-14 h-14 rounded-xl ${feature.iconBg} flex items-center justify-center text-2xl mb-6`}>
                    {feature.icon}
                  </div>
                  <h3 className="font-orbitron text-lg font-bold text-white mb-3">{feature.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>

            {/* Extra feature highlights */}
            <div className="grid md:grid-cols-3 gap-6 mt-6">
              {[
                { icon: '🔒', title: 'End-to-End Security', desc: 'All data encrypted in transit and at rest. Role-based access control built-in.' },
                { icon: '📱', title: 'Access Anywhere', desc: 'Responsive web dashboard accessible from any device. Monitor on-the-go.' },
                { icon: '🔊', title: 'Audio Monitoring', desc: 'Soni-Logs: generative soundscapes reflect system health. Hear your infrastructure.' },
              ].map((f, i) => (
                <div key={i} className="landing-reveal bg-slate-900/50 backdrop-blur border border-slate-700/30 rounded-2xl p-6 flex items-start gap-5 hover:bg-slate-900/70 transition-all" style={{ transitionDelay: `${0.4 + i * 0.1}s` }}>
                  <span className="text-3xl">{f.icon}</span>
                  <div>
                    <h4 className="font-orbitron font-bold text-white mb-1">{f.title}</h4>
                    <p className="text-slate-400 text-sm">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ======= SECTION 4: HOW IT WORKS ======= */}
        <section id="how-it-works" data-section="how-it-works" className="relative z-10 min-h-screen flex items-center justify-center px-6 py-24">
          <div className="max-w-5xl mx-auto w-full">
            <div className="text-center mb-16">
              <h2 className="landing-reveal font-orbitron text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-4">
                Get Started in Minutes
              </h2>
              <p className="landing-reveal text-slate-400 max-w-xl mx-auto" style={{ transitionDelay: '0.1s' }}>
                Three simple steps to complete log management
              </p>
            </div>

            <div className="relative">
              {/* Connection line */}
              <div className="hidden md:block absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent -translate-y-1/2" />

              <div className="grid md:grid-cols-3 gap-8">
                {[

                  { step: '01', title: 'Install CLI', desc: 'One-line install on any Linux, macOS, or Windows machine.', code: 'git clone https://github.com/DM-Mulani-963/LOGify && cd LOGify && sudo ./install.sh', color: 'blue' },

                  { step: '02', title: 'Connect Server', desc: 'Generate connection keys and link your servers instantly.', code: 'logify connect --key YOUR_KEY', color: 'cyan' },
                  { step: '03', title: 'Monitor & Analyze', desc: 'Watch logs flow in real-time. AI alerts you to threats automatically.', code: 'logify watch all --online', color: 'emerald' },
                ].map((step, i) => (
                  <div key={i} className="landing-reveal relative" style={{ transitionDelay: `${i * 0.2}s` }}>
                    <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-700/40 rounded-2xl p-8 text-center hover:border-blue-500/20 transition-all duration-500 group">
                      <div className={`inline-flex w-16 h-16 rounded-full bg-${step.color}-500/10 border border-${step.color}-500/20 items-center justify-center font-orbitron text-2xl font-black text-${step.color}-400 mb-6 group-hover:scale-110 transition-transform`}>
                        {step.step}
                      </div>
                      <h3 className="font-orbitron text-lg font-bold text-white mb-3">{step.title}</h3>
                      <p className="text-slate-400 text-sm mb-5">{step.desc}</p>
                      <div className="bg-black/50 rounded-lg px-4 py-3 font-mono text-xs text-cyan-400 border border-slate-800">
                        <span className="text-slate-600">$ </span>{step.code}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ======= SECTION 5: ABOUT ======= */}
        <section id="about" data-section="about" className="relative z-10 min-h-screen flex items-center justify-center px-6 py-24">
          <div className="max-w-5xl mx-auto w-full">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="landing-reveal font-orbitron text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-6">
                  Built for DevOps Teams
                </h2>
                <p className="landing-reveal text-slate-400 leading-relaxed mb-6" style={{ transitionDelay: '0.1s' }}>
                  LOGify is an open-source, next-generation log management platform built with a cyberpunk-inspired interface.
                  We combine real-time log streaming, AI-powered threat detection, and a stunning 3D dashboard
                  to give you complete visibility into your infrastructure.
                </p>
                <p className="landing-reveal text-slate-400 leading-relaxed mb-6" style={{ transitionDelay: '0.2s' }}>
                  Whether you're managing a single server or an entire fleet, LOGify scales effortlessly.
                  Our CLI tool integrates seamlessly with any system, and the cloud dashboard gives you
                  access from anywhere.
                </p>

                <div className="landing-reveal flex flex-wrap gap-3 mb-8" style={{ transitionDelay: '0.3s' }}>
                  {['Open Source', 'Self-Hostable', 'AI Powered', 'Real-Time', 'Cross-Platform'].map((tag) => (
                    <span key={tag} className="px-4 py-1.5 rounded-full text-xs font-mono tracking-wider border border-slate-700 text-slate-400 bg-slate-800/50">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="landing-reveal flex gap-4" style={{ transitionDelay: '0.4s' }}>
                  <Link to="/about-logify" className="px-5 py-2.5 rounded-lg text-sm font-bold bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5">
                    Deep Dive →
                  </Link>
                  <Link to="/about-me" className="px-5 py-2.5 rounded-lg text-sm font-bold border border-slate-700 text-slate-300 hover:bg-white/5 transition-all">
                    Meet Developer
                  </Link>
                </div>
              </div>

              {/* Stats sidebar */}
              <div className="landing-reveal" style={{ transitionDelay: '0.2s' }}>
                <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/40 rounded-2xl p-8 space-y-8">
                  {[
                    { label: 'Supported OS', value: 'Linux · macOS · Windows', icon: '💻' },
                    { label: 'Log Sources', value: 'Unlimited', icon: '📂' },
                    { label: 'AI Model', value: 'Google Gemini', icon: '🧠' },
                    { label: 'Data Retention', value: 'Configurable', icon: '📦' },
                    { label: 'Price', value: 'Free & Open Source', icon: '🎉' },
                    { label: 'Creator', value: 'Dhruvkumar Mulani', icon: '👤' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between pb-4 border-b border-slate-800 last:border-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{item.icon}</span>
                        <span className="text-slate-400 text-sm">{item.label}</span>
                      </div>
                      <span className="text-white font-bold text-sm">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ======= SECTION 6: CTA / FOOTER ======= */}
        <section id="cta" data-section="cta" className="relative z-10 px-6 py-24">
          <div className="max-w-4xl mx-auto text-center">
            {/* CTA */}
            <div className="landing-reveal mb-24">
              <h2 className="font-orbitron text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-400 mb-6">
                Ready to Take Control?
              </h2>
              <p className="text-slate-400 text-lg max-w-xl mx-auto mb-10">
                Join the future of log management. Set up in under 5 minutes.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/register"
                  className="px-10 py-4 rounded-xl text-base font-bold tracking-wider bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 hover:-translate-y-0.5"
                >
                  CREATE FREE ACCOUNT →
                </Link>
                <a
                  href="https://github.com/DM-Mulani-963/LOGify"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-4 rounded-xl text-base font-bold tracking-wider border border-slate-700 text-slate-300 hover:bg-white/5 hover:border-slate-500 transition-all duration-300 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                  STAR ON GITHUB
                </a>
              </div>
            </div>

            {/* Footer */}
            <div className="landing-reveal border-t border-slate-800 pt-10" style={{ transitionDelay: '0.2s' }}>
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                  <div style={{ filter: 'drop-shadow(0 0 8px rgba(59,130,246,0.4))' }}>
                    <HexLogo size={34} />
                  </div>
                  <span className="font-orbitron font-bold text-sm tracking-wider text-slate-400">LOGify</span>
                </div>

                <p className="text-slate-600 text-xs font-mono">
                  © 2026 LOGify · Crafted by{' '}
                  <Link to="/about-me" className="text-blue-500/70 hover:text-blue-400 transition-colors">
                    Dhruvkumar Mulani
                  </Link>
                  {' '}· Open Source
                </p>

                <div className="flex items-center gap-5">
                  <Link to="/about-logify" className="text-slate-500 hover:text-slate-300 text-xs transition-colors">About LOGify</Link>
                  <Link to="/about-me" className="text-slate-500 hover:text-slate-300 text-xs transition-colors">Developer</Link>
                  <Link to="/login" className="text-slate-500 hover:text-slate-300 text-xs transition-colors">Sign In</Link>
                  <Link to="/register" className="text-slate-500 hover:text-slate-300 text-xs transition-colors">Register</Link>
                  <a href="https://github.com/DM-Mulani-963/LOGify" className="text-slate-500 hover:text-slate-300 text-xs transition-colors">GitHub</a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default LandingPage;
