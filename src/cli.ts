#!/usr/bin/env node
import React from 'react';
import {Command} from 'commander';
import {render} from 'ink';
import chalk from 'chalk';
import {access, rm} from 'node:fs/promises';
import {constants} from 'node:fs';
import {readConfigWithError, loadConfig, configPath, canWriteConfigDir, isConfigInsideProject} from './config/config-store.js';
import {createConfig, providerLabels, type ProviderId} from './config/schema.js';
import {maskSecret} from './config/mask-secret.js';
import {createProvider} from './providers/openai-compatible.js';
import {getProviderDefinition, isProviderSupported, providerIds} from './providers/registry.js';
import {App} from './ui/App.js';
import {logger} from './utils/logger.js';

const packageVersion = '0.2.0';

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
	.option('--provider <provider>', `override provider (${providerIds.join(', ')})`)
	.option('--model <model>', 'override model')
	.option('--base-url <url>', 'override OpenAI-compatible base URL')
	.option('--no-stream', 'disable streaming for this request')
	.option('--json', 'ask for JSON-only output')
	.option('--markdown', 'ask for Markdown output')
	.action(async (promptParts: string[], options: {provider?: string; model?: string; baseUrl?: string; stream?: boolean; json?: boolean; markdown?: boolean}) => {
		const saved = await loadConfig();
		if (!saved && !options.provider) {
			logger.error(`No config found. Run ${chalk.cyan('opensyntax')} first to set up a provider.`);
			process.exitCode = 1;
			return;
		}

		const providerId = (options.provider ?? saved?.provider) as ProviderId;
		if (!isProviderSupported(providerId)) {
			logger.error(`Unsupported provider: ${options.provider}`);
			process.exitCode = 1;
			return;
		}

		const definition = getProviderDefinition(providerId);
		const config = createConfig({
			provider: providerId,
			apiKey: saved?.apiKey ?? '',
			baseUrl: options.baseUrl ?? saved?.baseUrl ?? definition.baseUrl,
			model: options.model ?? saved?.model ?? definition.defaultModel,
			streaming: options.stream ?? saved?.streaming ?? false
		});
		const prompt = promptParts.join(' ');
		const outputMode = options.json ? 'Return valid JSON only. Do not wrap it in Markdown.' : options.markdown ? 'Format the answer as clean Markdown.' : 'Answer clearly and concisely.';

		try {
			const provider = createProvider(config);
			const result = await provider.chat({
				messages: [
					{role: 'system', content: `You are OpenSyntax. ${outputMode}`},
					{role: 'user', content: prompt}
				],
				stream: false
			});
			process.stdout.write(`${result.content}\n`);
		} catch (error) {
			logger.error(error instanceof Error ? error.message : 'Request failed');
			process.exitCode = 1;
		}
	});

program
	.command('config')
	.description('View, edit, reset, or test OpenSyntax config')
	.option('--view', 'view current masked config')
	.option('--reset', 'delete local config')
	.option('--test', 'test provider health')
	.action(async (options: {view?: boolean; reset?: boolean; test?: boolean}) => {
		if (!options.view && !options.reset && !options.test) {
			await runApp(true);
			return;
		}

		if (options.reset) {
			await rm(configPath, {force: true});
			logger.success('Config reset');
			return;
		}

		const config = await loadConfig();
		if (!config) {
			logger.error('No config found. Run opensyntax config to create one.');
			process.exitCode = 1;
			return;
		}

		if (options.view) {
			logger.info(`Path: ${configPath}`);
			logger.info(`Provider: ${providerLabels[config.provider]}`);
			logger.info(`Base URL: ${config.baseUrl}`);
			logger.info(`Model: ${config.model}`);
			logger.info(`Streaming: ${config.streaming ? 'on' : 'off'}`);
			logger.info(`API key: ${maskSecret(config.apiKey)}`);
		}

		if (options.test) {
			const result = await createProvider(config).health();
			(result.ok ? logger.success : logger.error)(`Provider test: ${result.message}`);
			if (!result.ok) process.exitCode = 1;
		}
	});

program
	.command('doctor')
	.description('Check local OpenSyntax installation and provider configuration')
	.action(async () => {
		const {config, error} = await readConfigWithError();
		const nodeMajor = Number(process.versions.node.split('.')[0]);
		logger.info(`Node: ${process.version} ${nodeMajor >= 18 ? chalk.green('ok') : chalk.red('requires >=18')}`);
		logger.info(`OpenSyntax: ${packageVersion}`);
		logger.info(`Config path: ${configPath}`);
		logger.info(`Config directory writable: ${(await canWriteConfigDir()) ? 'yes' : 'no'}`);
		logger.info(`Config inside project warning: ${isConfigInsideProject() ? 'yes' : 'no'}`);

		if (error) {
			logger.error(`Config is invalid: ${error}`);
			process.exitCode = 1;
			return;
		}

		if (!config) {
			logger.error('No config found. Run opensyntax to create one inside the UI.');
			process.exitCode = 1;
			return;
		}

		const definition = getProviderDefinition(config.provider);
		logger.info(`Provider: ${definition.name}`);
		logger.info(`API key: ${definition.requiresApiKey ? maskSecret(config.apiKey) : 'not required'}`);
		logger.info(`Base URL valid: ${isValidUrl(config.baseUrl) ? 'yes' : 'no'}`);
		logger.info(`Model set: ${config.model ? 'yes' : 'no'}`);

		try {
			await access(configPath, constants.R_OK | constants.W_OK);
			logger.info('Config permissions: readable/writable by current user');
		} catch {
			logger.error('Config permissions: unable to read/write config file');
		}

		const health = await createProvider(config).health();
		(health.ok ? logger.success : logger.error)(`API test: ${health.message}${health.responseTimeMs ? ` (${health.responseTimeMs}ms)` : ''}`);
		if (!health.ok) process.exitCode = 1;
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
		exitOnCtrlC: false,
		patchConsole: false
	});
	await app.waitUntilExit();
}

function isValidUrl(value: string): boolean {
	try {
		new URL(value);
		return true;
	} catch {
		return false;
	}
}

await program.parseAsync(process.argv);
