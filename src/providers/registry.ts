import type {ProviderDefinition} from './types.js';
import type {ProviderId} from '../config/schema.js';

export const providerRegistry: Record<ProviderId, ProviderDefinition> = {
	nvidia: {
		id: 'nvidia',
		name: 'NVIDIA',
		baseUrl: 'https://integrate.api.nvidia.com/v1',
		defaultModel: 'meta/llama-3.1-70b-instruct',
		requiresApiKey: true,
		supportsStreaming: true,
		modelListPlaceholder: ['meta/llama-3.1-70b-instruct']
	},
	openai: {
		id: 'openai',
		name: 'OpenAI',
		baseUrl: 'https://api.openai.com/v1',
		defaultModel: 'gpt-4o-mini',
		requiresApiKey: true,
		supportsStreaming: true,
		modelListPlaceholder: ['gpt-4o-mini', 'gpt-4o']
	},
	'openai-compatible': {
		id: 'openai-compatible',
		name: 'OpenAI Compatible',
		baseUrl: 'https://api.openai.com/v1',
		defaultModel: 'gpt-4o-mini',
		requiresApiKey: true,
		supportsStreaming: true,
		modelListPlaceholder: ['gpt-4o-mini']
	},
	openrouter: {
		id: 'openrouter',
		name: 'OpenRouter',
		baseUrl: 'https://openrouter.ai/api/v1',
		defaultModel: 'openai/gpt-4o-mini',
		requiresApiKey: true,
		supportsStreaming: true,
		modelListPlaceholder: ['openai/gpt-4o-mini'],
		headers: {'HTTP-Referer': 'https://github.com/itisuniqueofficial-gh/opensyntax', 'X-Title': 'OpenSyntax'}
	},
	groq: {
		id: 'groq',
		name: 'Groq',
		baseUrl: 'https://api.groq.com/openai/v1',
		defaultModel: 'llama-3.1-70b-versatile',
		requiresApiKey: true,
		supportsStreaming: true,
		modelListPlaceholder: ['llama-3.1-70b-versatile']
	},
	together: {
		id: 'together',
		name: 'Together AI',
		baseUrl: 'https://api.together.xyz/v1',
		defaultModel: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
		requiresApiKey: true,
		supportsStreaming: true,
		modelListPlaceholder: ['meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo']
	},
	mistral: {
		id: 'mistral',
		name: 'Mistral',
		baseUrl: 'https://api.mistral.ai/v1',
		defaultModel: 'mistral-large-latest',
		requiresApiKey: true,
		supportsStreaming: true,
		modelListPlaceholder: ['mistral-large-latest']
	},
	deepseek: {
		id: 'deepseek',
		name: 'DeepSeek',
		baseUrl: 'https://api.deepseek.com/v1',
		defaultModel: 'deepseek-chat',
		requiresApiKey: true,
		supportsStreaming: true,
		modelListPlaceholder: ['deepseek-chat']
	},
	cerebras: {
		id: 'cerebras',
		name: 'Cerebras',
		baseUrl: 'https://api.cerebras.ai/v1',
		defaultModel: 'llama3.1-8b',
		requiresApiKey: true,
		supportsStreaming: true,
		modelListPlaceholder: ['llama3.1-8b']
	},
	ollama: {
		id: 'ollama',
		name: 'Ollama Local',
		baseUrl: 'http://localhost:11434/v1',
		defaultModel: 'llama3.1',
		requiresApiKey: false,
		supportsStreaming: true,
		modelListPlaceholder: ['llama3.1', 'mistral', 'codellama']
	},
	custom: {
		id: 'custom',
		name: 'Custom OpenAI-compatible',
		baseUrl: 'https://api.example.com/v1',
		defaultModel: 'model-name',
		requiresApiKey: true,
		supportsStreaming: true,
		modelListPlaceholder: ['model-name']
	}
};

export const providerIds = Object.keys(providerRegistry) as ProviderId[];

export function getProviderDefinition(provider: ProviderId): ProviderDefinition {
	return providerRegistry[provider];
}

export function isProviderSupported(provider: string): provider is ProviderId {
	return provider in providerRegistry;
}
