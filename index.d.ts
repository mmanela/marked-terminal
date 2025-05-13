import type { Chalk } from 'chalk'
import type { HighlightOptions } from 'cli-highlight'
import type { MarkedExtension } from 'marked'

export interface MarkedTerminalOptions {
	/**
	 * The color function for headings in the terminal output
	 */
	heading?: Chalk

	/**
	 * The color function for the first heading in the terminal output
	 */
	firstHeading?: Chalk

	/**
	 * The color function for tables in the terminal output
	 */
	table?: Chalk

	/**
	 * The color function for table cells in the terminal output
	 */
	tableCell?: Chalk

	/**
	 * The color function for code blocks in the terminal output
	 */
	code?: Chalk

	/**
	 * The color function for code spans in the terminal output
	 */
	codespan?: Chalk

	/**
	 * The color function for blockquotes in the terminal output
	 */
	blockquote?: Chalk

	/**
	 * The color function for HTML in the terminal output
	 */
	html?: Chalk

	/**
	 * The color function for list items in the terminal output
	 */
	listitem?: Chalk

	/**
	 * The color function for list numbers in the terminal output
	 */
	listitemnumber?: Chalk

	/**
	 * The list mapping function
	 */
	list?: Chalk

	/**
	 * The color function for horizontal rules in the terminal output
	 */
	hr?: Chalk

	/**
	 * The color function for paragraphs in the terminal output
	 */
	paragraph?: Chalk

	/**
	 * The color function for strong text in the terminal output
	 */
	strong?: ChalkInstance

	/**
	 * The color function for emphasized text in the terminal output
	 */
	em?: Chalk

	/**
	 * The color function for deleted text in the terminal output
	 */
	del?: Chalk

	/**
	 * The color function for link text in the terminal output
	 */
	link?: Chalk

	/**
	 * The color function for URLs in the terminal output
	 */
	href?: Chalk

	/**
	 * The function to transform text
	 */
	text?: Chalk

	/**
	 * Whether to unescape entities. Default: true
	 */
	unescape?: boolean

	/**
	 * Whether to enable emoji support. Default: true
	 */
	emoji?: boolean

	/**
	 * Maximum allowed width before wrapping. Default: 80
	 */
	width?: number

	/**
	 * Whether to show section prefixes. Default: true
	 */
	showSectionPrefix?: boolean

	/**
	 * Whether to reflow text. Default: false
	 */
	reflowText?: boolean

	/**
	 * Tab size. Default: 4
	 */
	tab?: number

	/**
	 * Table rendering options
	 */
	tableOptions?: object
}

/**
 * Terminal renderer for marked
 *
 * @param options - Terminal rendering options
 * @param highlightOptions - Options for code highlighting
 * @returns The marked extension object
 */
export function markedTerminal(
	options?: MarkedTerminalOptions,
	highlightOptions?: HighlightOptions,
): MarkedExtension

export default class Renderer {
	constructor(options?: MarkedTerminalOptions, highlightOptions?: HighlightOptions);
}
