import {cp, mkdir, readdir, rename, rm, stat} from 'node:fs/promises';
import path from 'node:path';
import {z} from 'zod';
import {writeAuditLog} from './audit.js';
import {requirePermission} from './permissions.js';
import {pathExists, resolveSafePath, riskForPath} from './path-safety.js';
import {tool, type Tool, type ToolContext, type ToolResult} from './types.js';

const listFolderSchema = z.object({path: z.string().default('.'), includeHidden: z.boolean().default(false), recursive: z.boolean().default(false), limit: z.number().int().positive().max(5000).default(500)});
const createFolderSchema = z.object({path: z.string(), recursive: z.boolean().default(true), dryRun: z.boolean().default(false)});
const deleteFolderSchema = z.object({path: z.string(), recursive: z.boolean().default(false), confirm: z.string().optional(), dryRun: z.boolean().default(false)});
const folderTransferSchema = z.object({from: z.string(), to: z.string(), overwrite: z.boolean().default(false), dryRun: z.boolean().default(false)});

export const listFolderTool = tool({
  name: 'list_folder',
  description: 'List folder contents inside the workspace.',
  schema: listFolderSchema,
  async execute(input, context) {
    const safe = await resolveSafePath(context.workspace, input.path ?? '.', context.rules, {allowMissing: false, checkIgnored: false, allowRoot: true});
    if (!safe.isDirectory) return result('list_folder', safe.relative || '.', false, `Not a folder: ${safe.relative || '.'}`, false);
    const entries = await collectEntries(safe.absolute, input.recursive ?? false, input.includeHidden ?? false, input.limit ?? 500);
    const root = safe.relative || '.';
    return {...result('list_folder', root, true, entries.length ? `${root}/\n${entries.map((entry) => `  ${entry}`).join('\n')}` : `${root}/ (empty)`, false), data: {count: entries.length}};
  }
});

export const createFolderTool = tool({
  name: 'create_folder',
  description: 'Create a folder inside the workspace, optionally creating parents.',
  schema: createFolderSchema,
  async execute(input, context) {
    requirePermission(context.permission, 'create-folder');
    const safe = await resolveSafePath(context.workspace, input.path, context.rules, {allowMissing: true});
    if (input.dryRun) return result('create_folder', safe.relative, true, `Dry run: would create folder ${safe.relative}`, false);
    await mkdir(safe.absolute, {recursive: input.recursive ?? true});
    return finish(context, {tool: 'create_folder', path: safe.relative, ok: true, changed: true, message: `Created folder: ${safe.relative}`});
  }
});

export const deleteFolderTool = tool({
  name: 'delete_folder',
  description: 'Delete a folder. Recursive deletion requires exact typed confirmation and approval.',
  schema: deleteFolderSchema,
  async execute(input, context) {
    requirePermission(context.permission, 'delete-folder');
    const safe = await resolveSafePath(context.workspace, input.path, context.rules, {allowMissing: false, checkIgnored: false});
    if (!safe.isDirectory) return result('delete_folder', safe.relative, false, `Not a folder: ${safe.relative}`, false);
    const info = await folderInfo(safe.absolute);
    const needsRecursive = info.files > 0 || info.folders > 0;
    if (needsRecursive && !input.recursive) return result('delete_folder', safe.relative, false, `Folder is not empty: ${safe.relative}. Set recursive=true and confirm deletion.`, false);
    const confirmationText = `delete ${safe.relative}`;
    if (input.confirm !== confirmationText) {
      return result('delete_folder', safe.relative, false, folderDeleteWarning(safe.relative, info, confirmationText), false);
    }
    const approved = await context.askPermission({tool: 'delete_folder', path: safe.relative, action: 'delete folder', reason: folderDeleteWarning(safe.relative, info, confirmationText), risk: 'high', confirmationText});
    if (!approved) return result('delete_folder', safe.relative, false, 'Folder deletion cancelled by user', false);
    if (input.dryRun) return result('delete_folder', safe.relative, true, `Dry run: would delete folder ${safe.relative}`, false);
    await rm(safe.absolute, {recursive: needsRecursive, force: false});
    return finish(context, {tool: 'delete_folder', path: safe.relative, ok: true, changed: true, message: `Deleted folder: ${safe.relative}`});
  }
});

export const copyFolderTool = tool({
  name: 'copy_folder',
  description: 'Recursively copy a workspace folder.',
  schema: folderTransferSchema,
    async execute(input, context) { return transferFolder('copy_folder', context, input.from, input.to, input.overwrite ?? false, input.dryRun ?? false, 'copy'); }
});

export const moveFolderTool = tool({
  name: 'move_folder',
  description: 'Move a workspace folder.',
  schema: folderTransferSchema,
    async execute(input, context) { return transferFolder('move_folder', context, input.from, input.to, input.overwrite ?? false, input.dryRun ?? false, 'move'); }
});

