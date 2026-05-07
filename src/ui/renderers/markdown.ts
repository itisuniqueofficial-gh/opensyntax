/**
 * Advanced markdown renderer for terminal output.
 * Handles headings, lists, tables, code blocks, inline code, links, diffs.
 */

import chalk from 'chalk';
import {renderCodebox, renderDiff} from './codebox.js';

export function renderMarkdown(text: string): string {
  // Process code blocks first (they may contain markdown-like content)
  let result = text;

  // Fenced code blocks: ```lang\n...\n```
  result = result.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang: string | undefined, code: string) => {
    const language = lang?.toLowerCase() ?? 'text';
    if (language === 'diff' || language === 'patch') {
      return '\n' + renderDiff(code.trimEnd()) + '\n';
    }
    return '\n' + renderCodebox(code.trimEnd(), {language, lineNumbers: true}) + '\n';
  });

  // Headings
  result = result
    .replace(/^### (.+)$/gm, chalk.bold.cyan('$1'))
    .replace(/^## (.+)$/gm, chalk.bold.cyan('$1'))
    .replace(/^# (.+)$/gm, chalk.bold.white('$1'));

  // Bold
  result = result.replace(/\*\*(.+?)\*\*/g, (_, t: string) => chalk.bold(t));

  // Italic
  result = result.replace(/\*(.+?)\*/g, (_, t: string) => chalk.italic(t));

  // Inline code
  result = result.replace(/`([^`\n]+)`/g, (_, code: string) => chalk.yellow(code));

  // Horizontal rule
  result = result.replace(/^---+$/gm, chalk.gray('─'.repeat(Math.min(process.stdout.columns ?? 80, 60))));

  // Unordered lists
  result = result.replace(/^(\s*)[-*] (.+)$/gm, (_, indent: string, item: string) =>
    `${indent}${chalk.gray('·')} ${item}`
  );

  // Ordered lists
  result = result.replace(/^(\s*)(\d+)\. (.+)$/gm, (_, indent: string, num: string, item: string) =>
    `${indent}${chalk.gray(num + '.')} ${item}`
  );

  // Blockquotes
  result = result.replace(/^> (.+)$/gm, (_, text: string) =>
    chalk.gray('│ ') + chalk.italic.gray(text)
  );

  // Links — show text only in terminal
  result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, (_, text: string) => chalk.cyan.underline(text));

  return result;
}
