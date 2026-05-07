import {listConnectedProviders, modelsForProvider, providerHealth} from '../auth/manager.js';
import {maskSecret} from '../auth/storage.js';
import {providerRegistry} from '../providers/registry.js';
import {panel} from '../ui/renderer.js';

export async function showProviders(): Promise<void> {
  const connected = await listConnectedProviders();
  const connectedIds = new Set(connected.map((item) => item.providerId));
  panel('Providers', providerRegistry.map((provider) => {
    const item = connected.find((credential) => credential.providerId === provider.id);
    const state = connectedIds.has(provider.id) ? (item?.isDefault ? 'default' : 'connected') : 'not connected';
    return `${provider.badge.padEnd(12)} ${state.padEnd(13)} ${provider.defaultModel}`;
  }).join('\n'));
}

export async function showAuth(): Promise<void> {
  const connected = await listConnectedProviders();
  if (!connected.length) { panel('Auth', 'No providers connected. Run opensyntax auth.'); return; }
  panel('Auth', connected.map((item) => `${item.isDefault ? '*' : ' '} ${item.name}: ${item.authMethod}${item.encryptedSecret ? ` (${maskSecret('stored-secret')})` : ''} model=${item.model}`).join('\n'));
}

export async function showModels(providerId?: string): Promise<void> {
  const connected = await listConnectedProviders();
  const target = providerId ?? connected.find((item) => item.isDefault)?.providerId ?? connected[0]?.providerId;
  if (!target) { panel('Models', 'No connected providers.'); return; }
  const models = await modelsForProvider(target);
  panel('Models', models.slice(0, 50).map((model, index) => `${index + 1}. ${model}`).join('\n'));
}

export async function showProviderHealth(): Promise<string> {
  const connected = await listConnectedProviders();
  if (!connected.length) return 'No providers connected';
  const results = await Promise.all(connected.map(async (item) => ({item, health: await providerHealth(item.providerId)})));
  return results.map(({item, health}) => `${health.ok ? '✓' : '✗'} ${item.name}: ${health.message}`).join('\n');
}
