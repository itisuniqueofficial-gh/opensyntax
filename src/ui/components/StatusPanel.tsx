import React from 'react';
import {Box, Text} from 'ink';
import type {OpenSyntaxConfig} from '../../config/schema.js';
import {providerLabels} from '../../config/schema.js';
import type {ChatUsage} from '../../providers/types.js';

export function StatusPanel({config, busy, health, usage, responseTimeMs, height}: {config: OpenSyntaxConfig; busy: boolean; health: string; usage?: ChatUsage; responseTimeMs?: number; height: number}) {
	return (
		<Box borderStyle="round" borderColor={busy ? 'yellow' : 'gray'} paddingX={1} height={height} flexDirection="column">
			<Text bold>Status</Text>
			<Text color={busy ? 'yellow' : 'green'}>{busy ? 'Streaming response...' : 'Ready'}</Text>
			<Text color="gray">Provider: {providerLabels[config.provider]}</Text>
			<Text color="gray">Model: {config.model}</Text>
			<Text color="gray">Streaming: {config.streaming ? 'on' : 'off'}</Text>
			<Text color="gray">API health: {health}</Text>
			<Text color="gray">Tokens: {usage?.totalTokens ?? 'placeholder'}</Text>
			<Text color="gray">Response: {responseTimeMs ? `${responseTimeMs}ms` : 'pending'}</Text>
		</Box>
	);
}
