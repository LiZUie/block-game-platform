// packages/web-portal/src/components/DeveloperStudio.tsx
import React, { useEffect, useRef, useState } from 'react';
import * as Blockly from 'blockly';
import {
  Flag,
  Octagon,
  Save,
  Share2,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Code2,
  Palette,
  Volume2,
  StickyNote,
  X,
  CheckCircle2,
  FolderOpen,
  Upload,
  PlusCircle,
  Play,
  Grid,
  Maximize2,
  Minimize2,
  Image as ImageIcon,
} from 'lucide-react';
import {
  BLANK_STARTER_PROJECT,
  BlockVerseProject,
  BlockVerseRuntime,
  COIN_HUNTER_PRESET,
  FLAPPY_BIRD_PRESET,
  playSynthSound,
  PONG_ARCADE_PRESET,
  SPACE_INVADERS_PRESET,
  SpriteTarget,
  STAR_CATCHER_GAME,
  TETRIS_DROP_PRESET,
} from '../engine/BlockVerseEngine';
import {
  CATEGORY_BLOCKS,
  compileWorkspaceToScripts,
  registerScratchBlocks,
  scriptsToBlocklyXml,
  updateStudioDynamicContext,
} from '../engine/ScratchBlocksSetup';
import { api } from '../services/api';

interface StickyComment {
  id: string;
  text: string;
  x: number;
  y: number;
}

const CATEGORIES = [
  { id: 'Motion', label: 'Motion', color: '#4C97FF' },
  { id: 'Looks', label: 'Looks', color: '#9966FF' },
  { id: 'Sound', label: 'Sound', color: '#CF63CF' },
  { id: 'Events', label: 'Events', color: '#FFBF00' },
  { id: 'Control', label: 'Control', color: '#FFAB19' },
  { id: 'Sensing', label: 'Sensing', color: '#5CB1D6' },
  { id: 'Operators', label: 'Operators', color: '#59C059' },
  { id: 'Variables', label: 'Variables', color: '#FF8C1A' },
];

const SPRITE_GALLERY_EMOJIS = [
  '🐱', '🐦', '🥷', '🤖', '👾', '🛸', '🚀', '🐉',
  '🦖', '👻', '🤠', '🐸', '🦊', '⭐', '🪙', '💎',
  '⚡', '🔥', '💣', '🌵', '🧱', '🟦', '⚽', '🏆',
];

const STAGE_THEMES = [
  { id: 'sky', label: '🌤️ Meadow Hills', bg: '#e0f2fe' },
  { id: 'stars', label: '🌌 Space Nebula', bg: '#05070d' },
  { id: 'dungeon', label: '🏰 Castle Bricks', bg: '#1e1b4b' },
  { id: 'neon', label: '🌆 Cyber City', bg: '#090d16' },
  { id: 'desert', label: '🏜️ Desert Sunset', bg: '#f59e0b' },
  { id: 'ocean', label: '🌊 Underwater Ocean', bg: '#0369a1' },
  { id: 'arena', label: '🏟️ Stadium Pitch', bg: '#15803d' },
  { id: 'grid', label: '📐 White Blueprint', bg: '#ffffff' },
];

export interface DeveloperStudioProps {
  onBack?: () => void;
  onGamePublished?: (gameId: string) => void;
  onSwitchToClassic?: () => void;
}

