/**
 * Interactive model selector — shows ONLY models for the active connected provider.
 */

import chalk from 'chalk';
import prompts from 'prompts';
import {listConnectedProviders} from '../auth/manager.js';
import {allModelsForProvider, capabilityBadges, type ModelEntry} from '../model/registry.js';
import {getProviderModels} from '../model/runtime.js';
import {panel} from './renderer.js';

/**
 * Show an interactive model selector for a specific connected provider.
 * Returns the selected model id, or undefined if cancelled.
 */
export async function selectModelForProvider(providerId: string): Promise<string | undefined> {
  const connected = await listConnectedProviders();
  const providerInfo = connected.find((c) => c.providerId === providerId);

  if (!providerInfo) {
    panel('Model', `Provider "${providerId}" is not connected. Run: opensyntax auth`);
    return undefined;
  }

  // Get model list: dynamic (cached/fetched) + registry metadata
  const dynamicIds = await getProviderModels(providerId);
  const registered = allModelsForProvider(providerId);

  // Build merged list
  const allIds = dynamicIds.length > 0 ? dynamicIds : registered.map((m) => m.id);

  if (!allIds.length) {
    panel('Model', `No models found for ${providerInfo.name}. Run /models refresh.`);
    return undefined;
  }

  const choices = allIds.map((id, index) => {
    const entry = registered.find((m) => m.id === id);
    const badges = entry
      ? capabilityBadges(entry).slice(0, 4).map((b) => chalk.gray(`[${b}]`)).join(' ')
      : chalk.gray('[streaming]');
    const specNote = entry?.speculative ? chalk.yellow(' (speculative)') : '';
    const name = entry?.name ?? id;
    const ctx = entry?.contextWindow ? `${(entry.contextWindow / 1000).toFixed(0)}k ctx` : undefined;

    return {
      title: `${index + 1}. ${name}${specNote} ${badges}`,
      value: id,
      description: ctx
    };
  });

  const response = await prompts({
    type: 'select',
    name: 'value',
    message: `Select Model (${providerInfo.name})`,
    choices
  });

  return response.value as string | undefined;
}
