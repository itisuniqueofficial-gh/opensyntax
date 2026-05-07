import {readFile, writeFile, stat, copyFile, rename, unlink, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createPatch} from 'diff';
import {z} from 'zod';
import {ensureDir, relativePath, resolveWorkspacePath} from '../utils/paths.js';
import {isAlwaysBlocked, requiresApproval, buildFileDeletePrompt, pathExists} from './safety.js';
import {requirePermission} from './permissions.js';
import {tool, type Tool} from './types.js';

const readFileSchema = z.object({path: z.string(), startLine: z.number().int().positive().optional(), maxLines: z.number().int().positive().max(1000).default(300)});
const writeFileSchema = z.object({path: z.string(), content: z.string(), expectedHash: z.string().optional(), previewOnly: z.boolean().default(false)});
const patchFileSchema = z.object({path: z.string(), search: z.string(), replace: z.string(), expectedHash: z.string().optional(), previewOnly: z.boolean().default(false)});
const createFileSchema = z.object({path: z.string(), content: z.string().default(''), overwrite: z.boolean().default(false)});
const deleteFileSchema = z.object({path: z.string(), confirm: z.boolean().default(false)});
const renameFileSchema = z.object({from: z.string(), to: z.string()});
const copyFileSchema = z.object({from: z.string(), to: z.string(), overwrite: z.boolean().default(false)});
const moveFileSchema = z.object({from: z.string(), to: z.string(), overwrite: z.boolean().default(false)});
const replaceInFileSchema = z.object({path: z.string(), search: z.string(), replace: z.string(), all: z.boolean().default(false)});

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
    enforceRulePathRestrictions(context.workspace, file, context.rules?.forbiddenPaths ?? context.rules?.restrictions ?? []);
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
    enforceRulePathRestrictions(context.workspace, file, context.rules?.forbiddenPaths ?? context.rules?.restrictions ?? []);
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

// ---------------------------------------------------------------------------
// New tools: create_file, delete_file, rename_file, copy_file, move_file, replace_in_file
// ---------------------------------------------------------------------------

export const createFileTool = tool({
  name: 'create_file',
  description: 'Create a new file in the workspace. Creates parent directories automatically. Fails if the file already exists unless overwrite is true.',
  schema: createFileSchema,
  async execute(input, context) {
    requireWrite(context.permission);
    const file = resolveWorkspacePath(context.workspace, input.path);
    enforceRulePathRestrictions(context.workspace, file, context.rules?.forbiddenPaths ?? context.rules?.restrictions ?? []);
    const blocked = isAlwaysBlocked(context.workspace, file);
    if (blocked.blocked) throw new Error(blocked.reason);
    const exists = await pathExists(file);
    if (exists && !input.overwrite) return {ok: false, output: `File already exists: ${input.path}. Use overwrite=true to replace it.`};
    if (exists) {
      const approved = await context.askPermission({action: `overwrite ${input.path}`, reason: 'File already exists and overwrite was requested', risk: 'medium'});
      if (!approved) return {ok: false, output: 'File creation cancelled by user'};
    }
    await ensureDir(path.dirname(file));
    await writeFile(file, input.content ?? '', 'utf8');
    return {ok: true, output: `Created ${relativePath(context.workspace, file)}`, data: {path: input.path}};
  }
});

export const deleteFileTool = tool({
  name: 'delete_file',
  description: 'Delete a file from the workspace. Always requires user approval.',
  schema: deleteFileSchema,
  async execute(input, context) {
    requirePermission(context.permission, 'delete-file');
    const file = resolveWorkspacePath(context.workspace, input.path);
    enforceRulePathRestrictions(context.workspace, file, context.rules?.forbiddenPaths ?? context.rules?.restrictions ?? []);
    const blocked = isAlwaysBlocked(context.workspace, file);
    if (blocked.blocked) throw new Error(blocked.reason);
    if (!await pathExists(file)) return {ok: false, output: `File not found: ${input.path}`};
    const prompt = buildFileDeletePrompt(context.workspace, file);
    const approved = await context.askPermission({action: `delete ${input.path}`, reason: prompt, risk: 'high'});
    if (!approved) return {ok: false, output: 'File deletion cancelled by user'};
    await unlink(file);
    return {ok: true, output: `Deleted ${relativePath(context.workspace, file)}`};
  }
});

