/**
 * Tests for the advanced session system:
 * - session creation with unique IDs
 * - session persistence
 * - session title generation
 * - ID format validation
 * - codebox rendering
 * - markdown rendering
 * - diff rendering
 */

import {describe, expect, it} from 'vitest';
import {newSessionId, newMessageId, newToolCallId, newEditId, relativeTime, idTimestamp} from '../session/id.js';
import {generateTitle, shortTitle} from '../session/titles.js';
import {createNewSession} from '../session/store.js';
import {renderCodebox, renderDiff} from '../ui/renderers/codebox.js';
import {renderMarkdown} from '../ui/renderers/markdown.js';
import {renderStatusBar} from '../ui/panels/status-bar.js';

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

describe('session IDs', () => {
  it('generates session IDs with ses_ prefix', () => {
    const id = newSessionId();
    expect(id).toMatch(/^ses_/);
    expect(id.length).toBeGreaterThan(8);
  });

  it('generates message IDs with msg_ prefix', () => {
    expect(newMessageId()).toMatch(/^msg_/);
  });

  it('generates tool call IDs with tool_ prefix', () => {
    expect(newToolCallId()).toMatch(/^tool_/);
  });

  it('generates edit IDs with edit_ prefix', () => {
    expect(newEditId()).toMatch(/^edit_/);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({length: 100}, () => newSessionId()));
    expect(ids.size).toBe(100);
  });

  it('idTimestamp returns a recent date', () => {
    const id = newSessionId();
    const ts = idTimestamp(id);
    expect(ts).toBeDefined();
    expect(Date.now() - ts!.getTime()).toBeLessThan(5000);
  });

  it('relativeTime returns "just now" for fresh IDs', () => {
    const id = newSessionId();
    expect(relativeTime(id)).toBe('just now');
  });

  it('relativeTime returns "unknown" for invalid IDs', () => {
    expect(relativeTime('invalid')).toBe('unknown');
  });
});

// ---------------------------------------------------------------------------
// Session creation
// ---------------------------------------------------------------------------

describe('session creation', () => {
  it('creates a session with correct structure', () => {
    const session = createNewSession('/workspace', 'openai', 'gpt-4.1');
    expect(session.id).toMatch(/^ses_/);
    expect(session.title).toBe('New Chat');
    expect(session.workspace).toBe('/workspace');
    expect(session.providerId).toBe('openai');
    expect(session.modelId).toBe('gpt-4.1');
    expect(session.status).toBe('active');
    expect(Array.isArray(session.messages)).toBe(true);
    expect(Array.isArray(session.todos)).toBe(true);
    expect(Array.isArray(session.toolCalls)).toBe(true);
  });

  it('creates sessions with unique IDs', () => {
    const s1 = createNewSession('/workspace');
    const s2 = createNewSession('/workspace');
    expect(s1.id).not.toBe(s2.id);
  });
});

// ---------------------------------------------------------------------------
// Session titles
// ---------------------------------------------------------------------------

describe('session titles', () => {
  it('generates title from first message', () => {
    expect(generateTitle('fix the build errors')).toBe('Fix the build errors');
  });

  it('truncates long titles', () => {
    const long = 'a'.repeat(100);
    const title = generateTitle(long);
    expect(title.length).toBeLessThanOrEqual(63); // 60 + '...'
  });

  it('returns "New Chat" for empty message', () => {
    expect(generateTitle('')).toBe('New Chat');
  });

  it('strips leading slash commands', () => {
    const title = generateTitle('/fix the auth flow');
    expect(title).toBe('The auth flow');
  });

  it('shortTitle truncates with ellipsis', () => {
    const title = shortTitle('This is a very long session title', 20);
    expect(title.length).toBeLessThanOrEqual(20);
    expect(title.endsWith('…')).toBe(true);
  });

  it('shortTitle returns unchanged short titles', () => {
    expect(shortTitle('Short', 20)).toBe('Short');
  });
});

// ---------------------------------------------------------------------------
// Codebox renderer
// ---------------------------------------------------------------------------

describe('codebox renderer', () => {
  it('renders a code block with borders', () => {
    const output = renderCodebox('const x = 1;', {language: 'typescript'});
    expect(output).toContain('╭');
    expect(output).toContain('╰');
    expect(output).toContain('const x = 1;');
  });

  it('renders with a label in the top border', () => {
    const output = renderCodebox('hello', {label: 'src/index.ts'});
    expect(output).toContain('src/index.ts');
  });

  it('renders diff with green/red lines', () => {
    const diff = '+const newValue = true\n-const oldValue = true';
    const output = renderDiff(diff);
    expect(output).toContain('╭');
    expect(output).toContain('newValue');
  });

  it('truncates long code blocks', () => {
    const code = Array.from({length: 100}, (_, i) => `line ${i}`).join('\n');
    const output = renderCodebox(code, {maxLines: 10});
    expect(output).toContain('more lines');
  });

  it('returns a string', () => {
    expect(typeof renderCodebox('test')).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// Markdown renderer
// ---------------------------------------------------------------------------

describe('markdown renderer', () => {
  it('renders headings', () => {
    const output = renderMarkdown('# Hello');
    expect(output).toContain('Hello');
  });

  it('renders inline code', () => {
    const output = renderMarkdown('Use `npm install`');
    expect(output).toContain('npm install');
  });

  it('renders code blocks as codeboxes', () => {
    const output = renderMarkdown('```typescript\nconst x = 1;\n```');
    expect(output).toContain('╭');
    expect(output).toContain('const x = 1;');
  });

  it('renders unordered lists', () => {
    const output = renderMarkdown('- item one\n- item two');
    expect(output).toContain('item one');
    expect(output).toContain('item two');
  });

  it('renders bold text', () => {
    const output = renderMarkdown('**bold text**');
    expect(output).toContain('bold text');
  });

  it('returns a string', () => {
    expect(typeof renderMarkdown('hello world')).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// Status bar
// ---------------------------------------------------------------------------

describe('status bar', () => {
  it('renders a status bar string', () => {
    const output = renderStatusBar({
      model: 'nvidia/meta/llama-3.1-70b-instruct',
      permission: 'shell-safe',
      sessionId: 'ses_test123',
      workspace: '/workspace'
    });
    expect(typeof output).toBe('string');
    expect(output).toContain('OpenSyntax');
    expect(output).toContain('shell-safe');
    expect(output).toContain('ses_test123');
  });

  it('includes session title when provided', () => {
    const output = renderStatusBar({
      model: 'gpt-4.1',
      permission: 'shell-safe',
      sessionId: 'ses_abc',
      sessionTitle: 'Fix build errors',
      workspace: '/workspace'
    });
    expect(output).toContain('Fix build errors');
  });
});
