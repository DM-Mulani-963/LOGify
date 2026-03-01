import React, { ReactNode, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { HexLogo } from './LandingNav';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Connection Keys', path: '/keys', icon: '🔑' },
    { name: 'Servers', path: '/servers', icon: '🖥️' },
    { name: 'Logs', path: '/logs', icon: '📝' },
    { name: 'Alerts', path: '/alerts', icon: '🚨' },
    { name: 'Profile', path: '/profile', icon: '👤' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Scan line effect */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-blue-500/30 animate-[scan_4s_linear_infinite]" />

      {/* Logo */}
      <header className="mb-8 relative">
        <div className="absolute -left-6 top-1 w-1 h-8 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
        <button
          onClick={() => { setSidebarOpen(false); navigate('/dashboard'); }}
          className="flex items-center gap-3 group"
        >
          <div className="group-hover:scale-105 transition-transform" style={{ filter: 'drop-shadow(0 0 8px rgba(59,130,246,0.4))' }}>
            <HexLogo size={32} />
          </div>
          <div>
            <h1 className="text-xl font-black font-orbitron tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-blue-600">
              LOGify
            </h1>
            <p className="text-[8px] text-blue-400/50 font-mono tracking-widest">CLOUD MANAGEMENT v2.0</p>
          </div>
        </button>
      </header>

      {/* Navigation */}
      <nav className="flex-grow space-y-1.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm font-mono flex items-center gap-3 group ${
                isActive
                  ? 'border-blue-500/30 bg-blue-500/15 text-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.08)]'
                  : 'border-transparent hover:border-blue-500/10 bg-blue-500/0 hover:bg-blue-500/10 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span className="transition-colors">{item.name}</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_6px_rgba(59,130,246,0.8)]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Mobile-only: close button */}
      <button
        onClick={() => setSidebarOpen(false)}
        className="lg:hidden mt-4 w-full py-3 text-xs font-mono text-slate-600 hover:text-slate-400 transition-colors border border-slate-800 rounded-xl"
      >
        ← CLOSE MENU
      </button>

      {/* User Info */}
      <footer className="mt-auto pt-5 border-t border-blue-500/10">
        <div className="flex items-center gap-3 mb-4 px-1">
          <div className="relative flex-shrink-0">
            {(user as any)?.avatar_url ? (
              <img
                src={(user as any).avatar_url}
                alt="Avatar"
                className="w-9 h-9 rounded-full border-2 border-blue-500/30 object-cover"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-blue-500/20 border-2 border-blue-500/30 flex items-center justify-center text-base">
                👤
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-900 rounded-full" />
          </div>
          <div className="text-left overflow-hidden">
            <p className="text-sm font-medium text-gray-200 truncate">
              {(user as any)?.full_name || user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full px-4 py-2.5 text-[10px] font-black tracking-widest border border-red-500/20 rounded-xl bg-red-500/5 hover:bg-red-500/15 hover:border-red-500/30 transition-all text-red-400 hover:text-red-300"
        >
          ⏻ LOGOUT
        </button>
      </footer>
    </div>
  );

  return (
    <div className="h-screen w-screen flex bg-slate-950 text-slate-200 overflow-hidden">

      {/* ====== MOBILE TOP BAR ====== */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-slate-950/95 backdrop-blur border-b border-slate-800">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          aria-label="Open menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center gap-2.5">
          <HexLogo size={28} />
          <span className="font-orbitron font-black text-base text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">LOGify</span>
        </div>

        {(user as any)?.avatar_url ? (
          <img src={(user as any).avatar_url} alt="Avatar" className="w-8 h-8 rounded-full border border-blue-500/30" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm">👤</div>
        )}
      </div>

      {/* ====== MOBILE DRAWER OVERLAY ====== */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ====== SIDEBAR (desktop: static | mobile: drawer) ====== */}
      <aside
        className={`
          fixed lg:static top-0 left-0 h-full z-50
          w-72 lg:w-64
          flex-shrink-0 flex flex-col
          border-r border-blue-500/10
          bg-slate-900/95 lg:bg-slate-900/40
          backdrop-blur-2xl
          p-6 shadow-2xl
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          relative overflow-hidden
        `}
      >
        <SidebarContent />
      </aside>

      {/* ====== MAIN CONTENT ====== */}
      <main className="flex-grow overflow-auto pt-14 lg:pt-0">
        {children}
      </main>

      <style>{`
        @keyframes scan {
          0% { top: 0; }
          100% { top: 100%; }
        }
      `}</style>
    </div>
  );
};

export default Layout;
