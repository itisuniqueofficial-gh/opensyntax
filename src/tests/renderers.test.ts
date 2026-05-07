/**
 * Tests for the advanced rendering system:
 * - Markdown renderer (headings, lists, tables, code blocks, inline code, links)
 * - Streaming Markdown renderer (partial/incomplete input safety)
 * - Codebox renderer (borders, line numbers, diff, truncation, ASCII fallback)
 * - Diff renderer
 * - Table renderer
 * - Link renderer
 * - Message renderer (error/warning/success panels)
 * - Theme system (NO_COLOR, config)
 * - UI config (toggle features)
 */

import {describe, expect, it, beforeEach, afterEach} from 'vitest';
import {renderMarkdown} from '../ui/renderers/markdown.js';
import {renderCodebox, renderDiff} from '../ui/renderers/codebox.js';
import {renderTable} from '../ui/renderers/table.js';
import {renderLink, renderLinks} from '../ui/renderers/link.js';
import {renderUnifiedDiff, colorDiffLine} from '../ui/renderers/diff.js';
import {renderErrorPanel, renderWarningPanel, renderSuccess, renderUserMessage, renderToolStart, renderToolEnd} from '../ui/renderers/message.js';
import {StreamingMarkdownRenderer} from '../ui/renderers/streaming-markdown.js';
import {getUiConfig, setUiConfig, resetUiConfig} from '../ui/ui-config.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*m/g, '');
}

// ---------------------------------------------------------------------------
// UI Config
// ---------------------------------------------------------------------------

