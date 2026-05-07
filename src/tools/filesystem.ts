import {readFile, writeFile, stat} from 'node:fs/promises';
import path from 'node:path';
import {createPatch} from 'diff';
import {z} from 'zod';
import {ensureDir, relativePath, resolveWorkspacePath} from '../utils/paths.js';
import {tool, type Tool} from './types.js';

const readFileSchema = z.object({path: z.string(), startLine: z.number().int().positive().optional(), maxLines: z.number().int().positive().max(1000).default(300)});
const writeFileSchema = z.object({path: z.string(), content: z.string(), expectedHash: z.string().optional(), previewOnly: z.boolean().default(false)});
const patchFileSchema = z.object({path: z.string(), search: z.string(), replace: z.string(), expectedHash: z.string().optional(), previewOnly: z.boolean().default(false)});

export const readFileTool = tool({
  name: 'read_file',
  description: 'Read a workspace file with optional line windowing for large files.',
  schema: readFileSchema,
  async execute(input, context) {
    const file = resolveWorkspacePath(context.workspace, input.path);
    const text = await readFile(file, 'utf8');
    const lines = text.split(/\r?\n/);
    const start = input.startLine ?? 1;
    const maxLines = input.maxLines ?? 300;
    const selected = lines.slice(start - 1, start - 1 + maxLines);
    return {ok: true, output: selected.map((line, index) => `${start + index}: ${line}`).join('\n'), data: {path: relativePath(context.workspace, file), hash: await fileHash(text), totalLines: lines.length}};
  }
});

export const writeFileTool = tool({
  name: 'write_file',
  description: 'Write a workspace file after permission and optional concurrent modification checks.',
  schema: writeFileSchema,
  async execute(input, context) {
    requireWrite(context.permission);
    const file = resolveWorkspacePath(context.workspace, input.path);
    const previous = await readExisting(file);
    if (input.expectedHash && previous.exists && await fileHash(previous.content) !== input.expectedHash) throw new Error(`Concurrent modification detected for ${input.path}`);
    const diff = createPatch(input.path, previous.content, input.content, 'before', 'after');
    if (input.previewOnly) return {ok: true, output: diff, data: {previewOnly: true}};
    if (previous.exists && diff.length > 2000) {
      const approved = await context.askPermission({action: `write ${input.path}`, reason: 'Large file rewrite detected; preview the diff before overwriting.', risk: 'medium'});
      if (!approved) return {ok: false, output: 'Write cancelled by user'};
    }
    await ensureDir(path.dirname(file));
    await writeFile(file, input.content, 'utf8');
    return {ok: true, output: diff || `Wrote ${input.path}`, data: {path: input.path, hash: await fileHash(input.content)}};
  }
});

export const patchFileTool = tool({
  name: 'patch_file',
  description: 'Patch a file by replacing an exact text range. Fails if the search text is absent or ambiguous.',
  schema: patchFileSchema,
  async execute(input, context) {
    requireWrite(context.permission);
    const file = resolveWorkspacePath(context.workspace, input.path);
    const previous = await readFile(file, 'utf8');
    if (input.expectedHash && await fileHash(previous) !== input.expectedHash) throw new Error(`Concurrent modification detected for ${input.path}`);
    const first = previous.indexOf(input.search);
    if (first === -1) throw new Error(`Search text not found in ${input.path}`);
    if (previous.indexOf(input.search, first + input.search.length) !== -1) throw new Error(`Search text is ambiguous in ${input.path}`);
    const next = previous.slice(0, first) + input.replace + previous.slice(first + input.search.length);
    const diff = createPatch(input.path, previous, next, 'before', 'after');
    if (input.previewOnly) return {ok: true, output: diff, data: {previewOnly: true}};
    await writeFile(file, next, 'utf8');
    return {ok: true, output: diff, data: {path: input.path, hash: await fileHash(next)}};
  }
});

export const filesystemTools: Tool[] = [readFileTool, writeFileTool, patchFileTool];

async function readExisting(file: string): Promise<{exists: boolean; content: string}> {
  try { await stat(file); return {exists: true, content: await readFile(file, 'utf8')}; } catch { return {exists: false, content: ''}; }
}

async function fileHash(text: string): Promise<string> {
  const {createHash} = await import('node:crypto');
  return createHash('sha256').update(text).digest('hex');
}

function requireWrite(permission: string) {
  if (permission === 'read-only') throw new Error('Current permission level is read-only');
}
