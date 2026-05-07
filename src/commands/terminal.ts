import {detectOS} from '../system/os.js';
import {detectShell} from '../system/shell.js';
import {detectEnvironment, maskSecrets} from '../system/environment.js';
import {classifyCommand} from '../system/command-risk.js';
import {detectPackageManager, installCommand} from '../system/package-manager.js';
import {terminalSummary, commandRiskSummary} from '../tools/shell.js';

export async function renderTerminal(workspace: string): Promise<string> {
  const manager = await detectPackageManager(workspace).catch(() => 'npm' as const);
  return `${await terminalSummary(workspace)}\nPackage manager: ${manager}\nInstall command: ${installCommand(manager)}`;
}

export async function renderOS(): Promise<string> {
  const info = await detectOS();
  return JSON.stringify(info, null, 2);
}

export function renderShell(): string {
  return `Shell: ${detectShell()}`;
}

export async function renderEnv(): Promise<string> {
  const env = await detectEnvironment();
  return maskSecrets(JSON.stringify(env, null, 2));
}

export function renderPath(): string {
  return (process.env.PATH ?? '').split(process.platform === 'win32' ? ';' : ':').join('\n');
}

export function renderCommandRisk(command: string): string {
  return command ? commandRiskSummary(command) : 'Usage: /command <command>';
}
