import * as process from 'process';
import {createSupportsColor} from './supports-color.js';
import hasFlag from 'has-flag';

interface VersionInfo {
  major: number;
  minor: number;
  patch: number;
}

interface Stream {
  isTTY?: boolean;
}

function parseVersion(versionString: string = ''): VersionInfo {
	if (/^\d{3,4}$/.test(versionString)) {
		// Env var doesn't always use dots. example: 4601 => 46.1.0
		const match = /((\d{1,2})(\d{2}))/.exec(versionString) ?? [];
		return {
			major: 0,
			minor: Number.parseInt(match[1] ?? '0', 10),
			patch: Number.parseInt(match[2] ?? '0', 10),
		};
	}

	const versions = (versionString ?? '').split('.').map(n => Number.parseInt(n, 10));
	return {
		major: versions[0] || 0,
		minor: versions[1] || 0,
		patch: versions[2] || 0,
	};
}

// eslint-disable-next-line complexity
export function createSupportsHyperlinks(stream?: Stream): boolean {
	const {
		CI,
		CURSOR_TRACE_ID,
		FORCE_HYPERLINK,
		NETLIFY,
		TEAMCITY_VERSION,
		TERM_PROGRAM,
		TERM_PROGRAM_VERSION,
		VTE_VERSION,
		TERM,
	} = process.env;

	if (FORCE_HYPERLINK) {
		return !(FORCE_HYPERLINK.length > 0 && Number.parseInt(FORCE_HYPERLINK, 10) === 0);
	}

	if (hasFlag('no-hyperlink') || hasFlag('no-hyperlinks') || hasFlag('hyperlink=false') || hasFlag('hyperlink=never')) {
		return false;
	}

	if (hasFlag('hyperlink=true') || hasFlag('hyperlink=always')) {
		return true;
	}

	// Netlify does not run a TTY, it does not need `supportsColor` check
	if (NETLIFY) {
		return true;
	}

	// If they specify no colors, they probably don't want hyperlinks.
	if (!createSupportsColor(stream)) {
		return false;
	}

	if (stream && !stream.isTTY) {
		return false;
	}

	// Windows Terminal
	if ('WT_SESSION' in process.env) {
		return true;
	}

	if (process.platform === 'win32') {
		return false;
	}

	if (CI) {
		return false;
	}

	if (TEAMCITY_VERSION) {
		return false;
	}

	if (TERM_PROGRAM) {
		const version = parseVersion(TERM_PROGRAM_VERSION);

		switch (TERM_PROGRAM) {
			case 'iTerm.app': {
				if (version.major === 3) {
					return version.minor >= 1;
				}

				return version.major > 3;
			}

			case 'WezTerm': {
				return version.major >= 20_200_620;
			}

			case 'vscode': {
				// Cursor forked VS Code and supports hyperlinks in 0.x.x
				if (CURSOR_TRACE_ID) {
					return true;
				}

				// eslint-disable-next-line no-mixed-operators
				return version.major > 1 || version.major === 1 && version.minor >= 72;
			}

			case 'ghostty': {
				return true;
			}
			// No default
		}
	}

	if (VTE_VERSION) {
		// 0.50.0 was supposed to support hyperlinks, but throws a segfault
		if (VTE_VERSION === '0.50.0') {
			return false;
		}

		const version = parseVersion(VTE_VERSION);
		return version.major > 0 || version.minor >= 50;
	}

	switch (TERM) {
		case 'alacritty': {
			// Support added in v0.11 (2022-10-13)
			return true;
		}
		// No default
	}

	return false;
}

interface SupportsHyperlinks {
	stdout: boolean;
	stderr: boolean;
}

const supportsHyperlinks: SupportsHyperlinks = {
	stdout: createSupportsHyperlinks(process.stdout),
	stderr: createSupportsHyperlinks(process.stderr),
};

export default supportsHyperlinks;