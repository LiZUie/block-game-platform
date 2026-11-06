import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '@blockgame/shared';
import { Gamepad2, Code2, ShieldCheck, UserCheck, LogOut, Sparkles } from 'lucide-react';

interface NavbarProps {
  currentView: 'catalog' | 'studio' | 'admin' | 'play';
  onNavigate: (view: 'catalog' | 'studio' | 'admin') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { user, switchQuickDemo, logout } = useAuth();

  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5"><ShieldCheck size={13} /> ADMIN (Cloud Owner)</span>;
      case UserRole.DEVELOPER:
        return <span className="bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5"><Code2 size={13} /> DEVELOPER (Game Maker)</span>;
      default:
        return <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5"><UserCheck size={13} /> PLAYER (Gamer)</span>;
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('catalog')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="font-extrabold text-white text-xl">B</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-xl tracking-tight text-white">BlockVerse</span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded font-mono">2D CLOUD</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-none">Cloud Game & Block Engine</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80">
          <button
            onClick={() => onNavigate('catalog')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              currentView === 'catalog' || currentView === 'play'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Gamepad2 size={16} />
            <span>Katalog Game</span>
          </button>

          {/* Sisi 2: Developer Studio (Hanya untuk Dev & Admin) */}
          <button
            onClick={() => onNavigate('studio')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              currentView === 'studio'
                ? 'bg-indigo-600 text-white shadow-sm'
                : user?.role === UserRole.PLAYER
                ? 'text-slate-600 cursor-not-allowed hover:bg-transparent'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
            title={user?.role === UserRole.PLAYER ? 'Hanya Developer & Admin yang bisa membuka Studio' : 'Buat Game Baru'}
          >
            <Code2 size={16} />
            <span>Studio Blok 2D</span>
            {user?.role === UserRole.PLAYER && (
              <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-mono">LOCKED</span>
            )}
          </button>

          {/* Sisi 1: Cloud Service Admin (Hanya untuk Admin) */}
          {user?.role === UserRole.ADMIN && (
            <button
              onClick={() => onNavigate('admin')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                currentView === 'admin'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-rose-400 hover:text-rose-200 hover:bg-rose-500/10'
              }`}
            >
              <ShieldCheck size={16} />
              <span>Cloud Admin</span>
            </button>
          )}
        </nav>

        {/* User Info & Logout (Hapus Uji Role Switcher) */}
        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-3">
              {getRoleBadge(user.role)}
              <span className="text-sm font-semibold text-slate-200 hidden sm:inline">{user.username}</span>

              {/* Tombol Logout */}
              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 text-xs font-semibold transition-all shadow-sm"
                title="Keluar dari akun (Logout)"
              >
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
