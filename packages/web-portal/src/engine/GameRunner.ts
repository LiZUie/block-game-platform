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
  private timerId: any = null;

  // Runtime State
  private score = 0;
  private direction: Direction = 'RIGHT';
  private nextDirection: Direction = 'RIGHT';
  private playerHead: Point = { x: 100, y: 100 };
  private playerTrail: Point[] = [];
  private trailLength = 3;
  private foodPos: Point = { x: 240, y: 160 };

  // Callbacks
  public onScoreChange?: (score: number) => void;
  public onGameOver?: (score: number) => void;

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
    this.score = 0;
    this.direction = 'RIGHT';
    this.nextDirection = 'RIGHT';

    // Find initial player position from manifest entities
    const playerEntity = this.manifest.entities.find(e => e.type === 'player');
    const foodEntity = this.manifest.entities.find(e => e.type === 'food');

    const gridSize = this.manifest.canvas.gridSize || 20;

    if (playerEntity) {
      this.playerHead = { ...playerEntity.initialPosition };
    } else {
      this.playerHead = { x: gridSize * 5, y: gridSize * 5 };
    }

    if (foodEntity) {
      this.foodPos = { ...foodEntity.initialPosition };
    } else {
      this.spawnRandomFood();
    }

    // Init initial trail
    this.trailLength = 3;
    this.playerTrail = [
      { x: this.playerHead.x - gridSize, y: this.playerHead.y },
      { x: this.playerHead.x - (gridSize * 2), y: this.playerHead.y }
    ];

    if (this.onScoreChange) this.onScoreChange(this.score);

    // Run WHEN_GAME_START blocks
    this.evaluateEvent('WHEN_GAME_START');

    // Start Game Loop
    const tickRate = this.manifest.canvas.tickRateMs || 140;
    this.timerId = setInterval(() => this.tick(), tickRate);

    this.render();
  }

  public stop() {
    this.isRunning = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  public setDirection(dir: Direction) {
    if (this.isGameOver) return;
    // Prevent 180-degree immediate reverse
    if (this.direction === 'UP' && dir === 'DOWN') return;
    if (this.direction === 'DOWN' && dir === 'UP') return;
    if (this.direction === 'LEFT' && dir === 'RIGHT') return;
    if (this.direction === 'RIGHT' && dir === 'LEFT') return;

    this.nextDirection = dir;
  }

  private bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (!this.isRunning || this.isGameOver) return;

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
    if (!this.isRunning || this.isGameOver) return;

    this.direction = this.nextDirection;
    const gridSize = this.manifest.canvas.gridSize || 20;

    // Record previous head position into trail
    this.playerTrail.unshift({ x: this.playerHead.x, y: this.playerHead.y });
    while (this.playerTrail.length > this.trailLength) {
      this.playerTrail.pop();
    }

    // Move Head
    if (this.direction === 'UP') this.playerHead.y -= gridSize;
    else if (this.direction === 'DOWN') this.playerHead.y += gridSize;
    else if (this.direction === 'LEFT') this.playerHead.x -= gridSize;
    else if (this.direction === 'RIGHT') this.playerHead.x += gridSize;

    // Check Wall Collisions
    if (
      this.playerHead.x < 0 ||
      this.playerHead.y < 0 ||
      this.playerHead.x >= this.canvas.width ||
      this.playerHead.y >= this.canvas.height
    ) {
      this.triggerGameOver('Menabrak dinding!');
      return;
    }

    // Check Self Collision
    for (const segment of this.playerTrail) {
      if (segment.x === this.playerHead.x && segment.y === this.playerHead.y) {
        this.triggerGameOver('Menabrak tubuh sendiri!');
        return;
      }
    }

    // Check Food Collision
    const dist = Math.hypot(this.playerHead.x - this.foodPos.x, this.playerHead.y - this.foodPos.y);
    if (dist < gridSize * 0.8) {
      this.score += 10;
      this.trailLength += 1;
      this.playBeep(600, 0.08); // Retro Eat Sound
      this.spawnRandomFood();

      if (this.onScoreChange) this.onScoreChange(this.score);

      // Trigger ON_COLLISION blocks from AST
      this.evaluateEvent('ON_COLLISION');
    }

    this.render();
  }

  private spawnRandomFood() {
    const gridSize = this.manifest.canvas.gridSize || 20;
    const maxCols = Math.floor(this.canvas.width / gridSize);
    const maxRows = Math.floor(this.canvas.height / gridSize);

    let newX = 0;
    let newY = 0;
    let collides = true;

    while (collides) {
      newX = Math.floor(Math.random() * maxCols) * gridSize;
      newY = Math.floor(Math.random() * maxRows) * gridSize;
      collides = (newX === this.playerHead.x && newY === this.playerHead.y) ||
        this.playerTrail.some(s => s.x === newX && s.y === newY);
    }

    this.foodPos = { x: newX, y: newY };
  }

  private triggerGameOver(reason: string) {
    this.isGameOver = true;
    this.stop();
    this.playBeep(220, 0.3); // Low buzz sound

    // Final render with game over tint
    this.render();

    if (this.onGameOver) {
      this.onGameOver(this.score);
    }
  }

  private render() {
    const { width, height, backgroundColor, gridSize } = this.manifest.canvas;
    const playerEntity = this.manifest.entities.find(e => e.type === 'player');
    const foodEntity = this.manifest.entities.find(e => e.type === 'food');

    // 1. Clear & Background
    this.ctx.fillStyle = backgroundColor || '#111827';
    this.ctx.fillRect(0, 0, width, height);

    // 2. Draw Subtle Grid Lines
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
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

    // 3. Draw Food (Apel)
    const foodColor = foodEntity?.color || '#EF4444';
    this.ctx.fillStyle = foodColor;
    this.ctx.beginPath();
    this.ctx.arc(
      this.foodPos.x + gridSize / 2,
      this.foodPos.y + gridSize / 2,
      gridSize / 2 - 2,
      0,
      Math.PI * 2
    );
    this.ctx.fill();

    // 4. Draw Snake Trail / Body
    const playerColor = playerEntity?.color || '#10B981';
    this.ctx.fillStyle = playerColor;
    for (let i = 0; i < this.playerTrail.length; i++) {
      const seg = this.playerTrail[i];
      const opacity = Math.max(0.4, 1 - (i / this.playerTrail.length) * 0.5);
      this.ctx.globalAlpha = opacity;
      this.ctx.fillRect(seg.x + 1, seg.y + 1, gridSize - 2, gridSize - 2);
    }
    this.ctx.globalAlpha = 1.0;

    // 5. Draw Snake Head
    this.ctx.fillStyle = '#34D399'; // slightly brighter green for head
    this.ctx.fillRect(this.playerHead.x + 1, this.playerHead.y + 1, gridSize - 2, gridSize - 2);

    // Draw little retro eye dots on head based on direction
    this.ctx.fillStyle = '#064E3B';
    const eyeSize = 3;
    if (this.direction === 'RIGHT') {
      this.ctx.fillRect(this.playerHead.x + gridSize - 6, this.playerHead.y + 4, eyeSize, eyeSize);
      this.ctx.fillRect(this.playerHead.x + gridSize - 6, this.playerHead.y + gridSize - 7, eyeSize, eyeSize);
    } else if (this.direction === 'LEFT') {
      this.ctx.fillRect(this.playerHead.x + 3, this.playerHead.y + 4, eyeSize, eyeSize);
      this.ctx.fillRect(this.playerHead.x + 3, this.playerHead.y + gridSize - 7, eyeSize, eyeSize);
    } else if (this.direction === 'UP') {
      this.ctx.fillRect(this.playerHead.x + 4, this.playerHead.y + 3, eyeSize, eyeSize);
      this.ctx.fillRect(this.playerHead.x + gridSize - 7, this.playerHead.y + 3, eyeSize, eyeSize);
    } else {
      this.ctx.fillRect(this.playerHead.x + 4, this.playerHead.y + gridSize - 6, eyeSize, eyeSize);
      this.ctx.fillRect(this.playerHead.x + gridSize - 7, this.playerHead.y + gridSize - 6, eyeSize, eyeSize);
    }

    // 6. Draw Game Over Overlay if ended
    if (this.isGameOver) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      this.ctx.fillRect(0, 0, width, height);

      this.ctx.fillStyle = '#EF4444';
      this.ctx.font = 'bold 28px "JetBrains Mono", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('GAME OVER', width / 2, height / 2 - 15);

      this.ctx.fillStyle = '#F3F4F6';
      this.ctx.font = '16px "Plus Jakarta Sans", sans-serif';
      this.ctx.fillText(`Skor Akhir: ${this.score}`, width / 2, height / 2 + 20);
    }
  }

  private evaluateEvent(eventType: string) {
    if (!this.manifest.logic || !this.manifest.logic.blocks) return;
    const blocks = this.manifest.logic.blocks.filter(b => b.type === eventType);
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
        if (this.onScoreChange) this.onScoreChange(this.score);
        break;
      case 'GROW_TRAIL':
        this.trailLength += node.params.amount || 1;
        break;
      case 'SPAWN_RANDOM':
        this.spawnRandomFood();
        break;
      case 'GAME_OVER':
        this.triggerGameOver('Blok Game Over terpicu');
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
      // Audio might be blocked until user gesture, ignore safely
    }
  }

  public destroy() {
    this.stop();
  }
}
