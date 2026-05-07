import {readFile, stat} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import ignore from 'ignore';
import {configDir} from '../config/config.js';
import {parseRuleFile} from './parser.js';
import {mergeRules} from './merger.js';
import {getCachedRules, setCachedRules} from './cache.js';
import type {RuleContext, RuleFile} from './types.js';

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
    const relativeDir = relativeFromCwd(cwd, dir);
    if (relativeDir && ignores.ignores(relativeDir)) continue;
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

async function loadOpenSyntaxIgnore(cwd: string) {
  const ig = ignore().add(['node_modules', 'dist', 'build', 'coverage', '.next', '.cache']);
  for (const dir of ancestorDirs(cwd)) {
    try { ig.add(await readFile(path.join(dir, '.opensyntaxignore'), 'utf8')); } catch {}
  }
  return ig;
}

function relativeFromCwd(cwd: string, target: string): string {
  const relative = path.relative(cwd, target).replaceAll('\\', '/');
  return relative && !relative.startsWith('..') ? relative : '';
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
