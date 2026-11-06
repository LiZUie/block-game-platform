// packages/web-portal/src/engine/ScratchBlocksSetup.ts
import * as Blockly from 'blockly';
import { CompiledOp, CompiledScript } from './BlockVerseEngine';

let blocksRegistered = false;

export function registerScratchBlocks() {
  if (blocksRegistered) return;
  blocksRegistered = true;

  Blockly.defineBlocksWithJsonArray([
    // ==================== EVENTS (Kuning #FFBF00) ====================
    {
      type: 'event_whenflagclicked',
      message0: 'when 🚩 clicked',
      nextStatement: null,
      colour: '#FFBF00',
      hat: 'cap',
    },
    {
      type: 'event_whenkeypressed',
      message0: 'when %1 key pressed',
      args0: [
        {
          type: 'field_dropdown',
          name: 'KEY',
          options: [
            ['space', 'space'],
            ['left arrow', 'arrowleft'],
            ['right arrow', 'arrowright'],
            ['up arrow', 'arrowup'],
            ['down arrow', 'arrowdown'],
          ],
        },
      ],
      nextStatement: null,
      colour: '#FFBF00',
      hat: 'cap',
    },
    {
      type: 'event_whenireceive',
      message0: 'when I receive %1',
      args0: [
        {
          type: 'field_dropdown',
          name: 'MESSAGE',
          options: [
            ['alien_hit', 'alien_hit'],
            ['march', 'march'],
            ['game over', 'game over'],
          ],
        },
      ],
      nextStatement: null,
      colour: '#FFBF00',
      hat: 'cap',
    },
    {
      type: 'event_broadcast',
      message0: 'broadcast %1',
      args0: [
        {
          type: 'field_dropdown',
          name: 'MESSAGE',
          options: [
            ['alien_hit', 'alien_hit'],
            ['march', 'march'],
            ['game over', 'game over'],
          ],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: '#FFBF00',
    },

    // ==================== MOTION (Biru #4C97FF) ====================
    {
      type: 'motion_movesteps',
      message0: 'move %1 steps',
      args0: [{ type: 'input_value', name: 'STEPS', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      colour: '#4C97FF',
    },
    {
      type: 'motion_turnright',
      message0: 'turn ↻ %1 degrees',
      args0: [{ type: 'input_value', name: 'DEGREES', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      colour: '#4C97FF',
    },
    {
      type: 'motion_gotoxy',
      message0: 'go to x: %1 y: %2',
      args0: [
        { type: 'input_value', name: 'X', check: 'Number' },
        { type: 'input_value', name: 'Y', check: 'Number' },
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      colour: '#4C97FF',
    },
    {
      type: 'motion_changexby',
      message0: 'change x by %1',
      args0: [{ type: 'input_value', name: 'DX', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      colour: '#4C97FF',
    },
    {
      type: 'motion_setx',
      message0: 'set x to %1',
      args0: [{ type: 'input_value', name: 'X', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      colour: '#4C97FF',
    },
    {
      type: 'motion_changeyby',
      message0: 'change y by %1',
      args0: [{ type: 'input_value', name: 'DY', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      colour: '#4C97FF',
    },
    {
      type: 'motion_sety',
      message0: 'set y to %1',
      args0: [{ type: 'input_value', name: 'Y', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      colour: '#4C97FF',
    },
    {
      type: 'motion_ifonedgebounce',
      message0: 'if on edge, bounce',
      previousStatement: null,
      nextStatement: null,
      colour: '#4C97FF',
    },
    {
      type: 'motion_xposition',
      message0: 'x position',
      output: 'Number',
      colour: '#4C97FF',
    },
    {
      type: 'motion_yposition',
      message0: 'y position',
      output: 'Number',
      colour: '#4C97FF',
    },

    // ==================== LOOKS (Ungu #9966FF) ====================
    {
      type: 'looks_setsizeto',
      message0: 'set size to %1 %%',
      args0: [{ type: 'input_value', name: 'SIZE', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      colour: '#9966FF',
    },
    {
      type: 'looks_show',
      message0: 'show',
      previousStatement: null,
      nextStatement: null,
      colour: '#9966FF',
    },
    {
      type: 'looks_hide',
      message0: 'hide',
      previousStatement: null,
      nextStatement: null,
      colour: '#9966FF',
    },

    // ==================== CONTROL (Oranye #FFAB19) ====================
    {
      type: 'control_wait',
      message0: 'wait %1 seconds',
      args0: [{ type: 'input_value', name: 'DURATION', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      colour: '#FFAB19',
    },
    {
      type: 'control_repeat',
      message0: 'repeat %1 %2 %3',
      args0: [
        { type: 'input_value', name: 'TIMES', check: 'Number' },
        { type: 'input_dummy' },
        { type: 'input_statement', name: 'SUBSTACK' },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: '#FFAB19',
    },
    {
      type: 'control_forever',
      message0: 'forever %1 %2',
      args0: [
        { type: 'input_dummy' },
        { type: 'input_statement', name: 'SUBSTACK' },
      ],
      previousStatement: null,
      colour: '#FFAB19',
    },
    {
      type: 'control_if',
      message0: 'if %1 then %2 %3',
      args0: [
        { type: 'input_value', name: 'CONDITION', check: 'Boolean' },
        { type: 'input_dummy' },
        { type: 'input_statement', name: 'SUBSTACK' },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: '#FFAB19',
    },
    {
      type: 'control_start_as_clone',
      message0: 'when I start as a clone',
      nextStatement: null,
      colour: '#FFAB19',
      hat: 'cap',
    },
    {
      type: 'control_create_clone_of',
      message0: 'create clone of %1',
      args0: [
        {
          type: 'field_dropdown',
          name: 'CLONE_OPTION',
          options: [
            ['alien', 'alien'],
            ['laser', 'laser'],
            ['Alien Laser', 'Alien Laser'],
            ['myself', 'myself'],
          ],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: '#FFAB19',
    },
    {
      type: 'control_delete_this_clone',
      message0: 'delete this clone',
      previousStatement: null,
      colour: '#FFAB19',
    },

    // ==================== SENSING (Biru Muda #5CB1D6) ====================
    {
      type: 'sensing_touchingobject',
      message0: 'touching %1 ?',
      args0: [
        {
          type: 'field_dropdown',
          name: 'TOUCHINGOBJECTMENU',
          options: [
            ['laser', 'laser'],
            ['alien', 'alien'],
            ['Player Ship', 'Player Ship'],
            ['Alien Laser', 'Alien Laser'],
          ],
        },
      ],
      output: 'Boolean',
      colour: '#5CB1D6',
    },
    {
      type: 'sensing_keypressed',
      message0: 'key %1 pressed?',
      args0: [
        {
          type: 'field_dropdown',
          name: 'KEY_OPTION',
          options: [
            ['space', 'space'],
            ['left arrow', 'arrowleft'],
            ['right arrow', 'arrowright'],
          ],
        },
      ],
      output: 'Boolean',
      colour: '#5CB1D6',
    },

    // ==================== OPERATORS (Hijau #59C059) ====================
    {
      type: 'operator_random',
      message0: 'pick random %1 to %2',
      args0: [
        { type: 'input_value', name: 'FROM', check: 'Number' },
        { type: 'input_value', name: 'TO', check: 'Number' },
      ],
      inputsInline: true,
      output: 'Number',
      colour: '#59C059',
    },
    {
      type: 'operator_lt',
      message0: '%1 < %2',
      args0: [
        { type: 'input_value', name: 'OPERAND1' },
        { type: 'input_value', name: 'OPERAND2' },
      ],
      inputsInline: true,
      output: 'Boolean',
      colour: '#59C059',
    },
    {
      type: 'operator_equals',
      message0: '%1 = %2',
      args0: [
        { type: 'input_value', name: 'OPERAND1' },
        { type: 'input_value', name: 'OPERAND2' },
      ],
      inputsInline: true,
      output: 'Boolean',
      colour: '#59C059',
    },

    // ==================== VARIABLES & CLOUD (Oranye Tua #FF8C1A) ====================
    {
      type: 'data_variable',
      message0: '%1',
      args0: [
        {
          type: 'field_dropdown',
          name: 'VARIABLE',
          options: [
            ['score', 'score'],
            ['alien-count', 'alien-count'],
            ['march-steps', 'march-steps'],
            ['isClone', 'isClone'],
          ],
        },
      ],
      output: null,
      colour: '#FF8C1A',
    },
    {
      type: 'data_setvariableto',
      message0: 'set %1 to %2',
      args0: [
        {
          type: 'field_dropdown',
          name: 'VARIABLE',
          options: [
            ['score', 'score'],
            ['alien-count', 'alien-count'],
            ['march-steps', 'march-steps'],
            ['isClone', 'isClone'],
          ],
        },
        { type: 'input_value', name: 'VALUE' },
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      colour: '#FF8C1A',
    },
    {
      type: 'data_changevariableby',
      message0: 'change %1 by %2',
      args0: [
        {
          type: 'field_dropdown',
          name: 'VARIABLE',
          options: [
            ['score', 'score'],
            ['alien-count', 'alien-count'],
            ['march-steps', 'march-steps'],
          ],
        },
        { type: 'input_value', name: 'VALUE', check: 'Number' },
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      colour: '#FF8C1A',
    },
    {
      type: 'cloud_submit_score',
      message0: '🏆 submit score %1 to Cloud Leaderboard',
      args0: [{ type: 'input_value', name: 'SCORE', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      colour: '#FF6680',
    },
  ]);
}

// Konfigurasi Flyout Kategori Blok
export const CATEGORY_BLOCKS: Record<string, any[]> = {
  Motion: [
    { kind: 'block', type: 'motion_movesteps', inputs: { STEPS: { shadow: { type: 'math_number', fields: { NUM: 10 } } } } },
    { kind: 'block', type: 'motion_turnright', inputs: { DEGREES: { shadow: { type: 'math_number', fields: { NUM: 15 } } } } },
    {
      kind: 'block',
      type: 'motion_gotoxy',
      inputs: {
        X: { shadow: { type: 'math_number', fields: { NUM: -150 } } },
        Y: { shadow: { type: 'math_number', fields: { NUM: 140 } } },
      },
    },
    { kind: 'block', type: 'motion_changexby', inputs: { DX: { shadow: { type: 'math_number', fields: { NUM: 50 } } } } },
    { kind: 'block', type: 'motion_setx', inputs: { X: { shadow: { type: 'math_number', fields: { NUM: -150 } } } } },
    { kind: 'block', type: 'motion_changeyby', inputs: { DY: { shadow: { type: 'math_number', fields: { NUM: -30 } } } } },
    { kind: 'block', type: 'motion_sety', inputs: { Y: { shadow: { type: 'math_number', fields: { NUM: 20 } } } } },
    { kind: 'block', type: 'motion_ifonedgebounce' },
    { kind: 'block', type: 'motion_xposition' },
    { kind: 'block', type: 'motion_yposition' },
  ],
  Looks: [
    { kind: 'block', type: 'looks_setsizeto', inputs: { SIZE: { shadow: { type: 'math_number', fields: { NUM: 60 } } } } },
    { kind: 'block', type: 'looks_show' },
    { kind: 'block', type: 'looks_hide' },
  ],
  Events: [
    { kind: 'block', type: 'event_whenflagclicked' },
    { kind: 'block', type: 'event_whenkeypressed' },
    { kind: 'block', type: 'event_whenireceive' },
    { kind: 'block', type: 'event_broadcast' },
  ],
  Control: [
    { kind: 'block', type: 'control_wait', inputs: { DURATION: { shadow: { type: 'math_number', fields: { NUM: 1 } } } } },
    { kind: 'block', type: 'control_repeat', inputs: { TIMES: { shadow: { type: 'math_number', fields: { NUM: 7 } } } } },
    { kind: 'block', type: 'control_forever' },
    { kind: 'block', type: 'control_if' },
    { kind: 'block', type: 'control_start_as_clone' },
    { kind: 'block', type: 'control_create_clone_of' },
    { kind: 'block', type: 'control_delete_this_clone' },
  ],
  Sensing: [
    { kind: 'block', type: 'sensing_touchingobject' },
    { kind: 'block', type: 'sensing_keypressed' },
  ],
  Operators: [
    {
      kind: 'block',
      type: 'operator_random',
      inputs: {
        FROM: { shadow: { type: 'math_number', fields: { NUM: 1 } } },
        TO: { shadow: { type: 'math_number', fields: { NUM: 20 } } },
      },
    },
    {
      kind: 'block',
      type: 'operator_lt',
      inputs: {
        OPERAND1: { block: { type: 'motion_yposition' } },
        OPERAND2: { shadow: { type: 'math_number', fields: { NUM: -130 } } },
      },
    },
    {
      kind: 'block',
      type: 'operator_equals',
      inputs: {
        OPERAND1: { block: { type: 'data_variable', fields: { VARIABLE: 'isClone' } } },
        OPERAND2: { shadow: { type: 'text', fields: { TEXT: 'true' } } },
      },
    },
  ],
  Variables: [
    { kind: 'block', type: 'data_variable' },
    {
      kind: 'block',
      type: 'data_setvariableto',
      inputs: { VALUE: { shadow: { type: 'math_number', fields: { NUM: 0 } } } },
    },
    {
      kind: 'block',
      type: 'data_changevariableby',
      inputs: { VALUE: { shadow: { type: 'math_number', fields: { NUM: 1 } } } },
    },
    {
      kind: 'block',
      type: 'cloud_submit_score',
      inputs: { SCORE: { block: { type: 'data_variable', fields: { VARIABLE: 'score' } } } },
    },
  ],
};

// Compiler dari Workspace Blockly ke AST Runtime
function compileInputValue(block: Blockly.Block | null): any {
  if (!block) return 0;
  switch (block.type) {
    case 'math_number':
      return Number(block.getFieldValue('NUM') || 0);
    case 'text':
      return String(block.getFieldValue('TEXT') || '');
    case 'data_variable':
      return { type: 'VAR', name: block.getFieldValue('VARIABLE') };
    case 'motion_xposition':
      return { type: 'X_POS' };
    case 'motion_yposition':
      return { type: 'Y_POS' };
    case 'operator_random':
      return {
        type: 'RANDOM',
        min: compileInputValue(block.getInputTargetBlock('FROM')),
        max: compileInputValue(block.getInputTargetBlock('TO')),
      };
    case 'operator_lt':
      return {
        type: 'COMPARE',
        op: 'LT',
        a: compileInputValue(block.getInputTargetBlock('OPERAND1')),
        b: compileInputValue(block.getInputTargetBlock('OPERAND2')),
      };
    case 'operator_equals':
      return {
        type: 'COMPARE',
        op: 'EQ',
        a: compileInputValue(block.getInputTargetBlock('OPERAND1')),
        b: compileInputValue(block.getInputTargetBlock('OPERAND2')),
      };
    case 'sensing_touchingobject':
      return {
        type: 'TOUCHING',
        target: block.getFieldValue('TOUCHINGOBJECTMENU'),
      };
    case 'sensing_keypressed':
      return {
        type: 'KEY_PRESSED',
        key: block.getFieldValue('KEY_OPTION'),
      };
    default:
      return 0;
  }
}

function compileStatementChain(startBlock: Blockly.Block | null): CompiledOp[] {
  const ops: CompiledOp[] = [];
  let current = startBlock;

  while (current) {
    switch (current.type) {
      case 'motion_movesteps':
        ops.push({ op: 'MOVE_STEPS', steps: compileInputValue(current.getInputTargetBlock('STEPS')) });
        break;
      case 'motion_turnright':
        ops.push({ op: 'TURN_RIGHT', degrees: compileInputValue(current.getInputTargetBlock('DEGREES')) });
        break;
      case 'motion_gotoxy':
        ops.push({
          op: 'GOTO_XY',
          x: compileInputValue(current.getInputTargetBlock('X')),
          y: compileInputValue(current.getInputTargetBlock('Y')),
        });
        break;
      case 'motion_changexby':
        ops.push({ op: 'CHANGE_X', dx: compileInputValue(current.getInputTargetBlock('DX')) });
        break;
      case 'motion_setx':
        ops.push({ op: 'SET_X', x: compileInputValue(current.getInputTargetBlock('X')) });
        break;
      case 'motion_changeyby':
        ops.push({ op: 'CHANGE_Y', dy: compileInputValue(current.getInputTargetBlock('DY')) });
        break;
      case 'motion_sety':
        ops.push({ op: 'SET_Y', y: compileInputValue(current.getInputTargetBlock('Y')) });
        break;
      case 'motion_ifonedgebounce':
        ops.push({ op: 'IF_ON_EDGE_BOUNCE' });
        break;
      case 'looks_setsizeto':
        ops.push({ op: 'SET_SIZE', size: compileInputValue(current.getInputTargetBlock('SIZE')) });
        break;
      case 'looks_show':
        ops.push({ op: 'SHOW' });
        break;
      case 'looks_hide':
        ops.push({ op: 'HIDE' });
        break;
      case 'control_wait':
        ops.push({ op: 'WAIT', seconds: compileInputValue(current.getInputTargetBlock('DURATION')) });
        break;
      case 'control_repeat':
        ops.push({
          op: 'REPEAT',
          times: compileInputValue(current.getInputTargetBlock('TIMES')),
          substack: compileStatementChain(current.getInputTargetBlock('SUBSTACK')),
        });
        break;
      case 'control_forever':
        ops.push({
          op: 'FOREVER',
          substack: compileStatementChain(current.getInputTargetBlock('SUBSTACK')),
        });
        break;
      case 'control_if':
        ops.push({
          op: 'IF',
          condition: compileInputValue(current.getInputTargetBlock('CONDITION')),
          substack: compileStatementChain(current.getInputTargetBlock('SUBSTACK')),
        });
        break;
      case 'control_create_clone_of':
        ops.push({ op: 'CREATE_CLONE', target: current.getFieldValue('CLONE_OPTION') });
        break;
      case 'control_delete_this_clone':
        ops.push({ op: 'DELETE_CLONE' });
        break;
      case 'event_broadcast':
        ops.push({ op: 'BROADCAST', message: current.getFieldValue('MESSAGE') });
        break;
      case 'data_setvariableto':
        ops.push({
          op: 'SET_VAR',
          varName: current.getFieldValue('VARIABLE'),
          value: compileInputValue(current.getInputTargetBlock('VALUE')),
        });
        break;
      case 'data_changevariableby':
        ops.push({
          op: 'CHANGE_VAR',
          varName: current.getFieldValue('VARIABLE'),
          delta: compileInputValue(current.getInputTargetBlock('VALUE')),
        });
        break;
      case 'cloud_submit_score':
        ops.push({
          op: 'SUBMIT_SCORE',
          score: compileInputValue(current.getInputTargetBlock('SCORE')),
        });
        break;
    }
    current = current.getNextBlock();
  }
  return ops;
}

export function compileWorkspaceToScripts(workspace: Blockly.WorkspaceSvg): CompiledScript[] {
  const topBlocks = workspace.getTopBlocks(true);
  const compiled: CompiledScript[] = [];

  for (const top of topBlocks) {
    if (top.type === 'event_whenflagclicked') {
      compiled.push({
        trigger: 'WHEN_FLAG_CLICKED',
        ops: compileStatementChain(top.getNextBlock()),
      });
    } else if (top.type === 'event_whenkeypressed') {
      compiled.push({
        trigger: 'WHEN_KEY_PRESSED',
        param: top.getFieldValue('KEY'),
        ops: compileStatementChain(top.getNextBlock()),
      });
    } else if (top.type === 'control_start_as_clone') {
      compiled.push({
        trigger: 'WHEN_CLONE_START',
        ops: compileStatementChain(top.getNextBlock()),
      });
    } else if (top.type === 'event_whenireceive') {
      compiled.push({
        trigger: 'WHEN_RECEIVE',
        param: top.getFieldValue('MESSAGE'),
        ops: compileStatementChain(top.getNextBlock()),
      });
    }
  }
  return compiled;
}
