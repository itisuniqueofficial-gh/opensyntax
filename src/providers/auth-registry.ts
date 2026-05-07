import {providerRegistry, type ProviderDefinition} from './registry.js';
import type {AuthMethod, ProviderAuthConfig} from '../auth/types.js';

export function authConfigForProvider(provider: ProviderDefinition): ProviderAuthConfig {
  const methods: AuthMethod[] = [];
  if (provider.requiresApiKey) methods.push('api-key');
  if (provider.apiKeyEnv?.length) methods.push('env');
  if (provider.category === 'local') methods.push('local');

  return {
    providerId: provider.id,
    displayName: provider.name,
    authMethods: methods,
    apiKeyEnv: provider.apiKeyEnv
  };
}

export const providerAuthRegistry: ProviderAuthConfig[] = providerRegistry.map(authConfigForProvider);

export function getProviderAuthConfig(providerId: string): ProviderAuthConfig | undefined {
  return providerAuthRegistry.find((item) => item.providerId === providerId);
}

export function supportedAuthMethods(provider: ProviderDefinition): AuthMethod[] {
  return authConfigForProvider(provider).authMethods;
}
