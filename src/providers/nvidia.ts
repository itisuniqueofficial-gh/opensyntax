import type {OpenSyntaxConfig} from '../config/schema.js';
import {OpenAICompatibleProvider} from './openai-compatible.js';
import type {ChatProvider} from './provider.js';

export function createNvidiaProvider(config: OpenSyntaxConfig): ChatProvider {
	return new OpenAICompatibleProvider(config);
}
