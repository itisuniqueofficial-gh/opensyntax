/**
 * Professional terminal codebox renderer.
 *
 * Features:
 * - Syntax highlighting via cli-highlight
 * - Line numbers
 * - Language / file-path label in top border
 * - Width-aware truncation
 * - Diff highlighting (+ green, - red, @@ cyan)
 * - Unicode box-drawing with ASCII fallback
 * - Respects NO_COLOR and UiConfig
 */

import chalk from 'chalk';
import {highlight} from 'cli-highlight';
import {getUiConfig} from '../ui-config.js';

// ---------------------------------------------------------------------------
// Box character sets
// ---------------------------------------------------------------------------

const UNICODE_BOX = {tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│'};
const ASCII_BOX   = {tl: '+', tr: '+', bl: '+', br: '+', h: '-', v: '|'};

function box() {
  return getUiConfig().unicodeBoxes ? UNICODE_BOX : ASCII_BOX;
}

// ---------------------------------------------------------------------------
// Terminal width
// ---------------------------------------------------------------------------

function termWidth(): number {
  return process.stdout.columns ?? 80;
}

// ---------------------------------------------------------------------------
// Strip ANSI for length calculation
// ---------------------------------------------------------------------------

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*m/g, '');
}

// ---------------------------------------------------------------------------
// Main codebox renderer
// ---------------------------------------------------------------------------

export type CodeboxOptions = {
  language?: string;
  label?: string;
  lineNumbers?: boolean;
  maxLines?: number;
  isDiff?: boolean;
};

export function renderCodebox(code: string, options: CodeboxOptions = {}): string {
  const cfg = getUiConfig();
  const B = box();

  const {
    language = 'text',
    label,
    lineNumbers = cfg.lineNumbers,
    maxLines = 80,
    isDiff = language === 'diff' || language === 'patch'
  } = options;

  const width = Math.min(termWidth() - 2, 100);
  const lines = code.trimEnd().split('\n');
  const truncated = lines.length > maxLines;
  const displayLines = truncated ? lines.slice(0, maxLines) : lines;

  // Top border with label
  const topLabel = label ? ` ${label} ` : (language && language !== 'text') ? ` ${language} ` : '';
  const topBorderFill = width - 2 - stripAnsi(topLabel).length;
  const topLeft = Math.floor(topBorderFill / 2);
  const topRight = topBorderFill - topLeft;
  const topBorder =
    B.tl +
    B.h.repeat(Math.max(0, topLeft)) +
    (topLabel ? chalk.bold.gray(topLabel) : '') +
    B.h.repeat(Math.max(0, topRight)) +
    B.tr;

  const bottomBorder = B.bl + B.h.repeat(width - 2) + B.br;

  const lineNumWidth = lineNumbers ? String(displayLines.length).length + 1 : 0;
  const codeWidth = width - 2 - (lineNumbers ? lineNumWidth + 3 : 2);

  const renderedLines = displayLines.map((line, index) => {
    const lineNum = lineNumbers
      ? chalk.gray(String(index + 1).padStart(lineNumWidth)) + chalk.gray(' │ ')
      : '';

    // Truncate wide lines
    const stripped = stripAnsi(line);
    const truncLine = stripped.length > codeWidth
      ? line.slice(0, codeWidth - 1) + chalk.gray('…')
      : line;

    let coloredLine = truncLine;

    if (isDiff) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        coloredLine = chalk.green(truncLine);
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        coloredLine = chalk.red(truncLine);
      } else if (line.startsWith('@@')) {
        coloredLine = chalk.cyan(truncLine);
      } else if (line.startsWith('+++') || line.startsWith('---')) {
        coloredLine = chalk.bold.white(truncLine);
      } else {
        coloredLine = chalk.gray(truncLine);
      }
    } else if (cfg.syntaxHighlighting && language !== 'text') {
      try {
        coloredLine = highlight(line, {language, ignoreIllegals: true});
      } catch {
        coloredLine = truncLine;
      }
    }

    return `${chalk.gray(B.v)} ${lineNum}${coloredLine}${chalk.gray(B.v)}`;
  });

  const truncLine = truncated
    ? chalk.gray(`${B.v} ${chalk.italic(`... ${lines.length - maxLines} more lines`)}${' '.repeat(Math.max(0, width - 4 - String(lines.length - maxLines).length - 13))}${B.v}`)
    : null;

  return [
    chalk.gray(topBorder),
    ...renderedLines,
    ...(truncLine ? [truncLine] : []),
    chalk.gray(bottomBorder)
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Diff renderer
// ---------------------------------------------------------------------------

export function renderDiff(diff: string, label?: string): string {
  return renderCodebox(diff, {language: 'diff', label, lineNumbers: false, isDiff: true});
}

// ---------------------------------------------------------------------------
// Inline code
// ---------------------------------------------------------------------------

export function renderInlineCode(code: string): string {
  return chalk.yellow(code);
}
