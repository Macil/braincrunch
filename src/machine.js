import _ from 'lodash';
import {parse, loopAssociater} from './parse';
import {makeReadFunction, makeWriteFunction, makeMemory} from './args';

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
  } catch(e) {}
  return didEval;
}

const warnAboutNoEval = _.once(() => {
  if (typeof console !== 'undefined' && console.warn) {
    console.warn(
      'eval is not available. Braincrunch performance may suffer.\n' +
      'You can use the noEvalWarning option to disable this message.'
    );
  }
});

function scanLeft(memory, dc) {
  while (memory[dc]) {
    dc--;
  }
  return dc;
}

function scanRight(memory, dc) {
  while (memory[dc]) {
    dc++;
  }
  return dc;
}

function manyfier(program) {
  const MAX_IN_MANY = 200;

  function* _manyfier(program) {
    let buffer = [];

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
    memory[registers[0]] = value === null ? EOF : (value|0);
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
    // jshint evil:true
    const fn = new Function(
      'registers', 'memory', 'program', 'write', 'read', 'EOF',
      'scanLeft', 'scanRight', src);
    return () =>
      fn(registers, memory, program, write, read, EOF, scanLeft, scanRight);
  }

  function toSrc(ins) {
    let x = ins.x|0;
    let y = ins.y|0;

    switch (ins.type) {
      case ADD:
        return `memory[registers[0]] += ${x};`;
      case CLEAR:
        return `memory[registers[0]] = 0;`;
      case MUL:
        return `memory[registers[0] + ${x}] += (memory[registers[0]]|0)${y !== 1 ? ' * '+y : ''};`;
      case RIGHT:
        return `registers[0] += ${x};`;
      case OUT:
        return `write(memory[registers[0]]|0);`;
      case IN:
        return `var value = read();\n` +
          `memory[registers[0]] = value === null ? EOF : (value|0);`;
      case SCAN_LEFT:
        return `registers[0] = scanLeft(memory, registers[0]);`;
      case SCAN_RIGHT:
        return `registers[0] = scanRight(memory, registers[0]);`;
      default:
        throw new Error("Not compilable type: "+ins.type);
    }
  }

  function mapper(ins) {
    const x = ins.x|0;
    const y = ins.y|0;
    const pair = ins.pair|0;

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
      case MANY:
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
      default:
        throw new Error("Unknown instruction type: "+ins.type);
    }
  }

  return program.map(mapper);
}

export class Machine {
  constructor(options) {
    this._cellSize = options.cellSize || 8;
    this._cellCount = options.cellCount || 4096;
    this._read = makeReadFunction(options.read);
    this._write = makeWriteFunction(options.write);
    this._memory = makeMemory(this._cellSize, this._cellCount);
    this._registers = new Uint32Array(2);
    this._EOF = _.has(options, 'EOF') ? (options.EOF|0) : -1;
    this._useEval = _.has(options, 'useEval') ? options.useEval : true;
    this._noEvalWarning = options.noEvalWarning;
    this._complete = false;
    this._program = compile(
      manyfier(parse(options.code)), this._registers, this._memory,
      this._write, this._read, this._EOF, this._useEval, this._noEvalWarning
    );
  }

  get complete() {
    return this._complete;
  }

  run(steps=Infinity) {
    const program = this._program;
    const memory = this._memory;
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
