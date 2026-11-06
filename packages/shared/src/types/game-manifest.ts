import { GameLogicAST } from './block-ast.js';

export type EntityShape = 'square' | 'circle' | 'trail';

export interface EntityConfig {
  id: string;
  name: string;
  type: 'player' | 'food' | 'obstacle' | 'text';
  shape: EntityShape;
  color: string;
  size: { width: number; height: number };
  initialPosition: { x: number; y: number };
  isSolid?: boolean;
}

export interface CanvasConfig {
  width: number;
  height: number;
  gridSize: number;
  backgroundColor: string;
  tickRateMs: number; // e.g. 150ms for classic snake, or 50ms for fast games
}

export interface GameManifest {
  id: string;
  title: string;
  description: string;
  authorId: string;
  authorName?: string;
  version: string;
  category: 'arcade' | 'puzzle' | 'action' | 'classic';
  canvas: CanvasConfig;
  entities: EntityConfig[];
  logic: GameLogicAST;
  blocklyXml?: string; // Menyimpan susunan visual blok untuk diedit kembali
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
