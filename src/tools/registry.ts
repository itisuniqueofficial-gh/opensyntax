import {z} from 'zod';
import {writeFileTool} from './filesystem.js';
import {filesystemTools} from './filesystem.js';
import {folderTools} from './folder.js';
import {searchTools} from './search.js';
import {executeCommandTool} from './shell.js';
import {gitTools} from './git.js';
import {diffPreviewTool, generateDiffTool} from './diff.js';
import {verifyWorkspaceTool} from './verification.js';
import {tool, type Tool, type ToolContext, type ToolResult} from './types.js';

export class ToolRegistry {
  private readonly tools = new Map<string, Tool>();

  constructor(tools: Tool[]) {
    for (const item of tools) this.tools.set(item.name, item);
  }

  specs() { return [...this.tools.values()].map(({name, description, schema}) => ({name, description, schema})); }
  names() { return [...this.tools.keys()]; }

  async execute(name: string, input: unknown, context: ToolContext): Promise<ToolResult> {
    const selected = this.tools.get(name);
    if (!selected) return {ok: false, output: `Unknown tool: ${name}`};
    const parsed = selected.schema.safeParse(input);
    if (!parsed.success) return {ok: false, output: `Invalid tool input: ${parsed.error.message}`};
    try { return await selected.execute(parsed.data, context); }
    catch (error) { return {ok: false, output: error instanceof Error ? error.message : String(error)}; }
  }
}

export const askPermissionTool = tool({
  name: 'ask_permission',
  description: 'Ask the user for explicit permission before a risky action.',
  schema: z.object({action: z.string(), reason: z.string(), risk: z.enum(['low', 'medium', 'high']).default('medium')}),
  async execute(input, context) {
    const approved = await context.askPermission({action: input.action, reason: input.reason, risk: input.risk ?? 'medium'});
    return {ok: approved, output: approved ? 'Approved' : 'Denied'};
  }
});

export const defaultRegistry = new ToolRegistry([...filesystemTools, ...folderTools, ...searchTools, executeCommandTool, verifyWorkspaceTool, ...gitTools, diffPreviewTool, generateDiffTool, askPermissionTool]);
export {writeFileTool};
