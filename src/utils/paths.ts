import path from 'node:path';
import {mkdir} from 'node:fs/promises';

export function workspaceRoot(start = process.cwd()): string {
  return path.resolve(start);
}

export function resolveWorkspacePath(root: string, target: string): string {
  const resolved = path.resolve(root, target);
  const relative = path.relative(root, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(`Path escapes workspace: ${target}`);
  return resolved;
}

export function relativePath(root: string, target: string): string {
  return path.relative(root, target).replaceAll('\\', '/');
}

export async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, {recursive: true});
}
