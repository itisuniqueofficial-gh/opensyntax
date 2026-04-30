import React from 'react';
import {Box, Text} from 'ink';
import {highlight} from 'cli-highlight';
import {truncateText, wrapText} from '../../utils/terminal.js';

const languageMap: Record<string, string> = {
	js: 'javascript',
	jsx: 'javascript',
	ts: 'typescript',
	tsx: 'typescript',
	sh: 'bash',
	shell: 'bash',
	yml: 'yaml',
	py: 'python',
	cpp: 'cpp',
	cxx: 'cpp',
	md: 'markdown'
};

export function CodeBlock({code, language, width}: {code: string; language?: string; width: number}) {
	const normalized = language ? languageMap[language.toLowerCase()] ?? language.toLowerCase() : 'text';
	const innerWidth = Math.max(1, width - 4);
	const highlighted = highlight(code.replace(/\n$/, ''), {language: normalized, ignoreIllegals: true});
	const lines = highlighted.split('\n').flatMap(line => wrapText(line, innerWidth, 6)).slice(0, 40);

	return (
		<Box width={width} borderStyle="single" borderColor="gray" paddingX={1} flexDirection="column" marginY={1} overflow="hidden">
			<Text color="gray">{truncateText(normalized, innerWidth)}</Text>
			{lines.map((line, index) => <Text key={index}>{truncateText(line, innerWidth)}</Text>)}
		</Box>
	);
}
