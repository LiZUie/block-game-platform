export type BlockNodeType =
  // Events
  | 'WHEN_GAME_START'
  | 'WHEN_KEY_PRESSED'
  | 'ON_GAME_TICK'
  | 'ON_COLLISION'
  // Actions
  | 'MOVE_ENTITY'
  | 'SET_DIRECTION'
  | 'SPAWN_RANDOM'
  | 'GROW_TRAIL'
  | 'ADD_SCORE'
  | 'GAME_OVER'
  | 'PLAY_SOUND'
  // Control
  | 'IF_CONDITION'
  | 'SET_VARIABLE';

export interface BlockNode {
  type: BlockNodeType;
  params: Record<string, any>;
  children?: BlockNode[];
}

export interface GameLogicAST {
  version: '1.0';
  blocks: BlockNode[];
}
