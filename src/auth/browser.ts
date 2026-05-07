import {URL} from 'node:url';
import type {OAuthProviderConfig} from './types.js';
import {findFreePort} from './callback-server.js';
import {generatePkce, generateState} from './pkce.js';

export type BrowserAuthSession = {
  authorizationUrl: string;
  redirectUri: string;
  state: string;
  verifier: string;
  port: number;
  expiresAt: number;
};

export async function createBrowserAuthSession(config: OAuthProviderConfig): Promise<BrowserAuthSession> {
  if (!config.clientId) throw new Error('Browser login is not configured for this provider. Use API key authentication.');
  const port = await findFreePort();
  const redirectUri = config.redirectUri ?? `http://127.0.0.1:${port}/callback`;
  const state = generateState();
  const pkce = generatePkce();
  const url = new URL(config.authorizationUrl);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', config.scopes.join(' '));
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', pkce.challenge);
  url.searchParams.set('code_challenge_method', pkce.method);
  return {authorizationUrl: url.toString(), redirectUri, state, verifier: pkce.verifier, port, expiresAt: Date.now() + 300_000};
}
