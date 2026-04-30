export type TerminalLayout = 'compact' | 'medium' | 'wide';

export function getTerminalLayout(width: number, height: number): TerminalLayout {
	if (width < 72 || height < 22) {
		return 'compact';
	}

	if (width < 110) {
		return 'medium';
	}

	return 'wide';
}

export function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}
