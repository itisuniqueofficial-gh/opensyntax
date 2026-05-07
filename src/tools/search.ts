import {readFile} from 'node:fs/promises';
import fg from 'fast-glob';
import ignore from 'ignore';
import path from 'node:path';
import {z} from 'zod';
import {relativePath} from '../utils/paths.js';
import {tool, type Tool} from './types.js';

const listSchema = z.object({pattern: z.string().default('**/*'), limit: z.number().int().positive().max(5000).default(500)});
const searchSchema = z.object({query: z.string(), pattern: z.string().default('**/*'), limit: z.number().int().positive().max(500).default(100)});

export const listFilesTool = tool({
  name: 'list_files',
  description: 'List workspace files while respecting .gitignore.',
  schema: listSchema,
  async execute(input, context) {
    const files = await workspaceFiles(context.workspace, input.pattern ?? '**/*', input.limit ?? 500);
    return {ok: true, output: files.join('\n'), data: {count: files.length}};
  }
});

export const searchFilesTool = tool({
  name: 'search_files',
  description: 'Search workspace file contents for a literal or regular expression query.',
  schema: searchSchema,
  async execute(input, context) {
    const regex = new RegExp(input.query, 'i');
    const limit = input.limit ?? 100;
    const files = await workspaceFiles(context.workspace, input.pattern ?? '**/*', 3000);
    const hits: string[] = [];
    for (const file of files) {
      if (hits.length >= limit) break;
      const absolute = path.join(context.workspace, file);
      let text = '';
      try { text = await readFile(absolute, 'utf8'); } catch { continue; }
      const lines = text.split(/\r?\n/);
      for (let index = 0; index < lines.length && hits.length < limit; index++) {
        if (regex.test(lines[index])) hits.push(`${file}:${index + 1}: ${lines[index].trim()}`);
      }
    }
    return {ok: true, output: hits.join('\n') || 'No matches', data: {count: hits.length}};
  }
});

export const searchTools: Tool[] = [listFilesTool, searchFilesTool];

async function workspaceFiles(root: string, pattern: string, limit: number): Promise<string[]> {
  const ig = ignore().add(['node_modules/', 'dist/', '.git/']);
  try { ig.add(await readFile(path.join(root, '.gitignore'), 'utf8')); } catch {}
  const files = await fg(pattern, {cwd: root, onlyFiles: true, dot: true, followSymbolicLinks: false, unique: true});
  return files.map((file) => relativePath(root, path.join(root, file))).filter((file) => !ig.ignores(file)).slice(0, limit);
}
