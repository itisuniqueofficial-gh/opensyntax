import type {ModelConfig} from '../model/types.js';

export const defaultConfig: ModelConfig & {permission: 'read-only' | 'workspace-write' | 'shell-safe' | 'full-access'} = {
  provider: 'openai',
  model: 'gpt-4o-mini',
  apiKey: process.env.OPENSYNTAX_API_KEY ?? process.env.OPENAI_API_KEY,
  baseUrl: process.env.OPENSYNTAX_BASE_URL,
  temperature: Number(process.env.OPENSYNTAX_TEMPERATURE ?? 0.2),
  maxTokens: Number(process.env.OPENSYNTAX_MAX_TOKENS ?? 4096),
  permission: 'shell-safe'
};

export const defaultSystemPrompt = `You are OpenSyntax, a terminal AI coding agent.
Use tools for filesystem, git, and shell work. Do not claim changes were made unless a tool succeeded.
Prefer small, safe edits. Inspect git state before editing. Never run destructive commands without permission.
Continue until the user's request is complete, then summarize files changed and verification results.`;
