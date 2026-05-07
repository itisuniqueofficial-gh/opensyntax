import {mkdir, mkdtemp, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {describe, expect, it} from 'vitest';
import {findRuleCandidates, loadWorkspaceRules, loadWorkspaceRulesSafe, toIgnorePath} from '../rules/loader.js';

describe('workspace rules', () => {
  it('normalizes ignore paths without returning empty or absolute paths', () => {
    expect(toIgnorePath('C:\\Users\\admin', 'C:\\Users\\admin')).toBeNull();
    expect(toIgnorePath('C:\\Users\\admin', 'C:\\Users\\admin\\OPENSYNTAX.md')).toBe('OPENSYNTAX.md');
    expect(toIgnorePath('C:\\Users\\admin', 'C:\\Users\\admin\\dist\\OPENSYNTAX.md')).toBe('dist/OPENSYNTAX.md');
    expect(toIgnorePath('C:\\Users\\admin\\project', 'C:\\Users\\admin')).toBeNull();
  });

  it('loads without throwing when cwd has no relative path to itself', async () => {
    const workspace = await mkdtemp(path.join(os.tmpdir(), 'opensyntax-rules-'));
    const rules = await loadWorkspaceRules(workspace);

    expect(rules.files).toEqual([]);
    expect(rules.prompt).toContain('No OPENSYNTAX.md rules loaded');
  });

  it('returns an empty context from the safe loader when loading fails', async () => {
    const rules = await loadWorkspaceRulesSafe('\0invalid');

    expect(rules.files).toEqual([]);
    expect(rules.prompt).toContain('No OPENSYNTAX.md rules loaded');
  });

  it('loads a normal OPENSYNTAX.md file', async () => {
    const workspace = await mkdtemp(path.join(os.tmpdir(), 'opensyntax-rules-'));
    await writeFile(path.join(workspace, 'OPENSYNTAX.md'), '# Project Rules\n\n- Prefer tests.\n', 'utf8');

    const rules = await loadWorkspaceRules(workspace);

    expect(rules.files).toHaveLength(1);
    expect(rules.prompt).toContain('Prefer tests');
  });

  it('does not treat the workspace root as an ignorable file', async () => {
    const workspace = await mkdtemp(path.join(os.tmpdir(), 'opensyntax-rules-'));
    await writeFile(path.join(workspace, '.opensyntaxignore'), '*\n', 'utf8');
    await writeFile(path.join(workspace, 'OPENSYNTAX.md'), '# Root Rules\n\n- Keep root rules.\n', 'utf8');

    const rules = await loadWorkspaceRules(workspace);

    expect(rules.files.map((file) => file.path)).toContain(path.join(workspace, 'OPENSYNTAX.md'));
  });

  it('respects .opensyntaxignore for ignored child directories', async () => {
    const workspace = await mkdtemp(path.join(os.tmpdir(), 'opensyntax-rules-'));
    const dist = path.join(workspace, 'dist');
    await mkdir(dist);
    await writeFile(path.join(workspace, '.opensyntaxignore'), 'dist\n', 'utf8');
    await writeFile(path.join(dist, 'OPENSYNTAX.md'), '# Ignored Rules\n\n- Ignore me.\n', 'utf8');

    const candidates = await findRuleCandidates(dist);

    expect(candidates.some((candidate) => candidate.path === path.join(dist, 'OPENSYNTAX.md'))).toBe(false);
  });
});
