import {type ModelProvider, ProviderError} from './provider.js';
import type {ChatMessage, ModelConfig, ModelRequest, StreamEvent, ToolCall} from './types.js';
import {getProvider} from '../providers/registry.js';
import {sanitizeRequest} from './request-sanitizer.js';
import {status} from '../ui/renderer.js';

export class OpenAIProvider implements ModelProvider {
  readonly id: string;
  readonly model: string;
  private readonly baseUrl: string;
  private readonly apiKey?: string;

  constructor(config: ModelConfig) {
    this.id = config.provider;
    this.model = config.model;
    this.baseUrl = (
      config.baseUrl ??
      getProvider(config.provider)?.baseUrl ??
      'https://api.openai.com/v1'
    ).replace(/\/$/, '');
    this.apiKey = config.apiKey;
  }

  async *stream(request: ModelRequest): AsyncGenerator<StreamEvent> {
    // Sanitize the payload for this specific provider + model
    const {payload, removedFields, warnings} = sanitizeRequest({
      providerId: this.id,
      modelId: this.model,
      messages: request.messages,
      systemPrompt: request.systemPrompt,
      tools: request.tools,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
      stream: true
    });

    // Surface warnings as status lines (non-blocking)
    for (const w of warnings) status(w);

    const endpoint = `${this.baseUrl}/chat/completions`;
    const response = await fetch(endpoint, {
      method: 'POST',
      signal: request.signal,
      headers: {
        'content-type': 'application/json',
        ...(this.apiKey ? {authorization: `Bearer ${this.apiKey}`} : {})
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new ProviderError(
        buildErrorMessage(this.id, response.status, body),
        response.status,
        body.slice(0, 2000)
      );
    }

    const body = response.body;
    if (!body) throw new Error('Provider response did not include a stream body');

    const calls = new Map<number, {id: string; name: string; args: string}>();
    for await (const data of readSse(body)) {
      if (data === '[DONE]') break;
      let json: any;
      try { json = JSON.parse(data); } catch { continue; }
      const delta = json.choices?.[0]?.delta;
      if (delta?.content) yield {type: 'text', text: delta.content};
      for (const part of delta?.tool_calls ?? []) {
        const current = calls.get(part.index) ?? {id: part.id ?? `call_${part.index}`, name: '', args: ''};
        current.id = part.id ?? current.id;
        current.name += part.function?.name ?? '';
        current.args += part.function?.arguments ?? '';
        calls.set(part.index, current);
      }
      if (json.choices?.[0]?.finish_reason === 'tool_calls') {
        for (const call of calls.values()) yield {type: 'tool_call', call: parseToolCall(call)};
      }
    }
    yield {type: 'done'};
  }

  /** Return the sanitized payload for debug display (no inference). */
  debugPayload(request: ModelRequest): {endpoint: string; result: ReturnType<typeof sanitizeRequest>} {
    const result = sanitizeRequest({
      providerId: this.id,
      modelId: this.model,
      messages: request.messages,
      systemPrompt: request.systemPrompt,
      tools: request.tools,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
      stream: true
    });
    return {endpoint: `${this.baseUrl}/chat/completions`, result};
  }
}

// ---------------------------------------------------------------------------
// Error message builder — turns raw provider errors into actionable messages
// ---------------------------------------------------------------------------

function buildErrorMessage(providerId: string, status: number, body: string): string {
  const providerName = PROVIDER_NAMES[providerId] ?? providerId;
  const lower = body.toLowerCase();

  if (status === 401) return `${providerName}: Authentication failed. Check your API key.`;
  if (status === 403) return `${providerName}: Access denied. Your API key may not have permission for this model.`;
  if (status === 429) return `${providerName}: Rate limit exceeded. Wait a moment and try again.`;
  if (status === 503 || status === 502) return `${providerName}: Service temporarily unavailable. Try again shortly.`;

  if (status === 400) {
    // Parse common 400 reasons
    if (/tool|function/i.test(lower)) {
      return `${providerName}: Tool calling is not supported for this model.\nSuggestions:\n  - Use /model to switch to a tool-capable model\n  - Use OpenAI or Anthropic for full tool support`;
    }
    if (/model.*not.*found|no such model|invalid model/i.test(lower)) {
      return `${providerName}: Model not found. Use /models ${providerId} to see available models.`;
    }
    if (/temperature/i.test(lower)) {
      return `${providerName}: Invalid temperature value. Try a value between 0 and 1.`;
    }
    if (/max_tokens|context.*length|token/i.test(lower)) {
      return `${providerName}: Token limit exceeded or invalid max_tokens value.`;
    }
    if (/message|content|role/i.test(lower)) {
      return `${providerName}: Invalid message format in request.`;
    }
    // Include raw body for unknown 400s
    const detail = body.slice(0, 300).trim();
    return `${providerName}: Bad request (400)${detail ? `\n\n${detail}` : ''}`;
  }

  return `${providerName}: Request failed (${status})${body ? `\n\n${body.slice(0, 300)}` : ''}`;
}

const PROVIDER_NAMES: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Google Gemini',
  openrouter: 'OpenRouter',
  groq: 'Groq',
  together: 'Together AI',
  nvidia: 'NVIDIA NIM',
  deepseek: 'DeepSeek',
  mistral: 'Mistral',
  ollama: 'Ollama',
  lmstudio: 'LM Studio',
  'azure-openai': 'Azure OpenAI'
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseToolCall(call: {id: string; name: string; args: string}): ToolCall {
  let args: unknown = {};
  try { args = call.args ? JSON.parse(call.args) : {}; } catch { args = {raw: call.args}; }
  return {id: call.id, name: call.name, arguments: args};
}

async function* readSse(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, {stream: true});
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';
    for (const part of parts) {
      const data = part.split('\n').find((line) => line.startsWith('data:'))?.slice(5).trim();
      if (data) yield data;
    }
  }
}
