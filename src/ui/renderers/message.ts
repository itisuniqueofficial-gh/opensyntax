/**
 * Message renderer — renders different message types with consistent styling.
 *
 * Types:
 * - user message
 * - assistant message (Markdown)
 * - tool call start/end/error
 * - error panel
 * - warning panel
 * - success line
 * - info panel
 */

import chalk, {type ChalkInstance} from 'chalk';
import {renderMarkdown} from './markdown.js';
import {getUiConfig} from '../ui-config.js';

// ---------------------------------------------------------------------------
// Box helpers
// ---------------------------------------------------------------------------

function box(title: string, body: string, color: ChalkInstance): string {
  const cfg = getUiConfig();
  const width = Math.min(process.stdout.columns ?? 80, 80);
  const inner = width - 4;

  if (!cfg.unicodeBoxes) {
    // ASCII fallback
    const top = `+--- ${title} ${'─'.repeat(Math.max(0, inner - title.length - 5))}+`;
    const lines = body.split('\n').map((l) => `| ${l.slice(0, inner).padEnd(inner)} |`);
    return [color(top), ...lines.map((l) => color(l)), color('+' + '-'.repeat(width - 2) + '+')].join('\n');
  }

  const labelPad = Math.max(0, inner - title.length - 2);
  const top = `╭─ ${title} ${'─'.repeat(labelPad)}╮`;
  const lines = body.split('\n').map((l) => {
    const stripped = l.replace(/\x1B\[[0-9;]*m/g, '');
    const padded = stripped.length > inner ? l.slice(0, inner) : l + ' '.repeat(inner - stripped.length);
    return `│ ${padded} │`;
  });
  const bottom = `╰${'─'.repeat(width - 2)}╯`;

  return [color(top), ...lines, color(bottom)].join('\n');
}

// ---------------------------------------------------------------------------
// Public renderers
// ---------------------------------------------------------------------------

/** Render a user message line. */
export function renderUserMessage(text: string): string {
  return `\n${chalk.bold.green('you')} ${chalk.gray('›')} ${text}\n`;
}

/** Render an assistant message with full Markdown. */
export function renderAssistantMessage(text: string): string {
  if (!text.trim()) return '';
  return renderMarkdown(text);
}

/** Render a tool call start line. */
export function renderToolStart(name: string, input?: unknown): string {
  const inputStr = input
    ? chalk.gray(` ${JSON.stringify(input).slice(0, 80)}`)
    : '';
  return `${chalk.gray('▸')} ${chalk.yellow('tool')} ${chalk.cyan(name)}${inputStr}\n`;
}

/** Render a tool call completion line. */
export function renderToolEnd(name: string, ok: boolean, durationMs?: number): string {
  const icon = ok ? chalk.green('✓') : chalk.red('✗');
  const dur = durationMs ? chalk.gray(` ${durationMs}ms`) : '';
  return `${icon} ${chalk.yellow('tool')} ${chalk.cyan(name)}${dur}\n`;
}

/** Render an error panel. */
export function renderErrorPanel(message: string): string {
  return '\n' + box('Error', message, chalk.red) + '\n';
}

/** Render a warning panel. */
export function renderWarningPanel(message: string): string {
  return '\n' + box('Warning', message, chalk.yellow) + '\n';
}

/** Render a success line. */
export function renderSuccess(message: string): string {
  return `${chalk.green('✓')} ${chalk.green(message)}\n`;
}

/** Render an info panel. */
export function renderInfoPanel(title: string, body: string): string {
  return '\n' + box(title, body, chalk.cyan) + '\n';
}
