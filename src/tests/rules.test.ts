import {mkdir, mkdtemp, readFile, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {describe, expect, it} from 'vitest';
import {createStarterRules} from '../rules/context.js';
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

  it('returns a normal context from the safe loader when loading succeeds', async () => {
    const workspace = await mkdtemp(path.join(os.tmpdir(), 'opensyntax-rules-'));
    const rules = await loadWorkspaceRulesSafe(workspace);

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

  it('loads AGENTS.md files correctly', async () => {
    const workspace = await mkdtemp(path.join(os.tmpdir(), 'opensyntax-rules-'));
    await writeFile(path.join(workspace, 'AGENTS.md'), '# Agent Rules\n\n- Use bun only.\n', 'utf8');

    const rules = await loadWorkspaceRules(workspace);

    expect(rules.files).toHaveLength(1);
    expect(rules.files[0].path).toBe(path.join(workspace, 'AGENTS.md'));
    expect(rules.prompt).toContain('Use bun only');
  });

  it('merges nested rules from broadest to nearest', async () => {
    const workspace = await mkdtemp(path.join(os.tmpdir(), 'opensyntax-rules-'));
    const app = path.join(workspace, 'apps', 'web');
    await mkdir(app, {recursive: true});
    await writeFile(path.join(workspace, 'AGENTS.md'), '# Root Rules\n\n- Keep edits minimal.\n', 'utf8');
    await writeFile(path.join(app, 'OPENSYNTAX.md'), '# App Rules\n\n- Use bun only.\n', 'utf8');

    const rules = await loadWorkspaceRules(app);

    expect(rules.files.map((file) => file.path)).toEqual([path.join(workspace, 'AGENTS.md'), path.join(app, 'OPENSYNTAX.md')]);
    expect(rules.prompt).toContain('Nearest scoped instructions override broader rules');
    expect(rules.prompt).toContain('Use bun only');
  });

  it('uses deterministic same-directory instruction priority', async () => {
    const workspace = await mkdtemp(path.join(os.tmpdir(), 'opensyntax-rules-'));
    await mkdir(path.join(workspace, '.opensyntax'));
    await writeFile(path.join(workspace, 'OPENSYNTAX.md'), '# One\n\n- one.\n', 'utf8');
    await writeFile(path.join(workspace, 'AGENTS.md'), '# Two\n\n- two.\n', 'utf8');
    await writeFile(path.join(workspace, '.opensyntax', 'OPENSYNTAX.md'), '# Three\n\n- three.\n', 'utf8');
    await writeFile(path.join(workspace, '.opensyntax', 'AGENTS.md'), '# Four\n\n- four.\n', 'utf8');

    const rules = await loadWorkspaceRules(workspace);

    expect(rules.files.map((file) => path.relative(workspace, file.path).replaceAll('\\', '/'))).toEqual(['OPENSYNTAX.md', 'AGENTS.md', '.opensyntax/OPENSYNTAX.md', '.opensyntax/AGENTS.md']);
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

  it('respects .gitignore for ignored child directories', async () => {
    const workspace = await mkdtemp(path.join(os.tmpdir(), 'opensyntax-rules-'));
    const generated = path.join(workspace, 'generated');
    await mkdir(generated);
    await writeFile(path.join(workspace, '.gitignore'), 'generated\n', 'utf8');
    await writeFile(path.join(generated, 'AGENTS.md'), '# Ignored Rules\n\n- Ignore me.\n', 'utf8');

    const candidates = await findRuleCandidates(generated);

    expect(candidates.some((candidate) => candidate.path === path.join(generated, 'AGENTS.md'))).toBe(false);
  });

  it('creates the starter OPENSYNTAX.md template', async () => {
    const workspace = await mkdtemp(path.join(os.tmpdir(), 'opensyntax-rules-'));
    const file = await createStarterRules(workspace);

    expect(file).toBe(path.join(workspace, 'OPENSYNTAX.md'));
    expect(await readFile(file, 'utf8')).toContain('Workspace instructions for OpenSyntax');
  });

  it('reloads updated instruction content', async () => {
    const workspace = await mkdtemp(path.join(os.tmpdir(), 'opensyntax-rules-'));
    const file = path.join(workspace, 'OPENSYNTAX.md');
    await writeFile(file, '# Rules\n\n- First rule.\n', 'utf8');
    const first = await loadWorkspaceRules(workspace);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await writeFile(file, '# Rules\n\n- Second rule.\n', 'utf8');
    const second = await loadWorkspaceRules(workspace);

    expect(first.prompt).toContain('First rule');
    expect(second.prompt).toContain('Second rule');
  });
});
