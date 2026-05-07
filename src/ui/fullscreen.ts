import chalk from 'chalk';
import type {Session} from '../session/types.js';
import {renderPlan} from '../agent/planner.js';

export type FullscreenState = {
  workspace: string;
  model: string;
  permission: string;
  session: Session;
  activity?: string;
  output?: string;
};

export function renderFullscreen(state: FullscreenState): string {
  const width = Math.max(60, Math.min(process.stdout.columns ?? 100, 140));
  const rule = '─'.repeat(width);
  const header = `${chalk.bold.cyan('OpenSyntax')} ${chalk.gray('autonomous coding agent')} ${chalk.dim(state.model)} ${chalk.green(state.permission)}`;
  const left = [
    chalk.bold('Workspace'),
    state.workspace,
    '',
    chalk.bold('Tasks'),
    renderPlan(state.session.plan) || 'No active tasks.',
    '',
    chalk.bold('Activity'),
    state.activity ?? 'Idle'
  ].join('\n');
  const right = [chalk.bold('Output'), state.output?.trim() || 'No output yet.'].join('\n');
  return [header, rule, twoColumn(left, right, width), rule, chalk.dim(`Session ${state.session.id}`)].join('\n');
}

function twoColumn(left: string, right: string, width: number): string {
  const gap = 3;
  const leftWidth = Math.max(24, Math.floor((width - gap) * 0.34));
  const rightWidth = width - leftWidth - gap;
  const leftLines = wrap(left, leftWidth);
  const rightLines = wrap(right, rightWidth);
  const rows = Math.max(leftLines.length, rightLines.length);
  const output: string[] = [];
  for (let index = 0; index < rows; index++) {
    output.push(`${pad(leftLines[index] ?? '', leftWidth)}${' '.repeat(gap)}${rightLines[index] ?? ''}`);
  }
  return output.join('\n');
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

function visibleLength(text: string): number {
  return text.replace(/\u001b\[[0-9;]*m/g, '').length;
}
