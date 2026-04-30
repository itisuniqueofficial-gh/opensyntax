export function maskSecret(secret: string): string {
	if (!secret) {
		return '(not set)';
	}

	const suffix = secret.slice(-4);
	const prefix = secret.startsWith('sk-') ? 'sk-' : '';
	return `${prefix}****${suffix}`;
}
