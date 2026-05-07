export type AuthMethod = 'api-key' | 'browser' | 'device-code' | 'none';

export type ProviderDefinition = {
  id: string;
  name: string;
  badge: string;
  type: 'openai-compatible' | 'anthropic' | 'gemini' | 'local' | 'azure';
  defaultModel: string;
  baseUrl?: string;
  apiKeyEnv?: string[];
  apiKeyPrefix?: string[];
  authMethods: AuthMethod[];
  modelsEndpoint?: string;
  requiresApiKey: boolean;
  notes?: string;
};

export const providerRegistry = [
  {id: 'openai', name: 'OpenAI', badge: 'OpenAI', type: 'openai-compatible', defaultModel: 'gpt-4.1-mini', baseUrl: 'https://api.openai.com/v1', apiKeyEnv: ['OPENAI_API_KEY'], apiKeyPrefix: ['sk-'], authMethods: ['api-key', 'browser'], modelsEndpoint: '/models', requiresApiKey: true},
  {id: 'anthropic', name: 'Claude (Anthropic)', badge: 'Claude', type: 'anthropic', defaultModel: 'claude-3-5-sonnet-latest', baseUrl: 'https://api.anthropic.com/v1', apiKeyEnv: ['ANTHROPIC_API_KEY'], apiKeyPrefix: ['sk-ant-'], authMethods: ['api-key', 'browser'], requiresApiKey: true},
  {id: 'gemini', name: 'Google Gemini', badge: 'Gemini', type: 'gemini', defaultModel: 'gemini-1.5-pro', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', apiKeyEnv: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'], authMethods: ['api-key', 'browser'], requiresApiKey: true},
  {id: 'openrouter', name: 'OpenRouter', badge: 'OpenRouter', type: 'openai-compatible', defaultModel: 'openai/gpt-4o-mini', baseUrl: 'https://openrouter.ai/api/v1', apiKeyEnv: ['OPENROUTER_API_KEY'], apiKeyPrefix: ['sk-or-'], authMethods: ['api-key', 'browser'], modelsEndpoint: '/models', requiresApiKey: true},
  {id: 'groq', name: 'Groq', badge: 'Groq', type: 'openai-compatible', defaultModel: 'llama-3.1-70b-versatile', baseUrl: 'https://api.groq.com/openai/v1', apiKeyEnv: ['GROQ_API_KEY'], apiKeyPrefix: ['gsk_'], authMethods: ['api-key'], modelsEndpoint: '/models', requiresApiKey: true},
  {id: 'together', name: 'Together AI', badge: 'Together', type: 'openai-compatible', defaultModel: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', baseUrl: 'https://api.together.xyz/v1', apiKeyEnv: ['TOGETHER_API_KEY'], authMethods: ['api-key'], modelsEndpoint: '/models', requiresApiKey: true},
  {id: 'nvidia', name: 'NVIDIA NIM', badge: 'NVIDIA', type: 'openai-compatible', defaultModel: 'meta/llama-3.1-70b-instruct', baseUrl: 'https://integrate.api.nvidia.com/v1', apiKeyEnv: ['NVIDIA_API_KEY'], authMethods: ['api-key'], modelsEndpoint: '/models', requiresApiKey: true},
  {id: 'deepseek', name: 'DeepSeek', badge: 'DeepSeek', type: 'openai-compatible', defaultModel: 'deepseek-chat', baseUrl: 'https://api.deepseek.com/v1', apiKeyEnv: ['DEEPSEEK_API_KEY'], apiKeyPrefix: ['sk-'], authMethods: ['api-key'], modelsEndpoint: '/models', requiresApiKey: true},
  {id: 'mistral', name: 'Mistral', badge: 'Mistral', type: 'openai-compatible', defaultModel: 'mistral-large-latest', baseUrl: 'https://api.mistral.ai/v1', apiKeyEnv: ['MISTRAL_API_KEY'], authMethods: ['api-key'], modelsEndpoint: '/models', requiresApiKey: true},
  {id: 'ollama', name: 'Ollama (Local)', badge: 'Ollama', type: 'openai-compatible', defaultModel: 'llama3.1', baseUrl: 'http://localhost:11434/v1', authMethods: ['none'], modelsEndpoint: '/models', requiresApiKey: false, notes: 'Requires local Ollama server.'},
  {id: 'lmstudio', name: 'LM Studio (Local)', badge: 'LM Studio', type: 'openai-compatible', defaultModel: 'local-model', baseUrl: 'http://localhost:1234/v1', authMethods: ['none'], modelsEndpoint: '/models', requiresApiKey: false, notes: 'Requires LM Studio local server.'},
  {id: 'azure-openai', name: 'Azure OpenAI', badge: 'Azure', type: 'azure', defaultModel: 'gpt-4o-mini', apiKeyEnv: ['AZURE_OPENAI_API_KEY'], authMethods: ['api-key', 'browser'], requiresApiKey: true, notes: 'Set your Azure OpenAI base URL during setup.'}
] as const satisfies ProviderDefinition[];

export type ProviderId = typeof providerRegistry[number]['id'];

export function getProvider(id: string): ProviderDefinition | undefined {
  return providerRegistry.find((provider) => provider.id === id);
}

export function requireProvider(id: string): ProviderDefinition {
  const provider = getProvider(id);
  if (!provider) throw new Error(`Unsupported provider: ${id}`);
  return provider;
}

export function providerIds(): string[] {
  return providerRegistry.map((provider) => provider.id);
}
