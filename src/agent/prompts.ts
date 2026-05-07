import {defaultSystemPrompt} from '../config/defaults.js';
import type {PlanItem} from '../session/history.js';
import {renderPlan} from './planner.js';

export function systemPrompt(workspace: string, plan: PlanItem[]): string {
  return `${defaultSystemPrompt}\n\nWorkspace: ${workspace}\nCurrent plan:\n${renderPlan(plan)}\n\nAnswer normal conversation directly. Only call tools when the user asks about files, code changes, commands, tests, builds, git, or repository state. Do not mention tool usage when no tools are needed.`;
}
