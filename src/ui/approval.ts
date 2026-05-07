import chalk from 'chalk';
import prompts from 'prompts';
import type {PermissionRequest} from '../tools/types.js';

export async function promptApproval(request: PermissionRequest): Promise<boolean> {
  process.stdout.write(`\n${chalk.yellow('Permission Required')}\n`);
  if (request.tool) process.stdout.write(`Tool: ${request.tool}\n`);
  if (request.path) process.stdout.write(`Path: ${request.path}\n`);
  process.stdout.write(`Reason: ${request.reason}\nRisk: ${request.risk}\n`);
  if (request.confirmationText) {
    process.stdout.write(`\nType exactly:\n${request.confirmationText}\n`);
    const response = await prompts({type: 'text', name: 'value', message: 'Confirmation'});
    return response.value === request.confirmationText;
  }
  const response = await prompts({type: 'confirm', name: 'value', message: 'Approve?', initial: false});
  return response.value === true;
}
