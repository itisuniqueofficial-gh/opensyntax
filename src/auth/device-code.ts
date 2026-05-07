export type DeviceCodeResponse = {
  device_code: string;
  user_code: string;
  verification_uri?: string;
  verification_url?: string;
  interval?: number;
  expires_in: number;
};

export type DeviceTokenResponse = {access_token?: string; refresh_token?: string; error?: string; error_description?: string};

export async function pollDeviceToken(input: {tokenUrl: string; clientId?: string; deviceCode: string; intervalSeconds?: number; timeoutMs?: number; fetcher?: typeof fetch}): Promise<DeviceTokenResponse> {
  const fetcher = input.fetcher ?? fetch;
  const intervalMs = (input.intervalSeconds ?? 5) * 1000;
  const deadline = Date.now() + (input.timeoutMs ?? 300_000);
  let delay = intervalMs;
  while (Date.now() < deadline) {
    await sleep(delay);
    const body = new URLSearchParams({grant_type: 'urn:ietf:params:oauth:grant-type:device_code', device_code: input.deviceCode});
    if (input.clientId) body.set('client_id', input.clientId);
    const response = await fetcher(input.tokenUrl, {method: 'POST', body});
    const json = await response.json() as DeviceTokenResponse;
    if (json.access_token || json.refresh_token) return json;
    if (json.error === 'authorization_pending') continue;
    if (json.error === 'slow_down') { delay += 5000; continue; }
    if (json.error === 'expired_token') throw new Error('Device code expired. Start login again.');
    if (json.error) throw new Error(json.error_description ?? json.error);
  }
  throw new Error('Device-code login timed out.');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
