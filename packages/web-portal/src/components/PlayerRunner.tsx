// packages/web-portal/src/components/PlayerRunner.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Flag, Octagon, Trophy, Gamepad2, Send } from 'lucide-react';
import {
  BlockVerseProject,
  BlockVerseRuntime,
  SPACE_INVADERS_PRESET,
} from '../engine/BlockVerseEngine';

interface LeaderboardEntry {
  username: string;
  score: number;
  createdAt: string;
}

export const PlayerRunner: React.FC<{ gameId?: string }> = ({
  gameId = '1',
}) => {
  const [project, setProject] = useState<BlockVerseProject>(SPACE_INVADERS_PRESET);
  const [liveScore, setLiveScore] = useState<number>(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([
    { username: 'Arsa_Dev', score: 180, createdAt: 'Just now' },
    { username: 'CyberPlayer99', score: 120, createdAt: '5m ago' },
  ]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeRef = useRef<BlockVerseRuntime | null>(null);

  // Ambil project dari Cloud (atau Local Cache jika baru disimpan dari Studio)
  useEffect(() => {
    if (gameId && gameId !== '1') {
      fetch(`http://localhost:3001/api/games/${gameId}/manifest`)
        .then((res) => res.json())
        .then((data) => {
          if (data.projectData) {
            setProject(data.projectData);
          }
        })
        .catch(() => {});
    } else {
      const cached = localStorage.getItem('blockverse_latest_project');
      if (cached) {
        try {
          setProject(JSON.parse(cached));
        } catch {}
      }
    }

    // Ambil Live Leaderboard dari Cloud SQLite
    fetch(`http://localhost:3001/api/games/${gameId}/scores`)
      .then((res) => res.json())
      .then((data) => {
        if (data.leaderboard && data.leaderboard.length > 0) {
          setLeaderboard(data.leaderboard);
        }
      })
      .catch(() => {});
  }, [gameId]);

  const submitScoreToCloud = async (scoreValue: number) => {
    const token = localStorage.getItem('token');
    try {
      await fetch(`http://localhost:3001/api/games/${gameId}/scores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ score: scoreValue }),
      });
    } catch {}

    setLeaderboard((prev) =>
      [
        ...prev,
        { username: 'You', score: scoreValue, createdAt: 'Just now' },
      ].sort((a, b) => b.score - a.score)
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
    runtime.renderFrame();

    return () => runtime.destroy();
  }, [project]);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kiri: Layar Game HTML5 Canvas */}
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
                <Flag className="w-4 h-4 fill-white" /> Play
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
            <span>Controls: Left/Right Arrow to Move • Space to Shoot</span>
            <button
              onClick={() => submitScoreToCloud(liveScore)}
              className="bg-[#FF8C1A] hover:bg-[#e67e17] text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" /> Submit Current Score ({liveScore})
            </button>
          </div>
        </div>

        {/* Kanan: Cloud Leaderboard */}
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
