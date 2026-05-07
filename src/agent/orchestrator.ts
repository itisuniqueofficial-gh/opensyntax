import {AnthropicProvider} from '../model/anthropic.js';
import {GeminiProvider} from '../model/gemini.js';
import {OpenAIProvider} from '../model/openai.js';
import type {ModelProvider} from '../model/provider.js';
import type {ModelConfig} from '../model/types.js';

export function createModelProvider(config: ModelConfig): ModelProvider {
  if (config.provider === 'anthropic') return new AnthropicProvider(config);
  if (config.provider === 'gemini') return new GeminiProvider(config);
  return new OpenAIProvider(config);
}
