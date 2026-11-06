import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { UserRole, UserProfile, GameSummary } from '@blockgame/shared';
import { 
  ShieldCheck, Server, Database, Users, Gamepad2, 
  Trash2, Cpu, Activity, AlertTriangle, Sparkles, 
  RefreshCw, Check, X, Clock, UserCheck, UserX 
} from 'lucide-react';

export const AdminView: React.FC = () => {
  const { user, switchQuickDemo } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [gamesList, setGamesList] = useState<GameSummary[]>([]);
  const [pendingList, setPendingList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.role === UserRole.ADMIN) {
      loadAdminData();
    }
  }, [user]);

  const loadAdminData = async () => {
    try {
      setRefreshing(true);
      const [metricsData, usersData, gamesData, pendingData] = await Promise.all([
        api.getAdminMetrics(),
        api.getAdminUsers(),
        api.getGames(false), // all games including unpublished
        api.getPendingDevelopers()
      ]);
      setMetrics(metricsData);
      setUsersList(usersData.users);
      setGamesList(gamesData.games);
      setPendingList(pendingData.pendingUsers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleApprove = async (userId: string, username: string) => {
    try {
      await api.approveDeveloper(userId);
      alert(`Akun Developer "${username}" berhasil disetujui (ACTIVE)!`);
      loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Gagal menyetujui akun');
    }
  };

  const handleReject = async (userId: string, username: string) => {
    if (!window.confirm(`Yakin ingin menolak pendaftaran akun Developer "${username}"?`)) return;
    try {
      await api.rejectDeveloper(userId);
      alert(`Akun Developer "${username}" ditolak (REJECTED).`);
      loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Gagal menolak akun');
    }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      await api.updateUserStatus(userId, newStatus);
      loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status akun');
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await api.updateUserRole(userId, newRole);
      loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah role');
    }
  };

  const handleDeleteGame = async (gameId: string, title: string) => {
    if (!window.confirm(`Yakin ingin menghapus game "${title}" dari Cloud Service?`)) return;
    try {
      await api.deleteGame(gameId);
      loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus game');
    }
  };

  if (user?.role !== UserRole.ADMIN) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mx-auto flex items-center justify-center">
          <AlertTriangle size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white">Akses Ditolak: Khusus Admin</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Halaman ini adalah pusat kontrol Cloud Service yang hanya dapat diakses oleh peran <strong>Admin</strong>.
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={() => switchQuickDemo(UserRole.ADMIN)}
            className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-rose-600/30 transition-all"
          >
            <Sparkles size={16} />
            <span>Ganti ke Akun Demo Admin</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <ShieldCheck className="text-rose-500" />
            <span>Cloud Service Admin Portal</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manajemen infrastruktur server cloud, pemantauan trafik game, dan moderasi akun/game.
          </p>
        </div>

        <button
          onClick={loadAdminData}
          disabled={refreshing}
          className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs px-3.5 py-2 rounded-xl transition-colors font-medium"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          <span>Refresh Data</span>
        </button>
      </div>

      {loading || !metrics ? (
        <div className="py-20 text-center text-slate-500 font-mono">Memuat metrik cloud...</div>
      ) : (
        <>
          {/* Metrics Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Server Status */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>STATUS SERVER</span>
                <Server size={16} className="text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-emerald-400">{metrics.system.status}</span>
                <span className="text-xs text-slate-500 font-mono">Node {metrics.system.nodeVersion}</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 pt-1 border-t border-slate-800">
                <Activity size={12} className="text-emerald-400" />
                <span>Uptime: {Math.floor(metrics.system.uptimeSeconds / 60)} menit</span>
                <span>• Mem: {metrics.system.memoryUsageMB} MB</span>
              </div>
            </div>

            {/* Total Games */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>TOTAL GAME DI CLOUD</span>
                <Gamepad2 size={16} className="text-indigo-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-white">{metrics.metrics.totalGames}</span>
                <span className="text-xs text-indigo-400 font-medium">Manifests</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-800">
                Total {metrics.metrics.totalPlays} kali dimainkan
              </div>
            </div>

            {/* Total Registered Users */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>TOTAL PENGGUNA TERDAFTAR</span>
                <Users size={16} className="text-sky-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-white">{metrics.metrics.totalUsers}</span>
                <span className="text-xs text-sky-400 font-medium">Akun</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-800 flex items-center gap-2">
                {metrics.metrics.roles.map((r: any) => (
                  <span key={r.role}>{r.role}: {r.count}</span>
                ))}
              </div>
            </div>

            {/* Database Engine */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>DATABASE CLOUD ENGINE</span>
                <Database size={16} className="text-amber-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-amber-400">SQLite</span>
                <span className="text-xs text-slate-500 font-mono">(Ready to PG)</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-800">
                {metrics.metrics.totalScores} rekaman leaderboard
              </div>
            </div>
          </div>

          {/* 1.5. Developer Approval Queue (Fitur Permohonan Akun Developer) */}
          <div className="bg-slate-900/90 border border-amber-500/30 rounded-3xl p-6 space-y-4 shadow-xl shadow-amber-500/5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center">
                  <Clock size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Permohonan Akun Developer (Approval Queue)</span>
                    {pendingList.length > 0 ? (
                      <span className="bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-full text-[11px] font-black font-mono animate-pulse">
                        {pendingList.length} Menunggu Persetujuan
                      </span>
                    ) : (
                      <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-mono">
                        Clear
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Daftar pendaftar dengan peran Developer yang memerlukan approval Admin sebelum dapat mengakses Scratch Studio.
                  </p>
                </div>
              </div>
            </div>

            {pendingList.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center space-y-1.5">
                <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center">
                  <UserCheck size={18} />
                </div>
                <p className="text-xs text-slate-200 font-bold">Semua permohonan developer telah diproses!</p>
                <p className="text-[11px] text-slate-500">Tidak ada pendaftar baru yang menunggu persetujuan saat ini.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-3">Username</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Waktu Pendaftaran</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Tindakan Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {pendingList.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 text-white font-bold flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                          {p.username}
                        </td>
                        <td className="p-3 text-slate-300 font-mono">{p.email}</td>
                        <td className="p-3 text-slate-400 font-mono text-[11px]">
                          {new Date(p.createdAt).toLocaleString('id-ID')}
                        </td>
                        <td className="p-3">
                          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold text-[10px] uppercase font-mono">
                            PENDING
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-2">
                          <button
                            onClick={() => handleApprove(p.id, p.username)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all"
                            title="Setujui permohonan akun developer ini"
                          >
                            <Check size={14} />
                            <span>Setujui (Approve)</span>
                          </button>
                          <button
                            onClick={() => handleReject(p.id, p.username)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold transition-all"
                            title="Tolak permohonan akun developer ini"
                          >
                            <X size={14} />
                            <span>Tolak (Reject)</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Cloud Games Management Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Gamepad2 className="text-indigo-400" size={18} />
                <span>Daftar Game yang Tersimpan di Cloud Service</span>
              </h2>
              <span className="text-xs font-mono text-slate-400">{gamesList.length} Game</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">Judul Permainan</th>
                    <th className="p-3">Pembuat (Developer)</th>
                    <th className="p-3">Kategori</th>
                    <th className="p-3">Dimainkan</th>
                    <th className="p-3">Skor Tertinggi</th>
                    <th className="p-3 text-right">Moderasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {gamesList.map((g) => (
                    <tr key={g.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 text-white font-semibold flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        {g.title}
                      </td>
                      <td className="p-3 text-slate-300">{g.authorName}</td>
                      <td className="p-3">
                        <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono text-[10px] uppercase">
                          {g.category}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400 font-mono">{g.playCount}</td>
                      <td className="p-3 text-amber-400 font-mono font-bold">{g.highScore}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteGame(g.id, g.title)}
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
                          title="Hapus game dari cloud"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* User Management Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="text-sky-400" size={18} />
                <span>Manajemen Pengguna & Peran (RBAC)</span>
              </h2>
              <span className="text-xs font-mono text-slate-400">{usersList.length} User</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">Username</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Peran (Role)</th>
                    <th className="p-3">Status Akun</th>
                    <th className="p-3">Ubah Status</th>
                    <th className="p-3">Ubah Peran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {usersList.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 text-white font-semibold">{u.username}</td>
                      <td className="p-3 text-slate-400 font-mono">{u.email}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            u.role === UserRole.ADMIN
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : u.role === UserRole.DEVELOPER
                              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase font-mono ${
                            u.status === 'ACTIVE' || !u.status
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : u.status === 'PENDING'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {u.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="p-3">
                        <select
                          value={u.status || 'ACTIVE'}
                          onChange={(e) => handleStatusChange(u.id, e.target.value)}
                          className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                        >
                          <option value="ACTIVE">ACTIVE (Disetujui)</option>
                          <option value="PENDING">PENDING (Tertunda)</option>
                          <option value="REJECTED">REJECTED (Ditolak)</option>
                        </select>
                      </td>
                      <td className="p-3">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                          className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                        >
                          <option value={UserRole.ADMIN}>ADMIN (Cloud Owner)</option>
                          <option value={UserRole.DEVELOPER}>DEVELOPER (Maker + Player)</option>
                          <option value={UserRole.PLAYER}>PLAYER (Pemain Saja)</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
