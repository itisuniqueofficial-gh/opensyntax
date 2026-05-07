import chalk from 'chalk';
import prompts from 'prompts';
import type {PermissionRequest} from '../tools/types.js';

export async function promptApproval(request: PermissionRequest): Promise<boolean> {
  process.stdout.write(`\n${chalk.yellow('OpenSyntax needs permission')}\n\n`);
  if (request.action) process.stdout.write(`${chalk.bold('Action:')}\n${request.action}\n\n`);
  if (request.path) process.stdout.write(`${chalk.bold('Path:')}\n${request.path}\n\n`);
  process.stdout.write(`${chalk.bold('Reason:')}\n${request.reason}\n\n${chalk.bold('Risk:')} ${request.risk}\n`);
  if (request.confirmationText) {
    process.stdout.write(`\nType exactly:\n${request.confirmationText}\n`);
    const response = await prompts({type: 'text', name: 'value', message: 'Confirmation'});
    return response.value === request.confirmationText;
  }
  const response = await prompts({type: 'confirm', name: 'value', message: 'Approve?', initial: false});
  return response.value === true;
}
