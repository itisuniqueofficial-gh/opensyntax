import {fetchJson, type ModelProvider, ProviderError} from './provider.js';
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

    // Gemini uses its own format — filter system/tool messages
    const contents = request.messages
      .filter((m) => m.role !== 'system' && m.role !== 'tool')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{text: m.content}]
      }));

    if (!contents.length) {
      yield {type: 'text', text: ''};
      yield {type: 'done'};
      return;
    }

    const response = await fetchJson(url, {
      method: 'POST',
      signal: request.signal,
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        systemInstruction: request.systemPrompt ? {parts: [{text: request.systemPrompt}]} : undefined,
        generationConfig: {
          temperature: request.temperature,
          maxOutputTokens: request.maxTokens
        },
        contents
      })
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new ProviderError(
        buildGeminiError(response.status, body),
        response.status,
        body.slice(0, 2000)
      );
    }

    const json = await response.json() as any;
    const text = json.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('') ?? '';
    for (const chunk of text.match(/.{1,80}/gs) ?? []) yield {type: 'text', text: chunk};
    yield {type: 'done'};
  }
}

function buildGeminiError(status: number, body: string): string {
  if (status === 400) {
    const lower = body.toLowerCase();
    if (/api.key|api_key/i.test(lower)) return 'Google Gemini: Invalid API key. Check your GEMINI_API_KEY.';
    if (/model/i.test(lower)) return `Google Gemini: Model not found or not available.\n\n${body.slice(0, 300)}`;
    return `Google Gemini: Bad request (400)\n\n${body.slice(0, 300)}`;
  }
  if (status === 401 || status === 403) return 'Google Gemini: Authentication failed. Check your API key.';
  if (status === 429) return 'Google Gemini: Rate limit exceeded. Wait a moment and try again.';
  return `Google Gemini: Request failed (${status})${body ? `\n\n${body.slice(0, 300)}` : ''}`;
}
