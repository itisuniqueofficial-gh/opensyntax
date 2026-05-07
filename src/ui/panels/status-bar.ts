/**
 * Status bar — rendered at the bottom of every response.
 *
 * Format:
 *   OpenSyntax │ provider/model │ permission │ ses_xxx │ /workspace
 */

import chalk from 'chalk';
import path from 'node:path';
import {shortTitle} from '../../session/titles.js';

export type StatusBarOptions = {
  model: string;
  permission: string;
  sessionId: string;
  sessionTitle?: string;
  workspace: string;
};

export function renderStatusBar(opts: StatusBarOptions): string {
  const width = Math.min(process.stdout.columns ?? 80, 120);

  const parts = [
    chalk.bold.cyan('OpenSyntax'),
    chalk.gray('│'),
    chalk.cyan(opts.model),
    chalk.gray('│'),
    chalk.green(opts.permission),
    chalk.gray('│'),
    chalk.gray(opts.sessionId),
    chalk.gray('│'),
    chalk.gray(path.basename(opts.workspace) || opts.workspace)
  ];

  if (opts.sessionTitle && opts.sessionTitle !== 'New Chat') {
    parts.push(chalk.gray('│'), chalk.dim(shortTitle(opts.sessionTitle)));
  }

  const line = parts.join(' ');
  const stripped = line.replace(/\x1B\[[0-9;]*m/g, '');
  const padding = Math.max(0, width - stripped.length);

  return chalk.bgGray.white(' ') + line + ' '.repeat(padding);
}

export function printStatusBar(opts: StatusBarOptions): void {
  process.stdout.write('\n' + renderStatusBar(opts) + '\n');
}
