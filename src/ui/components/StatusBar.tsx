import React from 'react';
import {Box, Text} from 'ink';
import type {OpenSyntaxConfig} from '../../config/schema.js';
import {providerLabels} from '../../config/schema.js';
import {truncateText} from '../../utils/terminal.js';

export function StatusBar({config, health, responseTimeMs, width}: {config: OpenSyntaxConfig; health: string; responseTimeMs?: number; width: number}) {
	const content = `${providerLabels[config.provider]} | ${config.model} | API: ${health} | Response: ${responseTimeMs ? `${responseTimeMs}ms` : 'pending'} | Streaming: ${config.streaming ? 'on' : 'off'}`;

	return (
		<Box height={1} width={width} paddingX={1} overflow="hidden">
			<Text color="gray">{truncateText(content, Math.max(0, width - 2))}</Text>
		</Box>
	);
}
