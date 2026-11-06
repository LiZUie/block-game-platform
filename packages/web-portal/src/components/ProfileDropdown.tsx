import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '@blockgame/shared';
import { 
  User, Mail, ShieldCheck, Code2, UserCheck, 
  LogOut, ChevronDown, Calendar, Hash, CheckCircle2, 
  Clock, AlertCircle, Sparkles, Shield
} from 'lucide-react';

export const ProfileDropdown: React.FC = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!user) return null;

  // Avatar background colors based on role
  const getAvatarGradient = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'from-rose-600 via-rose-500 to-amber-500 shadow-rose-500/20';
      case UserRole.DEVELOPER:
        return 'from-sky-600 via-indigo-500 to-cyan-400 shadow-sky-500/20';
      default:
        return 'from-emerald-600 via-emerald-500 to-teal-400 shadow-emerald-500/20';
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return (
          <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
            <ShieldCheck size={11} /> ADMIN
          </span>
        );
      case UserRole.DEVELOPER:
        return (
          <span className="bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
            <Code2 size={11} /> DEVELOPER
          </span>
        );
      default:
        return (
          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
            <UserCheck size={11} /> PLAYER
          </span>
        );
    }
  };

  const getRolePrivilegesDescription = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'Kontrol penuh server cloud, persetujuan akun developer, dan moderasi game.';
      case UserRole.DEVELOPER:
        return 'Akses Scratch 3.0 Studio, playtest simulator, dan mempublikasikan game ke cloud.';
      default:
        return 'Bermain game 2D di browser, kontrol virtual gamepad, dan mencatat rekor leaderboard.';
    }
  };

  const initialLetter = (user.username || 'U').charAt(0).toUpperCase();

  return (
    <div className="relative" ref={dropdownRef}>
      
      {/* Trigger Button: User Profile Chip */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl border transition-all text-left ${
          isOpen
            ? 'bg-slate-800 border-indigo-500/50 shadow-lg shadow-indigo-500/10'
            : 'bg-slate-900/90 hover:bg-slate-800/80 border-slate-700/80 hover:border-slate-600'
        }`}
        title="Klik untuk membuka Menu Profil & Logout"
      >
        {/* Avatar Circle */}
        <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${getAvatarGradient(user.role)} flex items-center justify-center font-black text-white text-xs shadow-md shrink-0`}>
          {initialLetter}
        </div>

        {/* User Info (Hidden on very small screens) */}
        <div className="hidden sm:flex flex-col">
          <span className="text-xs font-bold text-slate-100 leading-tight truncate max-w-[120px]">
            {user.username}
          </span>
          <span className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">
            {user.role}
          </span>
        </div>

        {/* Chevron Icon */}
        <ChevronDown 
          size={14} 
          className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-400' : ''}`} 
        />
      </button>

      {/* Floating Profile Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-80 bg-slate-900/95 backdrop-blur-2xl border border-slate-700/80 rounded-3xl shadow-2xl shadow-black/60 p-4 text-slate-200 z-50 animate-in fade-in zoom-in-95 duration-150 select-none space-y-4">
          
          {/* 1. Header Profile Card */}
          <div className="flex items-center gap-3 pb-3.5 border-b border-slate-800">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${getAvatarGradient(user.role)} flex items-center justify-center font-black text-white text-lg shadow-lg shrink-0`}>
              {initialLetter}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-white truncate" title={user.username}>
                  {user.username}
                </h3>
              </div>
              <p className="text-xs text-slate-400 font-mono truncate" title={user.email}>
                {user.email}
              </p>
              
              <div className="flex items-center gap-1.5 mt-1">
                {getRoleBadge(user.role)}
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-bold uppercase ${
                  user.status === 'ACTIVE' || !user.status
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {user.status || 'ACTIVE'}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Account Details & Metadata */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5 text-[11px]">
                <Hash size={13} className="text-slate-500" /> User ID
              </span>
              <span className="font-mono text-[10px] text-slate-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                {user.id}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5 text-[11px]">
                <Calendar size={13} className="text-slate-500" /> Bergabung
              </span>
              <span className="font-mono text-[11px] text-slate-300">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) : 'Nov 2026'}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 leading-relaxed">
              <span className="font-semibold text-slate-300 block mb-0.5 flex items-center gap-1">
                <Shield size={11} className="text-indigo-400" /> Hak Akses Akun:
              </span>
              <span>{getRolePrivilegesDescription(user.role)}</span>
            </div>
          </div>

          {/* 3. Logout Button (Aksi Utama Keluar) */}
          <div className="pt-1">
            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 hover:border-transparent text-xs font-bold transition-all shadow-sm group"
            >
              <LogOut size={15} className="group-hover:-translate-x-0.5 transition-transform" />
              <span>Keluar dari Akun (Logout)</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
