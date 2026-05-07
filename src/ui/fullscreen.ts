import chalk from 'chalk';
import type {Session} from '../session/types.js';
import {renderPlan} from '../agent/planner.js';

export type FullscreenState = {
  workspace: string;
  model: string;
  permission: string;
  session: Session;
  activity?: string;
  input?: string;
  output?: string;
  git?: string;
  provider?: string;
};

export function renderFullscreen(state: FullscreenState): string {
  const width = Math.max(60, Math.min(process.stdout.columns ?? 100, 140));
  const compact = width < 86;
  const chat = [chalk.bold('Chat'), state.output?.trim() || chalk.dim('No messages yet.')].join('\n');
  const context = [
    chalk.bold('Context'),
    `Session: ${state.session.title || state.session.id}`,
    `Provider: ${state.provider ?? state.model.split('/')[0]}`,
    `Model: ${state.model}`,
    `Permission: ${state.permission}`,
    '',
    chalk.bold('Todo'),
    renderPlan(state.session.plan) || 'No active tasks.',
    '',
    chalk.bold('Git'),
    state.git?.trim() || 'Not inspected.',
    '',
    chalk.bold('Workspace'),
    state.workspace
  ].join('\n');
  const input = state.input?.trim() || 'Type a request or /help';
  const status = `OpenSyntax | ${state.model} | ${state.permission} | ${state.workspace} | ${state.session.id}`;
  if (compact) {
    return [box('Chat', chat, width), box('Context', context, width), box('Input', input, width), chalk.dim(truncate(status, width))].join('\n');
  }
  return [splitBox('Chat', chat, 'Context', context, width), box('Input', input, width), chalk.dim(truncate(status, width))].join('\n');
}

function box(title: string, body: string, width: number): string {
  const inner = width - 4;
  const top = `┌ ${title} ${'─'.repeat(Math.max(0, inner - visibleLength(title) - 1))}┐`;
  const bottom = `└${'─'.repeat(width - 2)}┘`;
  const rows = wrap(body, inner).map((line) => `│ ${pad(truncate(line, inner), inner)} │`);
  return [top, ...rows, bottom].join('\n');
}

function splitBox(leftTitle: string, left: string, rightTitle: string, right: string, width: number): string {
  const gap = 1;
  const leftWidth = Math.max(42, Math.floor(width * 0.64));
  const rightWidth = width - leftWidth - gap;
  const leftInner = leftWidth - 4;
  const rightInner = rightWidth - 4;
  const leftLines = wrap(left, leftInner);
  const rightLines = wrap(right, rightInner);
  const rows = Math.max(leftLines.length, rightLines.length, 8);
  const top = `┌ ${leftTitle} ${'─'.repeat(Math.max(0, leftWidth - visibleLength(leftTitle) - 4))}┬ ${rightTitle} ${'─'.repeat(Math.max(0, rightWidth - visibleLength(rightTitle) - 4))}┐`;
  const bottom = `└${'─'.repeat(leftWidth - 1)}┴${'─'.repeat(rightWidth - 2)}┘`;
  const body: string[] = [];
  for (let index = 0; index < rows; index++) {
    body.push(`│ ${pad(truncate(leftLines[index] ?? '', leftInner), leftInner)} │ ${pad(truncate(rightLines[index] ?? '', rightInner), rightInner)} │`);
  }
  return [top, ...body, bottom].join('\n');
}

function wrap(text: string, width: number): string[] {
  const lines: string[] = [];
  for (const raw of text.split('\n')) {
    if (raw.length <= width) { lines.push(raw); continue; }
    let remaining = raw;
    while (remaining.length > width) {
      lines.push(remaining.slice(0, width));
      remaining = remaining.slice(width);
    }
    lines.push(remaining);
  }
  return lines;
}

function pad(text: string, width: number): string {
  return text + ' '.repeat(Math.max(0, width - visibleLength(text)));
}

function truncate(text: string, width: number): string {
  return visibleLength(text) <= width ? text : `${text.slice(0, Math.max(0, width - 1))}…`;
}

function visibleLength(text: string): number {
  return text.replace(/\u001b\[[0-9;]*m/g, '').length;
}
