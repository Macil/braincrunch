import _ from 'lodash';

const ADD = 0, RIGHT = 1,
  OUT = 2, IN = 3,
  OPEN = 4, CLOSE = 5,
  CLEAR = 6, MUL = 7,
  SCAN_LEFT = 8, SCAN_RIGHT = 9;

function* parseProgram(programString) {
  for (let opCode of programString) {
    switch (opCode) {
      case '+':
        yield {type: ADD, x: 1};
        break;
      case '-':
        yield {type: ADD, x: -1};
        break;
      case '>':
        yield {type: RIGHT, x: 1};
        break;
      case '<':
        yield {type: RIGHT, x: -1};
        break;
      case '.':
        yield {type: OUT};
        break;
      case ',':
        yield {type: IN};
        break;
      case '[':
        yield {type: OPEN};
        break;
      case ']':
        yield {type: CLOSE};
        break;
    }
  }
}

const contractableInsTypes = [ADD, RIGHT];
function* contractProgram(program) {
  let prev;
  for (let ins of program) {
    if (!prev) {
      prev = ins;
    } else {
      if (prev.type === ins.type && _.includes(contractableInsTypes, ins.type)) {
        prev.x += ins.x;
      } else {
        yield prev;
        prev = ins;
      }
    }
  }
  if (prev) {
    yield prev;
  }
}

// Needs to run after contractProgram for best effectiveness.
function* clearLoop(program) {
  const buffer = [];
  const copyBuffer = [];
  let copyPos = 0;
  for (let ins of program) {
    if (buffer.length === 0) {
      if (ins.type === OPEN) {
        buffer.push(ins);
      } else {
        yield ins;
      }
    } else if (buffer.length === 1) {
      if (ins.type === ADD && ins.x === -1) {
        buffer.push(ins);
      } else {
        yield* buffer;
        yield ins;
        buffer.length = 0;
        copyBuffer.length = 0;
        copyPos = 0;
      }
    } else {
      if (ins.type === CLOSE && copyPos === 0) {
        yield* copyBuffer;
        yield {type: CLEAR};
        buffer.length = 0;
        copyBuffer.length = 0;
        copyPos = 0;
      } else if (ins.type === RIGHT) {
        buffer.push(ins);
        copyPos += ins.x;
      } else if (ins.type === ADD) {
        buffer.push(ins);
        copyBuffer.push({type: MUL, x: copyPos, y: ins.x});
      } else {
        yield* buffer;
        yield ins;
        buffer.length = 0;
        copyBuffer.length = 0;
        copyPos = 0;
      }
    }
  }
  yield* buffer;
}

function* scanners(program) {
  const buffer = [];
  for (let ins of program) {
    if (buffer.length === 0) {
      if (ins.type === OPEN) {
        buffer.push(ins);
      } else {
        yield ins;
      }
    } else if (buffer.length === 1) {
      if (ins.type === RIGHT && (ins.x === 1 || ins.x === -1)) {
        buffer.push(ins);
      } else {
        yield* buffer;
        yield ins;
        buffer.length = 0;
      }
    } else if (buffer.length === 2) {
      if (ins.type === CLOSE) {
        if (buffer[1].x === 1) {
          yield {type: SCAN_RIGHT};
        } else {
          yield {type: SCAN_LEFT};
        }
      } else {
        yield* buffer;
        yield ins;
      }
      buffer.length = 0;
    } else {
      throw new Error("Should not happen");
    }
  }
  yield* buffer;
}

// Must be last optimization
function loopAssociater(program) {
  program = Array.from(program);
  const programLen = program.length;
  for (let pc = 0; pc < programLen; pc++) {
    const ins = program[pc];
    if (ins.type === OPEN) {
      ins.pair = openJump(program, pc);
    } else if (ins.type === CLOSE) {
      ins.pair = closeJump(program, pc);
    }
  }
  return program;
}

function parseAndOptimizeProgram(programString) {
  return Array.from(loopAssociater(clearLoop(scanners(contractProgram(parseProgram(programString))))));
}

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

function openJump(program, pc) {
  const programLen = program.length;
  let openCount = 1;
  while (++pc < programLen && openCount > 0) {
    const currentOpCode = program[pc].type;
    if (currentOpCode === OPEN) {
      openCount++;
    } else if (currentOpCode === CLOSE) {
      openCount--;
    }
  }
  pc--;
  return pc;
}

function closeJump(program, pc) {
  const programLen = program.length;
  let openCount = 1;
  while (--pc > 0 && openCount > 0) {
    const currentOpCode = program[pc].type;
    if (currentOpCode === CLOSE) {
      openCount++;
    } else if (currentOpCode === OPEN) {
      openCount--;
    }
  }
  return pc;
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
    this._program = parseAndOptimizeProgram(programString);
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
