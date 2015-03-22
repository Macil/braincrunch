import _ from 'lodash';

const ADD = 0, RIGHT = 1,
  OUT = 2, IN = 3,
  OPEN = 4, CLOSE = 5,
  CLEAR = 6, MUL = 7,
  SCAN_LEFT = 8, SCAN_RIGHT = 9;

function* tokenize(programString) {
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
  const opens = [];
  for (let pc = 0; pc < programLen; pc++) {
    const ins = program[pc];
    if (ins.type === OPEN) {
      opens.push(pc);
    } else if (ins.type === CLOSE) {
      const openPc = opens.pop();
      if (!openPc) {
        throw new Error("Unmatched ]");
      }
      ins.pair = openPc;
      program[openPc].pair = pc;
    }
  }
  if (opens.length) {
    throw new Error("Unmatched [");
  }
  return program;
}

export default function parse(programString) {
  return loopAssociater(clearLoop(scanners(contractProgram(tokenize(programString)))));
}
