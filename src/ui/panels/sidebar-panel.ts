/**
 * Right sidebar panel — shows session context, todos, and workspace info.
 * Rendered as a fixed-width column on the right side of the terminal.
 */

import chalk from 'chalk';
import type {Session, TodoItem} from '../../session/types.js';
import {relativeTime} from '../../session/id.js';
import {theme, pad} from '../theme.js';

const SIDEBAR_WIDTH = 32;

export function renderSidebar(session: Session, model: string): string {
  const lines: string[] = [];
  const w = SIDEBAR_WIDTH;
  const border = chalk.gray('│');

  const row = (text: string) => `${border} ${pad(text, w - 2)} ${border}`;
  const divider = () => chalk.gray(`├${'─'.repeat(w)}┤`);
  const header = (text: string) => `${border} ${chalk.bold.gray(pad(text, w - 2))} ${border}`;

  // Top border
  lines.push(chalk.gray(`╭${'─'.repeat(w)}╮`));

  // Session info
  lines.push(header('Context'));
  lines.push(row(chalk.cyan(pad(model, w - 2))));
  lines.push(row(chalk.gray(session.id)));
  lines.push(row(chalk.gray(`Updated ${relativeTime(session.id)}`)));

  // Message count
  const msgCount = session.messages.filter((m) => m.role !== 'system').length;
  lines.push(row(chalk.gray(`${msgCount} messages`)));

  lines.push(divider());

  // Todo list
  lines.push(header('Todo'));
  const todos = session.todos.slice(0, 8);
  if (!todos.length) {
    lines.push(row(chalk.dim('No tasks yet')));
  } else {
    for (const todo of todos) {
      const icon = todo.state === 'completed' ? chalk.green('[✓]')
        : todo.state === 'in_progress' ? chalk.yellow('[>]')
        : todo.state === 'failed' ? chalk.red('[!]')
        : chalk.gray('[ ]');
      const text = pad(todo.content, w - 6);
      lines.push(row(`${icon} ${chalk.gray(text)}`));
    }
    if (session.todos.length > 8) {
      lines.push(row(chalk.dim(`... ${session.todos.length - 8} more`)));
    }
  }

  lines.push(divider());

  // Recent tool calls
  const recentTools = session.toolCalls.slice(-3);
  if (recentTools.length) {
    lines.push(header('Recent Tools'));
    for (const tc of recentTools) {
      const icon = tc.ok ? chalk.green('✓') : chalk.red('✗');
      lines.push(row(`${icon} ${chalk.gray(pad(tc.name, w - 4))}`));
    }
    lines.push(divider());
  }

  // Workspace
  lines.push(header('Workspace'));
  lines.push(row(chalk.gray(pad(session.workspace, w - 2))));

  // Bottom border
  lines.push(chalk.gray(`╰${'─'.repeat(w)}╯`));

  return lines.join('\n');
}

/** Print the sidebar to stdout (right-aligned using cursor positioning). */
export function printSidebar(session: Session, model: string): void {
  const sidebar = renderSidebar(session, model);
  const termW = process.stdout.columns ?? 80;
  const sidebarW = SIDEBAR_WIDTH + 4;
  const col = Math.max(0, termW - sidebarW);

  const lines = sidebar.split('\n');
  for (const line of lines) {
    process.stdout.write(`\x1B[${col}G${line}\n`);
  }
}
