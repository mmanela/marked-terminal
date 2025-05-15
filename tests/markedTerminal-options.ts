import { notEqual, equal } from 'assert';
// @ts-ignore
import { markedTerminal } from '../dist/index.js';
import marked, { resetMarked } from './_marked.js';

type IdentityFn = (o: any) => any;

const identity: IdentityFn = function (o) {
  return o;
};

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

interface MarkedTerminalOptions {
  [key: string]: any;
  emoji?: boolean;
  tab?: number | string;
  image?: (text: string, options?: any) => string;
}

const defaultOptions: MarkedTerminalOptions = {};
opts.forEach(function (opt) {
  defaultOptions[opt] = identity;
});

defaultOptions.emoji = false;

describe('Options', function () {
  beforeEach(function () {
    resetMarked();
  });

  it('should not translate emojis', function () {
    marked.use(markedTerminal(defaultOptions));
    const markdownText = 'Some :emoji:';

    notEqual(
      marked(markdownText, { async: false }).indexOf(':emoji:'),
      -1
    );
  });

  it('should change tabs by space size', function () {
    const options = Object.assign({}, defaultOptions, { tab: 4 });
    marked.use(markedTerminal(options));

    const blockquoteText = '> Blockquote';
    equal(marked(blockquoteText, { async: false }), '    Blockquote\n\n');

    const listText = '* List Item';
    equal(marked(listText, { async: false }), '    * List Item\n\n');
  });

  it('should use default tabs if passing not supported string', function () {
    const options = Object.assign({}, defaultOptions, { tab: 'dsakdskajhdsa' });
    marked.use(markedTerminal(options));

    const blockquoteText = '> Blockquote';
    equal(marked(blockquoteText, { async: false }), '    Blockquote\n\n');

    const listText = '* List Item';
    equal(marked(listText, { async: false }), '    * List Item\n\n');
  });

  it('should change tabs by allowed characters', function () {
    const options = Object.assign({}, defaultOptions, { tab: '\t' });
    marked.use(markedTerminal(options));

    const blockquoteText = '> Blockquote';
    equal(marked(blockquoteText, { async: false }), '\tBlockquote\n\n');

    const listText = '* List Item';
    equal(marked(listText, { async: false }), '\t* List Item\n\n');
  });

  it('should support mulitple tab characters', function () {
    const options = Object.assign({}, defaultOptions, { tab: '\t\t' });
    marked.use(markedTerminal(options));

    const blockquoteText = '> Blockquote';
    equal(marked(blockquoteText, { async: false }), '\t\tBlockquote\n\n');

    const listText = '* List Item';
    equal(marked(listText, { async: false }), '\t\t* List Item\n\n');
  });

  it('should support overriding image handling', function () {
    const options = Object.assign({}, defaultOptions, {
      image: function (): string {
        return 'IMAGE';
      }
    });
    marked.use(markedTerminal(options));

    const text = `
# Title
![Alt text](./img.jpg)`;
    equal(
      marked(text, { async: false }),
      `# Title

IMAGE

`
    );
  });
});