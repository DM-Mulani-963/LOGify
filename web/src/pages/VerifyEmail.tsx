import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import insforgeClient from '../config/insforge';

const VerifyEmail: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';
  
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error } = await insforgeClient.auth.verifyEmail({
        email,
        otp
      });

      if (error) throw error;

      if (data?.accessToken) {
        // Email verified and logged in
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError('');

    try {
      const { error } = await insforgeClient.auth.resendVerificationEmail({
        email
      });

      if (error) throw error;

      alert('Verification code resent! Check your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black font-orbitron text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-blue-600 mb-2">
            Verify Email
          </h1>
          <p className="text-slate-400">
            We sent a 6-digit code to <strong className="text-blue-400">{email}</strong>
          </p>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-md border border-blue-500/20 rounded-lg p-8">
          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2">VERIFICATION CODE</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                maxLength={6}
                pattern="[0-9]{6}"
                className="w-full bg-black/40 border border-blue-500/20 rounded py-3 px-4 text-2xl text-center tracking-[0.5em] font-mono focus:outline-none focus:border-blue-500/50 transition-all"
                placeholder="000000"
              />
              <p className="text-slate-500 text-xs mt-2">Enter the 6-digit code from your email</p>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 rounded font-bold text-sm tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'VERIFYING...' : 'VERIFY EMAIL'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-sm text-slate-400 hover:text-blue-400 transition-colors disabled:opacity-50"
            >
              {resending ? 'Sending...' : 'Didn\'t receive code? Resend'}
            </button>
          </div>

          <div className="mt-6 text-center text-sm text-slate-400">
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-bold">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
