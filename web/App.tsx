import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';

// Pages
import Register from './src/pages/Register';
import Login from './src/pages/Login';
import VerifyEmail from './src/pages/VerifyEmail';
import Dashboard from './src/pages/Dashboard';
import ConnectionKeys from './src/pages/ConnectionKeys';
import Servers from './src/pages/Servers';
import Logs from './src/pages/Logs';
import Profile from './src/pages/Profile';
import LandingPage from './src/pages/LandingPage';
import AboutDeveloper from './src/pages/AboutDeveloper';
import AboutLogify from './src/pages/AboutLogify';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950">
        <div className="text-blue-400 animate-pulse font-orbitron">Loading...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Public Route Component (redirect to dashboard if already logged in)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950">
        <div className="text-blue-400 animate-pulse font-orbitron">Loading...</div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } />
          <Route path="/register" element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          } />
          <Route path="/verify-email" element={<VerifyEmail />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/keys" element={
            <ProtectedRoute>
              <ConnectionKeys />
            </ProtectedRoute>
          } />
          <Route path="/servers" element={
            <ProtectedRoute>
              <Servers />
            </ProtectedRoute>
          } />
          <Route path="/logs" element={
            <ProtectedRoute>
              <Logs />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          
          {/* Public Landing Page & Info Pages */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/about-me" element={<AboutDeveloper />} />
          <Route path="/about-logify" element={<AboutLogify />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
