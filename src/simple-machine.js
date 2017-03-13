// Simpler alternative Machine implementation. Doesn't do any Javascript
// compilation. Useful if you need `machine.run` to not over-step at all.

import {parse} from './parse';
import {makeReadFunction, makeWriteFunction, makeMemory} from './args';

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

export class SimpleMachine {
  constructor(options) {
    this._cellSize = options.cellSize || 8;
    this._cellCount = options.cellCount || 4096;
    this._read = makeReadFunction(options.read);
    this._write = makeWriteFunction(options.write);
    this._memory = makeMemory(this._cellSize, this._cellCount);
    this._pc = 0;
    this._dc = 0;
    this._EOF = ('EOF' in options) ? (options.EOF|0) : -1;
    this._program = parse(options.code);
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
      case IN: {
        const value = read();
        memory[dc] = value === null ? EOF : (value|0);
        break;
      }
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