export const renameFileTool = tool({
  name: 'rename_file',
  description: 'Rename or move a file within the workspace.',
  schema: renameFileSchema,
  async execute(input, context) {
    requireWrite(context.permission);
    const from = resolveWorkspacePath(context.workspace, input.from);
    const to = resolveWorkspacePath(context.workspace, input.to);
    enforceRulePathRestrictions(context.workspace, from, context.rules?.forbiddenPaths ?? context.rules?.restrictions ?? []);
    enforceRulePathRestrictions(context.workspace, to, context.rules?.forbiddenPaths ?? context.rules?.restrictions ?? []);
    if (!await pathExists(from)) return {ok: false, output: `Source not found: ${input.from}`};
    await ensureDir(path.dirname(to));
    await rename(from, to);
    return {ok: true, output: `Renamed ${relativePath(context.workspace, from)} → ${relativePath(context.workspace, to)}`};
  }
});

export const copyFileTool = tool({
  name: 'copy_file',
  description: 'Copy a file within the workspace.',
  schema: copyFileSchema,
  async execute(input, context) {
    requireWrite(context.permission);
    const from = resolveWorkspacePath(context.workspace, input.from);
    const to = resolveWorkspacePath(context.workspace, input.to);
    enforceRulePathRestrictions(context.workspace, to, context.rules?.forbiddenPaths ?? context.rules?.restrictions ?? []);
    if (!await pathExists(from)) return {ok: false, output: `Source not found: ${input.from}`};
    if (await pathExists(to) && !input.overwrite) return {ok: false, output: `Destination already exists: ${input.to}. Use overwrite=true.`};
    await ensureDir(path.dirname(to));
    await copyFile(from, to);
    return {ok: true, output: `Copied ${relativePath(context.workspace, from)} → ${relativePath(context.workspace, to)}`};
  }
});

export const moveFileTool = tool({
  name: 'move_file',
  description: 'Move a file to a new location within the workspace.',
  schema: moveFileSchema,
  async execute(input, context) {
    requireWrite(context.permission);
    const from = resolveWorkspacePath(context.workspace, input.from);
    const to = resolveWorkspacePath(context.workspace, input.to);
    enforceRulePathRestrictions(context.workspace, from, context.rules?.forbiddenPaths ?? context.rules?.restrictions ?? []);
    enforceRulePathRestrictions(context.workspace, to, context.rules?.forbiddenPaths ?? context.rules?.restrictions ?? []);
    if (!await pathExists(from)) return {ok: false, output: `Source not found: ${input.from}`};
    if (await pathExists(to) && !input.overwrite) return {ok: false, output: `Destination already exists: ${input.to}. Use overwrite=true.`};
    await ensureDir(path.dirname(to));
    await rename(from, to);
    return {ok: true, output: `Moved ${relativePath(context.workspace, from)} → ${relativePath(context.workspace, to)}`};
  }
});

export const replaceInFileTool = tool({
  name: 'replace_in_file',
  description: 'Replace all or first occurrence of a string in a file.',
  schema: replaceInFileSchema,
  async execute(input, context) {
    requireWrite(context.permission);
    const file = resolveWorkspacePath(context.workspace, input.path);
    enforceRulePathRestrictions(context.workspace, file, context.rules?.forbiddenPaths ?? context.rules?.restrictions ?? []);
    const previous = await readFile(file, 'utf8');
    const next = input.all ? previous.replaceAll(input.search, input.replace) : previous.replace(input.search, input.replace);
    if (next === previous) return {ok: false, output: `Search text not found in ${input.path}`};
    const diff = createPatch(input.path, previous, next, 'before', 'after');
    await writeFile(file, next, 'utf8');
    return {ok: true, output: diff, data: {path: input.path}};
  }
});

export const filesystemTools: Tool[] = [readFileTool, writeFileTool, patchFileTool, createFileTool, deleteFileTool, renameFileTool, copyFileTool, moveFileTool, replaceInFileTool];

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

function enforceRulePathRestrictions(workspace: string, file: string, rules: string[]): void {
  const relative = relativePath(workspace, file).replaceAll('\\', '/');
  const normalizedRules = rules.join('\n').toLowerCase();
  const forbidden = new Set<string>();
  for (const item of rules) {
    const normalized = item.replaceAll('\\', '/').replace(/^\/+/, '');
    if (normalized.endsWith('/')) forbidden.add(normalized.toLowerCase());
  }
  if (/dist\/?|generated/i.test(normalizedRules)) forbidden.add('dist/');
  if (/build\/?|generated/i.test(normalizedRules)) forbidden.add('build/');
  if (/coverage\/?|generated/i.test(normalizedRules)) forbidden.add('coverage/');
  if (/node_modules\/?|generated/i.test(normalizedRules)) forbidden.add('node_modules/');
  for (const prefix of forbidden) {
    if (relative.toLowerCase() === prefix.slice(0, -1) || relative.toLowerCase().startsWith(prefix)) throw new Error(`Workspace rules prohibit editing ${prefix}`);
  }
}
