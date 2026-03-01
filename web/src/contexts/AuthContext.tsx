/// <reference types="vite/client" />

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import insforgeClient from '../config/insforge';

interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  profile?: {
    name?: string;
    avatar_url?: string;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  sendResetPasswordEmail: (email: string) => Promise<void>;
  exchangeResetPasswordToken: (email: string, code: string) => Promise<string>;
  resetPassword: (newPassword: string, otp: string) => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Retry helper ─────────────────────────────────────────────────────────────
// Retries a promise-returning function up to `maxAttempts` times, with
// exponential back-off starting at `baseDelayMs`.  Only retries on
// timeout / network errors — auth errors (4xx) are re-thrown immediately.
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const msg = (err?.message || '').toLowerCase();
      const isNetworkError =
        msg.includes('timeout') ||
        msg.includes('connection terminated') ||
        msg.includes('network') ||
        msg.includes('failed to fetch') ||
        err?.statusCode === 0 ||
        err?.statusCode >= 500;

      // Don't retry auth/business errors
      if (!isNetworkError) throw err;

      if (attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1); // 1 s, 2 s, 4 s
        console.warn(`[Auth] Attempt ${attempt} failed (${msg}). Retrying in ${delay}ms…`);
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }
  throw lastErr;
}

// ─── Session storage helpers ───────────────────────────────────────────────────
const SESSION_KEY = 'logify_session_user';

function saveUserToStorage(user: User | null) {
  if (user) {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(user)); } catch {}
  } else {
    try { localStorage.removeItem(SESSION_KEY); } catch {}
  }
}

function loadUserFromStorage(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Optimistic initial user from storage — prevents flash of "logged out"
  const [user, setUser] = useState<User | null>(loadUserFromStorage);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Schedule a token refresh before expiry ──────────────────────────────────
  const scheduleRefresh = (expiresAt?: Date | string | null) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    if (!expiresAt) return;

    const expMs = new Date(expiresAt).getTime();
    const nowMs = Date.now();
    // Refresh 2 minutes before expiry (min 30 s, max 55 min)
    const refreshIn = Math.min(Math.max(expMs - nowMs - 2 * 60 * 1000, 30_000), 55 * 60_000);
    refreshTimerRef.current = setTimeout(() => refreshSession(), refreshIn);
  };

  // ── Refresh session ─────────────────────────────────────────────────────────
  const refreshSession = async () => {
    try {
      const { data, error } = await withRetry(() => insforgeClient.auth.getCurrentSession());
      if (error || !data?.session) {
        // Session truly gone — log out silently
        setUser(null);
        saveUserToStorage(null);
        return;
      }
      const u = data.session.user as User;
      setUser(u);
      saveUserToStorage(u);
      scheduleRefresh(data.session.expiresAt);
    } catch {
      // On repeated network failure keep user logged in temporarily
    }
  };

  // ── On mount: restore session ───────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await withRetry(() => insforgeClient.auth.getCurrentSession());
        if (cancelled) return;

        if (!error && data?.session) {
          const u = data.session.user as User;
          setUser(u);
          saveUserToStorage(u);
          scheduleRefresh(data.session.expiresAt);
        } else {
          // No valid server session — clear stale storage
          setUser(null);
          saveUserToStorage(null);
        }
      } catch {
        // Network down at startup — keep whatever was in storage
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // ── Cleanup timer on unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  // ── Login ───────────────────────────────────────────────────────────────────
  const login = async (email: string, password: string) => {
    const { data, error } = await withRetry(() =>
      insforgeClient.auth.signInWithPassword({ email, password })
    );
    if (error) throw error;
    if (data?.user) {
      const u = data.user as User;
      setUser(u);
      saveUserToStorage(u);
      // Session expires in ~1 hour typically; re-check to get expiresAt
      scheduleRefresh((data as any)?.expiresAt ?? null);
    }
  };

  // ── Google OAuth ────────────────────────────────────────────────────────────
  const loginWithGoogle = async () => {
    const { error } = await withRetry(() =>
      insforgeClient.auth.signInWithOAuth({
        provider: 'google',
        redirectTo: window.location.origin + '/dashboard',
      })
    );
    if (error) throw error;
    // OAuth redirects automatically — session will be restored on return
  };

  // ── Sign up ─────────────────────────────────────────────────────────────────
  const signup = async (email: string, password: string, name?: string) => {
    const { data, error } = await withRetry(() =>
      insforgeClient.auth.signUp({ email, password, name })
    );
    if (error) throw error;
    if (data?.requireEmailVerification) {
      throw new Error('Please verify your email before logging in');
    }
    if (data?.user) {
      const u = data.user as User;
      setUser(u);
      saveUserToStorage(u);
    }
  };

  // ── Logout ──────────────────────────────────────────────────────────────────
  const logout = async () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    const { error } = await insforgeClient.auth.signOut();
    if (error) throw error;
    setUser(null);
    saveUserToStorage(null);
  };

  // ── Password reset ──────────────────────────────────────────────────────────
  const sendResetPasswordEmail = async (email: string) => {
    const { data, error } = await withRetry(() =>
      insforgeClient.auth.sendResetPasswordEmail({ email })
    );
    if (error) throw error;
    if (!data?.success) throw new Error('Failed to send reset email');
  };

  const exchangeResetPasswordToken = async (email: string, code: string): Promise<string> => {
    const { data, error } = await withRetry(() =>
      insforgeClient.auth.exchangeResetPasswordToken({ email, code })
    );
    if (error) throw error;
    if (!data?.token) throw new Error('Invalid or expired code');
    return data.token;
  };

  const resetPassword = async (newPassword: string, otp: string) => {
    const { error } = await withRetry(() =>
      insforgeClient.auth.resetPassword({ newPassword, otp })
    );
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        loginWithGoogle,
        signup,
        logout,
        sendResetPasswordEmail,
        exchangeResetPasswordToken,
        resetPassword,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
