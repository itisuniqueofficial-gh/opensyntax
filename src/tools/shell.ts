import {execa} from 'execa';
import {z} from 'zod';
import {tool} from './types.js';

const shellSchema = z.object({command: z.string(), intent: z.string(), timeoutMs: z.number().int().positive().max(600000).default(120000)});
const riskyPatterns = [/\brm\b/i, /\bsudo\b/i, /git\s+reset/i, /git\s+clean/i, /push\s+--force/i, /chmod\b/i, /chown\b/i, /docker\s+.*prune/i, /(apt|brew|yum|pacman|winget|choco)\s+(install|remove)/i, /Remove-Item\b.*(-Recurse|\/s)/i];

export const executeCommandTool = tool({
  name: 'execute_command',
  description: 'Execute a non-interactive shell command in the workspace with live output, timeout, and risky command approval.',
  schema: shellSchema,
  async execute(input, context) {
    if (context.permission === 'read-only' || context.permission === 'workspace-write') throw new Error('Shell execution is not allowed by current permission level');
    enforceRuleShellRestrictions(input.command, context.rules?.shellRules ?? context.rules?.restrictions ?? []);
    const risky = riskyPatterns.some((pattern) => pattern.test(input.command));
    if (risky && context.permission !== 'full-access') {
      const approved = await context.askPermission({action: input.command, reason: input.intent, risk: 'high'});
      if (!approved) return {ok: false, output: 'Command cancelled by user'};
    }
    context.log(`$ ${input.command}`);
    const subprocess = execa(input.command, {cwd: context.workspace, shell: true, timeout: input.timeoutMs, reject: false, signal: context.signal});
    let output = '';
    subprocess.stdout?.on('data', (chunk) => { const text = String(chunk); output += text; context.log(text); });
    subprocess.stderr?.on('data', (chunk) => { const text = String(chunk); output += text; context.log(text); });
    const result = await subprocess;
    return {ok: result.exitCode === 0, output: output.trim() || `Command exited with ${result.exitCode}`, data: {exitCode: result.exitCode, command: input.command}};
  }
});

function enforceRuleShellRestrictions(command: string, rules: string[]): void {
  const lower = command.toLowerCase();
  const text = rules.join('\n').toLowerCase();
  if (/never use npm|use bun only|bun only|prefer bun/.test(text) && /\bnpm\b/.test(lower)) throw new Error('Workspace rules prohibit npm commands; use bun instead.');
  if (/do not use npm|don't use npm/.test(text) && /\bnpm\b/.test(lower)) throw new Error('Workspace rules prohibit npm commands.');
  if (/never use pnpm|do not use pnpm/.test(text) && /\bpnpm\b/.test(lower)) throw new Error('Workspace rules prohibit pnpm commands.');
  if (/never use yarn|do not use yarn/.test(text) && /\byarn\b/.test(lower)) throw new Error('Workspace rules prohibit yarn commands.');
  if (/never run docker|do not run docker|no docker/.test(text) && /\bdocker\b/.test(lower)) throw new Error('Workspace rules prohibit docker commands.');
}
