/**
 * Provider authentication wizard.
 *
 * Supports:
 * 1. API key login (all cloud providers)
 * 2. Environment variable detection and import
 * 3. Local provider auto-detection (Ollama, LM Studio)
 * 4. Browser / device-code stubs (honest about what's implemented)
 *
 * Never fakes OAuth flows that aren't implemented.
 * Never exposes secrets in terminal output.
 */

import chalk from 'chalk';
import prompts from 'prompts';
import {connectApiKeyProvider, connectLocalProvider, providerChoices} from '../auth/manager.js';
import {maskSecret} from '../auth/storage.js';
import {getProvider, requireProvider, providerRegistry} from '../providers/registry.js';
import {startBrowserAuth, startDeviceCodeAuth} from '../auth/oauth.js';
import {detectEnvKeys, offerEnvLogin} from '../auth/env.js';
import {runLocalProviderSetup, detectLocalProviders} from '../auth/local.js';
import {supportedAuthMethods} from '../providers/auth-registry.js';
import {panel} from './renderer.js';
import {printSuccess, printWarning, printStatus, printError} from './layout.js';
import {refreshProviderModels} from '../model/runtime.js';
import {invalidateModelCache} from '../model/cache.js';
import {getProviderModels} from '../model/runtime.js';
import {allModelsForProvider, capabilityBadges} from '../model/registry.js';

// ---------------------------------------------------------------------------
// Onboarding entry point
// ---------------------------------------------------------------------------

export async function ensureOnboarded(): Promise<boolean> {
  panel('OpenSyntax', `${chalk.bold('Terminal AI Coding Assistant')}\n\nNo AI providers configured. Connect a provider to continue.`);

  // First: offer any detected env keys
  const envKeys = detectEnvKeys();
  if (envKeys.length) {
    printStatus(`Found ${envKeys.length} API key${envKeys.length > 1 ? 's' : ''} in environment`);
    for (const key of envKeys) {
      const ok = await offerEnvLogin(key);
      if (ok) return true;
    }
  }

  // Second: check for local providers
  const localRunning = await detectLocalProviders();
  if (localRunning.length) {
    for (const local of localRunning) {
      printStatus(`${local.name} detected at ${local.baseUrl}`);
      const use = (await prompts({
        type: 'confirm',
        name: 'value',
        message: `Connect to ${local.name}?`,
        initial: true
      })).value === true;
      if (use) {
        await runLocalProviderSetup(local.providerId);
        return true;
      }
    }
  }

  return runProviderSetup();
}

// ---------------------------------------------------------------------------
// Main provider setup wizard
// ---------------------------------------------------------------------------

export async function runProviderSetup(providerId?: string): Promise<boolean> {
  // Build provider choices grouped by category
  const choices = buildProviderChoices();
  choices.push({title: chalk.gray('Skip for now'), value: 'skip', description: 'Exit setup without connecting a provider'});

  const selectedProvider = providerId ?? (await prompts({
    type: 'select',
    name: 'value',
    message: 'Select provider',
    choices
  })).value;

  if (!selectedProvider || selectedProvider === 'skip') return false;

  const provider = requireProvider(selectedProvider);

  // Determine available auth methods for this provider
  const availableMethods = buildAuthMethodChoices(provider.id, supportedAuthMethods(provider));

  const authMethod = availableMethods.length === 1
    ? availableMethods[0].value
    : (await prompts({
        type: 'select',
        name: 'value',
        message: `Authentication method for ${chalk.cyan(provider.name)}`,
        choices: availableMethods
      })).value;

  if (!authMethod) return false;

  // Route to the appropriate flow
  switch (authMethod) {
    case 'none':
    case 'local':
      return runLocalFlow(provider.id);

    case 'env': {
      const envKeys = detectEnvKeys().filter((k) => k.providerId === provider.id);
      if (!envKeys.length) {
        printWarning(`No environment variable found for ${provider.name}`);
        printWarning(`Set ${provider.apiKeyEnv?.[0] ?? 'the API key env var'} and try again`);
        return false;
      }
      return offerEnvLogin(envKeys[0]);
    }

    case 'browser':
      return runBrowserFlow(provider.id);

    case 'device-code':
      return runDeviceCodeFlow(provider.id);

    case 'api-key':
    default:
      return runApiKeyFlow(provider.id);
  }
}

// ---------------------------------------------------------------------------
// API key flow
// ---------------------------------------------------------------------------

