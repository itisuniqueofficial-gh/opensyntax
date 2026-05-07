/**
 * Provider capability matrix.
 *
 * Defines exactly what each provider's API accepts at the HTTP level.
 * This is separate from model-level capabilities (src/model/registry.ts),
 * which describe what a specific model can do.
 *
 * Rules:
 * - If a field is false, the request sanitizer MUST omit it from the payload.
 * - When in doubt, default to false (minimal safe payload).
 */

export type ProviderCapabilities = {
  /** Supports OpenAI-style tool/function calling in the request body */
  supportsTools: boolean;
  /** Supports the tool_choice field */
  supportsToolChoice: boolean;
  /** Supports parallel_tool_calls field */
  supportsParallelTools: boolean;
  /** Supports streaming (stream: true) */
  supportsStreaming: boolean;
  /** Supports a system role message in the messages array */
  supportsSystemRole: boolean;
  /** Supports temperature field */
  supportsTemperature: boolean;
  /** Supports max_tokens field (vs max_completion_tokens for newer OpenAI) */
  supportsMaxTokens: boolean;
  /** Supports response_format field */
  supportsResponseFormat: boolean;
  /** Supports reasoning/thinking params (e.g. reasoning_effort) */
  supportsReasoningParams: boolean;
  /** Supports tool result messages (role: "tool") */
  supportsToolMessages: boolean;
  /** Supports top_p field */
  supportsTopP: boolean;
};

// ---------------------------------------------------------------------------
// Per-provider capability definitions
// ---------------------------------------------------------------------------

const FULL_OPENAI: ProviderCapabilities = {
  supportsTools: true,
  supportsToolChoice: true,
  supportsParallelTools: true,
  supportsStreaming: true,
  supportsSystemRole: true,
  supportsTemperature: true,
  supportsMaxTokens: true,
  supportsResponseFormat: true,
  supportsReasoningParams: true,
  supportsToolMessages: true,
  supportsTopP: true
};

// NVIDIA NIM: OpenAI-compatible but strict subset.
// Does NOT support: tool_choice, parallel_tool_calls, response_format, reasoning params.
// Some models don't support tools at all — the sanitizer checks model registry too.
const NVIDIA_NIM: ProviderCapabilities = {
  supportsTools: true,
  supportsToolChoice: false,
  supportsParallelTools: false,
  supportsStreaming: true,
  supportsSystemRole: true,
  supportsTemperature: true,
  supportsMaxTokens: true,
  supportsResponseFormat: false,
  supportsReasoningParams: false,
  supportsToolMessages: true,
  supportsTopP: true
};

// Groq: fast inference, supports tools on most models, no reasoning params.
const GROQ: ProviderCapabilities = {
  supportsTools: true,
  supportsToolChoice: true,
  supportsParallelTools: false,
  supportsStreaming: true,
  supportsSystemRole: true,
  supportsTemperature: true,
  supportsMaxTokens: true,
  supportsResponseFormat: false,
  supportsReasoningParams: false,
  supportsToolMessages: true,
  supportsTopP: true
};

// Together AI: OpenAI-compatible, no parallel tools, no reasoning params.
const TOGETHER: ProviderCapabilities = {
  supportsTools: true,
  supportsToolChoice: true,
  supportsParallelTools: false,
  supportsStreaming: true,
  supportsSystemRole: true,
  supportsTemperature: true,
  supportsMaxTokens: true,
  supportsResponseFormat: false,
  supportsReasoningParams: false,
  supportsToolMessages: true,
  supportsTopP: true
};

// DeepSeek: OpenAI-compatible. Reasoner model doesn't support tools (handled at model level).
const DEEPSEEK: ProviderCapabilities = {
  supportsTools: true,
  supportsToolChoice: true,
  supportsParallelTools: false,
  supportsStreaming: true,
  supportsSystemRole: true,
  supportsTemperature: true,
  supportsMaxTokens: true,
  supportsResponseFormat: false,
  supportsReasoningParams: false,
  supportsToolMessages: true,
  supportsTopP: true
};

