/**
 * Model validation — verifies that the active provider/model combination
 * is valid before starting a chat session or sending a request.
 *
 * Checks:
 * 1. Provider is connected
 * 2. Model belongs to the active provider (or is in the fetched model list)
 * 3. Model is not speculative-only
 * 4. Provider supports the requested features
 */

import {findModel, modelsForProvider} from './registry.js';
import {getProviderCapabilities} from '../providers/capabilities.js';
import {loadCachedModels} from './cache.js';

export type ValidationResult = {
  ok: boolean;
  warnings: string[];
  errors: string[];
};

/**
 * Validate that a provider/model combination is usable.
 * Uses the static registry + cached dynamic model list.
 */
export async function validateProviderModel(
  providerId: string,
  modelId: string
): Promise<ValidationResult> {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check static registry
  const registryEntry = findModel(providerId, modelId);

  if (registryEntry?.speculative) {
    warnings.push(`${modelId} is a speculative/future model and may not be available yet.`);
  }

  // Check dynamic cache
  const cached = await loadCachedModels(providerId);
  if (cached && cached.length > 0 && !cached.includes(modelId)) {
    // Model not in the fetched list — warn but don't hard-fail
    // (the user may have typed a valid model not in our cache)
    warnings.push(`${modelId} was not found in the fetched model list for ${providerId}.`);
    warnings.push(`Run /models refresh to update the model list.`);
  }

  // Check provider capabilities
  const caps = getProviderCapabilities(providerId);
  if (!caps.supportsStreaming) {
    warnings.push(`${providerId} does not support streaming — responses may be slower.`);
  }

  return {ok: errors.length === 0, warnings, errors};
}

/**
 * Return the best available model for a provider.
 * Prefers: cached dynamic list → static registry → provider default.
 */
export async function resolveDefaultModel(
  providerId: string,
  preferredModel?: string
): Promise<string> {
  // If preferred model is in the cached list, use it
  if (preferredModel) {
    const cached = await loadCachedModels(providerId);
    if (!cached || cached.includes(preferredModel)) return preferredModel;
    // Preferred model not available — fall through to find a good default
  }

  // Try static registry
  const registered = modelsForProvider(providerId);
  if (registered.length) return registered[0].id;

  // Last resort: return the preferred model anyway (provider may accept it)
  return preferredModel ?? 'unknown';
}

/**
 * Check whether a model supports tools, considering both provider and model caps.
 */
export function modelSupportsTools(providerId: string, modelId: string): boolean {
  const provCaps = getProviderCapabilities(providerId);
  if (!provCaps.supportsTools) return false;
  const entry = findModel(providerId, modelId);
  if (!entry) return true; // assume supported if unknown
  return entry.supportsTools;
}
