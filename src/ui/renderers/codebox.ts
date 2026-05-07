/**
 * Professional terminal codebox renderer.
 *
 * Renders syntax-highlighted code blocks with:
 * - Language label in the top border
 * - Line numbers
 * - Horizontal truncation for wide lines
 * - Diff highlighting (+ green, - red)
 * - Box-drawing characters with Unicode fallback
 */

import chalk from 'chalk';
import {highlight} from 'cli-highlight';

// ---------------------------------------------------------------------------
// Box characters — Unicode preferred, ASCII fallback
// ---------------------------------------------------------------------------

const BOX = {
  tl: '╭', tr: '╮',
  bl: '╰', br: '╯',
  h: '─', v: '│',
  sep: '┤'
};

// ---------------------------------------------------------------------------
// Terminal width
// ---------------------------------------------------------------------------

function termWidth(): number {
  return process.stdout.columns ?? 80;
}

// ---------------------------------------------------------------------------
// Main codebox renderer
// ---------------------------------------------------------------------------

export type CodeboxOptions = {
  language?: string;
  label?: string;       // e.g. file path shown in top border
  lineNumbers?: boolean;
  maxLines?: number;    // truncate after N lines
  isDiff?: boolean;
};

export function renderCodebox(code: string, options: CodeboxOptions = {}): string {
  const {
    language = 'text',
    label,
    lineNumbers = true,
    maxLines = 60,
    isDiff = language === 'diff' || language === 'patch'
  } = options;

  const width = Math.min(termWidth() - 2, 100);
  const lines = code.trimEnd().split('\n');
  const truncated = lines.length > maxLines;
  const displayLines = truncated ? lines.slice(0, maxLines) : lines;

  // Top border with label
  const topLabel = label ? ` ${label} ` : language !== 'text' ? ` ${language} ` : '';
  const topBorderLen = width - 2 - topLabel.length;
  const topLeft = Math.floor(topBorderLen / 2);
  const topRight = topBorderLen - topLeft;
  const topBorder = `${BOX.tl}${BOX.h.repeat(topLeft)}${topLabel.length ? chalk.bold.gray(topLabel) : ''}${BOX.h.repeat(topRight)}${BOX.tr}`;

  const bottomBorder = `${BOX.bl}${BOX.h.repeat(width - 2)}${BOX.br}`;

  const lineNumWidth = lineNumbers ? String(displayLines.length).length + 1 : 0;
  const codeWidth = width - 2 - (lineNumbers ? lineNumWidth + 3 : 2); // 2 for padding

  const renderedLines = displayLines.map((line, index) => {
    const lineNum = lineNumbers
      ? chalk.gray(String(index + 1).padStart(lineNumWidth)) + chalk.gray(' │ ')
      : '';

    // Truncate wide lines
    const stripped = stripAnsi(line);
    const displayLine = stripped.length > codeWidth
      ? line.slice(0, codeWidth - 1) + chalk.gray('…')
      : line;

    // Diff highlighting
    let coloredLine = displayLine;
    if (isDiff) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        coloredLine = chalk.green(displayLine);
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        coloredLine = chalk.red(displayLine);
      } else if (line.startsWith('@@')) {
        coloredLine = chalk.cyan(displayLine);
      } else {
        coloredLine = chalk.gray(displayLine);
      }
    } else if (language !== 'text') {
      try {
        coloredLine = highlight(line, {language, ignoreIllegals: true});
      } catch {
        coloredLine = displayLine;
      }
    }

    const padding = ' ';
    return `${chalk.gray(BOX.v)}${padding}${lineNum}${coloredLine}${chalk.gray(BOX.v)}`;
  });

  const parts = [
    chalk.gray(topBorder),
    ...renderedLines,
    truncated ? chalk.gray(`${BOX.v} ${chalk.italic(`... ${lines.length - maxLines} more lines`)}${' '.repeat(Math.max(0, width - 4 - String(lines.length - maxLines).length - 13))}${BOX.v}`) : null,
    chalk.gray(bottomBorder)
  ].filter(Boolean) as string[];

  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// Diff renderer (unified diff format)
// ---------------------------------------------------------------------------

export function renderDiff(diff: string, label?: string): string {
  return renderCodebox(diff, {language: 'diff', label, lineNumbers: false, isDiff: true});
}

// ---------------------------------------------------------------------------
// Inline code (single line)
// ---------------------------------------------------------------------------

export function renderInlineCode(code: string): string {
  return chalk.bgGray.white(` ${code} `);
}

// ---------------------------------------------------------------------------
// Strip ANSI escape codes for length calculation
// ---------------------------------------------------------------------------

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*m/g, '');
}
