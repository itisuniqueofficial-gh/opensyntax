import {z} from 'zod';
import {classifyCommand} from '../system/command-risk.js';
import {detectEnvironment} from '../system/environment.js';
import {runCommand} from './command-runner.js';
import {tool} from './types.js';

const shellSchema = z.object({
  command: z.string(),
  cwd: z.string().optional(),
  timeoutMs: z.number().int().positive().max(30 * 60 * 1000).default(120000),
  permission: z.enum(['safe', 'workspace-write', 'full-os']).optional(),
  reason: z.string().optional(),
  intent: z.string().optional(),
  env: z.record(z.string()).optional()
});

export const executeCommandTool = tool({
  name: 'execute_command',
  description: 'Execute a non-interactive terminal command with OS-aware risk classification, live output, timeout, and permission prompts.',
  schema: shellSchema,
  async execute(input, context) {
    enforceRuleShellRestrictions(input.command, context.rules?.shellRules ?? context.rules?.restrictions ?? []);
    const result = await runCommand({command: input.command, cwd: input.cwd, timeoutMs: input.timeoutMs, permission: input.permission, reason: input.reason ?? input.intent ?? 'Run requested terminal command', env: input.env}, context);
    return {
      ok: result.ok,
      output: formatCommandResult(result),
      tool: 'execute_command',
      changed: !['read', 'safe'].includes(result.risk.risk),
      message: result.ok ? 'Command completed' : 'Command failed',
      data: result
    };
  }
});

export async function terminalSummary(workspace: string): Promise<string> {
  const env = await detectEnvironment();
  return [`OS: ${env.platform}${env.distro ? `/${env.distro}` : ''}`, `Shell: ${env.shell}`, `WSL: ${env.isWSL ? 'yes' : 'no'}`, `CWD: ${workspace}`, `Home: ${env.home}`, `Node: ${env.node}`].join('\n');
}

export function commandRiskSummary(command: string): string {
  const risk = classifyCommand(command);
  return [`Command: ${command}`, `Risk: ${risk.risk}`, `Approval: ${risk.requiresApproval ? 'required' : 'not required'}`, `Typed confirmation: ${risk.requiresTypedConfirmation ? 'required' : 'not required'}`, ...risk.reasons.map((reason) => `- ${reason}`)].join('\n');
}

function formatCommandResult(result: Awaited<ReturnType<typeof runCommand>>): string {
  return JSON.stringify({ok: result.ok, command: result.command, cwd: result.cwd, exitCode: result.exitCode, stdout: result.stdout, stderr: result.stderr, durationMs: result.durationMs, timedOut: result.timedOut, cancelled: result.cancelled, recovery: result.recovery}, null, 2);
}

function enforceRuleShellRestrictions(command: string, rules: string[]): void {
  const lower = command.toLowerCase();
  const text = rules.join('\n').toLowerCase();
  if (/never use npm|use bun only|bun only|prefer bun/.test(text) && /\bnpm\b/.test(lower)) throw new Error('Workspace rules prohibit npm commands; use bun instead.');
  if (/do not use npm|don't use npm/.test(text) && /\bnpm\b/.test(lower)) throw new Error('Workspace rules prohibit npm commands.');
  if (/never use pnpm|do not use pnpm/.test(text) && /\bpnpm\b/.test(lower)) throw new Error('Workspace rules prohibit pnpm commands.');
  if (/never use yarn|do not use yarn/.test(text) && /\byarn\b/.test(lower)) throw new Error('Workspace rules prohibit yarn commands.');
  if (/never run docker|do not run docker|no docker/.test(text) && /\bdocker\b/.test(lower)) throw new Error('Workspace rules prohibit docker commands.');
}
