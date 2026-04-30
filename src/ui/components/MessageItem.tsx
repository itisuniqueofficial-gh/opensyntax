import React from 'react';
import {Box, Text} from 'ink';
import type {UiMessage} from '../../chat/chat-session.js';
import {MarkdownMessage} from './MarkdownMessage.js';
import {truncateText} from '../../utils/terminal.js';

export function MessageItem({message, width}: {message: UiMessage; width: number}) {
	const color = message.error ? 'red' : message.role === 'user' ? 'cyan' : message.role === 'assistant' ? 'green' : 'yellow';
	const title = message.error ? 'Error' : message.role === 'assistant' ? 'Assistant' : message.role === 'system' ? 'System' : 'You';
	const innerWidth = Math.max(1, width - 4);

	return (
		<Box width={width} borderStyle="single" borderColor={color} paddingX={1} flexDirection="column" marginBottom={1} overflow="hidden">
			<Text color={color} bold>{truncateText(`${title}${message.responseTimeMs ? ` (${message.responseTimeMs}ms)` : ''}`, innerWidth)}</Text>
			<MarkdownMessage content={message.content} width={innerWidth} />
		</Box>
	);
}
