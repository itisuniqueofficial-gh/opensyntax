import React, {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import {ZodError} from 'zod';
import {createConfig, providerDefaults, providerLabels, type OpenSyntaxConfig, type ProviderId} from '../../config/schema.js';
import {providerIds} from '../../providers/registry.js';

type SetupModalProps = {
	onComplete: (config: OpenSyntaxConfig) => Promise<void> | void;
	onCancel?: () => void;
	initialConfig?: OpenSyntaxConfig | null;
};

type Field = 'provider' | 'apiKey' | 'baseUrl' | 'model' | 'streaming' | 'save';
const fields: Field[] = ['provider', 'apiKey', 'baseUrl', 'model', 'streaming', 'save'];

export function SetupModal({onComplete, onCancel, initialConfig}: SetupModalProps) {
	const [activeIndex, setActiveIndex] = useState(0);
	const [providerIndex, setProviderIndex] = useState(() => Math.max(0, providerIds.indexOf(initialConfig?.provider ?? 'nvidia')));
	const provider = providerIds[providerIndex];
	const defaults = providerDefaults[provider];
	const [apiKey, setApiKey] = useState(initialConfig?.apiKey ?? '');
	const [baseUrl, setBaseUrl] = useState(initialConfig?.baseUrl ?? defaults.baseUrl);
	const [model, setModel] = useState(initialConfig?.model ?? defaults.model);
	const [streaming, setStreaming] = useState(initialConfig?.streaming ?? defaults.streaming);
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const activeField = fields[activeIndex];

	function selectProvider(next: number) {
		const normalized = (next + providerIds.length) % providerIds.length;
		const nextProvider = providerIds[normalized];
		const nextDefaults = providerDefaults[nextProvider];
		setProviderIndex(normalized);
		setBaseUrl(nextDefaults.baseUrl);
		setModel(nextDefaults.model);
		setStreaming(nextDefaults.streaming);
		if (!nextDefaults.apiKeyRequired) {
			setApiKey('');
		}
	}

	async function submit() {
		try {
			setSaving(true);
			setError(null);
			await onComplete(createConfig({provider, apiKey, baseUrl, model, streaming}));
		} catch (submitError) {
			setSaving(false);
			setError(submitError instanceof ZodError ? submitError.issues[0]?.message ?? 'Invalid config' : submitError instanceof Error ? submitError.message : 'Unable to save config');
		}
	}

	function append(input: string) {
		if (activeField === 'apiKey') setApiKey(current => current + input);
		if (activeField === 'baseUrl') setBaseUrl(current => current + input);
		if (activeField === 'model') setModel(current => current + input);
	}

	function erase() {
		if (activeField === 'apiKey') setApiKey(current => current.slice(0, -1));
		if (activeField === 'baseUrl') setBaseUrl(current => current.slice(0, -1));
		if (activeField === 'model') setModel(current => current.slice(0, -1));
	}

	useInput((input, key) => {
		if (saving) return;
		if (key.escape && onCancel) return onCancel();
		if (key.tab || key.downArrow) return setActiveIndex(current => (current + 1) % fields.length);
		if (key.upArrow) return setActiveIndex(current => (current - 1 + fields.length) % fields.length);
		if (key.return) return activeField === 'save' ? void submit() : setActiveIndex(current => Math.min(fields.length - 1, current + 1));
		if (activeField === 'provider' && key.leftArrow) return selectProvider(providerIndex - 1);
		if (activeField === 'provider' && key.rightArrow) return selectProvider(providerIndex + 1);
		if (activeField === 'streaming' && (key.leftArrow || key.rightArrow || input === ' ')) return setStreaming(current => !current);
		if (key.backspace || key.delete) return erase();
		if (!input || key.ctrl || key.meta) return;
		append(input);
	});

	return (
		<Box position="absolute" width="100%" height="100%" justifyContent="center" alignItems="center">
			<Box borderStyle="double" borderColor="cyan" width={76} paddingX={2} paddingY={1} flexDirection="column">
				<Text bold color="cyan">Setup OpenSyntax Provider</Text>
				<Text color="gray">Tab/arrows move. Esc closes. API keys are masked.</Text>
				<FieldRow label="Provider" active={activeField === 'provider'} value={`< ${providerLabels[provider]} >`} />
				<FieldRow label="API key" active={activeField === 'apiKey'} value={apiKey ? '*'.repeat(Math.min(32, apiKey.length)) : defaults.apiKeyRequired ? 'required' : 'not required'} muted={!apiKey} />
				<FieldRow label="Base URL" active={activeField === 'baseUrl'} value={baseUrl} />
				<FieldRow label="Model" active={activeField === 'model'} value={model} />
				<FieldRow label="Streaming" active={activeField === 'streaming'} value={streaming ? 'yes' : 'no'} />
				<FieldRow label="Save as default" active={activeField === 'save'} value="yes" />
				{error ? <Text color="red">{error}</Text> : null}
				<Text color="gray">Saved to ~/.opensyntax/config.json with private permissions where supported.</Text>
				<Text color={saving ? 'yellow' : 'green'}>{saving ? 'Saving...' : 'Ready'}</Text>
			</Box>
		</Box>
	);
}

function FieldRow({label, active, value, muted = false}: {label: string; active: boolean; value: string; muted?: boolean}) {
	return <Box marginTop={1}><Text color={active ? 'cyan' : 'gray'}>{active ? '>' : ' '} {label}: </Text><Text color={muted ? 'gray' : 'white'}>{value}</Text></Box>;
}
