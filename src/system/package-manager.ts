import {access, readFile} from 'node:fs/promises';
import path from 'node:path';

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

export async function detectPackageManager(workspace: string): Promise<PackageManager> {
  if (await exists(path.join(workspace, 'pnpm-lock.yaml'))) return 'pnpm';
  if (await exists(path.join(workspace, 'yarn.lock'))) return 'yarn';
  if (await exists(path.join(workspace, 'bun.lockb')) || await exists(path.join(workspace, 'bun.lock'))) return 'bun';
  return 'npm';
}

export function installCommand(manager: PackageManager): string {
  return manager === 'npm' ? 'npm install' : `${manager} install`;
}

export function runScriptCommand(manager: PackageManager, script: string): string {
  if (manager === 'npm') return `npm run ${script}`;
  if (manager === 'pnpm') return `pnpm ${script}`;
  if (manager === 'yarn') return `yarn ${script}`;
  return `bun run ${script}`;
}

async function exists(file: string): Promise<boolean> {
  try { await access(file); return true; } catch { return false; }
}
