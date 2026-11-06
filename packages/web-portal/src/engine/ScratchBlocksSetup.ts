// packages/web-portal/src/engine/ScratchBlocksSetup.ts
import * as Blockly from 'blockly';
import { CompiledOp, CompiledScript } from './BlockVerseEngine';

// Konteks dinamis yang selalu disinkronkan dengan state Project aktif
interface StudioDynamicContext {
  spriteNames: string[];
  variableNames: string[];
  broadcastMessages: string[];
}

const dynamicContext: StudioDynamicContext = {
  spriteNames: ['Hero'],
  variableNames: ['score'],
  broadcastMessages: ['message1', 'game over'],
};

export function updateStudioDynamicContext(ctx: Partial<StudioDynamicContext>) {
  if (ctx.spriteNames && ctx.spriteNames.length > 0) dynamicContext.spriteNames = ctx.spriteNames;
  if (ctx.variableNames && ctx.variableNames.length > 0) dynamicContext.variableNames = ctx.variableNames;
  if (ctx.broadcastMessages && ctx.broadcastMessages.length > 0) dynamicContext.broadcastMessages = ctx.broadcastMessages;
}

const getSpriteDropdownOptions = (): [string, string][] => {
  const sprites = dynamicContext.spriteNames.map((name) => [name, name] as [string, string]);
  return [...sprites, ['edge', '_edge_'], ['mouse-pointer', '_mouse_']];
};

const getCloneDropdownOptions = (): [string, string][] => {
  const sprites = dynamicContext.spriteNames.map((name) => [name, name] as [string, string]);
  return [['myself', 'myself'], ...sprites];
};

const getVariableDropdownOptions = (): [string, string][] => {
  return dynamicContext.variableNames.map((v) => [v, v] as [string, string]);
};

const getBroadcastDropdownOptions = (): [string, string][] => {
  return dynamicContext.broadcastMessages.map((m) => [m, m] as [string, string]);
};

let blocksRegistered = false;

