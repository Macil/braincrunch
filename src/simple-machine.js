/* @flow */

// Simpler alternative Machine implementation. Doesn't do any Javascript
// compilation. Useful if you need `machine.run` to not over-step at all.

import {parse} from './parse';
import {makeReadFunction, makeWriteFunction, makeMemory} from './args';
import type {ReadResult, WriteResult} from './args';
import {Interrupt} from './interrupt';

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

import type {Options} from './machine';

export class SimpleMachine {
  _cellSize: number;
  _cellCount: number;
  _read: () => ReadResult;
  _write: (value: number) => WriteResult;
  _memory: $TypedArray;
  _pc: number;
  _dc: number;
  _EOF: number;
  _program: any;
  _complete: boolean;

  INTERRUPT = new Interrupt();

  constructor(options: Options) {
    this._cellSize = options.cellSize || 8;
    this._cellCount = options.cellCount || 4096;
    this._read = makeReadFunction(options.read);
    this._write = makeWriteFunction(options.write);
    this._memory = makeMemory(this._cellSize, this._cellCount);
    this._pc = 0;
    this._dc = 0;
    this._EOF = ('EOF' in options) ? (Number(options.EOF)|0) : -1;
    this._program = parse(options.code);
    this._complete = false;
  }

  get complete(): boolean {
    return this._complete;
  }

  run(steps: number=Infinity) {
    const program = this._program;
    const memory = this._memory;
    const EOF = this._EOF|0;
    const read = this._read;
    const write = this._write;
    let dc = this._dc|0;
    let pc = this._pc|0;

    const programLen = program.length;
    let step = 0;
    let interrupt = false;
    while (step < steps && !interrupt) {
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
        if (write(memory[dc]|0) === this.INTERRUPT) {
          interrupt = true;
        }
        break;
      case IN: {
        const value = read();
        if (value === this.INTERRUPT) {
          interrupt = true;
          memory[dc] = 0;
        } else {
          memory[dc] = value === null ? EOF : (value:any|0);
        }
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

  setReadValue(value: number) {
    this._memory[this._dc] = value;
  }
}
