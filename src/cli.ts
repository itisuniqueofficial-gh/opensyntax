#!/usr/bin/env node
import React from 'react';
import {Command} from 'commander';
import {render} from 'ink';
import chalk from 'chalk';
import {readConfigWithError, loadConfig, configPath} from './config/config-store.js';
import {providerLabels} from './config/schema.js';
import {createProvider} from './providers/openai-compatible.js';
import {App} from './ui/App.js';
import {logger} from './utils/logger.js';

const packageVersion = '0.1.0';

const program = new Command()
	.name('opensyntax')
	.description('OpenSyntax terminal AI chatbot')
	.version(packageVersion, '-v, --version')
	.action(async () => {
		await runApp(false);
	});

program
	.command('ask')
	.description('Ask one prompt using the saved provider config')
	.argument('<prompt...>', 'prompt to send')
	.action(async (promptParts: string[]) => {
		const config = await loadConfig();
		if (!config) {
			logger.error(`No config found. Run ${chalk.cyan('opensyntax')} first to set up a provider.`);
			process.exitCode = 1;
			return;
		}

		try {
			const provider = createProvider(config);
			const result = await provider.chat([
				{role: 'system', content: 'You are OpenSyntax, a concise terminal AI assistant.'},
				{role: 'user', content: promptParts.join(' ')}
			]);
			process.stdout.write(`${result.content}\n`);
		} catch (error) {
			logger.error(error instanceof Error ? error.message : 'Request failed');
			process.exitCode = 1;
		}
	});

program
	.command('config')
	.description('Open provider setup in the terminal UI')
	.action(async () => {
		await runApp(true);
	});

program
	.command('doctor')
	.description('Check local OpenSyntax configuration')
	.action(async () => {
		const {config, error} = await readConfigWithError();

		if (error) {
			logger.error(`Config is invalid: ${error}`);
			logger.info(`Config path: ${configPath}`);
			process.exitCode = 1;
			return;
		}

		if (!config) {
			logger.error('No config found. Run opensyntax to create one inside the UI.');
			logger.info(`Expected path: ${configPath}`);
			process.exitCode = 1;
			return;
		}

		logger.success('Config is valid');
		logger.info(`Path: ${configPath}`);
		logger.info(`Provider: ${providerLabels[config.provider]}`);
		logger.info(`Base URL: ${config.baseUrl}`);
		logger.info(`Model: ${config.model}`);
	});

program
	.command('version')
	.description('Print OpenSyntax version')
	.action(() => {
		process.stdout.write(`OpenSyntax ${packageVersion}\n`);
	});

async function runApp(setupOnly: boolean) {
	const initialConfig = await loadConfig();
	const app = render(React.createElement(App, {initialConfig, setupOnly}), {
		exitOnCtrlC: true,
		patchConsole: false
	});
	await app.waitUntilExit();
}

await program.parseAsync(process.argv);
