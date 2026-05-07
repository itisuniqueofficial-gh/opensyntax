/**
 * Terminal theme — colour palette and box-drawing helpers.
 * Respects NO_COLOR environment variable.
 */

import chalk, {type ChalkInstance} from 'chalk';

// Detect no-color mode
const noColor = process.env.NO_COLOR !== undefined;

// Helper: apply chalk only when color is enabled
const c = (fn: ChalkInstance) => noColor ? ((s: string) => s) : fn;

export const theme = {
  // Borders
  border:       c(chalk.gray),
  borderActive: c(chalk.cyan),

  // Text roles
  primary:   c(chalk.white),
  secondary: c(chalk.gray),
  accent:    c(chalk.cyan),
  success:   c(chalk.green),
  warning:   c(chalk.yellow),
  error:     c(chalk.red),
  muted:     c(chalk.dim),

  // Message roles
  user:      c(chalk.green),
  assistant: c(chalk.cyan),
  tool:      c(chalk.yellow),
  system:    c(chalk.gray),

  // Labels
  label: (text: string) => noColor ? text : chalk.bold.gray(text),
  badge: (text: string) => noColor ? `[${text}]` : chalk.bgGray.white(` ${text} `),

  // Status icons
  ok:   noColor ? '[ok]'   : chalk.green('✓'),
  fail: noColor ? '[fail]' : chalk.red('✗'),
  dot:  noColor ? '.'      : chalk.gray('·'),
  arr:  noColor ? '>'      : chalk.gray('›'),
};

/** Horizontal rule using terminal width. */
export function hr(char = '─', width?: number): string {
  const w = width ?? Math.min(process.stdout.columns ?? 80, 100);
  const line = char.repeat(w);
  return noColor ? line : chalk.gray(line);
}

/** Pad a string to a fixed width, truncating with ellipsis if needed. */
export function pad(text: string, width: number): string {
  // Strip ANSI for length calculation
  // eslint-disable-next-line no-control-regex
  const stripped = text.replace(/\x1B\[[0-9;]*m/g, '');
  if (stripped.length > width) return text.slice(0, width - 1) + '…';
  return text + ' '.repeat(width - stripped.length);
}
