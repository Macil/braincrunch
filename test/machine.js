/* @flow */

import assert from 'assert';
import sinon from 'sinon';

import {Machine} from '../src/index.js';
import {SimpleMachine} from '../src/simple-machine';

[Machine, SimpleMachine].forEach(Ctor => {
  describe(Ctor.name, function() {
    it('works with basic program', function() {
      const output = [];
      const mac = new Ctor({
        code: '+.++.-.',
        write: output
      });
      assert.strictEqual(mac.complete, false);
      const cycles = mac.run();
      assert.strictEqual(mac.complete, true);
      assert.strictEqual(typeof cycles, 'number');
      assert(cycles > 0);
      assert.deepEqual(output, [1, 3, 2]);
    });

    it('can work when eval is not available', sinon.test(function() {
      {
        const fakeEval = () => {
          throw new Error('eval is blocked by test');
        };
        this.stub(global, 'eval', fakeEval);
        this.stub(global, 'Function', fakeEval);
      }
      const output = [];
      const mac = new Ctor({
        code: '+.++.-.',
        write: output,
        noEvalWarning: true
      });
      mac.run();
      assert.deepEqual(output, [1, 3, 2]);
    }));

    it('can be set to not use eval', sinon.test(function() {
      this.spy(global, 'Function');

      const output = [];
      const mac = new Ctor({
        code: '+.++.-.',
        write: output,
        useEval: false
      });
      assert(global.Function.notCalled);
      mac.run();
      assert.deepEqual(output, [1, 3, 2]);
      assert(global.Function.notCalled);
    }));

    it('works with Hello World', function() {
      const HELLO_WORLD = '++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>' +
        '.>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.>++.';

      const output = [];
      const mac = new Ctor({
        code: HELLO_WORLD,
        write: n => {
          output.push(String.fromCharCode(n));
        }
      });
      mac.run();
      assert.strictEqual(output.join(''), 'Hello World!\n');
    });

    it('can be run a few steps at a time', function() {
      const HELLO_WORLD = '++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>' +
        '.>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.>++.';

      const output = [];
      const mac = new Ctor({
        code: HELLO_WORLD,
        write: n => {
          output.push(String.fromCharCode(n));
        }
      });
      assert.strictEqual(mac.complete, false);
      mac.run(10);
      assert.strictEqual(mac.complete, false);
      assert.strictEqual(output.join(''), '');
      mac.run(2000);
      assert.strictEqual(mac.complete, true);
      assert.strictEqual(output.join(''), 'Hello World!\n');
    });

    describe('options', function() {
      describe('cellSize', function() {
        it('defaults to 8', function() {
          const output = [];
          const mac = new Ctor({
            code: '-.',
            write: output
          });
          mac.run();
          assert.deepEqual(output, [255]);
        });

        it('can be set to 8', function() {
          const output = [];
          const mac = new Ctor({
            code: '-.',
            write: output,
            cellSize: 8
          });
          mac.run();
          assert.deepEqual(output, [255]);
        });

        it('can be set to 16', function() {
          const output = [];
          const mac = new Ctor({
            code: '-.',
            write: output,
            cellSize: 16
          });
          mac.run();
          assert.deepEqual(output, [65535]);
        });

        it('can be set to 32', function() {
          const output = [];
          const mac = new Ctor({
            code: '-.',
            write: output,
            cellSize: 32
          });
          mac.run();
          assert.deepEqual(output, [-1]);
        });

        it('throws an error for invalid value', function() {
          assert.throws(() => {
            new Ctor({
              code: '-.',
              cellSize: 7
            });
          });
        });
      });

      describe('EOF', function() {
        it('defaults to -1', function() {
          const output = [];
          const mac = new Ctor({
            code: ',.',
            write: output
          });
          mac.run();
          assert.deepEqual(output, [255]);
        });

        it('can be set to -1', function() {
          const output = [];
          const mac = new Ctor({
            code: ',.',
            write: output,
            EOF: -1
          });
          mac.run();
          assert.deepEqual(output, [255]);
        });

        it('can be set to 0', function() {
          const output = [];
          const mac = new Ctor({
            code: ',.',
            write: output,
            EOF: 0
          });
          mac.run();
          assert.deepEqual(output, [0]);
        });
      });

      describe('read', function() {
        it('can be function', function() {
          const output = [];
          const mac = new Ctor({
            code: ',.>,.',
            read: () => 42,
            write: output
          });
          mac.run();
          assert.deepEqual(output, [42, 42]);
        });

        it('can be array', function() {
          const output = [];
          const mac = new Ctor({
            code: ',>,>,>,.<.<.<.',
            read: [1, 2, 3],
            write: output
          });
          mac.run();
          assert.deepEqual(output, [255, 3, 2, 1]);
        });

        it('can be string', function() {
          const output = [];
          const mac = new Ctor({
            code: ',>,>,>,.<.<.<.',
            read: 'Abc',
            write: output
          });
          mac.run();
          assert.deepEqual(output, [255, 99, 98, 65]);
        });

        it('can be null', function() {
          const output = [];
          const mac = new Ctor({
            code: ',>,>,>,.<.<.<.',
            read: null,
            write: output
          });
          mac.run();
          assert.deepEqual(output, [255, 255, 255, 255]);
        });
      });

      describe('write', function() {
        it('can be function', function() {
          const output = [];
          const mac = new Ctor({
            code: '+.+.+.',
            write: n => {
              output.push(n);
            }
          });
          mac.run();
          assert.deepEqual(output, [1, 2, 3]);
        });

        it('can be array', function() {
          const output = [];
          const mac = new Ctor({
            code: '+.+.+.',
            write: output
          });
          mac.run();
          assert.deepEqual(output, [1, 2, 3]);
        });

        it('can be null', function() {
          const readSpy = sinon.spy();
          const mac = new Ctor({
            code: ',.,.,.',
            read: readSpy,
            write: null
          });
          assert(readSpy.notCalled);
          mac.run();
          assert(readSpy.calledThrice);
        });
      });
    });

    describe('behavior', function() {
      it('reads at negative addresses always give zero', function() {
        const output = [];
        const mac = new Ctor({
          code: '<+.',
          write: output
        });
        mac.run();
        assert.deepEqual(output, [0]);
      });

      it('reads after end always give zero', function() {
        const output = [];
        const mac = new Ctor({
          code: '+.>++.>+++.',
          write: output,
          cellCount: 2
        });
        mac.run();
        assert.deepEqual(output, [1, 2, 0]);
      });
    });
  });
});
