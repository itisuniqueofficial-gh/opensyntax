import chalk from 'chalk';
import {maskSecrets} from '../system/environment.js';

export function commandStart(command: string, cwd: string): void {
  process.stdout.write(`${chalk.cyan('▸ command')} ${command}\n${chalk.gray(`cwd: ${cwd}`)}\n\n`);
}

export function commandOutput(text: string): void {
  process.stdout.write(maskSecrets(text));
}

export function commandEnd(command: string, ok: boolean, exitCode: number | null, durationMs: number): void {
  const seconds = (durationMs / 1000).toFixed(1);
  if (ok) process.stdout.write(`\n${chalk.green('✓')} completed in ${seconds}s\n`);
  else process.stdout.write(`\n${chalk.red('✗')} command failed: ${command}\nexit code: ${exitCode ?? 'unknown'}\n`);
}

export function summarizeCommandFailure(stderr: string, stdout = ''): string {
  const text = `${stderr}\n${stdout}`;
  if (/command not found|not recognized as an internal or external command/i.test(text)) return 'Command not found. Check whether the tool is installed and available on PATH.';
  if (/permission denied|access is denied/i.test(text)) return 'Permission denied. Re-run only with explicit approval if elevated access is required.';
  if (/Cannot find module|module not found/i.test(text)) return 'A dependency appears to be missing. Installing dependencies may fix it.';
  if (/Unsupported engine|requires node|node version/i.test(text)) return 'Node.js version may not satisfy the project engine requirements.';
  if (/ts\(\d+\)|error TS\d+/i.test(text)) return 'TypeScript reported compile errors. Inspect the diagnostics before editing.';
  return 'Command failed. Inspect stdout/stderr and retry only if the next step is safe.';
}
