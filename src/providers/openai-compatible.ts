import type {OpenSyntaxConfig} from '../config/schema.js';
import {getProviderDefinition} from './registry.js';
import type {ChatProvider, ChatRequest, ChatResult, ProviderDefinition} from './types.js';
import {withTimeout} from '../utils/timeout.js';
import {normalizeProviderError} from '../utils/errors.js';

type ChatCompletionResponse = {
	choices?: Array<{message?: {content?: string}; delta?: {content?: string}}>;
	usage?: {prompt_tokens?: number; completion_tokens?: number; total_tokens?: number};
	error?: {message?: string; code?: string};
};

export class OpenAICompatibleProvider implements ChatProvider {
	readonly definition: ProviderDefinition;

	constructor(private readonly config: OpenSyntaxConfig) {
		this.definition = getProviderDefinition(config.provider);
	}

	async chat({messages, signal, stream, onDelta}: ChatRequest): Promise<ChatResult> {
		const started = Date.now();
		const endpoint = `${this.config.baseUrl.replace(/\/$/, '')}/chat/completions`;
		const controller = new AbortController();
		const timeout = withTimeout(controller, this.config.timeoutMs);
		const relayAbort = () => controller.abort(signal?.reason);
		signal?.addEventListener('abort', relayAbort, {once: true});

		try {
			const response = await fetch(endpoint, {
				method: 'POST',
				signal: controller.signal,
				headers: this.createHeaders(),
				body: JSON.stringify({
					model: this.config.model,
					messages,
					temperature: 0.7,
					stream: Boolean(stream && this.config.streaming && this.definition.supportsStreaming)
				})
			});

			if (!response.ok) {
				const errorBody = (await response.json().catch(() => ({}))) as ChatCompletionResponse;
				throw normalizeProviderError(response.status, errorBody.error?.message);
			}

			if (stream && response.body) {
				const content = await readStream(response, delta => onDelta?.({content: delta}));
				return {content, responseTimeMs: Date.now() - started};
			}

			const body = (await response.json().catch(() => ({}))) as ChatCompletionResponse;
			const content = body.choices?.[0]?.message?.content?.trim();
			if (!content) {
				throw new Error('Provider returned an empty response');
			}

			return {
				content,
				responseTimeMs: Date.now() - started,
				usage: body.usage
					? {
						promptTokens: body.usage.prompt_tokens,
						completionTokens: body.usage.completion_tokens,
						totalTokens: body.usage.total_tokens
					}
					: undefined
			};
		} catch (error) {
			throw normalizeProviderError(undefined, error instanceof Error ? error.message : 'Request failed');
		} finally {
			clearTimeout(timeout);
			signal?.removeEventListener('abort', relayAbort);
		}
	}

	async health(signal?: AbortSignal): Promise<{ok: boolean; message: string; responseTimeMs?: number}> {
		const started = Date.now();
		try {
			const result = await this.chat({
				messages: [{role: 'user', content: 'Reply with OK only.'}],
				signal,
				stream: false
			});
			return {ok: true, message: result.content.slice(0, 80), responseTimeMs: Date.now() - started};
		} catch (error) {
			return {ok: false, message: error instanceof Error ? error.message : 'Provider test failed', responseTimeMs: Date.now() - started};
		}
	}

	private createHeaders(): Record<string, string> {
		const headers: Record<string, string> = {'Content-Type': 'application/json', ...this.definition.headers};
		if (this.config.apiKey) {
			headers.Authorization = `Bearer ${this.config.apiKey}`;
		}

		return headers;
	}
}

export function createProvider(config: OpenSyntaxConfig): ChatProvider {
	return new OpenAICompatibleProvider(config);
}

async function readStream(response: Response, onDelta: (delta: string) => void): Promise<string> {
	const reader = response.body?.getReader();
	if (!reader) {
		return '';
	}

	const decoder = new TextDecoder();
	let buffer = '';
	let content = '';

	while (true) {
		const {done, value} = await reader.read();
		if (done) {
			break;
		}

		buffer += decoder.decode(value, {stream: true});
		const lines = buffer.split('\n');
		buffer = lines.pop() ?? '';

		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed.startsWith('data:')) {
				continue;
			}

			const data = trimmed.slice(5).trim();
			if (data === '[DONE]') {
				return content.trim();
			}

			const parsed = JSON.parse(data) as ChatCompletionResponse;
			const delta = parsed.choices?.[0]?.delta?.content ?? '';
			if (delta) {
				content += delta;
				onDelta(delta);
			}
		}
	}

	return content.trim();
}
