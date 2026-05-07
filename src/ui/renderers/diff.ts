/**
 * Diff renderer — re-exports renderDiff from codebox for convenience,
 * and adds a standalone unified-diff renderer with file headers and
 * hunk headers.
 */

import chalk from 'chalk';
import {renderCodebox} from './codebox.js';
import {getUiConfig} from '../ui-config.js';

/** Render a unified diff string with full file/hunk header support. */
export function renderUnifiedDiff(diff: string, label?: string): string {
  if (!diff.trim()) return chalk.gray('(no diff)');
  const cfg = getUiConfig();
  if (!cfg.codeBox) {
    // Plain coloured output without box
    return diff.split('\n').map(colorDiffLine).join('\n');
  }
  return renderCodebox(diff, {language: 'diff', label, lineNumbers: false, isDiff: true});
}

/** Colour a single diff line. */
export function colorDiffLine(line: string): string {
  if (line.startsWith('+++') || line.startsWith('---')) return chalk.bold.white(line);
  if (line.startsWith('+')) return chalk.green(line);
  if (line.startsWith('-')) return chalk.red(line);
  if (line.startsWith('@@')) return chalk.cyan(line);
  if (line.startsWith('diff ') || line.startsWith('index ')) return chalk.bold.gray(line);
  return chalk.gray(line);
}

// Re-export for convenience
export {renderDiff} from './codebox.js';
