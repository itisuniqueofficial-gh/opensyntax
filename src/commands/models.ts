/**
 * /model and /models command handlers.
 */

import chalk from 'chalk';
import {modelsForProvider, allModelsForProvider, capabilityBadges} from '../model/registry.js';
import {renderModelList, renderAllModels, selectModelInteractive} from '../model/selector.js';
import {modelUnavailableMessage, fallbackModel} from '../model/capabilities.js';
import {modelsForProvider as fetchModelsForProvider} from '../auth/manager.js';
import {panel} from '../ui/renderer.js';
import {providerRegistry} from '../providers/registry.js';

/** Show models for a specific provider (or all providers). */
export async function showModelsCommand(providerId?: string, showAll = false): Promise<void> {
  if (showAll || providerId === 'all') {
    panel('All Models', renderAllModels());
    return;
  }

  if (!providerId) {
    panel('Models', renderAllModels());
    return;
  }

  // Try to fetch dynamic model list from provider API
  let dynamicIds: string[] | undefined;
  try {
    dynamicIds = await fetchModelsForProvider(providerId);
  } catch {
    // Fall back to registry
  }

  panel(`Models — ${providerId}`, renderModelList(providerId, dynamicIds));
}

/** Interactive model selector — returns the chosen model id. */
export async function pickModelInteractive(providerId: string): Promise<string | undefined> {
  let dynamicIds: string[] | undefined;
  try {
    dynamicIds = await fetchModelsForProvider(providerId);
  } catch {
    // Use registry only
  }
  return selectModelInteractive(providerId, dynamicIds);
}

/** Show a model-unavailable message with fallback suggestions. */
export function showModelUnavailable(providerId: string, modelId: string, availableIds?: string[]): void {
  panel('Model Unavailable', modelUnavailableMessage(providerId, modelId, availableIds));
}

/** Render a compact model info line for the header. */
export function modelInfoLine(providerId: string, modelId: string): string {
  const models = allModelsForProvider(providerId);
  const entry = models.find((m) => m.id === modelId);
  if (!entry) return `${providerId}/${modelId}`;
  const badges = capabilityBadges(entry).slice(0, 4).map((b) => chalk.gray(`[${b}]`)).join(' ');
  return `${entry.name} ${badges}`;
}

/** List all provider names with their default models. */
export function listProviderSummary(): string {
  return providerRegistry.map((p, index) => {
    const models = modelsForProvider(p.id);
    const modelCount = models.length;
    return `  ${index + 1}. ${p.name.padEnd(20)} default: ${p.defaultModel}  (${modelCount} registered models)`;
  }).join('\n');
}
