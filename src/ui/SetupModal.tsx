import React, {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import {ZodError} from 'zod';
import {createConfig, providerDefaults, providerLabels, type OpenSyntaxConfig, type ProviderId} from '../config/schema.js';

const providers: ProviderId[] = ['nvidia', 'openai-compatible', 'openrouter', 'custom'];

type SetupModalProps = {
	onComplete: (config: OpenSyntaxConfig) => Promise<void> | void;
	onCancel?: () => void;
	initialConfig?: OpenSyntaxConfig | null;
};

type Field = 'provider' | 'apiKey' | 'baseUrl' | 'model';

const fields: Field[] = ['provider', 'apiKey', 'baseUrl', 'model'];

export function SetupModal({onComplete, onCancel, initialConfig}: SetupModalProps) {
	const [activeIndex, setActiveIndex] = useState(0);
	const [providerIndex, setProviderIndex] = useState(() => Math.max(0, providers.indexOf(initialConfig?.provider ?? 'nvidia')));
	const [apiKey, setApiKey] = useState(initialConfig?.apiKey ?? '');
	const [baseUrl, setBaseUrl] = useState(initialConfig?.baseUrl ?? providerDefaults[providers[providerIndex]].baseUrl);
	const [model, setModel] = useState(initialConfig?.model ?? providerDefaults[providers[providerIndex]].model);
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const activeField = fields[activeIndex];
	const provider = providers[providerIndex];

	function setProvider(nextIndex: number) {
		const normalized = (nextIndex + providers.length) % providers.length;
		setProviderIndex(normalized);
		setBaseUrl(providerDefaults[providers[normalized]].baseUrl);
		setModel(providerDefaults[providers[normalized]].model);
	}

	async function submit() {
		try {
			setSaving(true);
			setError(null);
			await onComplete(createConfig({provider, apiKey, baseUrl, model}));
		} catch (submitError) {
			if (submitError instanceof ZodError) {
				setError(submitError.issues[0]?.message ?? 'Invalid config');
			} else {
				setError(submitError instanceof Error ? submitError.message : 'Unable to save config');
			}
			setSaving(false);
		}
	}

	useInput((input, key) => {
		if (saving) {
			return;
		}

		if (key.escape && onCancel) {
			onCancel();
			return;
		}

		if (key.tab || key.downArrow) {
			setActiveIndex(current => (current + 1) % fields.length);
			return;
		}

		if (key.upArrow) {
			setActiveIndex(current => (current - 1 + fields.length) % fields.length);
			return;
		}

		if (key.return) {
			if (activeIndex === fields.length - 1) {
				void submit();
			} else {
				setActiveIndex(current => current + 1);
			}
			return;
		}

		if (activeField === 'provider') {
			if (key.leftArrow) {
				setProvider(providerIndex - 1);
			}

			if (key.rightArrow) {
				setProvider(providerIndex + 1);
			}

			return;
		}

		if (key.backspace || key.delete) {
			if (activeField === 'apiKey') {
				setApiKey(current => current.slice(0, -1));
			}

			if (activeField === 'baseUrl') {
				setBaseUrl(current => current.slice(0, -1));
			}

			if (activeField === 'model') {
				setModel(current => current.slice(0, -1));
			}

			return;
		}

		if (!input || key.ctrl || key.meta) {
			return;
		}

		if (activeField === 'apiKey') {
			setApiKey(current => current + input);
		}

		if (activeField === 'baseUrl') {
			setBaseUrl(current => current + input);
		}

		if (activeField === 'model') {
			setModel(current => current + input);
		}
	});

	return (
		<Box position="absolute" width="100%" height="100%" justifyContent="center" alignItems="center">
			<Box borderStyle="double" borderColor="cyan" width={70} paddingX={2} paddingY={1} flexDirection="column">
				<Text bold color="cyan">Setup OpenSyntax Provider</Text>
				<Text color="gray">Use arrows/tab to move. Enter saves from the model field.</Text>

				<FieldRow label="Select provider" active={activeField === 'provider'} value={`< ${providerLabels[provider]} >`} />
				<FieldRow label="API key" active={activeField === 'apiKey'} value={apiKey ? '*'.repeat(Math.min(apiKey.length, 32)) : 'required'} muted={!apiKey} />
				<FieldRow label="Base URL" active={activeField === 'baseUrl'} value={baseUrl} />
				<FieldRow label="Model name" active={activeField === 'model'} value={model} />

				{error ? <Text color="red">{error}</Text> : null}
				<Text color="gray">Config saves to ~/.opensyntax/config.json. No .env file is used.</Text>
				<Text color={saving ? 'yellow' : 'green'}>{saving ? 'Saving...' : 'Ready to save'}</Text>
			</Box>
		</Box>
	);
}

function FieldRow({label, active, value, muted = false}: {label: string; active: boolean; value: string; muted?: boolean}) {
	return (
		<Box marginTop={1}>
			<Text color={active ? 'cyan' : 'gray'}>{active ? '>' : ' '} {label}: </Text>
			<Text color={muted ? 'gray' : 'white'}>{value}</Text>
		</Box>
	);
}
