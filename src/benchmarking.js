/* @flow */

export function time<T>(fn: () => T): {result: T, timeSpent: number} {
  const start = Date.now();
  const result = fn();
  const end = Date.now();
  const timeSpent = end-start;
  return {result, timeSpent};
}

export function benchmark<T>(fn: () => T, warmupRounds: number): {result: T, timeSpent: number} {
  for (let i=0; i<warmupRounds; i++) {
    time(fn);
  }
  return time(fn);
}
