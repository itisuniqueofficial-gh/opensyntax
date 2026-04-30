import chalk from 'chalk';

export const logger = {
	info(message: string): void {
		process.stdout.write(`${chalk.cyan('info')} ${message}\n`);
	},
	error(message: string): void {
		process.stderr.write(`${chalk.red('error')} ${message}\n`);
	},
	success(message: string): void {
		process.stdout.write(`${chalk.green('success')} ${message}\n`);
	}
};
