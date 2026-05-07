/**
 * Local provider detection and connection.
 *
 * Supports:
 * - Ollama  (http://localhost:11434)
 * - LM Studio (http://localhost:1234/v1)
 *
 * No API key required. Fetches available models from the local server.
 */

import chalk from 'chalk';
import {upsertProvider, type ProviderCredential} from './storage.js';
import {printSuccess, printWarning, printStatus} from '../ui/layout.js';

export type LocalProviderStatus = {
  providerId: string;
  name: string;
  baseUrl: string;
  reachable: boolean;
  models: string[];
  error?: string;
};

const LOCAL_PROVIDERS = [
  {
    id: 'ollama',
    name: 'Ollama',
    baseUrl: 'http://localhost:11434',
    modelsUrl: 'http://localhost:11434/api/tags',
    parseModels: (json: unknown): string[] => {
      const data = json as {models?: Array<{name?: string}>};
      return data.models?.map((m) => m.name).filter(Boolean) as string[] ?? [];
    }
  },
  {
    id: 'lmstudio',
    name: 'LM Studio',
    baseUrl: 'http://localhost:1234/v1',
    modelsUrl: 'http://localhost:1234/v1/models',
    parseModels: (json: unknown): string[] => {
      const data = json as {data?: Array<{id?: string}>};
      return data.data?.map((m) => m.id).filter(Boolean) as string[] ?? [];
    }
  }
];

/** Check whether a local provider is reachable and fetch its models. */
export async function checkLocalProvider(providerId: string): Promise<LocalProviderStatus> {
  const def = LOCAL_PROVIDERS.find((p) => p.id === providerId);
  if (!def) return {providerId, name: providerId, baseUrl: '', reachable: false, models: [], error: 'Unknown local provider'};

  try {
    const res = await fetch(def.modelsUrl, {signal: AbortSignal.timeout(3000)});
    if (!res.ok) {
      return {providerId, name: def.name, baseUrl: def.baseUrl, reachable: false, models: [], error: `HTTP ${res.status}`};
    }
    const json = await res.json();
    const models = def.parseModels(json);
    return {providerId, name: def.name, baseUrl: def.baseUrl, reachable: true, models};
  } catch (err) {
    return {
      providerId,
      name: def.name,
      baseUrl: def.baseUrl,
      reachable: false,
      models: [],
      error: err instanceof Error ? err.message : 'Connection refused'
    };
  }
}

/** Detect all running local providers. */
export async function detectLocalProviders(): Promise<LocalProviderStatus[]> {
  const results = await Promise.all(LOCAL_PROVIDERS.map((p) => checkLocalProvider(p.id)));
  return results.filter((r) => r.reachable);
}

/** Connect a local provider (no API key needed). */
export async function connectLocalProviderAuto(status: LocalProviderStatus, model?: string): Promise<void> {
  const selectedModel = model ?? status.models[0] ?? 'local-model';
  const credential: ProviderCredential = {
    providerId: status.providerId,
    authMethod: 'none',
    baseUrl: status.baseUrl,
    model: selectedModel,
    connectedAt: new Date().toISOString(),
    models: status.models
  };
  await upsertProvider(status.providerId, credential, true);
}

/** Run the full local provider detection and connection flow. */
export async function runLocalProviderSetup(providerId: string): Promise<boolean> {
  printStatus(`Checking ${providerId} at local server...`);
  const status = await checkLocalProvider(providerId);

  if (!status.reachable) {
    const hint = providerId === 'ollama'
      ? 'Start Ollama with: ollama serve'
      : 'Start LM Studio and enable the local server in settings.';
    printWarning(`${status.name} not reachable at ${status.baseUrl}`);
    printWarning(hint);
    return false;
  }

  printSuccess(`${status.name} detected at ${status.baseUrl}`);
  if (status.models.length) {
    printSuccess(`${status.models.length} model${status.models.length === 1 ? '' : 's'} available`);
  }

  const model = status.models[0] ?? 'local-model';
  await connectLocalProviderAuto(status, model);
  printSuccess(`Connected — default model: ${chalk.cyan(model)}`);
  return true;
}
