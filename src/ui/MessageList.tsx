import React from 'react';
import {Box, Text} from 'ink';
import type {ChatMessage} from '../providers/provider.js';

type MessageListProps = {
	messages: ChatMessage[];
	height: number;
};

function roleColor(role: ChatMessage['role']): 'cyan' | 'green' | 'gray' {
	if (role === 'user') {
		return 'cyan';
	}

	if (role === 'assistant') {
		return 'green';
	}

	return 'gray';
}

export function MessageList({messages, height}: MessageListProps) {
	const visible = messages.slice(-Math.max(1, height - 2));

	return (
		<Box borderStyle="round" borderColor="gray" paddingX={1} height={height} flexDirection="column" flexGrow={1}>
			{visible.length === 0 ? (
				<Box justifyContent="center" alignItems="center" height={Math.max(1, height - 2)}>
					<Text color="gray">Ask anything. Use /help for commands.</Text>
				</Box>
			) : (
				visible.map((message, index) => (
					<Box key={`${message.role}-${index}`} flexDirection="column" marginBottom={index === visible.length - 1 ? 0 : 1}>
						<Text color={roleColor(message.role)} bold>
							{message.role === 'assistant' ? 'OpenSyntax' : message.role}
						</Text>
						<Text wrap="wrap">{message.content}</Text>
					</Box>
				))
			)}
		</Box>
	);
}
