import {mkdtemp} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {describe, expect, it} from 'vitest';
import {loadWorkspaceRules} from '../rules/loader.js';

describe('workspace rules', () => {
  it('loads without throwing when cwd has no relative path to itself', async () => {
    const workspace = await mkdtemp(path.join(os.tmpdir(), 'opensyntax-rules-'));
    const rules = await loadWorkspaceRules(workspace);

    expect(rules.files).toEqual([]);
    expect(rules.prompt).toContain('No OPENSYNTAX.md rules loaded');
  });
});
