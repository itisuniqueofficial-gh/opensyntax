/**
 * /settings command handler — interactive settings manager.
 */

import chalk from 'chalk';
import prompts from 'prompts';
import {loadConfig, saveConfig} from '../config/config.js';
import {panel} from '../ui/renderer.js';
import {setThinkingEnabled, setReasoningSummaryEnabled, renderThinkingStatus} from '../ui/thinking.js';

export async function runSettingsCommand(): Promise<void> {
  const config = await loadConfig();

  panel('Settings', [
    `Provider:          ${chalk.cyan(config.provider)}`,
    `Model:             ${chalk.cyan(config.model)}`,
    `Permission:        ${chalk.cyan(config.permission)}`,
    `Temperature:       ${config.temperature}`,
    `Max tokens:        ${config.maxTokens}`,
    `Thinking display:  ${config.thinkingDisplay ? chalk.green('on') : chalk.red('off')}`,
    `Reasoning summary: ${config.showReasoningSummary ? chalk.green('on') : chalk.red('off')}`,
    `Model fallback:    ${config.modelFallback ? chalk.green('on') : chalk.red('off')}`,
    `Show tool summary: ${config.showToolSummary ? chalk.green('on') : chalk.red('off')}`
  ].join('\n'));

  const action = (await prompts({
    type: 'select',
    name: 'value',
    message: 'What would you like to change?',
    choices: [
      {title: 'Toggle thinking display', value: 'thinking'},
      {title: 'Toggle reasoning summary', value: 'reasoning'},
      {title: 'Toggle model fallback', value: 'fallback'},
      {title: 'Toggle tool summary', value: 'tools'},
      {title: 'Set temperature', value: 'temperature'},
      {title: 'Set max tokens', value: 'maxTokens'},
      {title: 'Exit settings', value: 'exit'}
    ]
  })).value;

  if (!action || action === 'exit') return;

  if (action === 'thinking') {
    const next = !config.thinkingDisplay;
    setThinkingEnabled(next);
    await saveConfig({...config, thinkingDisplay: next});
    panel('Settings', `Thinking display: ${next ? chalk.green('on') : chalk.red('off')}`);
  } else if (action === 'reasoning') {
    const next = !config.showReasoningSummary;
    setReasoningSummaryEnabled(next);
    await saveConfig({...config, showReasoningSummary: next});
    panel('Settings', `Reasoning summary: ${next ? chalk.green('on') : chalk.red('off')}`);
  } else if (action === 'fallback') {
    const next = !config.modelFallback;
    await saveConfig({...config, modelFallback: next});
    panel('Settings', `Model fallback: ${next ? chalk.green('on') : chalk.red('off')}`);
  } else if (action === 'tools') {
    const next = !config.showToolSummary;
    await saveConfig({...config, showToolSummary: next});
    panel('Settings', `Tool summary: ${next ? chalk.green('on') : chalk.red('off')}`);
  } else if (action === 'temperature') {
    const value = (await prompts({type: 'number', name: 'value', message: 'Temperature (0–2)', initial: config.temperature, float: true, round: 2})).value;
    if (value !== undefined) {
      await saveConfig({...config, temperature: value});
      panel('Settings', `Temperature set to ${value}`);
    }
  } else if (action === 'maxTokens') {
    const value = (await prompts({type: 'number', name: 'value', message: 'Max tokens', initial: config.maxTokens})).value;
    if (value !== undefined) {
      await saveConfig({...config, maxTokens: value});
      panel('Settings', `Max tokens set to ${value}`);
    }
  }
}

/** Render current settings as a string (for /settings slash command). */
export async function renderSettings(): Promise<string> {
  const config = await loadConfig();
  return [
    `Provider:          ${config.provider}`,
    `Model:             ${config.model}`,
    `Permission:        ${config.permission}`,
    `Temperature:       ${config.temperature}`,
    `Max tokens:        ${config.maxTokens}`,
    `Thinking display:  ${config.thinkingDisplay ? 'on' : 'off'}`,
    `Reasoning summary: ${config.showReasoningSummary ? 'on' : 'off'} (safe summaries only)`,
    `Model fallback:    ${config.modelFallback ? 'on' : 'off'}`,
    `Show tool summary: ${config.showToolSummary ? 'on' : 'off'}`,
    '',
    renderThinkingStatus()
  ].join('\n');
}
