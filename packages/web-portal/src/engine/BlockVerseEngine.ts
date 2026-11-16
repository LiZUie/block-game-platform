// packages/web-portal/src/engine/BlockVerseEngine.ts

export interface CompiledOp {
  op: string;
  [key: string]: any;
}

export interface CompiledScript {
  trigger: 'WHEN_FLAG_CLICKED' | 'WHEN_KEY_PRESSED' | 'WHEN_CLONE_START' | 'WHEN_RECEIVE';
  param?: string;
  ops: CompiledOp[];
}

export interface SpriteTarget {
  id: string;
  name: string;
  x: number;
  y: number;
  size: number;
  direction: number;
  visible: boolean;
  rotationStyle: 'all-around' | 'left-right' | 'dont-rotate';
  costumeEmoji: string;
  costumeImageUrl?: string;
  sayText?: string;
  workspaceJson?: Record<string, any>;
  scripts: CompiledScript[];
}

export interface BlockVerseProject {
  id?: string;
  title: string;
  stageBackdrop: string;
  stagePattern?: 'none' | 'stars' | 'grid' | 'sky' | 'dungeon' | 'neon' | 'desert' | 'ocean' | 'arena';
  stageImageUrl?: string;
  showStageGrid?: boolean;
  variables: Record<string, number | string | boolean>;
  broadcasts: string[];
  sprites: SpriteTarget[];
}

export interface RuntimeEntity extends SpriteTarget {
  isClone: boolean;
  parentId: string;
  localVars: Record<string, any>;
  sayExpireTime?: number;
}

interface StackFrame {
  ops: CompiledOp[];
  pc: number;
  loopType?: 'FOREVER' | 'REPEAT';
  remaining?: number;
}

interface ThreadProcess {
  id: string;
  entity: RuntimeEntity;
  stack: StackFrame[];
  waitUntilTime: number;
}

// 7 Bentuk Standar Tetromino (I, O, T, S, Z, J, L)
const TETROMINO_SHAPES: { name: string; color: string; matrix: number[][] }[] = [
  { name: 'I', color: '#06b6d4', matrix: [[1, 1, 1, 1]] },
  { name: 'O', color: '#eab308', matrix: [[1, 1], [1, 1]] },
  { name: 'T', color: '#a855f7', matrix: [[0, 1, 0], [1, 1, 1]] },
  { name: 'S', color: '#22c55e', matrix: [[0, 1, 1], [1, 1, 0]] },
  { name: 'Z', color: '#ef4444', matrix: [[1, 1, 0], [0, 1, 1]] },
  { name: 'J', color: '#3b82f6', matrix: [[1, 0, 0], [1, 1, 1]] },
  { name: 'L', color: '#f97316', matrix: [[0, 0, 1], [1, 1, 1]] },
];

interface TetrisMatrixState {
  active: boolean;
  cols: number;
  rows: number;
  board: (string | null)[][];
  currentPiece: {
    name: string;
    color: string;
    matrix: number[][];
    col: number;
    row: number;
  };
  nextPiece: {
    name: string;
    color: string;
    matrix: number[][];
  };
  gameOver: boolean;
}

interface FlappyPipePair {
  x: number;         // Koordinat layar Canvas (0..480)
  gapY: number;      // Titik tengah celah pipa (75..215)
  gapHeight: number; // Lebar celah vertikal (96px)
  passed: boolean;
}

interface FlappyArcadeState {
  active: boolean;
  birdX: number;     // Posisi layar X (120)
  birdY: number;     // Posisi layar Y (0 di atas, 285 di tanah)
  birdVy: number;    // Kecepatan jatuh/lompat
  birdRotation: number;
  wingFrame: number;
  groundScroll: number;
  pipes: FlappyPipePair[];
  gameOver: boolean;
}

export function playSynthSound(type: string) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'coin') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, now);
      osc.frequency.setValueAtTime(1318.51, now + 0.08);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'jump') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(580, now + 0.14);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
      osc.start(now);
      osc.stop(now + 0.16);
    } else if (type === 'laser') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.15);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'hit') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.28);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.28);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.1);
      osc.frequency.setValueAtTime(783.99, now + 0.2);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  } catch {}
}

export class BlockVerseRuntime {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private project: BlockVerseProject;
  private entities: RuntimeEntity[] = [];
  private variables: Record<string, any> = {};
  private threads: ThreadProcess[] = [];
  private pressedKeys: Set<string> = new Set();
  private imageCache: Map<string, HTMLImageElement> = new Map();
  private mousePos: { x: number; y: number } = { x: 0, y: 0 };
  private draggingEntity: RuntimeEntity | null = null;
  private isRunning: boolean = false;
  private rafId: number | null = null;
  private tetris: TetrisMatrixState | null = null;
  private flappy: FlappyArcadeState | null = null;
  private onScoreSubmit?: (score: number) => void;
  private onStateUpdate?: (vars: Record<string, any>) => void;
  private onSpriteDragged?: (spriteId: string, newX: number, newY: number) => void;

  constructor(
    canvas: HTMLCanvasElement,
    project: BlockVerseProject,
    onScoreSubmit?: (score: number) => void,
    onStateUpdate?: (vars: Record<string, any>) => void,
    onSpriteDragged?: (spriteId: string, newX: number, newY: number) => void
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.project = JSON.parse(JSON.stringify(project));
    this.onScoreSubmit = onScoreSubmit;
    this.onStateUpdate = onStateUpdate;
    this.onSpriteDragged = onSpriteDragged;
    this.resetState();
    this.bindInputEvents();
  }

