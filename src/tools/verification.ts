import {z} from 'zod';
import {buildWorkspaceContext} from '../agent/context.js';
import {createVerificationPlan, summarizeVerification} from '../agent/verification.js';
import {runCommand} from './command-runner.js';
import {tool} from './types.js';

const verifySchema = z.object({
  objective: z.string().default('verify workspace'),
  commands: z.array(z.string()).default([]),
  timeoutMs: z.number().int().positive().max(30 * 60 * 1000).default(120000),
  stopOnFailure: z.boolean().default(true)
});

export const verifyWorkspaceTool = tool({
  name: 'verify_workspace',
  description: 'Run the safest detected build, typecheck, lint, or test verification workflow and summarize failures for retry.',
  schema: verifySchema,
  async execute(input, context) {
    const objective = input.objective ?? 'verify workspace';
    const commands = input.commands ?? [];
    const workspaceContext = await buildWorkspaceContext(context.workspace, objective);
    const plan = createVerificationPlan(objective, workspaceContext, commands);
    if (!plan.commands.length) return {ok: false, output: JSON.stringify({ok: false, objective, reason: plan.reason, workspace: workspaceContext.summary}, null, 2)};
    const results = [];
    for (const command of plan.commands) {
      const result = await runCommand({command, timeoutMs: input.timeoutMs ?? 120000, permission: 'safe', reason: `Verify objective: ${objective}`}, context);
      results.push(result);
      if (!result.ok && (input.stopOnFailure ?? true)) break;
    }
    const summary = summarizeVerification(results);
    return {
      ok: summary.ok,
      output: JSON.stringify({objective, plan, summary}, null, 2),
      tool: 'verify_workspace',
      changed: false,
      message: summary.ok ? 'Verification passed' : 'Verification failed',
      data: summary
    };
  }
});