export const renameFolderTool = tool({
  name: 'rename_folder',
  description: 'Rename a workspace folder.',
  schema: folderTransferSchema,
    async execute(input, context) { return transferFolder('rename_folder', context, input.from, input.to, input.overwrite ?? false, input.dryRun ?? false, 'move'); }
});

export const folderTools: Tool[] = [listFolderTool, createFolderTool, deleteFolderTool, copyFolderTool, moveFolderTool, renameFolderTool];

async function transferFolder(toolName: string, context: ToolContext, fromPath: string, toPath: string, overwrite: boolean, dryRun: boolean, mode: 'copy' | 'move'): Promise<ToolResult> {
  requirePermission(context.permission, mode === 'copy' ? 'copy-folder' : 'move-folder');
  const from = await resolveSafePath(context.workspace, fromPath, context.rules, {allowMissing: false, checkIgnored: false});
  const to = await resolveSafePath(context.workspace, toPath, context.rules, {allowMissing: true});
  if (!from.isDirectory) return result(toolName, from.relative, false, `Not a folder: ${from.relative}`, false);
  if (await pathExists(to.absolute)) {
    if (!overwrite) return result(toolName, to.relative, false, `Destination already exists: ${to.relative}`, false);
    const approved = await context.askPermission({tool: toolName, path: to.relative, action: 'overwrite folder destination', reason: 'Destination folder already exists', risk: 'high'});
    if (!approved) return result(toolName, to.relative, false, `${toolName} cancelled by user`, false);
  }
  const info = await folderInfo(from.absolute);
  if (info.files > 100 || info.size > 10 * 1024 * 1024 || riskForPath(from.relative).requiresApproval) {
    const approved = await context.askPermission({tool: toolName, path: from.relative, action: `${mode} large folder`, reason: `Folder contains ${info.files} files (${formatBytes(info.size)})`, risk: 'medium'});
    if (!approved) return result(toolName, from.relative, false, `${toolName} cancelled by user`, false);
  }
  if (dryRun) return result(toolName, to.relative, true, `Dry run: would ${mode} ${from.relative} -> ${to.relative}`, false);
  await mkdir(path.dirname(to.absolute), {recursive: true});
  if (mode === 'copy') await cp(from.absolute, to.absolute, {recursive: true, force: overwrite, errorOnExist: !overwrite});
  else await rename(from.absolute, to.absolute);
  return finish(context, {tool: toolName, path: to.relative, ok: true, changed: true, message: `${mode === 'copy' ? 'Copied' : 'Moved'} folder ${from.relative} -> ${to.relative}`});
}

async function collectEntries(root: string, recursive: boolean, includeHidden: boolean, limit: number, prefix = ''): Promise<string[]> {
  const raw = await readdir(root, {withFileTypes: true});
  const entries: string[] = [];
  for (const entry of raw.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entries.length >= limit) break;
    if (!includeHidden && entry.name.startsWith('.')) continue;
    const label = `${prefix}${entry.name}${entry.isDirectory() ? '/' : ''}`;
    entries.push(label);
    if (recursive && entry.isDirectory()) entries.push(...await collectEntries(path.join(root, entry.name), true, includeHidden, limit - entries.length, `${prefix}${entry.name}/`));
  }
  return entries.slice(0, limit);
}

async function folderInfo(root: string): Promise<{files: number; folders: number; size: number}> {
  let files = 0;
  let folders = 0;
  let size = 0;
  for (const entry of await readdir(root, {withFileTypes: true})) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) {
      folders++;
      const child = await folderInfo(absolute);
      files += child.files;
      folders += child.folders;
      size += child.size;
    } else {
      files++;
      size += (await stat(absolute)).size;
    }
  }
  return {files, folders, size};
}

function folderDeleteWarning(folderPath: string, info: {files: number; folders: number; size: number}, confirmationText: string): string {
  return [`OpenSyntax wants to delete folder:`, '', folderPath, '', `Files: ${info.files}`, `Folders: ${info.folders}`, `Size: ${formatBytes(info.size)}`, '', 'Type exactly:', confirmationText].join('\n');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function finish(context: ToolContext, entry: {tool: string; path?: string; ok: boolean; changed?: boolean; message: string; error?: string}): Promise<ToolResult> {
  await writeAuditLog({tool: entry.tool, workspace: context.workspace, path: entry.path, action: entry.tool, ok: entry.ok, changed: entry.changed, message: entry.message, error: entry.error});
  return result(entry.tool, entry.path, entry.ok, entry.message, entry.changed ?? false, entry.error);
}

function result(toolName: string, folderPath: string | undefined, ok: boolean, message: string, changed: boolean, error?: string): ToolResult {
  return {ok, output: message, tool: toolName, path: folderPath, changed, message, error};
}
