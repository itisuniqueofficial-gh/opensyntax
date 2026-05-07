/**
 * Tests for provider system, model registry, capabilities, and permission system.
 */

import {describe, expect, it} from 'vitest';
import {mkdtemp, writeFile, mkdir} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {providerRegistry, getProvider, requireProvider} from '../providers/registry.js';
import {modelRegistry, modelsForProvider, findModel, capabilityBadges, allModelsForProvider} from '../model/registry.js';
import {checkCapability, fallbackModel, modelUnavailableMessage, isReasoningModel} from '../model/capabilities.js';
import {checkPermission, requirePermission, canWrite, canShell} from '../tools/permissions.js';
import {isAlwaysBlocked, requiresApproval, normalizePath, safeResolve} from '../tools/safety.js';
import {createFileTool, deleteFileTool, renameFileTool, copyFileTool, moveFileTool, replaceInFileTool} from '../tools/filesystem.js';
import {createFolderTool, listFolderTool} from '../tools/folder.js';
import type {ToolContext} from '../tools/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function tmpWorkspace(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), 'opensyntax-test-'));
}

function makeContext(workspace: string, permission: ToolContext['permission'] = 'workspace-write'): ToolContext {
  return {
    workspace,
    permission,
    log: () => undefined,
    askPermission: async () => true
  };
}

// ---------------------------------------------------------------------------
// Provider registry
// ---------------------------------------------------------------------------

