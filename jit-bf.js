import _ from 'lodash';
import parse, {loopAssociater} from './parse';

const ADD = 0, RIGHT = 1,
  OUT = 2, IN = 3,
  OPEN = 4, CLOSE = 5,
  CLEAR = 6, MUL = 7,
  SCAN_LEFT = 8, SCAN_RIGHT = 9,
  MANY = 100;

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

function compile(program, registers, memory, write, read, EOF) {
  // registers[0]: dc
  // registers[1]: pc
  function INS_CLEAR() {
    memory[registers[0]] = 0;
  }
  function INS_OUT() {
    write(memory[registers[0]]|0);
  }
  function INS_IN() {
    const value = read();
    memory[registers[0]] = value === null ? EOF : (value|0);
  }
  function INS_SCAN_LEFT() {
    registers[0] = scanLeft(memory, registers[0]);
  }
  function INS_SCAN_RIGHT() {
    registers[0] = scanRight(memory, registers[0]);
  }

  function newFn(src) {
    // jshint evil:true
    const fn = new Function(
      'registers', 'memory', 'program', 'write', 'read', 'EOF',
      'scanLeft', 'scanRight', src);
    return () => {
      fn(registers, memory, program, write, read, EOF, scanLeft, scanRight);
    };
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
        return `memory[registers[0] + ${x}] += memory[registers[0]] * ${y};`;
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
        };
      case CLEAR:
        return INS_CLEAR;
      case MUL:
        return () => {
          const dc = registers[0];
          memory[dc + x] += (memory[dc]|0) * y;
        };
      case RIGHT:
        return () => {
          registers[0] += x;
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
        };
      case CLOSE:
        return () => {
          if (memory[registers[0]]) {
            registers[1] = pair;
          }
        };
      case MANY:
        return newFn(ins.items.map(toSrc).join('\n'));
      default:
        throw new Error("Unknown instruction type: "+ins.type);
    }
  }

  return program.map(mapper);
}

export default class Machine {
  constructor(programString, read, write, options={}) {
    if (read[Symbol.iterator]) {
      const iter = read[Symbol.iterator]();
      read = () => {
        const {value, done} = iter.next();
        return done ? null : value;
      };
    }

    this._cellSize = options.cellSize || 16;
    this._cellCount = options.cellCount || 4096;
    this._read = read;
    this._write = write;
    if (this._cellSize === 16) {
      this._memory = new Uint16Array(this._cellCount);
    } else if (this._cellSize === 8) {
      this._memory = new Uint8Array(this._cellCount);
    } else {
      throw new Error("Invalid cell size: "+this._cellSize);
    }
    this._registers = new Uint32Array(2);
    this._EOF = options.EOF|0;
    this._complete = false;
    this._program = compile(
      manyfier(parse(programString)), this._registers, this._memory,
      this._write, this._read, this._EOF
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
      ins();
      registers[1]++;
      step++;
    }

    return step;
  }
}
