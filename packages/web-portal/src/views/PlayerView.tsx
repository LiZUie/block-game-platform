import React, { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { GameManifest, LeaderboardEntry } from '@blockgame/shared';
import { GameRunner } from '../engine/GameRunner';
import { PlayerRunner } from '../components/PlayerRunner';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, RotateCcw, Trophy, Play, Pause, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Share2, Sparkles, CheckCircle2 } from 'lucide-react';

interface PlayerViewProps {
  gameId: string;
  onBackToCatalog: () => void;
}

export const PlayerView: React.FC<PlayerViewProps> = ({ gameId, onBackToCatalog }) => {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runnerRef = useRef<GameRunner | null>(null);

  const [manifest, setManifest] = useState<GameManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isGameWon, setIsGameWon] = useState(false);
  const [winMsg, setWinMsg] = useState('');
  const [finalScore, setFinalScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);

  useEffect(() => {
    loadGameAndLeaderboard();
    return () => {
      if (runnerRef.current) {
        runnerRef.current.destroy();
      }
    };
  }, [gameId]);

  const loadGameAndLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const [manifestData, leaderboardData] = await Promise.all([
        api.getGameManifest(gameId),
        api.getLeaderboard(gameId)
      ]);

      setManifest(manifestData);
      setLeaderboard(leaderboardData.leaderboard);
      api.recordPlay(gameId); // catat play count
    } catch (err: any) {
      setError(err.message || 'Gagal memuat game dari cloud');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!manifest || !canvasRef.current) return;

    const runner = new GameRunner(canvasRef.current, manifest);
    runnerRef.current = runner;

    runner.onScoreChange = (newScore) => {
      setScore(newScore);
    };

    runner.onGameOver = (endedScore, reason) => {
      setIsGameOver(true);
      setFinalScore(endedScore);
      setScoreSubmitted(false);
    };

    runner.onGameWin = (endedScore, message) => {
      setIsGameWon(true);
      setFinalScore(endedScore);
      setWinMsg(message);
      setScoreSubmitted(false);
    };

    runner.start();

    return () => {
      runner.destroy();
    };
  }, [manifest]);

  const handleRestart = () => {
    setIsGameOver(false);
    setIsGameWon(false);
    setScore(0);
    setScoreSubmitted(false);
    if (runnerRef.current) {
      runnerRef.current.start();
    }
  };

  const handleSubmitScore = async () => {
    if (!user) return;
    try {
      await api.submitScore(gameId, finalScore);
      setScoreSubmitted(true);
      const updated = await api.getLeaderboard(gameId);
      setLeaderboard(updated.leaderboard);
    } catch (err: any) {
      alert(err.message || 'Gagal mengirim skor');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center font-mono text-slate-400">
        Mengunduh manifest game dari Cloud Service...
      </div>
    );
  }

  if (error || !manifest) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="text-rose-400 font-bold text-lg">{error || 'Game tidak ditemukan'}</div>
        <button
          onClick={onBackToCatalog}
          className="bg-slate-800 text-slate-200 px-4 py-2 rounded-xl text-sm hover:bg-slate-700"
        >
          Kembali ke Katalog
        </button>
      </div>
    );
  }

  // Jika game memiliki manifest projectData Blockly atau ID '1' Space Invaders, jalankan BlockVerse PlayerRunner 60 FPS
  if ((manifest as any)?.projectData || gameId === '1') {
    return (
      <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <button
            onClick={onBackToCatalog}
            className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl transition"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke Katalog
          </button>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            <span>● 60 FPS BlockVerse Engine Active</span>
          </div>
        </div>
        <PlayerRunner gameId={gameId} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToCatalog}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              {manifest.title}
              <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded font-mono">
                {manifest.category}
              </span>
            </h1>
            <p className="text-xs text-slate-400">Dibuat oleh <strong className="text-slate-200">{manifest.authorName}</strong></p>
          </div>
        </div>

        {/* Score HUD */}
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl flex items-center gap-3">
            <span className="text-xs text-slate-400 font-medium">SKOR SAAT INI:</span>
            <span className="text-2xl font-black font-mono text-emerald-400">{score}</span>
          </div>

          <button
            onClick={handleRestart}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors"
          >
            <RotateCcw size={14} />
            <span>Restart</span>
          </button>
        </div>
      </div>

      {/* Main Play Area & Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Canvas & Controls Container (2 Cols) */}
        <div className="lg:col-span-2 flex flex-col items-center bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 relative">
          
          {/* 2D Canvas Container */}
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700/80 bg-slate-950">
            <canvas ref={canvasRef} className="block cursor-crosshair max-w-full h-auto" />

            {/* Game Over / Win Modal Overlay */}
            {(isGameOver || isGameWon) && (
              <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-4">
                <div className={`w-14 h-14 rounded-full border flex items-center justify-center ${
                  isGameWon 
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
                    : 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                }`}>
                  <Trophy size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white">
                    {isGameWon ? '🏆 KAMU MENANG!' : 'Permainan Selesai!'}
                  </h3>
                  <p className="text-sm text-slate-300 mt-1">
                    {isGameWon ? winMsg : 'Kamu menabrak rintangan atau jebakan!'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    Total Skor: <span className="text-emerald-400 font-bold text-base">{finalScore}</span>
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    onClick={handleRestart}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all"
                  >
                    <RotateCcw size={16} />
                    <span>Main Lagi</span>
                  </button>

                  {!scoreSubmitted ? (
                    <button
                      onClick={handleSubmitScore}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 transition-all"
                    >
                      <Sparkles size={16} />
                      <span>Kirim ke Leaderboard</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 rounded-xl">
                      <CheckCircle2 size={16} />
                      <span>Skor Berhasil Disimpan!</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Virtual D-Pad Touch / Click Controller for Mobile & Quick Interaction */}
          <div className="mt-6 flex flex-col items-center gap-1.5">
            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-1">
              Kontrol (Keyboard Panah / D-Pad)
            </span>
            <button
              onClick={() => runnerRef.current?.setDirection('UP')}
              className="w-14 h-12 rounded-xl bg-slate-800 hover:bg-indigo-600 active:bg-indigo-700 text-slate-200 hover:text-white flex items-center justify-center border border-slate-700 shadow-md transition-colors"
            >
              <ChevronUp size={24} />
            </button>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => runnerRef.current?.setDirection('LEFT')}
                className="w-14 h-12 rounded-xl bg-slate-800 hover:bg-indigo-600 active:bg-indigo-700 text-slate-200 hover:text-white flex items-center justify-center border border-slate-700 shadow-md transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={() => runnerRef.current?.setDirection('DOWN')}
                className="w-14 h-12 rounded-xl bg-slate-800 hover:bg-indigo-600 active:bg-indigo-700 text-slate-200 hover:text-white flex items-center justify-center border border-slate-700 shadow-md transition-colors"
              >
                <ChevronDown size={24} />
              </button>
              <button
                onClick={() => runnerRef.current?.setDirection('RIGHT')}
                className="w-14 h-12 rounded-xl bg-slate-800 hover:bg-indigo-600 active:bg-indigo-700 text-slate-200 hover:text-white flex items-center justify-center border border-slate-700 shadow-md transition-colors"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          </div>
        </div>

        {/* Cloud Leaderboard Sidebar */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-base pb-3 border-b border-slate-800">
            <Trophy className="text-amber-400" size={20} />
            <h3>Cloud Leaderboard</h3>
          </div>

          <div className="space-y-2">
            {leaderboard.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">Belum ada skor yang tercatat di cloud.</p>
            ) : (
              leaderboard.map((entry, index) => (
                <div
                  key={entry.id || index}
                  className={`flex items-center justify-between p-3 rounded-xl border text-sm ${
                    index === 0
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                      : index === 1
                      ? 'bg-slate-800/80 border-slate-700 text-slate-200'
                      : index === 2
                      ? 'bg-amber-900/20 border-amber-800/40 text-amber-300'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-xs w-5 text-center">
                      #{index + 1}
                    </span>
                    <span className="font-medium text-slate-200">{entry.username}</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-400">{entry.score} pts</span>
                </div>
              ))
            )}
          </div>

          <div className="pt-4 border-t border-slate-800/80">
            <div className="text-[11px] text-slate-400 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              💡 <strong>Info Player Runtime:</strong> Logika game ini diunduh langsung dalam format AST JSON dari Cloud Game Service dan dieksekusi secara instan di browser pemain.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
