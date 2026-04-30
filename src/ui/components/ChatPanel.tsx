import React from 'react';
import {Box, Text} from 'ink';
import type {UiMessage} from '../../chat/chat-session.js';
import {MessageItem} from './MessageItem.js';
import {truncateText} from '../../utils/terminal.js';

export function ChatPanel({messages, width, height}: {messages: UiMessage[]; width: number; height: number}) {
	const innerWidth = Math.max(1, width - 4);
	const visible = messages.slice(-12);

	return (
		<Box width={width} height={height} borderStyle="single" borderColor="gray" paddingX={1} flexDirection="column" overflow="hidden">
			{visible.length === 0 ? (
				<Box height={Math.max(1, height - 2)} justifyContent="center" alignItems="center" overflow="hidden">
					<Text color="gray">{truncateText('Ask anything. Use /help for commands.', innerWidth)}</Text>
				</Box>
			) : visible.map(message => <MessageItem key={message.id} message={message} width={innerWidth} />)}
		</Box>
	);
}
