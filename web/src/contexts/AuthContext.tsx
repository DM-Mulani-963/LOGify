/// <reference types="vite/client" />

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const { data, error } = await insforgeClient.auth.getCurrentSession();
      if (error) throw error;
      if (data?.session) {
        setUser(data.session.user as User);
      }
    } catch (error) {
      console.error('Session check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const { data, error } = await insforgeClient.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    if (data?.user) {
      setUser(data.user as User);
    }
  };

  const loginWithGoogle = async () => {
    const { error } = await insforgeClient.auth.signInWithOAuth({
      provider: 'google',
      redirectTo: window.location.origin + '/dashboard'
    });
    
    if (error) throw error;
    // OAuth redirects automatically
  };

  const signup = async (email: string, password: string, name?: string) => {
    const { data, error } = await insforgeClient.auth.signUp({
      email,
      password,
      name
    });
    
    if (error) throw error;
    
    if (data?.requireEmailVerification) {
      throw new Error('Please verify your email before logging in');
    }
    
    if (data?.user) {
      setUser(data.user as User);
    }
  };

  const logout = async () => {
    const { error } = await insforgeClient.auth.signOut();
    if (error) throw error;
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, signup, logout }}>
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
