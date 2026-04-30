import {chmod, mkdir, readFile, writeFile, access} from 'node:fs/promises';
import {constants} from 'node:fs';
import {homedir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {configSchema, migrateConfig, type OpenSyntaxConfig} from './schema.js';

export const configDir = join(homedir(), '.opensyntax');
export const configPath = join(configDir, 'config.json');

export async function loadConfig(): Promise<OpenSyntaxConfig | null> {
	try {
		const raw = await readFile(configPath, 'utf8');
		return migrateConfig(JSON.parse(raw));
	} catch {
		return null;
	}
}

export async function readConfigWithError(): Promise<{config: OpenSyntaxConfig | null; error: string | null}> {
	try {
		const raw = await readFile(configPath, 'utf8');
		return {config: migrateConfig(JSON.parse(raw)), error: null};
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return {config: null, error: null};
		}

		return {config: null, error: error instanceof Error ? error.message : 'Unable to read config'};
	}
}

export async function saveConfig(config: OpenSyntaxConfig): Promise<void> {
	const parsed = configSchema.parse(config);
	await mkdir(dirname(configPath), {recursive: true, mode: 0o700});
	await writeFile(configPath, `${JSON.stringify(parsed, null, 2)}\n`, {encoding: 'utf8', mode: 0o600});
	await chmod(configPath, 0o600).catch(() => undefined);
}

export async function canWriteConfigDir(): Promise<boolean> {
	try {
		await mkdir(configDir, {recursive: true, mode: 0o700});
		await access(configDir, constants.W_OK);
		return true;
	} catch {
		return false;
	}
}

export function isConfigInsideProject(cwd = process.cwd()): boolean {
	const normalizedConfig = resolve(configPath).toLowerCase();
	const normalizedCwd = resolve(cwd).toLowerCase();
	return normalizedConfig.startsWith(normalizedCwd);
}
