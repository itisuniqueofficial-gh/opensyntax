import React from 'react';
import {Box, Text} from 'ink';
import {highlight} from 'cli-highlight';

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

export function CodeBlock({code, language}: {code: string; language?: string}) {
	const normalized = language ? languageMap[language.toLowerCase()] ?? language.toLowerCase() : 'text';
	const rendered = highlight(code.replace(/\n$/, ''), {language: normalized, ignoreIllegals: true});

	return (
		<Box borderStyle="round" borderColor="gray" paddingX={1} flexDirection="column" marginY={1}>
			<Text color="gray">{normalized}</Text>
			<Text>{rendered}</Text>
		</Box>
	);
}
