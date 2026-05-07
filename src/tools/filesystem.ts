import {copyFile, mkdir, readFile, rename, stat, unlink, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execa} from 'execa';
import {z} from 'zod';
import {relativePath} from '../utils/paths.js';
import {writeAuditLog} from './audit.js';
import {unifiedDiff} from './diff.js';
import {applyTextPatch} from './patch.js';
import {checkPermission, requirePermission} from './permissions.js';
import {pathExists, resolveSafePath, riskForPath} from './path-safety.js';
import {tool, type Tool, type ToolContext, type ToolResult} from './types.js';

const textEditBase = z.object({path: z.string(), dryRun: z.boolean().default(false), expectedHash: z.string().optional(), expectedMtimeMs: z.number().optional()});
const readFileSchema = z.object({path: z.string(), startLine: z.number().int().positive().optional(), maxLines: z.number().int().positive().max(5000).default(300)});
const readManyFilesSchema = z.object({paths: z.array(z.string()).min(1).max(50), maxBytesPerFile: z.number().int().positive().max(200000).default(50000)});
const writeFileSchema = textEditBase.extend({content: z.string(), overwrite: z.boolean().default(false), previewOnly: z.boolean().optional()});
const createFileSchema = z.object({path: z.string(), content: z.string().default(''), overwrite: z.boolean().default(false), dryRun: z.boolean().default(false)});
const patchFileSchema = textEditBase.extend({search: z.string().optional(), replace: z.string().optional(), all: z.boolean().default(false), patch: z.string().optional(), jsonPatch: z.array(z.object({op: z.enum(['add', 'replace', 'remove']), path: z.string(), value: z.unknown().optional()})).optional(), previewOnly: z.boolean().optional()});
const applyPatchSchema = textEditBase.extend({patch: z.string()});
const replaceInFileSchema = textEditBase.extend({search: z.string(), replace: z.string(), all: z.boolean().default(false)});
const insertIntoFileSchema = textEditBase.extend({text: z.string(), position: z.enum(['before', 'after', 'line-start', 'line-end']).default('after'), search: z.string().optional(), line: z.number().int().positive().optional()});
const appendToFileSchema = textEditBase.extend({content: z.string(), ensureNewline: z.boolean().default(true)});
const deleteFileSchema = z.object({path: z.string(), dryRun: z.boolean().default(false), confirm: z.boolean().default(false)});
const renameFileSchema = z.object({from: z.string(), to: z.string(), overwrite: z.boolean().default(false), dryRun: z.boolean().default(false)});
const copyFileSchema = z.object({from: z.string(), to: z.string(), overwrite: z.boolean().default(false), dryRun: z.boolean().default(false)});
const moveFileSchema = renameFileSchema;
const statPathSchema = z.object({path: z.string()});
const fileExistsSchema = z.object({path: z.string()});

export const readFileTool = tool({
  name: 'read_file',
  description: 'Read a workspace file with optional line windowing.',
  schema: readFileSchema,
  async execute(input, context) {
    const safe = await resolveSafePath(context.workspace, input.path, context.rules, {allowMissing: false});
    if (!safe.isFile) return result('read_file', safe.relative, false, `Not a file: ${safe.relative}`, false);
    const text = await readFile(safe.absolute, 'utf8');
    const lines = text.split(/\r?\n/);
    const start = input.startLine ?? 1;
    const selected = lines.slice(start - 1, start - 1 + (input.maxLines ?? 300));
    const output = selected.map((line, index) => `${start + index}: ${line}`).join('\n');
    return {...result('read_file', safe.relative, true, output, false), data: {path: safe.relative, hash: hash(text), totalLines: lines.length, mtimeMs: safe.mtimeMs}};
  }
});

export const readManyFilesTool = tool({
  name: 'read_many_files',
  description: 'Read multiple workspace files with a byte cap per file.',
  schema: readManyFilesSchema,
  async execute(input, context) {
    const chunks: string[] = [];
    for (const item of input.paths) {
      const safe = await resolveSafePath(context.workspace, item, context.rules, {allowMissing: false});
      if (!safe.isFile) { chunks.push(`## ${safe.relative}\nNot a file`); continue; }
      const text = await readFile(safe.absolute, 'utf8');
      chunks.push(`## ${safe.relative}\n${text.slice(0, input.maxBytesPerFile)}`);
    }
    return result('read_many_files', undefined, true, chunks.join('\n\n'), false);
  }
});

export const writeFileTool = tool({
  name: 'write_file',
  description: 'Write a workspace file with diff preview, permission checks, and audit logging.',
  schema: writeFileSchema,
  async execute(input, context) {
    return writeTextFile('write_file', context, input.path, input.content, {dryRun: input.dryRun || input.previewOnly, overwrite: input.overwrite, expectedHash: input.expectedHash, expectedMtimeMs: input.expectedMtimeMs, operation: 'write-file'});
  }
});

