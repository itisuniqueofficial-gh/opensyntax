import type {PlanItem} from '../session/history.js';

export type WorkflowKind = 'code-change' | 'debug' | 'verification' | 'git' | 'research' | 'conversation';

export type WorkflowPlan = {
  kind: WorkflowKind;
  plan: PlanItem[];
  verificationCommands: string[];
};

export function initialPlan(request: string): PlanItem[] {
  return autonomousPlan(request).plan;
}

export function autonomousPlan(request: string): WorkflowPlan {
  const kind = classifyWorkflow(request);
  const objective = request.length > 80 ? request.slice(0, 77) + '...' : request;
  if (kind === 'conversation') return {kind, verificationCommands: [], plan: [{id: 'answer', content: objective || 'Answer directly', state: 'pending'}]};
  if (kind === 'research') return {kind, verificationCommands: [], plan: [
    {id: 'inspect', content: 'Inspect the relevant workspace context', state: 'pending'},
    {id: 'answer', content: objective, state: 'pending'},
    {id: 'summarize', content: 'Summarize findings and any uncertainty', state: 'pending'}
  ]};
  if (kind === 'git') return {kind, verificationCommands: [], plan: [
    {id: 'inspect', content: 'Inspect git state without overwriting user changes', state: 'pending'},
    {id: 'execute', content: objective, state: 'pending'},
    {id: 'summarize', content: 'Summarize git result and remaining work', state: 'pending'}
  ]};
  const verificationCommands = inferVerificationCommands(request);
  return {kind, verificationCommands, plan: [
    {id: 'inspect', content: 'Inspect workspace, git state, and relevant files', state: 'pending'},
    {id: 'execute', content: objective, state: 'pending'},
    {id: 'verify', content: verificationCommands.length ? `Run validation: ${verificationCommands.join(', ')}` : 'Run relevant validation or explain why skipped', state: 'pending'},
    {id: 'summarize', content: 'Summarize changes, validation, and remaining risks', state: 'pending'}
  ]};
}

export function classifyWorkflow(request: string): WorkflowKind {
  const text = request.toLowerCase();
  if (/\b(commit|branch|merge|rebase|pull request|pr|diff|status|log)\b/.test(text)) return 'git';
  if (/\b(fix|bug|error|failing|broken|crash|exception|type ?script|typescript|tsc|lint|test|build)\b/.test(text)) return 'debug';
  if (/\b(run|verify|check|typecheck|lint|test|build)\b/.test(text)) return 'verification';
  if (/\b(add|implement|create|edit|update|refactor|change|delete|rename|write)\b/.test(text)) return 'code-change';
  if (/\b(explain|what|where|how|find|search|inspect|review|analyze)\b/.test(text)) return 'research';
  return 'conversation';
}

export function inferVerificationCommands(request: string): string[] {
  const text = request.toLowerCase();
  const commands: string[] = [];
  if (/\b(type ?script|typescript|tsc|typecheck|type errors?)\b/.test(text)) commands.push('npm run typecheck');
  if (/\blint\b/.test(text)) commands.push('npm run lint');
  if (/\btest|failing tests?\b/.test(text)) commands.push('npm test');
  if (/\bbuild\b/.test(text)) commands.push('npm run build');
  if (/\bfix all|fix|error|failing|broken\b/.test(text) && commands.length === 0) commands.push('npm run typecheck', 'npm test');
  return [...new Set(commands)];
}

export function renderPlan(plan: PlanItem[]): string {
  return plan.map((item) => `${icon(item.state)} ${item.content}`).join('\n');
}

export function startPlan(plan: PlanItem[], id: string): PlanItem[] {
  return plan.map((item) => item.id === id ? {...item, state: 'in_progress'} : item);
}

export function completePlan(plan: PlanItem[], id: string): PlanItem[] {
  return plan.map((item) => item.id === id ? {...item, state: 'completed'} : item);
}

export function failPlan(plan: PlanItem[], id: string): PlanItem[] {
  return plan.map((item) => item.id === id ? {...item, state: 'failed'} : item);
}

function icon(state: PlanItem['state']) {
  return state === 'completed' ? '[x]' : state === 'in_progress' ? '[>]' : state === 'failed' ? '[!]' : '[ ]';
}
