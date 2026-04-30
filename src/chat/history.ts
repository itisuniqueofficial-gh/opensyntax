export class InputHistory {
	private entries: string[] = [];
	private index = 0;

	add(value: string): void {
		const trimmed = value.trim();
		if (!trimmed) {
			return;
		}

		this.entries = [trimmed, ...this.entries.filter(entry => entry !== trimmed)].slice(0, 100);
		this.index = -1;
	}

	previous(): string | null {
		if (this.entries.length === 0) {
			return null;
		}

		this.index = Math.min(this.entries.length - 1, this.index + 1);
		return this.entries[this.index] ?? null;
	}

	next(): string | null {
		if (this.entries.length === 0) {
			return null;
		}

		this.index = Math.max(-1, this.index - 1);
		return this.index === -1 ? '' : this.entries[this.index] ?? null;
	}
}
