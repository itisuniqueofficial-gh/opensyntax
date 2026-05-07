import {fetchJson, readError, type ModelProvider} from './provider.js';
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
    const response = await fetchJson(`${this.baseUrl}/messages`, {
      method: 'POST',
      signal: request.signal,
      headers: {'content-type': 'application/json', 'anthropic-version': '2023-06-01', ...(this.apiKey ? {'x-api-key': this.apiKey} : {})},
      body: JSON.stringify({
        model: this.model,
        max_tokens: request.maxTokens,
        temperature: request.temperature,
        system: request.systemPrompt,
        stream: false,
        messages: request.messages.filter((m) => m.role !== 'system' && m.role !== 'tool').map((m) => ({role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content}))
      })
    });
    if (!response.ok) await readError(response);
    const json = await response.json() as any;
    const text = (json.content ?? []).map((p: any) => p.text ?? '').join('');
    for (const chunk of text.match(/.{1,80}/gs) ?? []) yield {type: 'text', text: chunk};
    yield {type: 'done'};
  }
}
