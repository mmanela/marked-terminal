import { equal } from 'assert';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
// @ts-ignore
import Renderer from '../dist/index.js';
import marked, { resetMarked } from './_marked.js';
import { fileURLToPath } from 'url';

type IdentityFn = (o: any) => any;

const identity: IdentityFn = function (o) {
  return o;
};

function stripTermEsc(str: string): string {
  return str.replace(/\u001b\[\d{1,2}m/g, '');
}

function getFixtureFile(fileName: string): string {
  return readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures/', fileName),
    {
      encoding: 'utf8'
    }
  );
}

const opts = [
  'code',
  'blockquote',
  'html',
  'heading',
  'firstHeading',
  'hr',
  'listitem',
  'table',
  'paragraph',
  'strong',
  'em',
  'codespan',
  'del',
  'link',
  'href'
];

interface RendererOptions {
  [key: string]: any;
}

const defaultOptions: RendererOptions = {};
opts.forEach(function (opt) {
  defaultOptions[opt] = identity;
});

function markup(str: string): string {
  const r = new Renderer(defaultOptions);
  return stripTermEsc(marked(str, { renderer: r, async: false }));
}

describe('e2', function () {
  beforeEach(function () {
    resetMarked();
  });

  it('should render a document full of different supported syntax', function () {
    const actual = markup(getFixtureFile('e2e.md'));
    const expected = getFixtureFile('e2e.result.txt');
    equal(actual, expected);
  });
});