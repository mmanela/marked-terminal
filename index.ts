'use strict';

import ansiEscapes from 'ansi-escapes';
import ansiRegex from 'ansi-regex';
import chalk from 'chalk';
import { highlight as highlightCli } from 'cli-highlight';
import Table from 'cli-table3';
import * as emoji from 'node-emoji';
import supportsHyperlinks from './supports-hyperlinks.js'; 
import { Parser, Tokens } from 'marked';

// Type definitions
type ChalkFunction = (text: string) => string;
type TransformFunction = (text: string) => string;

interface RendererOptions {
    code: ChalkFunction;
    blockquote: ChalkFunction;
    html: ChalkFunction;
    heading: ChalkFunction;
    firstHeading: ChalkFunction;
    hr: ChalkFunction;
    listitem: ChalkFunction;
    list: (body: string, ordered: boolean, indent: string) => string;
    table: ChalkFunction;
    paragraph: ChalkFunction;
    strong: ChalkFunction;
    em: ChalkFunction;
    codespan: ChalkFunction;
    del: ChalkFunction;
    link: ChalkFunction;
    href: ChalkFunction;
    text: TransformFunction;
    unescape: boolean;
    emoji: boolean;
    width: number;
    showSectionPrefix: boolean;
    reflowText: boolean;
    tab: number | string;
    tableOptions: Record<string, any>;
    image?: (href: string, title: string | null, text: string) => string;
}

interface HighlightOptions {
    language?: string;
    [key: string]: any;
}

const TABLE_CELL_SPLIT = '^*||*^';
const TABLE_ROW_WRAP = '*|*|*|*';
const TABLE_ROW_WRAP_REGEXP = new RegExp(escapeRegExp(TABLE_ROW_WRAP), 'g');

const COLON_REPLACER = '*#COLON|*';
const COLON_REPLACER_REGEXP = new RegExp(escapeRegExp(COLON_REPLACER), 'g');

const TAB_ALLOWED_CHARACTERS = ['\t'];

const ANSI_REGEXP = ansiRegex();

// HARD_RETURN holds a character sequence used to indicate text has a
// hard (no-reflowing) line break.  Previously \r and \r\n were turned
// into \n in marked's lexer- preprocessing step. So \r is safe to use
// to indicate a hard (non-reflowed) return.
const HARD_RETURN = '\r',
    HARD_RETURN_RE = new RegExp(HARD_RETURN),
    HARD_RETURN_GFM_RE = new RegExp(HARD_RETURN + '|<br />');

const defaultOptions: RendererOptions = {
    code: chalk.yellow,
    blockquote: chalk.gray.italic,
    html: chalk.gray,
    heading: chalk.green.bold,
    firstHeading: chalk.magenta.underline.bold,
    hr: chalk.reset,
    listitem: chalk.reset,
    list: list,
    table: chalk.reset,
    paragraph: chalk.reset,
    strong: chalk.bold,
    em: chalk.italic,
    codespan: chalk.yellow,
    del: chalk.dim.gray.strikethrough,
    link: chalk.blue,
    href: chalk.blue.underline,
    text: identity,
    unescape: true,
    emoji: true,
    width: 80,
    showSectionPrefix: true,
    reflowText: false,
    tab: 4,
    tableOptions: {}
};

class Renderer {
    o: RendererOptions;
    tab: string;
    tableSettings: Record<string, any>;
    emoji: TransformFunction;
    unescape: TransformFunction;
    highlightOptions: HighlightOptions;
    transform: TransformFunction;
    options: any;
    parser: Parser;

    constructor(options?: Partial<RendererOptions>, highlightOptions?: HighlightOptions) {
        this.o = Object.assign({}, defaultOptions, options);
        this.tab = sanitizeTab(this.o.tab, defaultOptions.tab);
        this.tableSettings = this.o.tableOptions;
        this.emoji = this.o.emoji ? insertEmojis : identity;
        this.unescape = this.o.unescape ? unescapeEntities : identity;
        this.highlightOptions = highlightOptions || {};

        this.transform = compose(undoColon, this.unescape, this.emoji);

        // No op parser
        this.parser = {
            parse: () => "",
            parseInline: () => "",
            options: {}
        } as any

    }

