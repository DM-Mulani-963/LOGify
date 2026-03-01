import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { HexLogo } from '../components/LandingNav';

type Step = 'email' | 'code' | 'done';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const { sendResetPasswordEmail, exchangeResetPasswordToken, resetPassword } = useAuth();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetToken, setResetToken] = useState('');

  // Password strength
  const strength = (p: string) => {
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  };
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColor = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
  const pw_strength = strength(newPassword);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await sendResetPasswordEmail(email);
      setStep('code');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (pw_strength < 2) {
      setError('Password is too weak');
      return;
    }
    setLoading(true);
    try {
      const token = await exchangeResetPasswordToken(email, code);
      await resetPassword(newPassword, token);
      setStep('done');
    } catch (err: any) {
      setError(err.message || 'Invalid code or reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Grid bg */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px)`,
        backgroundSize: '50px 50px',
      }} />
      {/* Glow */}
      <div className="absolute pointer-events-none" style={{ top: '-20%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)' }} />

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div style={{ filter: 'drop-shadow(0 0 20px rgba(59,130,246,0.4))' }}>
            <HexLogo size={52} />
          </div>
          <h1 className="font-orbitron font-black text-3xl text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-cyan-300 mt-3 tracking-widest">
            LOGify
          </h1>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-8 shadow-2xl shadow-blue-500/5">

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {(['email', 'code', 'done'] as Step[]).map((s, i) => (
              <React.Fragment key={s}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${step === s ? 'bg-blue-500 text-white' : (i < ['email','code','done'].indexOf(step) ? 'bg-blue-500/30 text-blue-400' : 'bg-slate-800 text-slate-600')}`}>
                  {i < ['email','code','done'].indexOf(step) ? '✓' : i + 1}
                </div>
                {i < 2 && <div className={`h-px w-8 transition-all ${i < ['email','code','done'].indexOf(step) ? 'bg-blue-500/50' : 'bg-slate-700'}`} />}
              </React.Fragment>
            ))}
          </div>

          {error && (
            <div className="mb-5 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-start gap-2">
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          {/* ── Step 1: Enter Email ── */}
          {step === 'email' && (
            <>
              <div className="mb-6">
                <h2 className="font-orbitron font-black text-2xl text-white mb-2">Forgot Password</h2>
                <p className="text-slate-400 text-sm">Enter your email and we'll send a reset code.</p>
              </div>
              <form onSubmit={handleSendEmail} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 tracking-widest">EMAIL ADDRESS</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">✉️</span>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      placeholder="your@email.com"
                      className="w-full bg-black/40 border border-slate-700 hover:border-slate-600 focus:border-blue-500/60 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full py-3.5 rounded-xl font-bold text-sm tracking-widest bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '⟳ Sending...' : 'SEND RESET CODE →'}
                </button>
              </form>
            </>
          )}

          {/* ── Step 2: Enter Code + New Password ── */}
          {step === 'code' && (
            <>
              <div className="mb-6">
                <h2 className="font-orbitron font-black text-2xl text-white mb-2">Enter Reset Code</h2>
                <p className="text-slate-400 text-sm">Check <span className="text-blue-400">{email}</span> for a 6-digit code, then set your new password.</p>
              </div>
              <form onSubmit={handleVerifyCode} className="space-y-5">
                {/* OTP Code */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 tracking-widest">6-DIGIT CODE</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={code}
                    onChange={e => {
                      // Allow only digits, but don't use inputMode=numeric which breaks IME
                      const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                      setCode(val);
                    }}
                    required
                    placeholder="123456"
                    pattern="[0-9]{6}"
                    className="w-full bg-black/40 border border-slate-700 hover:border-slate-600 focus:border-blue-500/60 rounded-xl py-3 px-4 text-center text-2xl font-mono font-black tracking-[0.5em] text-white placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all"
                  />
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 tracking-widest">NEW PASSWORD</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔒</span>
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      required
                      placeholder="Min 8 chars, uppercase, number"
                      className="w-full bg-black/40 border border-slate-700 hover:border-slate-600 focus:border-blue-500/60 rounded-xl py-3 pl-11 pr-12 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all"
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                      {showPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {/* Strength meter */}
                  {newPassword && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1,2,3,4].map(i => (
                          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= pw_strength ? strengthColor[pw_strength] : 'bg-slate-700'}`} />
                        ))}
                      </div>
                      <p className={`text-[10px] font-mono ${pw_strength >= 3 ? 'text-green-400' : pw_strength >= 2 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {strengthLabel[pw_strength]} password
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 tracking-widest">CONFIRM PASSWORD</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔒</span>
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Repeat new password"
                      className={`w-full bg-black/40 border rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none transition-all ${confirmPassword && confirmPassword !== newPassword ? 'border-red-500/60' : 'border-slate-700 hover:border-slate-600 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20'}`}
                    />
                  </div>
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="text-[10px] text-red-400 mt-1 font-mono">Passwords don't match</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || code.length < 6 || !newPassword || newPassword !== confirmPassword}
                  className="w-full py-3.5 rounded-xl font-bold text-sm tracking-widest bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '⟳ Resetting...' : 'RESET PASSWORD →'}
                </button>

                <button type="button" onClick={() => { setStep('email'); setError(''); }}
                  className="w-full text-xs text-slate-600 hover:text-slate-400 transition-colors">
                  ← Use a different email
                </button>
              </form>
            </>
          )}

          {/* ── Step 3: Done ── */}
          {step === 'done' && (
            <div className="text-center py-4">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="font-orbitron font-black text-2xl text-white mb-2">Password Reset!</h2>
              <p className="text-slate-400 text-sm mb-8">Your password has been successfully changed. You can now login with your new password.</p>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3.5 rounded-xl font-bold text-sm tracking-widest bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 shadow-lg shadow-blue-500/20 transition-all"
              >
                GO TO LOGIN →
              </button>
            </div>
          )}

          {/* Footer links */}
          {step !== 'done' && (
            <div className="mt-6 flex items-center justify-between text-xs">
              <Link to="/login" className="text-slate-600 hover:text-slate-400 transition-colors">← Back to Login</Link>
              <Link to="/register" className="text-slate-600 hover:text-slate-400 transition-colors">Create account →</Link>
            </div>
          )}
        </div>

        <p className="text-center text-slate-700 text-xs font-mono mt-6 flex items-center justify-center gap-2">
          <span>🔐</span> Reset codes expire in 15 minutes
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
