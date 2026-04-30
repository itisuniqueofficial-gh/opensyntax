export function normalizeProviderError(status?: number, message = 'Request failed'): Error {
	const lower = message.toLowerCase();
	if (status === 401 || lower.includes('api key') || lower.includes('unauthorized')) {
		return new Error('Invalid API key or unauthorized provider request. Check /config.');
	}

	if (status === 404 || lower.includes('model')) {
		return new Error('Model not found or unavailable for this provider. Check /model.');
	}

	if (status === 429 || lower.includes('rate limit')) {
		return new Error('Rate limit reached. Wait and try again.');
	}

	if (lower.includes('timeout') || lower.includes('abort')) {
		return new Error('Request timed out or was cancelled.');
	}

	if (lower.includes('fetch failed') || lower.includes('network')) {
		return new Error('Network failure. Check base URL and provider availability.');
	}

	if (status && status >= 500) {
		return new Error('Provider is unavailable or returned a server error.');
	}

	return new Error(message);
}
