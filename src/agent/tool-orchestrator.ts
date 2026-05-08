import type {ToolResult} from '../tools/types.js';
import type {ClassifiedTask} from './task-classifier.js';
import {progressOk, progressWarn} from '../ui/progress.js';

export type DeterministicToolCall = {
  name: string;
  arguments: unknown;
  reason: string;
};

export type DeterministicToolResult = DeterministicToolCall & {
  ok: boolean;
  output: string;
  changed?: boolean;
};

export type ToolExecutor = (call: DeterministicToolCall) => Promise<ToolResult>;

export async function runToolSequence(calls: DeterministicToolCall[], execute: ToolExecutor): Promise<DeterministicToolResult[]> {
  const results: DeterministicToolResult[] = [];
  for (const call of calls) {
    const result = await execute(call);
    results.push({...call, ok: result.ok, output: result.output, changed: result.changed});
    if (result.ok) progressOk(operationLabel(call.name, result));
    else progressWarn(`${call.name} failed: ${result.output.slice(0, 160)}`);
  }
  return results;
}

export function bootstrapCalls(task: ClassifiedTask): DeterministicToolCall[] {
  if (!task.requiresTools) return [];
  return [
    {name: 'list_folder', arguments: {path: '.', recursive: false, includeHidden: false, limit: 200}, reason: 'Inspect workspace root before acting.'},
    {name: 'git_status', arguments: {}, reason: 'Check git state without failing outside git repositories.'}
  ];
}

function operationLabel(name: string, result: ToolResult): string {
  if (name === 'list_folder') return 'listed workspace files';
  if (name === 'git_status') return 'checked git status';
  if (name === 'read_file') return `read ${result.path ?? 'file'}`;
  if (name === 'append_to_file' || name === 'patch_file' || name === 'replace_in_file') return `updated ${result.path ?? 'file'}`;
  if (name === 'create_file') return `created ${result.path ?? 'file'}`;
  if (name === 'create_folder') return `created folder ${result.path ?? ''}`.trim();
  if (name === 'search_files') return 'searched workspace files';
  if (name === 'verify_workspace') return result.ok ? 'verification passed' : 'verification completed with failures';
  return `${name} completed`;
}
