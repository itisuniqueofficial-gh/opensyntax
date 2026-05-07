import {mkdir, mkdtemp, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {describe, expect, it} from 'vitest';
import {dependencySummary, findFiles, pluginSummary, repoSummary, searchWorkspace, symbolSummary} from '../commands/intelligence.js';

describe('workspace intelligence commands', () => {
  async function workspace() {
    const root = await mkdtemp(path.join(os.tmpdir(), 'opensyntax-intel-'));
    await mkdir(path.join(root, 'src'), {recursive: true});
    await writeFile(path.join(root, 'package.json'), JSON.stringify({name: 'demo', scripts: {typecheck: 'tsc --noEmit'}, dependencies: {zod: '^3.0.0'}}, null, 2), 'utf8');
    await writeFile(path.join(root, 'src', 'index.ts'), 'export function helloWorld() { return "hi"; }\n', 'utf8');
    return root;
  }

  it('summarizes repository and dependencies', async () => {
    const root = await workspace();
    await expect(repoSummary(root)).resolves.toContain('Package: demo');
    await expect(dependencySummary(root)).resolves.toContain('typecheck');
  });

  it('finds files, content, and symbols', async () => {
    const root = await workspace();
    await expect(findFiles(root, 'index')).resolves.toContain('src/index.ts');
    await expect(searchWorkspace(root, 'helloWorld')).resolves.toContain('src/index.ts:1');
    await expect(symbolSummary(root, 'hello')).resolves.toContain('helloWorld');
  });

  it('loads workspace plugin manifests', async () => {
    const root = await workspace();
    await mkdir(path.join(root, '.opensyntax', 'plugins'), {recursive: true});
    await writeFile(path.join(root, '.opensyntax', 'plugins', 'demo.json'), JSON.stringify({name: 'demo-plugin', version: '1.0.0'}), 'utf8');

    await expect(pluginSummary(root)).resolves.toContain('demo-plugin v1.0.0');
  });
});
