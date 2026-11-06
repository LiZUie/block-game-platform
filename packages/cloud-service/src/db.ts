import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { UserRole } from '@blockgame/shared';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'cloud_game.db');
export const db = new DatabaseSync(dbPath);

export function initDatabase() {
  // 1. Users Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // 2. Games Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      author_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'classic',
      canvas_json TEXT NOT NULL,
      entities_json TEXT NOT NULL,
      logic_json TEXT NOT NULL,
      blockly_xml TEXT,
      is_published INTEGER NOT NULL DEFAULT 1,
      play_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (author_id) REFERENCES users(id)
    );
  `);

  // 3. Scores / Leaderboards Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS scores (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      score INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (game_id) REFERENCES games(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // 4. Audit Log Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL
    );
  `);

  seedInitialData();
}

function seedInitialData() {
  // Check users count
  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any)?.count || 0;
  
  if (userCount === 0) {
    const salt = bcrypt.genSaltSync(10);
    const now = new Date().toISOString();

    const insertUser = db.prepare(`
      INSERT INTO users (id, username, email, password_hash, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    // 1. Admin (Pemilik Cloud Service)
    insertUser.run(
      'user_admin_01',
      'CloudAdmin',
      'admin@blockgame.cloud',
      bcrypt.hashSync('admin123', salt),
      UserRole.ADMIN,
      now
    );

    // 2. Developer (Pembuat Game)
    insertUser.run(
      'user_dev_01',
      'RetroCoder',
      'dev@blockgame.cloud',
      bcrypt.hashSync('dev123', salt),
      UserRole.DEVELOPER,
      now
    );

    // 3. Player (Pemain)
    insertUser.run(
      'user_player_01',
      'PixelGamer',
      'player@blockgame.cloud',
      bcrypt.hashSync('player123', salt),
      UserRole.PLAYER,
      now
    );

    console.log('[Cloud DB] Initial default users seeded (Admin, Developer, Player).');
  }

  // Seed initial 2D games
  const hasSnake = db.prepare('SELECT id FROM games WHERE id = ?').get('game_snake_classic');
  if (!hasSnake) {
    seedSnakeGame();
  }

  const hasAdventure = db.prepare('SELECT id FROM games WHERE id = ?').get('game_adventure_dungeon');
  if (!hasAdventure) {
    seedAdventureGame();
  }

  const hasPuzzle = db.prepare('SELECT id FROM games WHERE id = ?').get('game_puzzle_maze');
  if (!hasPuzzle) {
    seedPuzzleGame();
  }
}

function seedAdventureGame() {
  const now = new Date().toISOString();
  const canvasConfig = {
    width: 400,
    height: 400,
    gridSize: 20,
    backgroundColor: '#090d16',
    tickRateMs: 0, // Turn-based / step-by-step
    gameMode: 'adventure'
  };

  // Walls layout
  const walls: any[] = [];
  // Barrier 1
  for (let y = 0; y < 280; y += 20) {
    if (y !== 140) walls.push({ id: `wall_1_${y}`, name: 'Tembok', type: 'obstacle', shape: 'wall', color: '#334155', size: { width: 20, height: 20 }, initialPosition: { x: 140, y }, isSolid: true });
  }
  // Barrier 2
  for (let y = 120; y < 400; y += 20) {
    if (y !== 260) walls.push({ id: `wall_2_${y}`, name: 'Tembok', type: 'obstacle', shape: 'wall', color: '#334155', size: { width: 20, height: 20 }, initialPosition: { x: 260, y }, isSolid: true });
  }

  const entities = [
    {
      id: 'entity_hero',
      name: 'Ksatria (Hero)',
      type: 'player',
      shape: 'square',
      color: '#38BDF8', // Cyan
      size: { width: 20, height: 20 },
      initialPosition: { x: 40, y: 40 },
      isSolid: false
    },
    {
      id: 'entity_key',
      name: 'Kunci Gerbang',
      type: 'key',
      shape: 'diamond',
      color: '#FACC15', // Gold
      size: { width: 20, height: 20 },
      initialPosition: { x: 340, y: 40 },
      isSolid: false
    },
    {
      id: 'entity_door',
      name: 'Pintu Portal Keluar',
      type: 'door',
      shape: 'door',
      color: '#A855F7', // Purple Portal
      size: { width: 20, height: 20 },
      initialPosition: { x: 340, y: 340 },
      isSolid: false
    },
    {
      id: 'entity_gem',
      name: 'Batu Permata',
      type: 'treasure',
      shape: 'star',
      color: '#34D399', // Emerald Gem
      size: { width: 20, height: 20 },
      initialPosition: { x: 40, y: 340 },
      isSolid: false
    },
    {
      id: 'entity_trap',
      name: 'Jebakan Duri',
      type: 'hazard',
      shape: 'square',
      color: '#EF4444', // Red Danger
      size: { width: 20, height: 20 },
      initialPosition: { x: 200, y: 140 },
      isSolid: false
    },
    ...walls
  ];

  const logicAST = {
    version: '1.0',
    blocks: [
      {
        type: 'WHEN_GAME_START',
        params: {},
        children: [
          { type: 'SET_VARIABLE', params: { name: 'score', value: 0 } },
          { type: 'SET_VARIABLE', params: { name: 'hasKey', value: 0 } }
        ]
      },
      {
        type: 'ON_COLLISION',
        params: { entityA: 'entity_hero', entityB: 'entity_key' },
        children: [
          { type: 'ADD_SCORE', params: { amount: 50 } },
          { type: 'DESTROY_ENTITY', params: { entityId: 'entity_key' } },
          { type: 'SET_VARIABLE', params: { name: 'hasKey', value: 1 } },
          { type: 'PLAY_SOUND', params: { sound: 'key' } }
        ]
      },
      {
        type: 'ON_COLLISION',
        params: { entityA: 'entity_hero', entityB: 'entity_gem' },
        children: [
          { type: 'ADD_SCORE', params: { amount: 100 } },
          { type: 'DESTROY_ENTITY', params: { entityId: 'entity_gem' } },
          { type: 'PLAY_SOUND', params: { sound: 'coin' } }
        ]
      },
      {
        type: 'ON_COLLISION',
        params: { entityA: 'entity_hero', entityB: 'entity_trap' },
        children: [
          { type: 'GAME_OVER', params: { message: 'Terkena jebakan duri misterius!' } }
        ]
      },
      {
        type: 'ON_COLLISION',
        params: { entityA: 'entity_hero', entityB: 'entity_door' },
        children: [
          {
            type: 'IF_CONDITION',
            params: { variable: 'hasKey', operator: '==', value: 1 },
            children: [
              { type: 'WIN_GAME', params: { message: 'Selamat! Kamu berhasil membuka portal keluar dan memenangkan petualangan!' } }
            ]
          }
        ]
      }
    ]
  };

  const insertGame = db.prepare(`
    INSERT INTO games (
      id, title, description, author_id, author_name, category,
      canvas_json, entities_json, logic_json, blockly_xml,
      is_published, play_count, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 18, ?, ?)
  `);

  insertGame.run(
    'game_adventure_dungeon',
    'Petualangan Kunci Labirin (2D Dungeon Quest)',
    'Jelajahi labirin bawah tanah, kumpulkan batu permata, temukan kunci emas, hindari jebakan duri merah, dan buka portal keluar untuk menang!',
    'user_dev_01',
    'RetroCoder',
    'adventure',
    JSON.stringify(canvasConfig),
    JSON.stringify(entities),
    JSON.stringify(logicAST),
    '',
    1,
    now,
    now
  );
}

function seedPuzzleGame() {
  const now = new Date().toISOString();
  const canvasConfig = {
    width: 400,
    height: 400,
    gridSize: 20,
    backgroundColor: '#1e1b4b', // deep indigo
    tickRateMs: 0,
    gameMode: 'puzzle'
  };

  const entities = [
    {
      id: 'entity_player',
      name: 'Penjelajah Teka-Teki',
      type: 'player',
      shape: 'square',
      color: '#A7F3D0',
      size: { width: 20, height: 20 },
      initialPosition: { x: 40, y: 40 },
      isSolid: false
    },
    {
      id: 'entity_switch',
      name: 'Tombol Saklar Teka-Teki',
      type: 'key',
      shape: 'circle',
      color: '#F43F5E',
      size: { width: 20, height: 20 },
      initialPosition: { x: 200, y: 180 },
      isSolid: false
    },
    {
      id: 'entity_goal',
      name: 'Portal Selesai',
      type: 'door',
      shape: 'door',
      color: '#60A5FA',
      size: { width: 20, height: 20 },
      initialPosition: { x: 360, y: 360 },
      isSolid: false
    }
  ];

  const logicAST = {
    version: '1.0',
    blocks: [
      {
        type: 'ON_COLLISION',
        params: { entityA: 'entity_player', entityB: 'entity_switch' },
        children: [
          { type: 'ADD_SCORE', params: { amount: 50 } },
          { type: 'DESTROY_ENTITY', params: { entityId: 'entity_switch' } },
          { type: 'SET_VARIABLE', params: { name: 'unlocked', value: 1 } },
          { type: 'PLAY_SOUND', params: { sound: 'key' } }
        ]
      },
      {
        type: 'ON_COLLISION',
        params: { entityA: 'entity_player', entityB: 'entity_goal' },
        children: [
          { type: 'WIN_GAME', params: { message: 'Teka-teki labirin terpecahkan sempurna!' } }
        ]
      }
    ]
  };

  const insertGame = db.prepare(`
    INSERT INTO games (
      id, title, description, author_id, author_name, category,
      canvas_json, entities_json, logic_json, blockly_xml,
      is_published, play_count, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 9, ?, ?)
  `);

  insertGame.run(
    'game_puzzle_maze',
    'Teka-Teki Saklar Ruang (2D Maze Puzzle)',
    'Teka-teki labirin: aktifkan tombol saklar merah terlebih dahulu untuk membuka jalan menuju portal keluar.',
    'user_dev_01',
    'RetroCoder',
    'puzzle',
    JSON.stringify(canvasConfig),
    JSON.stringify(entities),
    JSON.stringify(logicAST),
    '',
    1,
    now,
    now
  );
}

function seedSnakeGame() {
  const now = new Date().toISOString();

  // Canvas 20x20 grid with 20px cells = 400x400
  const canvasConfig = {
    width: 400,
    height: 400,
    gridSize: 20,
    backgroundColor: '#111827', // dark slate
    tickRateMs: 140
  };

  // Entities: Player (Ular) and Food (Apel)
  const entities = [
    {
      id: 'entity_snake',
      name: 'Ular (Player)',
      type: 'player',
      shape: 'square',
      color: '#10B981', // emerald green
      size: { width: 20, height: 20 },
      initialPosition: { x: 100, y: 100 },
      isSolid: true
    },
    {
      id: 'entity_apple',
      name: 'Apel (Food)',
      type: 'food',
      shape: 'circle',
      color: '#EF4444', // red
      size: { width: 20, height: 20 },
      initialPosition: { x: 240, y: 160 },
      isSolid: false
    }
  ];

  // Logic in AST format:
  // 1. Tick: Move snake forward, check wall collision, check self collision
  // 2. Keys: Arrow keys change direction
  // 3. Collision: Snake collides with Apple -> Grow tail, increase score, spawn apple random
  const logicAST = {
    version: '1.0',
    blocks: [
      {
        type: 'WHEN_GAME_START',
        params: {},
        children: [
          { type: 'SET_VARIABLE', params: { name: 'score', value: 0 } },
          { type: 'SET_DIRECTION', params: { entityId: 'entity_snake', direction: 'RIGHT' } }
        ]
      },
      {
        type: 'WHEN_KEY_PRESSED',
        params: { key: 'ArrowUp' },
        children: [
          { type: 'SET_DIRECTION', params: { entityId: 'entity_snake', direction: 'UP' } }
        ]
      },
      {
        type: 'WHEN_KEY_PRESSED',
        params: { key: 'ArrowDown' },
        children: [
          { type: 'SET_DIRECTION', params: { entityId: 'entity_snake', direction: 'DOWN' } }
        ]
      },
      {
        type: 'WHEN_KEY_PRESSED',
        params: { key: 'ArrowLeft' },
        children: [
          { type: 'SET_DIRECTION', params: { entityId: 'entity_snake', direction: 'LEFT' } }
        ]
      },
      {
        type: 'WHEN_KEY_PRESSED',
        params: { key: 'ArrowRight' },
        children: [
          { type: 'SET_DIRECTION', params: { entityId: 'entity_snake', direction: 'RIGHT' } }
        ]
      },
      {
        type: 'ON_GAME_TICK',
        params: { intervalMs: 140 },
        children: [
          { type: 'MOVE_ENTITY', params: { entityId: 'entity_snake', mode: 'FORWARD_DIRECTION' } }
        ]
      },
      {
        type: 'ON_COLLISION',
        params: { entityA: 'entity_snake', entityB: 'entity_apple' },
        children: [
          { type: 'ADD_SCORE', params: { amount: 10 } },
          { type: 'GROW_TRAIL', params: { entityId: 'entity_snake', amount: 1 } },
          { type: 'SPAWN_RANDOM', params: { entityId: 'entity_apple' } },
          { type: 'PLAY_SOUND', params: { sound: 'eat' } }
        ]
      }
    ]
  };

  const insertGame = db.prepare(`
    INSERT INTO games (
      id, title, description, author_id, author_name, category,
      canvas_json, entities_json, logic_json, blockly_xml,
      is_published, play_count, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertGame.run(
    'game_snake_classic',
    'Ular Makan Apel (Classic Snake 2D)',
    'Game 2D klasik di mana ular memakan apel merah untuk tumbuh lebih panjang. Kendalikan dengan tombol panah!',
    'user_dev_01',
    'RetroCoder',
    'classic',
    JSON.stringify(canvasConfig),
    JSON.stringify(entities),
    JSON.stringify(logicAST),
    '',
    1,
    42,
    now,
    now
  );

  // Insert sample high scores
  const insertScore = db.prepare(`
    INSERT INTO scores (id, game_id, user_id, username, score, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertScore.run('score_01', 'game_snake_classic', 'user_player_01', 'PixelGamer', 140, now);
  insertScore.run('score_02', 'game_snake_classic', 'user_dev_01', 'RetroCoder', 90, now);

  console.log('[Cloud DB] Initial Snake 2D game seeded successfully!');
}
