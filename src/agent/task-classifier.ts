export type TaskKind =
  | 'chat'
  | 'explain'
  | 'workspace_inspection'
  | 'file_edit'
  | 'design_update'
  | 'debug_fix'
  | 'build_fix'
  | 'test_fix'
  | 'git_task'
  | 'command_task';

export type ClassifiedTask = {
  kind: TaskKind;
  requiresTools: boolean;
  reason: string;
};

export function classifyTask(input: string): ClassifiedTask {
  const text = input.trim().toLowerCase();
  if (!text || /^(hi|hello|hey|thanks|thank you|ok|okay|yo|what are you)\b[!.?\s]*$/.test(text)) {
    return {kind: 'chat', requiresTools: false, reason: 'Simple conversational message.'};
  }
  if (/\b(git|commit|branch|diff|status|merge|rebase|pull request|\bpr\b)\b/.test(text)) return required('git_task', 'Git workflow requested.');
  if (/\b(run|execute|terminal|shell|command|install|start server|dev server)\b/.test(text)) return required('command_task', 'Terminal command workflow requested.');
  if (/\b(build|compile|bundle|tsc|type ?script|typecheck)\b.*\b(fix|error|fail|broken)|\b(fix|repair).*\b(build|compile|type ?script|typecheck|tsc)\b/.test(text)) return required('build_fix', 'Build or TypeScript fix requested.');
  if (/\b(test|spec|vitest|jest|playwright)\b.*\b(fix|fail|broken)|\b(fix|repair).*\b(test|spec)\b/.test(text)) return required('test_fix', 'Test fix requested.');
  if (/\b(fix|bug|debug|error|crash|broken|failing|exception)\b/.test(text)) return required('debug_fix', 'Debugging or bug fix requested.');
  if (/\b(design|website|site|landing page|homepage|responsive|ui|ux|style|css|layout|theme)\b/.test(text) && /\b(update|improve|make|redesign|polish|change|fix|create)\b/.test(text)) return required('design_update', 'Website or design update requested.');
  if (/\b(create|add|implement|update|edit|change|rename|delete|write|refactor|modify)\b/.test(text)) return required('file_edit', 'File change requested.');
  if (/\b(explain|summarize|understand|review|analyze)\b.*\b(repo|project|codebase|workspace|files?)\b|\bexplain this repo\b/.test(text)) return required('explain', 'Workspace explanation requested.');
  if (/\b(list|inspect|find|search|show)\b.*\b(files?|repo|workspace|project)\b/.test(text)) return required('workspace_inspection', 'Workspace inspection requested.');
  return {kind: 'chat', requiresTools: false, reason: 'No workspace action detected.'};
}

export function taskRequiresTools(input: string): boolean {
  return classifyTask(input).requiresTools;
}

function required(kind: TaskKind, reason: string): ClassifiedTask {
  return {kind, requiresTools: true, reason};
}
