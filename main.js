import fs from 'fs';
import Machine from './jit-bf';
import {benchmark} from './benchmarking';

function fromCharCodes(arr) {
  return arr.map(n => String.fromCharCode(n)).join('');
}

function toCharCodes(str) {
  const charCodes = [];
  for (let i=0; i<str.length; i++) {
    charCodes.push(str.charCodeAt(i));
  }
  return charCodes;
}

const HELLO_WORLD = '++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>.' +
  '>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.>++.';

const ROT13 = '-,+[-[>>++++[>++++++++<-]<+<-[>+>+>-[>>>]<[[>+<-]>>+>]<<<<<-]' +
  ']>>>[-]+>--[-[<->+++[-]]]<[++++++++++++<[>-[>+>>]>[+[<+>-]>+>>]<<<<<-' +
  ']>>[<+>-]>[-[-<<[-]>>]<<[<<->>-]>>]<<[<<+>>-]]<[-]<.[-]<-,+]';

const FACTOR = fs.readFileSync(__dirname+'/../bfoptimization/progs/factor.b', 'utf8');
const DBFI = fs.readFileSync(__dirname+'/../bfoptimization/progs/dbfi.b', 'utf8');
const LONG = fs.readFileSync(__dirname+'/../bfoptimization/progs/long.b', 'utf8');
const HANOI = fs.readFileSync(__dirname+'/../bfoptimization/progs/hanoi.b', 'utf8');
const AWIB = fs.readFileSync(__dirname+'/../bfoptimization/progs/awib-0.4.b', 'utf8');

function main() {
  const {result, timeSpent} = benchmark(() => {
    const mac = new Machine(FACTOR, toCharCodes('133333333333337\n'), n => {
      process.stdout.write(String.fromCharCode(n));
    }, {EOF: -1, cellSize: 8});
    return mac.run();
  }, 0);
  console.log('cycles', result);
  console.log('time spent', timeSpent);
}

main();
