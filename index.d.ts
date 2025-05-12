declare module 'markedTerminal' {
	import type { HighlightOptions } from 'cli-highlight'
	import type { MarkedExtension } from 'marked'

	export interface MarkedTerminalOptions {
		/**
		 * The color of headings in the terminal output
		 */
		heading?: string

		/**
		 * The color of tables in the terminal output
		 */
		table?: string

		/**
		 * The color of table cells in the terminal output
		 */
		tableCell?: string

		/**
		 * The color of code blocks in the terminal output
		 */
		code?: string

		/**
		 * The color of blockquotes in the terminal output
		 */
		blockquote?: string

		/**
		 * The color of list bullets in the terminal output
		 */
		listitem?: string

		/**
		 * The color of list numbers in the terminal output
		 */
		listitemnumber?: string

		/**
		 * The color of horizontal rules in the terminal output
		 */
		hr?: string

		/**
		 * The color of URLs in the terminal output
		 */
		href?: string

		/**
		 * Maximum allowed width before wrapping. Default: 80
		 */
		width?: number
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
}