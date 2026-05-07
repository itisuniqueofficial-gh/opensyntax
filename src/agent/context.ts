import {readFile} from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import {detectPackageManager as detectNodePackageManager, type PackageManager} from '../system/package-manager.js';

export type AgentContextHint = {
  workspace: string;
  provider: string;
  model: string;
  permission: string;
};

export type WorkspaceContext = {
  summary: string;
  packageManager?: PackageManager;
  scripts: string[];
  importantFiles: string[];
  projectType: string;
  frameworks: string[];
  buildSystem: string;
  testSystem: string;
  monorepo: boolean;
  hasTypeScript: boolean;
  hasDocker: boolean;
};

const contextCache = new Map<string, {mtimeKey: string; context: WorkspaceContext}>();

export function renderContextHint(context: AgentContextHint): string {
  return [`Workspace: ${context.workspace}`, `Provider: ${context.provider}`, `Model: ${context.model}`, `Permission: ${context.permission}`].join('\n');
}

export async function buildWorkspaceContext(workspace: string, request: string): Promise<WorkspaceContext> {
  const cacheKey = `${workspace}\n${request.toLowerCase().slice(0, 120)}`;
  const mtimeKey = await workspaceMtimeKey(workspace);
  const cached = contextCache.get(cacheKey);
  if (cached?.mtimeKey === mtimeKey) return cached.context;
  const [pkg, files] = await Promise.all([readPackageJson(workspace), importantFiles(workspace)]);
  const packageManager = await detectPackageManager(workspace);
  const scripts = Object.keys(pkg?.scripts ?? {});
  const dependencies = {...pkg?.dependencies, ...pkg?.devDependencies};
  const frameworks = detectFrameworks(dependencies, files);
  const projectType = detectProjectType(files, dependencies);
  const buildSystem = detectBuildSystem(scripts, dependencies, files);
  const testSystem = detectTestSystem(scripts, dependencies, files);
  const monorepo = Boolean(pkg?.workspaces) || files.some((file) => /^(pnpm-workspace\.yaml|turbo\.json|lerna\.json|rush\.json|nx\.json)$/.test(file));
  const hasTypeScript = files.some((file) => file.endsWith('.ts') || file.endsWith('.tsx') || file.startsWith('tsconfig'));
  const hasDocker = files.some((file) => /(^|\/)Dockerfile$|docker-compose\.ya?ml$/.test(file));
  const relevant = rankRelevantFiles(files, request).slice(0, 12);
  const summary = [
    'Workspace context:',
    pkg ? `- Package: ${pkg.name ?? 'unnamed'}${pkg.version ? ` v${pkg.version}` : ''}` : '- Package: package.json not found',
    packageManager ? `- Package manager: ${packageManager}` : '',
    `- Project: ${projectType}${frameworks.length ? ` (${frameworks.join(', ')})` : ''}`,
    `- Build system: ${buildSystem}`,
    `- Test system: ${testSystem}`,
    `- Monorepo: ${monorepo ? 'yes' : 'no'}`,
    `- TypeScript: ${hasTypeScript ? 'yes' : 'no'}`,
    `- Docker: ${hasDocker ? 'yes' : 'no'}`,
    scripts.length ? `- Scripts: ${scripts.slice(0, 12).join(', ')}` : '- Scripts: none detected',
    relevant.length ? `- Relevant files: ${relevant.join(', ')}` : '- Relevant files: none detected'
  ].filter(Boolean).join('\n');
  const context = {summary, packageManager, scripts, importantFiles: relevant, projectType, frameworks, buildSystem, testSystem, monorepo, hasTypeScript, hasDocker};
  contextCache.set(cacheKey, {mtimeKey, context});
  return context;
}

export function verificationCommandsForWorkspace(commands: string[], context: WorkspaceContext): string[] {
  const manager = context.packageManager ?? 'npm';
  return commands.map((command) => {
    if (manager === 'npm') return command;
    const match = command.match(/^npm run (.+)$/);
    if (match) return `${manager} run ${match[1]}`;
    if (command === 'npm test') return manager === 'yarn' ? 'yarn test' : `${manager} test`;
    return command;
  });
}