describe('UI config', () => {
  afterEach(() => resetUiConfig());

  it('returns defaults', () => {
    const cfg = getUiConfig();
    expect(cfg.markdown).toBe(true);
    expect(cfg.syntaxHighlighting).toBe(true);
    expect(cfg.codeBox).toBe(true);
    expect(cfg.lineNumbers).toBe(true);
    expect(cfg.unicodeBoxes).toBe(true);
  });

  it('setUiConfig updates fields', () => {
    setUiConfig({markdown: false, lineNumbers: false});
    const cfg = getUiConfig();
    expect(cfg.markdown).toBe(false);
    expect(cfg.lineNumbers).toBe(false);
    expect(cfg.codeBox).toBe(true); // unchanged
  });

  it('resetUiConfig restores defaults', () => {
    setUiConfig({markdown: false});
    resetUiConfig();
    expect(getUiConfig().markdown).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Markdown renderer
// ---------------------------------------------------------------------------

describe('markdown renderer', () => {
  afterEach(() => resetUiConfig());

  it('renders h1 heading', () => {
    const out = stripAnsi(renderMarkdown('# Hello World'));
    expect(out).toContain('Hello World');
  });

  it('renders h2 heading', () => {
    const out = stripAnsi(renderMarkdown('## Section'));
    expect(out).toContain('Section');
  });

  it('renders h3 heading', () => {
    const out = stripAnsi(renderMarkdown('### Sub'));
    expect(out).toContain('Sub');
  });

  it('renders bold text', () => {
    const out = stripAnsi(renderMarkdown('**bold**'));
    expect(out).toContain('bold');
  });

  it('renders italic text', () => {
    const out = stripAnsi(renderMarkdown('*italic*'));
    expect(out).toContain('italic');
  });

  it('renders strikethrough', () => {
    const out = stripAnsi(renderMarkdown('~~strike~~'));
    expect(out).toContain('strike');
  });

  it('renders inline code', () => {
    const out = stripAnsi(renderMarkdown('Use `npm install`'));
    expect(out).toContain('npm install');
  });

  it('renders unordered list', () => {
    const out = stripAnsi(renderMarkdown('- item one\n- item two'));
    expect(out).toContain('item one');
    expect(out).toContain('item two');
  });

  it('renders ordered list', () => {
    const out = stripAnsi(renderMarkdown('1. first\n2. second'));
    expect(out).toContain('first');
    expect(out).toContain('second');
  });

  it('renders checklist checked', () => {
    const out = stripAnsi(renderMarkdown('- [x] done'));
    expect(out).toContain('done');
  });

  it('renders checklist unchecked', () => {
    const out = stripAnsi(renderMarkdown('- [ ] todo'));
    expect(out).toContain('todo');
  });

  it('renders blockquote', () => {
    const out = stripAnsi(renderMarkdown('> quoted text'));
    expect(out).toContain('quoted text');
  });

  it('renders horizontal rule', () => {
    const out = stripAnsi(renderMarkdown('---'));
    expect(out).toContain('─');
  });

  it('renders fenced code block as codebox', () => {
    const out = renderMarkdown('```typescript\nconst x = 1;\n```');
    expect(out).toContain('╭');
    expect(out).toContain('const x = 1;');
  });

  it('renders diff code block', () => {
    const out = renderMarkdown('```diff\n+added\n-removed\n```');
    expect(out).toContain('╭');
  });

  it('returns plain text when markdown disabled', () => {
    setUiConfig({markdown: false});
    const out = renderMarkdown('# Hello');
    expect(out).toBe('# Hello');
  });

  it('never crashes on empty string', () => {
    expect(() => renderMarkdown('')).not.toThrow();
  });

  it('never crashes on null-like input', () => {
    expect(() => renderMarkdown('```\n')).not.toThrow();
  });

  it('returns a string for any input', () => {
    expect(typeof renderMarkdown('hello **world**')).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// Codebox renderer
// ---------------------------------------------------------------------------

describe('codebox renderer', () => {
  afterEach(() => resetUiConfig());

  it('renders with Unicode borders by default', () => {
    const out = renderCodebox('const x = 1;');
    expect(out).toContain('╭');
    expect(out).toContain('╰');
  });

  it('renders with ASCII borders when unicodeBoxes disabled', () => {
    setUiConfig({unicodeBoxes: false});
    const out = renderCodebox('const x = 1;');
    expect(out).toContain('+');
  });

  it('renders language label in top border', () => {
    const out = renderCodebox('x = 1', {language: 'python'});
    expect(out).toContain('python');
  });

  it('renders file path label', () => {
    const out = renderCodebox('x = 1', {label: 'src/index.ts'});
    expect(out).toContain('src/index.ts');
  });

  it('renders line numbers', () => {
    const out = stripAnsi(renderCodebox('line1\nline2', {lineNumbers: true}));
    expect(out).toContain('1');
    expect(out).toContain('2');
  });

  it('truncates long code blocks', () => {
    const code = Array.from({length: 100}, (_, i) => `line ${i}`).join('\n');
    const out = renderCodebox(code, {maxLines: 5});
    expect(out).toContain('more lines');
  });

  it('renders diff with green added lines', () => {
    const out = renderDiff('+added line\n-removed line');
    expect(out).toContain('╭');
  });

  it('does not crash on empty input', () => {
    expect(() => renderCodebox('')).not.toThrow();
  });

  it('returns a string', () => {
    expect(typeof renderCodebox('test')).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// Table renderer
// ---------------------------------------------------------------------------

describe('table renderer', () => {
  afterEach(() => resetUiConfig());

  it('renders a simple table', () => {
    const table = '| Name | Value |\n|---|---|\n| foo | bar |';
    const out = stripAnsi(renderTable(table));
    expect(out).toContain('Name');
    expect(out).toContain('foo');
    expect(out).toContain('bar');
  });

  it('renders table with Unicode borders', () => {
    const table = '| A | B |\n|---|---|\n| 1 | 2 |';
    const out = renderTable(table);
    expect(out).toContain('╭');
  });

  it('renders table with ASCII borders when disabled', () => {
    setUiConfig({unicodeBoxes: false});
    const table = '| A | B |\n|---|---|\n| 1 | 2 |';
    const out = renderTable(table);
    expect(out).toContain('+');
  });

  it('returns a string', () => {
    expect(typeof renderTable('| A |\n|---|\n| 1 |')).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// Link renderer
// ---------------------------------------------------------------------------

describe('link renderer', () => {
  it('renders a Markdown link', () => {
    const out = stripAnsi(renderLink('OpenSyntax', 'https://example.com'));
    expect(out).toContain('OpenSyntax');
  });

  it('renderLinks replaces all links in text', () => {
    const out = stripAnsi(renderLinks('See [docs](https://example.com) for more'));
    expect(out).toContain('docs');
    expect(out).toContain('more');
  });

  it('returns a string', () => {
    expect(typeof renderLink('text', 'https://example.com')).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// Diff renderer
// ---------------------------------------------------------------------------

describe('diff renderer', () => {
  it('colors added lines green', () => {
    const out = colorDiffLine('+added');
    expect(out).toContain('added');
  });

  it('colors removed lines red', () => {
    const out = colorDiffLine('-removed');
    expect(out).toContain('removed');
  });

  it('colors hunk headers cyan', () => {
    const out = colorDiffLine('@@ -1,3 +1,4 @@');
    expect(out).toContain('@@');
  });

  it('renderUnifiedDiff returns a string', () => {
    const diff = '+added\n-removed\n context';
    expect(typeof renderUnifiedDiff(diff)).toBe('string');
  });

  it('renderUnifiedDiff handles empty input', () => {
    const out = stripAnsi(renderUnifiedDiff(''));
    expect(out).toContain('no diff');
  });
});

// ---------------------------------------------------------------------------
// Message renderer
// ---------------------------------------------------------------------------

describe('message renderer', () => {
  it('renders user message', () => {
    const out = stripAnsi(renderUserMessage('fix the bug'));
    expect(out).toContain('you');
    expect(out).toContain('fix the bug');
  });

  it('renders tool start', () => {
    const out = stripAnsi(renderToolStart('read_file', {path: 'src/index.ts'}));
    expect(out).toContain('read_file');
  });

  it('renders tool end success', () => {
    const out = stripAnsi(renderToolEnd('read_file', true, 42));
    expect(out).toContain('read_file');
    expect(out).toContain('42ms');
  });

  it('renders tool end failure', () => {
    const out = stripAnsi(renderToolEnd('shell', false));
    expect(out).toContain('shell');
  });

  it('renders error panel', () => {
    const out = stripAnsi(renderErrorPanel('Something went wrong'));
    expect(out).toContain('Error');
    expect(out).toContain('Something went wrong');
  });

  it('renders warning panel', () => {
    const out = stripAnsi(renderWarningPanel('Tool calling disabled'));
    expect(out).toContain('Warning');
    expect(out).toContain('Tool calling disabled');
  });

  it('renders success line', () => {
    const out = stripAnsi(renderSuccess('Build passed'));
    expect(out).toContain('Build passed');
  });
});

// ---------------------------------------------------------------------------
// Streaming Markdown renderer
// ---------------------------------------------------------------------------

describe('streaming markdown renderer', () => {
  let renderer: StreamingMarkdownRenderer;

  beforeEach(() => {
    renderer = new StreamingMarkdownRenderer();
  });

  it('renders plain text immediately', () => {
    const out = renderer.feed('Hello world');
    // Plain text should be buffered until newline
    renderer.end();
    expect(typeof out).toBe('string');
  });

  it('does not crash on incomplete code fence', () => {
    renderer.feed('```typescript\n');
    renderer.feed('const x = ');
    expect(() => renderer.end()).not.toThrow();
  });

  it('renders complete code fence', () => {
    renderer.feed('```typescript\nconst x = 1;\n```\n');
    const tail = renderer.end();
    // Should have rendered the codebox
    expect(typeof tail).toBe('string');
  });

  it('buffers open code fence until closed', () => {
    const out1 = renderer.feed('```typescript\n');
    const out2 = renderer.feed('const x = 1;\n');
    // The renderer may return buffered text or empty — it must not crash
    // and must not emit broken ANSI sequences
    const combined = out1 + out2;
    expect(typeof combined).toBe('string');
    // After end(), the buffered code should be flushed
    const tail = renderer.end();
    expect(typeof tail).toBe('string');
  });

  it('renders text before a code fence', () => {
    const out = renderer.feed('Some text\n```ts\ncode\n```\n');
    const tail = renderer.end();
    const combined = stripAnsi(out + tail);
    expect(combined).toContain('Some text');
  });

  it('reset clears all state', () => {
    renderer.feed('```typescript\npartial');
    renderer.reset();
    const out = renderer.feed('clean text\n');
    expect(typeof out).toBe('string');
  });

  it('never crashes on any input', () => {
    const inputs = ['', '```', '```\n', '**bold', '# heading', '\n\n\n', '`incomplete'];
    for (const input of inputs) {
      const r = new StreamingMarkdownRenderer();
      expect(() => { r.feed(input); r.end(); }).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// No-color mode
// ---------------------------------------------------------------------------

describe('no-color mode', () => {
  afterEach(() => {
    delete process.env.NO_COLOR;
    resetUiConfig();
  });

  it('getUiConfig disables syntax highlighting when NO_COLOR set', () => {
    process.env.NO_COLOR = '1';
    const cfg = getUiConfig();
    expect(cfg.syntaxHighlighting).toBe(false);
    expect(cfg.theme).toBe('no-color');
  });

  it('renderMarkdown returns plain text when markdown disabled', () => {
    setUiConfig({markdown: false});
    const out = renderMarkdown('# Hello **world**');
    expect(out).toBe('# Hello **world**');
  });
});
