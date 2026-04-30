import React from 'react';
import {Box, Text} from 'ink';
import type {OpenSyntaxConfig} from '../../config/schema.js';
import {providerLabels} from '../../config/schema.js';
import {truncateText} from '../../utils/terminal.js';

type HeaderProps = {
	config: OpenSyntaxConfig;
	status: string;
	width: number;
	compact: boolean;
};

export function Header({config, status, width, compact}: HeaderProps) {
	const provider = providerLabels[config.provider];
	const label = compact
		? `OpenSyntax v0.2.1 | ${provider} | ${status}`
		: `OpenSyntax v0.2.1 | Provider: ${provider} | Model: ${config.model} | ${status}`;

	return (
		<Box height={3} width={width} borderStyle="single" borderColor="cyan" paddingX={1} overflow="hidden">
			<Text>{truncateText(label, Math.max(0, width - 4))}</Text>
		</Box>
	);
}
