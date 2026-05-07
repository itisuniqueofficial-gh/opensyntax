/**
 * /capabilities command — shows what the current provider/model supports.
 */

import chalk from 'chalk';
import {getProviderCapabilities} from '../providers/capabilities.js';
import {findModel, capabilityBadges} from '../model/registry.js';
import {panel} from '../ui/renderer.js';

export function renderCapabilities(providerId: string, modelId: string): string {
  const provCaps = getProviderCapabilities(providerId);
  const modelEntry = findModel(providerId, modelId);
  const tick = (v: boolean) => v ? chalk.green('✓') : chalk.red('✗');

  const lines: string[] = [
    `Provider: ${chalk.cyan(providerId)}`,
    `Model:    ${chalk.cyan(modelId)}`,
    ''
  ];

  // Provider-level API capabilities
  lines.push(chalk.bold('Provider API capabilities:'));
  lines.push(`  ${tick(provCaps.supportsStreaming)}  Streaming`);
  lines.push(`  ${tick(provCaps.supportsTools)}  Tool calling`);
  lines.push(`  ${tick(provCaps.supportsToolChoice)}  Tool choice control`);
  lines.push(`  ${tick(provCaps.supportsParallelTools)}  Parallel tool calls`);
  lines.push(`  ${tick(provCaps.supportsSystemRole)}  System messages`);
  lines.push(`  ${tick(provCaps.supportsTemperature)}  Temperature control`);
  lines.push(`  ${tick(provCaps.supportsMaxTokens)}  Max tokens`);
  lines.push(`  ${tick(provCaps.supportsResponseFormat)}  JSON mode (response_format)`);
  lines.push(`  ${tick(provCaps.supportsReasoningParams)}  Reasoning parameters`);
  lines.push(`  ${tick(provCaps.supportsToolMessages)}  Tool result messages`);

  // Model-level capabilities from registry
  if (modelEntry) {
    lines.push('');
    lines.push(chalk.bold('Model capabilities (from registry):'));
    lines.push(`  ${tick(modelEntry.supportsTools)}  Tool calling`);
    lines.push(`  ${tick(modelEntry.supportsStreaming)}  Streaming`);
    lines.push(`  ${tick(modelEntry.supportsVision)}  Vision`);
    lines.push(`  ${tick(modelEntry.supportsReasoning)}  Reasoning / thinking`);
    lines.push(`  ${tick(modelEntry.supportsJson)}  JSON output`);
    if (modelEntry.contextWindow) {
      lines.push(`  ${chalk.gray('·')}  Context window: ${(modelEntry.contextWindow / 1000).toFixed(0)}k tokens`);
    }
    const badges = capabilityBadges(modelEntry);
    if (badges.length) lines.push(`  ${chalk.gray('·')}  Tags: ${badges.join(', ')}`);
  } else {
    lines.push('');
    lines.push(chalk.gray('Model not in registry — capabilities assumed from provider defaults.'));
  }

  // Effective behaviour note
  const effectiveTools = provCaps.supportsTools && (modelEntry?.supportsTools ?? true);
  if (!effectiveTools) {
    lines.push('');
    lines.push(chalk.yellow('⚠  Tool calling is disabled for this provider/model combination.'));
    lines.push(chalk.gray('   OpenSyntax will run in text-only mode.'));
  }

  return lines.join('\n');
}

export async function showCapabilities(providerId: string, modelId: string): Promise<void> {
  panel('Capabilities', renderCapabilities(providerId, modelId));
}
