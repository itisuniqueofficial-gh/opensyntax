/**
 * Request sanitizer — strips unsupported fields from provider payloads.
 *
 * Every OpenAI-compatible request passes through here before being sent.
 * The sanitizer inspects both provider-level and model-level capabilities
 * and removes anything the provider/model doesn't support.
 *
 * This is the single place that prevents 400 errors from strict providers
 * like NVIDIA NIM, Groq, Together AI, and DeepSeek.
 */

import {getProviderCapabilities} from '../providers/capabilities.js';
import {findModel} from './registry.js';
import type {ChatMessage, ToolSpec} from './types.js';
import {zodToJsonSchema} from '../utils/schema.js';

export type RawOpenAIPayload = {
  model: string;
  messages: unknown[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  tools?: unknown[];
  tool_choice?: unknown;
  parallel_tool_calls?: boolean;
  response_format?: unknown;
  top_p?: number;
  [key: string]: unknown;
};

export type SanitizeResult = {
  payload: RawOpenAIPayload;
  removedFields: string[];
  warnings: string[];
};

/**
 * Build and sanitize an OpenAI-compatible chat completions payload.
 *
 * @param providerId  The provider id (e.g. "nvidia", "groq")
 * @param modelId     The model id (e.g. "meta/llama-3.1-70b-instruct")
 * @param messages    Converted OpenAI-format messages
 * @param tools       Tool specs from the registry (may be empty)
 * @param temperature Request temperature
 * @param maxTokens   Max tokens
 * @param stream      Whether to stream
 */
export function sanitizeRequest(input: {
  providerId: string;
  modelId: string;
  messages: ChatMessage[];
  systemPrompt?: string;
  tools: ToolSpec[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}): SanitizeResult {
  const providerCaps = getProviderCapabilities(input.providerId);
  const modelEntry = findModel(input.providerId, input.modelId);
  const removedFields: string[] = [];
  const warnings: string[] = [];

  // ---------------------------------------------------------------------------
  // Build messages — always omit tool_calls when empty
  // ---------------------------------------------------------------------------
  const messages = buildMessages(input.messages, input.systemPrompt, providerCaps.supportsSystemRole, providerCaps.supportsToolMessages);

  // ---------------------------------------------------------------------------
  // Determine whether tools should be included
  // ---------------------------------------------------------------------------
  const modelSupportsTools = modelEntry ? modelEntry.supportsTools : true; // assume true if unknown
  const wantTools = input.tools.length > 0 && providerCaps.supportsTools && modelSupportsTools;

  if (input.tools.length > 0 && !providerCaps.supportsTools) {
    removedFields.push('tools', 'tool_choice');
    warnings.push(`${input.providerId} does not support tool calling — running in text-only mode`);
  } else if (input.tools.length > 0 && !modelSupportsTools) {
    removedFields.push('tools', 'tool_choice');
    warnings.push(`${input.modelId} does not support tool calling — running in text-only mode`);
  }

  const toolPayload = wantTools ? buildToolPayload(input.tools, providerCaps.supportsToolChoice, providerCaps.supportsParallelTools, removedFields) : {};

  // ---------------------------------------------------------------------------
  // Base payload — always safe fields
  // ---------------------------------------------------------------------------
  const payload: RawOpenAIPayload = {
    model: input.modelId,
    messages,
    stream: providerCaps.supportsStreaming ? (input.stream ?? true) : false,
    ...toolPayload
  };

  // ---------------------------------------------------------------------------
  // Optional fields — only add if supported
  // ---------------------------------------------------------------------------
  if (providerCaps.supportsTemperature && input.temperature !== undefined) {
    payload.temperature = input.temperature;
  } else if (input.temperature !== undefined && !providerCaps.supportsTemperature) {
    removedFields.push('temperature');
  }

  if (providerCaps.supportsMaxTokens && input.maxTokens !== undefined) {
    payload.max_tokens = input.maxTokens;
  } else if (input.maxTokens !== undefined && !providerCaps.supportsMaxTokens) {
    removedFields.push('max_tokens');
  }

  return {payload, removedFields, warnings};
}

// ---------------------------------------------------------------------------
// Message builder
// ---------------------------------------------------------------------------

function buildMessages(
  messages: ChatMessage[],
  systemPrompt: string | undefined,
  supportsSystemRole: boolean,
  supportsToolMessages: boolean
): unknown[] {
  const result: unknown[] = [];

  // Inject system prompt
  if (systemPrompt) {
    if (supportsSystemRole) {
      result.push({role: 'system', content: systemPrompt});
    } else {
      // Prepend system prompt to first user message instead
      const firstUserIdx = messages.findIndex((m) => m.role === 'user');
      if (firstUserIdx !== -1) {
        // Will be handled below by prepending to that message
      }
    }
  }

  let systemPrepended = false;
  for (const message of messages) {
    if (message.role === 'system') continue; // handled above

    if (message.role === 'tool') {
      if (supportsToolMessages) {
        result.push({role: 'tool', tool_call_id: message.toolCallId, content: message.content});
      }
      // If tool messages not supported, skip them silently
      continue;
    }

    if (message.role === 'assistant') {
      const msg: Record<string, unknown> = {role: 'assistant', content: message.content};
      if (message.toolCalls?.length) {
        msg.tool_calls = message.toolCalls.map((call) => ({
          id: call.id,
          type: 'function',
          function: {name: call.name, arguments: JSON.stringify(call.arguments)}
        }));
      }
      result.push(msg);
      continue;
    }

    if (message.role === 'user') {
      let content = message.content;
      // Prepend system prompt to first user message if system role not supported
      if (!supportsSystemRole && systemPrompt && !systemPrepended) {
        content = `${systemPrompt}\n\n${content}`;
        systemPrepended = true;
      }
      result.push({role: 'user', content});
      continue;
    }

    result.push({role: message.role, content: message.content});
  }

  return result;
}

// ---------------------------------------------------------------------------
// Tool payload builder
// ---------------------------------------------------------------------------

function buildToolPayload(
  tools: ToolSpec[],
  supportsToolChoice: boolean,
  supportsParallelTools: boolean,
  removedFields: string[]
): Partial<RawOpenAIPayload> {
  const payload: Partial<RawOpenAIPayload> = {};

  payload.tools = tools.map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: zodToJsonSchema(t.schema)
    }
  }));

  if (supportsToolChoice) {
    payload.tool_choice = 'auto';
  } else {
    removedFields.push('tool_choice');
  }

  if (!supportsParallelTools) {
    removedFields.push('parallel_tool_calls');
    // Don't add parallel_tool_calls: false either — some providers reject it
  }

  return payload;
}