export const createFileTool = tool({
  name: 'create_file',
  description: 'Create a new workspace file, creating parent folders as needed.',
  schema: createFileSchema,
  async execute(input, context) {
    return writeTextFile('create_file', context, input.path, input.content ?? '', {dryRun: input.dryRun, overwrite: input.overwrite, operation: 'create-file'});
  }
});

export const patchFileTool = tool({
  name: 'patch_file',
  description: 'Patch a file using exact replacement, unified diff, or JSON patch. Exact replacement fails when ambiguous unless all=true.',
  schema: patchFileSchema,
  async execute(input, context) {
    const safe = await resolveSafePath(context.workspace, input.path, context.rules, {allowMissing: false});
    requirePermission(context.permission, 'patch-file');
    const previous = await readFile(safe.absolute, 'utf8');
    checkConcurrency(input.path, previous, safe.mtimeMs, input.expectedHash, input.expectedMtimeMs);
    let next: string;
    if (input.patch) next = applyTextPatch(previous, {kind: 'unified-diff', patch: input.patch});
    else if (input.jsonPatch) next = applyTextPatch(previous, {kind: 'json-patch', operations: input.jsonPatch});
    else next = applyTextPatch(previous, {kind: 'exact', search: input.search ?? '', replace: input.replace ?? '', all: input.all});
    return writeTextFile('patch_file', context, safe.relative, next, {dryRun: input.dryRun || input.previewOnly, expectedHash: input.expectedHash, expectedMtimeMs: input.expectedMtimeMs, previous, operation: 'patch-file'});
  }
});

export const applyPatchTool = tool({
  name: 'apply_patch',
  description: 'Apply a unified diff patch to a workspace file with diff preview and safety checks.',
  schema: applyPatchSchema,
  async execute(input, context) {
    const safe = await resolveSafePath(context.workspace, input.path, context.rules, {allowMissing: false});
    const previous = await readFile(safe.absolute, 'utf8');
    const next = applyTextPatch(previous, {kind: 'unified-diff', patch: input.patch});
    return writeTextFile('apply_patch', context, safe.relative, next, {dryRun: input.dryRun, expectedHash: input.expectedHash, expectedMtimeMs: input.expectedMtimeMs, previous, operation: 'patch-file'});
  }
});

export const replaceInFileTool = tool({
  name: 'replace_in_file',
  description: 'Replace exact text in a workspace file and return a diff.',
  schema: replaceInFileSchema,
  async execute(input, context) {
    const safe = await resolveSafePath(context.workspace, input.path, context.rules, {allowMissing: false});
    const previous = await readFile(safe.absolute, 'utf8');
    let next: string;
    try {
      next = applyTextPatch(previous, {kind: 'exact', search: input.search, replace: input.replace, all: input.all});
    } catch (error) {
      return result('replace_in_file', safe.relative, false, error instanceof Error ? error.message : String(error), false, undefined, error instanceof Error ? error.message : String(error));
    }
    return writeTextFile('replace_in_file', context, safe.relative, next, {dryRun: input.dryRun, expectedHash: input.expectedHash, expectedMtimeMs: input.expectedMtimeMs, previous, operation: 'patch-file'});
  }
});

export const insertIntoFileTool = tool({
  name: 'insert_into_file',
  description: 'Insert text before/after a match or at a specific line.',
  schema: insertIntoFileSchema,
  async execute(input, context) {
    const safe = await resolveSafePath(context.workspace, input.path, context.rules, {allowMissing: false});
    const previous = await readFile(safe.absolute, 'utf8');
    let next: string;
    if (input.line) {
      const lines = previous.split(/\r?\n/);
      const index = Math.min(lines.length, Math.max(0, input.position === 'line-end' ? input.line : input.line - 1));
      lines.splice(index, 0, input.text);
      next = lines.join(previous.includes('\r\n') ? '\r\n' : '\n');
    } else if (input.position === 'before') next = applyTextPatch(previous, {kind: 'insert-before', search: input.search ?? '', text: input.text});
    else next = applyTextPatch(previous, {kind: 'insert-after', search: input.search ?? '', text: input.text});
    return writeTextFile('insert_into_file', context, safe.relative, next, {dryRun: input.dryRun, expectedHash: input.expectedHash, expectedMtimeMs: input.expectedMtimeMs, previous, operation: 'patch-file'});
  }
});

