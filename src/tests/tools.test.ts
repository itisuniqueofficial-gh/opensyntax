import {mkdtemp, readFile, writeFile, mkdir, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {describe, expect, it} from 'vitest';
import {appendToFileTool, applyPatchTool, copyFileTool, createFileTool, deleteFileTool, fileExistsTool, insertIntoFileTool, moveFileTool, patchFileTool, readFileTool, renameFileTool, replaceInFileTool, statPathTool, writeFileTool} from '../tools/filesystem.js';
import {copyFolderTool, createFolderTool, deleteFolderTool, listFolderTool, moveFolderTool, renameFolderTool} from '../tools/folder.js';
import {listFilesTool} from '../tools/search.js';
import {executeCommandTool} from '../tools/shell.js';
import {auditLogPath} from '../tools/audit.js';
import type {ToolContext} from '../tools/types.js';

async function context(permission: ToolContext['permission'] = 'workspace-write'): Promise<ToolContext & {approvals: string[]; logs: string[]}> {
  const workspace = await mkdtemp(path.join(os.tmpdir(), 'opensyntax-'));
  const approvals: string[] = [];
  const logs: string[] = [];
  return {workspace, permission, approvals, logs, log: (message) => logs.push(message), askPermission: async (request) => { approvals.push(`${request.tool ?? request.action}:${request.path ?? ''}`); return true; }};
}

describe('tools', () => {
  it('creates and reads files with structured output', async () => {
    const ctx = await context();
    const created = await createFileTool.execute({path: 'docs/test/hello.md', content: 'hello\n'}, ctx);
    expect(created.ok).toBe(true);
    expect(created.tool).toBe('create_file');
    const read = await readFileTool.execute({path: 'docs/test/hello.md', maxLines: 2}, ctx);
    expect(read.output).toContain('1: hello');
  });

  it('reads many files', async () => {
    const ctx = await context();
    await createFileTool.execute({path: 'a.txt', content: 'a'}, ctx);
    await createFileTool.execute({path: 'b.txt', content: 'b'}, ctx);
    const result = await (await import('../tools/filesystem.js')).readManyFilesTool.execute({paths: ['a.txt', 'b.txt']}, ctx);
    expect(result.output).toContain('## a.txt');
    expect(result.output).toContain('## b.txt');
  });

  it('edits files with exact patch and replacement', async () => {
    const ctx = await context();
    await createFileTool.execute({path: 'a.ts', content: 'const a = 1;\n'}, ctx);
    await patchFileTool.execute({path: 'a.ts', search: '1', replace: '2'}, ctx);
    await replaceInFileTool.execute({path: 'a.ts', search: 'const', replace: 'let'}, ctx);
    expect(await readFile(path.join(ctx.workspace, 'a.ts'), 'utf8')).toBe('let a = 2;\n');
  });

  it('supports append, insert, and unified apply_patch', async () => {
    const ctx = await context();
    await createFileTool.execute({path: 'a.txt', content: 'one\nthree\n'}, ctx);
    await insertIntoFileTool.execute({path: 'a.txt', search: 'three', text: 'two\n', position: 'before'}, ctx);
    await appendToFileTool.execute({path: 'a.txt', content: 'four'}, ctx);
    const before = await readFile(path.join(ctx.workspace, 'a.txt'), 'utf8');
    const patch = ['Index: a.txt', '===================================================================', '--- a.txt\tbefore', '+++ a.txt\tafter', '@@ -1,4 +1,4 @@', ' one', ' two', '-three', '+THREE', ' four', ''].join('\n');
    await applyPatchTool.execute({path: 'a.txt', patch}, ctx);
    expect(before).toContain('three');
    expect(await readFile(path.join(ctx.workspace, 'a.txt'), 'utf8')).toContain('THREE');
  });

  it('preserves CRLF line endings for text patches', async () => {
    const ctx = await context();
    await writeFile(path.join(ctx.workspace, 'crlf.txt'), 'a\r\nb\r\n', 'utf8');
    await replaceInFileTool.execute({path: 'crlf.txt', search: 'b', replace: 'c'}, ctx);
    expect(await readFile(path.join(ctx.workspace, 'crlf.txt'), 'utf8')).toBe('a\r\nc\r\n');
  });

  it('creates, lists, copies, moves, and renames folders', async () => {
    const ctx = await context();
    await createFolderTool.execute({path: 'docs/test'}, ctx);
    await createFileTool.execute({path: 'docs/test/hello.md', content: 'hello'}, ctx);
    expect((await listFolderTool.execute({path: 'docs/test'}, ctx)).output).toContain('hello.md');
    await copyFolderTool.execute({from: 'docs/test', to: 'docs/copy'}, ctx);
    await moveFolderTool.execute({from: 'docs/copy', to: 'docs/moved'}, ctx);
    await renameFolderTool.execute({from: 'docs/moved', to: 'docs/renamed'}, ctx);
    expect((await fileExistsTool.execute({path: 'docs/renamed/hello.md'}, ctx)).data).toMatchObject({exists: true});
  });

  it('moves, copies, and renames files', async () => {
    const ctx = await context();
    await createFileTool.execute({path: 'a.txt', content: 'a'}, ctx);
    await copyFileTool.execute({from: 'a.txt', to: 'b.txt'}, ctx);
    await moveFileTool.execute({from: 'b.txt', to: 'c.txt'}, ctx);
    await renameFileTool.execute({from: 'c.txt', to: 'd.txt'}, ctx);
    expect(await readFile(path.join(ctx.workspace, 'd.txt'), 'utf8')).toBe('a');
  });

  it('requires approval for delete_file', async () => {
    const ctx = await context();
    await createFileTool.execute({path: 'a.txt', content: 'a'}, ctx);
    const result = await deleteFileTool.execute({path: 'a.txt'}, ctx);
    expect(result.ok).toBe(true);
    expect(ctx.approvals[0]).toContain('delete_file:a.txt');
  });

  it('requires exact folder delete confirmation', async () => {
    const ctx = await context();
    await createFolderTool.execute({path: 'old'}, ctx);
    await createFileTool.execute({path: 'old/a.txt', content: 'a'}, ctx);
    const rejected = await deleteFolderTool.execute({path: 'old', recursive: true}, ctx);
    expect(rejected.ok).toBe(false);
    expect(rejected.output).toContain('delete old');
    const deleted = await deleteFolderTool.execute({path: 'old', recursive: true, confirm: 'delete old'}, ctx);
    expect(deleted.ok).toBe(true);
  });

  it('blocks read-only writes and allows read', async () => {
    const ctx = await context('read-only');
    await writeFile(path.join(ctx.workspace, 'a.txt'), 'a', 'utf8');
    expect((await readFileTool.execute({path: 'a.txt'}, ctx)).ok).toBe(true);
    await expect(createFileTool.execute({path: 'b.txt', content: 'b'}, ctx)).rejects.toThrow('read-only');
  });

  it('blocks path traversal and outside workspace access', async () => {
    const ctx = await context();
    await expect(createFileTool.execute({path: '../escape.txt', content: 'x'}, ctx)).rejects.toThrow(/escapes workspace|traversal/);
    await expect(createFileTool.execute({path: path.join(ctx.workspace, '..', 'escape.txt'), content: 'x'}, ctx)).rejects.toThrow(/escapes workspace|traversal/);
  });

  it('blocks .git deletion', async () => {
    const ctx = await context();
    await mkdir(path.join(ctx.workspace, '.git'), {recursive: true});
    await expect(deleteFolderTool.execute({path: '.git', recursive: true, confirm: 'delete .git'}, ctx)).rejects.toThrow('.git');
  });

  it('normalizes Windows-style paths', async () => {
    const ctx = await context();
    await createFileTool.execute({path: 'docs\\test\\hello.md', content: 'hello'}, ctx);
    expect(await readFile(path.join(ctx.workspace, 'docs', 'test', 'hello.md'), 'utf8')).toBe('hello');
  });

  it('warns when editing a dirty git file', async () => {
    const ctx = await context();
    const {execa} = await import('execa');
    await execa('git', ['init'], {cwd: ctx.workspace});
    await execa('git', ['config', 'user.email', 'test@example.com'], {cwd: ctx.workspace});
    await execa('git', ['config', 'user.name', 'Test'], {cwd: ctx.workspace});
    await writeFile(path.join(ctx.workspace, 'a.txt'), 'a', 'utf8');
    await execa('git', ['add', 'a.txt'], {cwd: ctx.workspace});
    await execa('git', ['commit', '-m', 'init'], {cwd: ctx.workspace});
    await writeFile(path.join(ctx.workspace, 'a.txt'), 'dirty', 'utf8');
    const result = await writeFileTool.execute({path: 'a.txt', content: 'clean'}, ctx);
    expect(result.warnings?.join('\n')).toContain('uncommitted git changes');
  });

  it('creates audit logs for writes', async () => {
    const ctx = await context();
    await createFileTool.execute({path: 'audit.txt', content: 'audit'}, ctx);
    const log = await readFile(auditLogPath, 'utf8');
    expect(log).toContain('create_file');
  });

  it('returns stat metadata', async () => {
    const ctx = await context();
    await createFileTool.execute({path: 'a.txt', content: 'a'}, ctx);
    const result = await statPathTool.execute({path: 'a.txt'}, ctx);
    expect(result.output).toContain('1 bytes');
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
