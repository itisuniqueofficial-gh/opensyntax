import React, {useMemo, useRef, useState} from 'react';
import {Box, Text, useApp, useInput, useStdout} from 'ink';
import clipboard from 'clipboardy';
import type {OpenSyntaxConfig} from '../../config/schema.js';
import {providerLabels} from '../../config/schema.js';
import {saveConfig, canWriteConfigDir, isConfigInsideProject} from '../../config/config-store.js';
import {createProvider} from '../../providers/openai-compatible.js';
import type {ChatUsage} from '../../providers/types.js';
import {commandHelp, isCommand, parseCommand} from '../../chat/commands.js';
import {createMessage, toProviderMessages, type UiMessage} from '../../chat/chat-session.js';
import {getTerminalLayout} from '../../utils/terminal.js';
import {Header} from '../components/Header.js';
import {MessageList} from '../components/MessageList.js';
import {StatusPanel} from '../components/StatusPanel.js';
import {InputBox} from '../components/InputBox.js';
import {SetupModal} from '../components/SetupModal.js';
import {CommandHelp} from '../components/CommandHelp.js';
import {ErrorPanel} from '../components/ErrorPanel.js';

type ChatScreenProps = {
	config: OpenSyntaxConfig;
	onConfigChange: (config: OpenSyntaxConfig) => void;
};

