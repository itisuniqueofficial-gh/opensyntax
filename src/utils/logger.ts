import chalk from 'chalk';

export const logger = {
  info: (message: string) => process.stdout.write(`${chalk.cyan('i')} ${message}\n`),
  success: (message: string) => process.stdout.write(`${chalk.green('✓')} ${message}\n`),
  warn: (message: string) => process.stderr.write(`${chalk.yellow('!')} ${message}\n`),
  error: (message: string) => process.stderr.write(`${chalk.red('x')} ${message}\n`),
  status: (message: string) => process.stdout.write(`${chalk.gray('·')} ${chalk.gray(message)}\n`)
};
