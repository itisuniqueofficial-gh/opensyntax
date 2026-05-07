import {defaultSystemPrompt} from '../config/defaults.js';
import type {PlanItem} from '../session/history.js';
import type {RuleContext} from '../rules/types.js';
import {renderPlan} from './planner.js';

export function systemPrompt(workspace: string, plan: PlanItem[], rules?: RuleContext): string {
  return `${defaultSystemPrompt}\n\nWorkspace: ${workspace}\nCurrent plan:\n${renderPlan(plan)}\n\nWorkspace rules:\n${rules?.prompt ?? 'No OPENSYNTAX.md rules loaded.'}\n\nAnswer normal conversation directly. Only call tools when the user asks about files, code changes, commands, tests, builds, git, or repository state. Do not mention tool usage when no tools are needed.`;
}
