/* @flow */

export type ReadParam = (() => number|null) | string | Array<number> | null | void;

export function makeReadFunction(read: ReadParam): () => ?number {
  if (typeof read === 'function') {
    return read;
  } else if (typeof read === 'string') {
    const s = read;
    const sLen = s.length;
    let i = 0;
    return () => i < sLen ? s.charCodeAt(i++) : null;
  } else if (Array.isArray(read)) {
    const a = read;
    const aLen = a.length;
    let i = 0;
    return () => i < aLen ? a[i++] : null;
  } else if (read == null) {
    return () => null;
  } else {
    throw new Error('Invalid read option type');
  }
}

export type WriteParam = ((value: number) => void) | Array<number> | null | void;

export function makeWriteFunction(write: WriteParam): (value: number) => void {
  if (typeof write === 'function') {
    return write;
  } else if (Array.isArray(write)) {
    const a = write;
    return n => {
      a.push(n);
    };
  } else if (write == null) {
    return () => {};
  } else {
    throw new Error('Invalid write option type');
  }
}

export function makeMemory(cellSize: number, cellCount: number): $TypedArray {
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
