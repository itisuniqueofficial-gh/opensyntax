import {readFile, stat} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import ignore from 'ignore';
import {configDir} from '../config/config.js';
import {parseRuleFile} from './parser.js';
import {mergeRules} from './merger.js';
import {getCachedRules, setCachedRules} from './cache.js';
import {emptyRuleContext, type RuleContext, type RuleFile} from './types.js';

const RULE_NAMES = ['OPENSYNTAX.md', path.join('.opensyntax', 'OPENSYNTAX.md')];

export async function loadWorkspaceRules(cwd = process.cwd()): Promise<RuleContext> {
  const candidates = await findRuleCandidates(cwd);
  const key = candidates.map((item) => `${item.path}:${item.mtimeMs}`).join('|');
  const cached = getCachedRules(key);
  if (cached) return cached;
  const files: RuleFile[] = [];
  for (const candidate of candidates) {
    const raw = await readFile(candidate.path, 'utf8');
    files.push(parseRuleFile({...candidate, raw}));
  }
  return setCachedRules(key, mergeRules(files));
}

export async function loadWorkspaceRulesSafe(cwd = process.cwd(), onError?: (error: unknown) => void): Promise<RuleContext> {
  try {
    return await loadWorkspaceRules(cwd);
  } catch (error) {
    onError?.(error);
    return {...emptyRuleContext, loadedAt: new Date().toISOString()};
  }
}

export async function findRuleCandidates(cwd: string): Promise<Array<{path: string; scope: 'global' | 'workspace'; depth: number; mtimeMs: number}>> {
  const ignores = await loadOpenSyntaxIgnore(cwd);
  const dirs = ancestorDirs(cwd);
  const candidates: Array<{path: string; scope: 'global' | 'workspace'; depth: number; mtimeMs: number}> = [];
  const globalPath = path.join(configDir, 'OPENSYNTAX.md');
  await pushIfExists(candidates, globalPath, 'global', 0);
  const homePath = path.join(os.homedir(), '.opensyntax', 'OPENSYNTAX.md');
  if (homePath !== globalPath) await pushIfExists(candidates, homePath, 'global', 1);
  for (let index = 0; index < dirs.length; index++) {
    const dir = dirs[index];
    if (ignores.ignores(dir)) continue;
    for (const name of RULE_NAMES) await pushIfExists(candidates, path.join(dir, name), 'workspace', 10 + index);
  }
  return uniqueByPath(candidates).sort((a, b) => a.depth - b.depth);
}

async function pushIfExists(target: Array<{path: string; scope: 'global' | 'workspace'; depth: number; mtimeMs: number}>, file: string, scope: 'global' | 'workspace', depth: number): Promise<void> {
  try {
    const info = await stat(file);
    if (info.isFile()) target.push({path: file, scope, depth, mtimeMs: info.mtimeMs});
  } catch {}
}

function ancestorDirs(cwd: string): string[] {
  const resolved = path.resolve(cwd);
  const dirs: string[] = [];
  let current = path.parse(resolved).root;
  for (const segment of path.relative(current, resolved).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    dirs.push(current);
  }
  return dirs;
}

async function loadOpenSyntaxIgnore(cwd: string): Promise<{ignores(target: string): boolean}> {
  const matchers: Array<{base: string; ignores(path: string): boolean}> = [];
  for (const dir of ancestorDirs(cwd)) {
    const ig = ignore().add(['node_modules', 'dist', 'build', 'coverage', '.next', '.cache']);
    try { ig.add(await readFile(path.join(dir, '.opensyntaxignore'), 'utf8')); } catch {}
    matchers.push({base: dir, ignores: (target) => ig.ignores(target)});
  }
  return {
    ignores(target: string): boolean {
      return matchers.some((matcher) => {
        const ignorePath = toIgnorePath(matcher.base, target);
        return ignorePath ? matcher.ignores(ignorePath) : false;
      });
    }
  };
}

export function toIgnorePath(workspaceRoot: string, filePath: string): string | null {
  const pathApi = isWindowsPath(workspaceRoot) || isWindowsPath(filePath) ? path.win32 : path;
  const relative = pathApi.relative(workspaceRoot, filePath).trim();
  if (!relative) return null;
  if (relative === '..' || relative.startsWith(`..${pathApi.sep}`) || pathApi.isAbsolute(relative)) return null;
  return relative.split(pathApi.sep).join('/');
}

function isWindowsPath(value: string): boolean {
  return /^[a-zA-Z]:[\\/]/.test(value) || value.includes('\\');
}

function uniqueByPath<T extends {path: string}>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = path.resolve(item.path).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
