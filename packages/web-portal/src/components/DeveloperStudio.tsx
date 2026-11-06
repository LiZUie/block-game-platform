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
  Maximize2,
  StickyNote,
  X,
  CheckCircle2,
} from 'lucide-react';
import {
  BlockVerseProject,
  BlockVerseRuntime,
  SPACE_INVADERS_PRESET,
  SpriteTarget,
} from '../engine/BlockVerseEngine';
import {
  CATEGORY_BLOCKS,
  compileWorkspaceToScripts,
  registerScratchBlocks,
} from '../engine/ScratchBlocksSetup';

interface StickyComment {
  id: string;
  text: string;
  x: number;
  y: number;
}

const CATEGORIES = [
  { id: 'Motion', label: 'Motion', color: '#4C97FF' },
  { id: 'Looks', label: 'Looks', color: '#9966FF' },
  { id: 'Events', label: 'Events', color: '#FFBF00' },
  { id: 'Control', label: 'Control', color: '#FFAB19' },
  { id: 'Sensing', label: 'Sensing', color: '#5CB1D6' },
  { id: 'Operators', label: 'Operators', color: '#59C059' },
  { id: 'Variables', label: 'Variables', color: '#FF8C1A' },
];

export interface DeveloperStudioProps {
  onBack?: () => void;
  onGamePublished?: (gameId: string) => void;
}

