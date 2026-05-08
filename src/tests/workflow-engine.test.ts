import {mkdtemp, readFile, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {describe, expect, it} from 'vitest';
import {classifyTask} from '../agent/task-classifier.js';
import {detectWorkspace} from '../agent/workspace-detect.js';
import {noToolGuardMessage, runDeterministicWorkflow} from '../agent/workflow-engine.js';
import {maybeSetTaskTitle} from '../session/store.js';
import type {Session} from '../session/types.js';

describe('task classifier', () => {
  it('keeps greetings as chat without tools', () => {
    expect(classifyTask('hi')).toMatchObject({kind: 'chat', requiresTools: false});
  });

  it('requires tools for coding and design tasks', () => {
    expect(classifyTask('update the website design')).toMatchObject({kind: 'design_update', requiresTools: true});
    expect(classifyTask('fix build errors')).toMatchObject({kind: 'build_fix', requiresTools: true});
    expect(classifyTask('explain this repo')).toMatchObject({kind: 'explain', requiresTools: true});
  });
});

describe('workspace detection', () => {
  it('handles empty folders cleanly', async () => {
    const dir = await tmp();
    const detected = await detectWorkspace(dir);
    expect(detected.empty).toBe(true);
    expect(detected.summary).toContain('empty');
  });

  it('detects docs website files', async () => {
    const dir = await tmp();
    await writeFile(path.join(dir, 'index.html'), '<h1>Hello</h1>');
    await writeFile(path.join(dir, 'styles.css'), 'body{}');
    const detected = await detectWorkspace(dir);
    expect(detected.kind).toBe('website');
    expect(detected.websiteFiles).toContain('index.html');
  });
});

describe('deterministic workflow engine', () => {
  it('runs no tools for chat', async () => {
    const dir = await tmp();
    const calls: string[] = [];
    const result = await runDeterministicWorkflow('hi', dir, async (call) => { calls.push(call.name); return {ok: true, output: 'ok'}; });
    expect(result.toolResults).toHaveLength(0);
    expect(calls).toHaveLength(0);
  });

  it('runs list/git/read bootstrap for website design tasks', async () => {
    const dir = await tmp();
    await writeFile(path.join(dir, 'index.html'), '<main>Hello</main>');
    await writeFile(path.join(dir, 'styles.css'), 'main { color: red; }');
    const calls: string[] = [];
    await runDeterministicWorkflow('update the website design', dir, async (call) => { calls.push(call.name); return {ok: true, output: 'ok'}; });
    expect(calls).toContain('list_folder');
    expect(calls).toContain('git_status');
    expect(calls).toContain('read_file');
    expect(calls).toContain('append_to_file');
  });

  it('can apply a website stylesheet edit through the local workflow', async () => {
    const dir = await tmp();
    await writeFile(path.join(dir, 'index.html'), '<main>Hello</main>');
    await writeFile(path.join(dir, 'styles.css'), 'main { color: red; }');
    await runDeterministicWorkflow('update the website design', dir, async (call) => {
      if (call.name === 'append_to_file') {
        const input = call.arguments as {path: string; content: string};
        await writeFile(path.join(dir, input.path), `${await readFile(path.join(dir, input.path), 'utf8')}${input.content}`);
      }
      return {ok: true, output: 'ok', path: (call.arguments as any).path};
    });
    expect(await readFile(path.join(dir, 'styles.css'), 'utf8')).toContain('OpenSyntax responsive design polish');
  });

  it('runs package inspection and verification for build fixes', async () => {
    const dir = await tmp();
    await writeFile(path.join(dir, 'package.json'), JSON.stringify({scripts: {build: 'tsc'}}));
    const calls: string[] = [];
    await runDeterministicWorkflow('fix build errors', dir, async (call) => { calls.push(call.name); return {ok: true, output: 'ok'}; });
    expect(calls).toContain('list_folder');
    expect(calls).toContain('read_file');
    expect(calls).toContain('verify_workspace');
  });

  it('provides a no-tool guard for coding tasks', () => {
    expect(noToolGuardMessage('update website design')).toContain('did not execute tools');
    expect(noToolGuardMessage('hi')).toBe('');
  });
});

describe('session task titles', () => {
  it('replaces stale greeting titles with meaningful task titles', () => {
    const session = fakeSession('Hi');
    maybeSetTaskTitle(session, 'update the website design');
    expect(session.title).toBe('Update The Website Design');
  });
});

async function tmp(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), 'opensyntax-workflow-'));
}

function fakeSession(title: string): Session {
  const now = new Date().toISOString();
  return {id: 'ses_test', title, workspace: '', providerId: 'openai', modelId: 'gpt', createdAt: now, updatedAt: now, status: 'active', messages: [], todos: [], toolCalls: [], edits: [], plan: []};
}