async function runApiKeyFlow(providerId: string): Promise<boolean> {
  const provider = requireProvider(providerId);

  // Check for env key first and offer it
  const envKey = provider.apiKeyEnv?.map((v) => process.env[v]).find(Boolean);
  if (envKey) {
    const useEnv = (await prompts({
      type: 'confirm',
      name: 'value',
      message: `Use ${provider.apiKeyEnv?.find((v) => process.env[v])} from environment? (${maskSecret(envKey)})`,
      initial: true
    })).value === true;
    if (useEnv) {
      const envKeys = detectEnvKeys().filter((k) => k.providerId === providerId);
      if (envKeys.length) return offerEnvLogin(envKeys[0]);
    }
  }

  const apiKey = (await prompts({
    type: 'password',
    name: 'value',
    message: `Enter ${chalk.cyan(provider.name)} API key`,
    validate: (v) => v?.trim() ? true : 'API key is required'
  })).value as string | undefined;

  if (!apiKey?.trim()) return false;

  const baseUrl = await askBaseUrl(provider.id, provider.baseUrl);

  // Validate before asking for model
  printStatus('Validating API key...');
  const shouldValidate = true;
  const result = await connectApiKeyProvider({
    providerId: provider.id,
    apiKey,
    baseUrl,
    validate: shouldValidate
  });

  if (!result.validation.ok) {
    printWarning(`${provider.name}: ${result.validation.message}`);
    const proceed = (await prompts({
      type: 'confirm',
      name: 'value',
      message: 'Save anyway?',
      initial: false
    })).value === true;
    if (!proceed) return false;
  }

  // Invalidate cache and fetch models
  await invalidateModelCache(provider.id);
  const models = await refreshProviderModels(provider.id).catch(() => [] as string[]);

  // Interactive model selection
  const model = await selectDefaultModel(provider.id, models, result.credential.model);

  // Update credential with selected model
  if (model !== result.credential.model) {
    await connectApiKeyProvider({providerId: provider.id, apiKey, baseUrl, model, validate: false});
  }

  printConnectedSummary({
    name: provider.name,
    method: 'API Key',
    maskedKey: maskSecret(apiKey),
    model: model ?? result.credential.model,
    modelCount: models.length,
    healthy: result.validation.ok
  });

  return true;
}

// ---------------------------------------------------------------------------
// Local provider flow
// ---------------------------------------------------------------------------

