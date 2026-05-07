/**
 * Terminal theme — colour palette and box-drawing helpers.
 */

import chalk from 'chalk';

export const theme = {
  // Borders
  border:       chalk.gray,
  borderActive: chalk.cyan,

  // Text roles
  primary:   chalk.white,
  secondary: chalk.gray,
  accent:    chalk.cyan,
  success:   chalk.green,
  warning:   chalk.yellow,
  error:     chalk.red,
  muted:     chalk.dim,

  // Roles
  user:      chalk.green,
  assistant: chalk.cyan,
  tool:      chalk.yellow,
  system:    chalk.gray,

  // Labels
  label: (text: string) => chalk.bold.gray(text),
  badge: (text: string) => chalk.bgGray.white(` ${text} `),

  // Status icons
  ok:   chalk.green('✓'),
  fail: chalk.red('✗'),
  dot:  chalk.gray('·'),
  arr:  chalk.gray('›'),
};

/** Horizontal rule using terminal width. */
export function hr(char = '─', width?: number): string {
  const w = width ?? Math.min(process.stdout.columns ?? 80, 100);
  return chalk.gray(char.repeat(w));
}

/** Pad a string to a fixed width, truncating with ellipsis if needed. */
export function pad(text: string, width: number): string {
  if (text.length > width) return `${text.slice(0, width - 1)}…`;
  return text.padEnd(width);
}
