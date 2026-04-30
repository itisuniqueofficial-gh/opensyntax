export function withTimeout(controller: AbortController, timeoutMs: number): NodeJS.Timeout {
	return setTimeout(() => controller.abort(new Error('Request timeout')), timeoutMs);
}
