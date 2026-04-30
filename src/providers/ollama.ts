import type {OpenSyntaxConfig} from '../config/schema.js';
import {OpenAICompatibleProvider} from './openai-compatible.js';
import type {ChatProvider} from './types.js';

export function createOllamaProvider(config: OpenSyntaxConfig): ChatProvider {
	return new OpenAICompatibleProvider(config);
}
