import React from 'react';
import {Box, Text} from 'ink';

export function ErrorPanel({message}: {message: string}) {
	return (
		<Box borderStyle="round" borderColor="red" paddingX={1}>
			<Text color="red">{message}</Text>
		</Box>
	);
}
