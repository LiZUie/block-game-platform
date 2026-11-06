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
  color: string;
  workspaceJson?: Record<string, any>;
  scripts: CompiledScript[];
}

export interface BlockVerseProject {
  id?: string;
  title: string;
  stageBackdrop: string;
  variables: Record<string, number | string | boolean>;
  sprites: SpriteTarget[];
}

// Runtime Instance (Mencakup Sprite Asli maupun Clone)
export interface RuntimeEntity extends SpriteTarget {
  isClone: boolean;
  parentId: string;
  localVars: Record<string, any>;
}

interface ThreadProcess {
  id: string;
  entity: RuntimeEntity;
  ops: CompiledOp[];
  pc: number;
  waitUntilTime: number;
  loopStack: { pcStart: number; remaining?: number; condition?: CompiledOp }[];
}

export class BlockVerseRuntime {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private project: BlockVerseProject;
  private entities: RuntimeEntity[] = [];
  private variables: Record<string, any> = {};
  private threads: ThreadProcess[] = [];
  private pressedKeys: Set<string> = new Set();
  private isRunning: boolean = false;
  private rafId: number | null = null;
  private onScoreSubmit?: (score: number) => void;
  private onStateUpdate?: (vars: Record<string, any>, activeSprite?: RuntimeEntity) => void;

  constructor(
    canvas: HTMLCanvasElement,
    project: BlockVerseProject,
    onScoreSubmit?: (score: number) => void,
    onStateUpdate?: (vars: Record<string, any>, activeSprite?: RuntimeEntity) => void
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
  }

