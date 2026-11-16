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
  stagePattern?: 'none' | 'stars' | 'grid' | 'sky' | 'dungeon';
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
      osc.type = 'square';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.18);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
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

    // Untuk Tetris, izinkan tombol panah kiri/kanan/bawah berulang saat ditahan
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
      sp.scripts.some((sc) =>
        JSON.stringify(sc.ops).includes('TETRIS_')
      )
    );
  }

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

    // 1. Kunci balok aktif ke papan tumpukan
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

    // 2. Cek dan hapus semua baris yang penuh dari kiri ke kanan
    let clearedCount = 0;
    for (let r = rows - 1; r >= 0; r--) {
      if (board[r].every((cell) => cell !== null)) {
        board.splice(r, 1);
        board.unshift(Array(cols).fill(null));
        clearedCount++;
        r++; // Periksa lagi indeks baris yang baru turun
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

    // 3. Munculkan balok berikutnya dari atas
    const next = this.tetris.nextPiece;
    const spawnCol = Math.floor((cols - next.matrix[0].length) / 2);
    this.tetris.currentPiece = {
      ...next,
      col: spawnCol,
      row: 0,
    };
    this.tetris.nextPiece = this.randomTetromino();

    // 4. Jika balok baru langsung menabrak tumpukan di paling atas -> Game Over!
    if (!this.canMoveTetromino(this.tetris.currentPiece.matrix, spawnCol, 0)) {
      this.tetris.gameOver = true;
      playSynthSound('hit');
      if (this.onScoreSubmit) {
        this.onScoreSubmit(Number(this.variables['score'] || 0));
      }
      this.entities.forEach((entity) => {
        entity.scripts
          .filter((s) => s.trigger === 'WHEN_RECEIVE' && s.param === 'game over')
          .forEach((s) => this.spawnThread(entity, JSON.parse(JSON.stringify(s.ops))));
      });
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
    } else {
      this.tetris = null;
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
            // Wall-kick sederhana jika berputar di dekat tepi dinding
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
              thread.waitUntilTime = now + secs * 1000;
              yielded = true;
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

  private drawTetrisBlockCell(x: number, y: number, size: number, color: string, alpha: number = 1) {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, size - 2, size - 2);

    // Efek Bevel 3D ala Tetris Arcade
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
    const boardW = cols * cellSize; // 200px
    const boardH = rows * cellSize; // 320px
    const offsetX = 140;
    const offsetY = 20;

    // 1. Kotak Well / Arena Papan Tetris (10x16)
    ctx.fillStyle = '#090d16';
    ctx.fillRect(offsetX, offsetY, boardW, boardH);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(offsetX - 2, offsetY - 2, boardW + 4, boardH + 4);

    // 2. Garis Grid Tipis di Dalam Arena
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

    // 3. Gambar Tumpukan Balok yang Sudah Terkunci di Bawah
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cellColor = board[r][c];
        if (cellColor) {
          this.drawTetrisBlockCell(
            offsetX + c * cellSize,
            offsetY + r * cellSize,
            cellSize,
            cellColor
          );
        }
      }
    }

    // 4. Gambar Bayangan Jatuh (Ghost Piece) di Dasar Tumpukan
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

      // 5. Gambar Balok Tetromino Aktif yang Sedang Jatuh
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

    // 6. Panel Kanan: Preview NEXT PIECE & Petunjuk Kontrol
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

    // Info Kontrol di Bawah Next Box
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

  public renderFrame() {
    const { ctx, canvas } = this;
    const now = performance.now();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = this.project.stageBackdrop || '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const pattern = this.project.stagePattern || 'grid';
    if (pattern === 'stars') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      for (let i = 0; i < 38; i++) {
        ctx.fillRect(((i * 97) % 460) + 10, ((i * 53) % 340) + 10, 2, 2);
      }
    } else if (pattern === 'grid') {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
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
    } else if (pattern === 'sky') {
      const grad = ctx.createLinearGradient(0, 0, 0, 360);
      grad.addColorStop(0, '#38bdf8');
      grad.addColorStop(0.75, '#bae6fd');
      grad.addColorStop(0.75, '#4ade80');
      grad.addColorStop(1, '#16a34a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 480, 360);
    }

    // Jika mode Matrix Tetris aktif, gambar papan 10x16 beserta seluruh balok Tetromino
    if (this.tetris && this.tetris.active) {
      this.renderTetrisBoard();
    } else {
      // Render Sprite Standar
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

    // Render Badge Variabel (Score, Lines, dll.)
    const varKeys = Object.keys(this.variables);
    varKeys.forEach((key, idx) => {
      const val = this.variables[key];
      const badgeX = 12;
      const badgeY = 20 + idx * 32;
      const label = `${key}: ${val}`;

      ctx.font = 'bold 12px sans-serif';
      const boxW = Math.max(78, ctx.measureText(label).width + 20);

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
// KOLEKSI PRESET GAME (TERMASUK REAL MATRIX TETRIS 10x16)
// ============================================================================

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
            { op: 'SAY', text: 'Tangkap Bintang & Hindari Bom!', seconds: 2 },
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
      x: -100,
      y: 20,
      size: 105,
      direction: 90,
      visible: true,
      rotationStyle: 'dont-rotate',
      costumeEmoji: '🐦',
      scripts: [
        {
          trigger: 'WHEN_FLAG_CLICKED',
          ops: [
            { op: 'SET_VAR', varName: 'score', value: 0 },
            { op: 'GOTO_XY', x: -100, y: 20 },
            { op: 'SAY', text: 'Tekan SPASI untuk Terbang!', seconds: 1.5 },
            {
              op: 'FOREVER',
              substack: [
                { op: 'CHANGE_Y', dy: -3.5 },
                {
                  op: 'IF',
                  condition: { type: 'KEY_PRESSED', key: 'space' },
                  substack: [
                    { op: 'PLAY_SOUND', sound: 'jump' },
                    { op: 'CHANGE_Y', dy: 11 },
                  ],
                },
                {
                  op: 'IF',
                  condition: { type: 'COMPARE', op: 'LT', a: { type: 'Y_POS' }, b: -155 },
                  substack: [
                    { op: 'PLAY_SOUND', sound: 'hit' },
                    { op: 'BROADCAST', message: 'game over' },
                  ],
                },
              ],
            },
          ],
        },
        {
          trigger: 'WHEN_RECEIVE',
          param: 'game over',
          ops: [
            { op: 'SAY', text: 'Menabrak! Game Over!', seconds: 2 },
            { op: 'SUBMIT_SCORE', score: { type: 'VAR', name: 'score' } },
            { op: 'STOP_ALL' },
          ],
        },
      ],
    },
    {
      id: 'sprite_pipe',
      name: 'Pipa',
      x: 200,
      y: -60,
      size: 130,
      direction: 90,
      visible: true,
      rotationStyle: 'dont-rotate',
      costumeEmoji: '🌵',
      scripts: [
        {
          trigger: 'WHEN_FLAG_CLICKED',
          ops: [
            { op: 'GOTO_XY', x: 200, y: -60 },
            {
              op: 'FOREVER',
              substack: [
                { op: 'CHANGE_X', dx: -6 },
                {
                  op: 'IF',
                  condition: { type: 'TOUCHING', target: 'Flappy' },
                  substack: [
                    { op: 'PLAY_SOUND', sound: 'hit' },
                    { op: 'BROADCAST', message: 'game over' },
                  ],
                },
                {
                  op: 'IF',
                  condition: { type: 'COMPARE', op: 'LT', a: { type: 'X_POS' }, b: -220 },
                  substack: [
                    { op: 'PLAY_SOUND', sound: 'coin' },
                    { op: 'CHANGE_VAR', varName: 'score', delta: 10 },
                    { op: 'GOTO_XY', x: 220, y: { type: 'RANDOM', min: -120, max: 110 } },
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
            { op: 'SAY', text: 'Gunakan panah kiri/kanan!', seconds: 2 },
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
