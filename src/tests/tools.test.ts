import {mkdtemp, readFile, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {describe, expect, it} from 'vitest';
import {readFileTool, patchFileTool, writeFileTool} from '../tools/filesystem.js';
import {listFilesTool} from '../tools/search.js';
import {executeCommandTool} from '../tools/shell.js';
import type {ToolContext} from '../tools/types.js';

async function context(): Promise<ToolContext> {
  const workspace = await mkdtemp(path.join(os.tmpdir(), 'opensyntax-'));
  return {workspace, permission: 'workspace-write', log: () => undefined, askPermission: async () => true};
}

describe('tools', () => {
  it('reads files with line numbers', async () => {
    const ctx = await context();
    await writeFile(path.join(ctx.workspace, 'a.ts'), 'one\ntwo\n', 'utf8');
    const result = await readFileTool.execute({path: 'a.ts', maxLines: 2}, ctx);
    expect(result.output).toContain('1: one');
  });

  it('patches exact text only', async () => {
    const ctx = await context();
    const file = path.join(ctx.workspace, 'a.ts');
    await writeFile(file, 'const a = 1;\n', 'utf8');
    const result = await patchFileTool.execute({path: 'a.ts', search: '1', replace: '2'}, ctx);
    expect(result.ok).toBe(true);
    expect(await readFile(file, 'utf8')).toContain('2');
  });

  it('lists workspace files', async () => {
    const ctx = await context();
    await writeFile(path.join(ctx.workspace, 'a.ts'), 'x', 'utf8');
    const result = await listFilesTool.execute({pattern: '**/*', limit: 10}, ctx);
    expect(result.output).toContain('a.ts');
  });

  it('blocks edits forbidden by workspace rules', async () => {
    const ctx = await context();
    ctx.rules = {...ctx.rules!, files: [], effectiveBullets: [], restrictions: [], shellRules: [], testingRules: [], forbiddenPaths: ['dist/'], ignoredFiles: [], prompt: '', tokenEstimate: 0, debug: '', loadedAt: new Date().toISOString()};
    await expect(writeFileTool.execute({path: 'dist/a.js', content: 'x'}, ctx)).rejects.toThrow('Workspace rules prohibit editing dist/');
  });

  it('blocks shell commands forbidden by package manager rules', async () => {
    const ctx = await context();
    ctx.permission = 'shell-safe';
    ctx.rules = {...ctx.rules!, files: [], effectiveBullets: [], restrictions: [], shellRules: ['Use bun only.'], testingRules: [], forbiddenPaths: [], ignoredFiles: [], prompt: '', tokenEstimate: 0, debug: '', loadedAt: new Date().toISOString()};
    await expect(executeCommandTool.execute({command: 'npm install', intent: 'install deps', timeoutMs: 1000}, ctx)).rejects.toThrow('Workspace rules prohibit npm commands');
  });
});
