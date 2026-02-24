import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Landing3DScene from '../components/Landing3DScene';

const SKILLS = [
  { name: 'Python', level: 92, color: '#3b82f6' },
  { name: 'React / TypeScript', level: 88, color: '#06b6d4' },
  { name: 'Node.js', level: 80, color: '#10b981' },
  { name: 'Three.js / WebGL', level: 75, color: '#8b5cf6' },
  { name: 'Linux / DevOps', level: 85, color: '#f59e0b' },
  { name: 'Cybersecurity', level: 90, color: '#ef4444' },
  { name: 'AI / Gemini API', level: 78, color: '#ec4899' },
  { name: 'Supabase / PostgreSQL', level: 82, color: '#14b8a6' },
];

const PROJECTS = [
  {
    title: 'LOGify',
    desc: 'Next-gen holographic log management platform with AI-powered threat detection, real-time 3D visualization, and multi-server sync.',
    tags: ['Python', 'React', 'Three.js', 'Gemini AI', 'Supabase'],
    badge: '🔥 Main Project',
    color: '#3b82f6',
  },
  {
    title: 'Cybersecurity Research',
    desc: 'Comprehensive penetration testing, vulnerability discovery, and security assessment tools built for ethical hacking.',
    tags: ['Python', 'Bash', 'Nmap', 'Linux'],
    badge: '🛡️ Security',
    color: '#ef4444',
  },
  {
    title: 'AI Automation Suite',
    desc: 'Advanced automation scripts leveraging AI models for data processing, form automation, and intelligent task scheduling.',
    tags: ['Python', 'Selenium', 'LLM', 'OpenCV'],
    badge: '🤖 AI Tools',
    color: '#8b5cf6',
  },
];

