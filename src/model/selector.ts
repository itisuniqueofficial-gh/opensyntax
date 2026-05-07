/**
 * Model selector — interactive prompts for choosing provider and model.
 * Used by /model, /models, /provider, and /providers slash commands.
 */

import chalk from 'chalk';
import prompts from 'prompts';
import {providerRegistry} from '../providers/registry.js';
import {modelsForProvider, allModelsForProvider, capabilityBadges, type ModelEntry} from './registry.js';
import {panel} from '../ui/renderer.js';

// ---------------------------------------------------------------------------
// Provider selection
// ---------------------------------------------------------------------------

export async function selectProviderInteractive(): Promise<string | undefined> {
  const choices = providerRegistry.map((p, index) => ({
    title: `${index + 1}. ${p.name}`,
    value: p.id,
    description: `${p.defaultModel} · ${p.type}`
  }));

  const response = await prompts({
    type: 'select',
    name: 'value',
    message: 'Select Provider',
    choices
  });

  return response.value as string | undefined;
}

// ---------------------------------------------------------------------------
// Model selection
// ---------------------------------------------------------------------------

export async function selectModelInteractive(providerId: string, dynamicIds?: string[]): Promise<string | undefined> {
  const registered = modelsForProvider(providerId);
  const dynamic = dynamicIds ?? [];

  // Merge: dynamic first, then registry entries not already in dynamic list
  const merged: ModelEntry[] = [
    ...registered.filter((m) => dynamic.includes(m.id)),
    ...registered.filter((m) => !dynamic.includes(m.id)),
    // Dynamic-only models not in registry
    ...dynamic.filter((id) => !registered.some((m) => m.id === id)).map((id) => ({
      id,
      name: id,
      provider: providerId,
      family: 'unknown',
      supportsTools: true,
      supportsStreaming: true,
      supportsVision: false,
      supportsReasoning: false,
      supportsJson: true,
      recommendedFor: []
    } satisfies ModelEntry))
  ];

  if (!merged.length) {
    panel('No Models', `No models found for provider: ${providerId}`);
    return undefined;
  }

  const choices = merged.map((m, index) => {
    const badges = capabilityBadges(m).slice(0, 4).map((b) => chalk.gray(`[${b}]`)).join(' ');
    return {
      title: `${index + 1}. ${m.name} ${badges}`,
      value: m.id,
      description: m.contextWindow ? `${(m.contextWindow / 1000).toFixed(0)}k context` : undefined
    };
  });

  const response = await prompts({
    type: 'select',
    name: 'value',
    message: `Select Model (${providerId})`,
    choices
  });

  return response.value as string | undefined;
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

/** Render a formatted model list for a provider. */
export function renderModelList(providerId: string, dynamicIds?: string[]): string {
  const models = allModelsForProvider(providerId);
  if (!models.length && !dynamicIds?.length) return `No models registered for ${providerId}.`;

  const dynamic = dynamicIds ?? [];
  const allIds = [...new Set([...models.map((m) => m.id), ...dynamic])];

  const lines: string[] = [`Models for ${chalk.cyan(providerId)}:`];
  allIds.forEach((id, index) => {
    const entry = models.find((m) => m.id === id);
    const badges = entry ? capabilityBadges(entry).slice(0, 5).map((b) => chalk.gray(`[${b}]`)).join(' ') : '';
    const specNote = entry?.speculative ? chalk.yellow(' (speculative)') : '';
    lines.push(`  ${index + 1}. ${entry?.name ?? id}${specNote} ${badges}`);
  });
  return lines.join('\n');
}

/** Render all models grouped by provider. */
export function renderAllModels(): string {
  const lines: string[] = ['All Available Models\n'];
  for (const provider of providerRegistry) {
    const models = modelsForProvider(provider.id);
    if (!models.length) continue;
    lines.push(chalk.bold.cyan(provider.name));
    models.forEach((m, index) => {
      const badges = capabilityBadges(m).slice(0, 4).map((b) => chalk.gray(`[${b}]`)).join(' ');
      lines.push(`  ${index + 1}. ${m.name} ${badges}`);
    });
    lines.push('');
  }
  return lines.join('\n');
}
