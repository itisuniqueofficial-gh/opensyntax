import {z} from 'zod';

export const providerSchema = z.enum(['nvidia', 'openai-compatible', 'openrouter', 'custom']);

export type ProviderId = z.infer<typeof providerSchema>;

export const providerLabels: Record<ProviderId, string> = {
	nvidia: 'NVIDIA',
	'openai-compatible': 'OpenAI Compatible',
	openrouter: 'OpenRouter',
	custom: 'Custom API'
};

export const providerDefaults: Record<ProviderId, {baseUrl: string; model: string}> = {
	nvidia: {
		baseUrl: 'https://integrate.api.nvidia.com/v1',
		model: 'meta/llama-3.1-70b-instruct'
	},
	'openai-compatible': {
		baseUrl: 'https://api.openai.com/v1',
		model: 'gpt-4o-mini'
	},
	openrouter: {
		baseUrl: 'https://openrouter.ai/api/v1',
		model: 'openai/gpt-4o-mini'
	},
	custom: {
		baseUrl: 'https://api.example.com/v1',
		model: 'model-name'
	}
};

export const configSchema = z.object({
	version: z.literal(1),
	provider: providerSchema,
	apiKey: z.string().min(1, 'API key is required'),
	baseUrl: z.string().url('Base URL must be a valid URL'),
	model: z.string().min(1, 'Model name is required')
});

export type OpenSyntaxConfig = z.infer<typeof configSchema>;

export function createConfig(input: Omit<OpenSyntaxConfig, 'version'>): OpenSyntaxConfig {
	return configSchema.parse({version: 1, ...input});
}
