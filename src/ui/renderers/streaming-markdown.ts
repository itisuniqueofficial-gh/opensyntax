/**
 * Streaming-safe Markdown renderer.
 *
 * AI output arrives token by token. This module buffers the stream and
 * decides what is safe to render immediately vs what must wait for a
 * complete construct (e.g. a fenced code block).
 *
 * Rules:
 * - Plain text and completed constructs render immediately.
 * - An open fenced code block is buffered until the closing ``` arrives.
 * - Partial inline constructs (bold, italic, inline code) are rendered
 *   as plain text until the closing delimiter arrives.
 * - Never emits broken ANSI escape sequences.
 * - Never crashes on any input.
 */

import {renderMarkdown} from './markdown.js';
import {renderCodebox} from './codebox.js';
import {getUiConfig} from '../ui-config.js';

export class StreamingMarkdownRenderer {
  private buffer = '';
  private inCodeFence = false;
  private codeFenceLang = '';
  private codeFenceContent = '';
  private renderedUpTo = 0;

  /**
   * Feed a new chunk of text from the stream.
   * Returns the string that should be written to stdout right now.
   */
  feed(chunk: string): string {
    this.buffer += chunk;
    return this.flush();
  }

  /**
   * Signal that the stream is complete.
   * Renders any remaining buffered content.
   */
  end(): string {
    if (this.inCodeFence) {
      // Stream ended inside an open code fence — render what we have
      const cfg = getUiConfig();
      const output = cfg.codeBox
        ? renderCodebox(this.codeFenceContent, {language: this.codeFenceLang || 'text', lineNumbers: cfg.lineNumbers})
        : this.codeFenceContent;
      this.reset();
      return '\n' + output + '\n';
    }
    const remaining = this.buffer.slice(this.renderedUpTo);
    this.reset();
    if (!remaining.trim()) return '';
    return renderMarkdown(remaining);
  }

  /** Reset all state. */
  reset(): void {
    this.buffer = '';
    this.inCodeFence = false;
    this.codeFenceLang = '';
    this.codeFenceContent = '';
    this.renderedUpTo = 0;
  }

  // ---------------------------------------------------------------------------
  // Internal flush logic
  // ---------------------------------------------------------------------------

  private flush(): string {
    const text = this.buffer;
    let output = '';

    // Scan from renderedUpTo forward
    let pos = this.renderedUpTo;

    while (pos < text.length) {
      if (this.inCodeFence) {
        // Look for closing ```
        const closeIdx = text.indexOf('\n```', pos);
        if (closeIdx === -1) {
          // Closing fence not yet received — buffer everything
          this.codeFenceContent = text.slice(this.renderedUpTo + this.codeFenceLang.length + 4);
          return output; // nothing new to render
        }
        // Found closing fence
        const codeContent = text.slice(pos, closeIdx);
        this.codeFenceContent = codeContent;
        const cfg = getUiConfig();
        const rendered = cfg.codeBox
          ? renderCodebox(codeContent, {language: this.codeFenceLang || 'text', lineNumbers: cfg.lineNumbers})
          : codeContent;
        output += '\n' + rendered + '\n';
        pos = closeIdx + 4; // skip \n```
        this.renderedUpTo = pos;
        this.inCodeFence = false;
        this.codeFenceLang = '';
        this.codeFenceContent = '';
        continue;
      }

      // Look for opening ```
      const fenceIdx = text.indexOf('\n```', pos);
      if (fenceIdx === -1) {
        // No fence in remaining text — render everything up to last newline
        // (keep the last partial line buffered in case it starts a fence)
        const lastNewline = text.lastIndexOf('\n', text.length - 1);
        const safeEnd = lastNewline > pos ? lastNewline : pos;
        if (safeEnd > pos) {
          const chunk = text.slice(pos, safeEnd);
          output += renderMarkdown(chunk);
          this.renderedUpTo = safeEnd;
          pos = safeEnd;
        }
        break;
      }

      // Render text before the fence
      if (fenceIdx > pos) {
        const before = text.slice(pos, fenceIdx);
        output += renderMarkdown(before);
      }

      // Parse the fence opening: \n```lang\n
      const afterFence = text.indexOf('\n', fenceIdx + 4);
      if (afterFence === -1) {
        // Fence opening not complete yet
        this.renderedUpTo = fenceIdx;
        pos = fenceIdx;
        break;
      }

      this.codeFenceLang = text.slice(fenceIdx + 4, afterFence).trim().toLowerCase();
      this.inCodeFence = true;
      pos = afterFence + 1;
      this.renderedUpTo = pos;
    }

    return output;
  }
}

/** Module-level singleton for the agent loop. */
let _renderer: StreamingMarkdownRenderer | null = null;

export function getStreamingRenderer(): StreamingMarkdownRenderer {
  if (!_renderer) _renderer = new StreamingMarkdownRenderer();
  return _renderer;
}

export function resetStreamingRenderer(): void {
  _renderer = null;
}
