/**
 * Runtime provider/model state manager.
 *
 * Single source of truth for the active provider and model during a session.
 * Handles switching, validation, and capability-aware feature flags.
 */

import {getProviderCapabilities} from '../providers/capabilities.js';
import {findModel} from './registry.js';
import {validateProviderModel, modelSupportsTools} from './validation.js';
import {loadCachedModels, saveCachedModels} from './cache.js';
import {discoverModels} from '../auth/validators.js';
import {getProvider} from '../providers/registry.js';
import {loadProviders} from '../auth/storage.js';
import {decryptSecret} from '../auth/storage.js';
import {envKey} from '../auth/manager.js';

export type RuntimeState = {
  providerId: string;
  providerName: string;
  modelId: string;
  /** Models available for the active provider (fetched + cached) */
  availableModels: string[];
  /** Whether tool calling is enabled for this provider/model */
  toolsEnabled: boolean;
  /** Whether streaming is supported */
  streamingEnabled: boolean;
  /** Startup validation warnings */
  warnings: string[];
};

/**
 * Build the runtime state for a provider/model pair.
 * Loads cached models; does not make network calls.
 */
export async function buildRuntimeState(
  providerId: string,
  modelId: string
): Promise<RuntimeState> {
  const provider = getProvider(providerId);
  const caps = getProviderCapabilities(providerId);
  const cached = await loadCachedModels(providerId) ?? [];
  const validation = await validateProviderModel(providerId, modelId);

  return {
    providerId,
    providerName: provider?.name ?? providerId,
    modelId,
    availableModels: cached,
    toolsEnabled: modelSupportsTools(providerId, modelId),
    streamingEnabled: caps.supportsStreaming,
    warnings: validation.warnings
  };
}

/**
 * Fetch fresh models from the provider API and update the cache.
 * Returns the model list (or cached list on failure).
 */
export async function refreshProviderModels(providerId: string): Promise<string[]> {
  const provider = getProvider(providerId);
  if (!provider) return [];

  const file = await loadProviders();
  const credential = file.providers[providerId];
  const apiKey = credential?.encryptedSecret
    ? decryptSecret(credential.encryptedSecret)
    : envKey(provider);

  try {
    const models = await discoverModels(provider, apiKey, credential?.baseUrl ?? provider.baseUrl);
    if (models.length) await saveCachedModels(providerId, models);
    return models;
  } catch {
    // Return cached list on network failure
    return await loadCachedModels(providerId) ?? [];
  }
}

/**
 * Get the model list for a provider — from cache first, then API.
 * Used by /models and the interactive selector.
 */
export async function getProviderModels(
  providerId: string,
  forceRefresh = false
): Promise<string[]> {
  if (!forceRefresh) {
    const cached = await loadCachedModels(providerId);
    if (cached && cached.length > 0) return cached;
  }
  return refreshProviderModels(providerId);
}

/**
 * Check whether a model ID is valid for a provider.
 * Uses cached list if available; falls back to registry.
 */
export async function isModelAvailable(
  providerId: string,
  modelId: string
): Promise<boolean> {
  const cached = await loadCachedModels(providerId);
  if (cached && cached.length > 0) return cached.includes(modelId);
  // Not in cache — check static registry
  const entry = findModel(providerId, modelId);
  return entry !== undefined && !entry.speculative;
}
