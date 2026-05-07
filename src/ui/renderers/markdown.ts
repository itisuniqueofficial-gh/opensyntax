/**
 * Advanced Markdown renderer for terminal output.
 *
 * Supports:
 * - h1–h6 headings
 * - paragraphs
 * - bold, italic, strikethrough
 * - inline code
 * - fenced code blocks (rendered as codeboxes)
 * - ordered and unordered lists (nested)
 * - checklists [ ] / [x]
 * - blockquotes
 * - horizontal rules
 * - links (via link renderer)
 * - tables (via table renderer)
 * - diff blocks
 * - raw text fallback
 *
 * Respects NO_COLOR and the runtime UiConfig.
 */

import chalk from 'chalk';
import {renderCodebox, renderDiff} from './codebox.js';
import {renderTable} from './table.js';
import {renderLinks} from './link.js';
import {getUiConfig} from '../ui-config.js';

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function renderMarkdown(text: string): string {
  const cfg = getUiConfig();
  if (!cfg.markdown) return text;

  try {
    return _render(text, cfg);
  } catch {
    // Never crash — return raw text on any error
    return text;
  }
}

// ---------------------------------------------------------------------------
// Core renderer
// ---------------------------------------------------------------------------

function _render(text: string, cfg: ReturnType<typeof getUiConfig>): string {
  let result = text;

  // 1. Fenced code blocks — must be processed before any inline rules
  result = result.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang: string | undefined, code: string) => {
    const language = lang?.toLowerCase() ?? 'text';
    if (!cfg.codeBox) {
      // Plain fallback
      return `\n${code.trimEnd()}\n`;
    }
    if (language === 'diff' || language === 'patch') {
      return '\n' + renderDiff(code.trimEnd()) + '\n';
    }
    return '\n' + renderCodebox(code.trimEnd(), {
      language,
      lineNumbers: cfg.lineNumbers,
    }) + '\n';
  });

  // 2. Tables — detect and render before other inline processing
  result = result.replace(/(\|.+\|\n\|[-: |]+\|\n(?:\|.+\|\n?)*)/g, (match) => {
    try {
      return '\n' + renderTable(match) + '\n';
    } catch {
      return match;
    }
  });

  // 3. Headings (h1–h6)
  result = result
    .replace(/^###### (.+)$/gm, chalk.bold.gray('$1'))
    .replace(/^##### (.+)$/gm, chalk.bold.gray('$1'))
    .replace(/^#### (.+)$/gm, chalk.bold.white('$1'))
    .replace(/^### (.+)$/gm, chalk.bold.cyan('$1'))
    .replace(/^## (.+)$/gm, chalk.bold.cyan('$1'))
    .replace(/^# (.+)$/gm, (_, t: string) => chalk.bold.white(t) + '\n' + chalk.gray('─'.repeat(Math.min(t.length + 2, 60))));

  // 4. Horizontal rules
  result = result.replace(/^(---+|\*\*\*+|___+)$/gm,
    chalk.gray('─'.repeat(Math.min(process.stdout.columns ?? 80, 60)))
  );

  // 5. Blockquotes
  result = result.replace(/^(> .+(\n> .+)*)/gm, (match) => {
    return match.split('\n')
      .map((line) => chalk.gray('│ ') + chalk.italic.gray(line.replace(/^> /, '')))
      .join('\n');
  });

  // 6. Checklists (before unordered lists)
  result = result.replace(/^(\s*)- \[x\] (.+)$/gim, (_, indent: string, item: string) =>
    `${indent}${chalk.green('[✓]')} ${chalk.dim(item)}`
  );
  result = result.replace(/^(\s*)- \[ \] (.+)$/gm, (_, indent: string, item: string) =>
    `${indent}${chalk.gray('[ ]')} ${item}`
  );

  // 7. Unordered lists
  result = result.replace(/^(\s*)[-*+] (.+)$/gm, (_, indent: string, item: string) =>
    `${indent}${chalk.gray('·')} ${item}`
  );

  // 8. Ordered lists
  result = result.replace(/^(\s*)(\d+)\. (.+)$/gm, (_, indent: string, num: string, item: string) =>
    `${indent}${chalk.gray(`${num}.`)} ${item}`
  );

  // 9. Bold + italic combined (***text***)
  result = result.replace(/\*\*\*(.+?)\*\*\*/g, (_, t: string) => chalk.bold.italic(t));

  // 10. Bold (**text**)
  result = result.replace(/\*\*(.+?)\*\*/g, (_, t: string) => chalk.bold(t));

  // 11. Italic (*text* or _text_)
  result = result.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, (_, t: string) => chalk.italic(t));
  result = result.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, (_, t: string) => chalk.italic(t));

  // 12. Strikethrough (~~text~~)
  result = result.replace(/~~(.+?)~~/g, (_, t: string) => chalk.strikethrough(t));

  // 13. Inline code (must come after bold/italic to avoid conflicts)
  result = result.replace(/`([^`\n]+)`/g, (_, code: string) => chalk.yellow(code));

  // 14. Links
  result = renderLinks(result);

  return result;
}