  private bindInputEvents() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
  }

  public destroy() {
    this.stop();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
  }

  private handleMouseMove = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = 480 / rect.width;
    const scaleY = 360 / rect.height;
    this.mousePos.x = Math.round((e.clientX - rect.left) * scaleX - 240);
    this.mousePos.y = Math.round(180 - (e.clientY - rect.top) * scaleY);

    if (this.draggingEntity) {
      this.draggingEntity.x = Math.max(-230, Math.min(230, this.mousePos.x));
      this.draggingEntity.y = Math.max(-170, Math.min(170, this.mousePos.y));
      if (!this.isRunning) this.renderFrame();
    }
  };

  private handleMouseDown = () => {
    // Jika mode Flappy Bird sedang berjalan, klik mouse di layar juga mengepakkan sayap!
    if (this.isRunning && this.flappy && this.flappy.active && !this.flappy.gameOver) {
      this.flapBirdUpward();
      return;
    }

    for (let i = this.entities.length - 1; i >= 0; i--) {
      const ent = this.entities[i];
      if (!ent.visible || ent.isClone) continue;
      const dist = Math.hypot(ent.x - this.mousePos.x, ent.y - this.mousePos.y);
      if (dist <= (ent.size / 100) * 24) {
        this.draggingEntity = ent;
        break;
      }
    }
  };

  private handleMouseUp = () => {
    if (this.draggingEntity) {
      if (this.onSpriteDragged) {
        this.onSpriteDragged(
          this.draggingEntity.id,
          Math.round(this.draggingEntity.x),
          Math.round(this.draggingEntity.y)
        );
      }
      this.draggingEntity = null;
    }
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const key = e.key === ' ' ? 'space' : e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'space'].includes(key) && this.isRunning) {
      e.preventDefault();
    }

    const wasPressed = this.pressedKeys.has(key);
    this.pressedKeys.add(key);

    const allowRepeat = this.tetris?.active && ['arrowleft', 'arrowright', 'arrowdown'].includes(key);

    if (this.isRunning && (!wasPressed || allowRepeat)) {
      this.entities.forEach((entity) => {
        entity.scripts
          .filter((s) => s.trigger === 'WHEN_KEY_PRESSED' && (s.param === key || s.param === 'any'))
          .forEach((s) => this.spawnThread(entity, JSON.parse(JSON.stringify(s.ops))));
      });
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    const key = e.key === ' ' ? 'space' : e.key.toLowerCase();
    this.pressedKeys.delete(key);
  };

  public loadProject(project: BlockVerseProject) {
    const wasRunning = this.isRunning;
    this.stop();
    this.project = JSON.parse(JSON.stringify(project));
    this.resetState();
    this.renderFrame();
    if (wasRunning) this.start();
  }

  private hasTetrisBlocks(): boolean {
    return this.project.sprites.some((sp) =>
      sp.scripts.some((sc) => JSON.stringify(sc.ops).includes('TETRIS_'))
    );
  }

  private hasFlappyBlocks(): boolean {
    return (
      this.project.title.toLowerCase().includes('flappy') ||
      this.project.sprites.some((sp) =>
        sp.scripts.some((sc) => JSON.stringify(sc.ops).includes('FLAPPY_'))
      )
    );
  }

  // ================== INISIALISASI & LOGIKA FLAPPY BIRD ASLI ==================
  private initFlappyArcade() {
    this.flappy = {
      active: true,
      birdX: 125,
      birdY: 140,
      birdVy: 0,
      birdRotation: 0,
      wingFrame: 0,
      groundScroll: 0,
      pipes: [
        { x: 340, gapY: 135, gapHeight: 98, passed: false },
        { x: 540, gapY: 175, gapHeight: 98, passed: false },
      ],
      gameOver: false,
    };
  }

  private flapBirdUpward() {
    if (!this.flappy || this.flappy.gameOver) return;
    this.flappy.birdVy = -6.8;
    this.flappy.wingFrame = 6;
    playSynthSound('jump');
  }

  private stepFlappyArcade() {
    if (!this.flappy || this.flappy.gameOver) return;
    const f = this.flappy;

    // 1. Gravitasi & Pergerakan Vertikal Burung
    f.birdVy = Math.min(8.5, f.birdVy + 0.38);
    f.birdY += f.birdVy;
    f.birdRotation = Math.max(-0.45, Math.min(1.1, f.birdVy * 0.08));
    if (f.wingFrame > 0) f.wingFrame--;
    f.groundScroll = (f.groundScroll + 3.2) % 24;

    // Sinkronkan ke koordinat sprite Flappy agar Inspector x/y tetap hidup
    const birdEntity = this.entities.find((e) => e.name.toLowerCase().includes('flappy') || e.id === 'sprite_bird');
    if (birdEntity) {
      birdEntity.x = Math.round(f.birdX - 240);
      birdEntity.y = Math.round(180 - f.birdY);
    }

    // 2. Gerakkan Sepasang Pipa Hijau Atas & Bawah
    const pipeWidth = 52;
    const birdRadius = 14;

    for (const pipe of f.pipes) {
      pipe.x -= 3.2;

      const topPipeBottom = pipe.gapY - pipe.gapHeight / 2;
      const bottomPipeTop = pipe.gapY + pipe.gapHeight / 2;

      // Deteksi Tabrakan Presisi dengan Pipa Atas atau Pipa Bawah
      const withinPipeX = f.birdX + birdRadius > pipe.x && f.birdX - birdRadius < pipe.x + pipeWidth;
      const hitTopPipe = f.birdY - birdRadius < topPipeBottom;
      const hitBottomPipe = f.birdY + birdRadius > bottomPipeTop;

      if (withinPipeX && (hitTopPipe || hitBottomPipe)) {
        this.triggerFlappyGameOver();
        return;
      }

      // Tambah Skor +10 saat berhasil melewati celah pipa
      if (!pipe.passed && pipe.x + pipeWidth < f.birdX) {
        pipe.passed = true;
        playSynthSound('coin');
        this.variables['score'] = Number(this.variables['score'] || 0) + 10;
      }

      // Daur ulang pipa yang sudah lewat batas kiri layar ke sebelah kanan
      if (pipe.x < -60) {
        pipe.x = 480 + 60;
        pipe.gapY = Math.floor(Math.random() * 120) + 80; // Celah acak antara Y=80 s/d Y=200
        pipe.passed = false;
      }
    }

    // 3. Deteksi Tabrakan dengan Tanah (Y >= 278) atau Atap Langit
    if (f.birdY + birdRadius >= 278 || f.birdY - birdRadius <= 0) {
      f.birdY = Math.min(278 - birdRadius, Math.max(birdRadius, f.birdY));
      this.triggerFlappyGameOver();
    }
  }

  private triggerFlappyGameOver() {
    if (!this.flappy || this.flappy.gameOver) return;
    this.flappy.gameOver = true;
    playSynthSound('hit');
    if (this.onScoreSubmit) {
      this.onScoreSubmit(Number(this.variables['score'] || 0));
    }
    this.stop();
  }

  // ================== INISIALISASI & LOGIKA MATRIX TETRIS ==================
  private randomTetromino() {
    const pick = TETROMINO_SHAPES[Math.floor(Math.random() * TETROMINO_SHAPES.length)];
    return {
      name: pick.name,
      color: pick.color,
      matrix: pick.matrix.map((row) => [...row]),
    };
  }

  private initTetrisMatrix() {
    const cols = 10;
    const rows = 16;
    const board = Array.from({ length: rows }, () => Array(cols).fill(null));
    const first = this.randomTetromino();
    const next = this.randomTetromino();

    this.tetris = {
      active: true,
      cols,
      rows,
      board,
      currentPiece: {
        ...first,
        col: Math.floor((cols - first.matrix[0].length) / 2),
        row: 0,
      },
      nextPiece: next,
      gameOver: false,
    };
  }

  private canMoveTetromino(matrix: number[][], targetCol: number, targetRow: number): boolean {
    if (!this.tetris) return false;
    const { cols, rows, board } = this.tetris;
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (!matrix[r][c]) continue;
        const nc = targetCol + c;
        const nr = targetRow + r;
        if (nc < 0 || nc >= cols || nr >= rows) return false;
        if (nr >= 0 && board[nr][nc] !== null) return false;
      }
    }
    return true;
  }

  private lockAndClearTetrisLines() {
    if (!this.tetris) return;
    const { board, currentPiece, cols, rows } = this.tetris;

    for (let r = 0; r < currentPiece.matrix.length; r++) {
      for (let c = 0; c < currentPiece.matrix[r].length; c++) {
        if (currentPiece.matrix[r][c]) {
          const br = currentPiece.row + r;
          const bc = currentPiece.col + c;
          if (br >= 0 && br < rows && bc >= 0 && bc < cols) {
            board[br][bc] = currentPiece.color;
          }
        }
      }
    }

    let clearedCount = 0;
    for (let r = rows - 1; r >= 0; r--) {
      if (board[r].every((cell) => cell !== null)) {
        board.splice(r, 1);
        board.unshift(Array(cols).fill(null));
        clearedCount++;
        r++;
      }
    }

    if (clearedCount > 0) {
      playSynthSound('win');
      const bonus = clearedCount === 1 ? 100 : clearedCount === 2 ? 300 : clearedCount === 3 ? 500 : 800;
      this.variables['score'] = Number(this.variables['score'] || 0) + bonus;
      this.variables['lines'] = Number(this.variables['lines'] || 0) + clearedCount;
    } else {
      playSynthSound('jump');
      this.variables['score'] = Number(this.variables['score'] || 0) + 5;
    }

    const next = this.tetris.nextPiece;
    const spawnCol = Math.floor((cols - next.matrix[0].length) / 2);
    this.tetris.currentPiece = {
      ...next,
      col: spawnCol,
      row: 0,
    };
    this.tetris.nextPiece = this.randomTetromino();

    if (!this.canMoveTetromino(this.tetris.currentPiece.matrix, spawnCol, 0)) {
      this.tetris.gameOver = true;
      playSynthSound('hit');
      if (this.onScoreSubmit) {
        this.onScoreSubmit(Number(this.variables['score'] || 0));
      }
      this.stop();
    }
  }

  public resetState() {
    this.variables = { ...this.project.variables };
    this.entities = this.project.sprites.map((sp) => ({
      ...JSON.parse(JSON.stringify(sp)),
      isClone: false,
      parentId: sp.id,
      localVars: { isClone: 'false' },
    }));
    this.threads = [];

    if (this.hasTetrisBlocks()) {
      this.initTetrisMatrix();
      this.flappy = null;
    } else if (this.hasFlappyBlocks()) {
      this.initFlappyArcade();
      this.tetris = null;
    } else {
      this.tetris = null;
      this.flappy = null;
    }
  }

  public start() {
    this.stop();
    this.resetState();
    this.isRunning = true;

    this.entities.forEach((entity) => {
      entity.scripts
        .filter((s) => s.trigger === 'WHEN_FLAG_CLICKED')
        .forEach((s) => this.spawnThread(entity, JSON.parse(JSON.stringify(s.ops))));
    });

    this.loop();
  }

  public stop() {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.threads = [];
    this.renderFrame();
  }

  private spawnThread(entity: RuntimeEntity, ops: CompiledOp[]) {
    if (!ops || ops.length === 0) return;
    this.threads.push({
      id: Math.random().toString(36).substring(2, 9),
      entity,
      stack: [{ ops: JSON.parse(JSON.stringify(ops)), pc: 0 }],
      waitUntilTime: 0,
    });
  }

  private evaluateValue(val: any, entity: RuntimeEntity): any {
    if (val === null || val === undefined) return 0;
    if (typeof val !== 'object') return val;

    switch (val.type) {
      case 'VAR':
        if (val.name in entity.localVars) return entity.localVars[val.name];
        return this.variables[val.name] ?? 0;
      case 'X_POS':
        return Math.round(entity.x);
      case 'Y_POS':
        return Math.round(entity.y);
      case 'MOUSE_X':
        return this.mousePos.x;
      case 'MOUSE_Y':
        return this.mousePos.y;
      case 'RANDOM': {
        const min = Number(this.evaluateValue(val.min, entity));
        const max = Number(this.evaluateValue(val.max, entity));
        return Math.floor(Math.random() * (max - min + 1)) + min;
      }
      case 'MATH': {
        const a = Number(this.evaluateValue(val.a, entity));
        const b = Number(this.evaluateValue(val.b, entity));
        if (val.op === 'ADD') return a + b;
        if (val.op === 'SUB') return a - b;
        if (val.op === 'MUL') return a * b;
        if (val.op === 'DIV') return b !== 0 ? +(a / b).toFixed(2) : 0;
        return 0;
      }
      case 'LOGIC': {
        const a = Boolean(this.evaluateValue(val.a, entity));
        const b = Boolean(this.evaluateValue(val.b, entity));
        if (val.op === 'AND') return a && b;
        if (val.op === 'OR') return a || b;
        if (val.op === 'NOT') return !a;
        return false;
      }
      case 'COMPARE': {
        const a = this.evaluateValue(val.a, entity);
        const b = this.evaluateValue(val.b, entity);
        const numA = Number(a);
        const numB = Number(b);
        const isNumeric = !isNaN(numA) && !isNaN(numB) && a !== '' && b !== '';
        if (val.op === 'LT') return isNumeric ? numA < numB : String(a) < String(b);
        if (val.op === 'GT') return isNumeric ? numA > numB : String(a) > String(b);
        if (val.op === 'EQ') return String(a) === String(b);
        return false;
      }
      case 'TOUCHING': {
        if (!entity.visible) return false;
        const targetName = val.target;
        if (targetName === '_edge_') {
          return Math.abs(entity.x) >= 225 || Math.abs(entity.y) >= 165;
        }
        if (targetName === '_mouse_') {
          const r = (entity.size / 100) * 22;
          return Math.hypot(entity.x - this.mousePos.x, entity.y - this.mousePos.y) < r;
        }
        const r1 = (entity.size / 100) * 22;
        return this.entities.some((other) => {
          if (other === entity || !other.visible) return false;
          if (other.name !== targetName && other.parentId !== targetName) return false;
          const r2 = (other.size / 100) * 22;
          return Math.hypot(entity.x - other.x, entity.y - other.y) < r1 + r2;
        });
      }
      case 'KEY_PRESSED':
        return this.pressedKeys.has(val.key);
      default:
        return 0;
    }
  }

  private stepThreads() {
    const now = performance.now();
    const activeThreads: ThreadProcess[] = [];

    for (const thread of this.threads) {
      if (!this.entities.includes(thread.entity)) continue;

      if (now < thread.waitUntilTime) {
        activeThreads.push(thread);
        continue;
      }

      let steps = 0;
      let yielded = false;

      while (steps < 40 && !yielded && thread.stack.length > 0) {
        steps++;
        const frame = thread.stack[thread.stack.length - 1];

        if (frame.pc >= frame.ops.length) {
          if (frame.loopType === 'FOREVER') {
            frame.pc = 0;
            yielded = true;
            break;
          } else if (frame.loopType === 'REPEAT' && frame.remaining && frame.remaining > 1) {
            frame.remaining--;
            frame.pc = 0;
            yielded = true;
            break;
          } else {
            thread.stack.pop();
            continue;
          }
        }

        const op = frame.ops[frame.pc];
        frame.pc++;
        if (!op) continue;

        switch (op.op) {
          case 'MOVE_STEPS': {
            const stepsVal = Number(this.evaluateValue(op.steps, thread.entity));
            const rad = ((90 - thread.entity.direction) * Math.PI) / 180;
            thread.entity.x += Math.cos(rad) * stepsVal;
            thread.entity.y += Math.sin(rad) * stepsVal;
            this.clampPosition(thread.entity);
            break;
          }
          case 'TURN_RIGHT':
            thread.entity.direction = (thread.entity.direction + Number(this.evaluateValue(op.degrees, thread.entity))) % 360;
            break;
          case 'TURN_LEFT':
            thread.entity.direction = (thread.entity.direction - Number(this.evaluateValue(op.degrees, thread.entity))) % 360;
            break;
          case 'POINT_DIRECTION':
            thread.entity.direction = Number(this.evaluateValue(op.direction, thread.entity)) % 360;
            break;
          case 'GOTO_XY':
            thread.entity.x = Number(this.evaluateValue(op.x, thread.entity));
            thread.entity.y = Number(this.evaluateValue(op.y, thread.entity));
            this.clampPosition(thread.entity);
            break;
          case 'GOTO_RANDOM':
            thread.entity.x = Math.floor(Math.random() * 420) - 210;
            thread.entity.y = Math.floor(Math.random() * 300) - 150;
            break;
          case 'CHANGE_X':
            thread.entity.x += Number(this.evaluateValue(op.dx, thread.entity));
            this.clampPosition(thread.entity);
            break;
          case 'SET_X':
            thread.entity.x = Number(this.evaluateValue(op.x, thread.entity));
            this.clampPosition(thread.entity);
            break;
          case 'CHANGE_Y':
            thread.entity.y += Number(this.evaluateValue(op.dy, thread.entity));
            this.clampPosition(thread.entity);
            break;
          case 'SET_Y':
            thread.entity.y = Number(this.evaluateValue(op.y, thread.entity));
            this.clampPosition(thread.entity);
            break;
          case 'IF_ON_EDGE_BOUNCE':
            if (thread.entity.x >= 225 || thread.entity.x <= -225) {
              thread.entity.direction = -thread.entity.direction;
              this.clampPosition(thread.entity);
            }
            if (thread.entity.y >= 165 || thread.entity.y <= -165) {
              thread.entity.direction = 180 - thread.entity.direction;
              this.clampPosition(thread.entity);
            }
            break;

          // ================== EKSEKUSI BLOK FLAPPY BIRD ASLI ==================
          case 'FLAPPY_STEP':
            this.stepFlappyArcade();
            yielded = true;
            break;
          case 'FLAPPY_FLAP':
            this.flapBirdUpward();
            break;

          // ================== EKSEKUSI BLOK MATRIX TETRIS ==================
          case 'TETRIS_STEP': {
            if (!this.tetris || this.tetris.gameOver) break;
            const p = this.tetris.currentPiece;
            if (this.canMoveTetromino(p.matrix, p.col, p.row + 1)) {
              p.row += 1;
            } else {
              this.lockAndClearTetrisLines();
            }
            break;
          }
          case 'TETRIS_MOVE': {
            if (!this.tetris || this.tetris.gameOver) break;
            const dir = Math.sign(Number(this.evaluateValue(op.dir, thread.entity)));
            const p = this.tetris.currentPiece;
            if (this.canMoveTetromino(p.matrix, p.col + dir, p.row)) {
              p.col += dir;
            }
            break;
          }
          case 'TETRIS_ROTATE': {
            if (!this.tetris || this.tetris.gameOver) break;
            const p = this.tetris.currentPiece;
            const m = p.matrix;
            const rotated = m[0].map((_, index) => m.map((row) => row[index]).reverse());
            if (this.canMoveTetromino(rotated, p.col, p.row)) {
              p.matrix = rotated;
              playSynthSound('jump');
            } else if (this.canMoveTetromino(rotated, p.col - 1, p.row)) {
              p.col -= 1;
              p.matrix = rotated;
              playSynthSound('jump');
            } else if (this.canMoveTetromino(rotated, p.col + 1, p.row)) {
              p.col += 1;
              p.matrix = rotated;
              playSynthSound('jump');
            }
            break;
          }
          case 'TETRIS_HARD_DROP': {
            if (!this.tetris || this.tetris.gameOver) break;
            const p = this.tetris.currentPiece;
            while (this.canMoveTetromino(p.matrix, p.col, p.row + 1)) {
              p.row += 1;
            }
            this.lockAndClearTetrisLines();
            break;
          }

          case 'SAY': {
            const text = String(this.evaluateValue(op.text, thread.entity));
            const secs = Number(this.evaluateValue(op.seconds, thread.entity));
            thread.entity.sayText = text;
            if (secs > 0) {
              thread.entity.sayExpireTime = now + secs * 1000;
              // Jangan mem-block thread jika di baris berikutnya langsung STOP_ALL (agar Game Over instan)
              const nextOp = frame.ops[frame.pc];
              const afterNextOp = frame.ops[frame.pc + 1];
              if (nextOp?.op !== 'STOP_ALL' && afterNextOp?.op !== 'STOP_ALL') {
                thread.waitUntilTime = now + secs * 1000;
                yielded = true;
              }
            }
            break;
          }
          case 'SET_SIZE':
            thread.entity.size = Math.max(10, Math.min(300, Number(this.evaluateValue(op.size, thread.entity))));
            break;
          case 'CHANGE_SIZE':
            thread.entity.size = Math.max(10, Math.min(300, thread.entity.size + Number(this.evaluateValue(op.delta, thread.entity))));
            break;
          case 'SHOW':
            thread.entity.visible = true;
            break;
          case 'HIDE':
            thread.entity.visible = false;
            break;
          case 'PLAY_SOUND':
            playSynthSound(op.sound || 'coin');
            break;
          case 'SET_VAR': {
            const val = this.evaluateValue(op.value, thread.entity);
            if (op.varName === 'isClone') {
              thread.entity.localVars['isClone'] = String(val);
            } else {
              this.variables[op.varName] = val;
            }
            break;
          }
          case 'CHANGE_VAR': {
            const delta = Number(this.evaluateValue(op.delta, thread.entity));
            this.variables[op.varName] = Number(this.variables[op.varName] || 0) + delta;
            break;
          }
          case 'WAIT': {
            const secs = Number(this.evaluateValue(op.seconds, thread.entity));
            thread.waitUntilTime = now + Math.max(0, secs * 1000);
            yielded = true;
            break;
          }
          case 'REPEAT': {
            const count = Math.floor(Number(this.evaluateValue(op.times, thread.entity)));
            if (count > 0 && op.substack?.length > 0) {
              thread.stack.push({
                ops: JSON.parse(JSON.stringify(op.substack)),
                pc: 0,
                loopType: 'REPEAT',
                remaining: count,
              });
            }
            break;
          }
          case 'FOREVER': {
            if (op.substack?.length > 0) {
              thread.stack.push({
                ops: JSON.parse(JSON.stringify(op.substack)),
                pc: 0,
                loopType: 'FOREVER',
              });
            }
            break;
          }
          case 'IF': {
            const cond = Boolean(this.evaluateValue(op.condition, thread.entity));
            if (cond && op.substack?.length > 0) {
              thread.stack.push({
                ops: JSON.parse(JSON.stringify(op.substack)),
                pc: 0,
              });
            } else if (!cond && op.elseSubstack?.length > 0) {
              thread.stack.push({
                ops: JSON.parse(JSON.stringify(op.elseSubstack)),
                pc: 0,
              });
            }
            break;
          }
          case 'CREATE_CLONE': {
            const targetName = op.target === 'myself' ? thread.entity.name : op.target;
            const template = this.entities.find((e) => !e.isClone && (e.name === targetName || e.id === targetName));
            if (template && this.entities.length < 150) {
              const clone: RuntimeEntity = {
                ...JSON.parse(JSON.stringify(template)),
                id: `clone_${Math.random().toString(36).substring(2, 9)}`,
                x: template === thread.entity ? thread.entity.x : template.x,
                y: template === thread.entity ? thread.entity.y : template.y,
                isClone: true,
                parentId: template.id,
                localVars: { isClone: 'true' },
              };
              this.entities.push(clone);
              clone.scripts
                .filter((s) => s.trigger === 'WHEN_CLONE_START')
                .forEach((s) => this.spawnThread(clone, JSON.parse(JSON.stringify(s.ops))));
            }
            break;
          }
          case 'DELETE_CLONE': {
            if (thread.entity.isClone) {
              this.entities = this.entities.filter((e) => e !== thread.entity);
              yielded = true;
            }
            break;
          }
          case 'BROADCAST': {
            const msg = op.message;
            this.entities.forEach((entity) => {
              entity.scripts
                .filter((s) => s.trigger === 'WHEN_RECEIVE' && s.param === msg)
                .forEach((s) => this.spawnThread(entity, JSON.parse(JSON.stringify(s.ops))));
            });
            break;
          }
          case 'STOP_ALL':
            this.stop();
            return;
          case 'SUBMIT_SCORE': {
            const finalScore = Number(this.evaluateValue(op.score, thread.entity));
            if (this.onScoreSubmit) this.onScoreSubmit(finalScore);
            break;
          }
        }
      }

      if (this.entities.includes(thread.entity) && (thread.stack.length > 0 || now < thread.waitUntilTime)) {
        activeThreads.push(thread);
      }
    }

    this.threads = activeThreads;
  }

  private clampPosition(entity: RuntimeEntity) {
    entity.x = Math.max(-240, Math.min(240, entity.x));
    entity.y = Math.max(-180, Math.min(180, entity.y));
  }

  // ================== RENDERER KHUSUS FLAPPY BIRD ARCADE ==================
  private drawPipeColumn(x: number, y: number, w: number, h: number, isTopPipe: boolean) {
    const { ctx } = this;
    if (h <= 0) return;

    // Gradasi Pipa Hijau 3D ala Mario / Flappy Bird
    const pipeGrad = ctx.createLinearGradient(x, 0, x + w, 0);
    pipeGrad.addColorStop(0, '#15803d');
    pipeGrad.addColorStop(0.28, '#4ade80');
    pipeGrad.addColorStop(0.55, '#22c55e');
    pipeGrad.addColorStop(1, '#14532d');

    ctx.fillStyle = pipeGrad;
    ctx.strokeStyle = '#052e16';
    ctx.lineWidth = 2;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);

    // Bibir/Tutup Pipa (Pipe Rim)
    const rimH = 18;
    const rimY = isTopPipe ? y + h - rimH : y;
    ctx.fillStyle = pipeGrad;
    ctx.fillRect(x - 4, rimY, w + 8, rimH);
    ctx.strokeRect(x - 4, rimY, w + 8, rimH);
  }

  private renderFlappyArcade() {
    if (!this.flappy) return;
    const { ctx } = this;
    const f = this.flappy;
    const groundY = 278;

    // 1. Gambar Sepasang Pipa Hijau Atas & Bawah
    for (const pipe of f.pipes) {
      const topH = pipe.gapY - pipe.gapHeight / 2;
      const bottomY = pipe.gapY + pipe.gapHeight / 2;
      const bottomH = groundY - bottomY;

      this.drawPipeColumn(pipe.x, 0, 52, topH, true);
      this.drawPipeColumn(pipe.x, bottomY, 52, bottomH, false);
    }

    // 2. Gambar Tanah Bergerak (Scrolling Ground Strip)
    ctx.fillStyle = '#ded895';
    ctx.fillRect(0, groundY, 480, 82);
    ctx.fillStyle = '#73bf2e';
    ctx.fillRect(0, groundY, 480, 14);
    ctx.strokeStyle = '#558c22';
    ctx.lineWidth = 2;
    for (let gx = -f.groundScroll; gx < 480; gx += 24) {
      ctx.beginPath();
      ctx.moveTo(gx, groundY + 2);
      ctx.lineTo(gx - 10, groundY + 12);
      ctx.stroke();
    }

    // 3. Gambar Burung Flappy Kuning (Menghadap Kanan + Animasi Kepakan Sayap + Rotasi Paruh)
    ctx.save();
    ctx.translate(f.birdX, f.birdY);
    ctx.rotate(f.birdRotation);

    // Tubuh kuning bulat
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#422006';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 17, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Sayap Putih/Krem yang Mengepak
    const wingOffsetY = f.wingFrame > 0 ? -4 : 2;
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.ellipse(-4, wingOffsetY, 8, 5, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Mata Putih Besar + Pupil Hitam (Menghadap Kanan)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(6, -4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(8, -4, 2, 0, Math.PI * 2);
    ctx.fill();

    // Paruh Oranye (Menghadap Kanan)
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.moveTo(12, -1);
    ctx.lineTo(22, 2);
    ctx.lineTo(12, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    // 4. Petunjuk Kontrol atau Banner Game Over
    if (!this.isRunning && !f.gameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
      ctx.beginPath();
      ctx.roundRect(120, 42, 240, 32, 8);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Tekan SPASI atau Klik Layar untuk Terbang!', 240, 62);
    }

    if (f.gameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.roundRect(115, 110, 250, 110, 14);
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', 240, 148);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(`Skor Akhir: ${this.variables['score'] || 0}`, 240, 178);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px sans-serif';
      ctx.fillText('Klik tombol Play (Bendera Hijau) untuk main lagi', 240, 202);
    }
  }

  private drawTetrisBlockCell(x: number, y: number, size: number, color: string, alpha: number = 1) {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, size - 2, size - 2);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillRect(x + 1, y + 1, size - 2, 3);
    ctx.fillRect(x + 1, y + 1, 3, size - 2);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(x + 1, y + size - 4, size - 2, 3);
    ctx.fillRect(x + size - 4, y + 1, 3, size - 2);
    ctx.restore();
  }

  private renderTetrisBoard() {
    if (!this.tetris) return;
    const { ctx } = this;
    const { cols, rows, board, currentPiece, nextPiece, gameOver } = this.tetris;
    const cellSize = 20;
    const boardW = cols * cellSize;
    const boardH = rows * cellSize;
    const offsetX = 140;
    const offsetY = 20;

    ctx.fillStyle = '#090d16';
    ctx.fillRect(offsetX, offsetY, boardW, boardH);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(offsetX - 2, offsetY - 2, boardW + 4, boardH + 4);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
    ctx.lineWidth = 1;
    for (let c = 1; c < cols; c++) {
      ctx.beginPath();
      ctx.moveTo(offsetX + c * cellSize, offsetY);
      ctx.lineTo(offsetX + c * cellSize, offsetY + boardH);
      ctx.stroke();
    }
    for (let r = 1; r < rows; r++) {
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY + r * cellSize);
      ctx.lineTo(offsetX + boardW, offsetY + r * cellSize);
      ctx.stroke();
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cellColor = board[r][c];
        if (cellColor) {
          this.drawTetrisBlockCell(offsetX + c * cellSize, offsetY + r * cellSize, cellSize, cellColor);
        }
      }
    }

    if (!gameOver) {
      let ghostRow = currentPiece.row;
      while (this.canMoveTetromino(currentPiece.matrix, currentPiece.col, ghostRow + 1)) {
        ghostRow++;
      }
      for (let r = 0; r < currentPiece.matrix.length; r++) {
        for (let c = 0; c < currentPiece.matrix[r].length; c++) {
          if (currentPiece.matrix[r][c]) {
            this.drawTetrisBlockCell(
              offsetX + (currentPiece.col + c) * cellSize,
              offsetY + (ghostRow + r) * cellSize,
              cellSize,
              currentPiece.color,
              0.22
            );
          }
        }
      }

      for (let r = 0; r < currentPiece.matrix.length; r++) {
        for (let c = 0; c < currentPiece.matrix[r].length; c++) {
          if (currentPiece.matrix[r][c]) {
            this.drawTetrisBlockCell(
              offsetX + (currentPiece.col + c) * cellSize,
              offsetY + (currentPiece.row + r) * cellSize,
              cellSize,
              currentPiece.color
            );
          }
        }
      }
    }

    const panelX = 358;
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(panelX, offsetY, 108, 105, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NEXT BLOCK', panelX + 54, offsetY + 18);

    const nm = nextPiece.matrix;
    const startX = panelX + 54 - (nm[0].length * 16) / 2;
    const startY = offsetY + 55 - (nm.length * 16) / 2;
    for (let r = 0; r < nm.length; r++) {
      for (let c = 0; c < nm[r].length; c++) {
        if (nm[r][c]) {
          this.drawTetrisBlockCell(startX + c * 16, startY + r * 16, 16, nextPiece.color);
        }
      }
    }

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('⬅️➡️ : Geser', panelX, offsetY + 130);
    ctx.fillText('⬆️ : Putar 90°', panelX, offsetY + 148);
    ctx.fillText('⬇️ : Turun Cepat', panelX, offsetY + 166);
    ctx.fillText('SPASI : Drop', panelX, offsetY + 184);

    if (gameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(offsetX, offsetY + 110, boardW, 90);
      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', offsetX + boardW / 2, offsetY + 150);
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      ctx.fillText(`Skor: ${this.variables['score'] || 0}`, offsetX + boardW / 2, offsetY + 175);
    }
  }

  private renderScenicBackdrop() {
    const { ctx, canvas } = this;
    const pattern = this.project.stagePattern || 'sky';

    // Jika developer mengunggah gambar background kustom (JPG/PNG)
    if (this.project.stageImageUrl) {
      let bgImg = this.imageCache.get(this.project.stageImageUrl);
      if (!bgImg) {
        bgImg = new Image();
        bgImg.src = this.project.stageImageUrl;
        this.imageCache.set(this.project.stageImageUrl, bgImg);
      }
      if (bgImg.complete && bgImg.naturalWidth > 0) {
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
        if (this.project.showStageGrid) {
          this.renderGridOverlay();
        }
        return;
      }
    }

    // Warna dasar fallback
    ctx.fillStyle = this.project.stageBackdrop || '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (pattern === 'sky') {
      // 1. Langit Gradasi Halus
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 275);
      skyGrad.addColorStop(0, '#0284c7');
      skyGrad.addColorStop(0.55, '#38bdf8');
      skyGrad.addColorStop(1, '#e0f2fe');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, 480, 275);

      // 2. Matahari Bersinar
      ctx.fillStyle = 'rgba(253, 224, 71, 0.25)';
      ctx.beginPath();
      ctx.arc(410, 58, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(410, 58, 25, 0, Math.PI * 2);
      ctx.fill();

      // 3. Awan Putih Lembut
      const drawCloud = (cx: number, cy: number, s: number) => {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
        ctx.beginPath();
        ctx.arc(cx, cy, 18 * s, 0, Math.PI * 2);
        ctx.arc(cx + 16 * s, cy - 6 * s, 22 * s, 0, Math.PI * 2);
        ctx.arc(cx + 34 * s, cy, 17 * s, 0, Math.PI * 2);
        ctx.fill();
      };
      drawCloud(75, 65, 1);
      drawCloud(230, 48, 0.85);
      drawCloud(325, 95, 0.7);

      // 4. Siluet Bukit Hijau Jauh
      ctx.fillStyle = '#86efac';
      ctx.beginPath();
      ctx.moveTo(0, 275);
      ctx.quadraticCurveTo(120, 200, 260, 275);
      ctx.quadraticCurveTo(380, 210, 480, 270);
      ctx.lineTo(480, 285);
      ctx.lineTo(0, 285);
      ctx.fill();

      // 5. Bukit Hijau Dekat
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.moveTo(0, 275);
      ctx.quadraticCurveTo(90, 230, 210, 275);
      ctx.quadraticCurveTo(350, 225, 480, 275);
      ctx.lineTo(480, 360);
      ctx.lineTo(0, 360);
      ctx.fill();

      // 6. Padang Rumput Utama
      const grassGrad = ctx.createLinearGradient(0, 272, 0, 360);
      grassGrad.addColorStop(0, '#22c55e');
      grassGrad.addColorStop(0.15, '#16a34a');
      grassGrad.addColorStop(1, '#15803d');
      ctx.fillStyle = grassGrad;
      ctx.fillRect(0, 272, 480, 88);

      ctx.fillStyle = '#86efac';
      ctx.fillRect(0, 272, 480, 4);
    } else if (pattern === 'stars') {
      const spaceGrad = ctx.createLinearGradient(0, 0, 480, 360);
      spaceGrad.addColorStop(0, '#030712');
      spaceGrad.addColorStop(0.5, '#0f172a');
      spaceGrad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = spaceGrad;
      ctx.fillRect(0, 0, 480, 360);

      const radGrad = ctx.createRadialGradient(130, 110, 10, 130, 110, 140);
      radGrad.addColorStop(0, 'rgba(139, 92, 246, 0.25)');
      radGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, 480, 360);

      for (let i = 0; i < 55; i++) {
        ctx.fillStyle = i % 4 === 0 ? '#fde047' : 'rgba(255, 255, 255, 0.65)';
        const sz = i % 5 === 0 ? 2.5 : 1.5;
        ctx.fillRect(((i * 97) % 460) + 10, ((i * 53) % 340) + 10, sz, sz);
      }

      ctx.save();
      ctx.translate(385, 85);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, 0, 42, 12, -0.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#6366f1';
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (pattern === 'dungeon') {
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(0, 0, 480, 360);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1.5;
      for (let r = 0; r < 360; r += 24) {
        const offset = (r / 24) % 2 === 0 ? 0 : 24;
        for (let c = -24; c < 480; c += 48) {
          ctx.strokeRect(c + offset, r, 48, 24);
        }
      }
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 290, 480, 70);
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, 290, 480, 5);
    } else if (pattern === 'neon') {
      const neonGrad = ctx.createLinearGradient(0, 0, 0, 240);
      neonGrad.addColorStop(0, '#090d16');
      neonGrad.addColorStop(0.6, '#311042');
      neonGrad.addColorStop(1, '#701a75');
      ctx.fillStyle = neonGrad;
      ctx.fillRect(0, 0, 480, 240);

      ctx.fillStyle = '#0f172a';
      const widths = [45, 60, 38, 70, 52, 65, 48, 55, 60];
      let curX = 0;
      widths.forEach((w, idx) => {
        const h = 50 + ((idx * 37) % 85);
        ctx.fillRect(curX, 240 - h, w - 2, h);
        curX += w;
      });

      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(0, 240, 480, 120);
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.45)';
      ctx.lineWidth = 1.5;
      for (let y = 240; y <= 360; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(480, y);
        ctx.stroke();
      }
      for (let x = 0; x <= 480; x += 40) {
        ctx.beginPath();
        ctx.moveTo(240 + (x - 240) * 0.4, 240);
        ctx.lineTo(x, 360);
        ctx.stroke();
      }
    } else if (pattern === 'desert') {
      const desertSky = ctx.createLinearGradient(0, 0, 0, 260);
      desertSky.addColorStop(0, '#f97316');
      desertSky.addColorStop(0.6, '#fdba74');
      desertSky.addColorStop(1, '#fef08a');
      ctx.fillStyle = desertSky;
      ctx.fillRect(0, 0, 480, 260);

      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.moveTo(90, 260);
      ctx.lineTo(165, 165);
      ctx.lineTo(240, 260);
      ctx.fill();

      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(0, 260, 480, 100);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(0, 260, 480, 6);
    } else if (pattern === 'ocean') {
      const oceanGrad = ctx.createLinearGradient(0, 0, 0, 360);
      oceanGrad.addColorStop(0, '#0284c7');
      oceanGrad.addColorStop(0.4, '#0369a1');
      oceanGrad.addColorStop(0.8, '#0c4a6e');
      oceanGrad.addColorStop(1, '#082f49');
      ctx.fillStyle = oceanGrad;
      ctx.fillRect(0, 0, 480, 360);

      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.moveTo(120, 0);
      ctx.lineTo(180, 0);
      ctx.lineTo(260, 360);
      ctx.lineTo(160, 360);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(300, 0);
      ctx.lineTo(360, 0);
      ctx.lineTo(440, 360);
      ctx.lineTo(350, 360);
      ctx.fill();
      ctx.restore();

      for (let i = 0; i < 24; i++) {
        const bx = ((i * 73) % 450) + 15;
        const by = ((i * 47) % 320) + 20;
        const br = (i % 4) + 2;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.moveTo(0, 335);
      ctx.quadraticCurveTo(140, 315, 280, 340);
      ctx.quadraticCurveTo(390, 355, 480, 330);
      ctx.lineTo(480, 360);
      ctx.lineTo(0, 360);
      ctx.fill();
      ctx.fillStyle = '#eab308';
      ctx.fillRect(0, 352, 480, 8);
    } else if (pattern === 'arena') {
      ctx.fillStyle = '#15803d';
      ctx.fillRect(0, 0, 480, 360);
      for (let x = 0; x < 480; x += 60) {
        if ((x / 60) % 2 === 0) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
          ctx.fillRect(x, 0, 60, 360);
        }
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(16, 16, 448, 328);
      ctx.beginPath();
      ctx.moveTo(240, 16);
      ctx.lineTo(240, 344);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(240, 180, 42, 0, Math.PI * 2);
      ctx.stroke();
    } else if (pattern === 'grid') {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= 480; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 360);
        ctx.stroke();
      }
      for (let y = 0; y <= 360; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(480, y);
        ctx.stroke();
      }
    }

    if (this.project.showStageGrid) {
      this.renderGridOverlay();
    }
  }

  private renderGridOverlay() {
    const { ctx } = this;
    ctx.save();
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.22)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= 480; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 360);
      ctx.stroke();
    }
    for (let y = 0; y <= 360; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(480, y);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(240, 0);
    ctx.lineTo(240, 360);
    ctx.moveTo(0, 180);
    ctx.lineTo(480, 180);
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('(0,0)', 244, 174);
    ctx.fillText('Y: 180', 244, 12);
    ctx.fillText('Y: -180', 244, 354);
    ctx.fillText('X: -240', 6, 174);
    ctx.fillText('X: 240', 435, 174);
    ctx.restore();
  }

  public renderFrame() {
    const { ctx, canvas } = this;
    const now = performance.now();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.renderScenicBackdrop();

    if (this.tetris && this.tetris.active) {
      this.renderTetrisBoard();
    } else if (this.flappy && this.flappy.active) {
      this.renderFlappyArcade();
    } else {
      for (const entity of this.entities) {
        if (!entity.visible) continue;

        const screenX = 240 + entity.x;
        const screenY = 180 - entity.y;
        const scale = entity.size / 100;

        ctx.save();
        ctx.translate(screenX, screenY);

        if (entity.rotationStyle === 'all-around') {
          ctx.rotate(((entity.direction - 90) * Math.PI) / 180);
        } else if (entity.rotationStyle === 'left-right' && (entity.direction < 0 || entity.direction > 180)) {
          ctx.scale(-1, 1);
        }

        ctx.scale(scale, scale);

        if (entity.costumeImageUrl) {
          let img = this.imageCache.get(entity.costumeImageUrl);
          if (!img) {
            img = new Image();
            img.src = entity.costumeImageUrl;
            this.imageCache.set(entity.costumeImageUrl, img);
          }
          if (img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, -24, -24, 48, 48);
          }
        } else {
          ctx.font = '36px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(entity.costumeEmoji || '🐱', 0, 0);
        }

        ctx.restore();

        if (entity.sayText && (!entity.sayExpireTime || now < entity.sayExpireTime)) {
          ctx.font = 'bold 12px sans-serif';
          const textWidth = Math.max(40, ctx.measureText(entity.sayText).width + 16);
          const bx = Math.min(470 - textWidth, Math.max(10, screenX + 15));
          const by = Math.max(10, screenY - 45);

          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(bx, by, textWidth, 26, 8);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#1e293b';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(entity.sayText, bx + textWidth / 2, by + 13);
        }
      }
    }

    const varKeys = Object.keys(this.variables);
    varKeys.forEach((key, idx) => {
      const val = this.variables[key];
      const badgeX = 12;
      const badgeY = 14 + idx * 30;
      const label = `${key}: ${val}`;

      ctx.font = 'bold 12px sans-serif';
      const boxW = Math.max(74, ctx.measureText(label).width + 20);

      ctx.fillStyle = '#ff8c1a';
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, boxW, 24, 6);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, badgeX + 10, badgeY + 12);
    });
  }

  private loop = () => {
    if (!this.isRunning) return;
    this.stepThreads();
    this.renderFrame();
    if (this.onStateUpdate) {
      this.onStateUpdate(this.variables);
    }
    this.rafId = requestAnimationFrame(this.loop);
  };
}