    // Compute length of str not including ANSI escape codes.
    // See http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
    textLength(str: string): number {
        return str.replace(ANSI_REGEXP, '').length;
    }

    space(): string {
        return '';
    }

    text(text: Tokens.Text | Tokens.Escape): string {
        const textStr = text.text || '';
        return this.o.text(textStr);
    }

    code(code: Tokens.Code): string {
        const lang = code.lang;
        // Note: escaped is available on the token but not used in this implementation
        const codeStr = code.text || '';
        return section(
            indentify(this.tab, highlight(codeStr, lang, this.o, this.highlightOptions))
        );
    }

    blockquote(quote: Tokens.Blockquote): string {
        const quoteStr = this.parser.parse(quote.tokens || []);
        return section(this.o.blockquote(indentify(this.tab, quoteStr.trim())));
    }

    html(html: Tokens.HTML): string {
        const htmlStr = html.text || '';
        return this.o.html(htmlStr);
    }

    heading(text: Tokens.Heading): string {
        const level = text.depth;
        let textStr = this.parser.parseInline(text.tokens || []);
        textStr = this.transform(textStr);

        const prefix = this.o.showSectionPrefix
            ? new Array(level + 1).join('#') + ' '
            : '';
        textStr = prefix + textStr;
        if (this.o.reflowText) {
            textStr = reflowText(textStr, this.o.width, this.options?.gfm);
        }
        return section(
            level === 1 ? this.o.firstHeading(textStr) : this.o.heading(textStr)
        );
    }

    hr(): string {
        return section(this.o.hr(hr('-', this.o.reflowText ? this.o.width : undefined)));
    }

    list(listToken: Tokens.List): string {
        const ordered = listToken.ordered;
        let bodyStr = '';
        for (let j = 0; j < (listToken.items?.length || 0); j++) {
            bodyStr += this.listitem(listToken.items[j]!);
        }
        
        bodyStr = this.o.list(bodyStr, ordered || false, this.tab);
        return section(fixNestedLists(indentLines(this.tab, bodyStr), this.tab));
    }

    listitem(item: Tokens.ListItem): string {
        let textStr = '';
        if (item.task) {
            const checkboxStr = '[' + (item.checked ? 'X' : ' ') + '] ';
            if (item.loose) {
                if (item.tokens && item.tokens.length > 0  && item.tokens[0] && item.tokens[0].type === 'paragraph') {
                    item.tokens[0].text = checkboxStr + ' ' + (item.tokens[0].text || '');
                    if (
                        item.tokens[0].tokens &&
                        item.tokens[0].tokens.length > 0 &&
                        item.tokens[0].tokens[0] &&
                        item.tokens[0].tokens[0].type === 'text'
                    ) {
                        item.tokens[0].tokens[0].text =
                            checkboxStr + ' ' + (item.tokens[0].tokens[0].text || '');
                    }
                } else {
                    item.tokens = item.tokens || [];
                    item.tokens.unshift({
                        type: 'text',
                        raw: checkboxStr + ' ',
                        text: checkboxStr + ' '
                    });
                }
            } else {
                textStr += checkboxStr;
            }
        }

        textStr += this.parser.parse(item.tokens || [], !!item.loose);
        
        const transform = compose(this.o.listitem, this.transform);
        const isNested = textStr.indexOf('\n') !== -1;
        if (isNested) textStr = textStr.trim();

        // Use BULLET_POINT as a marker for ordered or unordered list item
        return '\n' + BULLET_POINT + transform(textStr);
    }

    checkbox(checkbox: Tokens.Checkbox): string {
        const checked = checkbox.checked;
        return '[' + (checked ? 'X' : ' ') + '] ';
    }

    paragraph(paragraph: Tokens.Paragraph): string {
        let textStr = this.parser.parseInline(paragraph.tokens || []);
        const transform = compose(this.o.paragraph, this.transform);
        textStr = transform(textStr);
        if (this.o.reflowText) {
            textStr = reflowText(textStr, this.o.width, this.options?.gfm);
        }
        return section(textStr);
    }

