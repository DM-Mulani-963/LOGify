import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { HexLogo } from '../components/LandingNav';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { signup, loginWithGoogle } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Password strength
  const getStrength = (p: string) => {
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  };
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColor = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
  const pwStrength = getStrength(password);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(email, password, name);
      navigate('/verify-email', { state: { email } });
    } catch (err: any) {
      if (err.message?.includes('verify')) {
        navigate('/verify-email', { state: { email } });
      } else {
        setError(err.message || 'Registration failed');
        setLoading(false);
      }
    }
  };

  const handleGoogleSignup = async () => {
    setError('');
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google signup failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex overflow-hidden relative">
      {/* Grid background */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px)`,
        backgroundSize: '50px 50px',
      }} />
      <div className="absolute pointer-events-none" style={{ top: '-10%', left: '-5%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)' }} />
      <div className="absolute pointer-events-none" style={{ bottom: '-10%', right: '-5%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)' }} />

      {/* Left hero (desktop) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative border-r border-slate-800/60">
        <div className="absolute top-8 left-8 w-10 h-10 border-l-2 border-t-2 border-blue-500/30" />
        <div className="absolute top-8 right-8 w-10 h-10 border-r-2 border-t-2 border-blue-500/30" />
        <div className="absolute bottom-8 left-8 w-10 h-10 border-l-2 border-b-2 border-blue-500/30" />
        <div className="absolute bottom-8 right-8 w-10 h-10 border-r-2 border-b-2 border-cyan-500/30" />

        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-4 mb-6" style={{ filter: 'drop-shadow(0 0 30px rgba(59,130,246,0.4))' }}>
            <HexLogo size={72} />
          </div>
          <h1 className="font-orbitron font-black text-5xl text-transparent bg-clip-text bg-gradient-to-br from-blue-400 via-cyan-300 to-blue-600 tracking-widest mb-3">LOGify</h1>
          <p className="text-slate-400 font-mono text-sm tracking-wider">HOLOGRAPHIC LOG MANAGEMENT PLATFORM</p>
        </div>

        <div className="space-y-4 w-full max-w-xs">
          {[
            { icon: '🛡️', label: 'Real-Time Threat Detection', sub: 'AI-powered security alerts' },
            { icon: '📊', label: 'Full Log Visibility', sub: 'All servers, one dashboard' },
            { icon: '🌐', label: 'Multi-Server Support', sub: 'Connect unlimited agents' },
          ].map(f => (
            <div key={f.label} className="flex items-center gap-4 bg-slate-900/60 border border-slate-800 rounded-xl px-5 py-4 hover:border-blue-500/20 transition-all">
              <span className="text-2xl">{f.icon}</span>
              <div>
                <p className="text-white text-sm font-bold">{f.label}</p>
                <p className="text-slate-500 text-xs font-mono">{f.sub}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex items-center gap-2 px-5 py-2.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          FREE TO USE — NO CREDIT CARD REQUIRED
        </div>
      </div>

      {/* Right form panel */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-10">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-8">
          <div style={{ filter: 'drop-shadow(0 0 16px rgba(59,130,246,0.5))' }}><HexLogo size={44} /></div>
          <span className="font-orbitron font-black text-2xl text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">LOGify</span>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="font-orbitron font-black text-3xl sm:text-4xl text-white mb-2">Create Account</h2>
            <p className="text-slate-400 text-sm">Set up your LOGify command center</p>
          </div>

          <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-7 sm:p-8 shadow-2xl shadow-blue-500/5">

            {error && (
              <div className="mb-5 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-start gap-3">
                <span className="text-base mt-0.5">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Google button */}
            <button
              onClick={handleGoogleSignup}
              className="w-full py-3.5 bg-white/5 hover:bg-white/10 border border-slate-700 hover:border-slate-500 rounded-xl font-bold text-sm tracking-wider transition-all flex items-center justify-center gap-3 mb-6 group"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="text-slate-300 group-hover:text-white transition-colors">CONTINUE WITH GOOGLE</span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-slate-800" />
              <span className="text-xs text-slate-600 font-mono">OR REGISTER WITH EMAIL</span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>

            {/* Form */}
            <form onSubmit={handleRegister} className="space-y-5">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 tracking-widest">FULL NAME</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">👤</span>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full bg-black/40 border border-slate-700 hover:border-slate-600 focus:border-blue-500/60 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 tracking-widest">EMAIL</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">✉️</span>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="your@email.com"
                    autoComplete="email"
                    className="w-full bg-black/40 border border-slate-700 hover:border-slate-600 focus:border-blue-500/60 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 tracking-widest">PASSWORD</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔒</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                    className="w-full bg-black/40 border border-slate-700 hover:border-slate-600 focus:border-blue-500/60 rounded-xl py-3 pl-11 pr-12 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-sm transition-colors"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {/* Strength meter */}
                {password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= pwStrength ? strengthColor[pwStrength] : 'bg-slate-700'}`} />
                      ))}
                    </div>
                    <p className={`text-[10px] font-mono ${pwStrength >= 3 ? 'text-green-400' : pwStrength >= 2 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {strengthLabel[pwStrength]} password
                    </p>
                  </div>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-bold text-sm tracking-widest bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                    CREATING ACCOUNT...
                  </span>
                ) : 'CREATE ACCOUNT →'}
              </button>
            </form>

            {/* Footer links */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
              <Link to="/" className="text-slate-600 hover:text-slate-400 text-xs transition-colors">← Back to Home</Link>
              <span className="text-slate-600 text-xs">
                Already have an account?{' '}
                <Link to="/login" className="text-blue-400 hover:text-blue-300 font-bold transition-colors">Sign in →</Link>
              </span>
            </div>
          </div>

          <p className="text-center text-slate-700 text-xs font-mono mt-6 flex items-center justify-center gap-2">
            <span>🔐</span> Secured with end-to-end encryption
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
