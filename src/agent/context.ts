export type AgentContextHint = {
  workspace: string;
  provider: string;
  model: string;
  permission: string;
};

export function renderContextHint(context: AgentContextHint): string {
  return [`Workspace: ${context.workspace}`, `Provider: ${context.provider}`, `Model: ${context.model}`, `Permission: ${context.permission}`].join('\n');
}
