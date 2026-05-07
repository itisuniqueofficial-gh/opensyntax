import {describe, expect, it} from 'vitest';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {createBrowserAuthSession} from '../auth/browser.js';
import {waitForCallback} from '../auth/callback-server.js';
import {pollDeviceToken} from '../auth/device-code.js';
import {deriveChallenge, generatePkce, generateState} from '../auth/pkce.js';
import {maskSecret} from '../auth/storage.js';
import {checkLocalProvider} from '../auth/local.js';
import {authConfigForProvider} from '../providers/auth-registry.js';
import {requireProvider} from '../providers/registry.js';

describe('advanced auth helpers', () => {
  it('generates PKCE verifier, challenge, and state', () => {
    const pkce = generatePkce();
    expect(pkce.verifier.length).toBeGreaterThanOrEqual(40);
    expect(pkce.challenge).toBe(deriveChallenge(pkce.verifier));
    expect(generateState()).toHaveLength(32);
  });

  it('builds browser authorization URL with PKCE and state', async () => {
    const session = await createBrowserAuthSession({authorizationUrl: 'https://example.com/oauth/authorize', tokenUrl: 'https://example.com/oauth/token', scopes: ['models', 'chat'], clientId: 'client_123'});
    const url = new URL(session.authorizationUrl);
    expect(url.searchParams.get('client_id')).toBe('client_123');
    expect(url.searchParams.get('state')).toBe(session.state);
    expect(url.searchParams.get('code_challenge')).toBeTruthy();
    expect(url.searchParams.get('redirect_uri')).toContain('127.0.0.1');
  });

  it('rejects browser auth when no client id is configured', async () => {
    await expect(createBrowserAuthSession({authorizationUrl: 'https://example.com/auth', tokenUrl: 'https://example.com/token', scopes: []})).rejects.toThrow('not configured');
  });

  it('validates callback state', async () => {
    const port = await listenPort();
    const pending = waitForCallback(port, 'expected-state', 5000);
    const response = await fetch(`http://127.0.0.1:${port}/callback?code=abc&state=expected-state`);
    expect(response.ok).toBe(true);
    await expect(pending).resolves.toEqual({code: 'abc', state: 'expected-state'});
  });

  it('polls device-code token responses', async () => {
    const result = await pollDeviceToken({tokenUrl: 'https://example.com/token', deviceCode: 'device', intervalSeconds: 0, timeoutMs: 1000, fetcher: async () => new Response(JSON.stringify({access_token: 'token'}), {status: 200}) as any});
    expect(result.access_token).toBe('token');
  });

  it('masks credentials without leaking full secrets', () => {
    const secret = 'sk-test-secret-value';
    const masked = maskSecret(secret);
    expect(masked).not.toBe(secret);
    expect(masked).toContain('sk-t');
    expect(masked).toContain('alue');
  });

  it('does not advertise unsupported OAuth methods', () => {
    const openai = authConfigForProvider(requireProvider('openai'));
    expect(openai.authMethods).toContain('api-key');
    expect(openai.authMethods).toContain('env');
    expect(openai.authMethods).not.toContain('browser');
    expect(openai.authMethods).not.toContain('device-code');
  });

  it('detects unknown local provider safely', async () => {
    const status = await checkLocalProvider('unknown-local');
    expect(status.reachable).toBe(false);
    expect(status.error).toContain('Unknown');
  });
});

async function listenPort(): Promise<number> {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  server.close();
  return port;
}
