import {z} from 'zod';

export const providerSchema = z.enum([
	'nvidia',
	'openai',
	'openrouter',
	'groq',
	'together',
	'mistral',
	'deepseek',
	'cerebras',
	'ollama',
	'custom',
	'openai-compatible'
]);

export type ProviderId = z.infer<typeof providerSchema>;

export const providerLabels: Record<ProviderId, string> = {
	nvidia: 'NVIDIA',
	openai: 'OpenAI',
	'openai-compatible': 'OpenAI Compatible',
	openrouter: 'OpenRouter',
	groq: 'Groq',
	together: 'Together AI',
	mistral: 'Mistral',
	deepseek: 'DeepSeek',
	cerebras: 'Cerebras',
	ollama: 'Ollama Local',
	custom: 'Custom API'
};

export const providerDefaults: Record<ProviderId, {baseUrl: string; model: string; streaming: boolean; apiKeyRequired: boolean}> = {
	nvidia: {baseUrl: 'https://integrate.api.nvidia.com/v1', model: 'meta/llama-3.1-70b-instruct', streaming: true, apiKeyRequired: true},
	openai: {baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', streaming: true, apiKeyRequired: true},
	'openai-compatible': {baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', streaming: true, apiKeyRequired: true},
	openrouter: {baseUrl: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini', streaming: true, apiKeyRequired: true},
	groq: {baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.1-70b-versatile', streaming: true, apiKeyRequired: true},
	together: {baseUrl: 'https://api.together.xyz/v1', model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', streaming: true, apiKeyRequired: true},
	mistral: {baseUrl: 'https://api.mistral.ai/v1', model: 'mistral-large-latest', streaming: true, apiKeyRequired: true},
	deepseek: {baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat', streaming: true, apiKeyRequired: true},
	cerebras: {baseUrl: 'https://api.cerebras.ai/v1', model: 'llama3.1-8b', streaming: true, apiKeyRequired: true},
	ollama: {baseUrl: 'http://localhost:11434/v1', model: 'llama3.1', streaming: true, apiKeyRequired: false},
	custom: {baseUrl: 'https://api.example.com/v1', model: 'model-name', streaming: true, apiKeyRequired: true}
};

export const configSchema = z.object({
	version: z.literal(2).default(2),
	provider: providerSchema,
	apiKey: z.string().default(''),
	baseUrl: z.string().url('Base URL must be a valid URL'),
	model: z.string().min(1, 'Model name is required'),
	streaming: z.boolean().default(true),
	timeoutMs: z.number().int().min(1000).max(300000).default(60000)
}).superRefine((config, context) => {
	if (config.provider !== 'ollama' && !config.apiKey.trim()) {
		context.addIssue({code: z.ZodIssueCode.custom, path: ['apiKey'], message: 'API key is required for this provider'});
	}
});

export type OpenSyntaxConfig = z.infer<typeof configSchema>;

export function createConfig(input: Omit<OpenSyntaxConfig, 'version' | 'timeoutMs'> & Partial<Pick<OpenSyntaxConfig, 'timeoutMs'>>): OpenSyntaxConfig {
	return configSchema.parse({version: 2, timeoutMs: 60000, ...input});
}

export function migrateConfig(input: unknown): OpenSyntaxConfig {
	const value = input as Partial<OpenSyntaxConfig> & {version?: number};
	return configSchema.parse({
		version: 2,
		provider: value.provider === 'openai-compatible' ? 'custom' : value.provider,
		apiKey: value.apiKey ?? '',
		baseUrl: value.baseUrl,
		model: value.model,
		streaming: value.streaming ?? true,
		timeoutMs: value.timeoutMs ?? 60000
	});
}
