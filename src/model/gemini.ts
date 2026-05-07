import {fetchJson, readError, type ModelProvider} from './provider.js';
import type {ModelConfig, ModelRequest, StreamEvent} from './types.js';

export class GeminiProvider implements ModelProvider {
  readonly id = 'gemini';
  readonly model: string;
  private readonly apiKey?: string;
  private readonly baseUrl: string;

  constructor(config: ModelConfig) {
    this.model = config.model;
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');
  }

  async *stream(request: ModelRequest): AsyncGenerator<StreamEvent> {
    const url = `${this.baseUrl}/models/${this.model}:generateContent${this.apiKey ? `?key=${this.apiKey}` : ''}`;
    const response = await fetchJson(url, {
      method: 'POST',
      signal: request.signal,
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        systemInstruction: request.systemPrompt ? {parts: [{text: request.systemPrompt}]} : undefined,
        generationConfig: {temperature: request.temperature, maxOutputTokens: request.maxTokens},
        contents: request.messages.filter((m) => m.role !== 'system' && m.role !== 'tool').map((m) => ({role: m.role === 'assistant' ? 'model' : 'user', parts: [{text: m.content}]}))
      })
    });
    if (!response.ok) await readError(response);
    const json = await response.json() as any;
    const text = json.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('') ?? '';
    for (const chunk of text.match(/.{1,80}/gs) ?? []) yield {type: 'text', text: chunk};
    yield {type: 'done'};
  }
}
