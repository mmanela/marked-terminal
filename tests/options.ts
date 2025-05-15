import { notEqual, equal } from 'assert';
// @ts-ignore
import Renderer from '../dist/index.js';
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

interface RendererOptions {
  [key: string]: any;
  emoji?: boolean;
  tab?: number | string;
  image?: (text: string, options?: any) => string;
}

const defaultOptions: RendererOptions = {};
opts.forEach(function (opt) {
  defaultOptions[opt] = identity;
});

defaultOptions.emoji = false;

describe('Options', function () {
  const r = new Renderer(defaultOptions);

  beforeEach(function () {
    resetMarked();
  });

  it('should not translate emojis', function () {
    const markdownText = 'Some :emoji:';

    notEqual(
      marked(markdownText, {
        renderer: r,
        async: false
      }).indexOf(':emoji:'),
      -1
    );
  });

  it('should change tabs by space size', function () {
    const options = Object.assign({}, defaultOptions, { tab: 4 });
    const r = new Renderer(options);

    const blockquoteText = '> Blockquote';
    equal(marked(blockquoteText, { renderer: r }), '    Blockquote\n\n');

    const listText = '* List Item';
    equal(marked(listText, { renderer: r }), '    * List Item\n\n');
  });

  it('should use default tabs if passing not supported string', function () {
    const options = Object.assign({}, defaultOptions, { tab: 'dsakdskajhdsa' });
    const r = new Renderer(options);

    const blockquoteText = '> Blockquote';
    equal(marked(blockquoteText, { renderer: r }), '    Blockquote\n\n');

    const listText = '* List Item';
    equal(marked(listText, { renderer: r }), '    * List Item\n\n');
  });

  it('should change tabs by allowed characters', function () {
    const options = Object.assign({}, defaultOptions, { tab: '\t' });
    const r = new Renderer(options);

    const blockquoteText = '> Blockquote';
    equal(marked(blockquoteText, { renderer: r }), '\tBlockquote\n\n');

    const listText = '* List Item';
    equal(marked(listText, { renderer: r }), '\t* List Item\n\n');
  });

  it('should support mulitple tab characters', function () {
    const options = Object.assign({}, defaultOptions, { tab: '\t\t' });
    const r = new Renderer(options);

    const blockquoteText = '> Blockquote';
    equal(marked(blockquoteText, { renderer: r }), '\t\tBlockquote\n\n');

    const listText = '* List Item';
    equal(marked(listText, { renderer: r }), '\t\t* List Item\n\n');
  });

  it('should support overriding image handling', function () {
    const options = Object.assign({}, defaultOptions, {
      image: function (): string {
        return 'IMAGE';
      }
    });
    const r = new Renderer(options);

    const text = `
# Title
![Alt text](./img.jpg)`;
    equal(
      marked(text, { renderer: r }),
      `# Title

IMAGE

`
    );
  });
});