export const appendToFileTool = tool({
  name: 'append_to_file',
  description: 'Append text to a workspace file preserving line endings.',
  schema: appendToFileSchema,
  async execute(input, context) {
    const safe = await resolveSafePath(context.workspace, input.path, context.rules, {allowMissing: false});
    const previous = await readFile(safe.absolute, 'utf8');
    const content = input.ensureNewline && !input.content.endsWith('\n') ? `${input.content}\n` : input.content;
    const next = applyTextPatch(previous, {kind: 'append', text: content});
    return writeTextFile('append_to_file', context, safe.relative, next, {dryRun: input.dryRun, expectedHash: input.expectedHash, expectedMtimeMs: input.expectedMtimeMs, previous, operation: 'patch-file'});
  }
});

export const deleteFileTool = tool({
  name: 'delete_file',
  description: 'Delete a workspace file. Always requires approval.',
  schema: deleteFileSchema,
  async execute(input, context) {
    requirePermission(context.permission, 'delete-file');
    const safe = await resolveSafePath(context.workspace, input.path, context.rules, {allowMissing: false});
    if (!safe.isFile) return result('delete_file', safe.relative, false, `Not a file: ${safe.relative}`, false);
    const approved = await approve(context, 'delete_file', safe.relative, 'delete file', 'File deletion is destructive', 'high');
    if (!approved) return result('delete_file', safe.relative, false, 'File deletion cancelled by user', false);
    if (input.dryRun) return result('delete_file', safe.relative, true, `Dry run: would delete ${safe.relative}`, false);
    await unlink(safe.absolute);
    return finish(context, {tool: 'delete_file', path: safe.relative, ok: true, changed: true, message: `Deleted ${safe.relative}`});
  }
});

export const renameFileTool = tool({name: 'rename_file', description: 'Rename a workspace file.', schema: renameFileSchema, async execute(input, context) { return moveOrCopyFile('rename_file', context, input.from, input.to, input.overwrite ?? false, input.dryRun ?? false, 'move'); }});
export const moveFileTool = tool({name: 'move_file', description: 'Move a workspace file.', schema: moveFileSchema, async execute(input, context) { return moveOrCopyFile('move_file', context, input.from, input.to, input.overwrite ?? false, input.dryRun ?? false, 'move'); }});
export const copyFileTool = tool({name: 'copy_file', description: 'Copy a workspace file.', schema: copyFileSchema, async execute(input, context) { return moveOrCopyFile('copy_file', context, input.from, input.to, input.overwrite ?? false, input.dryRun ?? false, 'copy'); }});

export const statPathTool = tool({
  name: 'stat_path',
  description: 'Return metadata for a workspace path.',
  schema: statPathSchema,
  async execute(input, context) {
    const safe = await resolveSafePath(context.workspace, input.path, context.rules, {allowMissing: false, checkIgnored: false});
    return {...result('stat_path', safe.relative, true, `${safe.relative}: ${safe.isDirectory ? 'directory' : 'file'} ${safe.size ?? 0} bytes`, false), data: safe};
  }
});

export const fileExistsTool = tool({
  name: 'file_exists',
  description: 'Check whether a workspace path exists.',
  schema: fileExistsSchema,
  async execute(input, context) {
    const safe = await resolveSafePath(context.workspace, input.path, context.rules, {allowMissing: true, checkIgnored: false});
    return {...result('file_exists', safe.relative, true, safe.exists ? 'exists' : 'missing', false), data: {exists: safe.exists, path: safe.relative}};
  }
});

export const filesystemTools: Tool[] = [readFileTool, readManyFilesTool, writeFileTool, createFileTool, patchFileTool, applyPatchTool, replaceInFileTool, insertIntoFileTool, appendToFileTool, deleteFileTool, renameFileTool, copyFileTool, moveFileTool, statPathTool, fileExistsTool];

