import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { GameManifest, BlockNode, EntityConfig } from '@blockgame/shared';
import { api } from '../services/api';
import { GameRunner } from '../engine/GameRunner';
import { DeveloperStudio } from '../components/DeveloperStudio';
import { 
  Play, Square, UploadCloud, CheckCircle2, 
  Trash2, Plus, Volume2, Sparkles, 
  Code, Flag, HelpCircle, RotateCcw, Info
} from 'lucide-react';

interface StudioViewProps {
  onGamePublished: (gameId: string) => void;
  onBack?: () => void;
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

// === PRESET TEMPLATES DATA ===
const ADVENTURE_SPRITES: EntityConfig[] = [
  { id: 'entity_hero', name: 'Hero (Ksatria)', type: 'player', shape: 'square', color: '#0284C7', size: { width: 20, height: 20 }, initialPosition: { x: 40, y: 40 }, isSolid: false },
  { id: 'entity_key', name: 'Kunci Gerbang', type: 'key', shape: 'diamond', color: '#FACC15', size: { width: 20, height: 20 }, initialPosition: { x: 340, y: 40 }, isSolid: false },
  { id: 'entity_door', name: 'Pintu Gerbang', type: 'door', shape: 'door', color: '#9333EA', size: { width: 20, height: 20 }, initialPosition: { x: 340, y: 340 }, isSolid: false },
  { id: 'entity_chest', name: 'Peti Harta Karun', type: 'treasure', shape: 'star', color: '#F59E0B', size: { width: 20, height: 20 }, initialPosition: { x: 40, y: 340 }, isSolid: false },
  { id: 'entity_trap', name: 'Jebakan Duri', type: 'hazard', shape: 'square', color: '#EF4444', size: { width: 20, height: 20 }, initialPosition: { x: 200, y: 140 }, isSolid: false }
];

const ADVENTURE_BLOCKS: ScratchBlockItem[] = [
  { id: 'b1', category: 'events', text: 'ketika 🏁 bendera diklik', color: '#FFBF00', type: 'WHEN_GAME_START', params: {}, shape: 'hat' },
  { id: 'b2', category: 'variables', text: 'atur [Skor] ke (0)', color: '#FF8C1A', type: 'SET_VARIABLE', params: { name: 'score', value: 0 }, shape: 'stack' },
  { id: 'b3', category: 'events', text: 'ketika tombol [Panah / WASD] ditekan', color: '#FFBF00', type: 'WHEN_KEY_PRESSED', params: {}, shape: 'hat' },
  { id: 'b4', category: 'motion', text: 'gerak karakter (1) petak di grid', color: '#4C97FF', type: 'MOVE_ENTITY', params: { mode: 'STEP_4WAY' }, shape: 'stack' },
  { id: 'b5', category: 'events', text: 'ketika menyentuh [Kunci Gerbang]', color: '#FFBF00', type: 'ON_COLLISION', params: { entityB: 'entity_key' }, shape: 'hat' },
  { id: 'b6', category: 'variables', text: 'tambah [Skor] sebesar (50)', color: '#FF8C1A', type: 'ADD_SCORE', params: { amount: 50 }, shape: 'stack' },
  { id: 'b7', category: 'looks', text: 'sembunyikan [Kunci Gerbang]', color: '#9966FF', type: 'DESTROY_ENTITY', params: { entityId: 'entity_key' }, shape: 'stack' },
  { id: 'b8', category: 'sound', text: 'bunyikan suara [ambil kunci]', color: '#CF63CF', type: 'PLAY_SOUND', params: { sound: 'key' }, shape: 'stack' },
  { id: 'b9', category: 'events', text: 'ketika menyentuh [Peti Harta Karun]', color: '#FFBF00', type: 'ON_COLLISION', params: { entityB: 'entity_chest' }, shape: 'hat' },
  { id: 'b10', category: 'variables', text: 'tambah [Skor] sebesar (100)', color: '#FF8C1A', type: 'ADD_SCORE', params: { amount: 100 }, shape: 'stack' },
  { id: 'b11', category: 'looks', text: 'sembunyikan [Peti Harta Karun]', color: '#9966FF', type: 'DESTROY_ENTITY', params: { entityId: 'entity_chest' }, shape: 'stack' },
  { id: 'b12', category: 'sound', text: 'bunyikan suara [koin emas]', color: '#CF63CF', type: 'PLAY_SOUND', params: { sound: 'coin' }, shape: 'stack' },
  { id: 'b13', category: 'events', text: 'ketika menyentuh [Pintu Gerbang]', color: '#FFBF00', type: 'ON_COLLISION', params: { entityB: 'entity_door' }, shape: 'hat' },
  { id: 'b14', category: 'control', text: 'menang level! [🏆 Selamat Kamu Berhasil Kabur!]', color: '#FFAB19', type: 'WIN_GAME', params: { message: 'Selamat! Kamu berhasil membuka gerbang dan kabur dari labirin!' }, shape: 'cap' },
  { id: 'b15', category: 'events', text: 'ketika menyentuh [Jebakan Duri]', color: '#FFBF00', type: 'ON_COLLISION', params: { entityB: 'entity_trap' }, shape: 'hat' },
  { id: 'b16', category: 'control', text: 'game over [💀 Kamu terkena jebakan duri!]', color: '#FFAB19', type: 'GAME_OVER', params: { message: 'Terkena jebakan duri!' }, shape: 'cap' }
];

const PUZZLE_SPRITES: EntityConfig[] = [
  { id: 'entity_hero', name: 'Hero Penjelajah', type: 'player', shape: 'square', color: '#0284C7', size: { width: 20, height: 20 }, initialPosition: { x: 40, y: 40 }, isSolid: false },
  { id: 'entity_key', name: 'Saklar Daya', type: 'key', shape: 'diamond', color: '#06B6D4', size: { width: 20, height: 20 }, initialPosition: { x: 340, y: 40 }, isSolid: false },
  { id: 'entity_door', name: 'Portal Keluar', type: 'door', shape: 'door', color: '#10B981', size: { width: 20, height: 20 }, initialPosition: { x: 340, y: 340 }, isSolid: false },
  { id: 'entity_chest', name: 'Kristal Energi', type: 'treasure', shape: 'star', color: '#8B5CF6', size: { width: 20, height: 20 }, initialPosition: { x: 40, y: 340 }, isSolid: false },
  { id: 'entity_trap', name: 'Penghalang Laser', type: 'hazard', shape: 'square', color: '#F43F5E', size: { width: 20, height: 20 }, initialPosition: { x: 200, y: 140 }, isSolid: false }
];

const SNAKE_SPRITES: EntityConfig[] = [
  { id: 'entity_hero', name: 'Kepala Ular', type: 'player', shape: 'square', color: '#10B981', size: { width: 20, height: 20 }, initialPosition: { x: 100, y: 100 }, isSolid: false },
  { id: 'entity_chest', name: 'Apel Merah', type: 'treasure', shape: 'star', color: '#EF4444', size: { width: 20, height: 20 }, initialPosition: { x: 200, y: 200 }, isSolid: false },
  { id: 'entity_trap', name: 'Duri Pinggir', type: 'hazard', shape: 'square', color: '#64748B', size: { width: 20, height: 20 }, initialPosition: { x: 300, y: 100 }, isSolid: false }
];

export const StudioView: React.FC<StudioViewProps> = ({ onGamePublished, onBack }) => {
  const { user } = useAuth();
  const [studioMode, setStudioMode] = useState<'blockly' | 'classic'>('blockly');

  // Template State
  const [selectedTemplate, setSelectedTemplate] = useState<'adventure' | 'puzzle' | 'snake'>('adventure');
  const [showGuide, setShowGuide] = useState(true);

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

  // Sprites List
  const [sprites, setSprites] = useState<EntityConfig[]>(ADVENTURE_SPRITES);
  const [selectedSpriteId, setSelectedSpriteId] = useState('entity_hero');
  const selectedSprite = sprites.find(s => s.id === selectedSpriteId) || sprites[0];

  // Active Script Blocks in Workspace
  const [workspaceBlocks, setWorkspaceBlocks] = useState<ScratchBlockItem[]>(ADVENTURE_BLOCKS);

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

  // Function to switch game template
  const handleLoadTemplate = (tmpl: 'adventure' | 'puzzle' | 'snake') => {
    setSelectedTemplate(tmpl);
    if (tmpl === 'adventure') {
      setProjectTitle('Petualangan Kesatria 2D');
      setProjectDesc('Kumpulkan kunci dan harta karun, hindari duri, lalu keluar melalui gerbang!');
      setSprites(ADVENTURE_SPRITES);
      setWorkspaceBlocks([...ADVENTURE_BLOCKS]);
    } else if (tmpl === 'puzzle') {
      setProjectTitle('Teka-Teki Saklar Ruang 2D');
      setProjectDesc('Sentuh saklar target untuk membuka portal keluar dan selesaikan teka-teki labirin!');
      setSprites(PUZZLE_SPRITES);
      setWorkspaceBlocks([...ADVENTURE_BLOCKS]);
    } else {
      setProjectTitle('Arcade Ular Klasik 2D');
      setProjectDesc('Kendalikan karakter untuk mengambil item dan dapatkan skor tertinggi!');
      setSprites(SNAKE_SPRITES);
      setWorkspaceBlocks([
        { id: 'sb1', category: 'events', text: 'ketika 🏁 bendera diklik', color: '#FFBF00', type: 'WHEN_GAME_START', params: {}, shape: 'hat' },
        { id: 'sb2', category: 'variables', text: 'atur [Skor] ke (0)', color: '#FF8C1A', type: 'SET_VARIABLE', params: { name: 'score', value: 0 }, shape: 'stack' },
        { id: 'sb3', category: 'events', text: 'ketika tombol [Panah / WASD] ditekan', color: '#FFBF00', type: 'WHEN_KEY_PRESSED', params: {}, shape: 'hat' },
        { id: 'sb4', category: 'motion', text: 'gerak karakter (1) petak di grid', color: '#4C97FF', type: 'MOVE_ENTITY', params: { mode: 'STEP_4WAY' }, shape: 'stack' },
        { id: 'sb5', category: 'events', text: 'ketika menyentuh [Peti Harta Karun]', color: '#FFBF00', type: 'ON_COLLISION', params: { entityB: 'entity_chest' }, shape: 'hat' },
        { id: 'sb6', category: 'variables', text: 'tambah [Skor] sebesar (50)', color: '#FF8C1A', type: 'ADD_SCORE', params: { amount: 50 }, shape: 'stack' },
        { id: 'sb7', category: 'sound', text: 'bunyikan suara [koin emas]', color: '#CF63CF', type: 'PLAY_SOUND', params: { sound: 'coin' }, shape: 'stack' },
        { id: 'sb8', category: 'events', text: 'ketika menyentuh [Jebakan Duri]', color: '#FFBF00', type: 'ON_COLLISION', params: { entityB: 'entity_trap' }, shape: 'hat' },
        { id: 'sb9', category: 'control', text: 'game over [💀 Menabrak Duri!]', color: '#FFAB19', type: 'GAME_OVER', params: { message: 'Menabrak rintangan!' }, shape: 'cap' }
      ]);
    }
    setSelectedSpriteId('entity_hero');
  };

  const handleResetDefaultBlocks = () => {
    if (selectedTemplate === 'adventure') {
      setWorkspaceBlocks([...ADVENTURE_BLOCKS]);
    } else if (selectedTemplate === 'puzzle') {
      setWorkspaceBlocks([...ADVENTURE_BLOCKS]);
    } else {
      handleLoadTemplate('snake');
    }
    setSelectedSpriteId('entity_hero');
  };

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
      category: selectedTemplate === 'snake' ? 'classic' : selectedTemplate,
      canvas: {
        width: canvasWidth,
        height: canvasHeight,
        gridSize: gridSize,
        backgroundColor: '#090d16',
        tickRateMs: 0,
        gameMode: selectedTemplate === 'snake' ? 'snake' : 'adventure'
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
  }, [sprites, workspaceBlocks.length, selectedTemplate]);

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