export function registerScratchBlocks() {
  if (blocksRegistered) return;
  blocksRegistered = true;

  // Blok dengan Dropdown Dinamis
  Blockly.Blocks['sensing_touchingobject'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('touching')
        .appendField(new Blockly.FieldDropdown(getSpriteDropdownOptions), 'TOUCHINGOBJECTMENU')
        .appendField('?');
      this.setOutput(true, 'Boolean');
      this.setColour('#5CB1D6');
    },
  };

  Blockly.Blocks['control_create_clone_of'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('create clone of')
        .appendField(new Blockly.FieldDropdown(getCloneDropdownOptions), 'CLONE_OPTION');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour('#FFAB19');
    },
  };

  Blockly.Blocks['data_variable'] = {
    init: function () {
      this.appendDummyInput().appendField(new Blockly.FieldDropdown(getVariableDropdownOptions), 'VARIABLE');
      this.setOutput(true, null);
      this.setColour('#FF8C1A');
    },
  };

  Blockly.Blocks['data_setvariableto'] = {
    init: function () {
      this.appendValueInput('VALUE')
        .appendField('set')
        .appendField(new Blockly.FieldDropdown(getVariableDropdownOptions), 'VARIABLE')
        .appendField('to');
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour('#FF8C1A');
    },
  };

  Blockly.Blocks['data_changevariableby'] = {
    init: function () {
      this.appendValueInput('VALUE')
        .setCheck('Number')
        .appendField('change')
        .appendField(new Blockly.FieldDropdown(getVariableDropdownOptions), 'VARIABLE')
        .appendField('by');
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour('#FF8C1A');
    },
  };

  Blockly.Blocks['event_whenireceive'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('when I receive')
        .appendField(new Blockly.FieldDropdown(getBroadcastDropdownOptions), 'MESSAGE');
      this.setNextStatement(true, null);
      this.setColour('#FFBF00');
    },
  };

  Blockly.Blocks['event_broadcast'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('broadcast')
        .appendField(new Blockly.FieldDropdown(getBroadcastDropdownOptions), 'MESSAGE');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour('#FFBF00');
    },
  };

  // Blok Standar Lainnya (Motion, Looks, Events, Control, Sensing, Operators)
  Blockly.defineBlocksWithJsonArray([
    // EVENTS
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
            ['up arrow', 'arrowup'],
            ['down arrow', 'arrowdown'],
            ['left arrow', 'arrowleft'],
            ['right arrow', 'arrowright'],
            ['w', 'w'],
            ['a', 'a'],
            ['s', 's'],
            ['d', 'd'],
            ['any', 'any'],
          ],
        },
      ],
      nextStatement: null,
      colour: '#FFBF00',
      hat: 'cap',
    },

    // MOTION
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
      type: 'motion_turnleft',
      message0: 'turn ↺ %1 degrees',
      args0: [{ type: 'input_value', name: 'DEGREES', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      colour: '#4C97FF',
    },
    {
      type: 'motion_pointindirection',
      message0: 'point in direction %1',
      args0: [{ type: 'input_value', name: 'DIRECTION', check: 'Number' }],
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
      type: 'motion_gotorandom',
      message0: 'go to random position',
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

    // LOOKS
    {
      type: 'looks_sayforsecs',
      message0: 'say %1 for %2 seconds',
      args0: [
        { type: 'input_value', name: 'MESSAGE' },
        { type: 'input_value', name: 'SECS', check: 'Number' },
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      colour: '#9966FF',
    },
    {
      type: 'looks_setsizeto',
      message0: 'set size to %1 %%',
      args0: [{ type: 'input_value', name: 'SIZE', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      colour: '#9966FF',
    },
    {
      type: 'looks_changesizeby',
      message0: 'change size by %1',
      args0: [{ type: 'input_value', name: 'CHANGE', check: 'Number' }],
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

    // CONTROL
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
      type: 'control_if_else',
      message0: 'if %1 then %2 %3 else %4 %5',
      args0: [
        { type: 'input_value', name: 'CONDITION', check: 'Boolean' },
        { type: 'input_dummy' },
        { type: 'input_statement', name: 'SUBSTACK' },
        { type: 'input_dummy' },
        { type: 'input_statement', name: 'SUBSTACK2' },
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
      type: 'control_delete_this_clone',
      message0: 'delete this clone',
      previousStatement: null,
      colour: '#FFAB19',
    },
    {
      type: 'control_stop_all',
      message0: 'stop all',
      previousStatement: null,
      colour: '#FFAB19',
    },

    // SENSING
    {
      type: 'sensing_keypressed',
      message0: 'key %1 pressed?',
      args0: [
        {
          type: 'field_dropdown',
          name: 'KEY_OPTION',
          options: [
            ['space', 'space'],
            ['up arrow', 'arrowup'],
            ['down arrow', 'arrowdown'],
            ['left arrow', 'arrowleft'],
            ['right arrow', 'arrowright'],
            ['w', 'w'],
            ['a', 'a'],
            ['s', 's'],
            ['d', 'd'],
          ],
        },
      ],
      output: 'Boolean',
      colour: '#5CB1D6',
    },
    {
      type: 'sensing_mousex',
      message0: 'mouse x',
      output: 'Number',
      colour: '#5CB1D6',
    },
    {
      type: 'sensing_mousey',
      message0: 'mouse y',
      output: 'Number',
      colour: '#5CB1D6',
    },

    // OPERATORS (Lengkap Matematika + Logika)
    {
      type: 'operator_add',
      message0: '%1 + %2',
      args0: [
        { type: 'input_value', name: 'NUM1', check: 'Number' },
        { type: 'input_value', name: 'NUM2', check: 'Number' },
      ],
      inputsInline: true,
      output: 'Number',
      colour: '#59C059',
    },
    {
      type: 'operator_subtract',
      message0: '%1 - %2',
      args0: [
        { type: 'input_value', name: 'NUM1', check: 'Number' },
        { type: 'input_value', name: 'NUM2', check: 'Number' },
      ],
      inputsInline: true,
      output: 'Number',
      colour: '#59C059',
    },
    {
      type: 'operator_multiply',
      message0: '%1 * %2',
      args0: [
        { type: 'input_value', name: 'NUM1', check: 'Number' },
        { type: 'input_value', name: 'NUM2', check: 'Number' },
      ],
      inputsInline: true,
      output: 'Number',
      colour: '#59C059',
    },
    {
      type: 'operator_divide',
      message0: '%1 / %2',
      args0: [
        { type: 'input_value', name: 'NUM1', check: 'Number' },
        { type: 'input_value', name: 'NUM2', check: 'Number' },
      ],
      inputsInline: true,
      output: 'Number',
      colour: '#59C059',
    },
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
      type: 'operator_gt',
      message0: '%1 > %2',
      args0: [
        { type: 'input_value', name: 'OPERAND1' },
        { type: 'input_value', name: 'OPERAND2' },
      ],
      inputsInline: true,
      output: 'Boolean',
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
    {
      type: 'operator_and',
      message0: '%1 and %2',
      args0: [
        { type: 'input_value', name: 'OPERAND1', check: 'Boolean' },
        { type: 'input_value', name: 'OPERAND2', check: 'Boolean' },
      ],
      inputsInline: true,
      output: 'Boolean',
      colour: '#59C059',
    },
    {
      type: 'operator_or',
      message0: '%1 or %2',
      args0: [
        { type: 'input_value', name: 'OPERAND1', check: 'Boolean' },
        { type: 'input_value', name: 'OPERAND2', check: 'Boolean' },
      ],
      inputsInline: true,
      output: 'Boolean',
      colour: '#59C059',
    },
    {
      type: 'operator_not',
      message0: 'not %1',
      args0: [{ type: 'input_value', name: 'OPERAND', check: 'Boolean' }],
      inputsInline: true,
      output: 'Boolean',
      colour: '#59C059',
    },

    // CLOUD LEADERBOARD
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

export const CATEGORY_BLOCKS: Record<string, any[]> = {
  Motion: [
    { kind: 'block', type: 'motion_movesteps', inputs: { STEPS: { shadow: { type: 'math_number', fields: { NUM: 10 } } } } },
    { kind: 'block', type: 'motion_turnright', inputs: { DEGREES: { shadow: { type: 'math_number', fields: { NUM: 15 } } } } },
    { kind: 'block', type: 'motion_turnleft', inputs: { DEGREES: { shadow: { type: 'math_number', fields: { NUM: 15 } } } } },
    { kind: 'block', type: 'motion_pointindirection', inputs: { DIRECTION: { shadow: { type: 'math_number', fields: { NUM: 90 } } } } },
    { kind: 'block', type: 'motion_gotorandom' },
    {
      kind: 'block',
      type: 'motion_gotoxy',
      inputs: {
        X: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
        Y: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
      },
    },
    { kind: 'block', type: 'motion_changexby', inputs: { DX: { shadow: { type: 'math_number', fields: { NUM: 10 } } } } },
    { kind: 'block', type: 'motion_setx', inputs: { X: { shadow: { type: 'math_number', fields: { NUM: 0 } } } } },
    { kind: 'block', type: 'motion_changeyby', inputs: { DY: { shadow: { type: 'math_number', fields: { NUM: 10 } } } } },
    { kind: 'block', type: 'motion_sety', inputs: { Y: { shadow: { type: 'math_number', fields: { NUM: 0 } } } } },
    { kind: 'block', type: 'motion_ifonedgebounce' },
    { kind: 'block', type: 'motion_xposition' },
    { kind: 'block', type: 'motion_yposition' },
  ],
  Looks: [
    {
      kind: 'block',
      type: 'looks_sayforsecs',
      inputs: {
        MESSAGE: { shadow: { type: 'text', fields: { TEXT: 'Hello!' } } },
        SECS: { shadow: { type: 'math_number', fields: { NUM: 2 } } },
      },
    },
    { kind: 'block', type: 'looks_setsizeto', inputs: { SIZE: { shadow: { type: 'math_number', fields: { NUM: 100 } } } } },
    { kind: 'block', type: 'looks_changesizeby', inputs: { CHANGE: { shadow: { type: 'math_number', fields: { NUM: 10 } } } } },
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
    { kind: 'block', type: 'control_repeat', inputs: { TIMES: { shadow: { type: 'math_number', fields: { NUM: 10 } } } } },
    { kind: 'block', type: 'control_forever' },
    { kind: 'block', type: 'control_if' },
    { kind: 'block', type: 'control_if_else' },
    { kind: 'block', type: 'control_start_as_clone' },
    { kind: 'block', type: 'control_create_clone_of' },
    { kind: 'block', type: 'control_delete_this_clone' },
    { kind: 'block', type: 'control_stop_all' },
  ],
  Sensing: [
    { kind: 'block', type: 'sensing_touchingobject' },
    { kind: 'block', type: 'sensing_keypressed' },
    { kind: 'block', type: 'sensing_mousex' },
    { kind: 'block', type: 'sensing_mousey' },
  ],
  Operators: [
    {
      kind: 'block',
      type: 'operator_add',
      inputs: {
        NUM1: { shadow: { type: 'math_number', fields: { NUM: 1 } } },
        NUM2: { shadow: { type: 'math_number', fields: { NUM: 1 } } },
      },
    },
    {
      kind: 'block',
      type: 'operator_subtract',
      inputs: {
        NUM1: { shadow: { type: 'math_number', fields: { NUM: 10 } } },
        NUM2: { shadow: { type: 'math_number', fields: { NUM: 5 } } },
      },
    },
    {
      kind: 'block',
      type: 'operator_multiply',
      inputs: {
        NUM1: { shadow: { type: 'math_number', fields: { NUM: 2 } } },
        NUM2: { shadow: { type: 'math_number', fields: { NUM: 3 } } },
      },
    },
    {
      kind: 'block',
      type: 'operator_divide',
      inputs: {
        NUM1: { shadow: { type: 'math_number', fields: { NUM: 10 } } },
        NUM2: { shadow: { type: 'math_number', fields: { NUM: 2 } } },
      },
    },
    {
      kind: 'block',
      type: 'operator_random',
      inputs: {
        FROM: { shadow: { type: 'math_number', fields: { NUM: 1 } } },
        TO: { shadow: { type: 'math_number', fields: { NUM: 10 } } },
      },
    },
    {
      kind: 'block',
      type: 'operator_gt',
      inputs: {
        OPERAND1: { shadow: { type: 'math_number', fields: { NUM: 50 } } },
        OPERAND2: { shadow: { type: 'math_number', fields: { NUM: 10 } } },
      },
    },
    {
      kind: 'block',
      type: 'operator_lt',
      inputs: {
        OPERAND1: { shadow: { type: 'math_number', fields: { NUM: 10 } } },
        OPERAND2: { shadow: { type: 'math_number', fields: { NUM: 50 } } },
      },
    },
    {
      kind: 'block',
      type: 'operator_equals',
      inputs: {
        OPERAND1: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
        OPERAND2: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
      },
    },
    { kind: 'block', type: 'operator_and' },
    { kind: 'block', type: 'operator_or' },
    { kind: 'block', type: 'operator_not' },
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
      inputs: { SCORE: { block: { type: 'data_variable' } } },
    },
  ],
};

// Compiler dari Blockly ke AST Runtime
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
    case 'sensing_mousex':
      return { type: 'MOUSE_X' };
    case 'sensing_mousey':
      return { type: 'MOUSE_Y' };
    case 'operator_add':
      return { type: 'MATH', op: 'ADD', a: compileInputValue(block.getInputTargetBlock('NUM1')), b: compileInputValue(block.getInputTargetBlock('NUM2')) };
    case 'operator_subtract':
      return { type: 'MATH', op: 'SUB', a: compileInputValue(block.getInputTargetBlock('NUM1')), b: compileInputValue(block.getInputTargetBlock('NUM2')) };
    case 'operator_multiply':
      return { type: 'MATH', op: 'MUL', a: compileInputValue(block.getInputTargetBlock('NUM1')), b: compileInputValue(block.getInputTargetBlock('NUM2')) };
    case 'operator_divide':
      return { type: 'MATH', op: 'DIV', a: compileInputValue(block.getInputTargetBlock('NUM1')), b: compileInputValue(block.getInputTargetBlock('NUM2')) };
    case 'operator_random':
      return { type: 'RANDOM', min: compileInputValue(block.getInputTargetBlock('FROM')), max: compileInputValue(block.getInputTargetBlock('TO')) };
    case 'operator_gt':
      return { type: 'COMPARE', op: 'GT', a: compileInputValue(block.getInputTargetBlock('OPERAND1')), b: compileInputValue(block.getInputTargetBlock('OPERAND2')) };
    case 'operator_lt':
      return { type: 'COMPARE', op: 'LT', a: compileInputValue(block.getInputTargetBlock('OPERAND1')), b: compileInputValue(block.getInputTargetBlock('OPERAND2')) };
    case 'operator_equals':
      return { type: 'COMPARE', op: 'EQ', a: compileInputValue(block.getInputTargetBlock('OPERAND1')), b: compileInputValue(block.getInputTargetBlock('OPERAND2')) };
    case 'operator_and':
      return { type: 'LOGIC', op: 'AND', a: compileInputValue(block.getInputTargetBlock('OPERAND1')), b: compileInputValue(block.getInputTargetBlock('OPERAND2')) };
    case 'operator_or':
      return { type: 'LOGIC', op: 'OR', a: compileInputValue(block.getInputTargetBlock('OPERAND1')), b: compileInputValue(block.getInputTargetBlock('OPERAND2')) };
    case 'operator_not':
      return { type: 'LOGIC', op: 'NOT', a: compileInputValue(block.getInputTargetBlock('OPERAND')) };
    case 'sensing_touchingobject':
      return { type: 'TOUCHING', target: block.getFieldValue('TOUCHINGOBJECTMENU') };
    case 'sensing_keypressed':
      return { type: 'KEY_PRESSED', key: block.getFieldValue('KEY_OPTION') };
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
      case 'motion_turnleft':
        ops.push({ op: 'TURN_LEFT', degrees: compileInputValue(current.getInputTargetBlock('DEGREES')) });
        break;
      case 'motion_pointindirection':
        ops.push({ op: 'POINT_DIRECTION', direction: compileInputValue(current.getInputTargetBlock('DIRECTION')) });
        break;
      case 'motion_gotorandom':
        ops.push({ op: 'GOTO_RANDOM' });
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
      case 'looks_sayforsecs':
        ops.push({
          op: 'SAY',
          text: compileInputValue(current.getInputTargetBlock('MESSAGE')),
          seconds: compileInputValue(current.getInputTargetBlock('SECS')),
        });
        break;
      case 'looks_setsizeto':
        ops.push({ op: 'SET_SIZE', size: compileInputValue(current.getInputTargetBlock('SIZE')) });
        break;
      case 'looks_changesizeby':
        ops.push({ op: 'CHANGE_SIZE', delta: compileInputValue(current.getInputTargetBlock('CHANGE')) });
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
      case 'control_if_else':
        ops.push({
          op: 'IF',
          condition: compileInputValue(current.getInputTargetBlock('CONDITION')),
          substack: compileStatementChain(current.getInputTargetBlock('SUBSTACK')),
          elseSubstack: compileStatementChain(current.getInputTargetBlock('SUBSTACK2')),
        });
        break;
      case 'control_create_clone_of':
        ops.push({ op: 'CREATE_CLONE', target: current.getFieldValue('CLONE_OPTION') });
        break;
      case 'control_delete_this_clone':
        ops.push({ op: 'DELETE_CLONE' });
        break;
      case 'control_stop_all':
        ops.push({ op: 'STOP_ALL' });
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
