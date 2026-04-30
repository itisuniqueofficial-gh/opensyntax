import React, {useEffect, useState} from 'react';
import {Box, Text, useApp, useStdout} from 'ink';
import {saveConfig} from '../config/config-store.js';
import type {OpenSyntaxConfig} from '../config/schema.js';
import {ChatScreen} from './ChatScreen.js';
import {SetupModal} from './SetupModal.js';

type AppProps = {
	initialConfig: OpenSyntaxConfig | null;
	setupOnly?: boolean;
};

export function App({initialConfig, setupOnly = false}: AppProps) {
	const {exit} = useApp();
	const {stdout} = useStdout();
	const [config, setConfig] = useState<OpenSyntaxConfig | null>(initialConfig);
	const [error, setError] = useState<string | null>(null);
	const width = stdout.columns || 100;
	const height = Math.max(stdout.rows || 30, 20);

	useEffect(() => {
		process.stdout.write('\x1b[?1049h\x1b[?25l\x1b[2J\x1b[H');

		return () => {
			process.stdout.write('\x1b[?25h\x1b[?1049l');
		};
	}, []);

	async function handleSetupComplete(nextConfig: OpenSyntaxConfig) {
		try {
			await saveConfig(nextConfig);
			setConfig(nextConfig);
			setError(null);

			if (setupOnly) {
				exit();
			}
		} catch (saveError) {
			setError(saveError instanceof Error ? saveError.message : 'Unable to save config');
			throw saveError;
		}
	}

	return (
		<Box width={width} height={height} flexDirection="column">
			{config && !setupOnly ? <ChatScreen config={config} onConfigChange={setConfig} /> : null}
			{(!config || setupOnly) ? <SetupModal initialConfig={config} onComplete={handleSetupComplete} onCancel={setupOnly ? exit : undefined} /> : null}
			{error ? (
				<Box position="absolute" width="100%" height="100%" justifyContent="center" alignItems="flex-end">
					<Text color="red">{error}</Text>
				</Box>
			) : null}
		</Box>
	);
}