    table(token: Tokens.Table): string {
        let headerStr = '';

        // header
        let cell = '';
        for (let j = 0; j < (token.header?.length || 0); j++) {
            cell += this.tablecell(token.header![j]!);
        }
        headerStr += this.tablerow({ text: cell });

        let bodyStr = '';
        for (let j = 0; j < (token.rows?.length || 0); j++) {
            const row = token.rows![j]!;

            cell = '';
            for (let k = 0; k < row.length; k++) {
                cell += this.tablecell(row[k]!);
            }

            bodyStr += this.tablerow({ text: cell });
        }
        const table = new Table(
            Object.assign(
                {},
                {
                    head: generateTableRow(headerStr)[0]
                },
                this.tableSettings
            )
        );

        generateTableRow(bodyStr, this.transform).forEach(function (row) {
            table.push(row);
        });
        return section(this.o.table(table.toString()));
    }

    tablerow(row: Tokens.TableRow): string {
        const content = row.text;
        return TABLE_ROW_WRAP + content + TABLE_ROW_WRAP + '\n';
    }

    tablecell(cell: Tokens.TableCell): string {
        const content = this.parser.parseInline(cell.tokens || []);
        return content + TABLE_CELL_SPLIT;
    }

    // span level renderer
    strong(strong: Tokens.Strong): string {
        const text = this.parser.parseInline(strong.tokens || []);
        return this.o.strong(text);
    }

    em(em: Tokens.Em): string {
        let text = this.parser.parseInline(em.tokens || []);
        text = fixHardReturn(text, this.o.reflowText);
        return this.o.em(text);
    }

    codespan(codespan: Tokens.Codespan): string {
        let text = codespan.text || '';
        text = fixHardReturn(text, this.o.reflowText);
        return this.o.codespan(text.replace(/:/g, COLON_REPLACER));
    }

    br(): string {
        return this.o.reflowText ? HARD_RETURN : '\n';
    }

    del(del: Tokens.Del): string {
        const text = this.parser.parseInline(del.tokens || []);
        return this.o.del(text);
    }

    link(link: Tokens.Link): string {
        // Note: title is available on the token but not used in this implementation
        const text = this.parser.parseInline(link.tokens || []);
        const href = link.href || '';

        if (this.options?.sanitize) {
            try {
                const prot = decodeURIComponent(unescape(href))
                    .replace(/[^\w:]/g, '')
                    .toLowerCase();
                if (prot.indexOf('javascript:') === 0) {
                    return '';
                }
            } catch (e) {
                return '';
            }
        }

        const hasText = text && text !== href;

        let out = '';

        if (supportsHyperlinks.stdout) {
            let link = '';
            if (text) {
                link = this.o.href(this.emoji(text));
            } else {
                link = this.o.href(href);
            }
            out = ansiEscapes.link(
                link,
                href
                    // textLength breaks on '+' in URLs
                    .replace(/\+/g, '%20')
            );
        } else {
            if (hasText) out += this.emoji(text || '') + ' (';
            out += this.o.href(href);
            if (hasText) out += ')';
        }
        return this.o.link(out);
    }

    image(image: Tokens.Image): string {
        const title = image.title || null;
        const text = image.text || '';
        const href = image.href || '';

        if (typeof this.o.image === 'function') {
            return this.o.image(href, title, text);
        }
        let out = '![' + text;
        if (title) out += ' – ' + title;
        return out + '](' + href + ')\n';
    }
}

export default Renderer;

export function markedTerminal(options?: Partial<RendererOptions>, highlightOptions?: HighlightOptions) {
    const r = new Renderer(options, highlightOptions);

    const funcs = [
        'text',
        'code',
        'blockquote',
        'html',
        'heading',
        'hr',
        'list',
        'listitem',
        'checkbox',
        'paragraph',
        'table',
        'tablerow',
        'tablecell',
        'strong',
        'em',
        'codespan',
        'br',
        'del',
        'link',
        'image'
    ];

    return funcs.reduce(
        (extension: any, func: string) => {
            extension.renderer[func] = function (...args: any[]) {
                r.options = this.options;
                r.parser = this.parser;
                return (r as any)[func](...args);
            };
            return extension;
        },
        { renderer: {}, useNewRenderer: true }
    );
}

