import {defaultSystemPrompt} from '../config/defaults.js';
import type {PlanItem} from '../session/history.js';
import type {RuleContext} from '../rules/types.js';
import {renderPlan} from './planner.js';

export function systemPrompt(workspace: string, plan: PlanItem[], rules?: RuleContext, autoMode = false): string {
  return `${defaultSystemPrompt}\n\nReasoning workflow:\nObserve the request, analyze the minimum necessary context, plan concise steps, choose tools only when needed, execute safely, verify results, reflect on failures, and continue until complete. For greetings and conceptual answers, avoid tools.\n\nWorkspace instructions:\n${rules?.prompt ?? 'No workspace instructions loaded.'}\n\nWorkspace: ${workspace}\nCurrent plan:\n${renderPlan(plan)}\n\nAutonomous mode: ${autoMode ? 'enabled. Continue safe tool-assisted workflows until the task is complete, while still asking approval for risky actions.' : 'disabled. Be efficient and avoid unnecessary tool calls.'}\n\nAnswer normal conversation directly. Only call tools when the user asks about files, code changes, commands, tests, builds, git, or repository state. Do not mention tool usage when no tools are needed.`;
}
