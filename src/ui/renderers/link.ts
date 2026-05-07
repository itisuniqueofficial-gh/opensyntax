/**
 * Link renderer for terminal output.
 *
 * Supports:
 * - OSC 8 clickable hyperlinks (Windows Terminal, iTerm2, modern terminals)
 * - Plain text fallback: "text (url)"
 * - NO_COLOR / config-driven disable
 */

import chalk from 'chalk';
import {getUiConfig} from '../ui-config.js';

/** Detect whether the terminal likely supports OSC 8 hyperlinks. */
function supportsOsc8(): boolean {
  const term = process.env.TERM_PROGRAM ?? '';
  const colorterm = process.env.COLORTERM ?? '';
  // Windows Terminal, iTerm2, Hyper, VSCode terminal
  return /windows-terminal|iterm|hyper|vscode/i.test(term) ||
    /truecolor|24bit/i.test(colorterm) ||
    process.env.WT_SESSION !== undefined; // Windows Terminal session ID
}

/** Render a Markdown link for terminal output. */
export function renderLink(text: string, url: string): string {
  const cfg = getUiConfig();

  if (cfg.clickableLinks && supportsOsc8()) {
    // OSC 8 hyperlink: \e]8;;url\e\\text\e]8;;\e\\
    return `\x1B]8;;${url}\x1B\\${chalk.cyan.underline(text)}\x1B]8;;\x1B\\`;
  }

  // Plain fallback
  if (url === text || url.includes(text)) {
    return chalk.cyan.underline(url);
  }
  return `${chalk.cyan.underline(text)} ${chalk.gray(`(${url})`)}`;
}

/** Replace all Markdown links in a string. */
export function renderLinks(text: string): string {
  return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, linkText: string, url: string) =>
    renderLink(linkText, url)
  );
}
