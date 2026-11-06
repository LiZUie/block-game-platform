import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole, UserProfile } from '@blockgame/shared';
import { ShieldCheck, Code2, UserCheck, Sparkles, LogIn, UserPlus, Lock, Mail, User, AlertCircle } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const { login, register, switchQuickDemo } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Form states
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [regRole, setRegRole] = useState<UserRole>(UserRole.DEVELOPER);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setErrorMsg('Harap masukkan Username/Email dan Password');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      const user = await login(identifier, password);
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Login gagal, periksa kembali username/password Anda.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password) {
      setErrorMsg('Semua kolom registrasi wajib diisi');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      const user = await register(username, email, password, regRole);
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Pendaftaran gagal');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (role: UserRole) => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const user = await switchQuickDemo(role);
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMsg('Gagal login akun demo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      <div className="w-full max-w-md space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 mx-auto flex items-center justify-center shadow-xl shadow-indigo-500/25 border border-indigo-400/30">
            <span className="font-black text-white text-3xl">B</span>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              BlockVerse Cloud
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Platform Service Game 2D UGC Berbasis Block Programming
            </p>
          </div>
        </div>

        {/* Main Auth Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          
          {/* Tabs: Login / Register */}
          <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setIsRegisterMode(false); setErrorMsg(null); }}
              className={`py-2 rounded-lg transition-all ${!isRegisterMode ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              Masuk (Login)
            </button>
            <button
              type="button"
              onClick={() => { setIsRegisterMode(true); setErrorMsg(null); }}
              className={`py-2 rounded-lg transition-all ${isRegisterMode ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              Daftar Akun
            </button>
          </div>

          {/* Error Message Alert */}
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form Login */}
          {!isRegisterMode ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">Username atau Email:</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 text-slate-500" size={16} />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: CloudAdmin / dev123 / email"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">Kata Sandi (Password):</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 text-slate-500" size={16} />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white font-bold text-sm py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all"
              >
                <LogIn size={16} />
                <span>{loading ? 'Memeriksa Kredensial...' : 'Masuk ke Layanan'}</span>
              </button>
            </form>
          ) : (
            /* Form Register */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Username Baru:</label>
                <input
                  type="text"
                  required
                  placeholder="Username Anda"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Alamat Email:</label>
                <input
                  type="email"
                  required
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Password:</label>
                <input
                  type="password"
                  required
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Pilih Peran Akun:</label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 font-semibold"
                >
                  <option value={UserRole.DEVELOPER}>Developer (Pembuat Game)</option>
                  <option value={UserRole.PLAYER}>Player (Pemain Game)</option>
                </select>
                {regRole === UserRole.DEVELOPER ? (
                  <p className="text-[11px] text-amber-400 mt-1.5 flex items-start gap-1">
                    <span className="font-bold">ℹ️ Info:</span>
                    <span>Pendaftaran akun Developer memerlukan persetujuan (approval) oleh Admin sebelum dapat merilis game.</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-emerald-400 mt-1.5 flex items-start gap-1">
                    <span className="font-bold">✓ Info:</span>
                    <span>Akun Player langsung aktif untuk memainkan seluruh game.</span>
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 transition-all"
              >
                <UserPlus size={16} />
                <span>{loading ? 'Mendaftarkan...' : 'Daftar Sekarang'}</span>
              </button>
            </form>
          )}

          {/* Quick Demo Switcher Box (Sangat berguna untuk Dosen & Teman) */}
          <div className="pt-4 border-t border-slate-800 space-y-2.5">
            <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1 font-semibold text-amber-400">
                <Sparkles size={12} /> Akun Demo Cepat (1-Klik Masuk):
              </span>
              <span className="text-[10px] text-slate-500">Auto Match Role</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo(UserRole.ADMIN)}
                className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-left transition-all group"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <ShieldCheck size={14} /> Admin
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">admin123</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo(UserRole.DEVELOPER)}
                className="p-2.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-left transition-all group"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Code2 size={14} /> Developer
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">dev123</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo(UserRole.PLAYER)}
                className="p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-left transition-all group"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <UserCheck size={14} /> Player
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">player123</div>
              </button>
            </div>
          </div>

        </div>

        {/* Footer Note */}
        <p className="text-center text-[11px] text-slate-500">
          Sistem otomatis mengarahkan ke halaman sesuai Peran (Admin &rarr; Cloud, Dev &rarr; Studio, Player &rarr; Katalog).
        </p>
      </div>
    </div>
  );
};