  // Publish Game
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

  if (studioMode === 'blockly') {
    return (
      <div className="relative w-full h-[calc(100vh-4rem)] flex flex-col">
        <DeveloperStudio
          onBack={onBack}
          onGamePublished={onGamePublished}
          onSwitchToClassic={() => setStudioMode('classic')}
        />
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
            className="bg-[#3373CC] hover:bg-[#285EA8] focus:bg-white focus:text-slate-900 border border-transparent focus:border-white text-xs font-bold px-3 py-1.5 rounded-md transition-all outline-none w-48 sm:w-60"
            placeholder="Judul Proyek Game"
          />

          {/* Template Preset Selector */}
          <div className="hidden md:flex items-center gap-1.5 bg-[#3373CC] px-2 py-1 rounded-lg border border-blue-300/30">
            <span className="text-[11px] font-bold text-blue-200">Preset:</span>
            <select
              value={selectedTemplate}
              onChange={(e) => handleLoadTemplate(e.target.value as any)}
              className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer"
            >
              <option value="adventure" className="text-slate-900">🏰 Petualangan Ksatria (Dungeon)</option>
              <option value="puzzle" className="text-slate-900">🧩 Teka-Teki Saklar (Puzzle)</option>
              <option value="snake" className="text-slate-900">🐍 Arcade Ular Klasik (Snake)</option>
            </select>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Switch to Scratch 3.0 Blockly */}
          <button
            type="button"
            onClick={() => setStudioMode('blockly')}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400 shadow-sm transition"
          >
            <Sparkles size={14} className="text-amber-300" />
            <span>Blockly Zelos (Scratch 3.0)</span>
          </button>

          {/* Guide Toggle */}
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-all border ${
              showGuide ? 'bg-amber-400 text-slate-900 border-amber-300 shadow-sm' : 'bg-[#3373CC] text-white border-blue-300/40 hover:bg-[#285EA8]'
            }`}
          >
            <HelpCircle size={14} />
            <span>{showGuide ? 'Tutup Panduan' : 'Panduan Bikin Game'}</span>
          </button>

          {/* Publish & Share to Cloud */}
          <button
            onClick={handlePublish}
            disabled={isPublishing || publishSuccess}
            className="flex items-center gap-1.5 bg-[#FFAB19] hover:bg-[#E69915] active:bg-[#CC8810] text-slate-900 font-black text-xs px-4 py-1.5 rounded-lg shadow-sm transition-all"
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

        {/* === KOLOM 2: LACI BLOK (BLOCK PALETTE DRAWER) === */}
        <div className="w-64 bg-[#F9F9F9] border-r border-slate-300 flex flex-col p-3 overflow-y-auto shrink-0 select-none">
          <div className="text-[11px] font-black uppercase text-slate-500 mb-3 px-1 tracking-wider">
            Koleksi Blok ({activeCategory.toUpperCase()})
          </div>

          <div className="space-y-2">
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
                  <div className="flex items-center gap-1.5">
                    {block.shape === 'hat' && <Flag size={12} className="text-white shrink-0" />}
                    <span>{block.text}</span>
                  </div>
                  <Plus size={14} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1" />
                </div>
              ))}
          </div>

          <div className="pt-4 mt-auto border-t border-slate-200 text-[10px] text-slate-400 text-center">
            💡 <em>Klik blok di atas untuk menambahkan ke lembar kerja skrip</em>
          </div>
        </div>

        {/* === KOLOM 3: SCRIPT WORKSPACE (LEMBAR KERJA SUSUNAN BLOK) === */}
        <div className="flex-1 bg-white relative overflow-y-auto p-5 flex flex-col">
          
          {/* A. Panduan Cepat / Tutorial Visual Langkah 1-2-3 (Bisa ditutup/buka) */}
          {showGuide && (
            <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 shadow-sm text-xs text-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-blue-900 text-xs">
                  <Sparkles size={16} className="text-amber-500" />
                  <span>Panduan Cepat: Cara Mengembangkan Game di Scratch Studio</span>
                </div>
                <button onClick={() => setShowGuide(false)} className="text-[11px] font-bold text-slate-500 hover:text-slate-800 underline">
                  Tutup Panduan
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <div className="p-2.5 bg-white rounded-xl border border-blue-100 space-y-1">
                  <span className="inline-block px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-black text-[9px] font-mono">LANGKAH 1</span>
                  <h4 className="font-bold text-slate-800 text-[11px]">Pilih Sprite Karakter</h4>
                  <p className="text-[10px] text-slate-500">Klik karakter di panel kanan bawah (Hero, Kunci, Pintu, Peti).</p>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-blue-100 space-y-1">
                  <span className="inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-black text-[9px] font-mono">LANGKAH 2</span>
                  <h4 className="font-bold text-slate-800 text-[11px]">Pasang Blok Perintah</h4>
                  <p className="text-[10px] text-slate-500">Klik blok warna di kiri untuk menambah logika pergerakan & skor.</p>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-blue-100 space-y-1">
                  <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-black text-[9px] font-mono">LANGKAH 3</span>
                  <h4 className="font-bold text-slate-800 text-[11px]">Uji di Simulator</h4>
                  <p className="text-[10px] text-slate-500">Klik Bendera Hijau 🏁 di atas kanvas, kendalikan hero dengan WASD / Panah.</p>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-blue-100 space-y-1">
                  <span className="inline-block px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-black text-[9px] font-mono">LANGKAH 4</span>
                  <h4 className="font-bold text-slate-800 text-[11px]">Simpan ke Cloud</h4>
                  <p className="text-[10px] text-slate-500">Klik tombol oranye "Simpan ke Cloud" di pojok kanan atas!</p>
                </div>
              </div>
            </div>
          )}

          {/* B. Header Lembar Kerja Skrip */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Code size={16} className="text-indigo-600" />
              <span>Area Skrip Pemrograman Blok untuk: <strong className="text-indigo-600">{selectedSprite.name}</strong></span>
              {selectedSprite.id === 'entity_hero' && (
                <span className="text-[10px] bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded font-mono font-bold">
                  Karakter Utama
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleResetDefaultBlocks}
                className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition-colors"
                title="Kembalikan blok ke susunan lengkap yang siap dimainkan"
              >
                <RotateCcw size={12} />
                <span>Reset ke Blok Standar</span>
              </button>

              <button
                onClick={() => setWorkspaceBlocks([])}
                className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors"
                title="Kosongkan lembar kerja"
              >
                <Trash2 size={12} />
                <span>Bersihkan</span>
              </button>

              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200 font-bold">
                {workspaceBlocks.length} Blok
              </span>
            </div>
          </div>

          {/* C. Notifikasi Pembantu jika Memilih Sprite Non-Hero */}
          {selectedSprite.id !== 'entity_hero' && (
            <div className="p-3 mb-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Info size={16} className="text-amber-600 shrink-0" />
                <span>Anda sedang memilih sprite <strong>{selectedSprite.name}</strong>. Logika utama pergerakan hero dan respon tabrakan diatur di sprite <strong>Hero (Ksatria)</strong>.</span>
              </div>
              <button
                onClick={() => setSelectedSpriteId('entity_hero')}
                className="shrink-0 px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] rounded-lg transition-colors shadow-sm"
              >
                Beralih ke Hero &rarr;
              </button>
            </div>
          )}

          {/* D. Susunan Blok Workspace (atau Tampilan Jika Kosong) */}
          {workspaceBlocks.length === 0 ? (
            <div className="py-16 text-center space-y-4 max-w-md mx-auto my-auto">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-500 mx-auto flex items-center justify-center shadow-sm">
                <Code size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-800 text-sm">Lembar Skrip Blok Masih Kosong</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Klik blok warna di panel kiri untuk mulai menyusun perintah logika, atau klik tombol di bawah untuk memasang skrip lengkap otomatis yang siap dimainkan!
                </p>
              </div>
              <button
                onClick={handleResetDefaultBlocks}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all"
              >
                <Sparkles size={15} />
                <span>Pasang Skrip Logika Lengkap (Otomatis)</span>
              </button>
            </div>
          ) : (
            <div className="space-y-1 max-w-xl pb-10">
              {workspaceBlocks.map((block) => (
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
          )}
        </div>

        {/* === KOLOM 4: STAGE & SPRITE MANAGER (KANAN) === */}
        <div className="w-[420px] bg-[#F0F4F7] border-l border-slate-300 flex flex-col shrink-0">
          
          {/* A. STAGE HEADER: GREEN FLAG & RED STOP & SCORE */}
          <div className="h-10 bg-white border-b border-slate-300 px-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={handleStartPlay}
                className={`p-1.5 rounded-md hover:bg-slate-100 transition-colors ${isLiveRunning ? 'bg-emerald-50 text-emerald-600' : 'text-emerald-500'}`}
                title="Mulai Jalankan (Green Flag)"
              >
                <Flag size={18} fill="currentColor" />
              </button>

              <button
                onClick={handleStopPlay}
                className="p-1.5 rounded-md hover:bg-slate-100 text-rose-500 transition-colors"
                title="Hentikan Game (Red Stop)"
              >
                <Square size={16} fill="currentColor" />
              </button>

              <div className="h-4 w-px bg-slate-200 mx-1"></div>

              <span className="text-[11px] font-mono text-slate-500">
                {isLiveRunning ? '🟢 Live Stage Running' : '⚪ Stage Siaga'}
              </span>
            </div>

            <div className="flex items-center gap-2 bg-[#FFAB19] text-slate-950 px-2 py-0.5 rounded font-black font-mono text-xs">
              <span>Skor:</span>
              <span>{score}</span>
            </div>
          </div>

          {/* B. STAGE CANVAS AREA */}
          <div className="p-3 bg-[#E9EEF2] flex items-center justify-center shrink-0">
            <div className="border-4 border-slate-700 rounded-2xl overflow-hidden shadow-md bg-black">
              <canvas
                ref={stageCanvasRef}
                width={canvasWidth}
                height={canvasHeight}
                className="block outline-none"
                tabIndex={0}
              />
            </div>
          </div>

          {/* C. SELECTED SPRITE INFO BAR */}
          <div className="h-10 bg-white border-y border-slate-300 px-4 flex items-center justify-between text-xs shrink-0 font-medium">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Sprite:</span>
              <strong className="text-indigo-600">{selectedSprite.name}</strong>
            </div>
            <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
              <span>x: {selectedSprite.initialPosition.x}</span>
              <span>y: {selectedSprite.initialPosition.y}</span>
              <span>Size: 100%</span>
            </div>
          </div>

          {/* D. SPRITES MANAGER GRID */}
          <div className="flex-1 bg-[#F9F9F9] p-3 overflow-y-auto">
            <div className="text-[11px] font-black uppercase text-slate-500 mb-2 px-1 tracking-wider">
              Daftar Sprites ({sprites.length})
            </div>

            <div className="grid grid-cols-3 gap-2">
              {sprites.map((sp) => (
                <div
                  key={sp.id}
                  onClick={() => setSelectedSpriteId(sp.id)}
                  className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    selectedSpriteId === sp.id
                      ? 'bg-blue-50 border-blue-500 shadow-sm ring-2 ring-blue-400/30'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
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