// Mistral: OpenAI-compatible, supports tools and tool_choice.
const MISTRAL: ProviderCapabilities = {
  supportsTools: true,
  supportsToolChoice: true,
  supportsParallelTools: false,
  supportsStreaming: true,
  supportsSystemRole: true,
  supportsTemperature: true,
  supportsMaxTokens: true,
  supportsResponseFormat: false,
  supportsReasoningParams: false,
  supportsToolMessages: true,
  supportsTopP: true
};

// OpenRouter: passes through to underlying provider; use conservative defaults.
const OPENROUTER: ProviderCapabilities = {
  supportsTools: true,
  supportsToolChoice: true,
  supportsParallelTools: false,
  supportsStreaming: true,
  supportsSystemRole: true,
  supportsTemperature: true,
  supportsMaxTokens: true,
  supportsResponseFormat: false,
  supportsReasoningParams: false,
  supportsToolMessages: true,
  supportsTopP: true
};

// Ollama / LM Studio: local OpenAI-compatible, minimal feature set.
const LOCAL_OPENAI: ProviderCapabilities = {
  supportsTools: true,
  supportsToolChoice: false,
  supportsParallelTools: false,
  supportsStreaming: true,
  supportsSystemRole: true,
  supportsTemperature: true,
  supportsMaxTokens: true,
  supportsResponseFormat: false,
  supportsReasoningParams: false,
  supportsToolMessages: false,
  supportsTopP: true
};

// Azure OpenAI: same as OpenAI but no reasoning params.
const AZURE_OPENAI: ProviderCapabilities = {
  supportsTools: true,
  supportsToolChoice: true,
  supportsParallelTools: true,
  supportsStreaming: true,
  supportsSystemRole: true,
  supportsTemperature: true,
  supportsMaxTokens: true,
  supportsResponseFormat: true,
  supportsReasoningParams: false,
  supportsToolMessages: true,
  supportsTopP: true
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const CAPABILITY_MAP: Record<string, ProviderCapabilities> = {
  openai: FULL_OPENAI,
  anthropic: FULL_OPENAI, // handled by its own provider class
  gemini: FULL_OPENAI,    // handled by its own provider class
  openrouter: OPENROUTER,
  groq: GROQ,
  together: TOGETHER,
  nvidia: NVIDIA_NIM,
  deepseek: DEEPSEEK,
  mistral: MISTRAL,
  ollama: LOCAL_OPENAI,
  lmstudio: LOCAL_OPENAI,
  'azure-openai': AZURE_OPENAI
};

/** Get the capability profile for a provider. Falls back to a safe minimal set. */
export function getProviderCapabilities(providerId: string): ProviderCapabilities {
  return CAPABILITY_MAP[providerId] ?? {
    supportsTools: false,
    supportsToolChoice: false,
    supportsParallelTools: false,
    supportsStreaming: true,
    supportsSystemRole: true,
    supportsTemperature: true,
    supportsMaxTokens: true,
    supportsResponseFormat: false,
    supportsReasoningParams: false,
    supportsToolMessages: false,
    supportsTopP: true
  };
}

/** Render a human-readable capability summary for /capabilities. */
export function renderProviderCapabilities(providerId: string, modelId: string): string {
  const caps = getProviderCapabilities(providerId);
  const tick = (v: boolean) => v ? '✓' : '✗';
  return [
    `Provider: ${providerId}`,
    `Model:    ${modelId}`,
    '',
    `${tick(caps.supportsStreaming)}  Streaming`,
    `${tick(caps.supportsTools)}  Tool calling`,
    `${tick(caps.supportsToolChoice)}  Tool choice control`,
    `${tick(caps.supportsParallelTools)}  Parallel tool calls`,
    `${tick(caps.supportsSystemRole)}  System messages`,
    `${tick(caps.supportsTemperature)}  Temperature control`,
    `${tick(caps.supportsMaxTokens)}  Max tokens`,
    `${tick(caps.supportsResponseFormat)}  Response format (JSON mode)`,
    `${tick(caps.supportsReasoningParams)}  Reasoning parameters`,
    `${tick(caps.supportsToolMessages)}  Tool result messages`
  ].join('\n');
}
