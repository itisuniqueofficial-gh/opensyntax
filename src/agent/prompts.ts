import {defaultSystemPrompt} from '../config/defaults.js';
import type {PlanItem} from '../session/history.js';
import {renderPlan} from './planner.js';

export function systemPrompt(workspace: string, plan: PlanItem[]): string {
  return `${defaultSystemPrompt}\n\nWorkspace: ${workspace}\nCurrent plan:\n${renderPlan(plan)}\n\nWhen you need action, call a tool. If tool calling is unavailable, answer with exact next steps and clearly state no tools were run.`;
}
