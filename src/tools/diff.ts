import {createPatch} from 'diff';
import {z} from 'zod';
import {tool} from './types.js';

export function unifiedDiff(filePath: string, before: string, after: string): string {
  if (before === after) return '';
  return createPatch(filePath, before, after, 'before', 'after');
}

export const diffPreviewTool = tool({
  name: 'diff_preview',
  description: 'Create a unified diff preview from before and after text.',
  schema: z.object({path: z.string(), before: z.string(), after: z.string()}),
  async execute(input) {
    const diff = unifiedDiff(input.path, input.before, input.after);
    return {ok: true, output: diff || 'No diff', tool: 'generate_diff', path: input.path, changed: false, diff, message: diff ? 'Diff generated' : 'No changes'};
  }
});

export const generateDiffTool = tool({
  name: 'generate_diff',
  description: 'Create a unified diff preview from before and after text.',
  schema: z.object({path: z.string(), before: z.string(), after: z.string()}),
  async execute(input) {
    const diff = unifiedDiff(input.path, input.before, input.after);
    return {ok: true, output: diff || 'No diff', tool: 'generate_diff', path: input.path, changed: false, diff, message: diff ? 'Diff generated' : 'No changes'};
  }
});
