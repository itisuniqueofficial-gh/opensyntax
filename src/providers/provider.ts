import type {OpenSyntaxConfig} from '../config/schema.js';

export type ChatRole = 'system' | 'user' | 'assistant';

export type ChatMessage = {
	role: ChatRole;
	content: string;
};

export type ChatUsage = {
	promptTokens?: number;
	completionTokens?: number;
	totalTokens?: number;
};

export type ChatResult = {
	content: string;
	usage?: ChatUsage;
};

export interface ChatProvider {
	chat(messages: ChatMessage[]): Promise<ChatResult>;
}

export function createAuthHeaders(config: OpenSyntaxConfig): Record<string, string> {
	const headers: Record<string, string> = {
		Authorization: `Bearer ${config.apiKey}`,
		'Content-Type': 'application/json'
	};

	if (config.provider === 'openrouter') {
		headers['HTTP-Referer'] = 'https://opensyntax.local';
		headers['X-Title'] = 'OpenSyntax';
	}

	return headers;
}
