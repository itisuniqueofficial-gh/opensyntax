/**
 * /auth debug — shows provider auth status without exposing secrets.
 */

import chalk from 'chalk';
import {listConnectedProviders} from '../auth/manager.js';
import {loadProviders} from '../auth/storage.js';
import {detectEnvKeys} from '../auth/env.js';
import {providerHealth} from '../auth/manager.js';
import {loadCachedModels} from '../model/cache.js';
import {getProviderAuthConfig} from '../providers/auth-registry.js';
import {getProvider} from '../providers/registry.js';
import {panel} from '../ui/renderer.js';

export async function runAuthDebug(): Promise<void> {
  const [file, connected, envKeys] = await Promise.all([
    loadProviders(),
    listConnectedProviders(),
    Promise.resolve(detectEnvKeys())
  ]);

  const lines: string[] = [];

  if (!connected.length) {
    lines.push(chalk.gray('No providers connected.'));
    lines.push('');
    lines.push('Run: opensyntax auth');
  }

  for (const item of connected) {
    const raw = file.providers[item.providerId];
    const cached = await loadCachedModels(item.providerId);
    const provider = getProvider(item.providerId);
    const authConfig = getProviderAuthConfig(item.providerId);
    const health = await providerHealth(item.providerId).catch((error) => ({ok: false, message: error instanceof Error ? error.message : 'Unknown error'}));
    const credSource = raw?.encryptedSecret ? 'encrypted store' : 'env var / none';
    const isDefault = item.isDefault;

    lines.push(`${isDefault ? chalk.green('● ') : '  '}${chalk.bold(item.name)}${isDefault ? chalk.green(' (active)') : ''}`);
    lines.push(`  Provider ID:   ${item.providerId}`);
    lines.push(`  Methods:       ${authConfig?.authMethods.join(', ') || 'none'}`);
    lines.push(`  Auth method:   ${item.authMethod}`);
    lines.push(`  Credential:    ${credSource}`);
    lines.push(`  Model:         ${item.model}`);
    lines.push(`  Models cached: ${cached?.length ?? 0}`);
    lines.push(`  Validation:    ${health.ok ? 'passed' : health.message}`);
    if (provider?.baseUrl || raw?.baseUrl) lines.push(`  Endpoint:      ${raw?.baseUrl ?? provider?.baseUrl}`);
    lines.push(`  Connected at:  ${item.connectedAt}`);
    if (item.lastValidatedAt) lines.push(`  Last validated: ${item.lastValidatedAt}`);
    lines.push('');
  }

  // Env vars detected but not saved
  const unsaved = envKeys.filter((e) => !connected.some((c) => c.providerId === e.providerId));
  if (unsaved.length) {
    lines.push(chalk.gray('Environment variables detected (not saved):'));
    for (const e of unsaved) {
      lines.push(`  ${chalk.cyan(e.envVar)} → ${e.providerName}`);
    }
    lines.push('');
    lines.push(chalk.gray('Run: opensyntax auth  to connect these providers'));
  }

  panel('Auth Debug', lines.join('\n'));
}

/** Run a live health check on all connected providers. */
export async function runAuthHealthCheck(): Promise<void> {
  const connected = await listConnectedProviders();
  if (!connected.length) {
    panel('Auth Health', 'No providers connected.');
    return;
  }

  const lines: string[] = [];
  for (const item of connected) {
    const health = await providerHealth(item.providerId).catch((e) => ({
      ok: false,
      message: e instanceof Error ? e.message : 'Unknown error'
    }));
    const icon = health.ok ? chalk.green('✓') : chalk.red('✗');
    lines.push(`${icon} ${item.name}: ${health.message}`);
  }

  panel('Auth Health', lines.join('\n'));
}
