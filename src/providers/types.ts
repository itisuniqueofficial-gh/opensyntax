import type {ProviderId} from '../config/schema.js';

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
	responseTimeMs?: number;
};

export type StreamDelta = {
	content: string;
	done?: boolean;
};

export type ProviderDefinition = {
	id: ProviderId;
	name: string;
	baseUrl: string;
	defaultModel: string;
	requiresApiKey: boolean;
	supportsStreaming: boolean;
	modelListPlaceholder: string[];
	headers?: Record<string, string>;
};

export type ChatRequest = {
	messages: ChatMessage[];
	signal?: AbortSignal;
	stream?: boolean;
	onDelta?: (delta: StreamDelta) => void;
};

export interface ChatProvider {
	definition: ProviderDefinition;
	chat(request: ChatRequest): Promise<ChatResult>;
	health(signal?: AbortSignal): Promise<{ok: boolean; message: string; responseTimeMs?: number}>;
}
