import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole, GameManifest, BlockNode, EntityConfig } from '@blockgame/shared';
import { api } from '../services/api';
import { GameRunner } from '../engine/GameRunner';
import { 
  Play, Square, UploadCloud, CheckCircle2, 
  Trash2, Plus, RefreshCw, Volume2, 
  MousePointer, Zap, Compass, Sparkles, 
  Eye, EyeOff, Layers, Code, Flag, Settings2,
  Clock, AlertCircle, ShieldCheck
} from 'lucide-react';

interface StudioViewProps {
  onGamePublished: (gameId: string) => void;
}

type BlockCategory = 'events' | 'motion' | 'looks' | 'sound' | 'control' | 'sensing' | 'variables';

interface ScratchBlockItem {
  id: string;
  category: BlockCategory;
  text: string;
  color: string;
  type: string;
  params: Record<string, any>;
  shape: 'hat' | 'stack' | 'cap';
}

export const StudioView: React.FC<StudioViewProps> = ({ onGamePublished }) => {
  const { user, refreshUser } = useAuth();
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Active Category on Left Palette
  const [activeCategory, setActiveCategory] = useState<BlockCategory>('events');

  // Project Info
  const [projectTitle, setProjectTitle] = useState('Petualangan Kesatria 2D');
  const [projectDesc, setProjectDesc] = useState('Dibuat dengan Scratch Block Studio di BlockVerse');
  
  // Game Canvas State
  const [canvasWidth] = useState(400);
  const [canvasHeight] = useState(400);
  const [gridSize] = useState(20);
  const [score, setScore] = useState(0);
  const [isLiveRunning, setIsLiveRunning] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Sprites List (Karakter Orang, Kunci, Pintu, Harta, Duri)
  const [sprites, setSprites] = useState<EntityConfig[]>([
    {
      id: 'entity_hero',
      name: 'Hero (Ksatria)',
      type: 'player',
      shape: 'square',
      color: '#0284C7',
      size: { width: 20, height: 20 },
      initialPosition: { x: 40, y: 40 },
      isSolid: false
    },
    {
      id: 'entity_key',
      name: 'Kunci Gerbang',
      type: 'key',
      shape: 'diamond',
      color: '#FACC15',
      size: { width: 20, height: 20 },
      initialPosition: { x: 340, y: 40 },
      isSolid: false
    },
    {
      id: 'entity_door',
      name: 'Pintu Gerbang',
      type: 'door',
      shape: 'door',
      color: '#9333EA',
      size: { width: 20, height: 20 },
      initialPosition: { x: 340, y: 340 },
      isSolid: false
    },
    {
      id: 'entity_chest',
      name: 'Peti Harta Karun',
      type: 'treasure',
      shape: 'star',
      color: '#F59E0B',
      size: { width: 20, height: 20 },
      initialPosition: { x: 40, y: 340 },
      isSolid: false
    },
    {
      id: 'entity_trap',
      name: 'Jebakan Duri',
      type: 'hazard',
      shape: 'square',
      color: '#EF4444',
      size: { width: 20, height: 20 },
      initialPosition: { x: 200, y: 140 },
      isSolid: false
    }
  ]);

  const [selectedSpriteId, setSelectedSpriteId] = useState('entity_hero');
  const selectedSprite = sprites.find(s => s.id === selectedSpriteId) || sprites[0];

  // Active Script Blocks in Workspace (Scratch-like Stacks)
  const [workspaceBlocks, setWorkspaceBlocks] = useState<ScratchBlockItem[]>([
    {
      id: 'b1',
      category: 'events',
      text: 'ketika 🏁 bendera diklik',
      color: '#FFBF00',
      type: 'WHEN_GAME_START',
      params: {},
      shape: 'hat'
    },
    {
      id: 'b2',
      category: 'variables',
      text: 'atur [Skor] ke (0)',
      color: '#FF8C1A',
      type: 'SET_VARIABLE',
      params: { name: 'score', value: 0 },
      shape: 'stack'
    },
    {
      id: 'b3',
      category: 'events',
      text: 'ketika tombol [Panah / WASD] ditekan',
      color: '#FFBF00',
      type: 'WHEN_KEY_PRESSED',
      params: {},
      shape: 'hat'
    },
    {
      id: 'b4',
      category: 'motion',
      text: 'gerak karakter (1) petak di grid',
      color: '#4C97FF',
      type: 'MOVE_ENTITY',
      params: { mode: 'STEP_4WAY' },
      shape: 'stack'
    },
    {
      id: 'b5',
      category: 'events',
      text: 'ketika menyentuh [Kunci Gerbang]',
      color: '#FFBF00',
      type: 'ON_COLLISION',
      params: { entityB: 'entity_key' },
      shape: 'hat'
    },
    {
      id: 'b6',
      category: 'variables',
      text: 'tambah [Skor] sebesar (50)',
      color: '#FF8C1A',
      type: 'ADD_SCORE',
      params: { amount: 50 },
      shape: 'stack'
    },
    {
      id: 'b7',
      category: 'looks',
      text: 'sembunyikan [Kunci Gerbang]',
      color: '#9966FF',
      type: 'DESTROY_ENTITY',
      params: { entityId: 'entity_key' },
      shape: 'stack'
    },
    {
      id: 'b8',
      category: 'sound',
      text: 'bunyikan suara [koin emas]',
      color: '#CF63CF',
      type: 'PLAY_SOUND',
      params: { sound: 'key' },
      shape: 'stack'
    },
    {
      id: 'b9',
      category: 'events',
      text: 'ketika menyentuh [Pintu Gerbang]',
      color: '#FFBF00',
      type: 'ON_COLLISION',
      params: { entityB: 'entity_door' },
      shape: 'hat'
    },
    {
      id: 'b10',
      category: 'control',
      text: 'menang level! [🏆 Selamat Kamu Berhasil Kabur!]',
      color: '#FFAB19',
      type: 'WIN_GAME',
      params: { message: 'Selamat! Kamu berhasil membuka gerbang dan kabur dari labirin!' },
      shape: 'cap'
    }
  ]);

  // Stage Simulator Canvas
  const stageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const runnerRef = useRef<GameRunner | null>(null);

  // Available Palette Blocks Library (Scratch 3.0 Compatible Style)
  const availablePaletteBlocks: ScratchBlockItem[] = [
    // Motion (Biru)
    { id: 'p_motion_1', category: 'motion', text: 'gerak karakter (1) petak di grid', color: '#4C97FF', type: 'MOVE_ENTITY', params: { mode: 'STEP_4WAY' }, shape: 'stack' },
    { id: 'p_motion_2', category: 'motion', text: 'ubah x sebesar (20)', color: '#4C97FF', type: 'MOVE_X', params: { amount: 20 }, shape: 'stack' },
    { id: 'p_motion_3', category: 'motion', text: 'ubah y sebesar (20)', color: '#4C97FF', type: 'MOVE_Y', params: { amount: 20 }, shape: 'stack' },
    
    // Looks (Ungu)
    { id: 'p_looks_1', category: 'looks', text: 'sembunyikan [Kunci Gerbang]', color: '#9966FF', type: 'DESTROY_ENTITY', params: { entityId: 'entity_key' }, shape: 'stack' },
    { id: 'p_looks_2', category: 'looks', text: 'sembunyikan [Peti Harta Karun]', color: '#9966FF', type: 'DESTROY_ENTITY', params: { entityId: 'entity_chest' }, shape: 'stack' },
    { id: 'p_looks_3', category: 'looks', text: 'katakan [Halo Petualang!] selama (2) detik', color: '#9966FF', type: 'SAY_MESSAGE', params: { msg: 'Halo Petualang!' }, shape: 'stack' },

    // Sound (Pink)
    { id: 'p_sound_1', category: 'sound', text: 'bunyikan suara [koin emas]', color: '#CF63CF', type: 'PLAY_SOUND', params: { sound: 'coin' }, shape: 'stack' },
    { id: 'p_sound_2', category: 'sound', text: 'bunyikan suara [ambil kunci]', color: '#CF63CF', type: 'PLAY_SOUND', params: { sound: 'key' }, shape: 'stack' },

    // Events (Kuning)
    { id: 'p_events_1', category: 'events', text: 'ketika 🏁 bendera diklik', color: '#FFBF00', type: 'WHEN_GAME_START', params: {}, shape: 'hat' },
    { id: 'p_events_2', category: 'events', text: 'ketika tombol [Panah / WASD] ditekan', color: '#FFBF00', type: 'WHEN_KEY_PRESSED', params: {}, shape: 'hat' },
    { id: 'p_events_3', category: 'events', text: 'ketika menyentuh [Kunci Gerbang]', color: '#FFBF00', type: 'ON_COLLISION', params: { entityB: 'entity_key' }, shape: 'hat' },
    { id: 'p_events_4', category: 'events', text: 'ketika menyentuh [Peti Harta Karun]', color: '#FFBF00', type: 'ON_COLLISION', params: { entityB: 'entity_chest' }, shape: 'hat' },
    { id: 'p_events_5', category: 'events', text: 'ketika menyentuh [Pintu Gerbang]', color: '#FFBF00', type: 'ON_COLLISION', params: { entityB: 'entity_door' }, shape: 'hat' },
    { id: 'p_events_6', category: 'events', text: 'ketika menyentuh [Jebakan Duri]', color: '#FFBF00', type: 'ON_COLLISION', params: { entityB: 'entity_trap' }, shape: 'hat' },

    // Control (Oranye)
    { id: 'p_ctrl_1', category: 'control', text: 'menang level! [🏆 Selamat Kamu Berhasil Kabur!]', color: '#FFAB19', type: 'WIN_GAME', params: { message: 'Selamat! Kamu memenangkan petualangan!' }, shape: 'cap' },
    { id: 'p_ctrl_2', category: 'control', text: 'game over [💀 Kamu terkena jebakan duri!]', color: '#FFAB19', type: 'GAME_OVER', params: { message: 'Terkena jebakan!' }, shape: 'cap' },
    { id: 'p_ctrl_3', category: 'control', text: 'ulangi selamanya', color: '#FFAB19', type: 'FOREVER', params: {}, shape: 'stack' },

    // Variables (Oranye Tua)
    { id: 'p_var_1', category: 'variables', text: 'atur [Skor] ke (0)', color: '#FF8C1A', type: 'SET_VARIABLE', params: { name: 'score', value: 0 }, shape: 'stack' },
    { id: 'p_var_2', category: 'variables', text: 'tambah [Skor] sebesar (50)', color: '#FF8C1A', type: 'ADD_SCORE', params: { amount: 50 }, shape: 'stack' },
    { id: 'p_var_3', category: 'variables', text: 'tambah [Skor] sebesar (100)', color: '#FF8C1A', type: 'ADD_SCORE', params: { amount: 100 }, shape: 'stack' }
  ];

  // Build GameManifest from current studio state
  const buildCurrentManifest = (): GameManifest => {
    // Maze stone walls
    const walls: EntityConfig[] = [];
    for (let y = 0; y < 280; y += 20) {
      if (y !== 140) walls.push({ id: `wall_1_${y}`, name: 'Tembok', type: 'obstacle', shape: 'wall', color: '#334155', size: { width: 20, height: 20 }, initialPosition: { x: 140, y }, isSolid: true });
    }
    for (let y = 120; y < 400; y += 20) {
      if (y !== 260) walls.push({ id: `wall_2_${y}`, name: 'Tembok', type: 'obstacle', shape: 'wall', color: '#334155', size: { width: 20, height: 20 }, initialPosition: { x: 260, y }, isSolid: true });
    }

    const allEntities = [...sprites, ...walls];

    // Convert workspace blocks into valid GameLogicAST
    const logicBlocks: BlockNode[] = [];

    // Group blocks by hat events
    let currentHat: BlockNode | null = null;
    for (const b of workspaceBlocks) {
      if (b.shape === 'hat') {
        currentHat = {
          type: b.type as any,
          params: b.params,
          children: []
        };
        logicBlocks.push(currentHat);
      } else if (currentHat && currentHat.children) {
        currentHat.children.push({
          type: b.type as any,
          params: b.params
        });
      }
    }

    return {
      id: `game_${Date.now()}`,
      title: projectTitle,
      description: projectDesc,
      authorId: user?.id || 'dev',
      authorName: user?.username || 'Developer',
      version: '1.0.0',
      category: 'adventure',
      canvas: {
        width: canvasWidth,
        height: canvasHeight,
        gridSize: gridSize,
        backgroundColor: '#090d16',
        tickRateMs: 0,
        gameMode: 'adventure'
      },
      entities: allEntities,
      logic: { version: '1.0', blocks: logicBlocks },
      isPublished: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  };

  // Start / Play Live Stage
  const handleStartPlay = () => {
    if (!stageCanvasRef.current) return;
    if (runnerRef.current) runnerRef.current.destroy();

    const manifest = buildCurrentManifest();
    const runner = new GameRunner(stageCanvasRef.current, manifest);
    runnerRef.current = runner;

    runner.onScoreChange = (newScore) => setScore(newScore);
    runner.start();
    setIsLiveRunning(true);
  };

  // Stop Live Stage
  const handleStopPlay = () => {
    if (runnerRef.current) {
      runnerRef.current.stop();
    }
    setIsLiveRunning(false);
  };

  useEffect(() => {
    handleStartPlay();
    return () => {
      if (runnerRef.current) runnerRef.current.destroy();
    };
  }, [sprites]);

  // Add block from palette to workspace
  const handleAddBlock = (block: ScratchBlockItem) => {
    const newBlock: ScratchBlockItem = {
      ...block,
      id: `b_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`
    };
    setWorkspaceBlocks(prev => [...prev, newBlock]);
  };

  // Delete block from workspace
  const handleDeleteBlock = (id: string) => {
    setWorkspaceBlocks(prev => prev.filter(b => b.id !== id));
  };

  // Publish Game to Cloud Service
  const handlePublish = async () => {
    try {
      setIsPublishing(true);
      const manifest = buildCurrentManifest();
      const res = await api.publishGame({
        title: manifest.title,
        description: manifest.description,
        category: manifest.category,
        canvas: manifest.canvas,
        entities: manifest.entities,
        logic: manifest.logic
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

  if (user?.role === UserRole.DEVELOPER && user?.status === 'PENDING') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center shadow-xl shadow-amber-500/10">
          <Clock size={40} className="animate-spin" style={{ animationDuration: '6s' }} />
        </div>
        
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider font-mono">
            Status Akun: Menunggu Approval (Pending)
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Akun Developer Anda Belum Disetujui
          </h2>
          <p className="text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
            Halo <strong>{user.username}</strong>! Pendaftaran akun Developer Anda telah berhasil disimpan di Cloud Service. Namun, untuk menjaga keamanan dan standar platform game, akun Developer baru memerlukan <strong>persetujuan (approval) dari Cloud Admin</strong> sebelum dapat membuat dan mempublikasikan game.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 max-w-md mx-auto text-left space-y-2 text-xs">
          <div className="font-bold text-slate-200 flex items-center gap-2">
            <ShieldCheck size={16} className="text-indigo-400" />
            <span>Alur Verifikasi Cloud Service:</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-slate-400 pl-1">
            <li>Admin menerima permohonan Anda di portal <strong>Cloud Admin</strong>.</li>
            <li>Admin memverifikasi dan menyetujui akun developer Anda.</li>
            <li>Setelah disetujui, editor Scratch Studio otomatis aktif sepenuhnya!</li>
          </ol>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={async () => {
              setCheckingStatus(true);
              const updated = await refreshUser();
              setCheckingStatus(false);
              if (updated?.status === 'ACTIVE') {
                alert('Selamat! Akun Developer Anda telah disetujui Admin. Studio siap digunakan!');
              } else {
                alert('Status akun saat ini masih PENDING. Harap tunggu persetujuan Admin.');
              }
            }}
            disabled={checkingStatus}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-extrabold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition-all"
          >
            <RefreshCw size={16} className={checkingStatus ? 'animate-spin' : ''} />
            <span>{checkingStatus ? 'Memeriksa...' : 'Cek Status Persetujuan Sekarang'}</span>
          </button>
        </div>
      </div>
    );
  }

  if (user?.status === 'REJECTED') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border-2 border-rose-500/30 text-rose-400 mx-auto flex items-center justify-center">
          <AlertCircle size={40} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white">Permohonan Developer Ditolak</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Halo <strong>{user?.username}</strong>, permohonan akun developer Anda saat ini ditolak oleh Administrator. Silakan hubungi admin atau gunakan akun Player untuk bermain.
          </p>
        </div>
      </div>
    );
  }

  if (user?.role === UserRole.PLAYER) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-slate-800 border-2 border-slate-700 text-slate-400 mx-auto flex items-center justify-center">
          <Code size={40} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white">Akses Studio Terkunci</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Halaman Scratch Studio khusus untuk akun <strong>Developer</strong> dan <strong>Admin</strong>. Anda saat ini login sebagai Player.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#E9EEF2] text-slate-800 font-sans select-none overflow-hidden">
      
      {/* 1. TOP SCRATCH TOOLBAR */}
      <div className="h-12 bg-[#4D97FF] border-b border-[#3373CC] px-4 flex items-center justify-between text-white shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-black text-lg tracking-tight bg-[#3373CC] px-2.5 py-1 rounded-lg">
            <span>SCRATCH</span>
            <span className="text-[10px] bg-amber-400 text-slate-900 px-1 rounded font-mono">BLOCKS</span>
          </div>

          <div className="h-6 w-px bg-blue-300/40 mx-1"></div>

          {/* Project Title Input */}
          <input
            type="text"
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            className="bg-[#3373CC] hover:bg-[#285EA8] focus:bg-white focus:text-slate-900 border border-transparent focus:border-white text-xs font-bold px-3 py-1.5 rounded-md transition-all outline-none w-56 sm:w-64"
            placeholder="Judul Proyek Game"
          />
        </div>

        {/* Publish & Share to Cloud */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePublish}
            disabled={isPublishing || publishSuccess}
            className="flex items-center gap-1.5 bg-[#FFAB19] hover:bg-[#E69915] active:bg-[#CC8810] text-slate-900 font-black text-xs px-3.5 py-1.5 rounded-lg shadow-sm transition-all"
          >
            {publishSuccess ? (
              <>
                <CheckCircle2 size={15} />
                <span>Tersimpan di Cloud!</span>
              </>
            ) : (
              <>
                <UploadCloud size={15} />
                <span>{isPublishing ? 'Menyimpan...' : 'Simpan ke Cloud'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. MAIN 3-COLUMN WORKSPACE (PERSIS SCRATCH 3.0) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* === KOLOM 1: KATEGORI BLOK WARNA (ICON BAR) === */}
        <div className="w-16 bg-white border-r border-slate-300 flex flex-col items-center py-2 space-y-3 shrink-0 text-[10px] font-bold text-slate-500">
          <button
            onClick={() => setActiveCategory('motion')}
            className={`flex flex-col items-center gap-1 transition-all ${activeCategory === 'motion' ? 'text-[#4C97FF] scale-105' : 'hover:text-slate-800'}`}
          >
            <div className="w-6 h-6 rounded-full bg-[#4C97FF]"></div>
            <span>Gerak</span>
          </button>

          <button
            onClick={() => setActiveCategory('looks')}
            className={`flex flex-col items-center gap-1 transition-all ${activeCategory === 'looks' ? 'text-[#9966FF] scale-105' : 'hover:text-slate-800'}`}
          >
            <div className="w-6 h-6 rounded-full bg-[#9966FF]"></div>
            <span>Tampilan</span>
          </button>

          <button
            onClick={() => setActiveCategory('sound')}
            className={`flex flex-col items-center gap-1 transition-all ${activeCategory === 'sound' ? 'text-[#CF63CF] scale-105' : 'hover:text-slate-800'}`}
          >
            <div className="w-6 h-6 rounded-full bg-[#CF63CF]"></div>
            <span>Suara</span>
          </button>

          <button
            onClick={() => setActiveCategory('events')}
            className={`flex flex-col items-center gap-1 transition-all ${activeCategory === 'events' ? 'text-[#FFBF00] scale-105' : 'hover:text-slate-800'}`}
          >
            <div className="w-6 h-6 rounded-full bg-[#FFBF00]"></div>
            <span>Kejadian</span>
          </button>

          <button
            onClick={() => setActiveCategory('control')}
            className={`flex flex-col items-center gap-1 transition-all ${activeCategory === 'control' ? 'text-[#FFAB19] scale-105' : 'hover:text-slate-800'}`}
          >
            <div className="w-6 h-6 rounded-full bg-[#FFAB19]"></div>
            <span>Kontrol</span>
          </button>

          <button
            onClick={() => setActiveCategory('variables')}
            className={`flex flex-col items-center gap-1 transition-all ${activeCategory === 'variables' ? 'text-[#FF8C1A] scale-105' : 'hover:text-slate-800'}`}
          >
            <div className="w-6 h-6 rounded-full bg-[#FF8C1A]"></div>
            <span>Variabel</span>
          </button>
        </div>

        {/* === KOLOM 2: PALET BLOK PUZZLE (DRAWER) === */}
        <div className="w-64 bg-[#F9FAFB] border-r border-slate-300 p-3 overflow-y-auto space-y-2 shrink-0">
          <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2 px-1">
            Koleksi Blok ({activeCategory.toUpperCase()})
          </div>

          <div className="space-y-2.5">
            {availablePaletteBlocks
              .filter(b => b.category === activeCategory)
              .map((block) => (
                <div
                  key={block.id}
                  onClick={() => handleAddBlock(block)}
                  style={{ backgroundColor: block.color }}
                  className="group relative cursor-pointer px-3 py-2 rounded-xl text-white text-xs font-bold shadow-sm hover:brightness-110 active:scale-95 transition-all select-none border-t border-white/20 border-b border-black/20 flex items-center justify-between"
                  title="Klik untuk menambahkan blok ini ke workspace"
                >
                  {/* Puzzle Notch Representation */}
                  <div className="flex items-center gap-1.5">
                    {block.shape === 'hat' && <Flag size={12} className="text-white shrink-0" />}
                    <span>{block.text}</span>
                  </div>
                  <Plus size={14} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1" />
                </div>
              ))}
          </div>

          <div className="pt-4 border-t border-slate-200 text-[10px] text-slate-400 text-center">
            💡 <em>Klik blok di atas untuk menambahkan ke lembar kerja script</em>
          </div>
        </div>

        {/* === KOLOM 3: SCRIPT WORKSPACE (LEMBAR KERJA SUSUNAN BLOK) === */}
        <div className="flex-1 bg-white relative overflow-y-auto p-6 flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <Code size={16} className="text-indigo-600" />
              <span>Area Skrip Pemrograman Blok untuk: <strong className="text-indigo-600">{selectedSprite.name}</strong></span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">
              {workspaceBlocks.length} Blok Tersusun
            </span>
          </div>

          {/* Canvas Workspace Blocks Stack */}
          <div className="space-y-1 max-w-xl pb-10">
            {workspaceBlocks.map((block, idx) => (
              <div
                key={block.id}
                style={{ backgroundColor: block.color }}
                className={`group relative text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-sm border-t border-white/25 border-b border-black/20 flex items-center justify-between transition-all ${
                  block.shape === 'hat' 
                    ? 'rounded-t-2xl mt-4 border-l-4 border-l-white/40' 
                    : 'ml-3 border-l-2 border-l-white/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  {block.shape === 'hat' && <Flag size={13} className="text-white" />}
                  <span>{block.text}</span>
                </div>

                <button
                  onClick={() => handleDeleteBlock(block.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-black/20 rounded transition-all text-white/80 hover:text-white"
                  title="Hapus blok ini"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* === KOLOM 4: STAGE & SPRITE MANAGER (KANAN) === */}
        <div className="w-[420px] bg-[#F0F4F7] border-l border-slate-300 flex flex-col shrink-0">
          
          {/* A. STAGE HEADER: GREEN FLAG & RED STOP & SCORE */}
          <div className="h-10 bg-white border-b border-slate-300 px-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              {/* Green Flag (Play) */}
              <button
                onClick={handleStartPlay}
                className={`p-1.5 rounded-md hover:bg-slate-100 transition-colors ${isLiveRunning ? 'bg-emerald-50 text-emerald-600' : 'text-emerald-500'}`}
                title="Mulai Jalankan (Green Flag)"
              >
                <Flag size={18} fill="currentColor" />
              </button>

              {/* Red Octagon (Stop) */}
              <button
                onClick={handleStopPlay}
                className="p-1.5 rounded-md text-rose-500 hover:bg-slate-100 transition-colors"
                title="Hentikan Game"
              >
                <Square size={16} fill="currentColor" />
              </button>
            </div>

            {/* Score Variable HUD (Khas Scratch) */}
            <div className="bg-[#FF8C1A] text-white text-[11px] font-bold px-2.5 py-0.5 rounded shadow-inner flex items-center gap-2">
              <span>Skor:</span>
              <span className="font-mono text-sm">{score}</span>
            </div>
          </div>

          {/* B. STAGE CANVAS (DISPLAY SCREEN) */}
          <div className="p-3 bg-white flex justify-center items-center border-b border-slate-300">
            <div className="rounded-xl overflow-hidden border-2 border-slate-400 bg-slate-950 shadow-md">
              <canvas
                ref={stageCanvasRef}
                className="block cursor-crosshair"
                width={canvasWidth}
                height={canvasHeight}
              />
            </div>
          </div>

          {/* C. ACTIVE SPRITE CONTROLLER & ATTRIBUTES */}
          <div className="bg-white border-b border-slate-300 p-2.5 flex items-center justify-between text-xs text-slate-600 shrink-0 font-medium">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">Sprite:</span>
              <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-indigo-600 font-bold">{selectedSprite.name}</span>
            </div>

            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span>x: <strong>{selectedSprite.initialPosition.x}</strong></span>
              <span>y: <strong>{selectedSprite.initialPosition.y}</strong></span>
              <span>Size: <strong>100%</strong></span>
            </div>
          </div>

          {/* D. SPRITES LIST (SPRITE CARDS LIBRARY) */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2">
            <div className="text-[11px] font-bold text-slate-500 mb-1 flex items-center justify-between">
              <span>Daftar Sprites ({sprites.length})</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {sprites.map((sp) => (
                <div
                  key={sp.id}
                  onClick={() => setSelectedSpriteId(sp.id)}
                  className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    selectedSpriteId === sp.id
                      ? 'bg-blue-50 border-blue-500 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Sprite Thumbnail Icon */}
                  <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center border border-slate-700">
                    {sp.type === 'player' ? (
                      <span className="text-base">🦸‍♂️</span>
                    ) : sp.type === 'key' ? (
                      <span className="text-base">🗝️</span>
                    ) : sp.type === 'door' ? (
                      <span className="text-base">🚪</span>
                    ) : sp.type === 'treasure' ? (
                      <span className="text-base">💎</span>
                    ) : (
                      <span className="text-base">⚠️</span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 truncate w-full text-center">{sp.name}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
