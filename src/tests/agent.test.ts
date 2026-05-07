import {mkdtemp} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {describe, expect, it} from 'vitest';
import {AgentLoop} from '../agent/loop.js';
import {initialPlan, renderPlan} from '../agent/planner.js';
import type {AppConfig} from '../config/config.js';
import type {Session} from '../session/types.js';

describe('planner', () => {
  it('creates a practical execution plan', () => {
    const plan = initialPlan('fix tests');
    expect(plan.map((item) => item.id)).toEqual(['inspect', 'execute', 'verify', 'summarize']);
    expect(renderPlan(plan)).toContain('Inspect workspace');
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
