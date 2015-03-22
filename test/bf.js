import assert from 'assert';

import Machine from '../';

describe("Machine", function() {
  it("works with basic program", function() {
    const output = [];
    const mac = new Machine('+.++.-.', [], n => {
      output.push(n);
    });
    const cycles = mac.run();
    assert.strictEqual(typeof cycles, 'number');
    assert(cycles > 0);
    assert.deepEqual(output, [1, 3, 2]);
  });
});
