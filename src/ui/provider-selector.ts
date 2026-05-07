/**
 * Interactive provider selector — shows ONLY connected providers.
 */

import chalk from 'chalk';
import prompts from 'prompts';
import {listConnectedProviders} from '../auth/manager.js';
import {getProviderCapabilities} from '../providers/capabilities.js';
import {panel} from './renderer.js';

/**
 * Show an interactive selector for connected providers only.
 * Returns the selected provider id, or undefined if cancelled.
 */
export async function selectConnectedProvider(): Promise<string | undefined> {
  const connected = await listConnectedProviders();

  if (!connected.length) {
    panel('Provider', 'No providers connected. Run: opensyntax auth');
    return undefined;
  }

  if (connected.length === 1) {
    // Only one provider — no need to ask
    return connected[0].providerId;
  }

  const choices = connected.map((item) => {
    const caps = getProviderCapabilities(item.providerId);
    const features = [
      caps.supportsTools ? 'tools' : null,
      caps.supportsStreaming ? 'streaming' : null,
      caps.supportsReasoningParams ? 'reasoning' : null
    ].filter(Boolean).map((f) => chalk.gray(`[${f}]`)).join(' ');

    return {
      title: `${item.isDefault ? chalk.green('● ') : '  '}${item.name} ${features}`,
      value: item.providerId,
      description: `model: ${item.model}`
    };
  });

  const response = await prompts({
    type: 'select',
    name: 'value',
    message: 'Select Provider',
    choices
  });

  return response.value as string | undefined;
}
