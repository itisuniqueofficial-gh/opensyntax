import React from 'react';
import {Box, Text} from 'ink';
import {providerLabels, type OpenSyntaxConfig} from '../config/schema.js';
import type {ChatUsage} from '../providers/provider.js';

type StatusPanelProps = {
	config: OpenSyntaxConfig;
	busy: boolean;
	error: string | null;
	usage?: ChatUsage;
	height: number;
};

export function StatusPanel({config, busy, error, usage, height}: StatusPanelProps) {
	return (
		<Box borderStyle="round" borderColor={error ? 'red' : 'gray'} paddingX={1} height={height} flexDirection="column">
			<Text bold>Status</Text>
			<Text color={busy ? 'yellow' : 'green'}>{busy ? 'Thinking...' : 'Ready'}</Text>
			<Text color="gray">Provider: {providerLabels[config.provider]}</Text>
			<Text color="gray">Model: {config.model}</Text>
			<Text color="gray">Tokens: {usage?.totalTokens ?? 'placeholder'}</Text>
			{error ? <Text color="red" wrap="wrap">{error}</Text> : null}
		</Box>
	);
}
