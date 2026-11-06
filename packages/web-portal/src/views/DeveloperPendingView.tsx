import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Clock, ShieldCheck, RefreshCw, LogOut, AlertCircle, CheckCircle2, User, Mail, Calendar } from 'lucide-react';

interface DeveloperPendingViewProps {
  onApproved: () => void;
}

export const DeveloperPendingView: React.FC<DeveloperPendingViewProps> = ({ onApproved }) => {
  const { user, refreshUser, logout } = useAuth();
  const [checking, setChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState(false);

  const handleCheckStatus = async () => {
    try {
      setChecking(true);
      setStatusMessage(null);
      const updatedUser = await refreshUser();
      
      if (updatedUser?.status === 'ACTIVE') {
        setIsApproved(true);
        setStatusMessage('Selamat! Akun Developer Anda telah disetujui Admin.');
        setTimeout(() => {
          onApproved();
        }, 1500);
      } else {
        setStatusMessage('Status akun Anda saat ini masih MENUNGGU PERSETUJUAN (PENDING). Harap tunggu Admin menyetujui akun Anda.');
      }
    } catch {
      setStatusMessage('Gagal memeriksa status ke cloud server. Silakan coba beberapa saat lagi.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 select-none">
      
      <div className="w-full max-w-lg space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 mx-auto flex items-center justify-center shadow-xl shadow-indigo-500/20">
            <span className="font-black text-white text-2xl">B</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">BlockVerse Cloud</h1>
          <p className="text-xs text-slate-400">Portal Verifikasi Pengembang Game</p>
        </div>

        {/* Status Card */}
        <div className="bg-slate-900/95 backdrop-blur-xl border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          
          <div className="text-center space-y-3">
            <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Clock size={40} className="animate-spin" style={{ animationDuration: '8s' }} />
            </div>

            <div className="inline-flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-wider">
              Status: Menunggu Persetujuan Admin (Pending)
            </div>

            <h2 className="text-2xl font-black text-white">
              Akun Developer Belum Disetujui
            </h2>

            <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
              Halo <strong>{user?.username}</strong>! Pendaftaran akun Anda telah tercatat di Cloud Service. Demi menjaga keamanan dan kualitas platform, akun peran <strong>Developer</strong> harus diverifikasi dan disetujui terlebih dahulu oleh Cloud Admin sebelum fitur pembuatan game dibuka.
            </p>
          </div>

          {/* User Details Box */}
          <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800/80">
              <span className="flex items-center gap-1.5">
                <User size={14} className="text-sky-400" /> Username
              </span>
              <span className="font-bold text-white">{user?.username}</span>
            </div>

            <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800/80">
              <span className="flex items-center gap-1.5">
                <Mail size={14} className="text-indigo-400" /> Email Terdaftar
              </span>
              <span className="font-mono text-slate-200">{user?.email}</span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} className="text-amber-400" /> Waktu Mendaftar
              </span>
              <span className="font-mono text-slate-300">
                {user?.createdAt ? new Date(user.createdAt).toLocaleString('id-ID') : '-'}
              </span>
            </div>
          </div>

          {/* Feedback message */}
          {statusMessage && (
            <div className={`p-3 rounded-xl flex items-start gap-2 text-xs ${
              isApproved 
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' 
                : 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
            }`}>
              {isApproved ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <AlertCircle size={16} className="shrink-0 mt-0.5" />}
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pt-1">
            <button
              onClick={handleCheckStatus}
              disabled={checking || isApproved}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-extrabold text-sm py-3 rounded-xl shadow-lg shadow-amber-500/20 transition-all"
            >
              <RefreshCw size={16} className={checking ? 'animate-spin' : ''} />
              <span>{checking ? 'Memeriksa ke Cloud...' : 'Periksa Status Approval Sekarang'}</span>
            </button>

            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 font-semibold text-xs py-2.5 rounded-xl transition-all"
            >
              <LogOut size={14} />
              <span>Keluar dari Akun (Logout)</span>
            </button>
          </div>

          {/* Steps Note */}
          <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300">Alur Persetujuan:</p>
            <p>1. Admin memeriksa permohonan di dasbor Cloud Admin.</p>
            <p>2. Begitu disetujui, tombol di atas akan langsung membuka Developer Studio!</p>
          </div>

        </div>

      </div>

    </div>
  );
};
