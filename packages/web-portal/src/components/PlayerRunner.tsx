// packages/web-portal/src/components/PlayerRunner.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Flag, Octagon, Trophy, Gamepad2, Send } from 'lucide-react';
import {
  BlockVerseProject,
  BlockVerseRuntime,
  COIN_HUNTER_PRESET,
  FLAPPY_BIRD_PRESET,
  PONG_ARCADE_PRESET,
  SPACE_INVADERS_PRESET,
  STAR_CATCHER_GAME,
  TETRIS_DROP_PRESET,
} from '../engine/BlockVerseEngine';
import { api } from '../services/api';

interface LeaderboardEntry {
  username: string;
  score: number;
  createdAt: string;
}

export const PlayerRunner: React.FC<{ gameId?: string; initialProject?: BlockVerseProject }> = ({
  gameId = '1',
  initialProject,
}) => {
  const [project, setProject] = useState<BlockVerseProject>(initialProject || STAR_CATCHER_GAME);
  const [liveScore, setLiveScore] = useState<number>(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([
    { username: 'Arsa_Dev', score: 240, createdAt: 'Just now' },
    { username: 'CyberPlayer99', score: 150, createdAt: '5m ago' },
  ]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeRef = useRef<BlockVerseRuntime | null>(null);

  useEffect(() => {
    if (initialProject) {
      setProject(initialProject);
      return;
    }

    // Cek apabila gameId merujuk pada salah satu Preset Bawaan
    if (gameId === 'game_flappy_bird') {
      setProject(FLAPPY_BIRD_PRESET);
    } else if (gameId === 'game_pong_arcade') {
      setProject(PONG_ARCADE_PRESET);
    } else if (gameId === 'game_tetris_drop') {
      setProject(TETRIS_DROP_PRESET);
    } else if (gameId === 'game_cat_star') {
      setProject(STAR_CATCHER_GAME);
    } else if (gameId === 'game_coin_hunter') {
      setProject(COIN_HUNTER_PRESET);
    } else if (gameId === 'game_space_invaders' || gameId === '1') {
      setProject(SPACE_INVADERS_PRESET);
    } else {
      // Ambil manifest game buatan developer dari Cloud SQLite / Local Storage
      api
        .getGameManifest(gameId)
        .then((manifest) => {
          if (manifest.projectData) {
            setProject(manifest.projectData);
          }
        })
        .catch(() => {});
    }

    api
      .getLeaderboard(gameId)
      .then((data) => {
        if (data.leaderboard && data.leaderboard.length > 0) {
          setLeaderboard(data.leaderboard);
        }
      })
      .catch(() => {});
  }, [gameId, initialProject]);

  const submitScoreToCloud = async (scoreValue: number) => {
    try {
      await api.submitScore(gameId, scoreValue);
      const updated = await api.getLeaderboard(gameId);
      if (updated.leaderboard && updated.leaderboard.length > 0) {
        setLeaderboard(updated.leaderboard);
        return;
      }
    } catch {}

    setLeaderboard((prev) =>
      [...prev, { username: 'You', score: scoreValue, createdAt: 'Just now' }].sort(
        (a, b) => b.score - a.score
      )
    );
  };

  useEffect(() => {
    if (!canvasRef.current) return;
    const runtime = new BlockVerseRuntime(
      canvasRef.current,
      project,
      (finalScore) => submitScoreToCloud(finalScore),
      (vars) => setLiveScore(Number(vars.score || 0))
    );
    runtimeRef.current = runtime;
    runtime.start(); // Langsung jalankan game ketika dibuka oleh Player

    return () => runtime.destroy();
  }, [project]);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-6 h-6 text-[#4C97FF]" />
              <h1 className="text-lg font-bold">{project.title}</h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => runtimeRef.current?.start()}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Flag className="w-4 h-4 fill-white" /> Play / Restart
              </button>
              <button
                onClick={() => runtimeRef.current?.stop()}
                className="bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Octagon className="w-4 h-4 fill-white" /> Stop
              </button>
            </div>
          </div>

          <div className="bg-black rounded-xl overflow-hidden border border-slate-800 flex justify-center">
            <canvas
              ref={canvasRef}
              width={480}
              height={360}
              className="w-full max-w-[600px] aspect-[4/3]"
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
            <span>Kontrol: Panah Kiri/Kanan/Atas/Bawah • Spasi untuk Aksi/Terbang</span>
            <button
              onClick={() => submitScoreToCloud(liveScore)}
              className="bg-[#FF8C1A] hover:bg-[#e67e17] text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" /> Submit Current Score ({liveScore})
            </button>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-base mb-4">
            <Trophy className="w-5 h-5" />
            <h2>Cloud Leaderboard</h2>
          </div>

          <div className="space-y-2.5 flex-1">
            {leaderboard.map((entry, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between bg-slate-800/70 px-3.5 py-2.5 rounded-xl border border-slate-700/60"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-700 text-xs font-bold flex items-center justify-center">
                    #{idx + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{entry.username}</p>
                    <p className="text-[10px] text-slate-400">{entry.createdAt}</p>
                  </div>
                </div>
                <span className="text-amber-400 font-black text-sm">
                  {entry.score} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
