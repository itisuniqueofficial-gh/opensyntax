import type {PlanItem} from '../session/history.js';

export function initialPlan(request: string): PlanItem[] {
  return [
    {id: 'inspect', content: 'Inspect workspace and git state', state: 'pending'},
    {id: 'execute', content: request.length > 80 ? request.slice(0, 77) + '...' : request, state: 'pending'},
    {id: 'verify', content: 'Run relevant validation or explain why skipped', state: 'pending'},
    {id: 'summarize', content: 'Summarize changes and remaining risks', state: 'pending'}
  ];
}

export function renderPlan(plan: PlanItem[]): string {
  return plan.map((item) => `${icon(item.state)} ${item.content}`).join('\n');
}

function icon(state: PlanItem['state']) {
  return state === 'completed' ? '[x]' : state === 'in_progress' ? '[>]' : state === 'failed' ? '[!]' : '[ ]';
}
