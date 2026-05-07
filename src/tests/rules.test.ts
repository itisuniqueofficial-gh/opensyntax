import {describe, expect, it} from 'vitest';
import {mkdtemp, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {loadWorkspaceRules} from '../rules/loader.js';
import {mergeRules} from '../rules/merger.js';
import {parseRuleFile} from '../rules/parser.js';

async function tmpWorkspace(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), 'opensyntax-rules-'));
}

describe('rules', () => {
  it('loads workspace rules from OPENSYNTAX.md', async () => {
    const workspace = await tmpWorkspace();
    await writeFile(path.join(workspace, 'OPENSYNTAX.md'), '# Rules\n\n## Coding\n- Use TypeScript\n', 'utf8');
    const ctx = await loadWorkspaceRules(workspace);
    expect(ctx.files.length).toBeGreaterThan(0);
    expect(ctx.prompt).toContain('TypeScript');
  });

  it('merges multiple rule files', () => {
    const file1 = parseRuleFile({path: '/a/OPENSYNTAX.md', scope: 'global', depth: 0, mtimeMs: 0, raw: '## Rules\n- Use bun\n'});
    const file2 = parseRuleFile({path: '/b/OPENSYNTAX.md', scope: 'workspace', depth: 10, mtimeMs: 0, raw: '## Rules\n- Use TypeScript\n'});
    const ctx = mergeRules([file1, file2]);
    expect(ctx.effectiveBullets.some((b) => b.includes('bun'))).toBe(true);
    expect(ctx.effectiveBullets.some((b) => b.includes('TypeScript'))).toBe(true);
  });

  it('extracts shell rules', () => {
    const file = parseRuleFile({path: '/a/OPENSYNTAX.md', scope: 'workspace', depth: 0, mtimeMs: 0, raw: '## Shell\n- Never use npm\n'});
    const ctx = mergeRules([file]);
    expect(ctx.shellRules.some((r) => r.includes('npm'))).toBe(true);
  });

  it('extracts forbidden paths', () => {
    const file = parseRuleFile({path: '/a/OPENSYNTAX.md', scope: 'workspace', depth: 0, mtimeMs: 0, raw: '## Safety\n- Do not edit dist/\n'});
    const ctx = mergeRules([file]);
    expect(ctx.forbiddenPaths).toContain('dist/');
  });
});
