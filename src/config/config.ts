import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {z} from 'zod';
import {ensureDir} from '../utils/paths.js';
import {defaultConfig} from './defaults.js';

const configSchema = z.object({
  provider: z.string().default(defaultConfig.provider),
  providerName: z.string().optional(),
  model: z.string().default(defaultConfig.model),
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
  temperature: z.number().min(0).max(2).default(defaultConfig.temperature),
  maxTokens: z.number().int().positive().default(defaultConfig.maxTokens),
  showToolSummary: z.boolean().default(false),
  permission: z.enum(['read-only', 'workspace-write', 'shell-safe', 'full-access']).default(defaultConfig.permission)
});

export type AppConfig = z.infer<typeof configSchema>;
export const configDir = path.join(os.homedir(), '.opensyntax');
export const configPath = path.join(configDir, 'config.json');

export async function loadConfig(overrides: Partial<AppConfig> = {}): Promise<AppConfig> {
  let fileConfig: unknown = {};
  try { fileConfig = JSON.parse(await readFile(configPath, 'utf8')); } catch {}
  const envConfig = {
    provider: process.env.OPENSYNTAX_PROVIDER,
    model: process.env.OPENSYNTAX_MODEL,
    apiKey: process.env.OPENSYNTAX_API_KEY ?? process.env.OPENAI_API_KEY ?? process.env.ANTHROPIC_API_KEY ?? process.env.GEMINI_API_KEY,
    baseUrl: process.env.OPENSYNTAX_BASE_URL,
    temperature: process.env.OPENSYNTAX_TEMPERATURE ? Number(process.env.OPENSYNTAX_TEMPERATURE) : undefined,
    maxTokens: process.env.OPENSYNTAX_MAX_TOKENS ? Number(process.env.OPENSYNTAX_MAX_TOKENS) : undefined
  };
  return configSchema.parse(removeUndefined({...defaultConfig, ...sanitizeConfig(fileConfig), ...removeUndefined(envConfig), ...removeUndefined(overrides)}));
}

export async function saveConfig(config: AppConfig): Promise<void> {
  await ensureDir(configDir);
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, {encoding: 'utf8', mode: 0o600});
}

function removeUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as Partial<T>;
}

function sanitizeConfig(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') return {};
  const next = {...value} as Record<string, unknown>;
  return next;
}
