import type {AppConfig} from '../config/config.js';
import {getProvider, providerRegistry, requireProvider} from '../providers/registry.js';
import {decryptSecret, loadProviders, removeProvider, upsertProvider, type ProviderCredential} from './storage.js';
import {createApiKeyCredential} from './api-key.js';
import {discoverModels, validateProviderConnection} from './validators.js';

export async function hasConfiguredProvider(): Promise<boolean> {
  const file = await loadProviders();
  return Object.keys(file.providers).length > 0;
}

export async function listConnectedProviders(): Promise<Array<ProviderCredential & {name: string; isDefault: boolean}>> {
  const file = await loadProviders();
  return Object.values(file.providers).map((credential) => ({...credential, name: getProvider(credential.providerId)?.name ?? credential.providerId, isDefault: file.defaultProvider === credential.providerId}));
}

export async function connectApiKeyProvider(input: {providerId: string; apiKey: string; baseUrl?: string; model?: string; validate?: boolean; setDefault?: boolean}) {
  const provider = requireProvider(input.providerId);
  const result = await createApiKeyCredential({provider, apiKey: input.apiKey, baseUrl: input.baseUrl, model: input.model, validate: input.validate});
  await upsertProvider(provider.id, result.credential, input.setDefault ?? true);
  return result;
}

export async function connectLocalProvider(input: {providerId: string; baseUrl?: string; model?: string; setDefault?: boolean}) {
  const provider = requireProvider(input.providerId);
  const credential: ProviderCredential = {providerId: provider.id, authMethod: 'none', baseUrl: input.baseUrl ?? provider.baseUrl, model: input.model ?? provider.defaultModel, connectedAt: new Date().toISOString()};
  await upsertProvider(provider.id, credential, input.setDefault ?? true);
  return credential;
}

export async function disconnectProvider(providerId: string): Promise<void> {
  await removeProvider(providerId);
}

export async function setDefaultProvider(providerId: string): Promise<void> {
  const file = await loadProviders();
  if (!file.providers[providerId]) throw new Error(`Provider is not connected: ${providerId}`);
  file.defaultProvider = providerId;
  await upsertProvider(providerId, file.providers[providerId], true);
}

export async function resolveModelConfig(base: AppConfig, requestedProviderId?: string): Promise<AppConfig> {
  const file = await loadProviders();
  const selected = requestedProviderId ? file.providers[requestedProviderId] : file.providers[base.provider] ?? (file.defaultProvider ? file.providers[file.defaultProvider] : undefined);
  if (!selected) {
    const provider = requestedProviderId ? getProvider(requestedProviderId) : getProvider(base.provider);
    if (!provider) return base;
    return {...base, provider: provider.id, providerName: provider.name, model: base.model || provider.defaultModel, apiKey: base.apiKey ?? envKey(provider), baseUrl: base.baseUrl ?? provider.baseUrl};
  }
  const provider = requireProvider(selected.providerId);
  return {...base, provider: selected.providerId, providerName: provider.name, model: selected.model, apiKey: selected.encryptedSecret ? decryptSecret(selected.encryptedSecret) : envKey(provider), baseUrl: selected.baseUrl ?? provider.baseUrl, permission: base.permission};
}

export async function activeProviderId(requestedProviderId?: string): Promise<string | undefined> {
  const file = await loadProviders();
  return requestedProviderId ?? file.defaultProvider ?? Object.keys(file.providers)[0];
}

export async function providerHealth(providerId: string): Promise<{ok: boolean; message: string; models?: string[]}> {
  const provider = requireProvider(providerId);
  const file = await loadProviders();
  const credential = file.providers[providerId];
  const apiKey = credential?.encryptedSecret ? decryptSecret(credential.encryptedSecret) : envKey(provider);
  return validateProviderConnection({provider, apiKey, baseUrl: credential?.baseUrl ?? provider.baseUrl});
}

export async function modelsForProvider(providerId: string): Promise<string[]> {
  const provider = requireProvider(providerId);
  const file = await loadProviders();
  const credential = file.providers[providerId];
  const apiKey = credential?.encryptedSecret ? decryptSecret(credential.encryptedSecret) : envKey(provider);
  const models = await discoverModels(provider, apiKey, credential?.baseUrl ?? provider.baseUrl);
  if (credential) await upsertProvider(providerId, {...credential, models}, false);
  return models;
}

export function providerChoices() {
  return providerRegistry.map((provider) => {
    const definition = provider as {name: string; id: string; defaultModel: string; notes?: string};
    return {title: definition.name, value: definition.id, description: definition.notes ?? definition.defaultModel};
  });
}

export function envKey(provider: {apiKeyEnv?: readonly string[]}): string | undefined {
  return provider.apiKeyEnv?.map((name) => process.env[name]).find(Boolean);
}

