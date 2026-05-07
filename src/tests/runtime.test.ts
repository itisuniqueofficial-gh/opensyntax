/**
 * Tests for the runtime provider/model state system:
 * - connected provider filtering
 * - model cache
 * - model validation
 * - runtime state building
 * - provider-scoped model lists
 */

import {describe, expect, it, beforeEach, afterEach} from 'vitest';
import {mkdtemp, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {loadCachedModels, saveCachedModels, invalidateModelCache, hasFreshCache} from '../model/cache.js';
import {validateProviderModel, modelSupportsTools, resolveDefaultModel} from '../model/validation.js';
import {buildRuntimeState, getProviderModels, isModelAvailable} from '../model/runtime.js';
import {getProviderCapabilities} from '../providers/capabilities.js';

// ---------------------------------------------------------------------------
// Helpers — override configDir for tests
// ---------------------------------------------------------------------------

// We patch the cache module's configDir by using a temp dir
// The cache module uses configDir from config/config.ts which reads HOME.
// For tests we just call the functions directly and verify behavior.

// ---------------------------------------------------------------------------
// Model cache
// ---------------------------------------------------------------------------

describe('model cache', () => {
  it('returns undefined for missing cache', async () => {
    const result = await loadCachedModels('nonexistent-provider-xyz');
    expect(result).toBeUndefined();
  });

  it('hasFreshCache returns false for missing provider', async () => {
    const result = await hasFreshCache('nonexistent-provider-xyz');
    expect(result).toBe(false);
  });

  it('invalidateModelCache does not throw for missing entry', async () => {
    await expect(invalidateModelCache('nonexistent-provider-xyz')).resolves.not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Model validation
// ---------------------------------------------------------------------------

describe('model validation', () => {
  it('validates a known good model without errors', async () => {
    const result = await validateProviderModel('openai', 'gpt-4.1');
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('warns about speculative models', async () => {
    const result = await validateProviderModel('openai', 'gpt-5.5-thinking');
    expect(result.warnings.some((w) => w.includes('speculative'))).toBe(true);
  });

  it('validates unknown model without hard failure', async () => {
    const result = await validateProviderModel('openai', 'gpt-99-unknown-model');
    // Unknown model — no hard error, may have warnings
    expect(result.ok).toBe(true);
  });

  it('modelSupportsTools returns false for deepseek-reasoner', () => {
    expect(modelSupportsTools('deepseek', 'deepseek-reasoner')).toBe(false);
  });

  it('modelSupportsTools returns true for gpt-4.1', () => {
    expect(modelSupportsTools('openai', 'gpt-4.1')).toBe(true);
  });

  it('modelSupportsTools returns false when provider does not support tools', () => {
    // Unknown provider defaults to no tools
    expect(modelSupportsTools('unknown-provider-xyz', 'some-model')).toBe(false);
  });

  it('resolveDefaultModel returns preferred model when no cache', async () => {
    const model = await resolveDefaultModel('openai', 'gpt-4.1');
    expect(model).toBe('gpt-4.1');
  });

  it('resolveDefaultModel falls back to registry when no preference', async () => {
    const model = await resolveDefaultModel('openai');
    expect(typeof model).toBe('string');
    expect(model.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Runtime state
// ---------------------------------------------------------------------------

describe('runtime state', () => {
  it('builds runtime state for NVIDIA NIM', async () => {
    const state = await buildRuntimeState('nvidia', 'meta/llama-3.1-70b-instruct');
    expect(state.providerId).toBe('nvidia');
    expect(state.modelId).toBe('meta/llama-3.1-70b-instruct');
    expect(state.providerName).toBe('NVIDIA NIM');
    expect(state.streamingEnabled).toBe(true);
    // NVIDIA NIM supports tools at provider level
    expect(typeof state.toolsEnabled).toBe('boolean');
  });

  it('builds runtime state for OpenAI', async () => {
    const state = await buildRuntimeState('openai', 'gpt-4.1');
    expect(state.providerId).toBe('openai');
    expect(state.toolsEnabled).toBe(true);
    expect(state.streamingEnabled).toBe(true);
  });

  it('tools disabled for deepseek-reasoner', async () => {
    const state = await buildRuntimeState('deepseek', 'deepseek-reasoner');
    expect(state.toolsEnabled).toBe(false);
  });

  it('tools disabled for unknown provider', async () => {
    const state = await buildRuntimeState('unknown-provider-xyz', 'some-model');
    expect(state.toolsEnabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Model availability
// ---------------------------------------------------------------------------

describe('model availability', () => {
  it('known registry model is available', async () => {
    const available = await isModelAvailable('openai', 'gpt-4.1');
    expect(available).toBe(true);
  });

  it('speculative model is not available', async () => {
    const available = await isModelAvailable('openai', 'gpt-5.5-thinking');
    expect(available).toBe(false);
  });

  it('completely unknown model is not available', async () => {
    const available = await isModelAvailable('openai', 'gpt-99-nonexistent-xyz');
    expect(available).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Provider capability enforcement
// ---------------------------------------------------------------------------

describe('provider capability enforcement', () => {
  it('NVIDIA NIM has no tool_choice', () => {
    const caps = getProviderCapabilities('nvidia');
    expect(caps.supportsToolChoice).toBe(false);
  });

  it('OpenAI has full capabilities', () => {
    const caps = getProviderCapabilities('openai');
    expect(caps.supportsTools).toBe(true);
    expect(caps.supportsToolChoice).toBe(true);
    expect(caps.supportsStreaming).toBe(true);
  });

  it('unknown provider gets safe minimal defaults', () => {
    const caps = getProviderCapabilities('unknown-xyz');
    expect(caps.supportsTools).toBe(false);
    expect(caps.supportsStreaming).toBe(true);
  });
});
