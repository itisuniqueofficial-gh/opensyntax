import type {ProviderDefinition} from '../providers/registry.js';
import {encryptSecret, type ProviderCredential} from './storage.js';
import {validateApiKeyFormat, validateProviderConnection} from './validators.js';

export async function createApiKeyCredential(input: {provider: ProviderDefinition; apiKey: string; baseUrl?: string; model?: string; validate?: boolean}): Promise<{credential: ProviderCredential; validation: {ok: boolean; message: string; models?: string[]}}> {
  const format = validateApiKeyFormat(input.provider, input.apiKey);
  if (!format.ok) throw new Error(format.message);
  const validation = input.validate === false ? {ok: true, message: 'Validation skipped', models: [input.model ?? input.provider.defaultModel]} : await validateProviderConnection({provider: input.provider, apiKey: input.apiKey, baseUrl: input.baseUrl});
  const model = input.model ?? validation.models?.[0] ?? input.provider.defaultModel;
  return {
    validation,
    credential: {
      providerId: input.provider.id,
      authMethod: 'api-key',
      encryptedSecret: encryptSecret(input.apiKey),
      baseUrl: input.baseUrl ?? input.provider.baseUrl,
      model,
      connectedAt: new Date().toISOString(),
      lastValidatedAt: validation.ok ? new Date().toISOString() : undefined,
      models: validation.models
    }
  };
}
