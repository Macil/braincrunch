export default class Machine {
  constructor(program, read, write, options={}) {
    if (read[Symbol.iterator]) {
      const iter = read[Symbol.iterator]();
      read = () => {
        const {value, done} = iter.next();
        return done ? null : value;
      };
    }

    this._cellSize = options.cellSize || 16;
    this._cellCount = options.cellCount || 4096;
    this._program = program;
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
      const opCode = this._program[this._pc];
      //console.log('on opcode', this._pc, opCode);
      switch (opCode) {
        case '+':
          this._memory[this._dc]++;
          break;
        case '-':
          this._memory[this._dc]--;
          break;
        case '>':
          this._dc++;
          break;
        case '<':
          this._dc--;
          break;
        case '.':
          this._write(this._memory[this._dc]|0);
          break;
        case ',':
          const value = this._read();
          this._memory[this._dc] = value === null ? this._EOF|0 : value|0;
          break;
        case '[':
          if (this._memory[this._dc] === 0) {
            let openCount = 1;
            while (++this._pc < programLen && openCount > 0) {
              let currentOpCode = this._program[this._pc];
              if (currentOpCode === '[') {
                openCount++;
              } else if (currentOpCode === ']') {
                openCount--;
              }
            }
            this._pc--;
          }
          break;
        case ']':
          if (this._memory[this._dc] !== 0) {
            let openCount = 1;
            while (--this._pc > 0 && openCount > 0) {
              let currentOpCode = this._program[this._pc];
              if (currentOpCode === ']') {
                openCount++;
              } else if (currentOpCode === '[') {
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
