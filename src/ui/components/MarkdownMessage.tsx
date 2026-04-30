import React from 'react';
import {Box, Text} from 'ink';
import {marked, type Tokens} from 'marked';
import {CodeBlock} from './CodeBlock.js';

export function MarkdownMessage({content}: {content: string}) {
	const tokens = marked.lexer(content, {gfm: true, breaks: true});

	return (
		<Box flexDirection="column">
			{tokens.map((token, index) => renderToken(token, index))}
		</Box>
	);
}

function renderToken(token: Tokens.Generic, index: number): React.ReactNode {
	if (token.type === 'heading') {
		return <Text key={index} bold color="cyan">{stripInline(token.text)}</Text>;
	}

	if (token.type === 'paragraph') {
		return <Text key={index} wrap="wrap">{renderInline(token.text)}</Text>;
	}

	if (token.type === 'space') {
		return <Text key={index}> </Text>;
	}

	if (token.type === 'code') {
		return <CodeBlock key={index} code={token.text} language={token.lang} />;
	}

	if (token.type === 'blockquote') {
		return <Text key={index} color="gray">| {stripInline(token.text)}</Text>;
	}

	if (token.type === 'list') {
		return (
			<Box key={index} flexDirection="column">
				{token.items.map((item: Tokens.ListItem, itemIndex: number) => (
					<Text key={itemIndex} wrap="wrap">{token.ordered ? `${itemIndex + 1}.` : '-'} {stripInline(item.text)}</Text>
				))}
			</Box>
		);
	}

	return <Text key={index} wrap="wrap">{stripInline('text' in token ? String(token.text) : '')}</Text>;
}

function renderInline(text: string): React.ReactNode {
	const parts = text.split(/(`[^`]+`)/g);
	return parts.map((part, index) => {
		if (part.startsWith('`') && part.endsWith('`')) {
			return <Text key={index} color="yellow">{part.slice(1, -1)}</Text>;
		}

		return <Text key={index}>{stripInline(part)}</Text>;
	});
}

function stripInline(text: string): string {
	return text
		.replace(/\*\*([^*]+)\*\*/g, '$1')
		.replace(/\*([^*]+)\*/g, '$1')
		.replace(/\[([^\]]+)]\(([^)]+)\)/g, '$1 ($2)');
}