// ============================================================================
// PRESET FLAPPY BIRD 2D SKY (DENGAN PIPA ATAS-BAWAH & FISIKA GRAVITASI ASLI)
// ============================================================================
export const FLAPPY_BIRD_PRESET: BlockVerseProject = {
  title: 'Flappy Bird 2D Sky',
  stageBackdrop: '#e0f2fe',
  stagePattern: 'sky',
  variables: { score: 0 },
  broadcasts: ['game over'],
  sprites: [
    {
      id: 'sprite_bird',
      name: 'Flappy',
      x: -115,
      y: 40,
      size: 100,
      direction: 90,
      visible: true,
      rotationStyle: 'dont-rotate',
      costumeEmoji: '🐤',
      scripts: [
        {
          trigger: 'WHEN_FLAG_CLICKED',
          ops: [
            { op: 'SET_VAR', varName: 'score', value: 0 },
            {
              op: 'FOREVER',
              substack: [{ op: 'FLAPPY_STEP' }],
            },
          ],
        },
        {
          trigger: 'WHEN_KEY_PRESSED',
          param: 'space',
          ops: [{ op: 'FLAPPY_FLAP' }],
        },
        {
          trigger: 'WHEN_KEY_PRESSED',
          param: 'arrowup',
          ops: [{ op: 'FLAPPY_FLAP' }],
        },
      ],
    },
  ],
};

