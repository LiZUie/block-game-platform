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
  costumeImageUrl?: string; // Mendukung upload gambar/URL sprite bebas
  sayText?: string;         // Balon percakapan (blok "say")
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

interface ThreadProcess {
  id: string;
  entity: RuntimeEntity;
  ops: CompiledOp[];
  pc: number;
  waitUntilTime: number;
  loopStack: { pcStart: number; remaining?: number }[];
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
  private isRunning: boolean = false;
  private rafId: number | null = null;
  private onScoreSubmit?: (score: number) => void;
  private onStateUpdate?: (vars: Record<string, any>) => void;

  constructor(
    canvas: HTMLCanvasElement,
    project: BlockVerseProject,
    onScoreSubmit?: (score: number) => void,
    onStateUpdate?: (vars: Record<string, any>) => void
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.project = JSON.parse(JSON.stringify(project));
    this.onScoreSubmit = onScoreSubmit;
    this.onStateUpdate = onStateUpdate;
    this.resetState();
    this.bindInputEvents();
  }

  private bindInputEvents() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
  }

  public destroy() {
    this.stop();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
  }

  private handleMouseMove = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = 480 / rect.width;
    const scaleY = 360 / rect.height;
    this.mousePos.x = Math.round((e.clientX - rect.left) * scaleX - 240);
    this.mousePos.y = Math.round(180 - (e.clientY - rect.top) * scaleY);
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    // Jangan bajak input ketika user sedang mengetik di form input/textarea
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const key = e.key === ' ' ? 'space' : e.key.toLowerCase();
    const wasPressed = this.pressedKeys.has(key);
    this.pressedKeys.add(key);

    if (this.isRunning && !wasPressed) {
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

  public resetState() {
    this.variables = { ...this.project.variables };
    this.entities = this.project.sprites.map((sp) => ({
      ...JSON.parse(JSON.stringify(sp)),
      isClone: false,
      parentId: sp.id,
      localVars: { isClone: 'false' },
    }));
    this.threads = [];
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
      ops,
      pc: 0,
      waitUntilTime: 0,
      loopStack: [],
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
      case 'DIRECTION':
        return Math.round(entity.direction);
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
          const r = (entity.size / 100) * 20;
          return Math.hypot(entity.x - this.mousePos.x, entity.y - this.mousePos.y) < r;
        }
        const r1 = (entity.size / 100) * 18;
        return this.entities.some((other) => {
          if (other === entity || !other.visible) return false;
          if (other.name !== targetName && other.parentId !== targetName) return false;
          const r2 = (other.size / 100) * 18;
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

      while (steps < 35 && !yielded) {
        steps++;

        if (thread.pc >= thread.ops.length) {
          if (thread.loopStack.length > 0) {
            const topLoop = thread.loopStack[thread.loopStack.length - 1];
            if (topLoop.remaining === undefined) {
              thread.pc = topLoop.pcStart;
              yielded = true;
              break;
            } else if (topLoop.remaining > 1) {
              topLoop.remaining--;
              thread.pc = topLoop.pcStart;
              yielded = true;
              break;
            } else {
              thread.loopStack.pop();
              continue;
            }
          } else {
            break;
          }
        }

        const op = thread.ops[thread.pc];
        thread.pc++;
        if (!op) break;

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
            thread.entity.x = Math.floor(Math.random() * 440) - 220;
            thread.entity.y = Math.floor(Math.random() * 320) - 160;
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
            if (thread.entity.x > 225 || thread.entity.x < -225) {
              thread.entity.direction = -thread.entity.direction;
              this.clampPosition(thread.entity);
            }
            if (thread.entity.y > 165 || thread.entity.y < -165) {
              thread.entity.direction = 180 - thread.entity.direction;
              this.clampPosition(thread.entity);
            }
            break;
          case 'SAY': {
            const text = String(this.evaluateValue(op.text, thread.entity));
            const secs = Number(this.evaluateValue(op.seconds, thread.entity));
            thread.entity.sayText = text;
            if (secs > 0) {
              thread.entity.sayExpireTime = now + secs * 1000;
              thread.waitUntilTime = now + secs * 1000;
              yielded = true;
            } else {
              thread.entity.sayExpireTime = undefined;
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
              const subCopy = JSON.parse(JSON.stringify(op.substack));
              thread.ops.splice(thread.pc, 0, ...subCopy);
              thread.loopStack.push({ pcStart: thread.pc, remaining: count });
              op.op = 'NOOP_LOOP_HEADER';
            }
            break;
          }
          case 'FOREVER': {
            if (op.substack?.length > 0) {
              const subCopy = JSON.parse(JSON.stringify(op.substack));
              thread.ops.splice(thread.pc, 0, ...subCopy);
              thread.loopStack.push({ pcStart: thread.pc });
              op.op = 'NOOP_LOOP_HEADER';
            }
            break;
          }
          case 'IF': {
            const cond = Boolean(this.evaluateValue(op.condition, thread.entity));
            if (cond && op.substack?.length > 0) {
              this.spawnThread(thread.entity, JSON.parse(JSON.stringify(op.substack)));
            } else if (!cond && op.elseSubstack?.length > 0) {
              this.spawnThread(thread.entity, JSON.parse(JSON.stringify(op.elseSubstack)));
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
          default:
            break;
        }
      }

      if (
        this.entities.includes(thread.entity) &&
        (thread.pc < thread.ops.length || thread.loopStack.length > 0 || now < thread.waitUntilTime)
      ) {
        activeThreads.push(thread);
      }
    }

    this.threads = activeThreads;
  }

  private clampPosition(entity: RuntimeEntity) {
    entity.x = Math.max(-240, Math.min(240, entity.x));
    entity.y = Math.max(-180, Math.min(180, entity.y));
  }

  public renderFrame() {
    const { ctx, canvas } = this;
    const now = performance.now();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Gambar Latar Belakang Sesuai Pilihan Developer
    ctx.fillStyle = this.project.stageBackdrop || '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const pattern = this.project.stagePattern || 'grid';
    if (pattern === 'stars') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      for (let i = 0; i < 38; i++) {
        ctx.fillRect(((i * 97) % 460) + 10, ((i * 53) % 340) + 10, 2, 2);
      }
    } else if (pattern === 'grid') {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
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

    // 2. Render Semua Sprite (Emoji atau Custom Image Upload)
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

      // Balon Percakapan (Blok "say")
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

    // 3. Render Badge Variabel di Stage
    const varKeys = Object.keys(this.variables);
    varKeys.forEach((key, idx) => {
      const val = this.variables[key];
      const badgeX = 10;
      const badgeY = 10 + idx * 30;
      const label = `${key}: ${val}`;

      ctx.font = 'bold 12px sans-serif';
      const boxW = Math.max(70, ctx.measureText(label).width + 20);

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
// KOLEKSI PROJECT TEMPLATES (Blank Project, Platformer/Collector, Space Invaders)
// ============================================================================
export const BLANK_STARTER_PROJECT: BlockVerseProject = {
  title: 'My Awesome Game',
  stageBackdrop: '#ffffff',
  stagePattern: 'grid',
  variables: {
    score: 0,
  },
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
            { op: 'SAY', text: 'Hello BlockVerse!', seconds: 2 },
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
  variables: {
    score: 0,
  },
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
      costumeEmoji: '🧙♂️',
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
  variables: {
    score: 0,
    'alien-count': 0,
    'march-steps': 5,
  },
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
          ops: [{ op: 'CREATE_CLONE', target: 'laser' }],
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
