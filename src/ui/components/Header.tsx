import React from 'react';
import {Box, Text} from 'ink';
import type {OpenSyntaxConfig} from '../../config/schema.js';
import {providerLabels} from '../../config/schema.js';

export function Header({config, compact}: {config: OpenSyntaxConfig; compact: boolean}) {
	return (
		<Box height={3} borderStyle="single" borderColor="cyan" paddingX={1} alignItems="center" justifyContent="space-between">
			<Text>
				<Text bold color="cyan">OpenSyntax</Text>
				<Text color="gray"> | {providerLabels[config.provider]} | {config.model} | Mode: Chat</Text>
			</Text>
			{compact ? <Text color="yellow">compact</Text> : <Text color="green">online</Text>}
		</Box>
	);
}
