import {fetchJson, readError, type ModelProvider, ProviderError} from './provider.js';
import type {ModelConfig, ModelRequest, StreamEvent} from './types.js';

export class AnthropicProvider implements ModelProvider {
  readonly id = 'anthropic';
  readonly model: string;
  private readonly apiKey?: string;
  private readonly baseUrl: string;

  constructor(config: ModelConfig) {
    this.model = config.model;
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? 'https://api.anthropic.com/v1').replace(/\/$/, '');
  }

  async *stream(request: ModelRequest): AsyncGenerator<StreamEvent> {
    // Anthropic uses its own message format — filter out system/tool roles
    // and only pass user/assistant turns.
    const messages = request.messages
      .filter((m) => m.role !== 'system' && m.role !== 'tool')
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }));

    // Ensure we have at least one message
    if (!messages.length) {
      yield {type: 'text', text: ''};
      yield {type: 'done'};
      return;
    }

    const response = await fetchJson(`${this.baseUrl}/messages`, {
      method: 'POST',
      signal: request.signal,
      headers: {
        'content-type': 'application/json',
        'anthropic-version': '2023-06-01',
        ...(this.apiKey ? {'x-api-key': this.apiKey} : {})
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature,
        system: request.systemPrompt,
        stream: false,
        messages
      })
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new ProviderError(
        buildAnthropicError(response.status, body),
        response.status,
        body.slice(0, 2000)
      );
    }

    const json = await response.json() as any;
    const text = (json.content ?? []).map((p: any) => p.text ?? '').join('');
    for (const chunk of text.match(/.{1,80}/gs) ?? []) yield {type: 'text', text: chunk};
    yield {type: 'done'};
  }
}

function buildAnthropicError(status: number, body: string): string {
  if (status === 401) return 'Anthropic: Authentication failed. Check your API key (should start with sk-ant-).';
  if (status === 429) return 'Anthropic: Rate limit exceeded. Wait a moment and try again.';
  if (status === 400) {
    const detail = body.slice(0, 300).trim();
    return `Anthropic: Bad request (400)${detail ? `\n\n${detail}` : ''}`;
  }
  return `Anthropic: Request failed (${status})${body ? `\n\n${body.slice(0, 300)}` : ''}`;
}
