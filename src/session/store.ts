import {readFile, writeFile, readdir, unlink} from 'node:fs/promises';
import path from 'node:path';
import {configDir} from '../config/config.js';
import {ensureDir} from '../utils/paths.js';
import {newSessionId} from './id.js';
import {generateTaskTitle, generateTitle, shouldReplaceTitle} from './titles.js';
import type {Session, MessageRecord, ToolCallRecord} from './types.js';
// Keep backward-compat re-export for old code that imports SessionRecord
import type {SessionRecord} from './history.js';
export type {SessionRecord};

export const sessionsDir = path.join(configDir, 'sessions');

// ---------------------------------------------------------------------------
// Session CRUD
// ---------------------------------------------------------------------------

export function createNewSession(workspace: string, providerId = '', modelId = ''): Session {
  const now = new Date().toISOString();
  return {
    id: newSessionId(),
    title: 'New Chat',
    workspace,
    providerId,
    modelId,
    createdAt: now,
    updatedAt: now,
    status: 'active',
    messages: [],
    todos: [],
    toolCalls: [],
    edits: [],
    plan: []
  };
}

export async function saveSession(session: Session): Promise<void>;
export async function saveSession(session: SessionRecord): Promise<void>;
export async function saveSession(session: Session | SessionRecord): Promise<void> {
  (session as any).updatedAt = new Date().toISOString();
  await ensureDir(sessionsDir);
  await writeFile(
    path.join(sessionsDir, `${session.id}.json`),
    `${JSON.stringify(session, null, 2)}\n`,
    'utf8'
  );
}

export async function loadSession(id: string): Promise<Session | undefined> {
  try {
    const raw = await readFile(path.join(sessionsDir, `${id}.json`), 'utf8');
    return JSON.parse(raw) as Session;
  } catch {
    return undefined;
  }
}

export async function listAllSessions(): Promise<Session[]> {
  await ensureDir(sessionsDir);
  const files = (await readdir(sessionsDir)).filter((f) => f.endsWith('.json'));
  const sessions: Session[] = [];
  for (const file of files) {
    try {
      const raw = await readFile(path.join(sessionsDir, file), 'utf8');
      sessions.push(JSON.parse(raw) as Session);
    } catch {
      // Skip corrupted files
    }
  }
  return sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listSessions(): Promise<string[]> {
  await ensureDir(sessionsDir);
  return (await readdir(sessionsDir))
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''));
}

export async function deleteSession(id: string): Promise<boolean> {
  try {
    await unlink(path.join(sessionsDir, `${id}.json`));
    return true;
  } catch {
    return false;
  }
}

export async function renameSession(id: string, title: string): Promise<boolean> {
  const session = await loadSession(id);
  if (!session) return false;
  session.title = title;
  await saveSession(session);
  return true;
}

// ---------------------------------------------------------------------------
// Backward-compatible loadOrCreateSession (used by old CLI code)
// ---------------------------------------------------------------------------

export async function loadOrCreateSession(
  workspace: string,
  id?: string
): Promise<Session> {
  await ensureDir(sessionsDir);
  if (id) {
    const existing = await loadSession(id);
    if (existing) return existing;
  }
  const latest = await latestSessionForWorkspace(workspace);
  return latest ?? createNewSession(workspace);
}

async function latestSessionForWorkspace(workspace: string): Promise<Session | undefined> {
  const all = await listAllSessions();
  return all.find((s) => s.workspace === workspace && s.status === 'active');
}

// ---------------------------------------------------------------------------
// Session title auto-update
// ---------------------------------------------------------------------------

export function maybeSetTitle(session: Session, firstUserMessage: string): void {
  if (session.title === 'New Chat' && firstUserMessage.trim()) {
    session.title = generateTitle(firstUserMessage);
  }
}

export function maybeSetTaskTitle(session: Session, userMessage: string): void {
  if (shouldReplaceTitle(session.title) && userMessage.trim()) {
    session.title = generateTaskTitle(userMessage);
  }
}