export function ChatScreen({config, onConfigChange}: ChatScreenProps) {
	const {exit} = useApp();
	const {stdout} = useStdout();
	const [messages, setMessages] = useState<UiMessage[]>([]);
	const [busy, setBusy] = useState(false);
	const [showConfig, setShowConfig] = useState(false);
	const [health, setHealth] = useState('not tested');
	const [usage, setUsage] = useState<ChatUsage | undefined>();
	const [responseTimeMs, setResponseTimeMs] = useState<number | undefined>();
	const [error, setError] = useState<string | null>(null);
	const abortRef = useRef<AbortController | null>(null);
	const lastCtrlCRef = useRef(0);
	const provider = useMemo(() => createProvider(config), [config]);
	const width = stdout.columns || 100;
	const height = Math.max(stdout.rows || 28, 16);
	const layout = getTerminalLayout(width, height);
	const compact = layout === 'compact';
	const headerHeight = 3;
	const inputHeight = 5;
	const footerHeight = 1;
	const contentHeight = Math.max(6, height - headerHeight - inputHeight - footerHeight - (error ? 3 : 0));
	const statusHeight = layout === 'wide' ? contentHeight : compact ? 5 : 8;
	const chatHeight = layout === 'wide' ? contentHeight : Math.max(5, contentHeight - statusHeight);

	useInput((input, key) => {
		const shortcut = input.toLowerCase();
		if (key.ctrl && shortcut === 'c') {
			if (busy && abortRef.current) {
				abortRef.current.abort();
				setBusy(false);
				setMessages(current => [...current, createMessage('system', 'Request cancelled. Press Ctrl+C again to exit.', {error: true})]);
				lastCtrlCRef.current = Date.now();
				return;
			}

			if (Date.now() - lastCtrlCRef.current < 1500) {
				exit();
				return;
			}

			lastCtrlCRef.current = Date.now();
			setMessages(current => [...current, createMessage('system', 'Press Ctrl+C again to exit.')]);
		}

		if (showConfig || busy) return;
		if (key.ctrl && shortcut === 'l') setMessages([]);
		if (key.ctrl && shortcut === 'o') setShowConfig(true);
		if (key.ctrl && shortcut === 'r') void copyMessages('last');
	});

	async function submit(value: string) {
		if (busy) return;
		if (isCommand(value)) {
			await handleCommand(value);
			return;
		}

		const user = createMessage('user', value);
		const assistant = createMessage('assistant', '');
		const nextMessages = [...messages, user];
		setMessages([...nextMessages, assistant]);
		setBusy(true);
		setError(null);
		const controller = new AbortController();
		abortRef.current = controller;

		try {
			const result = await provider.chat({
				messages: [{role: 'system', content: 'You are OpenSyntax, a professional terminal AI chatbot. Be concise and format technical answers in Markdown.'}, ...toProviderMessages(nextMessages)],
				stream: config.streaming,
				signal: controller.signal,
				onDelta: delta => {
					setMessages(current => current.map(message => message.id === assistant.id ? {...message, content: message.content + delta.content} : message));
				}
			});

			setMessages(current => current.map(message => message.id === assistant.id ? {...message, content: result.content, responseTimeMs: result.responseTimeMs} : message));
			setUsage(result.usage);
			setResponseTimeMs(result.responseTimeMs);
		} catch (requestError) {
			const message = requestError instanceof Error ? requestError.message : 'Request failed';
			setError(message);
			setMessages(current => current.map(item => item.id === assistant.id ? {...item, role: 'system', content: message, error: true} : item));
		} finally {
			setBusy(false);
			abortRef.current = null;
		}
	}

	async function handleCommand(value: string) {
		const {name, arg} = parseCommand(value);
		if (name === '/exit') return exit();
		if (name === '/clear' || name === '/reset') return setMessages([]);
		if (name === '/config') return setShowConfig(true);
		if (name === '/help') return system(commandHelp.join('\n'));
		if (name === '/about') return system('OpenSyntax v0.2.0\nFullscreen terminal AI chatbot CLI.');
		if (name === '/provider') return system(`Provider: ${providerLabels[config.provider]}\nBase URL: ${config.baseUrl}`);
		if (name === '/model') {
			if (!arg) return system(`Current model: ${config.model}`);
			const nextConfig = {...config, model: arg};
			await saveConfig(nextConfig);
			onConfigChange(nextConfig);
			return system(`Model changed to ${arg}`);
		}

		if (name === '/stream') {
			const enabled = arg.toLowerCase() !== 'off';
			const nextConfig = {...config, streaming: enabled};
			await saveConfig(nextConfig);
			onConfigChange(nextConfig);
			return system(`Streaming ${enabled ? 'enabled' : 'disabled'}`);
		}

		if (name === '/doctor') {
			const writable = await canWriteConfigDir();
			const healthResult = await provider.health();
			setHealth(healthResult.ok ? 'ok' : 'failed');
			return system(`Node: ${process.version}\nConfig writable: ${writable ? 'yes' : 'no'}\nProject config warning: ${isConfigInsideProject() ? 'yes' : 'no'}\nAPI: ${healthResult.message}`);
		}

		if (name === '/copy') return copyMessages(arg || 'last');
		if (name === '/paste') {
			const pasted = (await clipboard.read()).trim();
			return pasted ? submit(pasted) : system('Clipboard is empty.');
		}

		return system(`Unknown command: ${name}. Use /help.`);
	}

	function system(content: string) {
		setMessages(current => [...current, createMessage('system', content)]);
	}

	async function copyMessages(target: string) {
		const content = target.toLowerCase() === 'all'
			? messages.map(message => `${message.role}: ${message.content}`).join('\n\n')
			: [...messages].reverse().find(message => message.role === 'assistant')?.content;
		if (!content) return system('Nothing to copy yet.');
		await clipboard.write(content);
		system(target.toLowerCase() === 'all' ? 'Copied conversation to clipboard.' : 'Copied last assistant response to clipboard.');
	}

	async function handleConfigSave(nextConfig: OpenSyntaxConfig) {
		await saveConfig(nextConfig);
		onConfigChange(nextConfig);
		setShowConfig(false);
		system(`Config saved. Provider: ${providerLabels[nextConfig.provider]}, model: ${nextConfig.model}`);
	}

	return (
		<Box width={width} height={height} flexDirection="column">
			<Header config={config} compact={compact} />
			{layout === 'wide' ? (
				<Box height={contentHeight} flexDirection="row">
					<Box width={Math.max(60, width - 34)}><MessageList messages={messages} height={chatHeight} /></Box>
					<Box width={34}><StatusPanel config={config} busy={busy} health={health} usage={usage} responseTimeMs={responseTimeMs} height={statusHeight} /></Box>
				</Box>
			) : (
				<Box height={contentHeight} flexDirection="column">
					<MessageList messages={messages} height={chatHeight} />
					<StatusPanel config={config} busy={busy} health={health} usage={usage} responseTimeMs={responseTimeMs} height={statusHeight} />
				</Box>
			)}
			{error ? <ErrorPanel message={error} /> : null}
			<InputBox onSubmit={submit} disabled={showConfig} onNotice={setError} />
			<CommandHelp compact={compact} />
			{showConfig ? <SetupModal initialConfig={config} onComplete={handleConfigSave} onCancel={() => setShowConfig(false)} /> : null}
		</Box>
	);
}