export const TETRIS_DROP_PRESET: BlockVerseProject = {
  title: 'Tetris Block Drop',
  stageBackdrop: '#1e1b4b',
  stagePattern: 'grid',
  variables: { score: 0, lines: 0 },
  broadcasts: ['game over'],
  sprites: [
    {
      id: 'sprite_tetromino',
      name: 'Tetromino',
      x: 0,
      y: 0,
      size: 100,
      direction: 90,
      visible: true,
      rotationStyle: 'dont-rotate',
      costumeEmoji: '🧱',
      scripts: [
        {
          trigger: 'WHEN_FLAG_CLICKED',
          ops: [
            { op: 'SET_VAR', varName: 'score', value: 0 },
            { op: 'SET_VAR', varName: 'lines', value: 0 },
            {
              op: 'FOREVER',
              substack: [
                { op: 'WAIT', seconds: 0.45 },
                { op: 'TETRIS_STEP' },
              ],
            },
          ],
        },
        {
          trigger: 'WHEN_KEY_PRESSED',
          param: 'arrowleft',
          ops: [{ op: 'TETRIS_MOVE', dir: -1 }],
        },
        {
          trigger: 'WHEN_KEY_PRESSED',
          param: 'arrowright',
          ops: [{ op: 'TETRIS_MOVE', dir: 1 }],
        },
        {
          trigger: 'WHEN_KEY_PRESSED',
          param: 'arrowup',
          ops: [{ op: 'TETRIS_ROTATE' }],
        },
        {
          trigger: 'WHEN_KEY_PRESSED',
          param: 'arrowdown',
          ops: [{ op: 'TETRIS_STEP' }],
        },
        {
          trigger: 'WHEN_KEY_PRESSED',
          param: 'space',
          ops: [{ op: 'TETRIS_HARD_DROP' }],
        },
      ],
    },
  ],
};

