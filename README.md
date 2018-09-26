# BrainCrunch

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Macil/braincrunch/blob/master/LICENSE.txt) [![npm version](https://img.shields.io/npm/v/braincrunch.svg?style=flat)](https://www.npmjs.com/package/braincrunch) [![CircleCI Status](https://circleci.com/gh/Macil/braincrunch.svg?style=shield)](https://circleci.com/gh/Macil/braincrunch) [![Greenkeeper badge](https://badges.greenkeeper.io/Macil/braincrunch.svg)](https://greenkeeper.io/)

An embeddable performant Brainfuck interpreter written in Javascript.

    yarn add braincrunch

```javascript
var braincrunch = require('braincrunch');

var HELLO_WORLD = '++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>' +
  '.>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.>++.';

var machine = new braincrunch.Machine({
  code: HELLO_WORLD,
  write: function(n) {
    process.stdout.write(String.fromCharCode(n));
  }
});
machine.run();
// Hello World!
```

When the Machine object is created, the Brainfuck program is parsed and
optimized. Specific sequences are translated into more efficient instructions:
`[-]` becomes a single operation that clears the current cell for example. Then
sequences of non-looping instructions are translated into Javascript so that
the Javascript VM can apply its own optimizations at runtime.

Some of the optimization strategies are inspired by this post:
http://calmerthanyouare.org/2015/01/07/optimizing-brainfuck.html

BrainCrunch can be used in Browsers via a CommonJS bundler such as Browserify.
Support for Typed Arrays is required. https://caniuse.com/#feat=typedarrays

## API

### new braincrunch.Machine(opts)

`opts` supports the following properties:

* `code`: The Brainfuck program code.
* `read`: Must be a string, array, function, or null. Used to provide values
  when the `,` instruction is hit. Return null to signal EOF. Return the
  `machine.INTERRUPT` value to pause the machine. This is useful if read's
  implementation is asynchronous. The read value may be supplied later by using
  `machine.setReadValue`, and then the machine may be resumed with
  `machine.run`.
* `write`: Must be an array, function, or null. Will be appended to or called
  when the `.` instruction is hit. The function may return the
  `machine.INTERRUPT` value to pause the machine.
* `cellSize`: The number of bits per cell. Valid values are 8, 16, and 32.
  Defaults to 8.
* `cellCount`: Number of cells to have. Defaults to 4096.
* `EOF`: Value to set when `,` gives EOF. Defaults to -1.
* `useEval`: Translate code into Javascript when possible. Defaults to true.
* `noEvalWarning`: If useEval is true and the Function constructor is not
  available at run-time (such as because of Content Security Policy
  restrictions), then a warning will be printed to the console unless this
  setting is set to true. Defaults to false.
* `allowInterrupts`: If you never use a read or write function that can
  return machine.INTERRUPT, then setting this option to `false` can increase
  performance.

### machine.run([steps])

Runs the machine for at least the given number of `steps`. `steps` defaults to
Infinity if not given.  This method can be called multiple times to continue
running the machine. Giving a finite `steps` value is a useful protection
against infinite loops in user-supplied programs, or to let the machine pause
so other things can be done before resuming. Returns the number of steps that
were executed.

### machine.setReadValue(value)

If the machine has been interrupted during a read, then this method may be
used to set the read value, and then the machine can be resumed by using
`machine.run`. This method should not be used in other situations.

### machine.complete

Boolean property that is set to true once the machine has finished its program.

### machine.INTERRUPT

This is a special value that may be returned by a user-supplied read or write
callback to cause the machine to stop. The machine may be resumed later by
using `machine.run`.

## Types

[Flow](https://flowtype.org/) type declarations for this module are included!
If you are using Flow, they won't require any configuration to use.
