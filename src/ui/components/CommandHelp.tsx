import React from 'react';
import {Box, Text} from 'ink';

export function CommandHelp({compact}: {compact: boolean}) {
	return (
		<Box height={1} paddingX={1}>
			<Text color="gray">{compact ? 'Enter send | Ctrl+C cancel/exit | /help' : 'Enter send | Alt/Shift+Enter newline | Ctrl+L clear | Ctrl+O config | Ctrl+C cancel, second exits | /help'}</Text>
		</Box>
	);
}
