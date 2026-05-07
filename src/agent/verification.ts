import type {WorkspaceContext} from './context.js';
import type {CommandExecutionOutput} from '../tools/command-runner.js';

export type VerificationPlan = {
  objective: string;
  commands: string[];
  reason: string;
};

export type VerificationRun = {
  ok: boolean;
  attempts: number;
  commands: Array<{command: string; ok: boolean; exitCode: number | null; summary: string}>;
  failureSummary?: string;
  retryAdvice?: string;
};

export function createVerificationPlan(objective: string, context: WorkspaceContext, requestedCommands: string[] = []): VerificationPlan {
  const explicit = requestedCommands.filter(Boolean);
  if (explicit.length) return {objective, commands: explicit, reason: 'User or agent supplied explicit verification commands.'};
  const lower = objective.toLowerCase();
  const scripts = new Set(context.scripts);
  const commands: string[] = [];
  if (/build|compile|bundle/.test(lower) && scripts.has('build')) commands.push(runScript(context, 'build'));
  if (/type ?script|typecheck|tsc|type errors?/.test(lower)) {
    if (scripts.has('typecheck')) commands.push(runScript(context, 'typecheck'));
    else if (scripts.has('lint')) commands.push(runScript(context, 'lint'));
  }
  if (/lint/.test(lower) && scripts.has('lint')) commands.push(runScript(context, 'lint'));
  if (/test|spec|failing/.test(lower) && scripts.has('test')) commands.push(testCommand(context));
  if (/fix|error|broken|failing/.test(lower) && commands.length === 0) {
    if (scripts.has('typecheck')) commands.push(runScript(context, 'typecheck'));
    if (scripts.has('build')) commands.push(runScript(context, 'build'));
    if (scripts.has('test')) commands.push(testCommand(context));
  }
  return {objective, commands: [...new Set(commands)], reason: commands.length ? 'Selected commands from objective and package scripts.' : 'No safe verification command detected from package scripts.'};
}

export function summarizeVerification(results: CommandExecutionOutput[]): VerificationRun {
  const commands = results.map((result) => ({command: result.command, ok: result.ok, exitCode: result.exitCode, summary: summarizeCommandOutput(result)}));
  const failed = results.find((result) => !result.ok);
  return {
    ok: results.length > 0 && results.every((result) => result.ok),
    attempts: results.length,
    commands,
    failureSummary: failed ? summarizeCommandOutput(failed) : undefined,
    retryAdvice: failed ? retryAdvice(failed) : undefined
  };
}

export function summarizeCommandOutput(result: Pick<CommandExecutionOutput, 'stdout' | 'stderr' | 'timedOut' | 'cancelled' | 'exitCode'>): string {
  if (result.timedOut) return 'Command timed out before completion.';
  if (result.cancelled) return 'Command was cancelled.';
  const text = `${result.stderr}\n${result.stdout}`.trim();
  if (!text) return result.exitCode === 0 ? 'Command completed without output.' : `Command failed with exit code ${result.exitCode}.`;
  const lines = text.split(/\r?\n/).filter(Boolean);
  const interesting = lines.filter((line) => /error|failed|exception|cannot find|not assignable|syntax|timeout|missing|undefined|expected/i.test(line));
  return (interesting.length ? interesting : lines).slice(0, 12).join('\n');
}

export function retryAdvice(result: Pick<CommandExecutionOutput, 'stdout' | 'stderr' | 'timedOut' | 'cancelled' | 'recovery'>): string {
  if (result.recovery) return result.recovery;
  if (result.timedOut) return 'Increase timeout or run a narrower command before retrying.';
  if (result.cancelled) return 'The command was cancelled; continue only after user confirmation.';
  const text = `${result.stderr}\n${result.stdout}`;
  if (/Cannot find module|module not found|not found/i.test(text)) return 'Inspect imports, dependency installation, and package exports before retrying.';
  if (/TS\d+|Type .* is not assignable|Property .* does not exist/i.test(text)) return 'Patch the smallest TypeScript type or API mismatch, then rerun typecheck.';
  if (/test failed|expected|received|AssertionError/i.test(text)) return 'Open the failing test and implementation, patch behavior, then rerun the focused test.';
  return 'Read the first actionable error, patch minimally, then rerun the same verification command.';
}

function runScript(context: WorkspaceContext, script: string): string {
  const manager = context.packageManager ?? 'npm';
  if (manager === 'npm') return `npm run ${script}`;
  if (manager === 'pnpm') return `pnpm ${script}`;
  if (manager === 'yarn') return `yarn ${script}`;
  return `bun run ${script}`;
}

function testCommand(context: WorkspaceContext): string {
  const manager = context.packageManager ?? 'npm';
  if (manager === 'npm') return 'npm test';
  if (manager === 'pnpm') return 'pnpm test';
  if (manager === 'yarn') return 'yarn test';
  return 'bun test';
}