describe('provider registry', () => {
  it('contains all required providers', () => {
    const ids = providerRegistry.map((p) => p.id);
    for (const id of ['openai', 'anthropic', 'gemini', 'openrouter', 'groq', 'together', 'nvidia', 'deepseek', 'mistral', 'ollama', 'lmstudio', 'azure-openai']) {
      expect(ids).toContain(id);
    }
  });

  it('getProvider returns undefined for unknown id', () => {
    expect(getProvider('unknown-provider-xyz')).toBeUndefined();
  });

  it('requireProvider throws for unknown id', () => {
    expect(() => requireProvider('unknown-provider-xyz')).toThrow('Unsupported provider');
  });

  it('all providers have required fields', () => {
    for (const p of providerRegistry) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.defaultModel).toBeTruthy();
      expect(Array.isArray(p.authMethods)).toBe(true);
      expect(typeof p.requiresApiKey).toBe('boolean');
      expect(typeof p.supportsStreaming).toBe('boolean');
      expect(typeof p.supportsTools).toBe('boolean');
    }
  });

  it('local providers do not require API keys', () => {
    const local = providerRegistry.filter((p) => p.category === 'local');
    for (const p of local) {
      expect(p.requiresApiKey).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Model registry
// ---------------------------------------------------------------------------

describe('model registry', () => {
  it('contains models for all major providers', () => {
    for (const providerId of ['openai', 'anthropic', 'gemini', 'groq', 'deepseek', 'mistral']) {
      const models = modelsForProvider(providerId);
      expect(models.length).toBeGreaterThan(0);
    }
  });

  it('findModel returns correct entry', () => {
    const model = findModel('openai', 'gpt-4.1');
    expect(model).toBeDefined();
    expect(model?.name).toBe('GPT-4.1');
    expect(model?.supportsTools).toBe(true);
  });

  it('findModel returns undefined for unknown model', () => {
    expect(findModel('openai', 'gpt-99-nonexistent')).toBeUndefined();
  });

  it('capabilityBadges returns array of strings', () => {
    const model = findModel('openai', 'gpt-4.1');
    expect(model).toBeDefined();
    const badges = capabilityBadges(model!);
    expect(Array.isArray(badges)).toBe(true);
    expect(badges).toContain('tools');
    expect(badges).toContain('streaming');
  });

  it('speculative models are excluded from modelsForProvider', () => {
    const confirmed = modelsForProvider('openai');
    const all = allModelsForProvider('openai');
    // Speculative models should only appear in allModels
    const speculativeInConfirmed = confirmed.filter((m) => m.speculative);
    expect(speculativeInConfirmed).toHaveLength(0);
    expect(all.length).toBeGreaterThanOrEqual(confirmed.length);
  });

  it('reasoning models are correctly identified', () => {
    expect(isReasoningModel('o3-mini')).toBe(true);
    expect(isReasoningModel('o4-mini')).toBe(true);
    expect(isReasoningModel('deepseek-reasoner')).toBe(true);
    expect(isReasoningModel('gpt-4.1')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Model capabilities
// ---------------------------------------------------------------------------

describe('model capabilities', () => {
  it('checkCapability returns supported for known model', () => {
    const result = checkCapability('openai', 'gpt-4.1', 'supportsTools');
    expect(result.supported).toBe(true);
  });

  it('checkCapability returns unsupported for model without vision', () => {
    const result = checkCapability('groq', 'llama-3.1-8b-instant', 'supportsVision');
    expect(result.supported).toBe(false);
  });

  it('checkCapability assumes supported for unknown model', () => {
    const result = checkCapability('openai', 'gpt-99-unknown', 'supportsTools');
    expect(result.supported).toBe(true);
  });

  it('fallbackModel returns a different model', () => {
    const fb = fallbackModel('openai', 'gpt-4.1');
    expect(fb).toBeDefined();
    expect(fb?.id).not.toBe('gpt-4.1');
  });

  it('fallbackModel prefers available ids', () => {
    const fb = fallbackModel('openai', 'gpt-4.1', ['gpt-4o-mini', 'gpt-4o']);
    // Should return one of the available models (registry order determines which)
    expect(['gpt-4o-mini', 'gpt-4o']).toContain(fb?.id);
  });

  it('modelUnavailableMessage includes fallback suggestion', () => {
    const msg = modelUnavailableMessage('openai', 'gpt-99-nonexistent');
    expect(msg).toContain('Model unavailable');
    expect(msg).toContain('/model');
  });
});

// ---------------------------------------------------------------------------
// Permission system
// ---------------------------------------------------------------------------

describe('permission system', () => {
  it('read-only allows reads', () => {
    expect(checkPermission('read-only', 'read').allowed).toBe(true);
  });

  it('read-only blocks writes', () => {
    expect(checkPermission('read-only', 'write-file').allowed).toBe(false);
  });

  it('read-only blocks shell', () => {
    expect(checkPermission('read-only', 'shell').allowed).toBe(false);
  });

  it('workspace-write allows file creation', () => {
    expect(checkPermission('workspace-write', 'create-file').allowed).toBe(true);
  });

  it('workspace-write blocks shell', () => {
    expect(checkPermission('workspace-write', 'shell').allowed).toBe(false);
  });

  it('workspace-write requires approval for delete', () => {
    const result = checkPermission('workspace-write', 'delete-file');
    expect(result.allowed).toBe(true);
    expect(result.requiresApproval).toBe(true);
  });

  it('shell-safe allows shell', () => {
    expect(checkPermission('shell-safe', 'shell').allowed).toBe(true);
  });

  it('full-access allows everything', () => {
    expect(checkPermission('full-access', 'shell').allowed).toBe(true);
    expect(checkPermission('full-access', 'write-file').allowed).toBe(true);
  });

  it('full-access still requires approval for deletes', () => {
    const result = checkPermission('full-access', 'delete-file');
    expect(result.requiresApproval).toBe(true);
  });

  it('requirePermission throws for blocked operation', () => {
    expect(() => requirePermission('read-only', 'write-file')).toThrow();
  });

  it('canWrite returns false for read-only', () => {
    expect(canWrite('read-only')).toBe(false);
    expect(canWrite('workspace-write')).toBe(true);
  });

  it('canShell returns false for workspace-write', () => {
    expect(canShell('workspace-write')).toBe(false);
    expect(canShell('shell-safe')).toBe(true);
    expect(canShell('full-access')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Safety checks
// ---------------------------------------------------------------------------

describe('safety checks', () => {
  it('blocks .git directory', async () => {
    const workspace = await tmpWorkspace();
    const gitPath = path.join(workspace, '.git', 'config');
    const result = isAlwaysBlocked(workspace, gitPath);
    expect(result.blocked).toBe(true);
  });

  it('blocks node_modules', async () => {
    const workspace = await tmpWorkspace();
    const nmPath = path.join(workspace, 'node_modules', 'pkg', 'index.js');
    const result = isAlwaysBlocked(workspace, nmPath);
    expect(result.blocked).toBe(true);
  });

  it('allows normal workspace files', async () => {
    const workspace = await tmpWorkspace();
    const filePath = path.join(workspace, 'src', 'index.ts');
    const result = isAlwaysBlocked(workspace, filePath);
    expect(result.blocked).toBe(false);
  });

  it('flags .env files as requiring approval', async () => {
    const workspace = await tmpWorkspace();
    const envPath = path.join(workspace, '.env');
    const result = requiresApproval(workspace, envPath);
    expect(result.required).toBe(true);
  });

  it('flags lockfiles as requiring approval', async () => {
    const workspace = await tmpWorkspace();
    const lockPath = path.join(workspace, 'package-lock.json');
    const result = requiresApproval(workspace, lockPath);
    expect(result.required).toBe(true);
  });

  it('normalizes Windows paths', () => {
    const normalized = normalizePath('src\\tools\\filesystem.ts');
    expect(normalized).toContain('/');
  });

  it('safeResolve blocks path traversal', async () => {
    const workspace = await tmpWorkspace();
    expect(() => safeResolve(workspace, '../../etc/passwd')).toThrow('escapes workspace');
  });

  it('safeResolve allows workspace-relative paths', async () => {
    const workspace = await tmpWorkspace();
    const resolved = safeResolve(workspace, 'src/index.ts');
    expect(resolved).toContain('src');
  });
});

// ---------------------------------------------------------------------------
// New filesystem tools
// ---------------------------------------------------------------------------

describe('filesystem tools — create/delete/rename/copy/move/replace', () => {
  it('create_file creates a new file', async () => {
    const workspace = await tmpWorkspace();
    const ctx = makeContext(workspace);
    const result = await createFileTool.execute({path: 'hello.ts', content: 'export {}', overwrite: false}, ctx);
    expect(result.ok).toBe(true);
    expect(result.output).toContain('hello.ts');
  });

  it('create_file fails if file exists without overwrite', async () => {
    const workspace = await tmpWorkspace();
    const ctx = makeContext(workspace);
    await writeFile(path.join(workspace, 'exists.ts'), 'x', 'utf8');
    const result = await createFileTool.execute({path: 'exists.ts', content: 'y', overwrite: false}, ctx);
    expect(result.ok).toBe(false);
    expect(result.output).toContain('already exists');
  });

  it('create_file creates parent directories', async () => {
    const workspace = await tmpWorkspace();
    const ctx = makeContext(workspace);
    const result = await createFileTool.execute({path: 'deep/nested/file.ts', content: 'x', overwrite: false}, ctx);
    expect(result.ok).toBe(true);
  });

  it('rename_file renames a file', async () => {
    const workspace = await tmpWorkspace();
    const ctx = makeContext(workspace);
    await writeFile(path.join(workspace, 'old.ts'), 'x', 'utf8');
    const result = await renameFileTool.execute({from: 'old.ts', to: 'new.ts'}, ctx);
    expect(result.ok).toBe(true);
    expect(result.output).toContain('new.ts');
  });

  it('copy_file copies a file', async () => {
    const workspace = await tmpWorkspace();
    const ctx = makeContext(workspace);
    await writeFile(path.join(workspace, 'source.ts'), 'content', 'utf8');
    const result = await copyFileTool.execute({from: 'source.ts', to: 'dest.ts', overwrite: false}, ctx);
    expect(result.ok).toBe(true);
  });

  it('move_file moves a file', async () => {
    const workspace = await tmpWorkspace();
    const ctx = makeContext(workspace);
    await writeFile(path.join(workspace, 'moveme.ts'), 'x', 'utf8');
    const result = await moveFileTool.execute({from: 'moveme.ts', to: 'moved.ts', overwrite: false}, ctx);
    expect(result.ok).toBe(true);
  });

  it('replace_in_file replaces text', async () => {
    const workspace = await tmpWorkspace();
    const ctx = makeContext(workspace);
    await writeFile(path.join(workspace, 'replace.ts'), 'const x = 1;\n', 'utf8');
    const result = await replaceInFileTool.execute({path: 'replace.ts', search: '1', replace: '2', all: false}, ctx);
    expect(result.ok).toBe(true);
  });

  it('replace_in_file returns error when text not found', async () => {
    const workspace = await tmpWorkspace();
    const ctx = makeContext(workspace);
    await writeFile(path.join(workspace, 'noreplace.ts'), 'const x = 1;\n', 'utf8');
    const result = await replaceInFileTool.execute({path: 'noreplace.ts', search: 'NOTFOUND', replace: 'x', all: false}, ctx);
    expect(result.ok).toBe(false);
  });

  it('delete_file requires approval', async () => {
    const workspace = await tmpWorkspace();
    let approvalCalled = false;
    const ctx: ToolContext = {
      workspace,
      permission: 'workspace-write',
      log: () => undefined,
      askPermission: async () => { approvalCalled = true; return false; }
    };
    await writeFile(path.join(workspace, 'todelete.ts'), 'x', 'utf8');
    const result = await deleteFileTool.execute({path: 'todelete.ts', confirm: false}, ctx);
    expect(approvalCalled).toBe(true);
    expect(result.ok).toBe(false); // user denied
  });

  it('delete_file is blocked for read-only permission', async () => {
    const workspace = await tmpWorkspace();
    const ctx = makeContext(workspace, 'read-only');
    await writeFile(path.join(workspace, 'todelete.ts'), 'x', 'utf8');
    await expect(deleteFileTool.execute({path: 'todelete.ts', confirm: false}, ctx)).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Folder tools
// ---------------------------------------------------------------------------

describe('folder tools', () => {
  it('create_folder creates a directory', async () => {
    const workspace = await tmpWorkspace();
    const ctx = makeContext(workspace);
    const result = await createFolderTool.execute({path: 'new-folder'}, ctx);
    expect(result.ok).toBe(true);
    expect(result.output).toContain('new-folder');
  });

  it('create_folder creates nested directories', async () => {
    const workspace = await tmpWorkspace();
    const ctx = makeContext(workspace);
    const result = await createFolderTool.execute({path: 'a/b/c'}, ctx);
    expect(result.ok).toBe(true);
  });

  it('list_folder lists directory contents', async () => {
    const workspace = await tmpWorkspace();
    const ctx = makeContext(workspace);
    await writeFile(path.join(workspace, 'file.ts'), 'x', 'utf8');
    await mkdir(path.join(workspace, 'subdir'), {recursive: true});
    const result = await listFolderTool.execute({path: '.', includeHidden: false}, ctx);
    expect(result.ok).toBe(true);
    expect(result.output).toContain('file.ts');
    expect(result.output).toContain('subdir/');
  });

  it('create_folder blocks .git path', async () => {
    const workspace = await tmpWorkspace();
    const ctx = makeContext(workspace);
    await expect(createFolderTool.execute({path: '.git/hooks'}, ctx)).rejects.toThrow('protected');
  });
});
