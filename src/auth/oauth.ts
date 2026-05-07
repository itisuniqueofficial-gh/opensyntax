import {createServer} from 'node:http';
import {URL} from 'node:url';
import type {AuthMethod, ProviderDefinition} from '../providers/registry.js';
import {encryptSecret, type ProviderCredential} from './storage.js';

export type OAuthResult = {ok: boolean; message: string; credential?: ProviderCredential};

export async function startBrowserAuth(provider: ProviderDefinition): Promise<OAuthResult> {
  return {ok: false, message: `${provider.name} browser login is not publicly available for CLI token exchange yet. Use API key authentication for this provider.`};
}

export async function startDeviceCodeAuth(provider: ProviderDefinition): Promise<OAuthResult> {
  if (provider.id !== 'github') return {ok: false, message: `${provider.name} does not expose a supported device-code model login flow yet.`};
  return {ok: false, message: 'GitHub device flow support is reserved for future repository integrations.'};
}

export async function waitForLocalCallback(port: number, timeoutMs = 120000): Promise<{code: string; state?: string}> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { server.close(); reject(new Error('OAuth callback timed out')); }, timeoutMs);
    const server = createServer((request, response) => {
      const url = new URL(request.url ?? '/', `http://localhost:${port}`);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state') ?? undefined;
      response.writeHead(code ? 200 : 400, {'content-type': 'text/plain'});
      response.end(code ? 'OpenSyntax authentication complete. You can close this tab.' : 'Missing authorization code.');
      if (code) {
        clearTimeout(timeout);
        server.close();
        resolve({code, state});
      }
    });
    server.listen(port, '127.0.0.1');
  });
}

export function createTokenCredential(input: {provider: ProviderDefinition; authMethod: AuthMethod; token: string; baseUrl?: string; model?: string}): ProviderCredential {
  return {providerId: input.provider.id, authMethod: input.authMethod, encryptedSecret: encryptSecret(input.token), baseUrl: input.baseUrl ?? input.provider.baseUrl, model: input.model ?? input.provider.defaultModel, connectedAt: new Date().toISOString()};
}
