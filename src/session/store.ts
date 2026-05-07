import {readFile, writeFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import {configDir} from '../config/config.js';
import {ensureDir} from '../utils/paths.js';
import {createSession, type SessionRecord} from './history.js';

const sessionsDir = path.join(configDir, 'sessions');

export async function loadOrCreateSession(workspace: string, id?: string): Promise<SessionRecord> {
  await ensureDir(sessionsDir);
  if (id) return JSON.parse(await readFile(path.join(sessionsDir, `${id}.json`), 'utf8')) as SessionRecord;
  const existing = await latestSession(workspace);
  return existing ?? createSession(workspace);
}

export async function saveSession(session: SessionRecord): Promise<void> {
  session.updatedAt = new Date().toISOString();
  await ensureDir(sessionsDir);
  await writeFile(path.join(sessionsDir, `${session.id}.json`), `${JSON.stringify(session, null, 2)}\n`, 'utf8');
}

export async function listSessions(): Promise<string[]> {
  await ensureDir(sessionsDir);
  return (await readdir(sessionsDir)).filter((file) => file.endsWith('.json')).map((file) => file.replace(/\.json$/, ''));
}

async function latestSession(workspace: string): Promise<SessionRecord | undefined> {
  const files = await listSessions();
  const sessions = await Promise.all(files.map(async (id) => JSON.parse(await readFile(path.join(sessionsDir, `${id}.json`), 'utf8')) as SessionRecord));
  return sessions.filter((session) => session.workspace === workspace).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}
