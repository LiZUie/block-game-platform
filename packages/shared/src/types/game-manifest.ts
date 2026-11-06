import { GameLogicAST } from './block-ast.js';

export type EntityShape = 'square' | 'circle' | 'trail' | 'diamond' | 'door' | 'star' | 'wall';

export type EntityType = 'player' | 'food' | 'obstacle' | 'key' | 'door' | 'treasure' | 'hazard' | 'text';

export type GameMode = 'snake' | 'adventure' | 'puzzle' | 'arcade';

export interface EntityConfig {
  id: string;
  name: string;
  type: EntityType;
  shape: EntityShape;
  color: string;
  size: { width: number; height: number };
  initialPosition: { x: number; y: number };
  isSolid?: boolean; // Tembok/rintangan tidak bisa ditembus
  collected?: boolean; // Item hilang setelah diambil
}

export interface CanvasConfig {
  width: number;
  height: number;
  gridSize: number;
  backgroundColor: string;
  tickRateMs: number;
  gameMode?: GameMode; // 'snake' | 'adventure' | 'puzzle'
}

export interface GameManifest {
  id: string;
  title: string;
  description: string;
  authorId: string;
  authorName?: string;
  version: string;
  category: 'arcade' | 'puzzle' | 'action' | 'classic' | 'adventure';
  canvas: CanvasConfig;
  entities: EntityConfig[];
  logic: GameLogicAST;
  blocklyXml?: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GameSummary {
  id: string;
  title: string;
  description: string;
  authorId: string;
  authorName: string;
  category: string;
  playCount: number;
  highScore: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ScoreSubmission {
  gameId: string;
  score: number;
}

export interface LeaderboardEntry {
  id: string;
  gameId: string;
  userId: string;
  username: string;
  score: number;
  createdAt: string;
}
