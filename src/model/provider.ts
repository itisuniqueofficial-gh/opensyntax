import type {ModelConfig, ModelRequest, StreamEvent} from './types.js';

export interface ModelProvider {
  readonly id: string;
  readonly model: string;
  stream(request: ModelRequest): AsyncGenerator<StreamEvent>;
}

export type ProviderFactory = (config: ModelConfig) => ModelProvider;

export class ProviderError extends Error {
  constructor(message: string, readonly status?: number, readonly body?: string) {
    super(message);
    this.name = 'ProviderError';
  }
}

export async function fetchJson(url: string, init: RequestInit, retries = 2): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.ok || response.status < 500 || attempt === retries) return response;
      await delay(500 * (attempt + 1));
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      await delay(500 * (attempt + 1));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Network request failed');
}

export async function readError(response: Response): Promise<never> {
  const body = await response.text().catch(() => '');
  throw new ProviderError(`Provider request failed: ${response.status} ${response.statusText}`, response.status, body.slice(0, 2000));
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
