/**
 * Terminal layout helpers.
 *
 * Provides the header banner, section dividers, and message formatting
 * that give OpenSyntax its professional coding-agent look.
 */

import chalk from 'chalk';
import {renderMarkdown} from './renderers/markdown.js';
import {renderCodebox, renderDiff} from './renderers/codebox.js';
import {theme, hr} from './theme.js';
import type {Session} from '../session/types.js';
import {renderStatusBar} from './panels/status-bar.js';

// ---------------------------------------------------------------------------
// Header banner
// ---------------------------------------------------------------------------

export function printHeader(opts: {
  workspace: string;
  model: string;
  permission: string;
  sessionId: string;
  sessionTitle?: string;
}): void {
  const w = Math.min(process.stdout.columns ?? 80, 100);
  process.stdout.write('\n');
  process.stdout.write(chalk.bold.cyan('OpenSyntax') + chalk.gray(' AI Coding Agent') + '\n');
  process.stdout.write(hr('─', w) + '\n');
  process.stdout.write(`${theme.ok} Model:      ${chalk.cyan(opts.model)}\n`);
  process.stdout.write(`${theme.ok} Permission: ${chalk.green(opts.permission)}\n`);
  process.stdout.write(`${theme.ok} Workspace:  ${chalk.gray(opts.workspace)}\n`);
  process.stdout.write(`${theme.ok} Session:    ${chalk.gray(opts.sessionId)}\n`);
  if (opts.sessionTitle && opts.sessionTitle !== 'New Chat') {
    process.stdout.write(`${theme.ok} Title:      ${chalk.dim(opts.sessionTitle)}\n`);
  }
  process.stdout.write(hr('─', w) + '\n');
  process.stdout.write(chalk.gray('Type /help for commands · /new for a fresh chat · /sessions to browse history\n\n'));
}

// ---------------------------------------------------------------------------
// Message rendering
// ---------------------------------------------------------------------------

export function printUserMessage(text: string): void {
  process.stdout.write(`\n${chalk.bold.green('you')} ${chalk.gray('›')} ${text}\n`);
}

export function printAssistantChunk(text: string): void {
  process.stdout.write(renderMarkdown(text));
}

export function printAssistantEnd(): void {
  process.stdout.write('\n');
}

// ---------------------------------------------------------------------------
// Tool execution rendering
// ---------------------------------------------------------------------------

export function printToolStart(name: string, input?: unknown): void {
  const inputStr = input ? chalk.gray(` ${JSON.stringify(input).slice(0, 60)}`) : '';
  process.stdout.write(`${chalk.gray('▸')} ${chalk.yellow('tool')} ${chalk.cyan(name)}${inputStr}\n`);
}

export function printToolEnd(name: string, ok: boolean, durationMs?: number): void {
  const icon = ok ? theme.ok : theme.fail;
  const dur = durationMs ? chalk.gray(` ${durationMs}ms`) : '';
  process.stdout.write(`${icon} ${chalk.yellow('tool')} ${chalk.cyan(name)}${dur}\n`);
}

export function printToolError(name: string, output: string): void {
  process.stdout.write(`${theme.fail} ${chalk.yellow(name)} ${chalk.red(output.slice(0, 200))}\n`);
}

// ---------------------------------------------------------------------------
// Panel / section rendering
// ---------------------------------------------------------------------------

export function printPanel(title: string, body: string): void {
  process.stdout.write(`\n${chalk.bold.cyan(title)}\n${body}\n`);
}

export function printStatus(message: string): void {
  process.stdout.write(`${chalk.gray('·')} ${chalk.gray(message)}\n`);
}

export function printWarning(message: string): void {
  process.stdout.write(`${chalk.yellow('!')} ${chalk.yellow(message)}\n`);
}

export function printError(message: string): void {
  process.stdout.write(`${chalk.red('✗')} ${chalk.red(message)}\n`);
}

export function printSuccess(message: string): void {
  process.stdout.write(`${chalk.green('✓')} ${chalk.green(message)}\n`);
}

// ---------------------------------------------------------------------------
// Status bar (printed after each response)
// ---------------------------------------------------------------------------

export function printSessionStatusBar(session: Session, model: string, permission: string): void {
  process.stdout.write('\n' + renderStatusBar({
    model,
    permission,
    sessionId: session.id,
    sessionTitle: session.title,
    workspace: session.workspace
  }) + '\n');
}
