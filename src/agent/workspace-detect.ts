import {readFile} from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import {detectPackageManager} from '../system/package-manager.js';

export type WorkspaceDetection = {
  empty: boolean;
  kind: 'empty' | 'website' | 'docs_site' | 'node' | 'jekyll' | 'react_vite' | 'next' | 'typescript' | 'unknown';
  packageManager?: string;
  scripts: string[];
  files: string[];
  websiteFiles: string[];
  summary: string;
};

export async function detectWorkspace(workspace: string): Promise<WorkspaceDetection> {
  const files = (await fg(['**/*'], {cwd: workspace, onlyFiles: true, dot: true, followSymbolicLinks: false, unique: true, ignore: ['node_modules/**', 'dist/**', 'coverage/**', '.git/**']})).map((file) => file.replaceAll('\\', '/')).slice(0, 1000);
  const pkg = await readPackage(workspace);
  const scripts = Object.keys(pkg?.scripts ?? {});
  const deps = {...pkg?.dependencies, ...pkg?.devDependencies};
  const websiteFiles = findWebsiteFiles(files);
  const packageManager = pkg ? await detectPackageManager(workspace).catch(() => 'npm') : undefined;
  const kind = classify(files, deps, websiteFiles);
  const empty = files.length === 0;
  return {
    empty,
    kind: empty ? 'empty' : kind,
    packageManager,
    scripts,
    files,
    websiteFiles,
    summary: [
      empty ? 'This workspace is empty.' : `Detected ${kind} workspace.`,
      packageManager ? `Package manager: ${packageManager}` : '',
      scripts.length ? `Scripts: ${scripts.join(', ')}` : '',
      websiteFiles.length ? `Website files: ${websiteFiles.slice(0, 12).join(', ')}` : ''
    ].filter(Boolean).join('\n')
  };
}

function findWebsiteFiles(files: string[]): string[] {
  return files.filter((file) => /(^|\/)(index|home|app|main|style|styles)\.(html|css|tsx|jsx|vue)$|(^|\/)assets\/css\/.*\.css$|(^|\/)styles?\/.*\.css$|^docs\/.*\.(html|css|js)$|^src\/.*\.(css|scss|tsx|jsx|vue)$/.test(file)).slice(0, 80);
}

function classify(files: string[], deps: Record<string, unknown>, websiteFiles: string[]): WorkspaceDetection['kind'] {
  if (files.length === 0) return 'empty';
  if (files.some((file) => file === '_config.yml' || file.endsWith('.liquid'))) return 'jekyll';
  if (deps.next || files.some((file) => file.startsWith('next.config.'))) return 'next';
  if ((deps.react && deps.vite) || files.some((file) => file.startsWith('vite.config.'))) return 'react_vite';
  if (files.some((file) => file.startsWith('docs/') && /\.(html|css)$/.test(file))) return 'docs_site';
  if (websiteFiles.length) return 'website';
  if (files.some((file) => file.startsWith('tsconfig'))) return 'typescript';
  if (files.includes('package.json')) return 'node';
  return 'unknown';
}

async function readPackage(workspace: string): Promise<any | undefined> {
  try { return JSON.parse(await readFile(path.join(workspace, 'package.json'), 'utf8')); } catch { return undefined; }
}
