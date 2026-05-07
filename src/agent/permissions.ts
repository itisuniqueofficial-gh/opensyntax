import prompts from 'prompts';
import chalk from 'chalk';
import type {PermissionRequest} from '../tools/types.js';
import {promptApproval} from '../ui/approval.js';

export async function askPermission(request: PermissionRequest): Promise<boolean> {
  if (request.tool || request.path || request.confirmationText) return promptApproval(request);
  process.stdout.write(`\n${chalk.yellow('Permission required')} ${request.action}\n${chalk.gray(request.reason)}\nRisk: ${request.risk}\n`);
  const response = await prompts({type: 'confirm', name: 'value', message: 'Approve this action?', initial: false});
  return response.value === true;
}

export function canWrite(permission: string): boolean {
  return permission !== 'read-only';
}
