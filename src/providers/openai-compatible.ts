import type {OpenSyntaxConfig} from '../config/schema.js';
import {createAuthHeaders, type ChatMessage, type ChatProvider, type ChatResult} from './provider.js';

type ChatCompletionResponse = {
	choices?: Array<{message?: {content?: string}}>;
	usage?: {
		prompt_tokens?: number;
		completion_tokens?: number;
		total_tokens?: number;
	};
	error?: {message?: string};
};

export class OpenAICompatibleProvider implements ChatProvider {
	constructor(private readonly config: OpenSyntaxConfig) {}

	async chat(messages: ChatMessage[]): Promise<ChatResult> {
		const endpoint = new URL(`${this.config.baseUrl.replace(/\/$/, '')}/chat/completions`);
		const response = await fetch(endpoint, {
			method: 'POST',
			headers: createAuthHeaders(this.config),
			body: JSON.stringify({
				model: this.config.model,
				messages,
				temperature: 0.7
			})
		});

		const body = (await response.json().catch(() => ({}))) as ChatCompletionResponse;

		if (!response.ok) {
			throw new Error(body.error?.message ?? `Provider request failed with HTTP ${response.status}`);
		}

		const content = body.choices?.[0]?.message?.content?.trim();
		if (!content) {
			throw new Error('Provider returned an empty response');
		}

		return {
			content,
			usage: body.usage
				? {
					promptTokens: body.usage.prompt_tokens,
					completionTokens: body.usage.completion_tokens,
					totalTokens: body.usage.total_tokens
				}
				: undefined
		};
	}
}

export function createProvider(config: OpenSyntaxConfig): ChatProvider {
	return new OpenAICompatibleProvider(config);
}
