import {execa} from 'execa';
import {z} from 'zod';
import {tool, type Tool} from './types.js';

const emptySchema = z.object({});
const diffSchema = z.object({staged: z.boolean().default(false), path: z.string().optional()});
const logSchema = z.object({limit: z.number().int().positive().max(100).default(10), path: z.string().optional()});

export const gitStatusTool = tool({
  name: 'git_status',
  description: 'Inspect current git branch, dirty files, and recent commits.',
  schema: emptySchema,
  async execute(_, context) {
    const [inside, branch, status, log] = await Promise.all([
      git(context.workspace, ['rev-parse', '--is-inside-work-tree']),
      git(context.workspace, ['branch', '--show-current']),
      git(context.workspace, ['status', '--short', '--branch']),
      git(context.workspace, ['log', '--oneline', '-5'])
    ]);
    if (!inside.ok) return {ok: true, output: 'No Git repository detected in current workspace.\n\nGit features disabled for this session.\n\nYou can:\n- continue normally\n- initialize git\n- open another workspace', data: {git: false}};
    return {ok: true, output: [`Branch: ${branch.output || 'detached'}`, status.output, 'Recent commits:', log.output].join('\n'), data: {branch: branch.output, status: status.output}};
  }
});

export const gitDiffTool = tool({
  name: 'git_diff',
  description: 'Show staged or unstaged git diff, optionally for one path.',
  schema: diffSchema,
  async execute(input, context) {
    const args = ['diff', ...(input.staged ? ['--staged'] : []), ...(input.path ? ['--', input.path] : [])];
    const result = await git(context.workspace, args);
    return {ok: result.ok, output: result.output || 'No diff'};
  }
});

export const gitLogTool = tool({
  name: 'git_log',
  description: 'Show recent git commits, optionally limited to one path.',
  schema: logSchema,
  async execute(input, context) {
    const inside = await git(context.workspace, ['rev-parse', '--is-inside-work-tree']);
    if (!inside.ok) return {ok: true, output: 'No Git repository detected in current workspace.'};
    const args = ['log', '--oneline', `-${input.limit}`, ...(input.path ? ['--', input.path] : [])];
    const result = await git(context.workspace, args);
    return {ok: result.ok, output: result.output || 'No commits found'};
  }
});

export const gitTools: Tool[] = [gitStatusTool, gitDiffTool, gitLogTool];

async function git(cwd: string, args: string[]): Promise<{ok: boolean; output: string}> {
  const result = await execa('git', args, {cwd, reject: false});
  return {ok: result.exitCode === 0, output: (result.stdout || result.stderr).trim()};
}
