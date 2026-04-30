import type {ChatMessage} from '../providers/types.js';

export type UiMessage = ChatMessage & {
	id: string;
	createdAt: number;
	responseTimeMs?: number;
	error?: boolean;
};

export function createMessage(role: ChatMessage['role'], content: string, options: Partial<UiMessage> = {}): UiMessage {
	return {
		id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
		createdAt: Date.now(),
		role,
		content: limitMessage(content),
		...options
	};
}

export function toProviderMessages(messages: UiMessage[]): ChatMessage[] {
	return messages
		.filter(message => !message.error)
		.map(({role, content}) => ({role, content}));
}

export function limitMessage(content: string, max = 24000): string {
	if (content.length <= max) {
		return content;
	}

	return `${content.slice(0, max)}\n\n[Message truncated by OpenSyntax for terminal performance.]`;
}
