import React from 'react';
import {Box, Text} from 'ink';
import {marked, type Tokens} from 'marked';
import {CodeBlock} from './CodeBlock.js';
import {truncateText, wrapText} from '../../utils/terminal.js';

export function MarkdownMessage({content, width}: {content: string; width: number}) {
	const tokens = marked.lexer(content || ' ', {gfm: true, breaks: true});
	const innerWidth = Math.max(1, width);

	return (
		<Box width={innerWidth} flexDirection="column" overflow="hidden">
			{tokens.map((token, index) => renderToken(token, index, innerWidth))}
		</Box>
	);
}

function renderToken(token: Tokens.Generic, index: number, width: number): React.ReactNode {
	if (token.type === 'heading') {
		return wrapText(stripInline(token.text), width, 3).map((line, lineIndex) => <Text key={`${index}-${lineIndex}`} bold color="cyan">{line}</Text>);
	}

	if (token.type === 'paragraph') {
		return wrapText(stripInline(token.text), width, 8).map((line, lineIndex) => <Text key={`${index}-${lineIndex}`}>{renderInline(line, width)}</Text>);
	}

	if (token.type === 'space') {
		return <Text key={index}> </Text>;
	}

	if (token.type === 'code') {
		return <CodeBlock key={index} code={token.text} language={token.lang} width={width} />;
	}

	if (token.type === 'blockquote') {
		return wrapText(`| ${stripInline(token.text)}`, width, 6).map((line, lineIndex) => <Text key={`${index}-${lineIndex}`} color="gray">{line}</Text>);
	}

	if (token.type === 'list') {
		return (
			<Box key={index} width={width} flexDirection="column" overflow="hidden">
				{token.items.slice(0, 20).flatMap((item: Tokens.ListItem, itemIndex: number) => wrapText(`${token.ordered ? `${itemIndex + 1}.` : '-'} ${stripInline(item.text)}`, width, 4).map((line, lineIndex) => <Text key={`${itemIndex}-${lineIndex}`}>{line}</Text>))}
			</Box>
		);
	}

	return wrapText(stripInline('text' in token ? String(token.text) : ''), width, 6).map((line, lineIndex) => <Text key={`${index}-${lineIndex}`}>{line}</Text>);
}

function renderInline(text: string, width: number): React.ReactNode {
	const parts = truncateText(text, width).split(/(`[^`]+`)/g);
	return parts.map((part, index) => part.startsWith('`') && part.endsWith('`') ? <Text key={index} color="yellow">{part.slice(1, -1)}</Text> : <Text key={index}>{part}</Text>);
}

function stripInline(text: string): string {
	return text
		.replace(/\*\*([^*]+)\*\*/g, '$1')
		.replace(/\*([^*]+)\*/g, '$1')
		.replace(/\[([^\]]+)]\(([^)]+)\)/g, '$1 ($2)');
}
