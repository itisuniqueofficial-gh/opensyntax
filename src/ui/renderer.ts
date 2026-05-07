import chalk from 'chalk';
import {renderMarkdown} from './markdown.js';

export function header(workspace: string, model: string, permission: string): void {
  process.stdout.write(`${chalk.bold('OpenSyntax')} ${chalk.gray('|')} ${chalk.cyan(model)} ${chalk.gray('|')} ${chalk.green(permission)} ${chalk.gray('|')} ${workspace}\n`);
  process.stdout.write(chalk.gray('Type /help for commands, /providers to switch auth, Ctrl+C or /exit to quit.\n\n'));
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
