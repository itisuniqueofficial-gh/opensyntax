/**
 * Provider command handlers.
 *
 * Key principle: only show CONNECTED providers to the user.
 * The full registry is only used internally for auth setup.
 */

import chalk from 'chalk';
import {listConnectedProviders, providerHealth} from '../auth/manager.js';
import {maskSecret} from '../auth/storage.js';
import {providerRegistry} from '../providers/registry.js';
import {getProviderCapabilities} from '../providers/capabilities.js';
import {panel} from '../ui/renderer.js';
import {loadCachedModels} from '../model/cache.js';

// ---------------------------------------------------------------------------
// /providers — show ONLY connected providers
// ---------------------------------------------------------------------------

export async function showProviders(): Promise<void> {
  const connected = await listConnectedProviders();

  if (!connected.length) {
    panel('Providers', [
      'No providers connected.',
      '',
      'Run: opensyntax auth',
      '',
      chalk.gray('Available providers to connect:'),
      ...providerRegistry.map((p) => `  ${chalk.gray('-')} ${p.name}`)
    ].join('\n'));
    return;
  }

  const lines: string[] = [chalk.bold('Connected Providers'), ''];

  for (const item of connected) {
    const activeMarker = item.isDefault ? chalk.green('● ') : '  ';
    const cached = await loadCachedModels(item.providerId);
    const modelCount = cached?.length ?? 0;
    const caps = getProviderCapabilities(item.providerId);

    lines.push(`${activeMarker}${chalk.cyan(item.name)}${item.isDefault ? chalk.green(' (active)') : ''}`);
    lines.push(`    Model:   ${item.model}`);
    lines.push(`    Auth:    ${item.authMethod}`);
    if (modelCount > 0) lines.push(`    Models:  ${modelCount} available`);
    lines.push(`    Tools:   ${caps.supportsTools ? chalk.green('supported') : chalk.red('not supported')}`);
    lines.push('');
  }

  // Show disconnected providers as a compact list
  const connectedIds = new Set(connected.map((c) => c.providerId));
  const disconnected = providerRegistry.filter((p) => !connectedIds.has(p.id));
  if (disconnected.length) {
    lines.push(chalk.gray('Not connected:'));
    lines.push(chalk.gray(disconnected.map((p) => `  - ${p.name}`).join('\n')));
    lines.push(chalk.gray('Run: opensyntax auth  to connect a provider'));
  }

  panel('Providers', lines.join('\n'));
}

// ---------------------------------------------------------------------------
// /auth — show connected provider credentials
// ---------------------------------------------------------------------------

export async function showAuth(): Promise<void> {
  const connected = await listConnectedProviders();
  if (!connected.length) {
    panel('Auth', 'No providers connected. Run: opensyntax auth');
    return;
  }
  panel('Auth', connected.map((item) =>
    `${item.isDefault ? chalk.green('*') : ' '} ${item.name}: ${item.authMethod}${item.encryptedSecret ? ` (${maskSecret('stored-secret')})` : ''} model=${item.model}`
  ).join('\n'));
}

// ---------------------------------------------------------------------------
// showModels — kept for backward compat, delegates to models command
// ---------------------------------------------------------------------------

export async function showModels(providerId?: string): Promise<void> {
  const {showModelsCommand} = await import('./models.js');
  await showModelsCommand(providerId);
}

// ---------------------------------------------------------------------------
// Provider health summary
// ---------------------------------------------------------------------------

export async function showProviderHealth(): Promise<string> {
  const connected = await listConnectedProviders();
  if (!connected.length) return 'No providers connected';
  const results = await Promise.all(
    connected.map(async (item) => ({item, health: await providerHealth(item.providerId)}))
  );
  return results.map(({item, health}) =>
    `${health.ok ? chalk.green('✓') : chalk.red('✗')} ${item.name}: ${health.message}`
  ).join('\n');
}
