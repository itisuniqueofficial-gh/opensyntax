import React, {useState} from 'react';
import {Box, Text, useInput} from 'ink';

type InputBoxProps = {
	onSubmit: (value: string) => void;
	disabled?: boolean;
	placeholder?: string;
};

export function InputBox({onSubmit, disabled = false, placeholder = 'Type a message...'}: InputBoxProps) {
	const [value, setValue] = useState('');

	useInput((input, key) => {
		if (disabled) {
			return;
		}

		if (key.return) {
			const trimmed = value.trim();
			if (trimmed) {
				onSubmit(trimmed);
				setValue('');
			}
			return;
		}

		if (key.backspace || key.delete) {
			setValue(current => current.slice(0, -1));
			return;
		}

		if (key.ctrl || key.meta || key.tab || key.escape || key.upArrow || key.downArrow || key.leftArrow || key.rightArrow) {
			return;
		}

		if (input) {
			setValue(current => current + input);
		}
	});

	return (
		<Box borderStyle="round" borderColor={disabled ? 'gray' : 'cyan'} paddingX={1} height={4} flexDirection="column">
			<Text color="gray">Message</Text>
			<Text>
				<Text color={disabled ? 'gray' : 'cyan'}>{'>'} </Text>
				{value ? <Text>{value}</Text> : <Text color="gray">{placeholder}</Text>}
			</Text>
		</Box>
	);
}