  public destroy() {
    this.stop();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    const key = e.key === ' ' ? 'space' : e.key.toLowerCase();
    const wasPressed = this.pressedKeys.has(key);
    this.pressedKeys.add(key);

    if (this.isRunning && !wasPressed) {
      this.entities.forEach((entity) => {
        entity.scripts
          .filter((s) => s.trigger === 'WHEN_KEY_PRESSED' && s.param === key)
          .forEach((s) => this.spawnThread(entity, s.ops));
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

    // Trigger semua blok WHEN_FLAG_CLICKED
    this.entities.forEach((entity) => {
      entity.scripts
        .filter((s) => s.trigger === 'WHEN_FLAG_CLICKED')
        .forEach((s) => this.spawnThread(entity, s.ops));
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
        if (val.op === 'DIV') return b !== 0 ? a / b : 0;
        return 0;
      }
      case 'COMPARE': {
        const a = this.evaluateValue(val.a, entity);
        const b = this.evaluateValue(val.b, entity);
        const numA = Number(a);
        const numB = Number(b);
        const isNumeric = !isNaN(numA) && !isNaN(numB);
        if (val.op === 'LT') return isNumeric ? numA < numB : String(a) < String(b);
        if (val.op === 'GT') return isNumeric ? numA > numB : String(a) > String(b);
        if (val.op === 'EQ') return String(a) === String(b);
        return false;
      }
      case 'TOUCHING': {
        if (!entity.visible) return false;
        const targetName = val.target;
        const r1 = (entity.size / 100) * 18;
        return this.entities.some((other) => {
          if (other === entity || !other.visible) return false;
          if (other.name !== targetName && other.parentId !== targetName) return false;
          const r2 = (other.size / 100) * 18;
          const dist = Math.hypot(entity.x - other.x, entity.y - other.y);
          return dist < r1 + r2;
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
      // Hentikan thread jika entitas clone sudah dihapus
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
            if (topLoop.condition) {
              const condMet = Boolean(this.evaluateValue(topLoop.condition, thread.entity));
              if (!condMet) {
                thread.pc = topLoop.pcStart;
                yielded = true;
                break;
              } else {
                thread.loopStack.pop();
                continue;
              }
            } else if (topLoop.remaining === undefined) {
              // Forever loop
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
          case 'GOTO_XY':
            thread.entity.x = Number(this.evaluateValue(op.x, thread.entity));
            thread.entity.y = Number(this.evaluateValue(op.y, thread.entity));
            this.clampPosition(thread.entity);
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
          case 'SET_SIZE':
            thread.entity.size = Math.max(10, Math.min(300, Number(this.evaluateValue(op.size, thread.entity))));
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
              const inlineEnd = thread.pc + op.substack.length;
              thread.ops.splice(thread.pc, 0, ...op.substack);
              thread.loopStack.push({ pcStart: thread.pc, remaining: count });
              // Hindari mutasi berulang dengan mengganti op menjadi penanda
              op.op = 'NOOP_LOOP_HEADER';
            }
            break;
          }
          case 'FOREVER': {
            if (op.substack?.length > 0) {
              thread.ops.splice(thread.pc, 0, ...op.substack);
              thread.loopStack.push({ pcStart: thread.pc });
              op.op = 'NOOP_LOOP_HEADER';
            }
            break;
          }
          case 'IF': {
            const cond = Boolean(this.evaluateValue(op.condition, thread.entity));
            if (cond && op.substack?.length > 0) {
              this.spawnThread(thread.entity, JSON.parse(JSON.stringify(op.substack)));
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
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Background Stage (480x360)
    ctx.fillStyle = this.project.stageBackdrop || '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Efek Starfield (seperti Space Invaders di gambar)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    for (let i = 0; i < 38; i++) {
      const sx = ((i * 97) % 460) + 10;
      const sy = ((i * 53) % 340) + 10;
      ctx.fillRect(sx, sy, i % 3 === 0 ? 2 : 1.5, i % 3 === 0 ? 2 : 1.5);
    }

    // 2. Render Semua Sprite & Clone (Konversi Koordinat Scratch (0,0) di tengah -> Canvas)
    for (const entity of this.entities) {
      if (!entity.visible) continue;

      const screenX = 240 + entity.x;
      const screenY = 180 - entity.y;
      const scale = entity.size / 100;

      ctx.save();
      ctx.translate(screenX, screenY);

      if (entity.rotationStyle === 'all-around') {
        ctx.rotate(((entity.direction - 90) * Math.PI) / 180);
      } else if (entity.rotationStyle === 'left-right' && entity.direction < 0) {
        ctx.scale(-1, 1);
      }

      ctx.scale(scale, scale);

      // Gambar Sprite (mendukung bentuk retro Space Invaders atau Emoji)
      if (entity.name === 'Player Ship') {
        ctx.fillStyle = '#facc15';
        ctx.fillRect(-20, 0, 40, 12);
        ctx.fillRect(-6, -10, 12, 10);
      } else if (entity.name === 'laser' || entity.name === 'Alien Laser') {
        ctx.fillStyle = entity.name === 'laser' ? '#38bdf8' : '#f87171';
        ctx.fillRect(-2, -10, 4, 20);
      } else {
        ctx.font = '32px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(entity.costumeEmoji || '👾', 0, 0);
      }

      ctx.restore();
    }

    // 3. Render Badge Variabel Global di Atas Stage (Persis badge oranye di gambar Scratch)
    const varKeys = Object.keys(this.variables);
    varKeys.forEach((key, idx) => {
      const val = this.variables[key];
      const badgeX = 215 + idx * 95;
      const badgeY = 10;

      ctx.fillStyle = '#ff8c1a';
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, 54, 24, 6);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(val), badgeX + 27, badgeY + 12);
    });
  }

  private loop = () => {
    if (!this.isRunning) return;
    this.stepThreads();
    this.renderFrame();
    if (this.onStateUpdate) {
      this.onStateUpdate(this.variables, this.entities[0]);
    }
    this.rafId = requestAnimationFrame(this.loop);
  };
}

// ============================================================================
// PRESET DEFAULT: SPACE INVADERS (Persis dengan Screenshot Referensi Kamu)
// ============================================================================
export const SPACE_INVADERS_PRESET: BlockVerseProject = {
  title: 'Space Invaders',
  stageBackdrop: '#05070d',
  variables: {
    score: 0,
    'alien-count': 0,
    'march-steps': 5,
  },
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
      color: '#facc15',
      scripts: [
        {
          trigger: 'WHEN_FLAG_CLICKED',
          ops: [
            { op: 'GOTO_XY', x: 0, y: -145 },
            { op: 'SET_VAR', varName: 'score', value: 0 },
            {
              op: 'FOREVER',
              substack: [
                {
                  op: 'IF',
                  condition: { type: 'KEY_PRESSED', key: 'arrowleft' },
                  substack: [{ op: 'CHANGE_X', dx: -7 }],
                },
                {
                  op: 'IF',
                  condition: { type: 'KEY_PRESSED', key: 'arrowright' },
                  substack: [{ op: 'CHANGE_X', dx: 7 }],
                },
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
      color: '#38bdf8',
      scripts: [
        {
          trigger: 'WHEN_FLAG_CLICKED',
          ops: [{ op: 'HIDE' }],
        },
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
                    { op: 'BROADCAST', message: 'alien_hit' },
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
      y: 20,
      size: 60,
      direction: 90,
      visible: true,
      rotationStyle: 'left-right',
      costumeEmoji: '👾',
      color: '#60a5fa',
      scripts: [
        {
          trigger: 'WHEN_FLAG_CLICKED',
          ops: [
            { op: 'SET_SIZE', size: 60 },
            { op: 'GOTO_XY', x: -150, y: 130 },
            { op: 'SHOW' },
            { op: 'SET_VAR', varName: 'alien-count', value: 0 },
            { op: 'SET_VAR', varName: 'march-steps', value: 6 },
            {
              op: 'REPEAT',
              times: 6,
              substack: [
                { op: 'CREATE_CLONE', target: 'alien' },
                { op: 'CHANGE_X', dx: 50 },
                { op: 'CHANGE_VAR', varName: 'alien-count', delta: 1 },
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
                { op: 'MOVE_STEPS', steps: { type: 'VAR', name: 'march-steps' } },
                { op: 'IF_ON_EDGE_BOUNCE' },
                {
                  op: 'IF',
                  condition: { type: 'TOUCHING', target: 'laser' },
                  substack: [
                    { op: 'CHANGE_VAR', varName: 'score', delta: 10 },
                    { op: 'DELETE_CLONE' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'sprite_gameover',
      name: 'Game Over',
      x: 0,
      y: 0,
      size: 100,
      direction: 90,
      visible: false,
      rotationStyle: 'dont-rotate',
      costumeEmoji: '💀',
      color: '#f43f5e',
      scripts: [
        {
          trigger: 'WHEN_FLAG_CLICKED',
          ops: [{ op: 'HIDE' }],
        },
        {
          trigger: 'WHEN_RECEIVE',
          param: 'game over',
          ops: [
            { op: 'SHOW' },
            { op: 'SUBMIT_SCORE', score: { type: 'VAR', name: 'score' } },
          ],
        },
      ],
    },
    {
      id: 'sprite_alien_laser',
      name: 'Alien Laser',
      x: 0,
      y: 90,
      size: 70,
      direction: 90,
      visible: false,
      rotationStyle: 'dont-rotate',
      costumeEmoji: '🔥',
      color: '#fb923c',
      scripts: [
        {
          trigger: 'WHEN_FLAG_CLICKED',
          ops: [{ op: 'HIDE' }],
        },
      ],
    },
  ],
};
