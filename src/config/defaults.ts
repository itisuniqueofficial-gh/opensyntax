import type {ModelConfig} from '../model/types.js';

export const defaultConfig: ModelConfig & {
  permission: 'read-only' | 'workspace-write' | 'shell-safe' | 'full-access';
  thinkingDisplay: boolean;
  showReasoningSummary: boolean;
  modelFallback: boolean;
  markdown: boolean;
  syntaxHighlighting: boolean;
  codeBox: boolean;
  lineNumbers: boolean;
  unicodeBoxes: boolean;
  clickableLinks: boolean;
  theme: 'dark' | 'light' | 'no-color';
} = {
  provider: 'openai',
  model: 'gpt-4.1-mini',
  apiKey: process.env.OPENSYNTAX_API_KEY ?? process.env.OPENAI_API_KEY,
  baseUrl: process.env.OPENSYNTAX_BASE_URL,
  temperature: Number(process.env.OPENSYNTAX_TEMPERATURE ?? 0.2),
  maxTokens: Number(process.env.OPENSYNTAX_MAX_TOKENS ?? 4096),
  showToolSummary: false,
  permission: 'shell-safe',
  thinkingDisplay: true,
  showReasoningSummary: false,
  modelFallback: true,
  markdown: true,
  syntaxHighlighting: true,
  codeBox: true,
  lineNumbers: true,
  unicodeBoxes: true,
  clickableLinks: false,
  theme: 'dark'
};

export const defaultSystemPrompt = `You are OpenSyntax, a terminal AI coding agent.
Use tools for filesystem, git, and shell work. Do not claim changes were made unless a tool succeeded.
Prefer small, safe edits. Inspect git state before editing. Never run destructive commands without permission.
Continue until the user's request is complete, then summarize files changed and verification results.`;
