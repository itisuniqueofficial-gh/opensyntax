/**
 * Environment variable login flow.
 *
 * Detects API keys from environment variables and offers to use them
 * without copying the secret into the credential store (env-only mode)
 * or to save them encrypted.
 */

import chalk from 'chalk';
import prompts from 'prompts';
import {getProvider, providerRegistry} from '../providers/registry.js';
import {maskSecret, encryptSecret, upsertProvider, type ProviderCredential} from './storage.js';
import {validateProviderConnection} from './validators.js';
import {discoverModels} from './validators.js';
import {printSuccess, printWarning, printStatus} from '../ui/layout.js';

export type EnvDetectionResult = {
  providerId: string;
  providerName: string;
  envVar: string;
  apiKey: string;
};

/** Scan environment variables and return all detected provider keys. */
export function detectEnvKeys(): EnvDetectionResult[] {
  const results: EnvDetectionResult[] = [];
  for (const provider of providerRegistry) {
    if (!provider.apiKeyEnv?.length) continue;
    for (const envVar of provider.apiKeyEnv) {
      const value = process.env[envVar];
      if (value?.trim()) {
        results.push({
          providerId: provider.id,
          providerName: provider.name,
          envVar,
          apiKey: value.trim()
        });
        break; // first matching env var wins per provider
      }
    }
  }
  return results;
}

/** Offer to use a detected environment variable key. */
export async function offerEnvLogin(detected: EnvDetectionResult): Promise<boolean> {
  const masked = maskSecret(detected.apiKey);
  printStatus(`Detected ${chalk.cyan(detected.envVar)} in environment (${masked})`);

  const response = await prompts({
    type: 'select',
    name: 'value',
    message: `Use ${detected.providerName} from environment?`,
    choices: [
      {title: 'Yes — validate and save (encrypted)', value: 'save'},
      {title: 'Yes — use for this session only (env-only)', value: 'env-only'},
      {title: 'No — skip this provider', value: 'skip'}
    ]
  });

  if (!response.value || response.value === 'skip') return false;

  const provider = getProvider(detected.providerId);
  if (!provider) return false;

  printStatus(`Validating ${provider.name}...`);
  const validation = await validateProviderConnection({
    provider,
    apiKey: detected.apiKey,
    baseUrl: provider.baseUrl
  });

  if (!validation.ok) {
    printWarning(`${provider.name}: ${validation.message}`);
    const proceed = (await prompts({
      type: 'confirm',
      name: 'value',
      message: 'Save anyway?',
      initial: false
    })).value === true;
    if (!proceed) return false;
  }

  const models = validation.models?.length
    ? validation.models
    : await discoverModels(provider, detected.apiKey).catch(() => [provider.defaultModel]);

  const model = models[0] ?? provider.defaultModel;

  if (response.value === 'env-only') {
    // Store a credential that references the env var but doesn't copy the secret
    const credential: ProviderCredential = {
      providerId: provider.id,
      authMethod: 'api-key',
      // No encryptedSecret — runtime will fall back to env var
      baseUrl: provider.baseUrl,
      model,
      connectedAt: new Date().toISOString(),
      lastValidatedAt: validation.ok ? new Date().toISOString() : undefined,
      models
    };
    await upsertProvider(provider.id, credential, true);
    printSuccess(`${provider.name} connected via ${detected.envVar} (env-only mode)`);
  } else {
    // Encrypt and save
    const credential: ProviderCredential = {
      providerId: provider.id,
      authMethod: 'api-key',
      encryptedSecret: encryptSecret(detected.apiKey),
      baseUrl: provider.baseUrl,
      model,
      connectedAt: new Date().toISOString(),
      lastValidatedAt: validation.ok ? new Date().toISOString() : undefined,
      models
    };
    await upsertProvider(provider.id, credential, true);
    printSuccess(`${provider.name} connected — key saved as ${masked}`);
  }

  return true;
}

/** Run the full env-detection flow, offering each detected key. */
export async function runEnvLogin(): Promise<number> {
  const detected = detectEnvKeys();
  if (!detected.length) return 0;

  let connected = 0;
  for (const item of detected) {
    const ok = await offerEnvLogin(item);
    if (ok) connected++;
  }
  return connected;
}
