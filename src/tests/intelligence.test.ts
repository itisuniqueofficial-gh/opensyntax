import {describe, expect, it} from 'vitest';
import {repoSummary, architectureSummary} from '../commands/intelligence.js';
import {mkdtemp, writeFile, mkdir} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

async function tmpWorkspace(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), 'opensyntax-intel-'));
}

describe('intelligence', () => {
  it('summarises a workspace with package.json', async () => {
    const workspace = await tmpWorkspace();
    await writeFile(path.join(workspace, 'package.json'), JSON.stringify({name: 'test-pkg', version: '1.0.0', description: 'A test package'}), 'utf8');
    const summary = await repoSummary(workspace);
    expect(summary).toContain('test-pkg');
    expect(summary).toContain('1.0.0');
  });

  it('returns architecture map', async () => {
    const workspace = await tmpWorkspace();
    await mkdir(path.join(workspace, 'src'), {recursive: true});
    await writeFile(path.join(workspace, 'src', 'index.ts'), 'export {}', 'utf8');
    const arch = await architectureSummary(workspace);
    expect(arch).toContain('Architecture Map');
  });
});
