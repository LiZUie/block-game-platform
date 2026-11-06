import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole, GameManifest, BlockNode } from '@blockgame/shared';
import { api } from '../services/api';
import { GameRunner } from '../engine/GameRunner';
import { Code2, Play, UploadCloud, Layers, Cpu, CheckCircle2, AlertTriangle, Sparkles, RefreshCw, Plus, Trash2 } from 'lucide-react';

interface StudioViewProps {
  onGamePublished: (gameId: string) => void;
}

export const StudioView: React.FC<StudioViewProps> = ({ onGamePublished }) => {
  const { user, switchQuickDemo } = useAuth();

  // If Player, block access per RBAC
  if (user?.role === UserRole.PLAYER) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center">
          <AlertTriangle size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white">Akses Terbatas: Hanya Developer</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Anda sedang login dengan peran <strong>Player</strong>. Sesuai arsitektur sistem, hanya akun ber-role <strong>Developer</strong> atau <strong>Admin</strong> yang memiliki izin membuat game di Studio.
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={() => switchQuickDemo(UserRole.DEVELOPER)}
            className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-sky-600/30 transition-all"
          >
            <Sparkles size={16} />
            <span>Ganti ke Akun Demo Developer</span>
          </button>
        </div>
      </div>
    );
  }

  // Studio State
  const [activeTab, setActiveTab] = useState<'canvas' | 'blocks' | 'preview'>('blocks');

  // Game Meta
  const [title, setTitle] = useState('Ular Super 2D');
  const [description, setDescription] = useState('Dibuat dengan blok pemrograman visual di BlockVerse Studio.');
  const [category, setCategory] = useState<'classic' | 'arcade' | 'action'>('classic');

  // Canvas Settings
  const [canvasConfig, setCanvasConfig] = useState({
    width: 400,
    height: 400,
    gridSize: 20,
    backgroundColor: '#0f172a',
    tickRateMs: 140
  });

  // Entities
  const [snakeColor, setSnakeColor] = useState('#10b981');
  const [appleColor, setAppleColor] = useState('#ef4444');
  const [scoreIncrement, setScoreIncrement] = useState(10);
  const [tailGrowth, setTailGrowth] = useState(1);

  // Playtest Simulator
  const testCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const testRunnerRef = useRef<GameRunner | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  // Assemble full GameManifest from current state
  const buildCurrentManifest = (): GameManifest => {
    return {
      id: `preview_${Date.now()}`,
      title,
      description,
      authorId: user?.id || 'dev',
      authorName: user?.username || 'Developer',
      version: '1.0.0',
      category,
      canvas: canvasConfig,
      entities: [
        {
          id: 'entity_snake',
          name: 'Karakter Ular',
          type: 'player',
          shape: 'square',
          color: snakeColor,
          size: { width: canvasConfig.gridSize, height: canvasConfig.gridSize },
          initialPosition: { x: canvasConfig.gridSize * 5, y: canvasConfig.gridSize * 5 },
          isSolid: true
        },
        {
          id: 'entity_apple',
          name: 'Apel Makanan',
          type: 'food',
          shape: 'circle',
          color: appleColor,
          size: { width: canvasConfig.gridSize, height: canvasConfig.gridSize },
          initialPosition: { x: canvasConfig.gridSize * 12, y: canvasConfig.gridSize * 8 },
          isSolid: false
        }
      ],
      logic: {
        version: '1.0',
        blocks: [
          {
            type: 'WHEN_GAME_START',
            params: {},
            children: [
              { type: 'SET_VARIABLE', params: { name: 'score', value: 0 } },
              { type: 'SET_DIRECTION', params: { entityId: 'entity_snake', direction: 'RIGHT' } }
            ]
          },
          {
            type: 'ON_GAME_TICK',
            params: { intervalMs: canvasConfig.tickRateMs },
            children: [
              { type: 'MOVE_ENTITY', params: { entityId: 'entity_snake', mode: 'FORWARD_DIRECTION' } }
            ]
          },
          {
            type: 'ON_COLLISION',
            params: { entityA: 'entity_snake', entityB: 'entity_apple' },
            children: [
              { type: 'ADD_SCORE', params: { amount: scoreIncrement } },
              { type: 'GROW_TRAIL', params: { entityId: 'entity_snake', amount: tailGrowth } },
              { type: 'SPAWN_RANDOM', params: { entityId: 'entity_apple' } },
              { type: 'PLAY_SOUND', params: { sound: 'eat' } }
            ]
          }
        ]
      },
      isPublished: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  };

  // Launch Playtest when preview tab is active
  useEffect(() => {
    if (activeTab === 'preview' && testCanvasRef.current) {
      if (testRunnerRef.current) {
        testRunnerRef.current.destroy();
      }
      const manifest = buildCurrentManifest();
      const runner = new GameRunner(testCanvasRef.current, manifest);
      testRunnerRef.current = runner;
      runner.start();

      return () => {
        runner.destroy();
      };
    }
  }, [activeTab, snakeColor, appleColor, canvasConfig, scoreIncrement, tailGrowth]);

  const handlePublishToCloud = async () => {
    try {
      setIsPublishing(true);
      const manifest = buildCurrentManifest();
      const res = await api.publishGame({
        title: manifest.title,
        description: manifest.description,
        category: manifest.category,
        canvas: manifest.canvas,
        entities: manifest.entities,
        logic: manifest.logic,
        blocklyXml: ''
      });

      setPublishSuccess(true);
      setTimeout(() => {
        onGamePublished(res.gameId);
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Gagal mempublish game ke cloud');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Studio Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Code2 className="text-indigo-400" />
            <span>Developer Studio: 2D Block Maker</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Susun komponen kanvas dan logika visual game 2D Anda, lalu publish ke Cloud Game Service.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
              activeTab === 'preview'
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Play size={14} />
            <span>Playtest Simulator</span>
          </button>

          <button
            onClick={handlePublishToCloud}
            disabled={isPublishing || publishSuccess}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-lg shadow-emerald-600/30 transition-all"
          >
            {publishSuccess ? (
              <>
                <CheckCircle2 size={16} />
                <span>Tersimpan di Cloud!</span>
              </>
            ) : (
              <>
                <UploadCloud size={16} />
                <span>{isPublishing ? 'Mengupload...' : 'Publish ke Cloud'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('blocks')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'blocks'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu size={14} />
          <span>1. Pemrograman Blok Logika</span>
        </button>

        <button
          onClick={() => setActiveTab('canvas')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'canvas'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers size={14} />
          <span>2. Konfigurasi Kanvas & Entitas</span>
        </button>

        <button
          onClick={() => setActiveTab('preview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'preview'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Play size={14} />
          <span>3. Playtest & Uji Coba</span>
        </button>
      </div>

      {/* Tab 1: Visual Block-Based Logic Workspace */}
      {activeTab === 'blocks' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Visual Blocks Workspace (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Sparkles className="text-amber-400" size={16} />
                  <span>Struktur Pohon Blok Logika Permainan</span>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded">
                  AST Validated
                </span>
              </div>

              {/* Visual Block Stack Display */}
              <div className="space-y-4 font-mono text-xs">
                
                {/* Block 1: Event Game Start */}
                <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-4 shadow-md space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                    <span>KETIKA GAME DIMULAI</span>
                  </div>
                  <div className="ml-5 pl-4 border-l-2 border-amber-500/30 space-y-2 text-slate-300">
                    <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                      <span>↳ Set Variabel Skor = 0</span>
                      <span className="text-slate-500 text-[10px]">Init State</span>
                    </div>
                    <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                      <span>↳ Arah Awal Gerak = KANAN</span>
                      <span className="text-slate-500 text-[10px]">Direction</span>
                    </div>
                  </div>
                </div>

                {/* Block 2: Event Tick Loop */}
                <div className="bg-sky-500/10 border-2 border-sky-500/40 rounded-2xl p-4 shadow-md space-y-2">
                  <div className="flex items-center justify-between text-sky-300 font-bold">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
                      <span>SETIAP GAME TICK ({canvasConfig.tickRateMs} ms)</span>
                    </div>
                  </div>
                  <div className="ml-5 pl-4 border-l-2 border-sky-500/30 space-y-2 text-slate-300">
                    <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                      <span>↳ Gerakkan Ular Maju 1 Petak Mengikuti Arah</span>
                      <span className="text-slate-500 text-[10px]">Step Move</span>
                    </div>
                    <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                      <span>↳ Cek Tabrakan Dinding &amp; Ekor Sendiri (Jika Tabrak &rarr; Game Over)</span>
                      <span className="text-slate-500 text-[10px]">Boundary Check</span>
                    </div>
                  </div>
                </div>

                {/* Block 3: Event Collision / Eat Apple */}
                <div className="bg-emerald-500/10 border-2 border-emerald-500/40 rounded-2xl p-4 shadow-md space-y-3">
                  <div className="flex items-center justify-between text-emerald-300 font-bold">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                      <span>KETIKA (Ular) MENABRAK (Apel)</span>
                    </div>
                  </div>

                  <div className="ml-5 pl-4 border-l-2 border-emerald-500/30 space-y-2 text-slate-300">
                    <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>↳ Tambah Skor Sebesar:</span>
                        <input
                          type="number"
                          value={scoreIncrement}
                          onChange={(e) => setScoreIncrement(Number(e.target.value))}
                          className="w-16 bg-slate-900 border border-slate-700 px-2 py-1 rounded text-emerald-400 font-bold text-center"
                        />
                        <span>Poin</span>
                      </div>
                      <span className="text-slate-500 text-[10px]">Action: Add Score</span>
                    </div>

                    <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>↳ Tambah Panjang Tubuh Sebesar:</span>
                        <input
                          type="number"
                          value={tailGrowth}
                          onChange={(e) => setTailGrowth(Number(e.target.value))}
                          className="w-14 bg-slate-900 border border-slate-700 px-2 py-1 rounded text-sky-400 font-bold text-center"
                        />
                        <span>Segmen</span>
                      </div>
                      <span className="text-slate-500 text-[10px]">Action: Grow Trail</span>
                    </div>

                    <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                      <span>↳ Pindahkan Apel ke Koordinat Acak Grid Baru</span>
                      <span className="text-slate-500 text-[10px]">Action: Respawn</span>
                    </div>

                    <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                      <span>↳ Mainkan Efek Audio Beep (Web Audio API)</span>
                      <span className="text-slate-500 text-[10px]">Action: Sound</span>
                    </div>
                  </div>
                </div>

                {/* Block 4: Event Keyboard Keys */}
                <div className="bg-purple-500/10 border-2 border-purple-500/40 rounded-2xl p-4 shadow-md space-y-2">
                  <div className="flex items-center gap-2 text-purple-300 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
                    <span>KETIKA TOMBOL PANAH / WASD DITEKAN</span>
                  </div>
                  <div className="ml-5 pl-4 border-l-2 border-purple-500/30 space-y-2 text-slate-300">
                    <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                      <span>↳ Ubah Arah Gerak ke (ATAS / BAWAH / KIRI / KANAN)</span>
                      <span className="text-slate-500 text-[10px]">Direction Handler</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Sidebar Info & Metadata */}
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white">Informasi Game</h3>
              
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Judul Permainan:</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Deskripsi Singkat:</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Kategori:</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="classic">Classic 2D</option>
                    <option value="arcade">Arcade Retro</option>
                    <option value="action">Action</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-3xl p-6 text-xs text-slate-300 space-y-2">
              <div className="font-bold text-indigo-300 flex items-center gap-1.5">
                <Sparkles size={14} /> Keunggulan Block Engine:
              </div>
              <p className="leading-relaxed">
                Developer menyusun logika melalui blok visual. Saat tombol <strong>Publish</strong> ditekan, engine menyusunnya menjadi file konfigurasi <code>GameManifest</code> JSON standar yang langsung dapat dieksekusi oleh mesin client pemain di belahan dunia mana pun.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Canvas & Entities Customizer */}
      {activeTab === 'canvas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers size={18} className="text-sky-400" />
              <span>Dimensi & Kecepatan Kanvas 2D</span>
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Ukuran Kanvas (Lebar x Tinggi):</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={canvasConfig.width}
                    onChange={(e) => setCanvasConfig({ ...canvasConfig, width: Number(e.target.value) })}
                    className="bg-slate-950 border border-slate-700 px-3 py-2 rounded-xl text-slate-200 font-mono"
                  />
                  <input
                    type="number"
                    value={canvasConfig.height}
                    onChange={(e) => setCanvasConfig({ ...canvasConfig, height: Number(e.target.value) })}
                    className="bg-slate-950 border border-slate-700 px-3 py-2 rounded-xl text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Ukuran Grid Petak (Pixels):</label>
                <input
                  type="number"
                  value={canvasConfig.gridSize}
                  onChange={(e) => setCanvasConfig({ ...canvasConfig, gridSize: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 px-3 py-2 rounded-xl text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Kecepatan Loop Gerak (Tick Rate ms):</label>
                <input
                  type="number"
                  value={canvasConfig.tickRateMs}
                  onChange={(e) => setCanvasConfig({ ...canvasConfig, tickRateMs: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 px-3 py-2 rounded-xl text-slate-200 font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Semakin kecil angkanya, semakin cepat karakter bergerak (140ms = kecepatan standar).</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles size={18} className="text-emerald-400" />
              <span>Aset Visual Bentuk Geometris</span>
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Warna Ular (Player Square Shape):</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={snakeColor}
                    onChange={(e) => setSnakeColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <span className="font-mono text-slate-300 font-bold">{snakeColor}</span>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Warna Apel (Food Circle Shape):</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={appleColor}
                    onChange={(e) => setAppleColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <span className="font-mono text-slate-300 font-bold">{appleColor}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Live Playtest Simulator */}
      {activeTab === 'preview' && (
        <div className="flex flex-col items-center bg-slate-900/60 border border-slate-800 rounded-3xl p-8 space-y-6">
          <div className="text-center space-y-1">
            <h3 className="text-lg font-bold text-white flex items-center justify-center gap-2">
              <Play size={18} className="text-emerald-400" />
              <span>Simulator Playtest Lokal</span>
            </h3>
            <p className="text-xs text-slate-400">
              Gunakan tombol panah keyboard atau kontrol panah untuk menguji game sebelum dipublish ke Cloud Service.
            </p>
          </div>

          <div className="rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700 bg-slate-950">
            <canvas ref={testCanvasRef} className="block" />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (testRunnerRef.current) testRunnerRef.current.start();
              }}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-4 py-2 rounded-xl font-semibold transition-colors"
            >
              <RefreshCw size={14} />
              <span>Restart Simulasi</span>
            </button>

            <button
              onClick={handlePublishToCloud}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-lg shadow-emerald-600/30 transition-all"
            >
              <UploadCloud size={16} />
              <span>Sudah Pas? Publish Sekarang!</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
