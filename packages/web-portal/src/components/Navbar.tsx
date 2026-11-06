import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '@blockgame/shared';
import { Gamepad2, Code2, ShieldCheck } from 'lucide-react';
import { ProfileDropdown } from './ProfileDropdown';

interface NavbarProps {
  currentView: 'catalog' | 'studio' | 'admin' | 'play';
  onNavigate: (view: 'catalog' | 'studio' | 'admin') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { user } = useAuth();

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

          {/* Sisi 2: Developer Studio (Hanya untuk Developer Aktif & Admin, User/Player tidak ditampilkan) */}
          {(user?.role === UserRole.DEVELOPER || user?.role === UserRole.ADMIN) && (
            <button
              onClick={() => onNavigate('studio')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                currentView === 'studio'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
              title="Buka Scratch Studio 2D"
            >
              <Code2 size={16} />
              <span>Studio Blok 2D</span>
            </button>
          )}

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

        {/* User Profile Menu (Dropdown Profil & Logout) */}
        <div className="flex items-center gap-3">
          <ProfileDropdown />
        </div>

      </div>
    </header>
  );
};
