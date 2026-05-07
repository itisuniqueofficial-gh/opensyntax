import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {execa} from 'execa';
import fg from 'fast-glob';
import ignore from 'ignore';
import type {SessionRecord} from '../session/history.js';

type GitResult = {ok: boolean; output: string};

const codeExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.md', '.yml', '.yaml']);

export async function repoSummary(workspace: string): Promise<string> {
  const [pkg, files, git] = await Promise.all([readJson(path.join(workspace, 'package.json')), workspaceFiles(workspace, 1200), gitSummary(workspace)]);
  const byExtension = countBy(files.map((file) => path.extname(file) || '[none]'));
  const topDirs = countBy(files.map((file) => file.split('/')[0] ?? file));
  return [
    'Repository Intelligence',
    pkg ? `Package: ${pkg.name ?? 'unnamed'} ${pkg.version ? `v${pkg.version}` : ''}`.trim() : 'Package: package.json not found',
    pkg?.description ? `Description: ${pkg.description}` : '',
    `Files indexed: ${files.length}`,
    `Top folders: ${formatCounts(topDirs, 8)}`,
    `File types: ${formatCounts(byExtension, 10)}`,
    '',
    git
  ].filter(Boolean).join('\n');
}

export async function architectureSummary(workspace: string): Promise<string> {
  const files = await workspaceFiles(workspace, 1500);
  const important = files.filter((file) => /^(src|app|packages|apps|lib|bin|scripts|docs)\//.test(file) || /^(package.json|tsconfig.json|README.md|AGENTS.md|OPENSYNTAX.md)$/.test(file));
  const folders = [...new Set(important.map((file) => file.includes('/') ? file.split('/').slice(0, 2).join('/') : file))].slice(0, 40);
  return ['Architecture Map', ...folders.map((folder) => `- ${folder}`)].join('\n');
}

export async function dependencySummary(workspace: string): Promise<string> {
  const pkg = await readJson(path.join(workspace, 'package.json'));
  if (!pkg) return 'No package.json found.';
  const sections = [
    ['Scripts', pkg.scripts],
    ['Dependencies', pkg.dependencies],
    ['Dev Dependencies', pkg.devDependencies]
  ] as const;
  return sections.map(([title, value]) => [`${title}:`, ...Object.entries(value ?? {}).slice(0, 30).map(([key, val]) => `- ${key}: ${String(val)}`)].join('\n')).join('\n\n');
}

export async function symbolSummary(workspace: string, query = ''): Promise<string> {
  const files = (await workspaceFiles(workspace, 2000)).filter((file) => ['.ts', '.tsx', '.js', '.jsx'].includes(path.extname(file)));
  const matches: string[] = [];
  const matcher = query ? new RegExp(escapeRegex(query), 'i') : /./;
  const symbolPattern = /\b(?:export\s+)?(?:async\s+)?(?:function|class|interface|type|const|let|var)\s+([A-Za-z_$][\w$]*)/g;
  for (const file of files) {
    if (matches.length >= 120) break;
    let text = '';
    try { text = await readFile(path.join(workspace, file), 'utf8'); } catch { continue; }
    for (const match of text.matchAll(symbolPattern)) {
      if (matcher.test(match[1])) matches.push(`${file}: ${match[1]}`);
      if (matches.length >= 120) break;
    }
  }
  return matches.join('\n') || 'No symbols found.';
}

export async function searchWorkspace(workspace: string, query: string): Promise<string> {
  if (!query.trim()) return 'Usage: /search <query>';
  const files = (await workspaceFiles(workspace, 2500)).filter((file) => codeExtensions.has(path.extname(file)));
  const matcher = new RegExp(escapeRegex(query), 'i');
  const hits: string[] = [];
  for (const file of files) {
    if (hits.length >= 100) break;
    let text = '';
    try { text = await readFile(path.join(workspace, file), 'utf8'); } catch { continue; }
    const lines = text.split(/\r?\n/);
    for (let index = 0; index < lines.length && hits.length < 100; index++) {
      if (matcher.test(lines[index])) hits.push(`${file}:${index + 1}: ${lines[index].trim()}`);
    }
  }
  return hits.join('\n') || 'No matches found.';
}

export async function findFiles(workspace: string, query: string): Promise<string> {
  if (!query.trim()) return 'Usage: /find <file-pattern-or-name>';
  const matcher = new RegExp(escapeRegex(query), 'i');
  const files = (await workspaceFiles(workspace, 3000)).filter((file) => matcher.test(file)).slice(0, 120);
  return files.join('\n') || 'No files found.';
}

export async function gitSummary(workspace: string): Promise<string> {
  const inside = await git(workspace, ['rev-parse', '--is-inside-work-tree']);
  if (!inside.ok) return 'Git: no repository detected.';
  const [branch, status, log] = await Promise.all([
    git(workspace, ['branch', '--show-current']),
    git(workspace, ['status', '--short', '--branch']),
    git(workspace, ['log', '--oneline', '-5'])
  ]);
  return [`Git branch: ${branch.output || 'detached'}`, status.output, 'Recent commits:', log.output].join('\n');
}

export async function diffSummary(workspace: string): Promise<string> {
  const diff = await git(workspace, ['diff', '--stat']);
  const staged = await git(workspace, ['diff', '--staged', '--stat']);
  if (!diff.ok && !staged.ok) return 'Git diff unavailable.';
  return [`Unstaged diff:\n${diff.output || 'No unstaged diff.'}`, `Staged diff:\n${staged.output || 'No staged diff.'}`].join('\n\n');
}

export async function commitDraft(workspace: string): Promise<string> {
  const status = await git(workspace, ['status', '--short']);
  const stat = await git(workspace, ['diff', '--stat']);
  if (!status.ok) return 'No git repository detected.';
  if (!status.output.trim()) return 'No changes to commit.';
  return ['Suggested commit message:', '', 'chore: update workspace changes', '', 'Changed files:', status.output, '', stat.output].join('\n');
}

export async function prDraft(workspace: string): Promise<string> {
  const branch = await git(workspace, ['branch', '--show-current']);
  const log = await git(workspace, ['log', '--oneline', '-10']);
  const diff = await diffSummary(workspace);
  return [`PR title: Update ${branch.output || 'current branch'}`, '', '## Summary', '- Describe the user-facing change.', '- Mention validation performed.', '', '## Recent commits', log.output || 'No commits found.', '', '## Diff summary', diff].join('\n');
}

export function sessionMemory(session: SessionRecord): string {
  return [`Session: ${session.id}`, `Messages: ${session.messages.length}`, `Tool calls: ${session.toolLog.length}`, `Plan items: ${session.plan.length}`, `Created: ${session.createdAt}`, `Updated: ${session.updatedAt}`].join('\n');
}

export function renderProgress(session: SessionRecord): string {
  const total = session.plan.length;
  const completed = session.plan.filter((item) => item.state === 'completed').length;
  const failed = session.plan.filter((item) => item.state === 'failed').length;
  return [`Progress: ${completed}/${total} complete${failed ? `, ${failed} failed` : ''}`, ...session.plan.map((item) => `- ${item.state}: ${item.content}`)].join('\n');
}

export async function pluginSummary(workspace: string): Promise<string> {
  const files = await fg('.opensyntax/plugins/*.json', {cwd: workspace, onlyFiles: true, dot: true, followSymbolicLinks: false});
  if (!files.length) return 'Plugins\n- Built-in typed tools are active.\n- No workspace plugin manifests found in .opensyntax/plugins/*.json.';
  const plugins: string[] = [];
  for (const file of files.slice(0, 40)) {
    const manifest = await readJson(path.join(workspace, file));
    plugins.push(`- ${manifest?.name ?? file}${manifest?.version ? ` v${manifest.version}` : ''}${manifest?.description ? `: ${manifest.description}` : ''}`);
  }
  return ['Plugins', ...plugins].join('\n');
}

async function workspaceFiles(root: string, limit: number): Promise<string[]> {
  const ig = ignore().add(['node_modules/', 'dist/', 'build/', 'coverage/', '.git/', '.next/']);
  try { ig.add(await readFile(path.join(root, '.gitignore'), 'utf8')); } catch {}
  const files = await fg('**/*', {cwd: root, onlyFiles: true, dot: true, followSymbolicLinks: false, unique: true});
  return files.map((file) => file.replaceAll('\\', '/')).filter((file) => !ig.ignores(file)).slice(0, limit);
}

async function readJson(file: string): Promise<any | undefined> {
  try { return JSON.parse(await readFile(file, 'utf8')); } catch { return undefined; }
}

async function git(cwd: string, args: string[]): Promise<GitResult> {
  const result = await execa('git', args, {cwd, reject: false});
  return {ok: result.exitCode === 0, output: (result.stdout || result.stderr).trim()};
}

function countBy(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((acc, value) => { acc[value] = (acc[value] ?? 0) + 1; return acc; }, {});
}

function formatCounts(counts: Record<string, number>, limit: number): string {
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([key, value]) => `${key} (${value})`).join(', ') || 'none';
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
