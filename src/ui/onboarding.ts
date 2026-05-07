import chalk from 'chalk';
import prompts from 'prompts';
import {connectApiKeyProvider, connectLocalProvider, providerChoices} from '../auth/manager.js';
import {maskSecret} from '../auth/storage.js';
import {getProvider, requireProvider} from '../providers/registry.js';
import {startBrowserAuth, startDeviceCodeAuth} from '../auth/oauth.js';
import {panel} from './renderer.js';
import {refreshProviderModels} from '../model/runtime.js';
import {invalidateModelCache} from '../model/cache.js';

export async function ensureOnboarded(): Promise<boolean> {
  panel('OpenSyntax', `${chalk.bold('Terminal AI Coding Assistant')}\n\nNo AI providers configured. Connect a provider to continue.`);
  return runProviderSetup();
}

export async function runProviderSetup(providerId?: string): Promise<boolean> {
  const selectedProvider = providerId ?? (await prompts({
    type: 'select',
    name: 'value',
    message: 'Select provider',
    choices: [...providerChoices(), {title: 'Skip for now', value: 'skip', description: 'Exit setup without connecting a provider'}]
  })).value;
  if (!selectedProvider || selectedProvider === 'skip') return false;

  const provider = requireProvider(selectedProvider);
  const authMethod = provider.authMethods.length === 1 ? provider.authMethods[0] : (await prompts({
    type: 'select',
    name: 'value',
    message: `Authentication method for ${provider.name}`,
    choices: provider.authMethods.map((method) => ({title: labelAuth(method), value: method}))
  })).value;
  if (!authMethod) return false;

  if (authMethod === 'none') {
    const baseUrl = await askBaseUrl(provider.id, provider.baseUrl);
    const model = await askModel(provider.defaultModel);
    await connectLocalProvider({providerId: provider.id, baseUrl, model});
    // Invalidate cache and pre-fetch models for the new provider
    await invalidateModelCache(provider.id);
    await refreshProviderModels(provider.id).catch(() => undefined);
    panel('Connected', `${chalk.green('✓')} ${provider.name} configured\n${chalk.green('✓')} Default model: ${model}`);
    return true;
  }

  if (authMethod === 'browser') {
    panel('Browser Authentication', 'Opening browser authentication when the provider exposes a public CLI OAuth flow.');
    const result = await startBrowserAuth(provider);
    if (!result.ok) panel('Authentication Unavailable', `${result.message}\n\nUse API key authentication for now.`);
    return false;
  }

  if (authMethod === 'device-code') {
    const result = await startDeviceCodeAuth(provider);
    if (!result.ok) panel('Device Login Unavailable', result.message);
    return false;
  }

  const apiKey = (await prompts({type: 'password', name: 'value', message: `Enter ${provider.name} API key`, validate: (value) => value ? true : 'API key is required'})).value;
  if (!apiKey) return false;
  const baseUrl = await askBaseUrl(provider.id, provider.baseUrl);
  const model = await askModel(provider.defaultModel);
  const shouldValidate = (await prompts({type: 'confirm', name: 'value', message: 'Validate provider now?', initial: true})).value === true;
  const result = await connectApiKeyProvider({providerId: provider.id, apiKey, baseUrl, model, validate: shouldValidate});
  // Invalidate cache and pre-fetch models for the new provider
  await invalidateModelCache(provider.id);
  await refreshProviderModels(provider.id).catch(() => undefined);
  panel(result.validation.ok ? 'Connected' : 'Connected With Warning', [
    `${result.validation.ok ? chalk.green('✓') : chalk.yellow('!')} ${provider.name} ${result.validation.message}`,
    `${chalk.green('✓')} API key saved as ${maskSecret(apiKey)}`,
    `${chalk.green('✓')} Default model: ${result.credential.model}`
  ].join('\n'));
  return true;
}

export async function runSettings(): Promise<void> {
  while (true) {
    const action = (await prompts({
      type: 'select',
      name: 'value',
      message: 'OpenSyntax settings',
      choices: [
        {title: 'Connect or update provider', value: 'connect'},
        {title: 'Switch default provider', value: 'switch'},
        {title: 'Logout provider', value: 'logout'},
        {title: 'Exit settings', value: 'exit'}
      ]
    })).value;
    if (!action || action === 'exit') return;
    if (action === 'connect') await runProviderSetup();
    if (action === 'switch') await switchProviderPrompt();
    if (action === 'logout') await logoutProviderPrompt();
  }
}

export async function switchProviderPrompt(): Promise<string | undefined> {
  const {listConnectedProviders, setDefaultProvider} = await import('../auth/manager.js');
  const providers = await listConnectedProviders();
  if (!providers.length) { panel('Providers', 'No connected providers. Run: opensyntax auth'); return undefined; }
  const providerId = (await prompts({type: 'select', name: 'value', message: 'Switch to provider', choices: providers.map((item) => ({title: `${item.isDefault ? '● ' : '  '}${item.name}`, value: item.providerId, description: `model: ${item.model}`}))})).value;
  if (!providerId) return undefined;
  await setDefaultProvider(providerId);
  // Pre-fetch models for the newly active provider
  await refreshProviderModels(providerId).catch(() => undefined);
  panel('Provider Updated', `Active provider: ${getProvider(providerId)?.name ?? providerId}`);
  return providerId;
}

export async function logoutProviderPrompt(providerId?: string): Promise<void> {
  const {disconnectProvider, listConnectedProviders} = await import('../auth/manager.js');
  const providers = await listConnectedProviders();
  if (!providers.length) { panel('Logout', 'No connected providers.'); return; }
  const selected = providerId ?? (await prompts({type: 'select', name: 'value', message: 'Provider to logout', choices: providers.map((item) => ({title: item.name, value: item.providerId}))})).value;
  if (!selected) return;
  const confirm = (await prompts({type: 'confirm', name: 'value', message: `Remove credentials for ${getProvider(selected)?.name ?? selected}?`, initial: false})).value === true;
  if (!confirm) return;
  await disconnectProvider(selected);
  panel('Logged Out', `${getProvider(selected)?.name ?? selected} credentials removed.`);
}

async function askBaseUrl(providerId: string, defaultUrl?: string): Promise<string | undefined> {
  if (providerId !== 'azure-openai' && providerId !== 'lmstudio' && providerId !== 'ollama') return defaultUrl;
  return (await prompts({type: 'text', name: 'value', message: 'Base URL', initial: defaultUrl ?? ''})).value || defaultUrl;
}

async function askModel(defaultModel: string): Promise<string> {
  return (await prompts({type: 'text', name: 'value', message: 'Default model', initial: defaultModel})).value || defaultModel;
}

function labelAuth(method: string): string {
  if (method === 'api-key') return 'API Key';
  if (method === 'browser') return 'Browser Authentication';
  if (method === 'device-code') return 'Device Code Login';
  return 'No authentication required';
}
