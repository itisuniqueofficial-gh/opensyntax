import {appendFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

export type AuditEntry = {
  tool: string;
  workspace: string;
  path?: string;
  action: string;
  ok: boolean;
  changed?: boolean;
  message: string;
  error?: string;
  risk?: string;
  at?: string;
};

export const auditDir = path.join(os.homedir(), '.opensyntax', 'audit');
export const auditLogPath = path.join(auditDir, 'file-operations.jsonl');

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  await mkdir(auditDir, {recursive: true});
  await appendFile(auditLogPath, `${JSON.stringify({...entry, at: entry.at ?? new Date().toISOString()})}\n`, {encoding: 'utf8', mode: 0o600});
}
