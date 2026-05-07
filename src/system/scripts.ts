import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {detectPackageManager, runScriptCommand} from './package-manager.js';

export type PackageScripts = {manager: string; scripts: Record<string, string>; commands: Record<string, string>};

export async function detectScripts(workspace: string): Promise<PackageScripts> {
  const packageJson = JSON.parse(await readFile(path.join(workspace, 'package.json'), 'utf8')) as {scripts?: Record<string, string>};
  const manager = await detectPackageManager(workspace);
  const scripts = packageJson.scripts ?? {};
  const commands = Object.fromEntries(Object.keys(scripts).map((script) => [script, runScriptCommand(manager, script)]));
  return {manager, scripts, commands};
}