async function writeTextFile(toolName: string, context: ToolContext, target: string, content: string, options: {dryRun?: boolean; overwrite?: boolean; expectedHash?: string; expectedMtimeMs?: number; previous?: string; operation: 'create-file' | 'write-file' | 'patch-file'}): Promise<ToolResult> {
  requirePermission(context.permission, options.operation);
  const safe = await resolveSafePath(context.workspace, target, context.rules, {allowMissing: true});
  const exists = await pathExists(safe.absolute);
  if (options.operation === 'create-file' && exists && !options.overwrite) return result(toolName, safe.relative, false, `File already exists: ${safe.relative}`, false);
  const previous = options.previous ?? (exists ? await readFile(safe.absolute, 'utf8') : '');
  const currentInfo = exists ? await stat(safe.absolute) : undefined;
  checkConcurrency(safe.relative, previous, currentInfo?.mtimeMs, options.expectedHash, options.expectedMtimeMs);
  const diff = unifiedDiff(safe.relative, previous, content);
  const risk = riskForPath(safe.relative);
  const warnings = await gitDirtyWarnings(context.workspace, safe.relative);
  for (const warning of warnings) context.log(warning);
  if ((exists && (options.overwrite || options.operation === 'create-file')) || risk.requiresApproval) {
    const approved = await approve(context, toolName, safe.relative, exists ? 'overwrite file' : 'modify protected file', risk.reason ?? 'Overwrite existing file', risk.risk);
    if (!approved) return result(toolName, safe.relative, false, `${toolName} cancelled by user`, false, diff);
  }
  if (options.dryRun) return {...result(toolName, safe.relative, true, diff || 'No changes', false, diff), warnings};
  await mkdir(path.dirname(safe.absolute), {recursive: true});
  await writeFile(safe.absolute, content, 'utf8');
  const verified = await readFile(safe.absolute, 'utf8');
  if (verified !== content) throw new Error(`Verification failed after writing ${safe.relative}`);
  return {...await finish(context, {tool: toolName, path: safe.relative, ok: true, changed: previous !== content, message: diff || `Wrote ${safe.relative}`, diff}), warnings};
}

async function moveOrCopyFile(toolName: string, context: ToolContext, fromPath: string, toPath: string, overwrite: boolean, dryRun: boolean, mode: 'move' | 'copy'): Promise<ToolResult> {
  requirePermission(context.permission, mode === 'copy' ? 'copy-file' : 'move-file');
  const from = await resolveSafePath(context.workspace, fromPath, context.rules, {allowMissing: false});
  const to = await resolveSafePath(context.workspace, toPath, context.rules, {allowMissing: true});
  if (!from.isFile) return result(toolName, from.relative, false, `Not a file: ${from.relative}`, false);
  if (await pathExists(to.absolute)) {
    if (!overwrite) return result(toolName, to.relative, false, `Destination already exists: ${to.relative}`, false);
    const approved = await approve(context, toolName, to.relative, 'overwrite destination', 'Destination exists', 'medium');
    if (!approved) return result(toolName, to.relative, false, `${toolName} cancelled by user`, false);
  }
  if (dryRun) return result(toolName, to.relative, true, `Dry run: would ${mode} ${from.relative} to ${to.relative}`, false);
  await mkdir(path.dirname(to.absolute), {recursive: true});
  if (mode === 'copy') await copyFile(from.absolute, to.absolute);
  else await rename(from.absolute, to.absolute);
  return finish(context, {tool: toolName, path: to.relative, ok: true, changed: true, message: `${mode === 'copy' ? 'Copied' : 'Moved'} ${from.relative} -> ${to.relative}`});
}

async function approve(context: ToolContext, toolName: string, filePath: string, action: string, reason: string, risk: 'low' | 'medium' | 'high'): Promise<boolean> {
  return context.askPermission({tool: toolName, path: filePath, action, reason, risk});
}

async function finish(context: ToolContext, entry: {tool: string; path?: string; ok: boolean; changed?: boolean; message: string; diff?: string; error?: string}): Promise<ToolResult> {
  await writeAuditLog({tool: entry.tool, workspace: context.workspace, path: entry.path, action: entry.tool, ok: entry.ok, changed: entry.changed, message: entry.message, error: entry.error});
  return result(entry.tool, entry.path, entry.ok, entry.message, entry.changed ?? false, entry.diff, entry.error);
}

function result(toolName: string, filePath: string | undefined, ok: boolean, message: string, changed: boolean, diff?: string, error?: string): ToolResult {
  return {ok, output: message, tool: toolName, path: filePath, changed, diff, message, error};
}

function checkConcurrency(filePath: string, previous: string, mtimeMs?: number, expectedHash?: string, expectedMtimeMs?: number): void {
  if (expectedHash && hash(previous) !== expectedHash) throw new Error(`Concurrent modification detected for ${filePath}`);
  if (expectedMtimeMs !== undefined && mtimeMs !== undefined && Math.abs(mtimeMs - expectedMtimeMs) > 1) throw new Error(`File modified time changed for ${filePath}`);
}

function hash(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

async function gitDirtyWarnings(workspace: string, relative: string): Promise<string[]> {
  const inside = await execa('git', ['rev-parse', '--is-inside-work-tree'], {cwd: workspace, reject: false});
  if (inside.exitCode !== 0) return [];
  const status = await execa('git', ['status', '--short', '--', relative], {cwd: workspace, reject: false});
  const output = status.stdout.trim();
  return output ? [`Warning: ${relative} has uncommitted git changes:\n${output}`] : [];
}