// Munge \n's and spaces in "text" so that the number of
// characters between \n's is less than or equal to "width".
function reflowText(text: string, width: number, gfm?: boolean): string {
    // Hard break was inserted by Renderer.prototype.br or is
    // <br /> when gfm is true
    const splitRe = gfm ? HARD_RETURN_GFM_RE : HARD_RETURN_RE,
        sections = text.split(splitRe),
        reflowed: string[] = [];

    sections.forEach(function (section) {
        // Split the section by escape codes so that we can
        // deal with them separately.
        const fragments = section.split(/(\u001b\[(?:\d{1,3})(?:;\d{1,3})*m)/g);
        let column = 0;
        let currentLine = '';
        let lastWasEscapeChar = false;

        while (fragments.length) {
            const fragment = fragments[0];

            if (fragment === '') {
                fragments.splice(0, 1);
                lastWasEscapeChar = false;
                continue;
            }

            // This is an escape code - leave it whole and
            // move to the next fragment.
            if (!textLength(fragment!)) {
                currentLine += fragment;
                fragments.splice(0, 1);
                lastWasEscapeChar = true;
                continue;
            }

            const words = fragment!.split(/[ \t\n]+/);

            for (let i = 0; i < words.length; i++) {
                const word = words[i]!;
                const addSpace = column != 0;
                if (lastWasEscapeChar) lastWasEscapeChar = false;

                // If adding the new word overflows the required width
                if (column + word.length + (addSpace ? 1 : 0) > width) {
                    if (word.length <= width) {
                        // If the new word is smaller than the required width
                        // just add it at the beginning of a new line
                        reflowed.push(currentLine);
                        currentLine = word;
                        column = word!.length;
                    } else {
                        // If the new word is longer than the required width
                        // split this word into smaller parts.
                        const w = word!.substr(0, width - column - (addSpace ? 1 : 0));
                        if (addSpace) currentLine += ' ';
                        currentLine += w;
                        reflowed.push(currentLine);
                        currentLine = '';
                        column = 0;

                        let remainingWord = word.substr(w.length);
                        while (remainingWord.length) {
                            const w = remainingWord.substr(0, width);

                            if (!w.length) break;

                            if (w.length < width) {
                                currentLine = w;
                                column = w.length;
                                break;
                            } else {
                                reflowed.push(w);
                                remainingWord = remainingWord.substr(width);
                            }
                        }
                    }
                } else {
                    if (addSpace) {
                        currentLine += ' ';
                        column++;
                    }

                    currentLine += word;
                    column += word.length ?? 0;
                }
            }

            fragments.splice(0, 1);
        }

        if (textLength(currentLine)) reflowed.push(currentLine);
    });

    return reflowed.join('\n');
}

function indentLines(indent: string, text: string): string {
    return text.replace(/(^|\n)(.+)/g, '$1' + indent + '$2');
}

function indentify(indent: string, text: string): string {
    if (!text) return text;
    return indent + text.split('\n').join('\n' + indent);
}

const BULLET_POINT_REGEX = '\\*';
const NUMBERED_POINT_REGEX = '\\d+\\.';
const POINT_REGEX =
    '(?:' + [BULLET_POINT_REGEX, NUMBERED_POINT_REGEX].join('|') + ')';

// Prevents nested lists from joining their parent list's last line
function fixNestedLists(body: string, indent: string): string {
    const regex = new RegExp(
        '' +
        '(\\S(?: |  )?)' + // Last char of current point, plus one or two spaces
        // to allow trailing spaces
        '((?:' +
        indent +
        ')+)' + // Indentation of sub point
        '(' +
        POINT_REGEX +
        '(?:.*)+)$',
        'gm'
    ); // Body of subpoint
    return body.replace(regex, '$1\n' + indent + '$2$3');
}

function isPointedLine(line: string, indent: string): boolean {
    return !!line.match('^(?:' + indent + ')*' + POINT_REGEX);
}

function toSpaces(str: string): string {
    return ' '.repeat(str.length);
}

const BULLET_POINT = '* ';
function bulletPointLine(indent: string, line: string): string {
    return isPointedLine(line, indent) ? line : toSpaces(BULLET_POINT) + line;
}

function bulletPointLines(lines: string, indent: string): string {
    const transform = bulletPointLine.bind(null, indent);
    return lines.split('\n').filter(identity).map(transform).join('\n');
}

function numberedPoint(n: number): string {
    return n + '. ';
}

interface NumberedLineResult {
    num: number;
    line: string;
}

function numberedLine(indent: string, line: string, num: number): NumberedLineResult {
    return isPointedLine(line, indent)
        ? {
            num: num + 1,
            line: line.replace(BULLET_POINT, numberedPoint(num + 1))
        }
        : {
            num,
            line: toSpaces(numberedPoint(num)) + line
        };
}

function numberedLines(lines: string, indent: string): string {
    const transform = numberedLine.bind(null, indent);
    let num = 0;
    return lines
        .split('\n')
        .filter(identity)
        .map((line) => {
            const numbered = transform(line, num);
            num = numbered.num;

            return numbered.line;
        })
        .join('\n');
}

function list(body: string, ordered: boolean, indent: string): string {
    body = body.trim();
    body = ordered ? numberedLines(body, indent) : bulletPointLines(body, indent);
    return body;
}

function section(text: string): string {
    return text + '\n\n';
}

function highlight(code: string, language: string | undefined, opts: RendererOptions, hightlightOpts: HighlightOptions): string {
    const style = opts.code;

    code = fixHardReturn(code, opts.reflowText);

    try {
        return highlightCli(code, Object.assign({}, { language }, hightlightOpts));
    } catch (e) {
        return style(code);
    }
}

function insertEmojis(text: string): string {
    return text.replace(/:([A-Za-z0-9_\-\+]+?):/g, function (emojiString) {
        const emojiSign = emoji.get(emojiString);
        if (!emojiSign) return emojiString;
        return emojiSign + ' ';
    });
}

function hr(inputHrStr: string, length?: number): string {
    length = length || process.stdout.columns;
    return new Array(length || 80).join(inputHrStr);
}

function undoColon(str: string): string {
    return str.replace(COLON_REPLACER_REGEXP, ':');
}

function generateTableRow(text: string, escape?: TransformFunction): string[][] {
    if (!text) return [];
    escape = escape || identity;
    const lines = escape(text).split('\n');

    const data: string[][] = [];
    lines.forEach(function (line) {
        if (!line) return;
        const parsed = line
            .replace(TABLE_ROW_WRAP_REGEXP, '')
            .split(TABLE_CELL_SPLIT);

        data.push(parsed.splice(0, parsed.length - 1));
    });
    return data;
}

function escapeRegExp(str: string): string {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
}

function unescapeEntities(html: string): string {
    return html
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}

function identity(str: string): string {
    return str;
}

function compose(...funcs: Function[]): TransformFunction {
    return function (str: string): string {
        let args = [str];
        for (let i = funcs.length; i-- > 0;) {
            args = [funcs[i]?.apply(null, args)];
        }
        return args[0]!;
    };
}

function isAllowedTabString(string: string): boolean {
    return TAB_ALLOWED_CHARACTERS.some(function (char) {
        return !!string.match('^(' + char + ')+$');
    });
}

function sanitizeTab(tab: string | number, fallbackTab: string | number): string {
    if (typeof tab === 'number') {
        return new Array(tab + 1).join(' ');
    } else if (typeof tab === 'string' && isAllowedTabString(tab)) {
        return tab;
    } else {
        return new Array((typeof fallbackTab === 'number' ? fallbackTab : 4) + 1).join(' ');
    }
}

function fixHardReturn(text: string, reflow?: boolean): string {
    return reflow ? text.replace(HARD_RETURN, '\n') : text;
}

function textLength(str: string): number {
    return str.replace(ANSI_REGEXP, '').length;
}