export const DeveloperStudio: React.FC<DeveloperStudioProps> = ({ onBack, onGamePublished }) => {
  const [project, setProject] = useState<BlockVerseProject>(SPACE_INVADERS_PRESET);
  const [selectedSpriteId, setSelectedSpriteId] = useState<string>('sprite_alien');
  const [activeCategory, setActiveCategory] = useState<string>('Motion');
  const [activeTab, setActiveTab] = useState<'code' | 'costumes' | 'sounds'>('code');
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [comments, setComments] = useState<StickyComment[]>([
    {
      id: 'note_1',
      text: 'Create laser at random times. The start_laser_x and start_laser_y are used to have the laser clone start at the correct sprite.',
      x: 420,
      y: 36,
    },
    {
      id: 'note_2',
      text: 'Local Variable for each clone specifying if it is a clone. Only the clones should show and march.',
      x: 430,
      y: 440,
    },
  ]);

  const blocklyDivRef = useRef<HTMLDivElement | null>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const stageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeRef = useRef<BlockVerseRuntime | null>(null);

  const activeSprite =
    project.sprites.find((s) => s.id === selectedSpriteId) || project.sprites[0];

  // 1. Inisialisasi Blockly (Renderer Zelos = Scratch 3.0)
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

    // Muat contoh blok visual awal jika belum ada state Blockly
    seedDefaultVisualBlocks(workspace);

    const onWorkspaceChange = (e: Blockly.Events.Abstract) => {
      if (e.isUiEvent) return;
      const jsonState = Blockly.serialization.workspaces.save(workspace);
      const compiled = compileWorkspaceToScripts(workspace);

      setProject((prev) => ({
        ...prev,
        sprites: prev.sprites.map((sp) =>
          sp.id === selectedSpriteId
            ? {
                ...sp,
                workspaceJson: jsonState,
                scripts: compiled.length > 0 ? compiled : sp.scripts,
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

  // 2. Ganti isi Flyout ketika Kategori di Kiri Diklik
  useEffect(() => {
    if (!workspaceRef.current) return;
    workspaceRef.current.updateToolbox({
      kind: 'flyoutToolbox',
      contents: CATEGORY_BLOCKS[activeCategory] || [],
    });
  }, [activeCategory]);

  // 3. Simpan/Muat State Workspace saat Pindah Kartu Sprite
  useEffect(() => {
    if (!workspaceRef.current || !activeSprite) return;
    Blockly.Events.disable();
    workspaceRef.current.clear();
    if (activeSprite.workspaceJson) {
      Blockly.serialization.workspaces.load(
        activeSprite.workspaceJson,
        workspaceRef.current
      );
    } else {
      seedDefaultVisualBlocks(workspaceRef.current);
    }
    Blockly.Events.enable();
  }, [selectedSpriteId]);

  // 4. Inisialisasi Live Stage Canvas 2D Runtime
  useEffect(() => {
    if (!stageCanvasRef.current) return;
    const runtime = new BlockVerseRuntime(stageCanvasRef.current, project);
    runtimeRef.current = runtime;
    runtime.renderFrame();

    return () => {
      runtime.destroy();
    };
  }, []);

  // Sinkronkan perubahan project ke Runtime
  useEffect(() => {
    if (runtimeRef.current) {
      runtimeRef.current.loadProject(project);
    }
  }, [project]);

  const updateActiveSpriteProp = (key: keyof SpriteTarget, value: any) => {
    setProject((prev) => ({
      ...prev,
      sprites: prev.sprites.map((sp) =>
        sp.id === activeSprite.id ? { ...sp, [key]: value } : sp
      ),
    }));
  };

  const handleAddSprite = () => {
    const newId = `sprite_${Date.now()}`;
    const newSprite: SpriteTarget = {
      id: newId,
      name: `Sprite${project.sprites.length + 1}`,
      x: 0,
      y: 0,
      size: 80,
      direction: 90,
      visible: true,
      rotationStyle: 'all-around',
      costumeEmoji: '🚀',
      color: '#34d399',
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

  // Integrasi Upload JSON Project ke Cloud Service (Port 3001)
  const handleSaveToCloud = async (publish: boolean = false) => {
    setSaveStatus(publish ? 'Publishing...' : 'Saving...');
    const token = localStorage.getItem('token');

    try {
      const response = await fetch('http://localhost:3001/api/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: project.title,
          status: publish ? 'PUBLISHED' : 'DRAFT',
          projectData: project,
        }),
      });

      if (!response.ok) throw new Error('Cloud sync fallback');
      const data = await response.json();
      setSaveStatus(publish ? 'Published to Cloud!' : 'Saved to Cloud!');
      if (publish && onGamePublished && data.gameId) {
        onGamePublished(data.gameId);
      }
    } catch {
      // Fallback simpan ke LocalStorage agar testing tetap mulus
      localStorage.setItem('blockverse_latest_project', JSON.stringify(project));
      setSaveStatus(publish ? 'Published (Local Cache)!' : 'Saved!');
    } finally {
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#E5F0FF] overflow-hidden select-none font-sans">
      {/* ==================== TOP HEADER BAR (Scratch 3.0 Blue #4C97FF) ==================== */}
      <header className="h-12 bg-[#4C97FF] text-white flex items-center justify-between px-4 shadow-sm z-20">
        <div className="flex items-center space-x-4">
          {onBack && (
            <button
              onClick={onBack}
              className="bg-white/20 hover:bg-white/30 text-white font-bold text-xs px-2.5 py-1.5 rounded-md flex items-center gap-1 transition"
              title="Kembali ke Beranda"
            >
              ← Kembali
            </button>
          )}

          <div className="flex items-center space-x-1.5 font-black text-xl tracking-tight bg-white/15 px-2.5 py-1 rounded-md">
            <span className="text-amber-300">BLOCK</span>
            <span>VERSE</span>
          </div>

          <input
            type="text"
            value={project.title}
            onChange={(e) => setProject({ ...project, title: e.target.value })}
            className="bg-white/20 hover:bg-white/30 focus:bg-white focus:text-slate-900 text-white font-semibold px-3 py-1 rounded-md text-sm outline-none transition w-52"
            placeholder="Project Title..."
          />

          <button
            onClick={() => handleSaveToCloud( true )}
            className="bg-[#FF8C1A] hover:bg-[#e67e17] text-white font-bold text-xs px-3.5 py-1.5 rounded-md flex items-center gap-1.5 shadow-sm transition"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share to Player Cloud
          </button>
        </div>

        <div className="flex items-center space-x-3">
          {saveStatus && (
            <span className="text-xs bg-emerald-500/90 px-2.5 py-1 rounded flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {saveStatus}
            </span>
          )}
          <button
            onClick={() => handleSaveToCloud(false)}
            className="text-xs font-semibold hover:bg-white/20 px-3 py-1.5 rounded-md flex items-center gap-1.5 transition"
          >
            <Save className="w-4 h-4" />
            Save Now
          </button>
        </div>
      </header>

      {/* ==================== SUB-HEADER TABS & STAGE CONTROLS ==================== */}
      <div className="h-10 bg-[#E5F0FF] flex items-center justify-between px-3 border-b border-slate-300">
        {/* Tabs Kiri: Code / Costumes / Sounds */}
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
            <Palette className="w-4 h-4" /> Costumes
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
        </div>

        {/* Kontrol Bendera Hijau & Stop Merah di Atas Stage */}
        <div className="w-[496px] flex items-center justify-between px-1">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => runtimeRef.current?.start()}
              title="Start Game (Green Flag)"
              className="p-1.5 rounded hover:bg-emerald-100 text-emerald-600 transition"
            >
              <Flag className="w-5 h-5 fill-emerald-500" />
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
                    text: 'Write logic note for this sprite...',
                    x: 360,
                    y: 120,
                  },
                ])
              }
              className="ml-2 text-xs bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 px-2.5 py-1 rounded flex items-center gap-1 font-medium"
            >
              <StickyNote className="w-3.5 h-3.5" /> + Comment
            </button>
          </div>
          <Maximize2 className="w-4 h-4 text-slate-500 cursor-pointer hover:text-slate-800" />
        </div>
      </div>

      {/* ==================== MAIN STUDIO WORKSPACE & RIGHT STAGE ==================== */}
      <div className="flex-1 flex overflow-hidden">
        {/* 1. KIRI: Category Rail Bulat Berwarna (Persis Scratch 3.0) */}
        <div className="w-16 bg-white border-r border-slate-300 flex flex-col items-center py-3 space-y-3 z-10">
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

        {/* 2. TENGAH: Infinite Blockly SVG Canvas + Watermark Sprite + Sticky Comments */}
        <div className="flex-1 relative bg-[#F9F9F9] border-r border-slate-300 overflow-hidden">
          <div ref={blocklyDivRef} className="w-full h-full" />

          {/* Watermark Sprite Aktif di Pojok Kanan Atas Workspace */}
          <div className="absolute top-4 right-5 pointer-events-none opacity-25 flex flex-col items-center">
            <span className="text-5xl">{activeSprite.costumeEmoji}</span>
            <span className="text-xs font-bold text-slate-700 mt-1">
              {activeSprite.name}
            </span>
          </div>

          {/* Sticky Notes Kuning (Persis Catatan Kuning di Screenshot Space Invaders) */}
          {comments.map((note) => (
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

        {/* 3. KANAN: Live Stage (480x360) + Sprite Inspector + Sprite Selector Grid */}
        <div className="w-[496px] bg-[#E5F0FF] p-2 flex flex-col space-y-2 overflow-y-auto">
          {/* Live Stage 480x360 */}
          <div className="bg-black rounded-lg overflow-hidden border border-slate-300 shadow-sm flex items-center justify-center">
            <canvas
              ref={stageCanvasRef}
              width={480}
              height={360}
              className="w-[480px] h-[360px] block"
            />
          </div>

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
                  className="border border-slate-300 rounded-full px-2 py-1 w-16 text-center font-semibold"
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
                  className="border border-slate-300 rounded-full px-2 py-1 w-16 text-center font-semibold"
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
                  className="border border-slate-300 rounded-full px-2 py-1 w-16 text-center font-semibold"
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
                  className="border border-slate-300 rounded-full px-2 py-1 w-16 text-center font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Kartu Daftar Sprite + Tombol Tambah Sprite */}
          <div className="flex-1 bg-white rounded-lg p-3 border border-slate-300 relative overflow-y-auto">
            <div className="grid grid-cols-5 gap-2.5">
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
              onClick={handleAddSprite}
              title="Add New Sprite"
              className="fixed bottom-5 right-5 bg-[#4C97FF] hover:bg-[#3b82f6] text-white p-3 rounded-full shadow-lg transition"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper: Mengisi Workspace awal dengan susunan blok visual Space Invaders
function seedDefaultVisualBlocks(workspace: Blockly.WorkspaceSvg) {
  const xmlText = `
    <xml xmlns="https://developers.google.com/blockly/xml">
      <block type="event_whenflagclicked" x="25" y="20">
        <next>
          <block type="looks_setsizeto">
            <value name="SIZE"><shadow type="math_number"><field name="NUM">60</field></shadow></value>
            <next>
              <block type="motion_gotoxy">
                <value name="X"><shadow type="math_number"><field name="NUM">-150</field></shadow></value>
                <value name="Y"><shadow type="math_number"><field name="NUM">130</field></shadow></value>
                <next>
                  <block type="control_repeat">
                    <value name="TIMES"><shadow type="math_number"><field name="NUM">6</field></shadow></value>
                    <statement name="SUBSTACK">
                      <block type="control_create_clone_of">
                        <field name="CLONE_OPTION">alien</field>
                        <next>
                          <block type="motion_changexby">
                            <value name="DX"><shadow type="math_number"><field name="NUM">50</field></shadow></value>
                          </block>
                        </next>
                      </block>
                    </statement>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </next>
      </block>

      <block type="control_start_as_clone" x="260" y="20">
        <next>
          <block type="looks_show">
            <next>
              <block type="control_forever">
                <statement name="SUBSTACK">
                  <block type="motion_movesteps">
                    <value name="STEPS"><shadow type="math_number"><field name="NUM">5</field></shadow></value>
                    <next>
                      <block type="motion_ifonedgebounce">
                        <next>
                          <block type="control_if">
                            <value name="CONDITION">
                              <block type="sensing_touchingobject">
                                <field name="TOUCHINGOBJECTMENU">laser</field>
                              </block>
                            </value>
                            <statement name="SUBSTACK">
                              <block type="data_changevariableby">
                                <field name="VARIABLE">score</field>
                                <value name="VALUE"><shadow type="math_number"><field name="NUM">10</field></shadow></value>
                                <next>
                                  <block type="control_delete_this_clone"></block>
                                </next>
                              </block>
                            </statement>
                          </block>
                        </next>
                      </block>
                    </next>
                  </block>
                </statement>
              </block>
            </next>
          </block>
        </next>
      </block>
    </xml>
  `;
  try {
    const dom = Blockly.utils.xml.textToDom(xmlText);
    Blockly.Xml.domToWorkspace(dom, workspace);
  } catch (e) {
    console.warn('Seed XML warning:', e);
  }
}
