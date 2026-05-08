import {execa} from 'execa';
import path from 'node:path';
import {classifyCommand, type CommandRiskResult} from '../system/command-risk.js';
import {maskSecrets} from '../system/environment.js';
import {commandEnd, commandOutput, commandStart, summarizeCommandFailure} from '../ui/command-panel.js';
import {resolveSafePath} from './path-safety.js';
import {normalizeCommandPermission, type CommandPermissionMode} from './permissions.js';
import type {PermissionLevel, ToolContext} from './types.js';

export type CommandExecutionInput = {
  command: string;
  cwd?: string;
  timeoutMs?: number;
  permission?: 'safe' | 'workspace-write' | 'full-os';
  reason: string;
  env?: Record<string, string>;
};

export type CommandExecutionOutput = {
  ok: boolean;
  command: string;
  cwd: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
  cancelled: boolean;
  risk: CommandRiskResult;
  recovery?: string;
};

export async function runCommand(input: CommandExecutionInput, context: ToolContext): Promise<CommandExecutionOutput> {
  const cwd = await resolveCommandCwd(context, input.cwd);
  const risk = classifyCommand(input.command, cwd);
  const mode = input.permission === 'safe' ? 'workspace-safe' : input.permission === 'full-os' ? 'full-os' : normalizeCommandPermission(context.permission as PermissionLevel);
  await enforceCommandPermission(input, context, mode, cwd, risk);
  commandStart(input.command, cwd);
  const start = Date.now();
  let stdout = '';
  let stderr = '';
  let timedOut = false;
  let cancelled = false;
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  context.signal?.addEventListener('abort', onAbort, {once: true});
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, input.timeoutMs ?? 120000);
  const subprocess = execa(input.command, {cwd, shell: true, reject: false, cancelSignal: controller.signal, env: input.env ? {...process.env, ...input.env} : process.env});
  subprocess.stdout?.on('data', (chunk) => { const text = String(chunk); stdout += text; commandOutput(text); });
  subprocess.stderr?.on('data', (chunk) => { const text = String(chunk); stderr += text; commandOutput(text); });
  const result = await subprocess.catch((error: any) => {
    timedOut = timedOut || error.timedOut === true;
    cancelled = error.isCanceled === true || error.name === 'AbortError';
    return {exitCode: error.exitCode ?? null, stdout: error.stdout ?? stdout, stderr: error.stderr ?? stderr};
  });
  clearTimeout(timer);
  context.signal?.removeEventListener('abort', onAbort);
  const durationMs = Date.now() - start;
  stdout = maskSecrets(stdout || result.stdout || '');
  stderr = maskSecrets(stderr || result.stderr || '');
  const ok = result.exitCode === 0 && !timedOut && !cancelled;
  commandEnd(input.command, ok, result.exitCode, durationMs);
  return {ok, command: input.command, cwd, exitCode: result.exitCode, stdout, stderr, durationMs, timedOut, cancelled, risk, recovery: ok ? undefined : summarizeCommandFailure(stderr, stdout)};
}

async function resolveCommandCwd(context: ToolContext, cwd?: string): Promise<string> {
  if (!cwd) return context.workspace;
  const safe = await resolveSafePath(context.workspace, cwd, context.rules, {allowMissing: false, checkIgnored: false, allowRoot: true});
  if (!safe.isDirectory) throw new Error(`Command cwd is not a directory: ${cwd}`);
  return safe.absolute;
}

async function enforceCommandPermission(input: CommandExecutionInput, context: ToolContext, mode: CommandPermissionMode, cwd: string, risk: CommandRiskResult): Promise<void> {
  if (mode === 'read-only' && risk.risk !== 'read') throw new Error(`Command blocked by read-only permission: ${input.command}`);
  if (mode === 'workspace-safe' && !['read', 'safe'].includes(risk.risk)) throw new Error(`Command requires workspace-write or higher permission: ${input.command}`);
  if (mode === 'workspace-write' && ['install', 'network', 'git-write', 'system-write', 'destructive', 'dangerous'].includes(risk.risk)) throw new Error(`Command requires shell-safe or approval: ${input.command}`);
  if (risk.fullOsRequired && mode !== 'full-os' && mode !== 'danger') {
    const approved = await context.askPermission({tool: 'execute_command', path: path.relative(context.workspace, cwd) || '.', action: input.command, reason: `${input.reason}\n\nThis may modify your system.`, risk: 'high'});
    if (!approved) throw new Error('Full OS command cancelled by user');
  }
  if (risk.requiresTypedConfirmation) {
    const confirmationText = `run ${input.command}`;
    const approved = await context.askPermission({tool: 'execute_command', path: path.relative(context.workspace, cwd) || '.', action: input.command, reason: risk.reasons.join('\n'), risk: 'high', confirmationText});
    if (!approved) throw new Error('Dangerous command cancelled by user');
    return;
  }
  if (risk.requiresApproval && (mode === 'shell-safe' || mode === 'full-os' || mode === 'danger' || risk.risk === 'install' || risk.risk === 'network')) {
    const approved = await context.askPermission({tool: 'execute_command', path: path.relative(context.workspace, cwd) || '.', action: input.command, reason: `${input.reason}\n\n${risk.reasons.join('\n')}${risk.modifies.length ? `\n\nThis may modify:\n- ${risk.modifies.join('\n- ')}` : ''}`, risk: risk.fullOsRequired ? 'high' : 'medium'});
    if (!approved) throw new Error('Command cancelled by user');
  }
}
