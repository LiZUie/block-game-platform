import { GameManifest, EntityConfig, BlockNode } from '@blockgame/shared';

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

interface Point {
  x: number;
  y: number;
}

export class GameRunner {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private manifest: GameManifest;
  private isRunning = false;
  private isGameOver = false;
  private isGameWon = false;
  private winMessage = '';
  private timerId: any = null;

  // Runtime State
  private score = 0;
  private variables: Record<string, any> = {};
  private direction: Direction = 'RIGHT';
  private nextDirection: Direction = 'RIGHT';
  private playerPos: Point = { x: 100, y: 100 };
  private playerTrail: Point[] = [];
  private trailLength = 3;
  private runtimeEntities: (EntityConfig & { currentPos: Point; collected?: boolean })[] = [];

  // Callbacks
  public onScoreChange?: (score: number) => void;
  public onGameOver?: (score: number, reason: string) => void;
  public onGameWin?: (score: number, message: string) => void;

  constructor(canvas: HTMLCanvasElement, manifest: GameManifest) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context not available');
    this.ctx = context;
    this.manifest = manifest;

    this.initCanvas();
    this.bindKeyboard();
  }

  private initCanvas() {
    this.canvas.width = this.manifest.canvas.width;
    this.canvas.height = this.manifest.canvas.height;
  }

  public start() {
    this.stop();
    this.isRunning = true;
    this.isGameOver = false;
    this.isGameWon = false;
    this.winMessage = '';
    this.score = 0;
    this.variables = { score: 0 };
    this.direction = 'RIGHT';
    this.nextDirection = 'RIGHT';

    const gridSize = this.manifest.canvas.gridSize || 20;

    // Clone entities with current positions
    this.runtimeEntities = this.manifest.entities.map(e => ({
      ...e,
      currentPos: { ...e.initialPosition },
      collected: false
    }));

    // Find Player
    const playerEntity = this.runtimeEntities.find(e => e.type === 'player');
    if (playerEntity) {
      this.playerPos = { ...playerEntity.currentPos };
    } else {
      this.playerPos = { x: gridSize * 2, y: gridSize * 2 };
    }

    // Init initial trail for snake mode
    const isSnake = this.isSnakeMode();
    if (isSnake) {
      this.trailLength = 3;
      this.playerTrail = [
        { x: this.playerPos.x - gridSize, y: this.playerPos.y },
        { x: this.playerPos.x - (gridSize * 2), y: this.playerPos.y }
      ];
    } else {
      this.playerTrail = [];
    }

    if (this.onScoreChange) this.onScoreChange(this.score);

    // Run WHEN_GAME_START blocks
    this.evaluateEvent('WHEN_GAME_START');

    // Start Game Loop if tickRate > 0 (e.g. Snake), otherwise step-based
    const tickRate = this.manifest.canvas.tickRateMs || 0;
    if (tickRate > 0) {
      this.timerId = setInterval(() => this.tick(), tickRate);
    }

    this.render();
  }

  public stop() {
    this.isRunning = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private isSnakeMode(): boolean {
    return this.manifest.canvas.gameMode === 'snake' || 
           this.manifest.category === 'classic' ||
           this.manifest.entities.some(e => e.id === 'entity_snake');
  }

  public setDirection(dir: Direction) {
    if (this.isGameOver || this.isGameWon) return;

    if (this.isSnakeMode()) {
      // Prevent 180-degree immediate reverse in snake
      if (this.direction === 'UP' && dir === 'DOWN') return;
      if (this.direction === 'DOWN' && dir === 'UP') return;
      if (this.direction === 'LEFT' && dir === 'RIGHT') return;
      if (this.direction === 'RIGHT' && dir === 'LEFT') return;
      this.nextDirection = dir;
    } else {
      // Adventure / Puzzle / Turn-based: Move player directly step-by-step
      this.direction = dir;
      this.stepMove(dir);
    }
  }

  private stepMove(dir: Direction) {
    if (!this.isRunning || this.isGameOver || this.isGameWon) return;
    const gridSize = this.manifest.canvas.gridSize || 20;

    let targetX = this.playerPos.x;
    let targetY = this.playerPos.y;

    if (dir === 'UP') targetY -= gridSize;
    else if (dir === 'DOWN') targetY += gridSize;
    else if (dir === 'LEFT') targetX -= gridSize;
    else if (dir === 'RIGHT') targetX += gridSize;

    // Check boundary
    if (
      targetX < 0 ||
      targetY < 0 ||
      targetX >= this.canvas.width ||
      targetY >= this.canvas.height
    ) {
      return; // Can't walk off screen in adventure mode
    }

    // Check solid walls
    const solidBlock = this.runtimeEntities.find(
      e => !e.collected && e.isSolid && e.currentPos.x === targetX && e.currentPos.y === targetY
    );
    if (solidBlock) {
      this.playBeep(180, 0.05); // Thud sound
      return; // Blocked by wall
    }

    this.playerPos = { x: targetX, y: targetY };
    this.checkCollisions();
    this.render();
  }

  private bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (!this.isRunning || this.isGameOver || this.isGameWon) return;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          this.setDirection('UP');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          this.setDirection('DOWN');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          this.setDirection('LEFT');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          this.setDirection('RIGHT');
          break;
      }
    });
  }

  private tick() {
    if (!this.isRunning || this.isGameOver || this.isGameWon) return;
    if (!this.isSnakeMode()) return;

    this.direction = this.nextDirection;
    const gridSize = this.manifest.canvas.gridSize || 20;

    // Record previous head position into trail
    this.playerTrail.unshift({ x: this.playerPos.x, y: this.playerPos.y });
    while (this.playerTrail.length > this.trailLength) {
      this.playerTrail.pop();
    }

    // Move Head
    if (this.direction === 'UP') this.playerPos.y -= gridSize;
    else if (this.direction === 'DOWN') this.playerPos.y += gridSize;
    else if (this.direction === 'LEFT') this.playerPos.x -= gridSize;
    else if (this.direction === 'RIGHT') this.playerPos.x += gridSize;

    // Check Wall Collisions in Snake
    if (
      this.playerPos.x < 0 ||
      this.playerPos.y < 0 ||
      this.playerPos.x >= this.canvas.width ||
      this.playerPos.y >= this.canvas.height
    ) {
      this.triggerGameOver('Menabrak dinding!');
      return;
    }

    // Check Self Collision
    for (const segment of this.playerTrail) {
      if (segment.x === this.playerPos.x && segment.y === this.playerPos.y) {
        this.triggerGameOver('Menabrak tubuh sendiri!');
        return;
      }
    }

    this.checkCollisions();
    this.render();
  }

  private checkCollisions() {
    const gridSize = this.manifest.canvas.gridSize || 20;

    for (const entity of this.runtimeEntities) {
      if (entity.collected || entity.type === 'player' || entity.isSolid) continue;

      const dist = Math.hypot(
        this.playerPos.x - entity.currentPos.x,
        this.playerPos.y - entity.currentPos.y
      );

      if (dist < gridSize * 0.8) {
        // Evaluate collision logic for this pair
        this.evaluateCollision('entity_snake', entity.id);
        this.evaluateCollision('entity_hero', entity.id);
        this.evaluateCollision('entity_player', entity.id);
      }
    }
  }

  private spawnRandom(entityId: string) {
    const target = this.runtimeEntities.find(e => e.id === entityId);
    if (!target) return;

    const gridSize = this.manifest.canvas.gridSize || 20;
    const maxCols = Math.floor(this.canvas.width / gridSize);
    const maxRows = Math.floor(this.canvas.height / gridSize);

    let newX = 0;
    let newY = 0;
    let collides = true;

    while (collides) {
      newX = Math.floor(Math.random() * maxCols) * gridSize;
      newY = Math.floor(Math.random() * maxRows) * gridSize;
      collides = (newX === this.playerPos.x && newY === this.playerPos.y) ||
        this.playerTrail.some(s => s.x === newX && s.y === newY) ||
        this.runtimeEntities.some(e => !e.collected && e.isSolid && e.currentPos.x === newX && e.currentPos.y === newY);
    }

    target.currentPos = { x: newX, y: newY };
  }

  private triggerGameOver(reason: string) {
    this.isGameOver = true;
    this.stop();
    this.playBeep(220, 0.3); // Low buzz sound
    this.render();
    if (this.onGameOver) this.onGameOver(this.score, reason);
  }

  private triggerWinGame(message: string) {
    this.isGameWon = true;
    this.winMessage = message || 'Selamat! Kamu memenangkan permainan!';
    this.stop();
    this.playFanfare();
    this.render();
    if (this.onGameWin) this.onGameWin(this.score, this.winMessage);
  }

  private render() {
    const { width, height, backgroundColor, gridSize } = this.manifest.canvas;
    const isSnake = this.isSnakeMode();

    // 1. Clear & Background
    this.ctx.fillStyle = backgroundColor || '#0f172a';
    this.ctx.fillRect(0, 0, width, height);

    // 2. Draw Subtle Grid
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, height);
      this.ctx.stroke();
    }
    for (let y = 0; y <= height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
      this.ctx.stroke();
    }

    // 3. Draw Entities (Keys, Gems, Doors, Walls, Food)
    for (const entity of this.runtimeEntities) {
      if (entity.collected || entity.type === 'player') continue;
      const { x, y } = entity.currentPos;
      this.ctx.fillStyle = entity.color || '#FACC15';

      if (entity.shape === 'circle' || entity.type === 'food') {
        this.ctx.beginPath();
        this.ctx.arc(x + gridSize / 2, y + gridSize / 2, gridSize / 2 - 2, 0, Math.PI * 2);
        this.ctx.fill();
      } else if (entity.shape === 'diamond' || entity.type === 'key') {
        // Diamond Key
        this.ctx.beginPath();
        this.ctx.moveTo(x + gridSize / 2, y + 2);
        this.ctx.lineTo(x + gridSize - 2, y + gridSize / 2);
        this.ctx.lineTo(x + gridSize / 2, y + gridSize - 2);
        this.ctx.lineTo(x + 2, y + gridSize / 2);
        this.ctx.closePath();
        this.ctx.fill();
      } else if (entity.shape === 'star' || entity.type === 'treasure') {
        // Star Gem
        this.ctx.beginPath();
        this.ctx.arc(x + gridSize / 2, y + gridSize / 2, gridSize / 2 - 3, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(x + gridSize / 2 - 2, y + gridSize / 2 - 2, 4, 4);
      } else if (entity.shape === 'door' || entity.type === 'door') {
        // Portal Door
        this.ctx.fillRect(x + 2, y + 2, gridSize - 4, gridSize - 4);
        this.ctx.fillStyle = '#F3E8FF';
        this.ctx.fillRect(x + 5, y + 5, gridSize - 10, gridSize - 10);
      } else if (entity.shape === 'wall' || entity.isSolid) {
        // Solid Wall
        this.ctx.fillStyle = entity.color || '#334155';
        this.ctx.fillRect(x, y, gridSize, gridSize);
        this.ctx.strokeStyle = '#475569';
        this.ctx.strokeRect(x + 1, y + 1, gridSize - 2, gridSize - 2);
      } else {
        // Standard Square
        this.ctx.fillRect(x + 1, y + 1, gridSize - 2, gridSize - 2);
      }
    }

    // 4. Draw Snake Trail if snake mode
    if (isSnake && this.playerTrail.length > 0) {
      this.ctx.fillStyle = '#10B981';
      for (let i = 0; i < this.playerTrail.length; i++) {
        const seg = this.playerTrail[i];
        const opacity = Math.max(0.4, 1 - (i / this.playerTrail.length) * 0.5);
        this.ctx.globalAlpha = opacity;
        this.ctx.fillRect(seg.x + 1, seg.y + 1, gridSize - 2, gridSize - 2);
      }
      this.ctx.globalAlpha = 1.0;
    }

    // 5. Draw Player Character
    const playerEntity = this.runtimeEntities.find(e => e.type === 'player');
    this.ctx.fillStyle = playerEntity?.color || (isSnake ? '#34D399' : '#38BDF8');
    this.ctx.fillRect(this.playerPos.x + 1, this.playerPos.y + 1, gridSize - 2, gridSize - 2);

    // Player Eyes
    this.ctx.fillStyle = '#064E3B';
    const eyeSize = 3;
    if (this.direction === 'RIGHT') {
      this.ctx.fillRect(this.playerPos.x + gridSize - 6, this.playerPos.y + 4, eyeSize, eyeSize);
      this.ctx.fillRect(this.playerPos.x + gridSize - 6, this.playerPos.y + gridSize - 7, eyeSize, eyeSize);
    } else if (this.direction === 'LEFT') {
      this.ctx.fillRect(this.playerPos.x + 3, this.playerPos.y + 4, eyeSize, eyeSize);
      this.ctx.fillRect(this.playerPos.x + 3, this.playerPos.y + gridSize - 7, eyeSize, eyeSize);
    } else if (this.direction === 'UP') {
      this.ctx.fillRect(this.playerPos.x + 4, this.playerPos.y + 3, eyeSize, eyeSize);
      this.ctx.fillRect(this.playerPos.x + gridSize - 7, this.playerPos.y + 3, eyeSize, eyeSize);
    } else {
      this.ctx.fillRect(this.playerPos.x + 4, this.playerPos.y + gridSize - 6, eyeSize, eyeSize);
      this.ctx.fillRect(this.playerPos.x + gridSize - 7, this.playerPos.y + gridSize - 6, eyeSize, eyeSize);
    }

    // 6. Win Overlay
    if (this.isGameWon) {
      this.ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      this.ctx.fillRect(0, 0, width, height);

      this.ctx.fillStyle = '#34D399';
      this.ctx.font = 'bold 24px "JetBrains Mono", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('🏆 KAMU MENANG!', width / 2, height / 2 - 15);

      this.ctx.fillStyle = '#F3F4F6';
      this.ctx.font = '14px "Plus Jakarta Sans", sans-serif';
      this.ctx.fillText(this.winMessage, width / 2, height / 2 + 15);
      this.ctx.fillText(`Total Skor: ${this.score}`, width / 2, height / 2 + 38);
    }

    // 7. Game Over Overlay
    if (this.isGameOver) {
      this.ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      this.ctx.fillRect(0, 0, width, height);

      this.ctx.fillStyle = '#EF4444';
      this.ctx.font = 'bold 26px "JetBrains Mono", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('GAME OVER', width / 2, height / 2 - 15);

      this.ctx.fillStyle = '#F3F4F6';
      this.ctx.font = '14px "Plus Jakarta Sans", sans-serif';
      this.ctx.fillText(`Skor Akhir: ${this.score}`, width / 2, height / 2 + 20);
    }
  }

  private evaluateEvent(eventType: string) {
    if (!this.manifest.logic?.blocks) return;
    const blocks = this.manifest.logic.blocks.filter(b => b.type === eventType);
    for (const b of blocks) {
      if (b.children) {
        for (const child of b.children) {
          this.executeAction(child);
        }
      }
    }
  }

  private evaluateCollision(entityA: string, entityB: string) {
    if (!this.manifest.logic?.blocks) return;
    const blocks = this.manifest.logic.blocks.filter(
      b => b.type === 'ON_COLLISION' && 
      ((b.params.entityA === entityA && b.params.entityB === entityB) ||
       (b.params.entityA === entityB && b.params.entityB === entityA))
    );

    for (const b of blocks) {
      if (b.children) {
        for (const child of b.children) {
          this.executeAction(child);
        }
      }
    }
  }

  private executeAction(node: BlockNode) {
    switch (node.type) {
      case 'ADD_SCORE':
        this.score += node.params.amount || 10;
        this.variables.score = this.score;
        if (this.onScoreChange) this.onScoreChange(this.score);
        break;

      case 'GROW_TRAIL':
        this.trailLength += node.params.amount || 1;
        break;

      case 'SPAWN_RANDOM':
        this.spawnRandom(node.params.entityId || 'entity_apple');
        break;

      case 'DESTROY_ENTITY': {
        const ent = this.runtimeEntities.find(e => e.id === node.params.entityId);
        if (ent) ent.collected = true;
        break;
      }

      case 'SET_VARIABLE':
        this.variables[node.params.name] = node.params.value;
        break;

      case 'IF_CONDITION': {
        const val = this.variables[node.params.variable];
        let conditionMet = false;
        if (node.params.operator === '==' && val == node.params.value) conditionMet = true;
        if (node.params.operator === '>' && val > node.params.value) conditionMet = true;

        if (conditionMet && node.children) {
          for (const c of node.children) this.executeAction(c);
        }
        break;
      }

      case 'WIN_GAME':
        this.triggerWinGame(node.params.message || 'Level Berhasil Diselesaikan!');
        break;

      case 'GAME_OVER':
        this.triggerGameOver(node.params.message || 'Game Over');
        break;

      case 'PLAY_SOUND':
        if (node.params.sound === 'key') this.playBeep(700, 0.1);
        else if (node.params.sound === 'coin') this.playBeep(880, 0.12);
        else this.playBeep(600, 0.08);
        break;
    }
  }

  private playBeep(freq: number, duration: number) {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio gesture protected
    }
  }

  private playFanfare() {
    this.playBeep(523, 0.1);
    setTimeout(() => this.playBeep(659, 0.1), 100);
    setTimeout(() => this.playBeep(784, 0.25), 200);
  }

  public destroy() {
    this.stop();
  }
}
