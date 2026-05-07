/**
 * Auth type definitions.
 */

export type AuthMethodType =
  | 'api-key'
  | 'browser'
  | 'device-code'
  | 'env'
  | 'local'
  | 'none';

export type AuthResult = {
  ok: boolean;
  message: string;
  providerId?: string;
  model?: string;
  modelCount?: number;
};

export type CredentialSource = 'encrypted-store' | 'env-var' | 'none';

export type ProviderStatus = {
  providerId: string;
  name: string;
  connected: boolean;
  authMethod: AuthMethodType;
  credentialSource: CredentialSource;
  model?: string;
  modelCount?: number;
  lastValidated?: string;
  healthy?: boolean;
  healthMessage?: string;
};

export type AuthMethod = 'browser' | 'device-code' | 'api-key' | 'env' | 'local';

export type OAuthProviderConfig = {
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  clientId?: string;
  redirectUri?: string;
};

export type DeviceCodeProviderConfig = {
  deviceCodeUrl: string;
  tokenUrl: string;
  scopes: string[];
  clientId?: string;
};

export type ProviderAuthConfig = {
  providerId: string;
  displayName: string;
  authMethods: AuthMethod[];
  apiKeyEnv?: string[];
  oauth?: OAuthProviderConfig;
  deviceCode?: DeviceCodeProviderConfig;
};

export type AuthDebugInfo = {
  provider: string;
  method: string;
  credential: 'configured' | 'env' | 'missing';
  source: CredentialSource;
  models: string;
  validation: string;
  endpoint?: string;
};
