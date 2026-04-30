import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import {dirname, join} from 'node:path';
import {configSchema, type OpenSyntaxConfig} from './schema.js';

export const configPath = join(homedir(), '.opensyntax', 'config.json');

export async function loadConfig(): Promise<OpenSyntaxConfig | null> {
	try {
		const raw = await readFile(configPath, 'utf8');
		return configSchema.parse(JSON.parse(raw));
	} catch {
		return null;
	}
}

export async function readConfigWithError(): Promise<{config: OpenSyntaxConfig | null; error: string | null}> {
	try {
		const raw = await readFile(configPath, 'utf8');
		return {config: configSchema.parse(JSON.parse(raw)), error: null};
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return {config: null, error: null};
		}

		return {config: null, error: error instanceof Error ? error.message : 'Unable to read config'};
	}
}

export async function saveConfig(config: OpenSyntaxConfig): Promise<void> {
	const parsed = configSchema.parse(config);
	await mkdir(dirname(configPath), {recursive: true});
	await writeFile(configPath, `${JSON.stringify(parsed, null, 2)}\n`, {encoding: 'utf8', mode: 0o600});
}
