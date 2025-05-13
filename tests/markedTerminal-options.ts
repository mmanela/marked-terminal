import { notEqual, equal } from 'assert';
import { markedTerminal } from '../index';
import marked, { resetMarked } from './_marked';

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
      marked(markdownText).indexOf(':emoji:'),
      -1
    );
  });

  it('should change tabs by space size', function () {
    const options = Object.assign({}, defaultOptions, { tab: 4 });
    marked.use(markedTerminal(options));

    const blockquoteText = '> Blockquote';
    equal(marked(blockquoteText), '    Blockquote\n\n');

    const listText = '* List Item';
    equal(marked(listText), '    * List Item\n\n');
  });

  it('should use default tabs if passing not supported string', function () {
    const options = Object.assign({}, defaultOptions, { tab: 'dsakdskajhdsa' });
    marked.use(markedTerminal(options));

    const blockquoteText = '> Blockquote';
    equal(marked(blockquoteText), '    Blockquote\n\n');

    const listText = '* List Item';
    equal(marked(listText), '    * List Item\n\n');
  });

  it('should change tabs by allowed characters', function () {
    const options = Object.assign({}, defaultOptions, { tab: '\t' });
    marked.use(markedTerminal(options));

    const blockquoteText = '> Blockquote';
    equal(marked(blockquoteText), '\tBlockquote\n\n');

    const listText = '* List Item';
    equal(marked(listText), '\t* List Item\n\n');
  });

  it('should support mulitple tab characters', function () {
    const options = Object.assign({}, defaultOptions, { tab: '\t\t' });
    marked.use(markedTerminal(options));

    const blockquoteText = '> Blockquote';
    equal(marked(blockquoteText), '\t\tBlockquote\n\n');

    const listText = '* List Item';
    equal(marked(listText), '\t\t* List Item\n\n');
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
      marked(text),
      `# Title

IMAGE

`
    );
  });
});