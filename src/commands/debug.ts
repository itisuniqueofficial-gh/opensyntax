/**
 * /debug provider — shows the sanitized request payload for the current provider.
 * API keys are always masked.
 */

import {OpenAIProvider} from '../model/openai.js';
import {renderDebugPayload} from '../model/request-sanitizer.js';
import {panel} from '../ui/renderer.js';
import type {AppConfig} from '../config/config.js';
import type {ToolSpec} from '../model/types.js';

export function showDebugPayload(config: AppConfig, tools: ToolSpec[]): void {
  // Only OpenAI-compatible providers use the sanitizer
  const provider = new OpenAIProvider(config);
  const {endpoint, result} = provider.debugPayload({
    messages: [{role: 'user', content: 'Hello'}],
    tools,
    systemPrompt: 'You are a helpful assistant.',
    temperature: config.temperature,
    maxTokens: config.maxTokens
  });

  const output = renderDebugPayload({
    providerId: config.provider,
    endpoint,
    result
  });

  panel('Debug — Provider Payload', output);
}
