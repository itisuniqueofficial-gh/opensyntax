import {createPatch} from 'diff';
import {z} from 'zod';
import {tool} from './types.js';

export const diffPreviewTool = tool({
  name: 'diff_preview',
  description: 'Create a unified diff preview from before and after text.',
  schema: z.object({path: z.string(), before: z.string(), after: z.string()}),
  async execute(input) {
    return {ok: true, output: createPatch(input.path, input.before, input.after, 'before', 'after')};
  }
});
