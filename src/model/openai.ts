import {zodToJsonSchema} from '../utils/schema.js';
import {fetchJson, readError, type ModelProvider} from './provider.js';
import type {ChatMessage, ModelConfig, ModelRequest, StreamEvent, ToolCall} from './types.js';

export class OpenAIProvider implements ModelProvider {
  readonly id: string;
  readonly model: string;
  private readonly baseUrl: string;
  private readonly apiKey?: string;

  constructor(config: ModelConfig) {
    this.id = config.provider;
    this.model = config.model;
    this.baseUrl = (config.baseUrl ?? (config.provider === 'openrouter' ? 'https://openrouter.ai/api/v1' : 'https://api.openai.com/v1')).replace(/\/$/, '');
    this.apiKey = config.apiKey;
  }

  async *stream(request: ModelRequest): AsyncGenerator<StreamEvent> {
    const response = await fetchJson(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      signal: request.signal,
      headers: {
        'content-type': 'application/json',
        ...(this.apiKey ? {authorization: `Bearer ${this.apiKey}`} : {})
      },
      body: JSON.stringify({
        model: this.model,
        stream: true,
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        messages: toOpenAIMessages(request.messages, request.systemPrompt),
        tools: request.tools.map((tool) => ({
          type: 'function',
          function: {name: tool.name, description: tool.description, parameters: zodToJsonSchema(tool.schema)}
        })),
        tool_choice: 'auto'
      })
    });
    if (!response.ok) await readError(response);
    const body = response.body;
    if (!body) throw new Error('Provider response did not include a stream body');

    const calls = new Map<number, {id: string; name: string; args: string}>();
    for await (const data of readSse(body)) {
      if (data === '[DONE]') break;
      const json = JSON.parse(data) as any;
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
}

function toOpenAIMessages(messages: ChatMessage[], systemPrompt?: string) {
  const converted: any[] = systemPrompt ? [{role: 'system', content: systemPrompt}] : [];
  for (const message of messages) {
    if (message.role === 'tool') converted.push({role: 'tool', tool_call_id: message.toolCallId, content: message.content});
    else converted.push({role: message.role, content: message.content, tool_calls: message.toolCalls?.map((call) => ({id: call.id, type: 'function', function: {name: call.name, arguments: JSON.stringify(call.arguments)}}))});
  }
  return converted;
}

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
