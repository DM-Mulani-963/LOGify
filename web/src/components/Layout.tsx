import React, { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Connection Keys', path: '/keys', icon: '🔑' },
    { name: 'Servers', path: '/servers', icon: '🖥️' },
    { name: 'Logs', path: '/logs', icon: '📝' },
    { name: 'Profile', path: '/profile', icon: '👤' }
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="h-screen w-screen flex bg-slate-950 text-slate-200">
      {/* Sidebar */}
      <aside className="w-64 h-full border-r border-blue-500/10 bg-slate-900/40 backdrop-blur-2xl flex flex-col p-6 shadow-2xl relative overflow-hidden">
        {/* Scan line effect */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-blue-500/20 animate-[scan_4s_linear_infinite]"></div>
        
        {/* Logo */}
        <header className="mb-10 relative">
          <div className="absolute -left-6 top-1 w-1 h-8 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
          <h1 className="text-3xl font-black font-orbitron tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-blue-600 italic">
            LOGify
          </h1>
          <p className="text-[9px] text-blue-400/60 font-mono tracking-widest uppercase mt-1">
            Cloud Management v2.0
          </p>
        </header>

        {/* Navigation */}
        <nav className="flex-grow space-y-2">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="w-full text-left px-4 py-3 rounded border border-blue-500/10 bg-blue-500/5 hover:bg-blue-500/20 transition-all text-sm font-mono flex items-center gap-3 group"
            >
              <span className="text-lg">{item.icon}</span>
              <span className="group-hover:text-blue-400 transition-colors">{item.name}</span>
            </button>
          ))}
        </nav>

        {/* User Info */}
        <footer className="mt-auto pt-6 border-t border-blue-500/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
                {(user as any)?.avatar_url ? (
                  <img 
                    src={(user as any).avatar_url} 
                    alt="Avatar"
                    className="w-10 h-10 rounded-full border-2 border-blue-500/30 object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 border-2 border-blue-500/30 flex items-center justify-center text-lg">
                    👤
                  </div>
                )}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-200">
                  {(user as any)?.full_name || user?.email || 'User'}
                </p>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
            </div>
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-[10px] font-black tracking-widest border border-red-500/20 rounded bg-red-500/5 hover:bg-red-500/20 transition-all text-red-400"
          >
            LOGOUT
          </button>
        </footer>
      </aside>

      {/* Main Content */}
      <main className="flex-grow overflow-auto">
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