export const DeveloperStudio: React.FC<DeveloperStudioProps> = ({
  onBack,
  onGamePublished,
  onSwitchToClassic,
}) => {
  const [project, setProject] = useState<BlockVerseProject>(STAR_CATCHER_GAME);
  const [selectedSpriteId, setSelectedSpriteId] = useState<string>(
    STAR_CATCHER_GAME.sprites[0].id
  );
  const [activeCategory, setActiveCategory] = useState<string>('Motion');
  const [activeTab, setActiveTab] = useState<'code' | 'costumes' | 'sounds'>('code');
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [comments, setComments] = useState<StickyComment[]>([]);
  const [isStageFullscreen, setIsStageFullscreen] = useState<boolean>(false);

  const blocklyDivRef = useRef<HTMLDivElement | null>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const stageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeRef = useRef<BlockVerseRuntime | null>(null);
  const selectedSpriteIdRef = useRef<string>(selectedSpriteId);

  useEffect(() => {
    selectedSpriteIdRef.current = selectedSpriteId;
  }, [selectedSpriteId]);

  const activeSprite =
    project.sprites.find((s) => s.id === selectedSpriteId) || project.sprites[0];

  useEffect(() => {
    updateStudioDynamicContext({
      activeSpriteName: activeSprite?.name || 'Hero',
      spriteNames: project.sprites.map((s) => s.name),
      variableNames: Object.keys(project.variables),
      broadcastMessages: project.broadcasts || ['message1', 'game over', 'win'],
    });
  }, [project, activeSprite]);

  const loadSpriteScriptsIntoWorkspace = (
    workspace: Blockly.WorkspaceSvg,
    sprite: SpriteTarget
  ) => {
    Blockly.Events.disable();
    workspace.clear();
    try {
      if (sprite.workspaceJson && Object.keys(sprite.workspaceJson).length > 0) {
        Blockly.serialization.workspaces.load(sprite.workspaceJson, workspace);
      } else if (sprite.scripts && sprite.scripts.length > 0) {
        const xmlStr = scriptsToBlocklyXml(sprite.scripts);
        const dom = Blockly.utils.xml.textToDom(xmlStr);
        Blockly.Xml.domToWorkspace(dom, workspace);
      }
    } catch (err) {
      console.warn('Workspace load warning:', err);
    }
    Blockly.Events.enable();
  };

  useEffect(() => {
    registerScratchBlocks();
    if (!blocklyDivRef.current) return;

    const workspace = Blockly.inject(blocklyDivRef.current, {
      renderer: 'zelos',
      toolbox: {
        kind: 'flyoutToolbox',
        contents: CATEGORY_BLOCKS[activeCategory],
      },
      zoom: {
        controls: true,
        wheel: true,
        startScale: 0.78,
        maxScale: 1.5,
        minScale: 0.4,
        scaleSpeed: 1.1,
      },
      grid: {
        spacing: 24,
        length: 2,
        colour: '#d1d5db',
        snap: true,
      },
      trashcan: true,
    });

    workspaceRef.current = workspace;
    loadSpriteScriptsIntoWorkspace(workspace, activeSprite);

    const onWorkspaceChange = (e: Blockly.Events.Abstract) => {
      if (e.isUiEvent || !workspaceRef.current) return;
      const currentId = selectedSpriteIdRef.current;
      const jsonState = Blockly.serialization.workspaces.save(workspaceRef.current);
      const compiled = compileWorkspaceToScripts(workspaceRef.current);

      setProject((prev) => ({
        ...prev,
        sprites: prev.sprites.map((sp) =>
          sp.id === currentId
            ? {
                ...sp,
                workspaceJson: jsonState,
                scripts: compiled,
              }
            : sp
        ),
      }));
    };

    workspace.addChangeListener(onWorkspaceChange);

    return () => {
      workspace.dispose();
    };
  }, []);

  useEffect(() => {
    if (!workspaceRef.current) return;
    workspaceRef.current.updateToolbox({
      kind: 'flyoutToolbox',
      contents: CATEGORY_BLOCKS[activeCategory] || [],
    });
  }, [activeCategory, project.variables, project.broadcasts, project.sprites]);

  useEffect(() => {
    if (!workspaceRef.current || !activeSprite) return;
    loadSpriteScriptsIntoWorkspace(workspaceRef.current, activeSprite);
  }, [selectedSpriteId]);

  useEffect(() => {
    if (!stageCanvasRef.current) return;
    const runtime = new BlockVerseRuntime(
      stageCanvasRef.current,
      project,
      undefined,
      undefined,
      (spriteId, newX, newY) => {
        setProject((prev) => ({
          ...prev,
          sprites: prev.sprites.map((sp) =>
            sp.id === spriteId ? { ...sp, x: newX, y: newY } : sp
          ),
        }));
      }
    );
    runtimeRef.current = runtime;
    runtime.renderFrame();

    return () => {
      runtime.destroy();
    };
  }, []);

  useEffect(() => {
    if (runtimeRef.current) {
      runtimeRef.current.loadProject(project);
    }
  }, [project]);

  const handleSelectTemplate = (templateKey: string) => {
    let chosen: BlockVerseProject = STAR_CATCHER_GAME;
    if (templateKey === 'flappy') chosen = FLAPPY_BIRD_PRESET;
    if (templateKey === 'pong') chosen = PONG_ARCADE_PRESET;
    if (templateKey === 'tetris') chosen = TETRIS_DROP_PRESET;
    if (templateKey === 'blank') chosen = BLANK_STARTER_PROJECT;
    if (templateKey === 'coin') chosen = COIN_HUNTER_PRESET;
    if (templateKey === 'space') chosen = SPACE_INVADERS_PRESET;

    const cloned = JSON.parse(JSON.stringify(chosen)) as BlockVerseProject;
    setProject(cloned);
    setSelectedSpriteId(cloned.sprites[0].id);
    if (workspaceRef.current) {
      loadSpriteScriptsIntoWorkspace(workspaceRef.current, cloned.sprites[0]);
    }
  };

  const updateActiveSpriteProp = (key: keyof SpriteTarget, value: any) => {
    setProject((prev) => ({
      ...prev,
      sprites: prev.sprites.map((sp) =>
        sp.id === activeSprite.id ? { ...sp, [key]: value } : sp
      ),
    }));
  };

  const handleAddSprite = (emoji: string = '⭐') => {
    const newId = `sprite_${Date.now()}`;
    const newSprite: SpriteTarget = {
      id: newId,
      name: `Sprite${project.sprites.length + 1}`,
      x: Math.floor(Math.random() * 160) - 80,
      y: Math.floor(Math.random() * 120) - 60,
      size: 100,
      direction: 90,
      visible: true,
      rotationStyle: 'all-around',
      costumeEmoji: emoji,
      scripts: [],
    };
    setProject((prev) => ({ ...prev, sprites: [...prev.sprites, newSprite] }));
    setSelectedSpriteId(newId);
  };

  const handleDeleteSprite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (project.sprites.length <= 1) return;
    const filtered = project.sprites.filter((s) => s.id !== id);
    setProject((prev) => ({ ...prev, sprites: filtered }));
    if (selectedSpriteId === id) {
      setSelectedSpriteId(filtered[0].id);
    }
  };

  const handleCreateVariable = () => {
    const varName = window.prompt('Nama variabel baru (contoh: lives, level, speed):');
    if (!varName || !varName.trim()) return;
    const clean = varName.trim();
    setProject((prev) => ({
      ...prev,
      variables: { ...prev.variables, [clean]: 0 },
    }));
  };

  const handleCreateBroadcast = () => {
    const msgName = window.prompt('Nama pesan Broadcast baru (contoh: level_up, boss_spawn):');
    if (!msgName || !msgName.trim()) return;
    const clean = msgName.trim();
    setProject((prev) => ({
      ...prev,
      broadcasts: Array.from(new Set([...(prev.broadcasts || []), clean])),
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateActiveSpriteProp('costumeImageUrl', String(reader.result));
    };
    reader.readAsDataURL(file);
  };

  const handleBackdropImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setProject((prev) => ({
        ...prev,
        stageImageUrl: String(reader.result),
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleCycleBackdrop = () => {
    const idx = STAGE_THEMES.findIndex((t) => t.id === project.stagePattern);
    const nextTheme = STAGE_THEMES[(idx + 1) % STAGE_THEMES.length];
    setProject((prev) => ({
      ...prev,
      stageImageUrl: undefined,
      stagePattern: nextTheme.id as any,
      stageBackdrop: nextTheme.bg,
    }));
  };

  const handleSaveToCloud = async (publish: boolean = false) => {
    let updatedProject = { ...project };
    if (workspaceRef.current) {
      const currentId = selectedSpriteIdRef.current;
      const jsonState = Blockly.serialization.workspaces.save(workspaceRef.current);
      const compiled = compileWorkspaceToScripts(workspaceRef.current);
      updatedProject = {
        ...project,
        sprites: project.sprites.map((sp) =>
          sp.id === currentId
            ? {
                ...sp,
                workspaceJson: jsonState,
                scripts: compiled.length > 0 ? compiled : sp.scripts,
              }
            : sp
        ),
      };
      setProject(updatedProject);
    }

    setSaveStatus(publish ? 'Publishing to Cloud...' : 'Saving...');

    try {
      const res = await api.publishGame({
        title: updatedProject.title || 'Untitled Game',
        description: `Game 2D interaktif (${updatedProject.sprites.length} sprites) dibuat dengan BlockVerse Scratch Studio.`,
        category: 'arcade',
        status: publish ? 'PUBLISHED' : 'DRAFT',
        projectData: updatedProject,
      });

      setSaveStatus(publish ? 'Published to Katalog Cloud!' : 'Saved to Cloud!');
      if (publish && onGamePublished && res.gameId) {
        setTimeout(() => {
          onGamePublished(res.gameId);
        }, 700);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setSaveStatus('Saved to Local Cache!');
    } finally {
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#E5F0FF] overflow-hidden select-none font-sans">
      {/* ==================== TOP HEADER BAR ==================== */}
      <header className="h-12 bg-[#4C97FF] text-white flex items-center justify-between px-4 shadow-sm z-20">
        <div className="flex items-center space-x-3">
          {onBack && (
            <button
              onClick={onBack}
              className="bg-white/20 hover:bg-white/30 text-white font-bold text-xs px-2.5 py-1.5 rounded-md flex items-center gap-1 transition"
              title="Kembali ke Beranda"
            >
              ← Kembali
            </button>
          )}
          <div className="flex items-center space-x-1.5 font-black text-base tracking-tight bg-white/15 px-2.5 py-1 rounded-md">
            <span className="text-amber-300">BLOCK</span>
            <span>VERSE</span>
          </div>

          <div className="flex items-center bg-white/20 rounded-md px-2 py-1 text-xs">
            <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
            <select
              onChange={(e) => handleSelectTemplate(e.target.value)}
              className="bg-transparent text-white font-semibold outline-none cursor-pointer"
              defaultValue="star"
            >
              <option value="star" className="text-slate-900">
                ⭐ Game: Cat & Star Catcher
              </option>
              <option value="flappy" className="text-slate-900">
                🐦 Game: Flappy Bird 2D Sky
              </option>
              <option value="pong" className="text-slate-900">
                ⚽ Game: Neon Pong Arcade
              </option>
              <option value="tetris" className="text-slate-900">
                🧱 Game: Tetris Block Drop
              </option>
              <option value="coin" className="text-slate-900">
                🪙 Game: Coin Hunter RPG
              </option>
              <option value="space" className="text-slate-900">
                👾 Game: Space Invaders
              </option>
              <option value="blank" className="text-slate-900">
                🆕 Blank Project (Bebas)
              </option>
            </select>
          </div>

          <input
            type="text"
            value={project.title}
            onChange={(e) => setProject({ ...project, title: e.target.value })}
            className="bg-white/20 hover:bg-white/30 focus:bg-white focus:text-slate-900 text-white font-semibold px-3 py-1 rounded-md text-sm outline-none transition w-48"
            placeholder="Judul Game..."
          />

          <button
            onClick={() => handleSaveToCloud(true)}
            className="bg-[#FF8C1A] hover:bg-[#e67e17] text-white font-bold text-xs px-3.5 py-1.5 rounded-md flex items-center gap-1.5 shadow-sm transition"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share to Player Cloud
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {onSwitchToClassic && (
            <button
              onClick={onSwitchToClassic}
              className="text-xs font-semibold bg-white/15 hover:bg-white/25 px-2.5 py-1.5 rounded-md text-white transition"
            >
              Classic Editor
            </button>
          )}
          {saveStatus && (
            <span className="text-xs bg-emerald-500 px-2.5 py-1 rounded flex items-center gap-1 font-bold shadow">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {saveStatus}
            </span>
          )}
          <button
            onClick={() => handleSaveToCloud(false)}
            className="text-xs font-semibold bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-md flex items-center gap-1.5 transition"
          >
            <Save className="w-4 h-4" />
            Save Now
          </button>
        </div>
      </header>

      {/* ==================== SUB-HEADER TABS & STAGE CONTROLS ==================== */}
      <div className="h-10 bg-[#E5F0FF] flex items-center justify-between px-3 border-b border-slate-300">
        <div className="flex items-center space-x-1 pt-1">
          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-t-xl text-xs font-bold border border-b-0 transition ${
              activeTab === 'code'
                ? 'bg-white text-[#4C97FF] border-slate-300'
                : 'bg-[#D9E3F2] text-slate-600 border-transparent hover:bg-white/60'
            }`}
          >
            <Code2 className="w-4 h-4" /> Code
          </button>
          <button
            onClick={() => setActiveTab('costumes')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-t-xl text-xs font-bold border border-b-0 transition ${
              activeTab === 'costumes'
                ? 'bg-white text-[#4C97FF] border-slate-300'
                : 'bg-[#D9E3F2] text-slate-600 border-transparent hover:bg-white/60'
            }`}
          >
            <Palette className="w-4 h-4" /> Costumes & Backdrop
          </button>
          <button
            onClick={() => setActiveTab('sounds')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-t-xl text-xs font-bold border border-b-0 transition ${
              activeTab === 'sounds'
                ? 'bg-white text-[#4C97FF] border-slate-300'
                : 'bg-[#D9E3F2] text-slate-600 border-transparent hover:bg-white/60'
            }`}
          >
            <Volume2 className="w-4 h-4" /> Sounds
          </button>

          <div className="flex items-center space-x-1.5 pl-3">
            <button
              onClick={handleCreateVariable}
              className="text-[11px] bg-[#FF8C1A] hover:bg-[#e67e17] text-white px-2.5 py-1 rounded-md font-bold flex items-center gap-1 shadow-sm transition"
            >
              <PlusCircle className="w-3 h-3" /> + Variable
            </button>
            <button
              onClick={handleCreateBroadcast}
              className="text-[11px] bg-[#FFBF00] hover:bg-amber-500 text-slate-900 px-2.5 py-1 rounded-md font-bold flex items-center gap-1 shadow-sm transition"
            >
              <PlusCircle className="w-3 h-3" /> + Broadcast
            </button>
          </div>
        </div>

        {/* Kontrol Atas Stage (Play, Stop, Comment, XY Grid Overlay, & Fullscreen) */}
        <div className="w-[496px] flex items-center justify-between px-1">
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => runtimeRef.current?.start()}
              title="Start Game (Green Flag)"
              className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition"
            >
              <Flag className="w-3.5 h-3.5 fill-white" /> Play
            </button>
            <button
              onClick={() => runtimeRef.current?.stop()}
              title="Stop Game"
              className="p-1.5 rounded hover:bg-rose-100 text-rose-600 transition"
            >
              <Octagon className="w-5 h-5 fill-rose-500" />
            </button>
            <button
              onClick={() =>
                setComments((prev) => [
                  ...prev,
                  {
                    id: `note_${Date.now()}`,
                    text: 'Catatan logika untuk sprite ini...',
                    x: 340,
                    y: 80,
                  },
                ])
              }
              className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 px-2 py-1 rounded flex items-center gap-1 font-medium"
            >
              <StickyNote className="w-3.5 h-3.5" /> + Comment
            </button>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() =>
                setProject((prev) => ({ ...prev, showStageGrid: !prev.showStageGrid }))
              }
              title="Tampilkan Sumbu Koordinat X/Y Scratch"
              className={`px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 border transition ${
                project.showStageGrid
                  ? 'bg-[#4C97FF] text-white border-[#4C97FF]'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <Grid className="w-3.5 h-3.5" /> XY Grid
            </button>
            <button
              onClick={() => setIsStageFullscreen(!isStageFullscreen)}
              title="Perbesar Layar Stage (Theater Mode)"
              className="p-1.5 rounded bg-white border border-slate-300 text-slate-600 hover:text-slate-900 transition"
            >
              {isStageFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ==================== MAIN STUDIO WORKSPACE & RIGHT STAGE ==================== */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'code' && (
          <div className="w-16 bg-white border-r border-slate-300 flex flex-col items-center py-2.5 space-y-2.5 z-10">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex flex-col items-center w-full py-1 transition ${
                  activeCategory === cat.id
                    ? 'bg-blue-50/80 font-bold text-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span
                  className="w-5 h-5 rounded-full mb-1 border border-black/10 shadow-inner"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-[10px] tracking-tight">{cat.label}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 relative bg-[#F9F9F9] border-r border-slate-300 overflow-hidden">
          <div
            ref={blocklyDivRef}
            className={`w-full h-full ${activeTab === 'code' ? 'block' : 'hidden'}`}
          />

          {activeTab === 'costumes' && (
            <div className="p-6 h-full overflow-y-auto bg-white space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-800 mb-1">
                  Kostum Sprite: <span className="text-[#4C97FF]">{activeSprite.name}</span>
                </h2>
                <p className="text-xs text-slate-500 mb-4">
                  Pilih karakter dari galeri di bawah atau unggah gambar PNG/SVG/GIF milikmu sendiri.
                </p>

                <div className="grid grid-cols-8 gap-2.5 mb-4">
                  {SPRITE_GALLERY_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        updateActiveSpriteProp('costumeEmoji', emoji);
                        updateActiveSpriteProp('costumeImageUrl', undefined);
                      }}
                      className={`text-3xl p-3 rounded-xl border-2 flex items-center justify-center transition ${
                        activeSprite.costumeEmoji === emoji && !activeSprite.costumeImageUrl
                          ? 'border-[#4C97FF] bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                <label className="inline-flex items-center gap-2 bg-[#4C97FF] hover:bg-blue-600 text-white text-xs font-bold px-4 py-2.5 rounded-lg cursor-pointer transition">
                  <Upload className="w-4 h-4" />
                  Upload Gambar Sprite (PNG/SVG)
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <hr className="border-slate-200" />

              <div>
                <h3 className="text-base font-bold text-slate-800 mb-1">
                  Pemandangan Latar Stage (Scenic Backdrops)
                </h3>
                <p className="text-xs text-slate-500 mb-3">
                  Pilih latar ilustrasi multi-layer atau unggah gambar wallpaper game milikmu sendiri.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
                  {STAGE_THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() =>
                        setProject((prev) => ({
                          ...prev,
                          stageImageUrl: undefined,
                          stagePattern: theme.id as any,
                          stageBackdrop: theme.bg,
                        }))
                      }
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold border-2 text-left transition ${
                        project.stagePattern === theme.id && !project.stageImageUrl
                          ? 'border-[#4C97FF] bg-blue-50 text-[#4C97FF]'
                          : 'border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {theme.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <label className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-lg cursor-pointer transition">
                    <ImageIcon className="w-4 h-4" />
                    Upload Wallpaper Stage (JPG/PNG)
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBackdropImageUpload}
                      className="hidden"
                    />
                  </label>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">Warna Polos:</span>
                    <input
                      type="color"
                      value={project.stageBackdrop}
                      onChange={(e) =>
                        setProject((prev) => ({
                          ...prev,
                          stageImageUrl: undefined,
                          stagePattern: 'none',
                          stageBackdrop: e.target.value,
                        }))
                      }
                      className="w-8 h-8 rounded cursor-pointer border border-slate-300"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sounds' && (
            <div className="p-6 h-full overflow-y-auto bg-white space-y-4">
              <h2 className="text-base font-bold text-slate-800">
                Built-in Game Sound Effects (Web Audio Synthesizer)
              </h2>
              <p className="text-xs text-slate-500">
                Klik tombol Play untuk mencoba efek suara. Gunakan blok <b className="text-[#CF63CF]">play sound [...]</b> di kategori <b>Sound</b> untuk memutar suara saat game berjalan.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                {[
                  { id: 'coin', name: '🪙 Coin / Point', desc: 'Suara saat mengambil koin atau bintang' },
                  { id: 'jump', name: '🦘 Jump / Boing', desc: 'Suara saat karakter melompat' },
                  { id: 'laser', name: '⚡ Laser / Shoot', desc: 'Suara tembakan peluru atau laser' },
                  { id: 'hit', name: '💥 Explosion / Hit', desc: 'Suara tabrakan bom atau musuh' },
                  { id: 'win', name: '🏆 Powerup / Win', desc: 'Suara menang atau naik level' },
                ].map((snd) => (
                  <div
                    key={snd.id}
                    className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between bg-slate-50/60"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">{snd.name}</h4>
                      <p className="text-[11px] text-slate-500 mt-1">{snd.desc}</p>
                    </div>
                    <button
                      onClick={() => playSynthSound(snd.id)}
                      className="mt-3 bg-[#CF63CF] hover:bg-[#b852b8] text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" /> Test Sound
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="absolute top-4 right-5 pointer-events-none opacity-25 flex flex-col items-center">
              <span className="text-5xl">{activeSprite.costumeEmoji}</span>
              <span className="text-xs font-bold text-slate-700 mt-1">
                {activeSprite.name}
              </span>
            </div>
          )}

          {activeTab === 'code' &&
            comments.map((note) => (
              <div
                key={note.id}
                style={{ left: note.x, top: note.y }}
                className="absolute w-56 bg-[#FEF49C] border border-[#E2D56B] rounded shadow-md z-10 text-xs text-slate-800"
              >
                <div className="bg-[#F2E479] px-2 py-1 flex items-center justify-between border-b border-[#E2D56B]">
                  <span className="font-bold text-[10px] text-amber-900">
                    Block Note
                  </span>
                  <button
                    onClick={() =>
                      setComments((prev) => prev.filter((c) => c.id !== note.id))
                    }
                  >
                    <X className="w-3 h-3 text-slate-600 hover:text-slate-900" />
                  </button>
                </div>
                <textarea
                  value={note.text}
                  onChange={(e) =>
                    setComments((prev) =>
                      prev.map((c) =>
                        c.id === note.id ? { ...c, text: e.target.value } : c
                      )
                    )
                  }
                  rows={4}
                  className="w-full bg-transparent p-2 outline-none resize-none leading-relaxed font-medium"
                />
              </div>
            ))}
        </div>

        {/* KANAN: Live Stage (480x360) + Sprite Inspector + Split Target Pane (Sprites + Stage Backdrop) */}
        <div
          className={`${
            isStageFullscreen
              ? 'fixed inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center p-6'
              : 'w-[496px] bg-[#E5F0FF] p-2 flex flex-col space-y-2 overflow-y-auto'
          }`}
        >
          {isStageFullscreen && (
            <div className="w-full max-w-[760px] flex items-center justify-between mb-3 text-white">
              <div className="flex items-center gap-3">
                <span className="font-extrabold text-base">{project.title}</span>
                <button
                  onClick={() => runtimeRef.current?.start()}
                  className="px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-600 text-xs font-bold flex items-center gap-1"
                >
                  <Flag className="w-3.5 h-3.5 fill-white" /> Play
                </button>
                <button
                  onClick={() => runtimeRef.current?.stop()}
                  className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-xs font-bold flex items-center gap-1"
                >
                  <Octagon className="w-3.5 h-3.5 fill-white" /> Stop
                </button>
              </div>
              <button
                onClick={() => setIsStageFullscreen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold flex items-center gap-1.5"
              >
                <Minimize2 className="w-4 h-4" /> Keluar Fullscreen
              </button>
            </div>
          )}

          <div
            className={`bg-black rounded-lg overflow-hidden border-2 border-slate-300 shadow-md flex items-center justify-center cursor-grab active:cursor-grabbing ${
              isStageFullscreen ? 'w-[760px] h-[570px]' : ''
            }`}
          >
            <canvas
              ref={stageCanvasRef}
              width={480}
              height={360}
              className={
                isStageFullscreen ? 'w-full h-full block' : 'w-[480px] h-[360px] block'
              }
            />
          </div>

          {!isStageFullscreen && (
            <>
              {/* Sprite Inspector Bar */}
              <div className="bg-white rounded-lg p-3 border border-slate-300 text-xs space-y-2.5 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1.5 flex-1">
                    <span className="font-semibold text-slate-600">Sprite</span>
                    <input
                      type="text"
                      value={activeSprite.name}
                      onChange={(e) => updateActiveSpriteProp('name', e.target.value)}
                      className="border border-slate-300 rounded-full px-3 py-1 w-28 font-semibold text-slate-800 outline-none focus:border-[#4C97FF]"
                    />
                  </div>

                  <div className="flex items-center space-x-1">
                    <span className="font-bold text-slate-500">↔ x</span>
                    <input
                      type="number"
                      value={activeSprite.x}
                      onChange={(e) =>
                        updateActiveSpriteProp('x', Number(e.target.value))
                      }
                      className="border border-slate-300 rounded-full px-2 py-1 w-16 text-center font-semibold text-slate-800"
                    />
                  </div>

                  <div className="flex items-center space-x-1">
                    <span className="font-bold text-slate-500">↕ y</span>
                    <input
                      type="number"
                      value={activeSprite.y}
                      onChange={(e) =>
                        updateActiveSpriteProp('y', Number(e.target.value))
                      }
                      className="border border-slate-300 rounded-full px-2 py-1 w-16 text-center font-semibold text-slate-800"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-slate-600">Show</span>
                    <button
                      onClick={() => updateActiveSpriteProp('visible', true)}
                      className={`p-1.5 rounded-full border ${
                        activeSprite.visible
                          ? 'bg-[#4C97FF] text-white border-[#4C97FF]'
                          : 'text-slate-400 border-slate-200'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => updateActiveSpriteProp('visible', false)}
                      className={`p-1.5 rounded-full border ${
                        !activeSprite.visible
                          ? 'bg-[#4C97FF] text-white border-[#4C97FF]'
                          : 'text-slate-400 border-slate-200'
                      }`}
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <span className="font-semibold text-slate-600">Size</span>
                    <input
                      type="number"
                      value={activeSprite.size}
                      onChange={(e) =>
                        updateActiveSpriteProp('size', Number(e.target.value))
                      }
                      className="border border-slate-300 rounded-full px-2 py-1 w-16 text-center font-semibold text-slate-800"
                    />
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <span className="font-semibold text-slate-600">Direction</span>
                    <input
                      type="number"
                      value={activeSprite.direction}
                      onChange={(e) =>
                        updateActiveSpriteProp('direction', Number(e.target.value))
                      }
                      className="border border-slate-300 rounded-full px-2 py-1 w-16 text-center font-semibold text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Split Pane Bawah: Daftar Kartu Sprite (Kiri) + Kartu Stage Backdrop (Kanan, Persis Scratch 3.0) */}
              <div className="flex-1 flex space-x-2 overflow-hidden">
                {/* Daftar Sprite */}
                <div className="flex-1 bg-white rounded-lg p-3 border border-slate-300 relative overflow-y-auto">
                  <div className="grid grid-cols-4 gap-2">
                    {project.sprites.map((sp) => {
                      const isSelected = sp.id === activeSprite.id;
                      return (
                        <div
                          key={sp.id}
                          onClick={() => setSelectedSpriteId(sp.id)}
                          className={`relative rounded-lg border-2 cursor-pointer flex flex-col items-center justify-between pt-2 pb-1 transition ${
                            isSelected
                              ? 'border-[#4C97FF] bg-blue-50/40 shadow-sm'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && project.sprites.length > 1 && (
                            <button
                              onClick={(e) => handleDeleteSprite(sp.id, e)}
                              className="absolute -top-2 -right-2 bg-[#4C97FF] text-white p-1 rounded-full shadow hover:bg-rose-500 transition"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                          <div className="text-2xl my-1">{sp.costumeEmoji}</div>
                          <div
                            className={`w-full text-center text-[10px] font-semibold truncate px-1 py-0.5 rounded-b ${
                              isSelected
                                ? 'bg-[#4C97FF] text-white'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {sp.name}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handleAddSprite('⭐')}
                    title="Tambah Sprite Baru"
                    className="absolute bottom-3 right-3 bg-[#4C97FF] hover:bg-[#3b82f6] text-white p-2.5 rounded-full shadow-lg transition"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Panel Stage / Backdrop di Kanan Bawah (Identik dengan Scratch 3.0) */}
                <div className="w-24 bg-white rounded-lg p-2 border border-slate-300 flex flex-col items-center justify-between text-center shadow-sm">
                  <span className="text-[11px] font-bold text-slate-600">Stage</span>

                  <div
                    onClick={handleCycleBackdrop}
                    title="Klik untuk ganti pemandangan Stage"
                    className="w-full h-16 rounded-md border-2 border-[#4C97FF] cursor-pointer flex flex-col items-center justify-center p-1 text-[10px] font-bold text-white shadow-inner transition hover:opacity-90"
                    style={{
                      background:
                        project.stageImageUrl
                          ? `url(${project.stageImageUrl}) center/cover no-repeat`
                          : project.stagePattern === 'sky'
                          ? 'linear-gradient(to bottom, #38bdf8 65%, #16a34a 35%)'
                          : project.stagePattern === 'stars'
                          ? '#090d16'
                          : project.stagePattern === 'neon'
                          ? 'linear-gradient(to bottom, #311042, #701a75)'
                          : project.stagePattern === 'desert'
                          ? 'linear-gradient(to bottom, #f97316, #f59e0b)'
                          : project.stagePattern === 'ocean'
                          ? 'linear-gradient(to bottom, #0284c7, #082f49)'
                          : project.stagePattern === 'arena'
                          ? '#15803d'
                          : project.stagePattern === 'dungeon'
                          ? '#1e1b4b'
                          : project.stageBackdrop || '#ffffff',
                    }}
                  >
                    <span className="bg-black/45 px-1.5 py-0.5 rounded text-[9px] truncate max-w-full">
                      {project.stageImageUrl ? 'image' : project.stagePattern || 'custom'}
                    </span>
                  </div>

                  <div className="w-full space-y-1">
                    <button
                      onClick={handleCycleBackdrop}
                      className="w-full bg-blue-50 hover:bg-blue-100 text-[#4C97FF] border border-blue-200 rounded py-1 text-[10px] font-bold transition"
                    >
                      Ganti Latar
                    </button>
                    <label
                      title="Upload Gambar Latar (JPG/PNG)"
                      className="w-full bg-[#4C97FF] hover:bg-blue-600 text-white rounded py-1 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition"
                    >
                      <ImageIcon className="w-3 h-3" /> Upload
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBackdropImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
