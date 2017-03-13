export function makeReadFunction(read) {
  if (typeof read === 'function') {
    return read;
  } else if (typeof read === 'string') {
    let i = 0;
    return () => {
      const c = read.charCodeAt(i++);
      return isNaN(c) ? null : c;
    };
  } else if (Array.isArray(read)) {
    const iter = read[Symbol.iterator]();
    return () => {
      const {value, done} = iter.next();
      return done ? null : value;
    };
  } else if (read == null) {
    return () => null;
  } else {
    throw new Error('Invalid read option type');
  }
}

export function makeWriteFunction(write) {
  if (typeof write === 'function') {
    return write;
  } else if (Array.isArray(write)) {
    return n => {
      write.push(n);
    };
  } else if (write == null) {
    return () => {};
  } else {
    throw new Error('Invalid write option type');
  }
}

export function makeMemory(cellSize, cellCount) {
  switch (cellSize) {
  case 8:
    return new Uint8Array(cellCount);
  case 16:
    return new Uint16Array(cellCount);
  case 32:
    return new Uint32Array(cellCount);
  default:
    throw new Error('Invalid cell size: '+cellSize);
  }
}
