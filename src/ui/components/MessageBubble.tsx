import React from 'react';
import {Box, Text} from 'ink';
import type {UiMessage} from '../../chat/chat-session.js';
import {MarkdownMessage} from './MarkdownMessage.js';

export function MessageBubble({message}: {message: UiMessage}) {
	const color = message.error ? 'red' : message.role === 'user' ? 'cyan' : message.role === 'assistant' ? 'green' : 'yellow';
	const title = message.role === 'assistant' ? 'OpenSyntax' : message.role === 'system' ? 'System' : 'You';

	return (
		<Box borderStyle="round" borderColor={color} paddingX={1} flexDirection="column" marginBottom={1}>
			<Text color={color} bold>{title}{message.responseTimeMs ? ` (${message.responseTimeMs}ms)` : ''}</Text>
			<MarkdownMessage content={message.content} />
		</Box>
	);
}
