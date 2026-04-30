import React, {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import clipboard from 'clipboardy';

type InputBoxProps = {
	onSubmit: (value: string) => void | Promise<void>;
	disabled?: boolean;
	placeholder?: string;
	onNotice?: (message: string) => void;
};

export function InputBox({onSubmit, disabled = false, placeholder = 'Type a message...', onNotice}: InputBoxProps) {
	const [value, setValue] = useState('');
	const [cursor, setCursor] = useState(0);

	function insertText(text: string) {
		setValue(current => `${current.slice(0, cursor)}${text}${current.slice(cursor)}`);
		setCursor(current => current + text.length);
	}

	function deleteBeforeCursor() {
		if (cursor === 0) {
			return;
		}

		setValue(current => `${current.slice(0, cursor - 1)}${current.slice(cursor)}`);
		setCursor(current => Math.max(0, current - 1));
	}

	function deleteAfterCursor() {
		setValue(current => `${current.slice(0, cursor)}${current.slice(cursor + 1)}`);
	}

	function deleteWordBeforeCursor() {
		const before = value.slice(0, cursor).replace(/\s+$/, '');
		const start = Math.max(0, before.search(/\S+$/));
		setValue(current => `${current.slice(0, start)}${current.slice(cursor)}`);
		setCursor(start);
	}

	async function pasteFromClipboard() {
		try {
			const text = await clipboard.read();
			if (text) {
				insertText(text);
			}
		} catch (error) {
			onNotice?.(error instanceof Error ? error.message : 'Unable to read clipboard');
		}
	}

	useInput((input, key) => {
		if (disabled) {
			return;
		}

		if (key.ctrl && input.toLowerCase() === 'v') {
			void pasteFromClipboard();
			return;
		}

		if (key.ctrl && input.toLowerCase() === 'a') {
			setCursor(0);
			return;
		}

		if (key.ctrl && input.toLowerCase() === 'e') {
			setCursor(value.length);
			return;
		}

		if (key.ctrl && input.toLowerCase() === 'u') {
			setValue(current => current.slice(cursor));
			setCursor(0);
			return;
		}

		if (key.ctrl && input.toLowerCase() === 'k') {
			setValue(current => current.slice(0, cursor));
			return;
		}

		if (key.ctrl && input.toLowerCase() === 'w') {
			deleteWordBeforeCursor();
			return;
		}

		if (key.return) {
			const trimmed = value.trim();
			if (trimmed) {
				void onSubmit(trimmed);
				setValue('');
				setCursor(0);
			}
			return;
		}

		if (key.backspace) {
			deleteBeforeCursor();
			return;
		}

		if (key.delete) {
			deleteAfterCursor();
			return;
		}

		if (key.leftArrow) {
			setCursor(current => Math.max(0, current - 1));
			return;
		}

		if (key.rightArrow) {
			setCursor(current => Math.min(value.length, current + 1));
			return;
		}

		if (key.ctrl || key.meta || key.tab || key.escape || key.upArrow || key.downArrow) {
			return;
		}

		if (input) {
			insertText(input);
		}
	});

	const beforeCursor = value.slice(0, cursor);
	const cursorChar = value[cursor] ?? ' ';
	const afterCursor = value.slice(cursor + 1);

	return (
		<Box borderStyle="round" borderColor={disabled ? 'gray' : 'cyan'} paddingX={1} height={5} flexDirection="column">
			<Text color="gray">Message  Ctrl+V paste | Ctrl+A/E jump | Ctrl+U/K clear | Ctrl+W word delete</Text>
			<Text>
				<Text color={disabled ? 'gray' : 'cyan'}>{'>'} </Text>
				{value ? (
					<>
						<Text>{beforeCursor}</Text>
						<Text inverse>{cursorChar}</Text>
						<Text>{afterCursor}</Text>
					</>
				) : (
					<Text color="gray">{placeholder}</Text>
				)}
			</Text>
		</Box>
	);
}
