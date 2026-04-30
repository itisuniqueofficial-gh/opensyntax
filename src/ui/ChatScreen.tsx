import React, {useMemo, useState} from 'react';
import {Box, Text, useApp, useInput, useStdout} from 'ink';
import clipboard from 'clipboardy';
import {providerLabels, type OpenSyntaxConfig} from '../config/schema.js';
import {saveConfig} from '../config/config-store.js';
import {createProvider} from '../providers/openai-compatible.js';
import type {ChatMessage, ChatUsage} from '../providers/provider.js';
import {InputBox} from './InputBox.js';
import {MessageList} from './MessageList.js';
import {SetupModal} from './SetupModal.js';
import {StatusPanel} from './StatusPanel.js';

type ChatScreenProps = {
	config: OpenSyntaxConfig;
	onConfigChange: (config: OpenSyntaxConfig) => void;
};

export function ChatScreen({config, onConfigChange}: ChatScreenProps) {
	const {exit} = useApp();
	const {stdout} = useStdout();
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [usage, setUsage] = useState<ChatUsage | undefined>();
	const [showConfig, setShowConfig] = useState(false);
	const provider = useMemo(() => createProvider(config), [config]);
	const width = stdout.columns || 100;
	const height = Math.max(stdout.rows || 30, 20);
	const headerHeight = 3;
	const inputHeight = 5;
	const contentHeight = height - headerHeight - inputHeight;
	const statusHeight = width >= 100 ? contentHeight : 7;
	const chatHeight = width >= 100 ? contentHeight : Math.max(6, contentHeight - statusHeight);

	useInput((input, key) => {
		const shortcut = input.toLowerCase();

		if (key.ctrl && shortcut === 'c') {
			exit();
		}

		if (showConfig || busy) {
			return;
		}

		if (key.ctrl && shortcut === 'l') {
			setMessages([]);
			setError(null);
		}

		if (key.ctrl && shortcut === 'o') {
			setShowConfig(true);
		}

		if (key.ctrl && shortcut === 'r') {
			void copyLastAssistantMessage();
		}
	});

	async function handleSubmit(value: string) {
		if (busy) {
			return;
		}

		if (value.startsWith('/')) {
			await handleCommand(value);
			return;
		}

		const nextMessages: ChatMessage[] = [...messages, {role: 'user', content: value}];
		setMessages(nextMessages);
		setBusy(true);
		setError(null);

		try {
			const result = await provider.chat([
				{role: 'system', content: 'You are OpenSyntax, a concise terminal AI assistant.'},
				...nextMessages
			]);
			setMessages(current => [...current, {role: 'assistant', content: result.content}]);
			setUsage(result.usage);
		} catch (chatError) {
			setError(chatError instanceof Error ? chatError.message : 'Chat request failed');
			setMessages(current => [...current, {role: 'assistant', content: 'I could not complete that request. Check the status panel for details.'}]);
		} finally {
			setBusy(false);
		}
	}

	async function handleCommand(command: string) {
		const [name, ...rest] = command.split(' ');
		const arg = rest.join(' ').trim();

		if (name === '/exit') {
			exit();
			return;
		}

		if (name === '/clear') {
			setMessages([]);
			setError(null);
			return;
		}

		if (name === '/copy') {
			await copyMessages(arg || 'last');
			return;
		}

		if (name === '/paste') {
			await pasteClipboardAsPrompt();
			return;
		}

		if (name === '/config') {
			setShowConfig(true);
			return;
		}

		if (name === '/model') {
			if (!arg) {
				setMessages(current => [...current, {role: 'assistant', content: `Current model: ${config.model}`}]);
				return;
			}

			const nextConfig = {...config, model: arg};
			await saveConfig(nextConfig);
			onConfigChange(nextConfig);
			setMessages(current => [...current, {role: 'assistant', content: `Model changed to ${arg}`}]);
			return;
		}

		if (name === '/help') {
			setMessages(current => [
				...current,
				{role: 'assistant', content: '/exit closes OpenSyntax\n/clear clears messages\n/config opens provider setup\n/model shows or changes the model\n/copy last copies the last assistant response\n/copy all copies the visible conversation\n/paste sends clipboard text as a prompt\n/shortcuts shows keyboard shortcuts\n/help shows this help'}
			]);
			return;
		}

		if (name === '/shortcuts') {
			setMessages(current => [
				...current,
				{role: 'assistant', content: 'Input: Ctrl+V paste, Left/Right move cursor, Backspace/Delete edit, Ctrl+A start, Ctrl+E end, Ctrl+U clear before cursor, Ctrl+K clear after cursor, Ctrl+W delete previous word. Chat: Ctrl+L clear, Ctrl+O config, Ctrl+R copy last assistant response, Ctrl+C exit.'}
			]);
			return;
		}

		setMessages(current => [...current, {role: 'assistant', content: `Unknown command: ${name}. Use /help.`}]);
	}

	async function copyLastAssistantMessage() {
		await copyMessages('last');
	}

	async function copyMessages(target: string) {
		try {
			const normalized = target.toLowerCase();
			const content = normalized === 'all'
				? messages.map(message => `${message.role}: ${message.content}`).join('\n\n')
				: [...messages].reverse().find(message => message.role === 'assistant')?.content;

			if (!content) {
				setMessages(current => [...current, {role: 'assistant', content: 'Nothing to copy yet.'}]);
				return;
			}

			await clipboard.write(content);
			setMessages(current => [...current, {role: 'assistant', content: normalized === 'all' ? 'Copied conversation to clipboard.' : 'Copied last assistant response to clipboard.'}]);
		} catch (copyError) {
			setError(copyError instanceof Error ? copyError.message : 'Unable to write clipboard');
		}
	}

	async function pasteClipboardAsPrompt() {
		try {
			const pasted = (await clipboard.read()).trim();
			if (!pasted) {
				setMessages(current => [...current, {role: 'assistant', content: 'Clipboard is empty.'}]);
				return;
			}

			await handleSubmit(pasted);
		} catch (pasteError) {
			setError(pasteError instanceof Error ? pasteError.message : 'Unable to read clipboard');
		}
	}

	async function handleConfigSave(nextConfig: OpenSyntaxConfig) {
		await saveConfig(nextConfig);
		onConfigChange(nextConfig);
		setShowConfig(false);
		setError(null);
	}

	return (
		<Box width={width} height={height} flexDirection="column">
			<Box height={headerHeight} borderStyle="single" borderColor="cyan" paddingX={1} alignItems="center">
				<Text bold color="cyan">OpenSyntax</Text>
				<Text color="gray"> | {providerLabels[config.provider]} | {config.model}</Text>
			</Box>

			{width >= 100 ? (
				<Box height={contentHeight} flexDirection="row">
					<Box width={Math.max(60, width - 32)}>
						<MessageList messages={messages} height={chatHeight} />
					</Box>
					<Box width={32}>
						<StatusPanel config={config} busy={busy} error={error} usage={usage} height={statusHeight} />
					</Box>
				</Box>
			) : (
				<Box height={contentHeight} flexDirection="column">
					<MessageList messages={messages} height={chatHeight} />
					<StatusPanel config={config} busy={busy} error={error} usage={usage} height={statusHeight} />
				</Box>
			)}

			<InputBox onSubmit={handleSubmit} disabled={busy || showConfig} onNotice={setError} />
			{showConfig ? <SetupModal initialConfig={config} onComplete={handleConfigSave} onCancel={() => setShowConfig(false)} /> : null}
		</Box>
	);
}
