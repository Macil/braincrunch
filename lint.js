export default function lint(program) {
  let openCount = 0;
  for (let pc=0; pc<program.length; pc++) {
    const opCode = program[pc];
    switch (opCode) {
      case '+':
      case '-':
      case '>':
      case '<':
      case '.':
      case ',':
        break;
      case '[':
        openCount++;
        break;
      case ']':
        openCount--;
        if (openCount < 0) {
          throw new Error("Too many ] opcodes");
        }
        break;
    }
  }
  if (openCount !== 0) {
    throw new Error("Too many [ opcodes");
  }
}
