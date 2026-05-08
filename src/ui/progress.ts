import chalk from 'chalk';

export function progressOk(message: string): void {
  process.stdout.write(`${chalk.green('✓')} ${message}\n`);
}

export function progressWarn(message: string): void {
  process.stdout.write(`${chalk.yellow('!')} ${message}\n`);
}

export function progressInfo(message: string): void {
  process.stdout.write(`${chalk.gray('·')} ${message}\n`);
}