export const STAR_CATCHER_GAME: BlockVerseProject = {
  title: 'Cat & Star Catcher',
  stageBackdrop: '#e0f2fe',
  stagePattern: 'sky',
  variables: { score: 0 },
  broadcasts: ['game over', 'win'],
  sprites: [
    {
      id: 'sprite_hero',
      name: 'Hero',
      x: 0,
      y: -115,
      size: 110,
      direction: 90,
      visible: true,
      rotationStyle: 'left-right',
      costumeEmoji: '🐱',
      scripts: [
        {
          trigger: 'WHEN_FLAG_CLICKED',
          ops: [
            { op: 'SET_VAR', varName: 'score', value: 0 },
            { op: 'GOTO_XY', x: 0, y: -115 },
            {
              op: 'FOREVER',
              substack: [
                { op: 'IF', condition: { type: 'KEY_PRESSED', key: 'arrowright' }, substack: [{ op: 'CHANGE_X', dx: 8 }] },
                { op: 'IF', condition: { type: 'KEY_PRESSED', key: 'arrowleft' }, substack: [{ op: 'CHANGE_X', dx: -8 }] },
              ],
            },
          ],
        },
        {
          trigger: 'WHEN_RECEIVE',
          param: 'game over',
          ops: [
            { op: 'SAY', text: 'BOOM! Game Over!', seconds: 2 },
            { op: 'SUBMIT_SCORE', score: { type: 'VAR', name: 'score' } },
            { op: 'STOP_ALL' },
          ],
        },
      ],
    },
    {
      id: 'sprite_star',
      name: 'Star',
      x: -80,
      y: 150,
      size: 95,
      direction: 90,
      visible: true,
      rotationStyle: 'dont-rotate',
      costumeEmoji: '⭐',
      scripts: [
        {
          trigger: 'WHEN_FLAG_CLICKED',
          ops: [
            { op: 'GOTO_XY', x: -80, y: 150 },
            {
              op: 'FOREVER',
              substack: [
                { op: 'CHANGE_Y', dy: -5 },
                {
                  op: 'IF',
                  condition: { type: 'TOUCHING', target: 'Hero' },
                  substack: [
                    { op: 'PLAY_SOUND', sound: 'coin' },
                    { op: 'CHANGE_VAR', varName: 'score', delta: 10 },
                    { op: 'GOTO_XY', x: { type: 'RANDOM', min: -200, max: 200 }, y: 160 },
                  ],
                },
                {
                  op: 'IF',
                  condition: { type: 'COMPARE', op: 'LT', a: { type: 'Y_POS' }, b: -165 },
                  substack: [{ op: 'GOTO_XY', x: { type: 'RANDOM', min: -200, max: 200 }, y: 160 }],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'sprite_bomb',
      name: 'Bomb',
      x: 90,
      y: 160,
      size: 95,
      direction: 90,
      visible: true,
      rotationStyle: 'dont-rotate',
      costumeEmoji: '💣',
      scripts: [
        {
          trigger: 'WHEN_FLAG_CLICKED',
          ops: [
            { op: 'GOTO_XY', x: 90, y: 160 },
            {
              op: 'FOREVER',
              substack: [
                { op: 'CHANGE_Y', dy: -6 },
                {
                  op: 'IF',
                  condition: { type: 'TOUCHING', target: 'Hero' },
                  substack: [
                    { op: 'PLAY_SOUND', sound: 'hit' },
                    { op: 'BROADCAST', message: 'game over' },
                  ],
                },
                {
                  op: 'IF',
                  condition: { type: 'COMPARE', op: 'LT', a: { type: 'Y_POS' }, b: -165 },
                  substack: [{ op: 'GOTO_XY', x: { type: 'RANDOM', min: -200, max: 200 }, y: 160 }],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

export const PONG_ARCADE_PRESET: BlockVerseProject = {
  title: 'Neon Pong Arcade',
  stageBackdrop: '#05070d',
  stagePattern: 'stars',
  variables: { score: 0 },
  broadcasts: ['game over'],
  sprites: [
    {
      id: 'sprite_paddle',
      name: 'Paddle',
      x: 0,
      y: -135,
      size: 130,
      direction: 90,
      visible: true,
      rotationStyle: 'dont-rotate',
      costumeEmoji: '🛸',
      scripts: [
        {
          trigger: 'WHEN_FLAG_CLICKED',
          ops: [
            { op: 'GOTO_XY', x: 0, y: -135 },
            {
              op: 'FOREVER',
              substack: [
                { op: 'IF', condition: { type: 'KEY_PRESSED', key: 'arrowright' }, substack: [{ op: 'CHANGE_X', dx: 10 }] },
                { op: 'IF', condition: { type: 'KEY_PRESSED', key: 'arrowleft' }, substack: [{ op: 'CHANGE_X', dx: -10 }] },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'sprite_ball',
      name: 'Ball',
      x: 0,
      y: 40,
      size: 95,
      direction: 45,
      visible: true,
      rotationStyle: 'all-around',
      costumeEmoji: '⚽',
      scripts: [
        {
          trigger: 'WHEN_FLAG_CLICKED',
          ops: [
            { op: 'SET_VAR', varName: 'score', value: 0 },
            { op: 'GOTO_XY', x: 0, y: 40 },
            { op: 'POINT_DIRECTION', direction: 45 },
            {
              op: 'FOREVER',
              substack: [
                { op: 'MOVE_STEPS', steps: 7 },
                { op: 'IF_ON_EDGE_BOUNCE' },
                {
                  op: 'IF',
                  condition: { type: 'TOUCHING', target: 'Paddle' },
                  substack: [
                    { op: 'PLAY_SOUND', sound: 'jump' },
                    { op: 'CHANGE_VAR', varName: 'score', delta: 15 },
                    { op: 'POINT_DIRECTION', direction: { type: 'RANDOM', min: -60, max: 60 } },
                    { op: 'CHANGE_Y', dy: 12 },
                  ],
                },
                {
                  op: 'IF',
                  condition: { type: 'COMPARE', op: 'LT', a: { type: 'Y_POS' }, b: -162 },
                  substack: [
                    { op: 'PLAY_SOUND', sound: 'hit' },
                    { op: 'SAY', text: 'Bola Jatuh! Game Over!', seconds: 2 },
                    { op: 'SUBMIT_SCORE', score: { type: 'VAR', name: 'score' } },
                    { op: 'STOP_ALL' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

export const BLANK_STARTER_PROJECT: BlockVerseProject = {
  title: 'My Awesome Game',
  stageBackdrop: '#ffffff',
  stagePattern: 'grid',
  variables: { score: 0 },
  broadcasts: ['message1', 'game over', 'win'],
  sprites: [
    {
      id: 'sprite_hero',
      name: 'Hero',
      x: 0,
      y: 0,
      size: 100,
      direction: 90,
      visible: true,
      rotationStyle: 'all-around',
      costumeEmoji: '🐱',
      scripts: [
        {
          trigger: 'WHEN_FLAG_CLICKED',
          ops: [
            { op: 'GOTO_XY', x: 0, y: 0 },
            {
              op: 'FOREVER',
              substack: [
                { op: 'IF', condition: { type: 'KEY_PRESSED', key: 'arrowright' }, substack: [{ op: 'CHANGE_X', dx: 6 }] },
                { op: 'IF', condition: { type: 'KEY_PRESSED', key: 'arrowleft' }, substack: [{ op: 'CHANGE_X', dx: -6 }] },
              ],
            },
          ],
        },
      ],
    },
  ],
};

export const COIN_HUNTER_PRESET: BlockVerseProject = {
  title: 'Coin Hunter Adventure',
  stageBackdrop: '#e0f2fe',
  stagePattern: 'sky',
  variables: { score: 0 },
  broadcasts: ['got_coin', 'game over'],
  sprites: [
    {
      id: 'sprite_knight',
      name: 'Knight',
      x: -120,
      y: -90,
      size: 100,
      direction: 90,
      visible: true,
      rotationStyle: 'left-right',
      costumeEmoji: '🥷',
      scripts: [
        {
          trigger: 'WHEN_FLAG_CLICKED',
          ops: [
            { op: 'SET_VAR', varName: 'score', value: 0 },
            { op: 'GOTO_XY', x: -120, y: -90 },
            {
              op: 'FOREVER',
              substack: [
                { op: 'IF', condition: { type: 'KEY_PRESSED', key: 'arrowright' }, substack: [{ op: 'CHANGE_X', dx: 6 }] },
                { op: 'IF', condition: { type: 'KEY_PRESSED', key: 'arrowleft' }, substack: [{ op: 'CHANGE_X', dx: -6 }] },
                { op: 'IF', condition: { type: 'KEY_PRESSED', key: 'arrowup' }, substack: [{ op: 'CHANGE_Y', dy: 6 }] },
                { op: 'IF', condition: { type: 'KEY_PRESSED', key: 'arrowdown' }, substack: [{ op: 'CHANGE_Y', dy: -6 }] },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'sprite_coin',
      name: 'Coin',
      x: 80,
      y: 0,
      size: 90,
      direction: 90,
      visible: true,
      rotationStyle: 'dont-rotate',
      costumeEmoji: '🪙',
      scripts: [
        {
          trigger: 'WHEN_FLAG_CLICKED',
          ops: [
            {
              op: 'FOREVER',
              substack: [
                {
                  op: 'IF',
                  condition: { type: 'TOUCHING', target: 'Knight' },
                  substack: [
                    { op: 'PLAY_SOUND', sound: 'coin' },
                    { op: 'CHANGE_VAR', varName: 'score', delta: 10 },
                    { op: 'GOTO_RANDOM' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

export const SPACE_INVADERS_PRESET: BlockVerseProject = {
  title: 'Space Invaders',
  stageBackdrop: '#05070d',
  stagePattern: 'stars',
  variables: { score: 0, 'alien-count': 0, 'march-steps': 5 },
  broadcasts: ['alien_hit', 'march', 'game over'],
  sprites: [
    {
      id: 'sprite_player',
      name: 'Player Ship',
      x: 0,
      y: -145,
      size: 100,
      direction: 90,
      visible: true,
      rotationStyle: 'left-right',
      costumeEmoji: '🛸',
      scripts: [
        {
          trigger: 'WHEN_FLAG_CLICKED',
          ops: [
            { op: 'GOTO_XY', x: 0, y: -145 },
            { op: 'SET_VAR', varName: 'score', value: 0 },
            {
              op: 'FOREVER',
              substack: [
                { op: 'IF', condition: { type: 'KEY_PRESSED', key: 'arrowleft' }, substack: [{ op: 'CHANGE_X', dx: -7 }] },
                { op: 'IF', condition: { type: 'KEY_PRESSED', key: 'arrowright' }, substack: [{ op: 'CHANGE_X', dx: 7 }] },
              ],
            },
          ],
        },
        {
          trigger: 'WHEN_KEY_PRESSED',
          param: 'space',
          ops: [
            { op: 'PLAY_SOUND', sound: 'laser' },
            { op: 'CREATE_CLONE', target: 'laser' },
          ],
        },
      ],
    },
    {
      id: 'sprite_laser',
      name: 'laser',
      x: 0,
      y: -135,
      size: 80,
      direction: 90,
      visible: false,
      rotationStyle: 'dont-rotate',
      costumeEmoji: '⚡',
      scripts: [
        { trigger: 'WHEN_FLAG_CLICKED', ops: [{ op: 'HIDE' }] },
        {
          trigger: 'WHEN_CLONE_START',
          ops: [
            { op: 'SHOW' },
            {
              op: 'REPEAT',
              times: 32,
              substack: [
                { op: 'CHANGE_Y', dy: 10 },
                {
                  op: 'IF',
                  condition: { type: 'TOUCHING', target: 'alien' },
                  substack: [
                    { op: 'PLAY_SOUND', sound: 'hit' },
                    { op: 'CHANGE_VAR', varName: 'score', delta: 10 },
                    { op: 'DELETE_CLONE' },
                  ],
                },
              ],
            },
            { op: 'DELETE_CLONE' },
          ],
        },
      ],
    },
    {
      id: 'sprite_alien',
      name: 'alien',
      x: -150,
      y: 120,
      size: 80,
      direction: 90,
      visible: true,
      rotationStyle: 'left-right',
      costumeEmoji: '👾',
      scripts: [
        {
          trigger: 'WHEN_FLAG_CLICKED',
          ops: [
            { op: 'GOTO_XY', x: -150, y: 120 },
            { op: 'SHOW' },
            {
              op: 'REPEAT',
              times: 6,
              substack: [
                { op: 'CREATE_CLONE', target: 'alien' },
                { op: 'CHANGE_X', dx: 50 },
              ],
            },
            { op: 'HIDE' },
          ],
        },
        {
          trigger: 'WHEN_CLONE_START',
          ops: [
            { op: 'SHOW' },
            {
              op: 'FOREVER',
              substack: [
                { op: 'MOVE_STEPS', steps: 4 },
                { op: 'IF_ON_EDGE_BOUNCE' },
              ],
            },
          ],
        },
      ],
    },
  ],
};
