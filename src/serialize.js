const ADD = 0, RIGHT = 1,
  OUT = 2, IN = 3,
  OPEN = 4, CLOSE = 5,
  CLEAR = 6, MUL = 7,
  SCAN_LEFT = 8, SCAN_RIGHT = 9;

function pushAll(dest, arr) {
  for (let item of arr) {
    dest.push(item);
  }
}

function formatEnhancedNumber(x) {
  if (x < 0) {
    return '('+(-x)+')';
  } else {
    return ''+x;
  }
}

export function serialize(program, enhanced=false) {
  const mulBuffer = [];
  const bf = [];
  for (let ins of program) {
    switch (ins.type) {
    case ADD:
      if (ins.x > 0) {
        if (enhanced && ins.x !== 1) {
          bf.push(ins.x+'+');
        } else {
          for (let i=0; i<ins.x; i++) {
            bf.push('+');
          }
        }
      } else if (ins.x < 0) {
        if (enhanced && ins.x !== -1) {
          bf.push((-ins.x)+'-');
        } else {
          for (let i=0; i<-ins.x; i++) {
            bf.push('-');
          }
        }
      }
      break;
    case RIGHT:
      if (ins.x > 0) {
        if (enhanced && ins.x !== 1) {
          bf.push(ins.x+'>');
        } else {
          for (let i=0; i<ins.x; i++) {
            bf.push('>');
          }
        }
      } else if (ins.x < 0) {
        if (enhanced && ins.x !== -1) {
          bf.push((-ins.x)+'<');
        } else {
          for (let i=0; i<-ins.x; i++) {
            bf.push('<');
          }
        }
      }
      break;
    case OUT:
      bf.push('.');
      break;
    case IN:
      bf.push(',');
      break;
    case OPEN:
      bf.push('[');
      break;
    case CLOSE:
      bf.push(']');
      break;
    case CLEAR:
      if (enhanced) {
        for (let mul of mulBuffer) {
          bf.push(formatEnhancedNumber(mul.x)+':'+formatEnhancedNumber(mul.y)+'*');
        }
        bf.push('^');
      } else {
        bf.push('[-');
        let position = 0;
        for (let mul of mulBuffer) {
          pushAll(bf, serialize([{type: RIGHT, x: mul.x-position}, {type: ADD, x: mul.y}]));
          position = mul.x;
        }
        pushAll(bf, serialize([{type: RIGHT, x: -position}]));
        bf.push(']');
      }
      mulBuffer.length = 0;
      break;
    case MUL:
      mulBuffer.push(ins);
      break;
    case SCAN_LEFT:
      bf.push('[<]');
      break;
    case SCAN_RIGHT:
      bf.push('[>]');
      break;
    default:
      throw new Error('Unknown type: '+ins.type);
    }
    if (ins.type !== MUL && mulBuffer.length) {
      throw new Error('MUL must be followed by MUL or CLEAR');
    }
  }
  if (mulBuffer.length) {
    throw new Error('MUL must be followed by MUL or CLEAR');
  }
  return bf.join('');
}
