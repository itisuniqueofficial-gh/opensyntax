import {mkdtemp, readFile, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {describe, expect, it} from 'vitest';
import {readFileTool, patchFileTool} from '../tools/filesystem.js';
import {listFilesTool} from '../tools/search.js';
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
});
