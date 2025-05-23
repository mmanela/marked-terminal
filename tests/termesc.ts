import { equal } from 'assert';
// @ts-ignore
import Renderer from '../dist/index.js';

describe('Terminal escape', function () {
  const r = new Renderer();

  it('should not be included in text length', function () {
    const tokens = [
      '\u001b[38;5;128mfoo\u001b[0m',
      '\u001b[33mfoo\u001b[22m\u001b[24m\u001b[39m',
      '\u001b[35m\u001b[4m\u001b[1mfoo',
      '\u001b[33mfo\u001b[39mo\u001b[0m'
    ];
    tokens.forEach(function (token) {
      equal(r.textLength(token), 3);
    });
  });
});