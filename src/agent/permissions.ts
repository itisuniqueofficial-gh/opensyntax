import prompts from 'prompts';
import chalk from 'chalk';
import type {PermissionRequest} from '../tools/types.js';

export async function askPermission(request: PermissionRequest): Promise<boolean> {
  process.stdout.write(`\n${chalk.yellow('Permission required')} ${request.action}\n${chalk.gray(request.reason)}\nRisk: ${request.risk}\n`);
  const response = await prompts({type: 'confirm', name: 'value', message: 'Approve this action?', initial: false});
  return response.value === true;
}

export function canWrite(permission: string): boolean {
  return permission !== 'read-only';
}
