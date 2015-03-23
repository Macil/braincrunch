import assert from 'assert';

import {parse} from '../src/parse';
import {serialize} from '../src/serialize';

const ADD = 0, RIGHT = 1,
  OUT = 2, IN = 3,
  OPEN = 4, CLOSE = 5,
  CLEAR = 6, MUL = 7,
  SCAN_LEFT = 8, SCAN_RIGHT = 9;

describe('parse', function() {
  describe('normal', function() {
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

    it('clear after partial mul', function() {
      assert.deepEqual(Array.from(parse('[<+>[-]-]')), [
        {type: OPEN, pair: 6},
        {type: RIGHT, x: -1},
        {type: ADD, x: 1},
        {type: RIGHT, x: 1},
        {type: CLEAR},
        {type: ADD, x: -1},
        {type: CLOSE, pair: 0}
      ]);
    });

    it('backwards mul', function() {
      assert.deepEqual(Array.from(parse('[<++>>>+++<<-]')), [
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

    it("won't multiply with x = 0", function() {
      assert.deepEqual(Array.from(parse('[-+++]')), [
        {type: OPEN, pair: 2},
        {type: ADD, x: 2},
        {type: CLOSE, pair: 0}
      ]);
    });

    it('scan_left', function() {
      assert.deepEqual(Array.from(parse('[<]')), [{type: SCAN_LEFT}]);
    });

    it('scan_left after partial scanner', function() {
      assert.deepEqual(Array.from(parse('[[<]]')), [
        {type: OPEN, pair: 2},
        {type: SCAN_LEFT},
        {type: CLOSE, pair: 0}
      ]);
    });

    it('scan_right', function() {
      assert.deepEqual(Array.from(parse('[>]')), [{type: SCAN_RIGHT}]);
    });

    it('ignores enhanced syntax', function() {
      assert.deepEqual(Array.from(parse('3>>.4<3:2*^')), [
        {type: RIGHT, x: 2},
        {type: OUT},
        {type: RIGHT, x: -1}
      ]);
    });

    it('does not use // comments', function() {
      assert.deepEqual(Array.from(parse('+//+\n+')), [
        {type: ADD, x: 3}
      ]);
    });
  });

  describe('enhanced', function() {
    it('add', function() {
      assert.deepEqual(Array.from(parse('3+', true)), [{type: ADD, x: 3}]);
    });

    it('add negative', function() {
      assert.deepEqual(Array.from(parse('(3)+', true)), [{type: ADD, x: -3}]);
    });

    it('sub', function() {
      assert.deepEqual(Array.from(parse('3-', true)), [{type: ADD, x: -3}]);
    });

    it('right', function() {
      assert.deepEqual(Array.from(parse('3>', true)), [{type: RIGHT, x: 3}]);
    });

    it('right negative', function() {
      assert.deepEqual(Array.from(parse('(3)>', true)), [{type: RIGHT, x: -3}]);
    });

    it('left', function() {
      assert.deepEqual(Array.from(parse('3<', true)), [{type: RIGHT, x: -3}]);
    });

    it('in and out', function() {
      assert.deepEqual(Array.from(parse('..,,,', true)), [
        {type: OUT}, {type: OUT},
        {type: IN}, {type: IN}, {type: IN}
      ]);
    });

    it('clear', function() {
      assert.deepEqual(Array.from(parse('^', true)), [{type: CLEAR}]);
    });

    it('regular clear', function() {
      assert.deepEqual(Array.from(parse('^[-]', true)), [
        {type: CLEAR}, {type: CLEAR}
      ]);
    });

    it('mul', function() {
      assert.deepEqual(Array.from(parse('(1):2*2:3*^', true)), [
        {type: MUL, x: -1, y: 2},
        {type: MUL, x: 2, y: 3},
        {type: CLEAR}
      ]);
    });

    it("can't multiply with x = 0", function() {
      assert.throws(() => {
        parse('0:3*^', true);
      });
    });

    it('many', function() {
      assert.deepEqual(Array.from(parse('3>>.4<3:2*^', true)), [
        {type: RIGHT, x: 4},
        {type: OUT},
        {type: RIGHT, x: -4},
        {type: MUL, x: 3, y: 2}, {type: CLEAR}
      ]);
    });

    it('uses // comments', function() {
      assert.deepEqual(Array.from(parse('+//+\n+', true)), [
        {type: ADD, x: 2}
      ]);
    });
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
      ], true), '(1):2*2:3*^');
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
      assert.strictEqual(serialize([{type: SCAN_LEFT}], true), '[<]');
    });

    it('scan_right', function() {
      assert.strictEqual(serialize([{type: SCAN_RIGHT}], true), '[>]');
    });
  });
});
