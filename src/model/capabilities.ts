/**
 * Model capability detection and smart fallback helpers.
 * Used by the agent loop and UI to make decisions based on what a model supports.
 */

import {findModel, modelsForProvider, type ModelEntry} from './registry.js';

export type CapabilityCheckResult = {
  supported: boolean;
  reason?: string;
};

/** Check whether a specific model supports a capability. Falls back to registry data. */
export function checkCapability(
  providerId: string,
  modelId: string,
  capability: keyof Pick<ModelEntry, 'supportsTools' | 'supportsStreaming' | 'supportsVision' | 'supportsReasoning' | 'supportsJson'>
): CapabilityCheckResult {
  const entry = findModel(providerId, modelId);
  if (!entry) return {supported: true, reason: 'Model not in registry; assuming supported'};
  return {supported: entry[capability], reason: entry[capability] ? undefined : `${entry.name} does not support ${capability}`};
}

/** Return the best fallback model for a provider when the requested model is unavailable. */
export function fallbackModel(providerId: string, unavailableModelId: string, availableIds?: string[]): ModelEntry | undefined {
  const candidates = modelsForProvider(providerId).filter((m) => m.id !== unavailableModelId);
  if (availableIds?.length) {
    const available = candidates.filter((m) => availableIds.includes(m.id));
    if (available.length) return available[0];
  }
  return candidates[0];
}

/** Format a user-facing message when a model is unavailable. */
export function modelUnavailableMessage(
  providerId: string,
  modelId: string,
  availableIds?: string[]
): string {
  const lines: string[] = [`Model unavailable: ${modelId}`];
  const fallback = fallbackModel(providerId, modelId, availableIds);
  const candidates = availableIds?.length
    ? availableIds.slice(0, 5)
    : modelsForProvider(providerId).slice(0, 5).map((m) => m.id);

  if (candidates.length) {
    lines.push('Available models:');
    candidates.forEach((id, index) => lines.push(`  ${index + 1}. ${id}`));
  }
  if (fallback) lines.push(`\nSuggested fallback: ${fallback.id}`);
  lines.push('\nRun /model to switch, or /models to see all options.');
  return lines.join('\n');
}

/** Detect whether a model ID looks like a reasoning/thinking model. */
export function isReasoningModel(modelId: string): boolean {
  return /\b(o1|o3|o4|thinking|reasoner|r1|r2)\b/i.test(modelId);
}

/** Detect whether a model ID looks like a vision-capable model. */
export function isVisionModel(modelId: string): boolean {
  return /\b(vision|4o|4\.1|gemini|claude-3|sonnet|opus|haiku)\b/i.test(modelId);
}
