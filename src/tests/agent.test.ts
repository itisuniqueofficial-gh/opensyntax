import {mkdtemp, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {describe, expect, it} from 'vitest';
import {AgentLoop} from '../agent/loop.js';
import {autonomousPlan, classifyWorkflow, inferVerificationCommands, initialPlan, renderPlan} from '../agent/planner.js';
import {buildWorkspaceContext, verificationCommandsForWorkspace} from '../agent/context.js';
import {createVerificationPlan, retryAdvice, summarizeCommandOutput} from '../agent/verification.js';
import {renderFullscreen} from '../ui/fullscreen.js';
import {defaultRegistry} from '../tools/registry.js';
import type {AppConfig} from '../config/config.js';
import type {Session} from '../session/types.js';

describe('planner', () => {
  it('creates a practical execution plan', () => {
    const plan = initialPlan('fix tests');
    expect(plan.map((item) => item.id)).toEqual(['inspect', 'execute', 'verify', 'summarize']);
    expect(renderPlan(plan)).toContain('Inspect workspace');
  });

  it('classifies autonomous workflows and validation commands', () => {
    expect(classifyWorkflow('fix all TypeScript errors')).toBe('debug');
    expect(inferVerificationCommands('fix all TypeScript errors')).toEqual(['npm run typecheck']);
    expect(autonomousPlan('commit my changes').plan.map((item) => item.id)).toEqual(['inspect', 'execute', 'summarize']);
  });
});

describe('workspace context', () => {
  it('summarizes package scripts and adapts verification commands', async () => {
    const dir = await workspace();
    await writeFile(path.join(dir, 'package.json'), JSON.stringify({name: 'ctx', scripts: {typecheck: 'tsc --noEmit'}}, null, 2));
    await writeFile(path.join(dir, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');
    const context = await buildWorkspaceContext(dir, 'fix TypeScript errors');
    expect(context.summary).toContain('Package: ctx');
    expect(context.packageManager).toBe('pnpm');
    expect(context.projectType).toBe('Node.js package');
    expect(context.hasTypeScript).toBe(false);
    expect(verificationCommandsForWorkspace(['npm run typecheck'], context)).toEqual(['pnpm run typecheck']);
  });

  it('detects frameworks and monorepo signals', async () => {
    const dir = await workspace();
    await writeFile(path.join(dir, 'package.json'), JSON.stringify({name: 'web', workspaces: ['packages/*'], dependencies: {next: '^15.0.0', react: '^19.0.0'}, devDependencies: {typescript: '^5.0.0'}, scripts: {build: 'next build'}}, null, 2));
    await writeFile(path.join(dir, 'turbo.json'), '{}');
    const context = await buildWorkspaceContext(dir, 'fix build errors');
    expect(context.frameworks).toContain('Next.js');
    expect(context.frameworks).toContain('React');
    expect(context.monorepo).toBe(true);
    expect(context.buildSystem).toBe('package script: build');
  });
});

describe('verification pipeline', () => {
  it('selects build and typecheck commands from scripts', async () => {
    const dir = await workspace();
    await writeFile(path.join(dir, 'package.json'), JSON.stringify({name: 'verify', scripts: {build: 'tsc', typecheck: 'tsc --noEmit'}}, null, 2));
    const context = await buildWorkspaceContext(dir, 'fix build errors');
    expect(createVerificationPlan('fix build errors', context).commands).toEqual(['npm run build']);
    expect(createVerificationPlan('fix TypeScript errors', context).commands).toEqual(['npm run typecheck']);
  });

  it('summarizes actionable failures and retry advice', () => {
    const summary = summarizeCommandOutput({stdout: '', stderr: 'src/a.ts(1,1): error TS2322: Type string is not assignable to type number.', timedOut: false, cancelled: false, exitCode: 2});
    expect(summary).toContain('TS2322');
    expect(retryAdvice({stdout: '', stderr: summary, timedOut: false, cancelled: false})).toContain('TypeScript');
  });
});

describe('tool registry', () => {
  it('registers git log for autonomous git workflows', () => {
    expect(defaultRegistry.names()).toContain('git_log');
    expect(defaultRegistry.names()).toContain('verify_workspace');
  });
});

describe('fullscreen renderer', () => {
  it('renders session tasks and output', () => {
    const s = session('openai', 'gpt-4o-mini');
    s.plan = initialPlan('fix tests');
    const rendered = renderFullscreen({workspace: 'repo', model: 'openai/gpt-4o-mini', permission: 'shell-safe', session: s, output: 'verified'});
    expect(rendered).toContain('OpenSyntax');
    expect(rendered).toContain('verified');
  });
});

describe('provider and model switching', () => {
  it('rejects models that do not belong to the active provider', async () => {
    const loop = new AgentLoop({workspace: await workspace(), config: config('nvidia', 'meta/llama-3.1-70b-instruct'), session: session('nvidia', 'meta/llama-3.1-70b-instruct'), persistPreferences: false});
    const message = await loop.setModel('gpt-4o-mini');
    expect(message).toContain('not available');
    expect(loop.modelName()).toBe('nvidia/meta/llama-3.1-70b-instruct');
  });

  it('allows valid model changes for the active provider', async () => {
    const loop = new AgentLoop({workspace: await workspace(), config: config('openai', 'gpt-4.1-mini'), session: session('openai', 'gpt-4.1-mini'), persistPreferences: false});
    const message = await loop.setModel('gpt-4o-mini');
    expect(message).toContain('openai/gpt-4o-mini');
    expect(loop.modelName()).toBe('openai/gpt-4o-mini');
  });
});

async function workspace(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), 'opensyntax-agent-'));
}

function config(provider: string, model: string): AppConfig {
  return {
    provider,
    providerName: provider,
    model,
    temperature: 0.2,
    maxTokens: 4096,
    showToolSummary: false,
    permission: 'shell-safe',
    commandTimeoutMs: 120000,
    allowFullOsCommands: false,
    requireApprovalForInstall: true,
    requireApprovalForNetwork: true,
    shellMode: 'shell-safe',
    thinkingDisplay: true,
    showReasoningSummary: false,
    modelFallback: true,
    markdown: true,
    syntaxHighlighting: true,
    codeBox: true,
    lineNumbers: true,
    unicodeBoxes: true,
    clickableLinks: false,
    theme: 'dark'
  };
}

function session(providerId: string, modelId: string): Session {
  const now = new Date().toISOString();
  return {id: 'ses_test', title: 'test', workspace: '', providerId, modelId, createdAt: now, updatedAt: now, status: 'active', messages: [], todos: [], toolCalls: [], edits: [], plan: []};
}
