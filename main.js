import fs from 'fs';
import Machine from './bf';
import lint from './lint';
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

const LONG = fs.readFileSync(__dirname+'/../bfoptimization/progs/long.b', 'utf8');

function main() {
  const message = 'lol beep boop\nsecret message\nyby orrc obbc\nfrperg zrffntr\n';
  const {timeSpent} = benchmark(() => {
    const mac = new Machine(ROT13, toCharCodes(message), n => {
      //process.stdout.write(String.fromCharCode(n));
    }, {EOF: -1});
    mac.run();
  }, 100);
  console.log('time spent', timeSpent);
}

main();
