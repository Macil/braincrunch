/* @flow */

import once from 'lodash/once';
import {parse, loopAssociater} from './parse';
import type {Instruction} from './parse';
import {makeReadFunction, makeWriteFunction, makeMemory} from './args';
import type {ReadParam, WriteParam} from './args';

const ADD = 0, RIGHT = 1,
  OUT = 2, IN = 3,
  OPEN = 4, CLOSE = 5,
  CLEAR = 6, MUL = 7,
  SCAN_LEFT = 8, SCAN_RIGHT = 9,
  MANY = 100;

// eval/Function might be disabled by Content Security Policy
function checkEval() {
  // jshint evil:true
  let didEval = false;
  try {
    didEval = (new Function('return true;'))();
  } catch (e) {
    // ignore, expected if CSP blocks eval
  }
  return didEval;
}

const warnAboutNoEval = once(() => {
  if (typeof console !== 'undefined' && console.warn) { //eslint-disable-line no-console
    console.warn( //eslint-disable-line no-console
      'eval is not available. Braincrunch performance may suffer.\n' +
      'You can use the noEvalWarning option to disable this message.'
    );
  }
});

function scanLeft(memory: $TypedArray, dc: number): number {
  while (memory[dc]) {
    dc--;
  }
  return dc;
}

function scanRight(memory: $TypedArray, dc: number): number {
  while (memory[dc]) {
    dc++;
  }
  return dc;
}

function manyfier(program: Array<Instruction>) {
  const MAX_IN_MANY = 200;

  function* _manyfier(program: Array<Instruction>) {
    let buffer: Array<Instruction> = [];

    function* flush() {
      if (buffer.length > 1) {
        yield {type: MANY, items: buffer};
      } else {
        yield* buffer;
      }
      buffer = [];
    }

    for (let ins of program) {
      switch (buffer.length < MAX_IN_MANY && ins.type) {
      case ADD:
      case RIGHT:
      case OUT:
      case IN:
      case CLEAR:
      case MUL:
      case SCAN_LEFT:
      case SCAN_RIGHT:
        buffer.push(ins);
        break;
      default:
        yield* flush();
        yield ins;
      }
    }
    yield* flush();
  }

  return loopAssociater(_manyfier(program));
}

function compile(program, registers, memory, write, read, EOF, useEval, noEvalWarning) {
  const canEval = useEval && checkEval();
  if (useEval && !canEval && !noEvalWarning) {
    warnAboutNoEval();
  }

  // registers[0]: dc
  // registers[1]: pc
  function INS_CLEAR() {
    memory[registers[0]] = 0;
    return 1;
  }
  function INS_OUT() {
    write(memory[registers[0]]|0);
    return 1;
  }
  function INS_IN() {
    const value = read();
    memory[registers[0]] = value === null ? EOF : ((value:any)|0);
    return 1;
  }
  function INS_SCAN_LEFT() {
    registers[0] = scanLeft(memory, registers[0]);
    return 1;
  }
  function INS_SCAN_RIGHT() {
    registers[0] = scanRight(memory, registers[0]);
    return 1;
  }

  function newFn(src) {
    const fn: Function = new Function(
      'registers', 'memory', 'program', 'write', 'read', 'EOF',
      'scanLeft', 'scanRight', src);
    return () =>
      fn(registers, memory, program, write, read, EOF, scanLeft, scanRight);
  }

  function toSrc(ins) {
    let x = (ins:any).x|0;
    let y = (ins:any).y|0;

    switch (ins.type) {
    case ADD:
      return `memory[registers[0]] += ${x};`;
    case CLEAR:
      return 'memory[registers[0]] = 0;';
    case MUL:
      return `memory[registers[0] + ${x}] += (memory[registers[0]]|0)${y !== 1 ? ' * '+y : ''};`;
    case RIGHT:
      return `registers[0] += ${x};`;
    case OUT:
      return 'write(memory[registers[0]]|0);';
    case IN:
      return 'var value = read();\n' +
          'memory[registers[0]] = value === null ? EOF : (value|0);';
    case SCAN_LEFT:
      return 'registers[0] = scanLeft(memory, registers[0]);';
    case SCAN_RIGHT:
      return 'registers[0] = scanRight(memory, registers[0]);';
    default:
      throw new Error('Not compilable type: '+ins.type);
    }
  }

  function mapper(ins) {
    const x = (ins:any).x|0;
    const y = (ins:any).y|0;
    const pair = (ins:any).pair|0;

    switch (ins.type) {
    case ADD:
      return () => {
        memory[registers[0]] += x;
        return 1;
      };
    case CLEAR:
      return INS_CLEAR;
    case MUL:
      return () => {
        const dc = registers[0];
        memory[dc + x] += (memory[dc]|0) * y;
        return 1;
      };
    case RIGHT:
      return () => {
        registers[0] += x;
        return 1;
      };
    case OUT:
      return INS_OUT;
    case IN:
      return INS_IN;
    case SCAN_LEFT:
      return INS_SCAN_LEFT;
    case SCAN_RIGHT:
      return INS_SCAN_RIGHT;
    case OPEN:
      return () => {
        if (!memory[registers[0]]) {
          registers[1] = pair;
        }
        return 1;
      };
    case CLOSE:
      return () => {
        if (memory[registers[0]]) {
          registers[1] = pair;
        }
        return 1;
      };
    case MANY: {
      if (canEval) {
        return newFn(
          ins.items.map(toSrc)
            .concat([`return ${ins.items.length};`])
            .join('\n')
        );
      }
      const fns = ins.items.map(mapper);
      return () => {
        const len = fns.length;
        for (let i=0; i<len; i++) {
          fns[i]();
        }
        return len;
      };
    }
    default:
      throw new Error('Unknown instruction type: '+ins.type);
    }
  }

  return program.map(mapper);
}

export type Options = {
  cellSize?: ?number;
  cellCount?: ?number;
  read?: ReadParam;
  write?: WriteParam;
  EOF?: ?number;
  useEval?: ?boolean;
  noEvalWarning?: ?boolean;
  code: string;
};

export class Machine {
  _cellSize: number;
  _cellCount: number;
  _read: () => ?number;
  _write: (value: number) => void;
  _memory: $TypedArray;
  _registers: Uint32Array;
  _EOF: number;
  _useEval: boolean;
  _noEvalWarning: boolean;
  _complete: boolean;
  _program: any;

  constructor(options: Options) {
    this._cellSize = options.cellSize || 8;
    this._cellCount = options.cellCount || 4096;
    this._read = makeReadFunction(options.read);
    this._write = makeWriteFunction(options.write);
    this._memory = makeMemory(this._cellSize, this._cellCount);
    this._registers = new Uint32Array(2);
    this._EOF = ('EOF' in options) ? (Number(options.EOF)|0) : -1;
    this._useEval = ('useEval' in options) ? !!options.useEval : true;
    this._noEvalWarning = !!options.noEvalWarning;
    this._complete = false;
    this._program = compile(
      manyfier(parse(options.code)), this._registers, this._memory,
      this._write, this._read, this._EOF, this._useEval, this._noEvalWarning
    );
  }

  complete: boolean;
  /*:: _unused = ` */ get complete() {
    return this._complete;
  }/*:: ` */

  run(steps: number=Infinity) {
    const program = this._program;
    const registers = this._registers;

    const programLen = program.length;
    let step = 0;
    while (step < steps) {
      if (registers[1] >= programLen) {
        this._complete = true;
        break;
      }
      const ins = program[registers[1]];
      step += ins();
      registers[1]++;
    }

    return step;
  }
}
