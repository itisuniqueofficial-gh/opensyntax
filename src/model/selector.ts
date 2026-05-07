/**
 * Model selector — interactive prompts for choosing provider and model.
 *
 * These functions are provider-aware: they only show connected providers
 * and their respective models.
 */

import chalk from 'chalk';
import prompts from 'prompts';
import {listConnectedProviders} from '../auth/manager.js';
import {allModelsForProvider, capabilityBadges, type ModelEntry} from './registry.js';
import {getProviderModels} from './runtime.js';
import {panel} from '../ui/renderer.js';

// ---------------------------------------------------------------------------
// Provider selection — connected only
// ---------------------------------------------------------------------------

export async function selectProviderInteractive(): Promise<string | undefined> {
  const connected = await listConnectedProviders();

  if (!connected.length) {
    panel('Provider', 'No providers connected. Run: opensyntax auth');
    return undefined;
  }

  if (connected.length === 1) return connected[0].providerId;

  const choices = connected.map((item, index) => ({
    title: `${index + 1}. ${item.name}${item.isDefault ? chalk.green(' (active)') : ''}`,
    value: item.providerId,
    description: `model: ${item.model}`
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
// Model selection — provider-scoped
// ---------------------------------------------------------------------------

export async function selectModelInteractive(
  providerId: string,
  dynamicIds?: string[]
): Promise<string | undefined> {
  const registered = allModelsForProvider(providerId);
  // Use provided dynamic list, or fetch from cache/API
  const dynamic = dynamicIds ?? await getProviderModels(providerId);

  // Build merged list: dynamic first (with registry metadata), then registry-only
  const merged: ModelEntry[] = [
    ...registered.filter((m) => dynamic.includes(m.id)),
    ...registered.filter((m) => !dynamic.includes(m.id) && !m.speculative),
    // Dynamic-only models not in registry
    ...dynamic
      .filter((id) => !registered.some((m) => m.id === id))
      .map((id) => ({
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
    const specNote = m.speculative ? chalk.yellow(' (speculative)') : '';
    return {
      title: `${index + 1}. ${m.name}${specNote} ${badges}`,
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

/** Render a formatted model list for a provider (uses dynamic list if provided). */
export function renderModelList(providerId: string, dynamicIds?: string[]): string {
  const models = allModelsForProvider(providerId);
  const dynamic = dynamicIds ?? [];
  const allIds = dynamic.length > 0
    ? dynamic
    : models.filter((m) => !m.speculative).map((m) => m.id);

  if (!allIds.length) return `No models registered for ${providerId}.`;

  const lines: string[] = [`Models for ${chalk.cyan(providerId)}:`];
  allIds.forEach((id, index) => {
    const entry = models.find((m) => m.id === id);
    const badges = entry ? capabilityBadges(entry).slice(0, 5).map((b) => chalk.gray(`[${b}]`)).join(' ') : '';
    const specNote = entry?.speculative ? chalk.yellow(' (speculative)') : '';
    lines.push(`  ${index + 1}. ${entry?.name ?? id}${specNote} ${badges}`);
  });
  return lines.join('\n');
}

/** Render models grouped by connected providers only. */
export async function renderConnectedModels(): Promise<string> {
  const connected = await listConnectedProviders();
  if (!connected.length) return 'No providers connected. Run: opensyntax auth';

  const lines: string[] = ['Models — Connected Providers\n'];
  for (const item of connected) {
    const dynamic = await getProviderModels(item.providerId);
    const registered = allModelsForProvider(item.providerId);
    const allIds = dynamic.length > 0 ? dynamic : registered.map((m) => m.id);

    lines.push(chalk.bold.cyan(item.name) + (item.isDefault ? chalk.green(' (active)') : ''));
    allIds.slice(0, 8).forEach((id, index) => {
      const entry = registered.find((m) => m.id === id);
      const badges = entry ? capabilityBadges(entry).slice(0, 3).map((b) => chalk.gray(`[${b}]`)).join(' ') : '';
      lines.push(`  ${index + 1}. ${entry?.name ?? id} ${badges}`);
    });
    if (allIds.length > 8) lines.push(chalk.gray(`  ... and ${allIds.length - 8} more`));
    lines.push('');
  }
  return lines.join('\n');
}

/** @deprecated Use renderConnectedModels() instead */
export function renderAllModels(): string {
  return 'Use /models all to see models for connected providers.';
}
