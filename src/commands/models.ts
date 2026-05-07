/**
 * Model command handlers.
 *
 * Key principle: /models shows ONLY models for the ACTIVE (connected) provider.
 * /models all shows models for ALL connected providers only.
 */

import chalk from 'chalk';
import {listConnectedProviders} from '../auth/manager.js';
import {modelsForProvider as registryModels, allModelsForProvider, capabilityBadges, findModel, type ModelEntry} from '../model/registry.js';
import {getProviderModels, refreshProviderModels} from '../model/runtime.js';
import {modelUnavailableMessage} from '../model/capabilities.js';
import {panel} from '../ui/renderer.js';
import {providerRegistry} from '../providers/registry.js';
import {getProviderCapabilities} from '../providers/capabilities.js';

// ---------------------------------------------------------------------------
// /models — active provider only
// ---------------------------------------------------------------------------

export async function showModelsCommand(providerId?: string, showAll = false): Promise<void> {
  const connected = await listConnectedProviders();

  if (!connected.length) {
    panel('Models', 'No providers connected. Run: opensyntax auth');
    return;
  }

  if (showAll) {
    await showAllConnectedModels(connected);
    return;
  }

  // Resolve target provider — must be connected
  const targetId = providerId
    ? connected.find((c) => c.providerId === providerId)?.providerId
    : connected.find((c) => c.isDefault)?.providerId ?? connected[0]?.providerId;

  if (!targetId) {
    if (providerId) {
      panel('Models', [
        `Provider "${providerId}" is not connected.`,
        '',
        'Connected providers:',
        ...connected.map((c) => `  - ${c.name} (${c.providerId})`),
        '',
        'Run: opensyntax auth  to connect a provider'
      ].join('\n'));
    } else {
      panel('Models', 'No active provider. Run: opensyntax auth');
    }
    return;
  }

  await showProviderModels(targetId, connected.find((c) => c.providerId === targetId)?.name ?? targetId);
}

// ---------------------------------------------------------------------------
// /models refresh — re-fetch from API
// ---------------------------------------------------------------------------

export async function refreshModelsCommand(providerId?: string): Promise<void> {
  const connected = await listConnectedProviders();
  if (!connected.length) {
    panel('Models', 'No providers connected.');
    return;
  }

  const targetId = providerId
    ? connected.find((c) => c.providerId === providerId)?.providerId
    : connected.find((c) => c.isDefault)?.providerId ?? connected[0]?.providerId;

  if (!targetId) {
    panel('Models', `Provider "${providerId}" is not connected.`);
    return;
  }

  panel('Models', `Refreshing model list for ${targetId}...`);
  const models = await refreshProviderModels(targetId);
  panel('Models', `Refreshed: ${models.length} models available for ${targetId}`);
}

// ---------------------------------------------------------------------------
// Internal: render models for one connected provider
// ---------------------------------------------------------------------------

async function showProviderModels(providerId: string, providerName: string): Promise<void> {
  // Fetch from cache/API
  const dynamicIds = await getProviderModels(providerId);
  const registered = allModelsForProvider(providerId);
  const caps = getProviderCapabilities(providerId);

  // Build merged list: registry entries first (with metadata), then dynamic-only
  const allIds = dynamicIds.length > 0
    ? dynamicIds
    : registered.map((m) => m.id);

  if (!allIds.length) {
    panel(`Models — ${providerName}`, 'No models found. Run /models refresh to fetch from the API.');
    return;
  }

  const lines: string[] = [
    `${chalk.bold(providerName)} Models`,
    chalk.gray(`Tools: ${caps.supportsTools ? 'supported' : 'not supported'} · Streaming: ${caps.supportsStreaming ? 'yes' : 'no'}`),
    ''
  ];

  allIds.forEach((id, index) => {
    const entry = registered.find((m) => m.id === id);
    const badges = entry
      ? capabilityBadges(entry).slice(0, 5).map((b) => chalk.gray(`[${b}]`)).join(' ')
      : chalk.gray('[streaming]');
    const specNote = entry?.speculative ? chalk.yellow(' (speculative)') : '';
    const name = entry?.name ?? id;
    lines.push(`  ${index + 1}. ${name}${specNote} ${badges}`);
  });

  panel(`Models — ${providerName}`, lines.join('\n'));
}

