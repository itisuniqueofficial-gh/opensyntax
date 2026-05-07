/**
 * Tests for the request sanitizer and provider capability system.
 */

import {describe, expect, it} from 'vitest';
import {z} from 'zod';
import {sanitizeRequest} from '../model/request-sanitizer.js';
import {getProviderCapabilities, renderProviderCapabilities} from '../providers/capabilities.js';
import {renderCapabilities} from '../commands/capabilities.js';
import type {ToolSpec, ChatMessage} from '../model/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sampleTool: ToolSpec = {
  name: 'read_file',
  description: 'Read a file',
  schema: z.object({path: z.string()})
};

const sampleMessages: ChatMessage[] = [
  {role: 'user', content: 'Hello'}
];

const messagesWithAssistant: ChatMessage[] = [
  {role: 'user', content: 'Hello'},
  {role: 'assistant', content: 'Hi there', toolCalls: []},
  {role: 'user', content: 'How are you?'}
];

const messagesWithToolCalls: ChatMessage[] = [
  {role: 'user', content: 'Read a file'},
  {role: 'assistant', content: '', toolCalls: [{id: 'call_1', name: 'read_file', arguments: {path: 'test.ts'}}]},
  {role: 'tool', toolCallId: 'call_1', content: 'file contents'}
];

// ---------------------------------------------------------------------------
// Provider capabilities
// ---------------------------------------------------------------------------

describe('provider capabilities', () => {
  it('NVIDIA NIM does not support tool_choice', () => {
    const caps = getProviderCapabilities('nvidia');
    expect(caps.supportsToolChoice).toBe(false);
  });

  it('NVIDIA NIM does not support parallel_tool_calls', () => {
    const caps = getProviderCapabilities('nvidia');
    expect(caps.supportsParallelTools).toBe(false);
  });

  it('NVIDIA NIM does not support response_format', () => {
    const caps = getProviderCapabilities('nvidia');
    expect(caps.supportsResponseFormat).toBe(false);
  });

  it('NVIDIA NIM does not support reasoning params', () => {
    const caps = getProviderCapabilities('nvidia');
    expect(caps.supportsReasoningParams).toBe(false);
  });

  it('OpenAI supports all features', () => {
    const caps = getProviderCapabilities('openai');
    expect(caps.supportsTools).toBe(true);
    expect(caps.supportsToolChoice).toBe(true);
    expect(caps.supportsStreaming).toBe(true);
    expect(caps.supportsSystemRole).toBe(true);
  });

  it('Groq does not support parallel tools', () => {
    const caps = getProviderCapabilities('groq');
    expect(caps.supportsParallelTools).toBe(false);
  });

  it('local providers (Ollama) have minimal capabilities', () => {
    const caps = getProviderCapabilities('ollama');
    expect(caps.supportsToolChoice).toBe(false);
    expect(caps.supportsParallelTools).toBe(false);
    expect(caps.supportsResponseFormat).toBe(false);
  });

  it('unknown provider returns safe minimal defaults', () => {
    const caps = getProviderCapabilities('unknown-provider-xyz');
    expect(caps.supportsTools).toBe(false);
    expect(caps.supportsStreaming).toBe(true);
  });

  it('renderProviderCapabilities returns a string', () => {
    const output = renderProviderCapabilities('nvidia', 'meta/llama-3.1-70b-instruct');
    expect(typeof output).toBe('string');
    expect(output).toContain('nvidia');
  });
});

// ---------------------------------------------------------------------------
// Request sanitizer — NVIDIA NIM (strict provider)
// ---------------------------------------------------------------------------

