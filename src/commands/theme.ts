/**
 * /theme command — switch between dark, light, and no-color themes.
 */

import chalk from 'chalk';
import {loadConfig, saveConfig} from '../config/config.js';
import {setUiConfig, getUiConfig} from '../ui/ui-config.js';
import {panel} from '../ui/renderer.js';

export async function handleThemeCommand(themeName: string): Promise<void> {
  const cfg = getUiConfig();

  if (!themeName) {
    panel('Theme', [
      `Current theme: ${chalk.cyan(cfg.theme)}`,
      '',
      'Available themes:',
      '  dark      — default dark terminal theme',
      '  light     — light terminal theme',
      '  no-color  — plain text, no ANSI colors',
      '',
      'Usage: /theme dark|light|no-color'
    ].join('\n'));
    return;
  }

  const valid = ['dark', 'light', 'no-color'];
  if (!valid.includes(themeName)) {
    panel('Theme', `Unknown theme: ${themeName}\nAvailable: ${valid.join(', ')}`);
    return;
  }

  const appCfg = await loadConfig();
  const theme = themeName as 'dark' | 'light' | 'no-color';
  setUiConfig({
    theme,
    syntaxHighlighting: theme !== 'no-color',
    unicodeBoxes: theme !== 'no-color'
  });
  await saveConfig({...appCfg, theme, syntaxHighlighting: theme !== 'no-color', unicodeBoxes: theme !== 'no-color'});
  panel('Theme', `Theme set to: ${chalk.cyan(theme)}`);
}
