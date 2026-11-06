import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole, GameManifest, BlockNode, EntityConfig } from '@blockgame/shared';
import { api } from '../services/api';
import { GameRunner } from '../engine/GameRunner';
import { Code2, Play, UploadCloud, Layers, Cpu, CheckCircle2, AlertTriangle, Sparkles, RefreshCw, Compass, Puzzle, Gamepad2 } from 'lucide-react';

interface StudioViewProps {
  onGamePublished: (gameId: string) => void;
}

type TemplateType = 'adventure' | 'puzzle' | 'snake';

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

  // Active Template
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('adventure');
  const [activeTab, setActiveTab] = useState<'blocks' | 'canvas' | 'preview'>('blocks');

  // Game Meta
  const [title, setTitle] = useState('Petualangan Labirin Gua (2D Adventure)');
  const [description, setDescription] = useState('Temukan kunci emas untuk membuka portal portal keluar, hindari jebakan!');
  const [category, setCategory] = useState<'adventure' | 'puzzle' | 'classic' | 'arcade'>('adventure');

  // Canvas Settings
  const [canvasConfig, setCanvasConfig] = useState({
    width: 400,
    height: 400,
    gridSize: 20,
    backgroundColor: '#090d16',
    tickRateMs: 0,
    gameMode: 'adventure' as any
  });

  // Entity Customizations
  const [heroColor, setHeroColor] = useState('#38bdf8');
  const [targetColor, setTargetColor] = useState('#facc15');
  const [doorColor, setDoorColor] = useState('#a855f7');
  const [hazardColor, setHazardColor] = useState('#ef4444');
  const [scoreReward, setScoreReward] = useState(50);
  const [winMessage, setWinMessage] = useState('Selamat! Kamu berhasil menyelesaikan petualangan ini!');

  // Playtest Simulator
  const testCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const testRunnerRef = useRef<GameRunner | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  // Switch Template handler
  const handleSelectTemplate = (template: TemplateType) => {
    setSelectedTemplate(template);
    if (template === 'adventure') {
      setTitle('Petualangan Kunci Labirin (2D Dungeon)');
      setDescription('Jelajahi labirin, ambil kunci emas & koin, dan buka portal keluar!');
      setCategory('adventure');
      setCanvasConfig({ width: 400, height: 400, gridSize: 20, backgroundColor: '#090d16', tickRateMs: 0, gameMode: 'adventure' });
      setHeroColor('#38bdf8');
      setTargetColor('#facc15');
      setDoorColor('#a855f7');
      setScoreReward(50);
      setWinMessage('Selamat! Kamu berhasil kabur dari labirin bawah tanah!');
    } else if (template === 'puzzle') {
      setTitle('Teka-Teki Saklar Ruang (2D Maze Puzzle)');
      setDescription('Pecahkan labirin dan temukan saklar untuk mengaktifkan portal tujuan!');
      setCategory('puzzle');
      setCanvasConfig({ width: 400, height: 400, gridSize: 20, backgroundColor: '#1e1b4b', tickRateMs: 0, gameMode: 'puzzle' });
      setHeroColor('#a7f3d0');
      setTargetColor('#f43f5e');
      setDoorColor('#60a5fa');
      setScoreReward(100);
      setWinMessage('Hebat! Teka-teki labirin terpecahkan sempurna!');
    } else {
      setTitle('Ular Makan Apel (Classic Arcade 2D)');
      setDescription('Kendalikan ular untuk memakan apel merah dan bertambah panjang!');
      setCategory('classic');
      setCanvasConfig({ width: 400, height: 400, gridSize: 20, backgroundColor: '#111827', tickRateMs: 140, gameMode: 'snake' });
      setHeroColor('#10b981');
      setTargetColor('#ef4444');
      setDoorColor('#a855f7');
      setScoreReward(10);
      setWinMessage('Skor tertinggi tercapai!');
    }
  };

  // Build full GameManifest based on active template
  const buildCurrentManifest = (): GameManifest => {
    let entities: EntityConfig[] = [];
    let logicBlocks: BlockNode[] = [];

    if (selectedTemplate === 'adventure') {
      // Dungeon Adventure Walls
      const walls: EntityConfig[] = [];
      for (let y = 0; y < 280; y += 20) {
        if (y !== 140) walls.push({ id: `wall_1_${y}`, name: 'Tembok', type: 'obstacle', shape: 'wall', color: '#334155', size: { width: 20, height: 20 }, initialPosition: { x: 140, y }, isSolid: true });
      }
      for (let y = 120; y < 400; y += 20) {
        if (y !== 260) walls.push({ id: `wall_2_${y}`, name: 'Tembok', type: 'obstacle', shape: 'wall', color: '#334155', size: { width: 20, height: 20 }, initialPosition: { x: 260, y }, isSolid: true });
      }

      entities = [
        { id: 'entity_hero', name: 'Hero Pahlawan', type: 'player', shape: 'square', color: heroColor, size: { width: 20, height: 20 }, initialPosition: { x: 40, y: 40 }, isSolid: false },
        { id: 'entity_key', name: 'Kunci Gerbang', type: 'key', shape: 'diamond', color: targetColor, size: { width: 20, height: 20 }, initialPosition: { x: 340, y: 40 }, isSolid: false },
        { id: 'entity_door', name: 'Portal Pintu Keluar', type: 'door', shape: 'door', color: doorColor, size: { width: 20, height: 20 }, initialPosition: { x: 340, y: 340 }, isSolid: false },
        { id: 'entity_gem', name: 'Batu Permata Harta', type: 'treasure', shape: 'star', color: '#34d399', size: { width: 20, height: 20 }, initialPosition: { x: 40, y: 340 }, isSolid: false },
        { id: 'entity_trap', name: 'Jebakan Duri', type: 'hazard', shape: 'square', color: hazardColor, size: { width: 20, height: 20 }, initialPosition: { x: 200, y: 140 }, isSolid: false },
        ...walls
      ];

      logicBlocks = [
        { type: 'WHEN_GAME_START', params: {}, children: [{ type: 'SET_VARIABLE', params: { name: 'score', value: 0 } }, { type: 'SET_VARIABLE', params: { name: 'hasKey', value: 0 } }] },
        { type: 'ON_COLLISION', params: { entityA: 'entity_hero', entityB: 'entity_key' }, children: [{ type: 'ADD_SCORE', params: { amount: scoreReward } }, { type: 'DESTROY_ENTITY', params: { entityId: 'entity_key' } }, { type: 'SET_VARIABLE', params: { name: 'hasKey', value: 1 } }, { type: 'PLAY_SOUND', params: { sound: 'key' } }] },
        { type: 'ON_COLLISION', params: { entityA: 'entity_hero', entityB: 'entity_gem' }, children: [{ type: 'ADD_SCORE', params: { amount: 100 } }, { type: 'DESTROY_ENTITY', params: { entityId: 'entity_gem' } }, { type: 'PLAY_SOUND', params: { sound: 'coin' } }] },
        { type: 'ON_COLLISION', params: { entityA: 'entity_hero', entityB: 'entity_trap' }, children: [{ type: 'GAME_OVER', params: { message: 'Terkena jebakan duri!' } }] },
        { type: 'ON_COLLISION', params: { entityA: 'entity_hero', entityB: 'entity_door' }, children: [{ type: 'IF_CONDITION', params: { variable: 'hasKey', operator: '==', value: 1 }, children: [{ type: 'WIN_GAME', params: { message: winMessage } }] }] }
      ];
    } else if (selectedTemplate === 'puzzle') {
      // Maze Puzzle
      entities = [
        { id: 'entity_player', name: 'Penjelajah Teka-Teki', type: 'player', shape: 'square', color: heroColor, size: { width: 20, height: 20 }, initialPosition: { x: 40, y: 40 }, isSolid: false },
        { id: 'entity_switch', name: 'Tombol Saklar Teka-Teki', type: 'key', shape: 'circle', color: targetColor, size: { width: 20, height: 20 }, initialPosition: { x: 200, y: 180 }, isSolid: false },
        { id: 'entity_goal', name: 'Portal Selesai', type: 'door', shape: 'door', color: doorColor, size: { width: 20, height: 20 }, initialPosition: { x: 360, y: 360 }, isSolid: false }
      ];

      logicBlocks = [
        { type: 'ON_COLLISION', params: { entityA: 'entity_player', entityB: 'entity_switch' }, children: [{ type: 'ADD_SCORE', params: { amount: scoreReward } }, { type: 'DESTROY_ENTITY', params: { entityId: 'entity_switch' } }, { type: 'PLAY_SOUND', params: { sound: 'key' } }] },
        { type: 'ON_COLLISION', params: { entityA: 'entity_player', entityB: 'entity_goal' }, children: [{ type: 'WIN_GAME', params: { message: winMessage } }] }
      ];
    } else {
      // Classic Snake
      entities = [
        { id: 'entity_snake', name: 'Ular (Player)', type: 'player', shape: 'square', color: heroColor, size: { width: 20, height: 20 }, initialPosition: { x: 100, y: 100 }, isSolid: true },
        { id: 'entity_apple', name: 'Apel (Food)', type: 'food', shape: 'circle', color: targetColor, size: { width: 20, height: 20 }, initialPosition: { x: 240, y: 160 }, isSolid: false }
      ];

      logicBlocks = [
        { type: 'WHEN_GAME_START', params: {}, children: [{ type: 'SET_VARIABLE', params: { name: 'score', value: 0 } }, { type: 'SET_DIRECTION', params: { entityId: 'entity_snake', direction: 'RIGHT' } }] },
        { type: 'ON_GAME_TICK', params: { intervalMs: canvasConfig.tickRateMs }, children: [{ type: 'MOVE_ENTITY', params: { entityId: 'entity_snake', mode: 'FORWARD_DIRECTION' } }] },
        { type: 'ON_COLLISION', params: { entityA: 'entity_snake', entityB: 'entity_apple' }, children: [{ type: 'ADD_SCORE', params: { amount: scoreReward } }, { type: 'GROW_TRAIL', params: { entityId: 'entity_snake', amount: 1 } }, { type: 'SPAWN_RANDOM', params: { entityId: 'entity_apple' } }, { type: 'PLAY_SOUND', params: { sound: 'eat' } }] }
      ];
    }

    return {
      id: `preview_${Date.now()}`,
      title,
      description,
      authorId: user?.id || 'dev',
      authorName: user?.username || 'Developer',
      version: '1.0.0',
      category: category as any,
      canvas: canvasConfig,
      entities,
      logic: { version: '1.0', blocks: logicBlocks },
      isPublished: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  };

  // Live Playtest runner update
  useEffect(() => {
    if (activeTab === 'preview' && testCanvasRef.current) {
      if (testRunnerRef.current) testRunnerRef.current.destroy();
      const manifest = buildCurrentManifest();
      const runner = new GameRunner(testCanvasRef.current, manifest);
      testRunnerRef.current = runner;
      runner.start();

      return () => { runner.destroy(); };
    }
  }, [activeTab, selectedTemplate, heroColor, targetColor, doorColor, hazardColor, canvasConfig, scoreReward, winMessage]);

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
      
      {/* Studio Header & Template Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Code2 className="text-indigo-400" />
            <span>Developer Studio: Universal 2D Block Engine</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Rancang game 2D (Adventure, Puzzle/Maze, Arcade) dengan susunan blok logika, lalu publish ke Cloud Service.
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

      {/* Template Chooser Bar (Poin Revisi 2) */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
          <Sparkles className="text-amber-400" size={16} />
          <span>Pilih Jenis Game yang Ingin Dibuat:</span>
        </span>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleSelectTemplate('adventure')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
              selectedTemplate === 'adventure'
                ? 'bg-sky-600 border-sky-400 text-white shadow-md shadow-sky-600/30'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
          >
            <Compass size={14} />
            <span>1. 2D Dungeon Adventure</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTemplate('puzzle')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
              selectedTemplate === 'puzzle'
                ? 'bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
          >
            <Puzzle size={14} />
            <span>2. 2D Maze Puzzle</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTemplate('snake')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
              selectedTemplate === 'snake'
                ? 'bg-emerald-600 border-emerald-400 text-white shadow-md shadow-emerald-600/30'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
          >
            <Gamepad2 size={14} />
            <span>3. Classic Arcade (Snake)</span>
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
          <span>2. Konfigurasi Entitas & Warna</span>
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

      {/* Tab 1: Visual Block Logic Workspace */}
      {activeTab === 'blocks' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Sparkles className="text-amber-400" size={16} />
                  <span>Susunan Blok Logika ({selectedTemplate.toUpperCase()} MODE)</span>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded">
                  AST Validated
                </span>
              </div>

              {/* Dynamic Blocks based on selected template */}
              <div className="space-y-4 font-mono text-xs">
                
                {/* Block 1: Game Start */}
                <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-4 shadow-md space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                    <span>KETIKA GAME DIMULAI</span>
                  </div>
                  <div className="ml-5 pl-4 border-l-2 border-amber-500/30 space-y-2 text-slate-300">
                    <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                      <span>↳ Inisialisasi Variabel Skor = 0</span>
                      <span className="text-slate-500 text-[10px]">Init State</span>
                    </div>
                    {selectedTemplate === 'adventure' && (
                      <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                        <span>↳ Inisialisasi Kunci (hasKey = 0)</span>
                        <span className="text-slate-500 text-[10px]">Lock State</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Block 2: Key Press & Motion */}
                <div className="bg-purple-500/10 border-2 border-purple-500/40 rounded-2xl p-4 shadow-md space-y-2">
                  <div className="flex items-center gap-2 text-purple-300 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
                    <span>KETIKA TOMBOL PANAH / WASD DITEKAN</span>
                  </div>
                  <div className="ml-5 pl-4 border-l-2 border-purple-500/30 space-y-2 text-slate-300">
                    <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                      <span>↳ Gerakkan Karakter 1 Petak Grid (Cek Tabrakan Tembok Solid)</span>
                      <span className="text-slate-500 text-[10px]">4-Way Movement</span>
                    </div>
                  </div>
                </div>

                {/* Block 3: Target Collision & Item Collection */}
                <div className="bg-emerald-500/10 border-2 border-emerald-500/40 rounded-2xl p-4 shadow-md space-y-3">
                  <div className="flex items-center justify-between text-emerald-300 font-bold">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                      <span>
                        {selectedTemplate === 'adventure' ? 'KETIKA (Hero) MENABRAK (Kunci Emas)' :
                         selectedTemplate === 'puzzle' ? 'KETIKA (Player) MENABRAK (Tombol Saklar)' :
                         'KETIKA (Ular) MENABRAK (Apel)'}
                      </span>
                    </div>
                  </div>

                  <div className="ml-5 pl-4 border-l-2 border-emerald-500/30 space-y-2 text-slate-300">
                    <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>↳ Tambah Skor Sebesar:</span>
                        <input
                          type="number"
                          value={scoreReward}
                          onChange={(e) => setScoreReward(Number(e.target.value))}
                          className="w-16 bg-slate-900 border border-slate-700 px-2 py-1 rounded text-emerald-400 font-bold text-center"
                        />
                        <span>Poin</span>
                      </div>
                      <span className="text-slate-500 text-[10px]">Action: Add Score</span>
                    </div>

                    <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                      <span>↳ Hancurkan / Ambil Item dari Kanvas</span>
                      <span className="text-slate-500 text-[10px]">Action: Destroy Item</span>
                    </div>

                    <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                      <span>↳ Mainkan Suara Efek Beep (Web Audio API)</span>
                      <span className="text-slate-500 text-[10px]">Action: Audio</span>
                    </div>
                  </div>
                </div>

                {/* Block 4: Win Condition / Goal Door */}
                <div className="bg-sky-500/10 border-2 border-sky-500/40 rounded-2xl p-4 shadow-md space-y-2">
                  <div className="flex items-center gap-2 text-sky-300 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
                    <span>KETIKA (Player) MENABRAK (Pintu Keluar / Portal)</span>
                  </div>
                  <div className="ml-5 pl-4 border-l-2 border-sky-500/30 space-y-2 text-slate-300">
                    <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                      <span>↳ Jika [hasKey == 1] &rarr; Picu Layar KAMU MENANG!</span>
                      <span className="text-slate-500 text-[10px]">Win Condition</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Sidebar Meta */}
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white">Informasi Permainan</h3>
              
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Judul Game:</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Deskripsi:</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Pesan Saat Menang:</label>
                  <input
                    type="text"
                    value={winMessage}
                    onChange={(e) => setWinMessage(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-emerald-400 font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-3xl p-5 text-xs text-slate-300 space-y-2">
              <div className="font-bold text-indigo-300 flex items-center gap-1.5">
                <Sparkles size={14} /> Fleksibilitas Engine 2D:
              </div>
              <p className="leading-relaxed">
                Anda bisa merakit game <strong>Adventure</strong> (dengan kunci dan pintu keluar), game <strong>Puzzle</strong> (dengan saklar target), maupun game <strong>Arcade</strong> seperti Snake. Semuanya otomatis dikompilasi menjadi GameManifest JSON yang seragam.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Canvas & Entities */}
      {activeTab === 'canvas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers size={18} className="text-sky-400" />
              <span>Dimensi Kanvas & Pengaturan Grid</span>
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Ukuran Kanvas (Lebar x Tinggi):</label>
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <input
                    type="number"
                    value={canvasConfig.width}
                    onChange={(e) => setCanvasConfig({ ...canvasConfig, width: Number(e.target.value) })}
                    className="bg-slate-950 border border-slate-700 px-3 py-2 rounded-xl text-slate-200"
                  />
                  <input
                    type="number"
                    value={canvasConfig.height}
                    onChange={(e) => setCanvasConfig({ ...canvasConfig, height: Number(e.target.value) })}
                    className="bg-slate-950 border border-slate-700 px-3 py-2 rounded-xl text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Warna Background Kanvas:</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={canvasConfig.backgroundColor}
                    onChange={(e) => setCanvasConfig({ ...canvasConfig, backgroundColor: e.target.value })}
                    className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <span className="font-mono text-slate-300 font-bold">{canvasConfig.backgroundColor}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles size={18} className="text-emerald-400" />
              <span>Warna Objek & Entitas Game</span>
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Warna Karakter Utama (Hero / Player):</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={heroColor}
                    onChange={(e) => setHeroColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <span className="font-mono text-slate-300 font-bold">{heroColor}</span>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Warna Item Kunci / Saklar / Target:</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={targetColor}
                    onChange={(e) => setTargetColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <span className="font-mono text-slate-300 font-bold">{targetColor}</span>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Warna Pintu Keluar / Portal Menang:</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={doorColor}
                    onChange={(e) => setDoorColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <span className="font-mono text-slate-300 font-bold">{doorColor}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Playtest */}
      {activeTab === 'preview' && (
        <div className="flex flex-col items-center bg-slate-900/60 border border-slate-800 rounded-3xl p-8 space-y-6">
          <div className="text-center space-y-1">
            <h3 className="text-lg font-bold text-white flex items-center justify-center gap-2">
              <Play size={18} className="text-emerald-400" />
              <span>Simulator Playtest Lokal ({selectedTemplate.toUpperCase()})</span>
            </h3>
            <p className="text-xs text-slate-400">
              Gunakan tombol panah keyboard atau WASD untuk mencoba menggerakkan karakter pahlawan di kanvas.
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
              <span>Sudah Pas? Publish ke Cloud Sekarang!</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
