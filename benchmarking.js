export function time(fn) {
  const start = Date.now();
  const result = fn();
  const end = Date.now();
  const timeSpent = end-start;
  return {result, timeSpent};
}

export function benchmark(fn, warmupRounds) {
  for (let i=0; i<warmupRounds; i++) {
    time(fn);
  }
  return time(fn);
}
