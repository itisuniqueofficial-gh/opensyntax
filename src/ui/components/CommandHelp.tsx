import React from 'react';
import {Box, Text} from 'ink';
import {truncateText} from '../../utils/terminal.js';

export function CommandHelp({width, compact}: {width: number; compact: boolean}) {
	const help = compact
		? 'Enter: Send | Ctrl+L: Clear | Ctrl+C: Cancel/Exit | /help'
		: 'Enter: Send | Shift+Enter: New line | Ctrl+L: Clear | Ctrl+C: Cancel | /help';

	return (
		<Box height={1} width={width} paddingX={1} overflow="hidden">
			<Text color="gray">{truncateText(help, Math.max(0, width - 2))}</Text>
		</Box>
	);
}
