import React, {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import clipboard from 'clipboardy';
import {InputHistory} from '../../chat/history.js';
import {truncateText, wrapText} from '../../utils/terminal.js';

const history = new InputHistory();

type InputBoxProps = {
	onSubmit: (value: string) => void | Promise<void>;
	disabled?: boolean;
	onNotice?: (message: string) => void;
	width: number;
	height: number;
};

export function InputBox({onSubmit, disabled = false, onNotice, width, height}: InputBoxProps) {
	const [value, setValue] = useState('');
	const [cursor, setCursor] = useState(0);
	const innerWidth = Math.max(1, width - 4);
	const inputLines = Math.max(1, height - 3);

	function insertText(text: string) {
		const next = `${value.slice(0, cursor)}${text}${value.slice(cursor)}`.slice(0, 8000);
		setValue(next);
		setCursor(Math.min(next.length, cursor + text.length));
	}

	function replaceValue(next: string) {
		const limited = next.slice(0, 8000);
		setValue(limited);
		setCursor(limited.length);
	}

	function submit() {
		const trimmed = value.trim();
		if (!trimmed) return;
		history.add(trimmed);
		void onSubmit(trimmed);
		replaceValue('');
	}

	useInput((input, key) => {
		if (disabled) return;
		if (key.return && (key.shift || key.meta)) return insertText('\n');
		if (key.return) return submit();
		if (key.ctrl && input.toLowerCase() === 'v') return void clipboard.read().then(insertText).catch(error => onNotice?.(error instanceof Error ? error.message : 'Unable to paste'));
		if (key.ctrl && input.toLowerCase() === 'a') return setCursor(0);
		if (key.ctrl && input.toLowerCase() === 'e') return setCursor(value.length);
		if (key.ctrl && input.toLowerCase() === 'u') return replaceValue(value.slice(cursor));
		if (key.ctrl && input.toLowerCase() === 'k') return replaceValue(value.slice(0, cursor));
		if (key.ctrl && input.toLowerCase() === 'w') {
			const before = value.slice(0, cursor).replace(/\s+$/, '');
			const start = Math.max(0, before.search(/\S+$/));
			setValue(current => `${current.slice(0, start)}${current.slice(cursor)}`);
			setCursor(start);
			return;
		}
		if (key.upArrow) {
			const previous = history.previous();
			if (previous !== null) replaceValue(previous);
			return;
		}
		if (key.downArrow) {
			const next = history.next();
			if (next !== null) replaceValue(next);
			return;
		}
		if (key.leftArrow) return setCursor(current => Math.max(0, current - 1));
		if (key.rightArrow) return setCursor(current => Math.min(value.length, current + 1));
		if (key.backspace) {
			if (cursor > 0) {
				setValue(current => `${current.slice(0, cursor - 1)}${current.slice(cursor)}`);
				setCursor(current => Math.max(0, current - 1));
			}
			return;
		}
		if (key.delete) return setValue(current => `${current.slice(0, cursor)}${current.slice(cursor + 1)}`);
		if (!input || key.ctrl || key.escape || key.tab) return;
		insertText(input);
	});

	const displayValue = value || 'Type a message...';
	const lines = wrapText(displayValue, Math.max(1, innerWidth - 2), inputLines).slice(-inputLines);

	return (
		<Box width={width} height={height} borderStyle="single" borderColor={disabled ? 'gray' : 'cyan'} paddingX={1} flexDirection="column" overflow="hidden">
			<Text color="gray">Input</Text>
			{lines.map((line, index) => (
				<Text key={index} color={!value ? 'gray' : undefined}>{index === 0 ? '> ' : '  '}{truncateText(line, Math.max(1, innerWidth - 2))}</Text>
			))}
		</Box>
	);
}
