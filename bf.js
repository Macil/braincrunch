import _ from 'lodash';

const ADD = 0, SUB = 1, RIGHT = 2, LEFT = 3, OUT = 4, IN = 5,
  OPEN = 6, CLOSE = 7,
  CLEAR = 8, COPY = 9;

function* parseProgram(programString) {
  for (let opCode of programString) {
    switch (opCode) {
      case '+':
        yield {type: ADD, x: 1};
        break;
      case '-':
        yield {type: SUB, x: 1};
        break;
      case '>':
        yield {type: RIGHT, x: 1};
        break;
      case '<':
        yield {type: LEFT, x: 1};
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

const contractableInsTypes = [ADD, SUB, RIGHT, LEFT];
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
      if (ins.type === SUB && ins.x === 1) {
        buffer.push(ins);
      } else {
        yield* buffer;
        yield ins;
        buffer.length = 0;
        copyBuffer.length = 0;
        copyPos = 0;
      }
    } else if (buffer.length >= 2) {
      if (ins.type === CLOSE && copyPos === 0) {
        yield* copyBuffer;
        yield {type: CLEAR};
        buffer.length = 0;
        copyBuffer.length = 0;
        copyPos = 0;
      } else if (ins.type === RIGHT) {
        buffer.push(ins);
        copyPos += ins.x;
      } else if (ins.type === LEFT) {
        buffer.push(ins);
        copyPos -= ins.x;
      } else if (ins.type === ADD && ins.x === 1) {
        buffer.push(ins);
        copyBuffer.push({type: COPY, x: copyPos});
      } else {
        yield* buffer;
        yield ins;
        buffer.length = 0;
        copyBuffer.length = 0;
        copyPos = 0;
      }
    } else {
      throw new Error(
        "clearLoop buffer should not hold this many items: "+buffer.length);
    }
  }
}

function parseAndOptimizeProgram(programString) {
  return Array.from(clearLoop(contractProgram(parseProgram(programString))));
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
    const programLen = this._program.length;
    let step = 0;
    while (step < steps) {
      if (this._pc >= programLen) {
        this._complete = true;
        break;
      }
      const ins = this._program[this._pc];
      switch (ins.type) {
        case ADD:
          this._memory[this._dc] += ins.x|0;
          break;
        case SUB:
          this._memory[this._dc] -= ins.x|0;
          break;
        case CLEAR:
          this._memory[this._dc] = 0;
          break;
        case COPY:
          this._memory[this._dc + ins.x|0] += this._memory[this._dc];
          break;
        case RIGHT:
          this._dc += ins.x|0;
          break;
        case LEFT:
          this._dc -= ins.x|0;
          break;
        case OUT:
          this._write(this._memory[this._dc]|0);
          break;
        case IN:
          const value = this._read();
          this._memory[this._dc] = value === null ? this._EOF|0 : value|0;
          break;
        case OPEN:
          if (this._memory[this._dc] === 0) {
            let openCount = 1;
            while (++this._pc < programLen && openCount > 0) {
              let currentOpCode = this._program[this._pc].type;
              if (currentOpCode === OPEN) {
                openCount++;
              } else if (currentOpCode === CLOSE) {
                openCount--;
              }
            }
            this._pc--;
          }
          break;
        case CLOSE:
          if (this._memory[this._dc] !== 0) {
            let openCount = 1;
            while (--this._pc > 0 && openCount > 0) {
              let currentOpCode = this._program[this._pc].type;
              if (currentOpCode === CLOSE) {
                openCount++;
              } else if (currentOpCode === OPEN) {
                openCount--;
              }
            }
          }
          break;
      }
      this._pc++;
      step++;
    }
    return step;
  }
}
