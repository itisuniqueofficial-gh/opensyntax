import {AnthropicProvider} from '../model/anthropic.js';
import {GeminiProvider} from '../model/gemini.js';
import {OpenAIProvider} from '../model/openai.js';
import type {ModelProvider} from '../model/provider.js';
import type {ModelConfig} from '../model/types.js';
import {getProvider} from '../providers/registry.js';

export function createModelProvider(config: ModelConfig): ModelProvider {
  const provider = getProvider(config.provider);
  if (provider?.type === 'anthropic' || config.provider === 'anthropic') return new AnthropicProvider(config);
  if (provider?.type === 'gemini' || config.provider === 'gemini') return new GeminiProvider(config);
  return new OpenAIProvider(config);
}
