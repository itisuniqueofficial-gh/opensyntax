/**
 * Session management commands: /new, /sessions, /resume, /history, /delete-session, /rename-session
 */

import chalk from 'chalk';
import prompts from 'prompts';
import {
  createNewSession,
  listAllSessions,
  loadSession,
  deleteSession,
  renameSession,
  saveSession
} from './store.js';
import {relativeTime} from './id.js';
import {printPanel, printSuccess, printError, printWarning} from '../ui/layout.js';
import {noSessionsState} from '../ui/empty-state.js';
import type {Session} from './types.js';
import type {AgentLoop} from '../agent/loop.js';

// ---------------------------------------------------------------------------
// /new — start a fresh session
// ---------------------------------------------------------------------------

export async function cmdNew(loop: AgentLoop): Promise<Session> {
  const old = loop.session as Session;
  // Save current session before switching
  await saveSession(old);

  const fresh = createNewSession(old.workspace, old.providerId ?? '', old.modelId ?? '');
  loop.resetSession(fresh);
  printSuccess(`New chat started: ${chalk.cyan(fresh.id)}`);
  return fresh;
}

// ---------------------------------------------------------------------------
// /sessions — list and optionally resume
// ---------------------------------------------------------------------------

export async function cmdSessions(loop: AgentLoop): Promise<void> {
  const sessions = await listAllSessions();
  if (!sessions.length) {
    printPanel('Sessions', noSessionsState());
    return;
  }

  const lines: string[] = [];
  sessions.slice(0, 20).forEach((s, index) => {
    const active = s.id === (loop.session as Session).id ? chalk.green(' (active)') : '';
    const msgCount = s.messages.filter((m) => m.role !== 'system').length;
    lines.push(`${chalk.bold(`${index + 1}.`)} ${chalk.cyan(s.id)}${active}`);
    lines.push(`   ${chalk.gray('Title:')}    ${s.title}`);
    lines.push(`   ${chalk.gray('Workspace:')} ${s.workspace}`);
    lines.push(`   ${chalk.gray('Messages:')} ${msgCount}  ${chalk.gray('Updated:')} ${relativeTime(s.id)}`);
    lines.push('');
  });

  if (sessions.length > 20) {
    lines.push(chalk.gray(`... and ${sessions.length - 20} more`));
  }

  printPanel('Sessions', lines.join('\n'));
}

// ---------------------------------------------------------------------------
// /resume <id> — restore a previous session
// ---------------------------------------------------------------------------

export async function cmdResume(loop: AgentLoop, sessionId: string): Promise<boolean> {
  if (!sessionId) {
    // Interactive picker
    const sessions = await listAllSessions();
    if (!sessions.length) { printPanel('Resume', noSessionsState()); return false; }

    const choices = sessions.slice(0, 15).map((s) => ({
      title: `${s.title} ${chalk.gray(s.id)} ${chalk.dim(relativeTime(s.id))}`,
      value: s.id
    }));

    const response = await prompts({type: 'select', name: 'value', message: 'Resume session', choices});
    if (!response.value) return false;
    sessionId = response.value as string;
  }

  const session = await loadSession(sessionId);
  if (!session) {
    printError(`Session not found: ${sessionId}`);
    return false;
  }

  // Save current before switching
  await saveSession(loop.session as Session);
  loop.resetSession(session);
  printSuccess(`Resumed: ${chalk.cyan(session.id)} — ${session.title}`);
  return true;
}

// ---------------------------------------------------------------------------
// /history — show current session message history
// ---------------------------------------------------------------------------

export function cmdHistory(loop: AgentLoop): void {
  const session = loop.session as Session;
  const lines: string[] = [];

  for (const msg of session.messages) {
    if (msg.role === 'system') continue;
    const roleColor = msg.role === 'user' ? chalk.green
      : msg.role === 'assistant' ? chalk.cyan
      : chalk.yellow;
    const preview = msg.content.slice(0, 80).replace(/\n/g, ' ');
    lines.push(`${chalk.gray(msg.id)} ${roleColor(msg.role)}: ${preview}`);
  }

  for (const tc of session.toolCalls.slice(-10)) {
    const icon = tc.ok ? chalk.green('✓') : chalk.red('✗');
    lines.push(`${chalk.gray(tc.id)} ${icon} ${chalk.yellow(tc.name)}`);
  }

  printPanel('History', lines.join('\n') || 'No messages yet.');
}

// ---------------------------------------------------------------------------
// /delete-session <id>
// ---------------------------------------------------------------------------

export async function cmdDeleteSession(sessionId: string, loop: AgentLoop): Promise<void> {
  if (!sessionId) { printError('Usage: /delete-session <session-id>'); return; }
  if (sessionId === (loop.session as Session).id) {
    printWarning('Cannot delete the active session. Start a /new session first.');
    return;
  }
  const confirm = (await prompts({
    type: 'confirm',
    name: 'value',
    message: `Delete session ${sessionId}?`,
    initial: false
  })).value === true;
  if (!confirm) return;
  const ok = await deleteSession(sessionId);
  ok ? printSuccess(`Deleted: ${sessionId}`) : printError(`Session not found: ${sessionId}`);
}

// ---------------------------------------------------------------------------
// /rename-session <title>
// ---------------------------------------------------------------------------

export async function cmdRenameSession(loop: AgentLoop, title: string): Promise<void> {
  const session = loop.session as Session;
  if (!title) {
    const response = await prompts({type: 'text', name: 'value', message: 'New title', initial: session.title});
    title = response.value as string;
  }
  if (!title) return;
  session.title = title;
  await saveSession(session);
  printSuccess(`Session renamed: ${title}`);
}
