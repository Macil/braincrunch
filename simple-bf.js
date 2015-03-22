import {parse} from './parse';

const ADD = 0, RIGHT = 1,
  OUT = 2, IN = 3,
  OPEN = 4, CLOSE = 5,
  CLEAR = 6, MUL = 7,
  SCAN_LEFT = 8, SCAN_RIGHT = 9;

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
    this._program = parse(programString);
    this._read = read;
    this._write = write;
    if (this._cellSize === 16) {
      this._memory = new Uint16Array(this._cellCount);
    } else if (this._cellSize === 8) {
      this._memory = new Uint8Array(this._cellCount);
    } else {
      throw new Error("Invalid cell size: "+this._cellSize);
    }
    this._pc = 0;
    this._dc = 0;
    this._EOF = options.EOF|0;
    this._complete = false;
  }

  get complete() {
    return this._complete;
  }

  run(steps=Infinity) {
    const program = this._program;
    const memory = this._memory;
    const EOF = this._EOF|0;
    const read = this._read;
    const write = this._write;
    let dc = this._dc|0;
    let pc = this._pc|0;

    const programLen = program.length;
    let step = 0;
    while (step < steps) {
      if (pc >= programLen) {
        this._complete = true;
        break;
      }
      const ins = program[pc];
      switch (ins.type) {
        case ADD:
          memory[dc] += ins.x|0;
          break;
        case CLEAR:
          memory[dc] = 0;
          break;
        case MUL:
          memory[dc + (ins.x|0)] += (memory[dc]|0) * (ins.y|0);
          break;
        case RIGHT:
          dc += ins.x|0;
          break;
        case OUT:
          write(memory[dc]|0);
          break;
        case IN:
          const value = read();
          memory[dc] = value === null ? EOF : (value|0);
          break;
        case SCAN_LEFT:
          dc = scanLeft(memory, dc);
          break;
        case SCAN_RIGHT:
          dc = scanRight(memory, dc);
          break;
        case OPEN:
          if (!memory[dc]) {
            pc = ins.pair|0;
          }
          break;
        case CLOSE:
          if (memory[dc]) {
            pc = ins.pair|0;
          }
          break;
      }
      pc++;
      step++;
    }

    this._dc = dc;
    this._pc = pc;

    return step;
  }
}
