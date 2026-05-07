/**
 * /markdown, /highlight, /codebox, /linenos commands.
 * Toggle rendering features at runtime.
 */

import chalk from 'chalk';
import {loadConfig, saveConfig} from '../config/config.js';
import {setUiConfig, getUiConfig} from '../ui/ui-config.js';
import {panel} from '../ui/renderer.js';

export async function handleMarkdownCommand(subcommand: string): Promise<void> {
  const cfg = getUiConfig();
  const appCfg = await loadConfig();

  if (subcommand === 'on' || subcommand === 'off') {
    const enabled = subcommand === 'on';
    setUiConfig({markdown: enabled});
    await saveConfig({...appCfg, markdown: enabled});
    panel('Markdown', `Markdown rendering: ${enabled ? chalk.green('on') : chalk.red('off')}`);
    return;
  }

  // Show current status
  panel('Markdown', [
    `Markdown:           ${cfg.markdown ? chalk.green('on') : chalk.red('off')}`,
    `Syntax highlighting:${cfg.syntaxHighlighting ? chalk.green('on') : chalk.red('off')}`,
    `Code boxes:         ${cfg.codeBox ? chalk.green('on') : chalk.red('off')}`,
    `Line numbers:       ${cfg.lineNumbers ? chalk.green('on') : chalk.red('off')}`,
    `Unicode boxes:      ${cfg.unicodeBoxes ? chalk.green('on') : chalk.red('off')}`,
    `Clickable links:    ${cfg.clickableLinks ? chalk.green('on') : chalk.red('off')}`,
    '',
    'Commands:',
    '  /markdown on|off',
    '  /highlight on|off',
    '  /codebox on|off',
    '  /linenos on|off',
    '  /theme dark|light|no-color'
  ].join('\n'));
}

export async function handleHighlightCommand(subcommand: string): Promise<void> {
  const appCfg = await loadConfig();
  const enabled = subcommand === 'on';
  setUiConfig({syntaxHighlighting: enabled});
  await saveConfig({...appCfg, syntaxHighlighting: enabled});
  panel('Highlight', `Syntax highlighting: ${enabled ? chalk.green('on') : chalk.red('off')}`);
}

export async function handleCodeboxCommand(subcommand: string): Promise<void> {
  const appCfg = await loadConfig();
  const enabled = subcommand === 'on';
  setUiConfig({codeBox: enabled});
  await saveConfig({...appCfg, codeBox: enabled});
  panel('Codebox', `Code boxes: ${enabled ? chalk.green('on') : chalk.red('off')}`);
}

export async function handleLinenosCommand(subcommand: string): Promise<void> {
  const appCfg = await loadConfig();
  const enabled = subcommand === 'on';
  setUiConfig({lineNumbers: enabled});
  await saveConfig({...appCfg, lineNumbers: enabled});
  panel('Line Numbers', `Line numbers: ${enabled ? chalk.green('on') : chalk.red('off')}`);
}
