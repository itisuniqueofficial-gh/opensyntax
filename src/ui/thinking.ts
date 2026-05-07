/**
 * Thinking / progress display.
 *
 * Rules:
 * - Never reveal hidden chain-of-thought.
 * - Show concise, safe reasoning summaries only.
 * - Show tool decisions and progress steps.
 * - Show why risky actions need approval.
 */

import chalk from 'chalk';

export type ThinkingStep =
  | 'understanding'
  | 'checking-workspace'
  | 'planning'
  | 'selecting-tools'
  | 'executing'
  | 'verifying'
  | 'summarizing';

const STEP_LABELS: Record<ThinkingStep, string> = {
  'understanding': 'Understanding request',
  'checking-workspace': 'Checking workspace',
  'planning': 'Planning changes',
  'selecting-tools': 'Selecting tools',
  'executing': 'Executing',
  'verifying': 'Verifying result',
  'summarizing': 'Summarizing'
};

export type ThinkingConfig = {
  enabled: boolean;
  showReasoningSummary: boolean;
};

let thinkingConfig: ThinkingConfig = {
  enabled: true,
  showReasoningSummary: false
};

export function getThinkingConfig(): ThinkingConfig {
  return {...thinkingConfig};
}

export function setThinkingEnabled(enabled: boolean): void {
  thinkingConfig = {...thinkingConfig, enabled};
}

export function setReasoningSummaryEnabled(enabled: boolean): void {
  thinkingConfig = {...thinkingConfig, showReasoningSummary: enabled};
}

/** Show a thinking progress step. */
export function showThinkingStep(step: ThinkingStep): void {
  if (!thinkingConfig.enabled) return;
  process.stdout.write(`${chalk.gray('·')} ${chalk.dim('Thinking...')} ${chalk.gray(STEP_LABELS[step])}\n`);
}

/** Show the full thinking progress block. */
export function showThinkingBlock(steps: ThinkingStep[]): void {
  if (!thinkingConfig.enabled) return;
  process.stdout.write(`\n${chalk.dim('Thinking...')}\n`);
  for (const step of steps) {
    process.stdout.write(`  ${chalk.gray('-')} ${chalk.gray(STEP_LABELS[step])}\n`);
  }
  process.stdout.write('\n');
}

/** Show a safe reasoning summary (never reveals hidden chain-of-thought). */
export function showReasoningSummary(summary: string): void {
  if (!thinkingConfig.enabled || !thinkingConfig.showReasoningSummary) return;
  process.stdout.write(`\n${chalk.dim('Reasoning summary:')}\n${chalk.gray(summary)}\n\n`);
}

/** Show why a risky action requires approval. */
export function showRiskReason(action: string, reason: string): void {
  if (!thinkingConfig.enabled) return;
  process.stdout.write(`\n${chalk.yellow('⚠')} ${chalk.yellow('Approval required')}\n`);
  process.stdout.write(`  ${chalk.gray('Action:')} ${action}\n`);
  process.stdout.write(`  ${chalk.gray('Reason:')} ${reason}\n\n`);
}

/** Show a tool decision. */
export function showToolDecision(toolName: string, reason?: string): void {
  if (!thinkingConfig.enabled) return;
  const reasonText = reason ? ` — ${chalk.gray(reason)}` : '';
  process.stdout.write(`${chalk.gray('·')} ${chalk.dim('Using tool:')} ${chalk.cyan(toolName)}${reasonText}\n`);
}

/** Render the /thinking command output. */
export function renderThinkingStatus(): string {
  const cfg = thinkingConfig;
  return [
    `Thinking display: ${cfg.enabled ? chalk.green('on') : chalk.red('off')}`,
    `Reasoning summary: ${cfg.showReasoningSummary ? chalk.green('on') : chalk.red('off')}`,
    '',
    'Commands:',
    '  /thinking on   — enable thinking display',
    '  /thinking off  — disable thinking display',
    '  /reasoning     — toggle reasoning summary'
  ].join('\n');
}
