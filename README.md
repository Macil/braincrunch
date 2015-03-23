# BrainCrunch

A embeddable Brainfuck interpreter written in Javascript with a focus on
performance and determinism.

    npm install --save braincrunch

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

## API

### new braincrunch.Machine(opts)

`opts` supports the following properties:

* `code`: The Brainfuck program code.
* `read`: Must be a string, array, function, or null. Used to provide values
  when the `,` instruction is hit. Return null to signal EOF.
* `write`: Must be an array, function, or null. Will be appended to or called
  when the `.` instruction is hit.
* `cellSize`: The number of bits per cell. Valid values are 8, 16, and 32.
  Defaults to 8.
* `cellCount`: Number of cells to have. Defaults to 4096.
* `EOF`: Value to set when `,` gives EOF. Defaults to -1.

### machine.run([steps])

Runs the machine for at least the given number of `steps`. `steps` defaults to
Infinity if not given.  This method can be called multiple times to continue
running the machine. Giving a finite `steps` value is a useful protection
against infinite loops in user-supplied programs, or to let the machine pause
so other things can be done before resuming.

### machine.complete

Boolean property that is set to true once the machine has finished its program.
