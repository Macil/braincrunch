import assert from 'assert';

import parse from '../parse';
import serialize from '../serialize';

const ADD = 0, RIGHT = 1,
  OUT = 2, IN = 3,
  OPEN = 4, CLOSE = 5,
  CLEAR = 6, MUL = 7,
  SCAN_LEFT = 8, SCAN_RIGHT = 9;

describe('parse', function() {
  it('add', function() {
    assert.deepEqual(Array.from(parse('+++')), [{type: ADD, x: 3}]);
  });

  it('sub', function() {
    assert.deepEqual(Array.from(parse('---')), [{type: ADD, x: -3}]);
  });

  it('right', function() {
    assert.deepEqual(Array.from(parse('>>>')), [{type: RIGHT, x: 3}]);
  });

  it('left', function() {
    assert.deepEqual(Array.from(parse('<<<')), [{type: RIGHT, x: -3}]);
  });

  it('in and out', function() {
    assert.deepEqual(Array.from(parse('..,,,')), [
      {type: OUT}, {type: OUT},
      {type: IN}, {type: IN}, {type: IN}
    ]);
  });

  it('clear', function() {
    assert.deepEqual(Array.from(parse('[-]')), [{type: CLEAR}]);
  });

  it('mul', function() {
    assert.deepEqual(Array.from(parse('[-<++>>>+++<<]')), [
      {type: MUL, x: -1, y: 2},
      {type: MUL, x: 2, y: 3},
      {type: CLEAR}
    ]);
  });

  it('improper mul', function() {
    assert.deepEqual(Array.from(parse('[-<++>>>+++<<<]')), [
      {type: OPEN, pair: 7}, {type: ADD, x: -1},
      {type: RIGHT, x: -1}, {type: ADD, x: 2},
      {type: RIGHT, x: 3}, {type: ADD, x: 3},
      {type: RIGHT, x: -3}, {type: CLOSE, pair: 0}
    ]);
  });

  it('scan_left', function() {
    assert.deepEqual(Array.from(parse('[<]')), [{type: SCAN_LEFT}]);
  });

  it('scan_right', function() {
    assert.deepEqual(Array.from(parse('[>]')), [{type: SCAN_RIGHT}]);
  });
});

describe('serialize', function() {
  describe('normal', function() {
    it('add', function() {
      assert.strictEqual(serialize([{type: ADD, x: 3}]), '+++');
    });

    it('sub', function() {
      assert.strictEqual(serialize([{type: ADD, x: -3}]), '---');
    });

    it('right', function() {
      assert.strictEqual(serialize([{type: RIGHT, x: 3}]), '>>>');
    });

    it('left', function() {
      assert.strictEqual(serialize([{type: RIGHT, x: -3}]), '<<<');
    });

    it('in and out', function() {
      assert.strictEqual(serialize([
        {type: OUT}, {type: OUT},
        {type: IN}, {type: IN}, {type: IN}
      ]), '..,,,');
    });

    it('clear', function() {
      assert.strictEqual(serialize([{type: CLEAR}]), '[-]');
    });

    it('mul', function() {
      assert.strictEqual(serialize([
        {type: MUL, x: -1, y: 2},
        {type: MUL, x: 2, y: 3},
        {type: CLEAR}
      ]), '[-<++>>>+++<<]');
    });

    it('improper mul', function() {
      assert.throws(() => {
        serialize([
          {type: MUL, x: -1, y: 2},
          {type: MUL, x: 2, y: 3},
          {type: OUT}, {type: OUT},
          {type: CLEAR}
        ]);
      });
    });

    it('scan_left', function() {
      assert.strictEqual(serialize([{type: SCAN_LEFT}]), '[<]');
    });

    it('scan_right', function() {
      assert.strictEqual(serialize([{type: SCAN_RIGHT}]), '[>]');
    });
  });

  describe('enhanced', function() {
    it('single add', function() {
      assert.strictEqual(serialize([{type: ADD, x: 1}], true), '+');
    });

    it('add', function() {
      assert.strictEqual(serialize([{type: ADD, x: 3}], true), '3+');
    });

    it('single sub', function() {
      assert.strictEqual(serialize([{type: ADD, x: -1}], true), '-');
    });

    it('sub', function() {
      assert.strictEqual(serialize([{type: ADD, x: -3}], true), '3-');
    });

    it('single right', function() {
      assert.strictEqual(serialize([{type: RIGHT, x: 1}], true), '>');
    });

    it('right', function() {
      assert.strictEqual(serialize([{type: RIGHT, x: 3}], true), '3>');
    });

    it('single left', function() {
      assert.strictEqual(serialize([{type: RIGHT, x: -1}], true), '<');
    });

    it('left', function() {
      assert.strictEqual(serialize([{type: RIGHT, x: -3}], true), '3<');
    });

    it('in and out', function() {
      assert.strictEqual(serialize([
        {type: OUT}, {type: OUT},
        {type: IN}, {type: IN}, {type: IN}
      ], true), '..,,,');
    });

    it('clear', function() {
      assert.strictEqual(serialize([{type: CLEAR}], true), '^');
    });

    it('mul', function() {
      assert.strictEqual(serialize([
        {type: MUL, x: -1, y: 2},
        {type: MUL, x: 2, y: 3},
        {type: CLEAR}
      ], true), '(1),2*2,3*^');
    });

    it('improper mul', function() {
      assert.throws(() => {
        serialize([
          {type: MUL, x: -1, y: 2},
          {type: MUL, x: 2, y: 3},
          {type: OUT}, {type: OUT},
          {type: CLEAR}
        ], true);
      });
    });

    it('scan_left', function() {
      assert.strictEqual(serialize([{type: SCAN_LEFT}], true), '!');
    });

    it('scan_right', function() {
      assert.strictEqual(serialize([{type: SCAN_RIGHT}], true), '@');
    });
  });
});
