import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

interface LandingNavProps {
  activeSection?: string;
}

// Hexagonal Logo SVG component
export const HexLogo: React.FC<{ size?: number; className?: string }> = ({ size = 36, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" className={className}>
    <defs>
      <linearGradient id="hexLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#06b6d4" />
      </linearGradient>
      <filter id="hexGlow">
        <feGaussianBlur stdDeviation="1" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    {/* Outer glow */}
    <polygon
      points="18,1 33,9.5 33,26.5 18,35 3,26.5 3,9.5"
      fill="url(#hexLogoGrad)"
      opacity="0.15"
    />
    {/* Main hexagon */}
    <polygon
      points="18,3 31,10.5 31,25.5 18,33 5,25.5 5,10.5"
      fill="url(#hexLogoGrad)"
      opacity="0.92"
    />
    {/* Border */}
    <polygon
      points="18,3 31,10.5 31,25.5 18,33 5,25.5 5,10.5"
      fill="none"
      stroke="rgba(147,210,255,0.35)"
      strokeWidth="0.8"
    />
    {/* Inner hex ring */}
    <polygon
      points="18,7 27,12 27,24 18,29 9,24 9,12"
      fill="none"
      stroke="rgba(255,255,255,0.1)"
      strokeWidth="0.5"
    />
    {/* L letter */}
    <text
      x="18"
      y="24"
      textAnchor="middle"
      fill="white"
      fontFamily="Orbitron, sans-serif"
      fontSize="14"
      fontWeight="900"
      style={{ letterSpacing: '-1px' }}
    >
      L
    </text>
  </svg>
);

const LandingNav: React.FC<LandingNavProps> = ({ activeSection }) => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    if (!isLandingPage) {
      navigate('/');
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
    setMenuOpen(false);
  };

  const scrollNavLinks = [
    { id: 'hero', label: 'Home' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'features', label: 'Features' },
    { id: 'how-it-works', label: 'How It Works' },
  ];

  const routeNavLinks = [
    { href: '/about-logify', label: 'About LOGify' },
    { href: '/about-me', label: 'Developer' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-slate-950/90 backdrop-blur-xl border-b border-blue-500/10 shadow-lg shadow-blue-500/5'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <button onClick={() => scrollToSection('hero')} className="flex items-center gap-3 group">
          <HexLogo size={36} className="group-hover:rotate-12 group-hover:scale-105 transition-all duration-300 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
          <span className="font-orbitron font-bold text-lg tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
            LOGify
          </span>
        </button>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {scrollNavLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => scrollToSection(link.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                activeSection === link.id && isLandingPage
                  ? 'text-blue-400 bg-blue-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {link.label}
            </button>
          ))}
          {/* Divider */}
          <span className="w-px h-5 bg-slate-700 mx-2" />
          {routeNavLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                location.pathname === link.href
                  ? 'text-cyan-400 bg-cyan-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Auth Buttons + Mobile Toggle */}
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="px-5 py-2.5 rounded-lg text-sm font-bold tracking-wider transition-all duration-300 border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/60 hover:shadow-lg hover:shadow-blue-500/10"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="hidden sm:inline-flex px-5 py-2.5 rounded-lg text-sm font-bold tracking-wider transition-all duration-300 bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
          >
            Get Started
          </Link>

          {/* Mobile toggle */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-slate-950/97 backdrop-blur-xl border-t border-slate-800 px-6 pb-5">
          <div className="pt-3 space-y-1">
            {scrollNavLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                className="block w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all"
              >
                {link.label}
              </button>
            ))}
            <div className="my-3 border-t border-slate-800" />
            {routeNavLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-3 rounded-lg text-sm font-medium text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/5 transition-all"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <Link
            to="/register"
            onClick={() => setMenuOpen(false)}
            className="block w-full text-center mt-4 px-5 py-2.5 rounded-lg text-sm font-bold tracking-wider bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
          >
            Get Started
          </Link>
        </div>
      )}
    </nav>
  );
};

export default LandingNav;
