import React from 'react';
import {Box, Text} from 'ink';
import type {OpenSyntaxConfig} from '../../config/schema.js';
import {providerLabels} from '../../config/schema.js';
import type {ChatUsage} from '../../providers/types.js';
import {truncateText} from '../../utils/terminal.js';

type SidebarProps = {
	config: OpenSyntaxConfig;
	health: string;
	busy: boolean;
	usage?: ChatUsage;
	responseTimeMs?: number;
	width: number;
	height: number;
};

export function Sidebar({config, health, busy, usage, responseTimeMs, width, height}: SidebarProps) {
	const inner = Math.max(8, width - 4);
	const shortUrl = config.baseUrl.replace(/^https?:\/\//, '').replace(/\/v1\/?$/, '');

	return (
		<Box width={width} height={height} borderStyle="single" borderColor="gray" paddingX={1} flexDirection="column" overflow="hidden">
			<Text bold color="cyan">Sidebar</Text>
			<Row width={inner} label="Version" value="0.2.1" />
			<Row width={inner} label="Status" value={busy ? 'Streaming' : 'Ready'} color={busy ? 'yellow' : 'green'} />
			<Row width={inner} label="Provider" value={providerLabels[config.provider]} />
			<Row width={inner} label="Model" value={config.model} />
			<Row width={inner} label="Base" value={shortUrl} />
			<Row width={inner} label="Stream" value={config.streaming ? 'on' : 'off'} />
			<Row width={inner} label="API" value={health} />
			<Row width={inner} label="Tokens" value={String(usage?.totalTokens ?? 'placeholder')} />
			<Row width={inner} label="Latency" value={responseTimeMs ? `${responseTimeMs}ms` : 'pending'} />
			<Text color="gray"> </Text>
			<Text bold color="gray">Roadmap</Text>
			<Text color="gray">- model list</Text>
			<Text color="gray">- themes</Text>
			<Text color="gray">- export chat</Text>
		</Box>
	);
}

function Row({label, value, width, color = 'gray'}: {label: string; value: string; width: number; color?: 'gray' | 'green' | 'yellow'}) {
	return <Text color={color}>{truncateText(`${label}: ${value}`, width)}</Text>;
}
