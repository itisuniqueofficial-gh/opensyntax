import React from 'react';
import {Box, Text} from 'ink';
import type {UiMessage} from '../../chat/chat-session.js';
import {MessageBubble} from './MessageBubble.js';

export function MessageList({messages, height}: {messages: UiMessage[]; height: number}) {
	const visible = messages.slice(-30);
	return (
		<Box borderStyle="round" borderColor="gray" paddingX={1} height={height} flexDirection="column" flexGrow={1} overflow="hidden">
			{visible.length === 0 ? (
				<Box height={Math.max(1, height - 2)} justifyContent="center" alignItems="center">
					<Text color="gray">Ask anything. Use /help for commands.</Text>
				</Box>
			) : visible.map(message => <MessageBubble key={message.id} message={message} />)}
		</Box>
	);
}