async function runLocalFlow(providerId: string): Promise<boolean> {
  const ok = await runLocalProviderSetup(providerId);
  if (!ok) return false;

  // Offer model selection
  const models = await getProviderModels(providerId).catch(() => [] as string[]);
  if (models.length > 1) {
    const model = await selectDefaultModel(providerId, models, models[0]);
    if (model) {
      const {loadProviders, saveProviders} = await import('../auth/storage.js');
      const file = await loadProviders();
      if (file.providers[providerId]) {
        file.providers[providerId].model = model;
        await saveProviders(file);
      }
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// Browser OAuth flow (honest stub)
// ---------------------------------------------------------------------------

async function runBrowserFlow(providerId: string): Promise<boolean> {
  const provider = requireProvider(providerId);
  panel('Browser Authentication', [
    `Opening browser authentication for ${chalk.cyan(provider.name)}...`,
    '',
    chalk.gray('Note: Full browser OAuth requires the provider to expose a public'),
    chalk.gray('CLI token exchange endpoint. Most providers only support API keys.'),
    '',
    'Falling back to API key authentication.'
  ].join('\n'));

  const result = await startBrowserAuth(provider);
  if (!result.ok) {
    printWarning(result.message);
    // Offer API key as fallback
    const fallback = (await prompts({
      type: 'confirm',
      name: 'value',
      message: 'Use API key instead?',
      initial: true
    })).value === true;
    if (fallback) return runApiKeyFlow(providerId);
    return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Device code flow (honest stub)
// ---------------------------------------------------------------------------

async function runDeviceCodeFlow(providerId: string): Promise<boolean> {
  const provider = requireProvider(providerId);
  const result = await startDeviceCodeAuth(provider);
  if (!result.ok) {
    printWarning(result.message);
    const fallback = (await prompts({
      type: 'confirm',
      name: 'value',
      message: 'Use API key instead?',
      initial: true
    })).value === true;
    if (fallback) return runApiKeyFlow(providerId);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Settings / switch / logout
// ---------------------------------------------------------------------------

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
  const providerId = (await prompts({
    type: 'select',
    name: 'value',
    message: 'Switch to provider',
    choices: providers.map((item) => ({
      title: `${item.isDefault ? chalk.green('● ') : '  '}${item.name}`,
      value: item.providerId,
      description: `model: ${item.model}`
    }))
  })).value;
  if (!providerId) return undefined;
  await setDefaultProvider(providerId);
  await refreshProviderModels(providerId).catch(() => undefined);
  panel('Provider Updated', `Active provider: ${chalk.cyan(getProvider(providerId)?.name ?? providerId)}`);
  return providerId;
}

export async function logoutProviderPrompt(providerId?: string): Promise<void> {
  const {disconnectProvider, listConnectedProviders} = await import('../auth/manager.js');
  const providers = await listConnectedProviders();
  if (!providers.length) { panel('Logout', 'No connected providers.'); return; }
  const selected = providerId ?? (await prompts({
    type: 'select',
    name: 'value',
    message: 'Provider to logout',
    choices: providers.map((item) => ({title: item.name, value: item.providerId}))
  })).value;
  if (!selected) return;
  const confirm = (await prompts({
    type: 'confirm',
    name: 'value',
    message: `Remove credentials for ${chalk.cyan(getProvider(selected)?.name ?? selected)}?`,
    initial: false
  })).value === true;
  if (!confirm) return;
  await disconnectProvider(selected);
  panel('Logged Out', `${chalk.cyan(getProvider(selected)?.name ?? selected)} credentials removed.`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function askBaseUrl(providerId: string, defaultUrl?: string): Promise<string | undefined> {
  if (providerId !== 'azure-openai' && providerId !== 'lmstudio' && providerId !== 'ollama') return defaultUrl;
  return (await prompts({
    type: 'text',
    name: 'value',
    message: 'Base URL',
    initial: defaultUrl ?? ''
  })).value || defaultUrl;
}

async function selectDefaultModel(
  providerId: string,
  dynamicModels: string[],
  currentModel?: string
): Promise<string | undefined> {
  const registered = allModelsForProvider(providerId);
  const allIds = dynamicModels.length > 0 ? dynamicModels : registered.map((m) => m.id);
  if (!allIds.length) return currentModel;
  if (allIds.length === 1) return allIds[0];

  const choices = allIds.slice(0, 20).map((id, index) => {
    const entry = registered.find((m) => m.id === id);
    const badges = entry ? capabilityBadges(entry).slice(0, 3).map((b) => chalk.gray(`[${b}]`)).join(' ') : '';
    return {
      title: `${index + 1}. ${entry?.name ?? id} ${badges}`,
      value: id
    };
  });

  const response = await prompts({
    type: 'select',
    name: 'value',
    message: 'Select default model',
    choices
  });

  return response.value as string | undefined ?? currentModel;
}

function buildProviderChoices() {
  const official = providerRegistry.filter((p) => p.category === 'official');
  const compatible = providerRegistry.filter((p) => p.category === 'openai-compatible');
  const local = providerRegistry.filter((p) => p.category === 'local');

  return [
    ...official.map((p) => ({title: p.name, value: p.id, description: p.defaultModel})),
    ...compatible.map((p) => ({title: p.name, value: p.id, description: p.defaultModel})),
    ...local.map((p) => ({title: `${p.name} ${chalk.gray('(local)')}`, value: p.id, description: p.notes ?? p.defaultModel}))
  ];
}

function buildAuthMethodChoices(providerId: string, methods: string[]) {
  const provider = getProvider(providerId);
  const envKey = provider?.apiKeyEnv?.map((v) => process.env[v]).find(Boolean);
  const choices = [];

  if (methods.includes('api-key')) {
    choices.push({title: 'API Key', value: 'api-key', description: 'Enter your API key manually'});
  }
  if (methods.includes('env') && envKey) {
    choices.push({title: `Environment variable ${chalk.gray(`(${maskSecret(envKey)})`)}`, value: 'env', description: `Use ${provider?.apiKeyEnv?.find((v) => process.env[v])}`});
  }
  if (methods.includes('local') || methods.includes('none') || providerId === 'ollama' || providerId === 'lmstudio') {
    choices.push({title: 'Local server (no key required)', value: 'local'});
  }

  return choices;
}

function printConnectedSummary(opts: {
  name: string;
  method: string;
  maskedKey?: string;
  model: string;
  modelCount: number;
  healthy: boolean;
}): void {
  const lines = [
    '',
    chalk.bold('Connected'),
    `${chalk.green('✓')} Provider:       ${chalk.cyan(opts.name)}`,
    `${chalk.green('✓')} Method:         ${opts.method}`,
    opts.maskedKey ? `${chalk.green('✓')} Key saved as:   ${opts.maskedKey}` : null,
    `${chalk.green('✓')} Default model:  ${chalk.cyan(opts.model)}`,
    opts.modelCount > 0 ? `${chalk.green('✓')} Models fetched: ${opts.modelCount}` : null,
    `${opts.healthy ? chalk.green('✓') : chalk.yellow('!')} Status:         ${opts.healthy ? 'Healthy' : 'Connected with warning'}`
  ].filter(Boolean).join('\n');

  process.stdout.write(lines + '\n');
}