describe('request sanitizer — NVIDIA NIM', () => {
  it('produces a minimal valid payload for simple chat', () => {
    const {payload, removedFields} = sanitizeRequest({
      providerId: 'nvidia',
      modelId: 'meta/llama-3.1-70b-instruct',
      messages: sampleMessages,
      tools: [],
      temperature: 0.2,
      maxTokens: 1024,
      stream: true
    });
    expect(payload.model).toBe('meta/llama-3.1-70b-instruct');
    expect(Array.isArray(payload.messages)).toBe(true);
    expect(payload.stream).toBe(true);
    expect(payload.temperature).toBe(0.2);
    expect(payload.max_tokens).toBe(1024);
    // No tools in payload when none requested
    expect(payload.tools).toBeUndefined();
    expect(payload.tool_choice).toBeUndefined();
    expect(removedFields).not.toContain('temperature');
  });

  it('omits tool_choice for NVIDIA NIM even when tools are present', () => {
    const {payload, removedFields} = sanitizeRequest({
      providerId: 'nvidia',
      modelId: 'meta/llama-3.1-70b-instruct',
      messages: sampleMessages,
      tools: [sampleTool],
      temperature: 0.2,
      maxTokens: 1024
    });
    expect(payload.tool_choice).toBeUndefined();
    expect(removedFields).toContain('tool_choice');
  });

  it('omits parallel_tool_calls for NVIDIA NIM', () => {
    const {payload, removedFields} = sanitizeRequest({
      providerId: 'nvidia',
      modelId: 'meta/llama-3.1-70b-instruct',
      messages: sampleMessages,
      tools: [sampleTool],
      temperature: 0.2,
      maxTokens: 1024
    });
    expect(payload.parallel_tool_calls).toBeUndefined();
    expect(removedFields).toContain('parallel_tool_calls');
  });

  it('does not include tool_calls field on assistant messages with no tool calls', () => {
    const {payload} = sanitizeRequest({
      providerId: 'nvidia',
      modelId: 'meta/llama-3.1-70b-instruct',
      messages: messagesWithAssistant,
      tools: [],
      temperature: 0.2,
      maxTokens: 1024
    });
    const assistantMsg = (payload.messages as any[]).find((m: any) => m.role === 'assistant');
    expect(assistantMsg).toBeDefined();
    expect(assistantMsg.tool_calls).toBeUndefined();
  });

  it('includes tool_calls on assistant messages that have them', () => {
    const {payload} = sanitizeRequest({
      providerId: 'openai',
      modelId: 'gpt-4.1',
      messages: messagesWithToolCalls,
      tools: [sampleTool],
      temperature: 0.2,
      maxTokens: 1024
    });
    const assistantMsg = (payload.messages as any[]).find((m: any) => m.role === 'assistant');
    expect(assistantMsg?.tool_calls).toBeDefined();
    expect(assistantMsg.tool_calls).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Request sanitizer — OpenAI (full-featured provider)
// ---------------------------------------------------------------------------

describe('request sanitizer — OpenAI', () => {
  it('includes tool_choice for OpenAI when tools present', () => {
    const {payload} = sanitizeRequest({
      providerId: 'openai',
      modelId: 'gpt-4.1',
      messages: sampleMessages,
      tools: [sampleTool],
      temperature: 0.2,
      maxTokens: 1024
    });
    expect(payload.tool_choice).toBe('auto');
    expect(Array.isArray(payload.tools)).toBe(true);
  });

  it('does not include tools when none provided', () => {
    const {payload} = sanitizeRequest({
      providerId: 'openai',
      modelId: 'gpt-4.1',
      messages: sampleMessages,
      tools: [],
      temperature: 0.2,
      maxTokens: 1024
    });
    expect(payload.tools).toBeUndefined();
    expect(payload.tool_choice).toBeUndefined();
  });

  it('injects system prompt as system message', () => {
    const {payload} = sanitizeRequest({
      providerId: 'openai',
      modelId: 'gpt-4.1',
      messages: sampleMessages,
      systemPrompt: 'You are helpful.',
      tools: [],
      temperature: 0.2,
      maxTokens: 1024
    });
    const systemMsg = (payload.messages as any[])[0];
    expect(systemMsg.role).toBe('system');
    expect(systemMsg.content).toBe('You are helpful.');
  });
});

// ---------------------------------------------------------------------------
// Request sanitizer — model-level tool support
// ---------------------------------------------------------------------------

describe('request sanitizer — model-level tool support', () => {
  it('removes tools for DeepSeek Reasoner (no tool support)', () => {
    const {payload, removedFields, warnings} = sanitizeRequest({
      providerId: 'deepseek',
      modelId: 'deepseek-reasoner',
      messages: sampleMessages,
      tools: [sampleTool],
      temperature: 0.2,
      maxTokens: 1024
    });
    expect(payload.tools).toBeUndefined();
    expect(removedFields).toContain('tools');
    expect(warnings.some((w) => w.includes('tool calling'))).toBe(true);
  });

  it('keeps tools for DeepSeek Chat (supports tools)', () => {
    const {payload} = sanitizeRequest({
      providerId: 'deepseek',
      modelId: 'deepseek-chat',
      messages: sampleMessages,
      tools: [sampleTool],
      temperature: 0.2,
      maxTokens: 1024
    });
    expect(Array.isArray(payload.tools)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Request sanitizer — tool message handling
// ---------------------------------------------------------------------------

describe('request sanitizer — tool messages', () => {
  it('includes tool messages for providers that support them', () => {
    const {payload} = sanitizeRequest({
      providerId: 'openai',
      modelId: 'gpt-4.1',
      messages: messagesWithToolCalls,
      tools: [sampleTool],
      temperature: 0.2,
      maxTokens: 1024
    });
    const toolMsg = (payload.messages as any[]).find((m: any) => m.role === 'tool');
    expect(toolMsg).toBeDefined();
  });

  it('omits tool messages for local providers that do not support them', () => {
    const {payload} = sanitizeRequest({
      providerId: 'ollama',
      modelId: 'llama3.1',
      messages: messagesWithToolCalls,
      tools: [],
      temperature: 0.2,
      maxTokens: 1024
    });
    const toolMsg = (payload.messages as any[]).find((m: any) => m.role === 'tool');
    expect(toolMsg).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Capabilities command
// ---------------------------------------------------------------------------

describe('capabilities command', () => {
  it('renders capabilities for NVIDIA NIM', () => {
    const output = renderCapabilities('nvidia', 'meta/llama-3.1-70b-instruct');
    expect(output).toContain('nvidia');
    expect(output).toContain('meta/llama-3.1-70b-instruct');
    expect(output).toContain('Tool calling');
  });

  it('renders capabilities for OpenAI', () => {
    const output = renderCapabilities('openai', 'gpt-4.1');
    expect(output).toContain('openai');
    expect(output).toContain('gpt-4.1');
  });

  it('shows warning when tools are disabled', () => {
    // deepseek-reasoner has no tool support
    const output = renderCapabilities('deepseek', 'deepseek-reasoner');
    expect(output).toContain('text-only');
  });
});
