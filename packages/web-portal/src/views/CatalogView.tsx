import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { GameSummary, UserRole } from '@blockgame/shared';
import { useAuth } from '../context/AuthContext';
import { Play, Trophy, Users, PlusCircle, Search, Flame, Server, Code2, Sparkles } from 'lucide-react';

interface CatalogViewProps {
  onPlayGame: (gameId: string) => void;
  onCreateNewGame: () => void;
}

export const CatalogView: React.FC<CatalogViewProps> = ({ onPlayGame, onCreateNewGame }) => {
  const { user } = useAuth();
  const [games, setGames] = useState<GameSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      setLoading(true);
      const res = await api.getGames();
      setGames(res.games);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredGames = games.filter(g =>
    g.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900/60 via-slate-900 to-emerald-950/40 border border-indigo-500/20 p-8 sm:p-10 shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 px-3 py-1 rounded-full text-indigo-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles size={14} className="text-amber-400" /> Platform Game 2D UGC Cloud
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            {user?.role === UserRole.PLAYER ? 'Katalog Game 2D Arcade' : 'Mainkan & Rancang Game 2D Langsung di Browser'}
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            {user?.role === UserRole.PLAYER 
              ? 'Selamat datang di BlockVerse Arcade! Pilih dan mainkan berbagai game petualangan, teka-teki, dan aksi 2D di bawah ini secara instan.' 
              : 'Diberdayakan oleh 3 sisi terintegrasi: Cloud Game Service sebagai penyimpanan & server, Developer Studio dengan visual block programming, dan Player Runtime instan tanpa instalasi.'
            }
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {(user?.role === UserRole.DEVELOPER || user?.role === UserRole.ADMIN) && (
              <button
                onClick={onCreateNewGame}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all text-sm"
              >
                <PlusCircle size={18} />
                <span>Buka Studio (Rancang Game)</span>
              </button>
            )}
          </div>
        </div>

        {/* Ambient Decorative Graphic */}
        <div className="absolute right-6 -bottom-10 opacity-20 pointer-events-none hidden md:block">
          <div className="w-80 h-80 rounded-full bg-indigo-500 blur-3xl"></div>
        </div>
      </div>

      {/* Catalog Header & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <Flame className="text-amber-400" size={24} />
          <h2 className="text-xl font-bold text-white">Katalog Game di Cloud</h2>
          <span className="text-xs font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{filteredGames.length} Game</span>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Cari judul game..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Game Cards Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 font-mono">Memuat game dari Cloud Service...</div>
      ) : filteredGames.length === 0 ? (
        <div className="py-16 text-center text-slate-400 bg-slate-900/50 rounded-2xl border border-slate-800 p-8">
          <p className="font-semibold">Belum ada game yang cocok dengan pencarian.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGames.map((game) => (
            <div
              key={game.id}
              className="group relative bg-slate-900/70 hover:bg-slate-900 rounded-2xl border border-slate-800 hover:border-indigo-500/50 transition-all p-6 flex flex-col justify-between shadow-lg hover:shadow-indigo-500/10"
            >
              <div className="space-y-3">
                {/* Visual Thumbnail Simulator */}
                <div className="h-36 w-full rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center relative overflow-hidden group-hover:border-slate-700 transition-colors">
                  {/* Retro geometric placeholder */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500 shadow-md shadow-emerald-500/50 animate-pulse"></div>
                      <div className="w-6 h-6 rounded-full bg-rose-500 shadow-md shadow-rose-500/50"></div>
                      <div className="w-4 h-4 rounded bg-amber-400"></div>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">2D Canvas Engine</span>
                  </div>
                  <div className="absolute top-2.5 right-2.5 bg-slate-900/90 border border-slate-700 text-slate-300 text-[10px] font-mono uppercase px-2 py-0.5 rounded">
                    {game.category}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
                    {game.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                    {game.description || 'Tidak ada deskripsi.'}
                  </p>
                </div>
              </div>

              {/* Card Meta & Action */}
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-[11px] text-slate-400">
                    Oleh <span className="text-slate-200 font-semibold">{game.authorName}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                    <span className="flex items-center gap-1"><Users size={12} /> {game.playCount} dimainkan</span>
                    <span className="flex items-center gap-1 text-amber-400"><Trophy size={12} /> Rekor: {game.highScore}</span>
                  </div>
                </div>

                <button
                  onClick={() => onPlayGame(game.id)}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md shadow-emerald-600/30 transition-all"
                >
                  <Play size={14} fill="currentColor" />
                  <span>Main</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
