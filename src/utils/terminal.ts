import stringWidth from 'string-width';
import sliceAnsi from 'slice-ansi';
import wrapAnsi from 'wrap-ansi';
import stripAnsi from 'strip-ansi';

export type TerminalLayout = 'compact' | 'medium' | 'wide';

export function getTerminalLayout(width: number, height: number): TerminalLayout {
	if (width < 80 || height < 24) {
		return 'compact';
	}

	if (width < 120) {
		return 'medium';
	}

	return 'wide';
}

export function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

export function truncateText(value: string, width: number): string {
	if (width <= 0) {
		return '';
	}

	if (stringWidth(value) <= width) {
		return value;
	}

	if (width <= 1) {
		return '…';
	}

	return `${sliceAnsi(value, 0, width - 1)}…`;
}

export function wrapText(value: string, width: number, maxLines = Number.POSITIVE_INFINITY): string[] {
	if (width <= 0) {
		return [];
	}

	const wrapped = wrapAnsi(value.replace(/\r/g, ''), width, {hard: true, trim: false})
		.split('\n')
		.map(line => truncateText(line, width));

	if (wrapped.length <= maxLines) {
		return wrapped;
	}

	return [...wrapped.slice(0, Math.max(0, maxLines - 1)), truncateText('[truncated]', width)];
}

export function visibleWidth(value: string): number {
	return stringWidth(stripAnsi(value));
}
