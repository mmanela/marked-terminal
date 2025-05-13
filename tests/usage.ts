import { equal, notEqual } from 'assert';
import Renderer from '../index.js';
import marked, { resetMarked } from './_marked.js';

type IdentityFn = (o: any) => any;

const identity: IdentityFn = function (o) {
  return o;
};

function stripTermEsc(str: string): string {
  return str.replace(/\u001b\[\d{1,2}m/g, '');
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
  tableOptions?: {
    chars?: {
      [key: string]: string;
    };
  };
  reflowText?: boolean;
  showSectionPrefix?: boolean;
  width?: number;
}

const defaultOptions: RendererOptions = {};
opts.forEach(function (opt) {
  defaultOptions[opt] = identity;
});

const defaultOptions2: RendererOptions = {};
opts.forEach(function (opt) {
  defaultOptions[opt] = identity;
});
defaultOptions2.reflowText = true;
defaultOptions2.showSectionPrefix = false;
defaultOptions2.width = 10;

defaultOptions.tableOptions = {
  chars: { top: '@@@@TABLE@@@@@' }
};

function markup(str: string, gfm = false): string {
  const r = new Renderer(defaultOptions2);
  const markedOptions = {
    renderer: r,
    gfm: gfm
  };
  return stripTermEsc(marked(str, markedOptions));
}

describe('Renderer', function () {
  const r = new Renderer(defaultOptions);
  const markedOptions = {
    renderer: r
  };

  beforeEach(function () {
    resetMarked();
  });

  it('should render links', function () {
    const text = '[Google](http://google.com)';
    const expected = 'Google (http://google.com)';
    equal(marked(text, markedOptions).trim(), expected);
  });

  it('should pass on options to table', function () {
    const text =
      '| Lorem | Ipsum | Sit amet     | Dolar  |\n' +
      '|------|------|----------|----------|\n' +
      '| Row 1  | Value    | Value  | Value |\n' +
      '| Row 2  | Value    | Value  | Value |\n' +
      '| Row 3  | Value    | Value  | Value |\n' +
      '| Row 4  | Value    | Value  | Value |';

    notEqual(marked(text, markedOptions).indexOf('@@@@TABLE@@@@@'), -1);
  });

  it('should not show link href twice if link and url is equal', function () {
    const text = 'http://google.com';
    equal(marked(text, markedOptions).trim(), text);
  });

  it('should render html as html', function () {
    const html = '<strong>foo</strong>';
    equal(marked(html, markedOptions).trim(), html);
  });

  it('should not escape entities', function () {
    const text =
      '# This < is "foo". it\'s a & string\n' +
      '> This < is "foo". it\'s a & string\n\n' +
      'This < is **"foo"**. it\'s a & string\n' +
      'This < is "foo". it\'s a & string';

    const expected =
      '# This < is "foo". it\'s a & string\n\n' +
      '    This < is "foo". it\'s a & string\n\n' +
      'This < is "foo". it\'s a & string\n' +
      'This < is "foo". it\'s a & string';
    equal(marked(text, markedOptions).trim(), expected);
  });

  it('should not translate emojis inside codespans', function () {
    const markdownText = 'Some `:+1:`';

    notEqual(marked(markdownText, markedOptions).indexOf(':+1:'), -1);
  });

  it('should translate emojis', function () {
    const markdownText = 'Some :+1:';
    equal(marked(markdownText, markedOptions).indexOf(':+1'), -1);
  });

  it('should show default if not supported emojis', function () {
    const markdownText = 'Some :someundefined:';
    notEqual(
      marked(markdownText, markedOptions).indexOf(':someundefined:'),
      -1
    );
  });

  it('should not escape entities', function () {
    const markdownText =
      'Usage | Syntax' +
      '\r\n' +
      '------|-------' +
      '\r\n' +
      'General |`$ shell <CommandParam>`';

    notEqual(marked(markdownText, markedOptions).indexOf('<CommandParam>'), -1);
  });

  it('should reflow paragraph and split words that are too long (one break)', function () {
    const text = 'Now is the time: 01234567890\n';
    const expected = 'Now is the\ntime: 0123\n4567890\n\n';
    equal(markup(text), expected);
  });

  it('should reflow paragraph and split words that are too long (two breaks)', function () {
    const text = 'Now is the time: http://timeanddate.com\n';
    const expected = 'Now is the\ntime: http\n://timeand\ndate.com\n\n';
    equal(markup(text), expected);
  });

  it('should reflow paragraph', function () {
    const text = 'Now is the time\n';
    const expected = 'Now is the\ntime\n\n';
    equal(markup(text), expected);
  });

  it('should nuke section header', function () {
    const text = '# Contents\n';
    const expected = 'Contents\n\n';
    equal(markup(text), expected);
  });

  it('should reflow and nuke section header', function () {
    const text = '# Now is the time\n';
    const expected = 'Now is the\ntime\n\n';
    equal(markup(text), expected);
  });

  // @TODO There's an issue when running at GH Actions that cannot
  // be reproduced right now.
  // it('should preserve line breaks (non gfm)', function () {
  //   let text = 'Now  \nis    \nthe<br/>time\n';
  //   let expected = 'Now\nis\nthe<br/>\ntime\n\n';
  //   equal(markup(text, false), expected);
  // });

  it('should preserve line breaks (gfm)', function () {
    const text = 'Now  \nis    \nthe<br />time\n';
    const expected = 'Now\nis\nthe\ntime\n\n';
    equal(markup(text, true), expected);
  });

  it('should render ordered and unordered list with same newlines', function () {
    const ul = '* ul item\n' + '* ul item';
    const ol = '1. ol item\n' + '2. ol item';
    const before = '';
    const after = '\n\n';

    equal(markup(ul), before + '    * ul item\n' + '    * ul item' + after);

    equal(markup(ol), before + '    1. ol item\n' + '    2. ol item' + after);
  });

  it('should render nested lists', function () {
    const ul = '* ul item\n' + '    * ul item';
    const ol = '1. ol item\n' + '    1. ol item';
    const olul = '1. ol item\n' + '    * ul item';
    const ulol = '* ul item\n' + '    1. ol item';
    const before = '';
    const after = '\n\n';

    equal(markup(ul), before + '    * ul item\n' + '        * ul item' + after);

    equal(
      markup(ol),
      before + '    1. ol item\n' + '        1. ol item' + after
    );

    equal(
      markup(olul),
      before + '    1. ol item\n' + '        * ul item' + after
    );

    equal(
      markup(ulol),
      before + '    * ul item\n' + '        1. ol item' + after
    );
  });

  it('should render task items', function () {
    const tasks = '* [ ] task item\n' + '* [X] task item';
    const before = '';
    const after = '\n\n';

    equal(
      markup(tasks),
      before + '    * [ ] task item\n' + '    * [X] task item' + after
    );
  });
});