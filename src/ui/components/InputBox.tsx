import React, {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import clipboard from 'clipboardy';
import {InputHistory} from '../../chat/history.js';

const history = new InputHistory();

type InputBoxProps = {
	onSubmit: (value: string) => void | Promise<void>;
	disabled?: boolean;
	onNotice?: (message: string) => void;
};

export function InputBox({onSubmit, disabled = false, onNotice}: InputBoxProps) {
	const [value, setValue] = useState('');
	const [cursor, setCursor] = useState(0);

	function insertText(text: string) {
		setValue(current => `${current.slice(0, cursor)}${text}${current.slice(cursor)}`);
		setCursor(current => current + text.length);
	}

	function replaceValue(next: string) {
		setValue(next);
		setCursor(next.length);
	}

	function submit() {
		const trimmed = value.trim();
		if (!trimmed) {
			return;
		}

		history.add(trimmed);
		void onSubmit(trimmed);
		replaceValue('');
	}

	useInput((input, key) => {
		if (disabled) {
			return;
		}

		if (key.return && (key.shift || key.meta)) {
			insertText('\n');
			return;
		}

		if (key.return) {
			submit();
			return;
		}

		if (key.ctrl && input.toLowerCase() === 'v') {
			void clipboard.read().then(insertText).catch(error => onNotice?.(error instanceof Error ? error.message : 'Unable to paste'));
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
			replaceValue(value.slice(cursor));
			setCursor(0);
			return;
		}

		if (key.ctrl && input.toLowerCase() === 'k') {
			replaceValue(value.slice(0, cursor));
			return;
		}

		if (key.ctrl && input.toLowerCase() === 'w') {
			const before = value.slice(0, cursor).replace(/\s+$/, '');
			const start = Math.max(0, before.search(/\S+$/));
			setValue(current => `${current.slice(0, start)}${current.slice(cursor)}`);
			setCursor(start);
			return;
		}

		if (key.upArrow) {
			const previous = history.previous();
			if (previous !== null) {
				replaceValue(previous);
			}
			return;
		}

		if (key.downArrow) {
			const next = history.next();
			if (next !== null) {
				replaceValue(next);
			}
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

		if (key.backspace) {
			if (cursor > 0) {
				setValue(current => `${current.slice(0, cursor - 1)}${current.slice(cursor)}`);
				setCursor(current => Math.max(0, current - 1));
			}
			return;
		}

		if (key.delete) {
			setValue(current => `${current.slice(0, cursor)}${current.slice(cursor + 1)}`);
			return;
		}

		if (!input || key.ctrl || key.escape || key.tab) {
			return;
		}

		insertText(input);
	});

	const before = value.slice(0, cursor);
	const current = value[cursor] ?? ' ';
	const after = value.slice(cursor + 1);

	return (
		<Box borderStyle="round" borderColor={disabled ? 'gray' : 'cyan'} height={5} paddingX={1} flexDirection="column">
			<Text color="gray">Multiline message | Enter send | Alt/Shift+Enter newline | Up/Down history</Text>
			<Text wrap="wrap">
				<Text color={disabled ? 'gray' : 'cyan'}>{'>'} </Text>
				{value ? <><Text>{before}</Text><Text inverse>{current}</Text><Text>{after}</Text></> : <Text color="gray">Type a message or /help...</Text>}
			</Text>
		</Box>
	);
}
