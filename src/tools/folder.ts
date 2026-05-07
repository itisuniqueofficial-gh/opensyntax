/**
 * Folder management tools: create_folder, delete_folder, list_folder.
 * All operations are workspace-bound and safety-checked.
 */

import {mkdir, rm, readdir, stat} from 'node:fs/promises';
import path from 'node:path';
import {z} from 'zod';
import {ensureDir, relativePath, resolveWorkspacePath} from '../utils/paths.js';
import {isAlwaysBlocked, buildFolderDeletePrompt, pathExists} from './safety.js';
import {requirePermission} from './permissions.js';
import {tool, type Tool} from './types.js';

// ---------------------------------------------------------------------------
// create_folder
// ---------------------------------------------------------------------------

export const createFolderTool = tool({
  name: 'create_folder',
  description: 'Create a folder (and any missing parent folders) inside the workspace.',
  schema: z.object({
    path: z.string().describe('Relative path of the folder to create')
  }),
  async execute(input, context) {
    requirePermission(context.permission, 'create-folder');
    const absolute = resolveWorkspacePath(context.workspace, input.path);
    const blocked = isAlwaysBlocked(context.workspace, absolute);
    if (blocked.blocked) throw new Error(blocked.reason);
    await ensureDir(absolute);
    return {ok: true, output: `Created folder: ${relativePath(context.workspace, absolute)}`};
  }
});

// ---------------------------------------------------------------------------
// delete_folder
// ---------------------------------------------------------------------------

export const deleteFolderTool = tool({
  name: 'delete_folder',
  description: 'Recursively delete a folder inside the workspace. Always requires explicit user approval.',
  schema: z.object({
    path: z.string().describe('Relative path of the folder to delete'),
    confirm: z.string().optional().describe('Type "delete <path>" to confirm the deletion')
  }),
  async execute(input, context) {
    requirePermission(context.permission, 'delete-folder');
    const absolute = resolveWorkspacePath(context.workspace, input.path);
    const relative = relativePath(context.workspace, absolute).replaceAll('\\', '/');

    // Always-blocked check
    const blocked = isAlwaysBlocked(context.workspace, absolute);
    if (blocked.blocked) throw new Error(blocked.reason);

    // Existence check
    if (!await pathExists(absolute)) return {ok: false, output: `Folder not found: ${relative}`};

    // Require explicit confirmation string
    const expectedConfirm = `delete ${relative}`;
    if (input.confirm?.trim() !== expectedConfirm) {
      const prompt = await buildFolderDeletePrompt(context.workspace, absolute);
      return {ok: false, output: `${prompt}\n\nProvide confirm="${expectedConfirm}" to proceed.`};
    }

    // Ask permission via the approval system
    const approved = await context.askPermission({
      action: `delete folder ${relative}`,
      reason: 'Recursive folder deletion requested',
      risk: 'high'
    });
    if (!approved) return {ok: false, output: 'Folder deletion cancelled by user'};

    await rm(absolute, {recursive: true, force: true});
    return {ok: true, output: `Deleted folder: ${relative}`};
  }
});

// ---------------------------------------------------------------------------
// list_folder
// ---------------------------------------------------------------------------

export const listFolderTool = tool({
  name: 'list_folder',
  description: 'List the direct contents of a folder inside the workspace.',
  schema: z.object({
    path: z.string().default('.').describe('Relative path of the folder to list'),
    includeHidden: z.boolean().default(false).describe('Include hidden files and folders')
  }),
  async execute(input, context) {
    const absolute = resolveWorkspacePath(context.workspace, input.path ?? '.');
    let entries: string[];
    try {
      const raw = await readdir(absolute, {withFileTypes: true});
      entries = raw
        .filter((entry) => input.includeHidden || !entry.name.startsWith('.'))
        .map((entry) => {
          const suffix = entry.isDirectory() ? '/' : '';
          return `${entry.name}${suffix}`;
        })
        .sort();
    } catch {
      return {ok: false, output: `Cannot read folder: ${input.path}`};
    }
    const relative = relativePath(context.workspace, absolute) || '.';
    return {ok: true, output: entries.length ? `${relative}/\n${entries.map((e) => `  ${e}`).join('\n')}` : `${relative}/ (empty)`};
  }
});

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const folderTools: Tool[] = [createFolderTool, deleteFolderTool, listFolderTool];
