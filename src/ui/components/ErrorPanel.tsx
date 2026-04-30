import React from 'react';
import {Box, Text} from 'ink';
import {truncateText} from '../../utils/terminal.js';

export function ErrorPanel({message, width}: {message: string; width: number}) {
	return (
		<Box height={3} width={width} borderStyle="single" borderColor="red" paddingX={1} overflow="hidden">
			<Text color="red">{truncateText(message, Math.max(0, width - 4))}</Text>
		</Box>
	);
}
