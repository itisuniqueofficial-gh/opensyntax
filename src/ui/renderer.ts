import chalk from 'chalk';
import {renderMarkdown} from './markdown.js';

export function header(workspace: string, model: string, permission: string): void {
  process.stdout.write(`${chalk.bold('OpenSyntax')} ${chalk.gray('AI Coding Agent')}\n`);
  process.stdout.write(`${chalk.green('✓')} Model: ${chalk.cyan(model)}\n`);
  process.stdout.write(`${chalk.green('✓')} Shell: ${chalk.green(permission)}\n`);
  process.stdout.write(`${chalk.green('✓')} Workspace: ${workspace}\n`);
  process.stdout.write(chalk.gray('Ready. Type /help for commands, /repo for workspace intelligence, /auto for autonomous mode, Ctrl+C or /exit to quit.\n\n'));
}

export function assistantChunk(text: string): void {
  process.stdout.write(renderMarkdown(text));
}

export function panel(title: string, body: string): void {
  process.stdout.write(`\n${chalk.bold.cyan(title)}\n${body}\n`);
}

export function status(message: string): void {
  process.stdout.write(`${chalk.gray('·')} ${chalk.gray(message)}\n`);
}