// ---------------------------------------------------------------------------
// Internal: render models for all connected providers
// ---------------------------------------------------------------------------

async function showAllConnectedModels(
  connected: Array<{providerId: string; name: string; isDefault: boolean}>
): Promise<void> {
  const lines: string[] = [chalk.bold('Models — Connected Providers'), ''];

  for (const item of connected) {
    const dynamicIds = await getProviderModels(item.providerId);
    const registered = allModelsForProvider(item.providerId);
    const allIds = dynamicIds.length > 0 ? dynamicIds : registered.map((m) => m.id);

    lines.push(`${chalk.cyan(item.name)}${item.isDefault ? chalk.green(' (active)') : ''}`);
    if (!allIds.length) {
      lines.push(chalk.gray('  No models cached. Run /models refresh.'));
    } else {
      allIds.slice(0, 10).forEach((id, index) => {
        const entry = registered.find((m) => m.id === id);
        const badges = entry
          ? capabilityBadges(entry).slice(0, 3).map((b) => chalk.gray(`[${b}]`)).join(' ')
          : '';
        lines.push(`  ${index + 1}. ${entry?.name ?? id} ${badges}`);
      });
      if (allIds.length > 10) lines.push(chalk.gray(`  ... and ${allIds.length - 10} more`));
    }
    lines.push('');
  }

  panel('Models', lines.join('\n'));
}

// ---------------------------------------------------------------------------
// Interactive model picker — connected provider only
// ---------------------------------------------------------------------------

export async function pickModelInteractive(providerId: string): Promise<string | undefined> {
  const connected = await listConnectedProviders();
  const isConnected = connected.some((c) => c.providerId === providerId);

  if (!isConnected) {
    panel('Model', `Provider "${providerId}" is not connected. Run: opensyntax auth`);
    return undefined;
  }

  const dynamicIds = await getProviderModels(providerId);
  const {selectModelInteractive} = await import('../model/selector.js');
  return selectModelInteractive(providerId, dynamicIds);
}

// ---------------------------------------------------------------------------
// Show model unavailable message
// ---------------------------------------------------------------------------

export function showModelUnavailable(providerId: string, modelId: string, availableIds?: string[]): void {
  panel('Model Unavailable', modelUnavailableMessage(providerId, modelId, availableIds));
}

// ---------------------------------------------------------------------------
// Compact model info line for header
// ---------------------------------------------------------------------------

export function modelInfoLine(providerId: string, modelId: string): string {
  const models = allModelsForProvider(providerId);
  const entry = models.find((m) => m.id === modelId);
  if (!entry) return `${providerId}/${modelId}`;
  const badges = capabilityBadges(entry).slice(0, 4).map((b) => chalk.gray(`[${b}]`)).join(' ');
  return `${entry.name} ${badges}`;
}

// ---------------------------------------------------------------------------
// Provider summary — connected providers only
// ---------------------------------------------------------------------------

export async function listProviderSummary(): Promise<string> {
  const connected = await listConnectedProviders();
  if (!connected.length) return 'No providers connected. Run: opensyntax auth';

  const lines: string[] = [];
  for (const item of connected) {
    const dynamicIds = await getProviderModels(item.providerId);
    const modelCount = dynamicIds.length || registryModels(item.providerId).length;
    lines.push(`  ${item.isDefault ? chalk.green('●') : ' '} ${item.name.padEnd(20)} model: ${item.model}  (${modelCount} models)`);
  }
  return lines.join('\n');
}