// ---------------------------------------------------------------------------
// Debug payload renderer (masks secrets)
// ---------------------------------------------------------------------------

export function renderDebugPayload(input: {
  providerId: string;
  endpoint: string;
  result: SanitizeResult;
}): string {
  const {providerId, endpoint, result} = input;
  const lines: string[] = [
    `Provider:  ${providerId}`,
    `Endpoint:  ${endpoint}`,
  ];

  if (result.removedFields.length) {
    lines.push('', 'Removed unsupported fields:');
    for (const f of result.removedFields) lines.push(`  - ${f}`);
  }

  if (result.warnings.length) {
    lines.push('', 'Warnings:');
    for (const w of result.warnings) lines.push(`  ! ${w}`);
  }

  // Render payload with messages truncated for readability
  const preview = JSON.parse(JSON.stringify(result.payload)) as Record<string, unknown>;
  if (Array.isArray(preview.messages)) {
    preview.messages = (preview.messages as unknown[]).map((m: unknown) => {
      if (typeof m === 'object' && m !== null) {
        const msg = m as Record<string, unknown>;
        if (typeof msg.content === 'string' && msg.content.length > 120) {
          return {...msg, content: `${msg.content.slice(0, 120)}…`};
        }
      }
      return m;
    });
  }

  lines.push('', 'Sanitized payload:');
  lines.push(JSON.stringify(preview, null, 2));
  return lines.join('\n');
}
