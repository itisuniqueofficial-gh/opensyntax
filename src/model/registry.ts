/**
 * Model registry — curated static fallback models for all supported providers.
 * Dynamic model lists are fetched at runtime via the provider API; this registry
 * is the authoritative fallback when the API is unreachable or returns nothing.
 */

export type ModelCapabilities = {
  supportsTools: boolean;
  supportsStreaming: boolean;
  supportsVision: boolean;
  supportsReasoning: boolean;
  supportsJson: boolean;
};

export type ModelEntry = ModelCapabilities & {
  id: string;
  name: string;
  provider: string;
  family: string;
  contextWindow?: number;
  recommendedFor: string[];
  /** True when the model is speculative / not yet confirmed available */
  speculative?: boolean;
};

// ---------------------------------------------------------------------------
// OpenAI
// ---------------------------------------------------------------------------
const openaiModels: ModelEntry[] = [
  {id: 'gpt-4.1', name: 'GPT-4.1', provider: 'openai', family: 'gpt-4', contextWindow: 1_047_576, supportsTools: true, supportsStreaming: true, supportsVision: true, supportsReasoning: false, supportsJson: true, recommendedFor: ['coding', 'analysis', 'general']},
  {id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', provider: 'openai', family: 'gpt-4', contextWindow: 1_047_576, supportsTools: true, supportsStreaming: true, supportsVision: true, supportsReasoning: false, supportsJson: true, recommendedFor: ['fast', 'cheap', 'general']},
  {id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', family: 'gpt-4', contextWindow: 128_000, supportsTools: true, supportsStreaming: true, supportsVision: true, supportsReasoning: false, supportsJson: true, recommendedFor: ['general', 'vision', 'coding']},
  {id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', family: 'gpt-4', contextWindow: 128_000, supportsTools: true, supportsStreaming: true, supportsVision: true, supportsReasoning: false, supportsJson: true, recommendedFor: ['fast', 'cheap']},
  {id: 'o4-mini', name: 'o4 Mini', provider: 'openai', family: 'o-series', contextWindow: 200_000, supportsTools: true, supportsStreaming: true, supportsVision: true, supportsReasoning: true, supportsJson: true, recommendedFor: ['reasoning', 'coding', 'math']},
  {id: 'o3', name: 'o3', provider: 'openai', family: 'o-series', contextWindow: 200_000, supportsTools: true, supportsStreaming: true, supportsVision: true, supportsReasoning: true, supportsJson: true, recommendedFor: ['reasoning', 'research', 'math']},
  {id: 'o3-mini', name: 'o3 Mini', provider: 'openai', family: 'o-series', contextWindow: 200_000, supportsTools: true, supportsStreaming: true, supportsVision: false, supportsReasoning: true, supportsJson: true, recommendedFor: ['reasoning', 'fast', 'cheap']},
  // Speculative / future models — shown as optional fallback only
  {id: 'gpt-5', name: 'GPT-5', provider: 'openai', family: 'gpt-5', contextWindow: 1_000_000, supportsTools: true, supportsStreaming: true, supportsVision: true, supportsReasoning: true, supportsJson: true, recommendedFor: ['general', 'coding', 'reasoning'], speculative: true},
  {id: 'gpt-5-mini', name: 'GPT-5 Mini', provider: 'openai', family: 'gpt-5', contextWindow: 256_000, supportsTools: true, supportsStreaming: true, supportsVision: true, supportsReasoning: false, supportsJson: true, recommendedFor: ['fast', 'cheap'], speculative: true},
  {id: 'gpt-5.5', name: 'GPT-5.5', provider: 'openai', family: 'gpt-5', contextWindow: 2_000_000, supportsTools: true, supportsStreaming: true, supportsVision: true, supportsReasoning: true, supportsJson: true, recommendedFor: ['general', 'coding', 'reasoning'], speculative: true},
  {id: 'gpt-5.5-thinking', name: 'GPT-5.5 Thinking', provider: 'openai', family: 'gpt-5', contextWindow: 2_000_000, supportsTools: true, supportsStreaming: true, supportsVision: true, supportsReasoning: true, supportsJson: true, recommendedFor: ['reasoning', 'research'], speculative: true},
  {id: 'gpt-5.5-mini', name: 'GPT-5.5 Mini', provider: 'openai', family: 'gpt-5', contextWindow: 512_000, supportsTools: true, supportsStreaming: true, supportsVision: true, supportsReasoning: false, supportsJson: true, recommendedFor: ['fast', 'cheap'], speculative: true},
  {id: 'gpt-5.5-coding', name: 'GPT-5.5 Coding', provider: 'openai', family: 'gpt-5', contextWindow: 2_000_000, supportsTools: true, supportsStreaming: true, supportsVision: true, supportsReasoning: true, supportsJson: true, recommendedFor: ['coding'], speculative: true}
];

// ---------------------------------------------------------------------------
// Anthropic
// ---------------------------------------------------------------------------
const anthropicModels: ModelEntry[] = [
  {id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', provider: 'anthropic', family: 'claude-4', contextWindow: 200_000, supportsTools: true, supportsStreaming: true, supportsVision: true, supportsReasoning: true, supportsJson: true, recommendedFor: ['coding', 'analysis', 'general']},
  {id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'anthropic', family: 'claude-4', contextWindow: 200_000, supportsTools: true, supportsStreaming: true, supportsVision: true, supportsReasoning: true, supportsJson: true, recommendedFor: ['coding', 'analysis', 'general']},
  {id: 'claude-opus-4-20250514', name: 'Claude Opus 4', provider: 'anthropic', family: 'claude-4', contextWindow: 200_000, supportsTools: true, supportsStreaming: true, supportsVision: true, supportsReasoning: true, supportsJson: true, recommendedFor: ['research', 'complex', 'reasoning']},
  {id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet', provider: 'anthropic', family: 'claude-3', contextWindow: 200_000, supportsTools: true, supportsStreaming: true, supportsVision: true, supportsReasoning: true, supportsJson: true, recommendedFor: ['coding', 'analysis']},
  {id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet', provider: 'anthropic', family: 'claude-3', contextWindow: 200_000, supportsTools: true, supportsStreaming: true, supportsVision: true, supportsReasoning: false, supportsJson: true, recommendedFor: ['coding', 'general']},
  {id: 'claude-3-5-haiku-latest', name: 'Claude 3.5 Haiku', provider: 'anthropic', family: 'claude-3', contextWindow: 200_000, supportsTools: true, supportsStreaming: true, supportsVision: true, supportsReasoning: false, supportsJson: true, recommendedFor: ['fast', 'cheap']}
];

// ---------------------------------------------------------------------------
// Google Gemini
// ---------------------------------------------------------------------------
const geminiModels: ModelEntry[] = [
  {id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'gemini', family: 'gemini-2', contextWindow: 1_048_576, supportsTools: true, supportsStreaming: true, supportsVision: true, supportsReasoning: true, supportsJson: true, recommendedFor: ['coding', 'analysis', 'reasoning']},
  {id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'gemini', family: 'gemini-2', contextWindow: 1_048_576, supportsTools: true, supportsStreaming: true, supportsVision: true, supportsReasoning: true, supportsJson: true, recommendedFor: ['fast', 'cheap', 'general']},
  {id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'gemini', family: 'gemini-2', contextWindow: 1_048_576, supportsTools: true, supportsStreaming: true, supportsVision: true, supportsReasoning: false, supportsJson: true, recommendedFor: ['fast', 'cheap']},
  {id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'gemini', family: 'gemini-1', contextWindow: 2_097_152, supportsTools: true, supportsStreaming: true, supportsVision: true, supportsReasoning: false, supportsJson: true, recommendedFor: ['large-context', 'general']},
  {id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'gemini', family: 'gemini-1', contextWindow: 1_048_576, supportsTools: true, supportsStreaming: true, supportsVision: true, supportsReasoning: false, supportsJson: true, recommendedFor: ['fast', 'cheap']}
];

// ---------------------------------------------------------------------------
// OpenRouter (popular cross-provider models)
// ---------------------------------------------------------------------------
const openrouterModels: ModelEntry[] = [
  {id: 'openai/gpt-4.1', name: 'GPT-4.1 (via OpenRouter)', provider: 'openrouter', family: 'gpt-4', contextWindow: 1_047_576, supportsTools: true, supportsStreaming: true, supportsVision: true, supportsReasoning: false, supportsJson: true, recommendedFor: ['coding', 'general']},
  {id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini (via OpenRouter)', provider: 'openrouter', family: 'gpt-4', contextWindow: 128_000, supportsTools: true, supportsStreaming: true, supportsVision: true, supportsReasoning: false, supportsJson: true, recommendedFor: ['fast', 'cheap']},
  {id: 'anthropic/claude-3-5-sonnet', name: 'Claude 3.5 Sonnet (via OpenRouter)', provider: 'openrouter', family: 'claude-3', contextWindow: 200_000, supportsTools: true, supportsStreaming: true, supportsVision: true, supportsReasoning: false, supportsJson: true, recommendedFor: ['coding', 'general']},
  {id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro (via OpenRouter)', provider: 'openrouter', family: 'gemini-2', contextWindow: 1_048_576, supportsTools: true, supportsStreaming: true, supportsVision: true, supportsReasoning: true, supportsJson: true, recommendedFor: ['reasoning', 'coding']},
  {id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B (via OpenRouter)', provider: 'openrouter', family: 'llama-3', contextWindow: 131_072, supportsTools: true, supportsStreaming: true, supportsVision: false, supportsReasoning: false, supportsJson: true, recommendedFor: ['general', 'coding']},
  {id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 (via OpenRouter)', provider: 'openrouter', family: 'deepseek', contextWindow: 65_536, supportsTools: false, supportsStreaming: true, supportsVision: false, supportsReasoning: true, supportsJson: true, recommendedFor: ['reasoning', 'math']},
  {id: 'mistralai/mistral-large', name: 'Mistral Large (via OpenRouter)', provider: 'openrouter', family: 'mistral', contextWindow: 131_072, supportsTools: true, supportsStreaming: true, supportsVision: false, supportsReasoning: false, supportsJson: true, recommendedFor: ['general', 'coding']},
  {id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B (via OpenRouter)', provider: 'openrouter', family: 'qwen', contextWindow: 131_072, supportsTools: true, supportsStreaming: true, supportsVision: false, supportsReasoning: false, supportsJson: true, recommendedFor: ['coding', 'general']}
];

// ---------------------------------------------------------------------------
// NVIDIA NIM
// ---------------------------------------------------------------------------
const nvidiaModels: ModelEntry[] = [
  {id: 'meta/llama-3.1-70b-instruct', name: 'Llama 3.1 70B Instruct', provider: 'nvidia', family: 'llama-3', contextWindow: 131_072, supportsTools: true, supportsStreaming: true, supportsVision: false, supportsReasoning: false, supportsJson: true, recommendedFor: ['general', 'coding']},
  {id: 'meta/llama-3.1-405b-instruct', name: 'Llama 3.1 405B Instruct', provider: 'nvidia', family: 'llama-3', contextWindow: 131_072, supportsTools: true, supportsStreaming: true, supportsVision: false, supportsReasoning: false, supportsJson: true, recommendedFor: ['general', 'research']},
  {id: 'nvidia/llama-3.1-nemotron-70b-instruct', name: 'Nemotron 70B Instruct', provider: 'nvidia', family: 'nemotron', contextWindow: 131_072, supportsTools: true, supportsStreaming: true, supportsVision: false, supportsReasoning: true, supportsJson: true, recommendedFor: ['coding', 'reasoning']},
  {id: 'mistralai/mixtral-8x7b-instruct-v0.1', name: 'Mixtral 8x7B Instruct', provider: 'nvidia', family: 'mixtral', contextWindow: 32_768, supportsTools: true, supportsStreaming: true, supportsVision: false, supportsReasoning: false, supportsJson: true, recommendedFor: ['general', 'fast']}
];

// ---------------------------------------------------------------------------
// Groq
// ---------------------------------------------------------------------------
const groqModels: ModelEntry[] = [
  {id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', provider: 'groq', family: 'llama-3', contextWindow: 128_000, supportsTools: true, supportsStreaming: true, supportsVision: false, supportsReasoning: false, supportsJson: true, recommendedFor: ['fast', 'general']},
  {id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B Versatile', provider: 'groq', family: 'llama-3', contextWindow: 131_072, supportsTools: true, supportsStreaming: true, supportsVision: false, supportsReasoning: false, supportsJson: true, recommendedFor: ['fast', 'general']},
  {id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', provider: 'groq', family: 'llama-3', contextWindow: 131_072, supportsTools: true, supportsStreaming: true, supportsVision: false, supportsReasoning: false, supportsJson: true, recommendedFor: ['fast', 'cheap']},
  {id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', provider: 'groq', family: 'mixtral', contextWindow: 32_768, supportsTools: true, supportsStreaming: true, supportsVision: false, supportsReasoning: false, supportsJson: true, recommendedFor: ['general']},
  {id: 'gemma2-9b-it', name: 'Gemma 2 9B IT', provider: 'groq', family: 'gemma', contextWindow: 8_192, supportsTools: true, supportsStreaming: true, supportsVision: false, supportsReasoning: false, supportsJson: true, recommendedFor: ['fast', 'cheap']}
];

// ---------------------------------------------------------------------------
// DeepSeek
// ---------------------------------------------------------------------------
const deepseekModels: ModelEntry[] = [
  {id: 'deepseek-chat', name: 'DeepSeek Chat (V3)', provider: 'deepseek', family: 'deepseek-v3', contextWindow: 65_536, supportsTools: true, supportsStreaming: true, supportsVision: false, supportsReasoning: false, supportsJson: true, recommendedFor: ['coding', 'general']},
  {id: 'deepseek-reasoner', name: 'DeepSeek Reasoner (R1)', provider: 'deepseek', family: 'deepseek-r1', contextWindow: 65_536, supportsTools: false, supportsStreaming: true, supportsVision: false, supportsReasoning: true, supportsJson: true, recommendedFor: ['reasoning', 'math', 'research']}
];

// ---------------------------------------------------------------------------
// Mistral
// ---------------------------------------------------------------------------
const mistralModels: ModelEntry[] = [
  {id: 'mistral-large-latest', name: 'Mistral Large', provider: 'mistral', family: 'mistral-large', contextWindow: 131_072, supportsTools: true, supportsStreaming: true, supportsVision: false, supportsReasoning: false, supportsJson: true, recommendedFor: ['general', 'coding']},
  {id: 'mistral-small-latest', name: 'Mistral Small', provider: 'mistral', family: 'mistral-small', contextWindow: 32_768, supportsTools: true, supportsStreaming: true, supportsVision: false, supportsReasoning: false, supportsJson: true, recommendedFor: ['fast', 'cheap']},
  {id: 'codestral-latest', name: 'Codestral', provider: 'mistral', family: 'codestral', contextWindow: 256_000, supportsTools: true, supportsStreaming: true, supportsVision: false, supportsReasoning: false, supportsJson: true, recommendedFor: ['coding']},
  {id: 'mistral-nemo', name: 'Mistral Nemo', provider: 'mistral', family: 'mistral-nemo', contextWindow: 131_072, supportsTools: true, supportsStreaming: true, supportsVision: false, supportsReasoning: false, supportsJson: true, recommendedFor: ['fast', 'general']}
];

// ---------------------------------------------------------------------------
// Together AI
// ---------------------------------------------------------------------------
const togetherModels: ModelEntry[] = [
  {id: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', name: 'Llama 3.1 70B Turbo', provider: 'together', family: 'llama-3', contextWindow: 131_072, supportsTools: true, supportsStreaming: true, supportsVision: false, supportsReasoning: false, supportsJson: true, recommendedFor: ['fast', 'general']},
  {id: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo', name: 'Llama 3.1 405B Turbo', provider: 'together', family: 'llama-3', contextWindow: 131_072, supportsTools: true, supportsStreaming: true, supportsVision: false, supportsReasoning: false, supportsJson: true, recommendedFor: ['general', 'research']},
  {id: 'Qwen/Qwen2.5-72B-Instruct-Turbo', name: 'Qwen 2.5 72B Turbo', provider: 'together', family: 'qwen', contextWindow: 131_072, supportsTools: true, supportsStreaming: true, supportsVision: false, supportsReasoning: false, supportsJson: true, recommendedFor: ['coding', 'general']},
  {id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1', provider: 'together', family: 'deepseek', contextWindow: 65_536, supportsTools: false, supportsStreaming: true, supportsVision: false, supportsReasoning: true, supportsJson: true, recommendedFor: ['reasoning', 'math']}
];

// ---------------------------------------------------------------------------
// Ollama / LM Studio (generic local placeholders)
// ---------------------------------------------------------------------------
const ollamaModels: ModelEntry[] = [
  {id: 'llama3.1', name: 'Llama 3.1 (local)', provider: 'ollama', family: 'llama-3', supportsTools: true, supportsStreaming: true, supportsVision: false, supportsReasoning: false, supportsJson: true, recommendedFor: ['local', 'general']},
  {id: 'mistral', name: 'Mistral (local)', provider: 'ollama', family: 'mistral', supportsTools: true, supportsStreaming: true, supportsVision: false, supportsReasoning: false, supportsJson: true, recommendedFor: ['local', 'general']},
  {id: 'codellama', name: 'Code Llama (local)', provider: 'ollama', family: 'codellama', supportsTools: false, supportsStreaming: true, supportsVision: false, supportsReasoning: false, supportsJson: false, recommendedFor: ['local', 'coding']},
  {id: 'qwen2.5-coder', name: 'Qwen 2.5 Coder (local)', provider: 'ollama', family: 'qwen', supportsTools: true, supportsStreaming: true, supportsVision: false, supportsReasoning: false, supportsJson: true, recommendedFor: ['local', 'coding']}
];

const lmstudioModels: ModelEntry[] = [
  {id: 'local-model', name: 'Local Model (LM Studio)', provider: 'lmstudio', family: 'local', supportsTools: true, supportsStreaming: true, supportsVision: false, supportsReasoning: false, supportsJson: true, recommendedFor: ['local', 'general']}
];

// ---------------------------------------------------------------------------
// Azure OpenAI
// ---------------------------------------------------------------------------
const azureModels: ModelEntry[] = [
  {id: 'gpt-4o-mini', name: 'GPT-4o Mini (Azure)', provider: 'azure-openai', family: 'gpt-4', contextWindow: 128_000, supportsTools: true, supportsStreaming: true, supportsVision: true, supportsReasoning: false, supportsJson: true, recommendedFor: ['fast', 'cheap']},
  {id: 'gpt-4o', name: 'GPT-4o (Azure)', provider: 'azure-openai', family: 'gpt-4', contextWindow: 128_000, supportsTools: true, supportsStreaming: true, supportsVision: true, supportsReasoning: false, supportsJson: true, recommendedFor: ['general', 'coding']},
  {id: 'gpt-4.1', name: 'GPT-4.1 (Azure)', provider: 'azure-openai', family: 'gpt-4', contextWindow: 1_047_576, supportsTools: true, supportsStreaming: true, supportsVision: true, supportsReasoning: false, supportsJson: true, recommendedFor: ['coding', 'general']}
];

// ---------------------------------------------------------------------------
// Full registry
// ---------------------------------------------------------------------------
export const modelRegistry: ModelEntry[] = [
  ...openaiModels,
  ...anthropicModels,
  ...geminiModels,
  ...openrouterModels,
  ...nvidiaModels,
  ...groqModels,
  ...deepseekModels,
  ...mistralModels,
  ...togetherModels,
  ...ollamaModels,
  ...lmstudioModels,
  ...azureModels
];

/** Return all confirmed (non-speculative) models for a provider. */
export function modelsForProvider(providerId: string): ModelEntry[] {
  return modelRegistry.filter((m) => m.provider === providerId && !m.speculative);
}

/** Return all models including speculative ones for a provider. */
export function allModelsForProvider(providerId: string): ModelEntry[] {
  return modelRegistry.filter((m) => m.provider === providerId);
}

/** Look up a model entry by provider + model id. */
export function findModel(providerId: string, modelId: string): ModelEntry | undefined {
  return modelRegistry.find((m) => m.provider === providerId && m.id === modelId);
}

/** Return capability badges as a human-readable string. */
export function capabilityBadges(model: ModelEntry): string[] {
  const badges: string[] = [];
  if (model.supportsTools) badges.push('tools');
  if (model.supportsStreaming) badges.push('streaming');
  if (model.supportsVision) badges.push('vision');
  if (model.supportsReasoning) badges.push('reasoning');
  if (model.supportsJson) badges.push('json');
  if (model.contextWindow && model.contextWindow >= 500_000) badges.push('large-context');
  if (model.recommendedFor.includes('coding')) badges.push('coding');
  if (model.recommendedFor.includes('fast')) badges.push('fast');
  if (model.recommendedFor.includes('cheap')) badges.push('cheap');
  if (model.speculative) badges.push('speculative');
  return badges;
}