async function importantFiles(workspace: string): Promise<string[]> {
  try {
    const files = await fg(['package.json', 'pnpm-workspace.yaml', 'turbo.json', 'vite.config.*', 'next.config.*', 'vue.config.*', 'nest-cli.json', 'Dockerfile', 'docker-compose*.yml', 'tsconfig*.json', 'vitest*.config.*', 'src/**/*.{ts,tsx,js,jsx,vue,py}', 'app/**/*.{ts,tsx,js,jsx,vue,py}', 'pages/**/*.{ts,tsx,js,jsx}', 'tests/**/*.{ts,tsx,js,jsx,py}', 'docs/**/*.html', 'README.md', 'AGENTS.md', 'OPENSYNTAX.md'], {cwd: workspace, onlyFiles: true, dot: true, followSymbolicLinks: false, ignore: ['node_modules/**', 'dist/**', 'coverage/**', '.git/**']});
    return files.map((file) => file.replaceAll('\\', '/')).slice(0, 300);
  } catch {
    return [];
  }
}

function rankRelevantFiles(files: string[], request: string): string[] {
  const terms = request.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length > 2);
  const scored = files.map((file) => {
    const lower = file.toLowerCase();
    let score = /^(package.json|tsconfig|src\/agent|src\/tools|src\/ui|src\/tests)/.test(lower) ? 2 : 0;
    for (const term of terms) if (lower.includes(term)) score += 3;
    if (/type ?script|typescript|typecheck|tsc/.test(request.toLowerCase()) && /tsconfig|\.ts$/.test(lower)) score += 4;
    if (/test/.test(request.toLowerCase()) && /test|vitest/.test(lower)) score += 4;
    return {file, score};
  });
  return scored.sort((a, b) => b.score - a.score || a.file.localeCompare(b.file)).filter((item) => item.score > 0).map((item) => item.file);
}

async function readPackageJson(workspace: string): Promise<any | undefined> {
  try { return JSON.parse(await readFile(path.join(workspace, 'package.json'), 'utf8')); } catch { return undefined; }
}

async function detectPackageManager(workspace: string): Promise<PackageManager | undefined> {
  try { return await detectNodePackageManager(workspace); } catch { return undefined; }
}

function detectFrameworks(deps: Record<string, unknown>, files: string[]): string[] {
  const names = Object.keys(deps ?? {});
  const has = (name: string) => names.includes(name);
  const frameworks = [
    has('next') ? 'Next.js' : '',
    has('react') ? 'React' : '',
    has('vue') ? 'Vue' : '',
    has('vite') || files.some((file) => file.startsWith('vite.config.')) ? 'Vite' : '',
    has('express') ? 'Express' : '',
    has('@nestjs/core') || files.includes('nest-cli.json') ? 'NestJS' : '',
    has('turbo') || files.includes('turbo.json') ? 'Turborepo' : ''
  ].filter(Boolean);
  if (files.some((file) => file.endsWith('.py'))) frameworks.push('Python');
  return [...new Set(frameworks)];
}

function detectProjectType(files: string[], deps: Record<string, unknown>): string {
  if (files.some((file) => file.endsWith('.py'))) return 'Python';
  if (deps.next) return 'Next.js app';
  if (deps.react || deps.vue || deps.vite) return 'Frontend app';
  if (deps.express || deps['@nestjs/core']) return 'Node.js service';
  if (files.includes('package.json')) return 'Node.js package';
  return 'unknown';
}

function detectBuildSystem(scripts: string[], deps: Record<string, unknown>, files: string[]): string {
  if (scripts.includes('build')) return 'package script: build';
  if (deps.vite || files.some((file) => file.startsWith('vite.config.'))) return 'Vite';
  if (deps.next || files.some((file) => file.startsWith('next.config.'))) return 'Next.js';
  if (deps.typescript || files.some((file) => file.startsWith('tsconfig'))) return 'TypeScript';
  return 'not detected';
}

function detectTestSystem(scripts: string[], deps: Record<string, unknown>, files: string[]): string {
  if (scripts.includes('test')) return 'package script: test';
  if (deps.vitest || files.some((file) => file.startsWith('vitest'))) return 'Vitest';
  if (deps.jest) return 'Jest';
  if (deps.playwright) return 'Playwright';
  if (files.some((file) => file.endsWith('_test.py') || file.endsWith('test.py'))) return 'pytest/unittest';
  return 'not detected';
}

async function workspaceMtimeKey(workspace: string): Promise<string> {
  const files = await fg(['package.json', 'pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', 'bun.lock', 'tsconfig*.json'], {cwd: workspace, onlyFiles: true, followSymbolicLinks: false});
  return files.sort().join('|');
}
