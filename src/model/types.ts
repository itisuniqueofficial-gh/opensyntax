import {z} from 'zod';

export type ModelRole = 'system' | 'user' | 'assistant' | 'tool';

export type ChatMessage = {
  role: ModelRole;
  content: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
};

export type ToolCall = {
  id: string;
  name: string;
  arguments: unknown;
};

export type ToolSpec = {
  name: string;
  description: string;
  schema: z.ZodTypeAny;
};

export type StreamEvent =
  | {type: 'text'; text: string}
  | {type: 'tool_call'; call: ToolCall}
  | {type: 'done'; usage?: TokenUsage};

export type TokenUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export type ModelRequest = {
  messages: ChatMessage[];
  tools: ToolSpec[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
};

export type ModelConfig = {
  provider: string;
  providerName?: string;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature: number;
  maxTokens: number;
  showToolSummary?: boolean;
};