const AboutDeveloper: React.FC = () => {
  const [scrollY, setScrollY] = useState(0);
  const [skillsVisible, setSkillsVisible] = useState(false);
  const [animatedLevels, setAnimatedLevels] = useState<number[]>(SKILLS.map(() => 0));
  const skillsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('landing-visible');
          }
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll('.landing-reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Skills bar animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !skillsVisible) {
          setSkillsVisible(true);
          SKILLS.forEach((skill, i) => {
            setTimeout(() => {
              setAnimatedLevels((prev) => {
                const next = [...prev];
                next[i] = skill.level;
                return next;
              });
            }, i * 120);
          });
        }
      },
      { threshold: 0.3 }
    );
    if (skillsRef.current) observer.observe(skillsRef.current);
    return () => observer.disconnect();
  }, [skillsVisible]);

  return (
    <div className="landing-page min-h-screen">
      <Landing3DScene scrollY={scrollY} />

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-blue-500/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            {/* Hexagonal Logo */}
            <svg width="36" height="36" viewBox="0 0 36 36" className="group-hover:rotate-12 transition-transform duration-300">
              <defs>
                <linearGradient id="hexGradDev" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
              <polygon
                points="18,2 32,10 32,26 18,34 4,26 4,10"
                fill="url(#hexGradDev)"
                opacity="0.9"
              />
              <polygon
                points="18,2 32,10 32,26 18,34 4,26 4,10"
                fill="none"
                stroke="rgba(96,165,250,0.5)"
                strokeWidth="1"
              />
              <text x="18" y="23" textAnchor="middle" fill="white" fontFamily="Orbitron,sans-serif" fontSize="14" fontWeight="900">L</text>
            </svg>
            <span className="font-orbitron font-bold text-lg tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
              LOGify
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-slate-400 hover:text-white text-sm transition-colors">← Home</Link>
            <Link to="/about-logify" className="text-slate-400 hover:text-white text-sm transition-colors">About LOGify</Link>
            <Link to="/login" className="px-4 py-2 rounded-lg text-sm font-bold border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition-all">Sign In</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 min-h-screen flex items-center justify-center px-6 pt-24">
        <div className="max-w-5xl mx-auto w-full">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Avatar / Profile Visual */}
            <div className="landing-reveal flex justify-center md:justify-end">
              <div className="relative">
                {/* Outer glow rings */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 blur-3xl scale-150" />
                <div className="relative w-64 h-64 rounded-full border-2 border-blue-500/30 flex items-center justify-center overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, rgba(30,41,59,0.9) 0%, rgba(15,23,42,0.9) 100%)' }}>
                  {/* Animated orbit rings */}
                  <div className="absolute inset-0 rounded-full border border-blue-500/20 animate-spin" style={{ animationDuration: '8s' }} />
                  <div className="absolute inset-4 rounded-full border border-cyan-500/15 animate-spin" style={{ animationDuration: '12s', animationDirection: 'reverse' }} />
                  {/* Initial */}
                  <div className="relative z-10 text-center">
                    <div className="text-7xl font-black font-orbitron text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-cyan-300 mb-2 landing-glow-text">
                      D
                    </div>
                    <div className="text-xs font-mono text-blue-400/70 tracking-widest">DEVELOPER</div>
                  </div>
                </div>
                {/* Status badge */}
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-emerald-500/30 text-xs font-mono text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Available for work
                </div>
              </div>
            </div>

            {/* Info */}
            <div>
              <div className="landing-reveal mb-3">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-400 text-xs font-mono tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  CREATOR OF LOGify
                </span>
              </div>
              <h1 className="landing-reveal font-orbitron text-4xl sm:text-5xl font-black text-white mb-2 leading-tight" style={{ transitionDelay: '0.1s' }}>
                Dhruvkumar
              </h1>
              <h1 className="landing-reveal font-orbitron text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 mb-5 leading-tight landing-glow-text" style={{ transitionDelay: '0.2s' }}>
                Mulani
              </h1>
              <p className="landing-reveal text-slate-400 leading-relaxed mb-5 text-sm" style={{ transitionDelay: '0.3s' }}>
                I'm a passionate developer, cybersecurity researcher, and open-source builder from India. 
                I build tools that turn complex infrastructure problems into beautiful, intuitive experiences. 
                LOGify is my flagship project — a platform born from the need to make server monitoring 
                as engaging as it is powerful.
              </p>
              <p className="landing-reveal text-slate-500 leading-relaxed mb-7 text-sm" style={{ transitionDelay: '0.4s' }}>
                My work lives at the intersection of <span className="text-blue-400">cybersecurity</span>, 
                <span className="text-cyan-400"> AI</span>, and <span className="text-purple-400"> 3D web experiences</span>. 
                I believe software should be both functional and visually stunning.
              </p>
              <div className="landing-reveal flex flex-wrap gap-3" style={{ transitionDelay: '0.5s' }}>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold bg-white/5 border border-slate-700 text-slate-300 hover:bg-white/10 hover:border-slate-500 transition-all">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                  GitHub
                </a>
                <Link to="/about-logify"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 shadow-lg shadow-blue-500/25 transition-all">
                  About LOGify →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Skills Section */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-4xl mx-auto" ref={skillsRef}>
          <div className="text-center mb-14">
            <h2 className="landing-reveal font-orbitron text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 mb-3">
              Tech Arsenal
            </h2>
            <p className="landing-reveal text-slate-400 text-sm" style={{ transitionDelay: '0.1s' }}>
              Skills honed through real-world projects
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {SKILLS.map((skill, i) => (
              <div key={skill.name} className="landing-reveal" style={{ transitionDelay: `${i * 0.07}s` }}>
                <div className="bg-slate-900/60 backdrop-blur border border-slate-700/40 rounded-xl p-5 hover:border-blue-500/20 transition-all">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium text-slate-300 font-mono">{skill.name}</span>
                    <span className="text-xs font-bold font-mono" style={{ color: skill.color }}>{animatedLevels[i]}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${animatedLevels[i]}%`,
                        background: `linear-gradient(90deg, ${skill.color}88, ${skill.color})`,
                        boxShadow: `0 0 8px ${skill.color}60`,
                        transitionDelay: `${i * 0.12}s`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="landing-reveal font-orbitron text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-3">
              What I Build
            </h2>
            <p className="landing-reveal text-slate-400 text-sm" style={{ transitionDelay: '0.1s' }}>
              Projects that push the boundaries of what's possible
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {PROJECTS.map((project, i) => (
              <div
                key={project.title}
                className="landing-reveal landing-3d-card bg-slate-900/60 backdrop-blur border border-slate-700/40 rounded-2xl p-6 hover:border-blue-500/20 transition-all"
                style={{ transitionDelay: `${i * 0.15}s` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono px-2.5 py-1 rounded-full border"
                    style={{ color: project.color, borderColor: `${project.color}30`, background: `${project.color}10` }}>
                    {project.badge}
                  </span>
                </div>
                <h3 className="font-orbitron font-bold text-white text-lg mb-3">{project.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-5">{project.desc}</p>
                <div className="flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <span key={tag} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vision / Quote */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="landing-reveal bg-gradient-to-br from-blue-500/5 to-cyan-500/5 border border-blue-500/15 rounded-2xl p-12 backdrop-blur-xl">
            <div className="text-5xl mb-6">💡</div>
            <blockquote className="font-orbitron text-xl font-bold text-white mb-6 leading-relaxed">
              "Software should be as beautiful as it is powerful. Every line of code is an opportunity to create something extraordinary."
            </blockquote>
            <div className="text-slate-400 text-sm font-mono">— Dhruvkumar Mulani, Creator of LOGify</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <svg width="28" height="28" viewBox="0 0 36 36">
              <defs>
                <linearGradient id="hexGradDevF" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
              <polygon points="18,2 32,10 32,26 18,34 4,26 4,10" fill="url(#hexGradDevF)" opacity="0.9" />
              <text x="18" y="23" textAnchor="middle" fill="white" fontFamily="Orbitron,sans-serif" fontSize="14" fontWeight="900">L</text>
            </svg>
            <span className="font-orbitron font-bold text-sm text-slate-400 tracking-wider">LOGify</span>
          </div>
          <p className="text-slate-600 text-xs font-mono">© 2026 LOGify · Crafted by Dhruvkumar Mulani · Open Source</p>
          <div className="flex gap-5">
            <Link to="/" className="text-slate-500 hover:text-slate-300 text-xs transition-colors">Home</Link>
            <Link to="/about-logify" className="text-slate-500 hover:text-slate-300 text-xs transition-colors">About LOGify</Link>
            <Link to="/login" className="text-slate-500 hover:text-slate-300 text-xs transition-colors">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AboutDeveloper;
