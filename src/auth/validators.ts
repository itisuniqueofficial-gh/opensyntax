import type {ProviderDefinition} from '../providers/registry.js';

export function validateApiKeyFormat(provider: ProviderDefinition, apiKey: string): {ok: boolean; message: string} {
  if (!provider.requiresApiKey) return {ok: true, message: 'API key not required'};
  if (!apiKey.trim()) return {ok: false, message: 'API key is required'};
  if (provider.apiKeyPrefix?.length && !provider.apiKeyPrefix.some((prefix) => apiKey.startsWith(prefix))) {
    return {ok: false, message: `${provider.name} keys usually start with ${provider.apiKeyPrefix.join(' or ')}`};
  }
  return {ok: true, message: 'API key format looks valid'};
}

export async function validateProviderConnection(input: {provider: ProviderDefinition; apiKey?: string; baseUrl?: string}): Promise<{ok: boolean; message: string; models?: string[]}> {
  const {provider, apiKey, baseUrl} = input;
  if (provider.type === 'local' || !provider.requiresApiKey) return checkModels(provider, undefined, baseUrl);
  if (!apiKey) return {ok: false, message: 'Missing API key'};
  return checkModels(provider, apiKey, baseUrl);
}

export async function discoverModels(provider: ProviderDefinition, apiKey?: string, baseUrl?: string): Promise<string[]> {
  const result = await checkModels(provider, apiKey, baseUrl);
  return result.models?.length ? result.models : [provider.defaultModel];
}

async function checkModels(provider: ProviderDefinition, apiKey?: string, baseUrl?: string): Promise<{ok: boolean; message: string; models?: string[]}> {
  if (!provider.modelsEndpoint) return {ok: true, message: 'Provider configured', models: [provider.defaultModel]};
  const root = (baseUrl ?? provider.baseUrl)?.replace(/\/$/, '');
  if (!root) return {ok: false, message: 'Base URL is required'};
  try {
    const response = await fetch(`${root}${provider.modelsEndpoint}`, {headers: apiKey ? {authorization: `Bearer ${apiKey}`} : {}, signal: AbortSignal.timeout(8000)});
    if (!response.ok) return {ok: false, message: `${provider.name} returned ${response.status} ${response.statusText}`};
    const json = await response.json() as {data?: Array<{id?: string}>; models?: Array<{name?: string}>};
    const models = (json.data?.map((item) => item.id).filter(Boolean) ?? json.models?.map((item) => item.name).filter(Boolean) ?? []) as string[];
    return {ok: true, message: models.length ? 'Models fetched' : 'Provider reachable', models: models.length ? models : [provider.defaultModel]};
  } catch (error) {
    return {ok: false, message: error instanceof Error ? error.message : 'Provider validation failed'};
  }
}
