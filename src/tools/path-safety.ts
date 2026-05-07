import path from 'node:path';
import {readFile, stat} from 'node:fs/promises';
import ignore from 'ignore';
import type {RuleContext} from '../rules/types.js';
import {relativePath} from '../utils/paths.js';

export type SafePath = {
  input: string;
  absolute: string;
  relative: string;
  exists: boolean;
  isFile: boolean;
  isDirectory: boolean;
  mtimeMs?: number;
  size?: number;
};

const SYSTEM_FOLDERS = new Set(['windows', 'program files', 'program files (x86)', 'programdata', 'system32', 'syswow64', 'etc', 'bin', 'sbin', 'usr', 'var', 'private']);

export async function resolveSafePath(workspace: string, target: string, rules?: RuleContext, options: {allowMissing?: boolean; checkIgnored?: boolean; allowRoot?: boolean} = {}): Promise<SafePath> {
  if (!target || target.includes('\0')) throw new Error('Invalid empty or NUL path');
  const normalizedWorkspace = path.resolve(workspace);
  const normalizedTarget = target.replaceAll('\\', path.sep);
  const absolute = path.resolve(normalizedWorkspace, normalizedTarget);
  const relative = relativePath(normalizedWorkspace, absolute);
  if (!relative || relative === '.') {
    if (!options.allowRoot) enforceHardBlocks(normalizedWorkspace, absolute, relative);
    return await inspectPath(target, absolute, relative, options.allowMissing ?? true);
  }
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(`Path escapes workspace: ${target}`);
  if (normalizedTarget.split(/[\\/]+/).includes('..')) throw new Error(`Path traversal is not allowed: ${target}`);
  const safe = await inspectPath(target, absolute, relative, options.allowMissing ?? true);
  enforceHardBlocks(normalizedWorkspace, safe.absolute, safe.relative);
  if (options.checkIgnored ?? true) await enforceIgnoreRules(normalizedWorkspace, safe.relative, rules);
  enforceWorkspaceRules(safe.relative, rules);
  return safe;
}

export function enforceHardBlocks(workspace: string, absolute: string, relative: string): void {
  const normalizedRelative = relative.replaceAll('\\', '/').toLowerCase();
  const normalizedAbsolute = absolute.replaceAll('\\', '/').toLowerCase();
  const normalizedWorkspace = path.resolve(workspace).replaceAll('\\', '/').replace(/\/$/, '').toLowerCase();
  const home = (process.env.USERPROFILE ?? process.env.HOME ?? '').replaceAll('\\', '/').replace(/\/$/, '').toLowerCase();
  if (!normalizedRelative || normalizedRelative === '.') throw new Error('Refusing to operate on the workspace root');
  if (home && normalizedAbsolute === home) throw new Error('Refusing to operate on the home directory');
  if (normalizedAbsolute === normalizedWorkspace) throw new Error('Refusing to operate on the workspace root');
  if (normalizedRelative === '.git' || normalizedRelative.startsWith('.git/')) throw new Error('Path is protected: .git');
  const parts = normalizedAbsolute.split('/').filter(Boolean);
  if (parts.some((part) => SYSTEM_FOLDERS.has(part))) throw new Error(`Refusing to operate on system folder: ${absolute}`);
}

export function riskForPath(relative: string): {requiresApproval: boolean; reason?: string; risk: 'low' | 'medium' | 'high'} {
  const normalized = relative.replaceAll('\\', '/');
  const base = path.posix.basename(normalized).toLowerCase();
  if (/^\.env(\..*)?$/i.test(base)) return {requiresApproval: true, reason: 'Modifying .env files can expose secrets', risk: 'high'};
  if (/secret|credential|private[-_]?key|token/i.test(normalized)) return {requiresApproval: true, reason: 'Path name suggests sensitive credentials', risk: 'high'};
  if (['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lockb'].includes(base)) return {requiresApproval: true, reason: 'Modifying lockfiles can affect reproducible installs', risk: 'medium'};
  if (normalized === 'node_modules' || normalized.startsWith('node_modules/')) return {requiresApproval: true, reason: 'node_modules is large and generated', risk: 'high'};
  return {requiresApproval: false, risk: 'low'};
}

export async function pathExists(absolute: string): Promise<boolean> {
  try { await stat(absolute); return true; } catch { return false; }
}

async function inspectPath(input: string, absolute: string, relative: string, allowMissing: boolean): Promise<SafePath> {
  try {
    const info = await stat(absolute);
    return {input, absolute, relative: relative.replaceAll('\\', '/'), exists: true, isFile: info.isFile(), isDirectory: info.isDirectory(), mtimeMs: info.mtimeMs, size: info.size};
  } catch (error) {
    if (allowMissing) return {input, absolute, relative: relative.replaceAll('\\', '/'), exists: false, isFile: false, isDirectory: false};
    throw error;
  }
}

async function enforceIgnoreRules(workspace: string, relative: string, rules?: RuleContext): Promise<void> {
  const normalized = relative.replaceAll('\\', '/');
  if (!normalized || normalized === '.') return;
  const ig = ignore().add(['.git/', 'node_modules/']);
  try { ig.add(await readFile(path.join(workspace, '.gitignore'), 'utf8')); } catch {}
  if (rules?.ignoredFiles?.length) ig.add(rules.ignoredFiles);
  if (ig.ignores(normalized)) throw new Error(`Path is ignored or protected: ${normalized}`);
}

function enforceWorkspaceRules(relative: string, rules?: RuleContext): void {
  const normalized = relative.replaceAll('\\', '/').toLowerCase();
  for (const item of rules?.forbiddenPaths ?? []) {
    const forbidden = item.replaceAll('\\', '/').replace(/^\/+/, '').toLowerCase();
    if (!forbidden) continue;
    if (normalized === forbidden.replace(/\/$/, '') || normalized.startsWith(forbidden.endsWith('/') ? forbidden : `${forbidden}/`)) throw new Error(`Workspace rules prohibit editing ${forbidden}`);
  }
}
