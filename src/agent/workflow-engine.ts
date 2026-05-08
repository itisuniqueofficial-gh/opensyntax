import {classifyTask, type ClassifiedTask} from './task-classifier.js';
import {detectWorkspace, type WorkspaceDetection} from './workspace-detect.js';
import {bootstrapCalls, runToolSequence, type DeterministicToolCall, type DeterministicToolResult, type ToolExecutor} from './tool-orchestrator.js';
import {designUpdateWorkflow} from './workflows/design-update.js';
import {buildFixWorkflow} from './workflows/build-fix.js';
import {repoExplainWorkflow} from './workflows/repo-explain.js';
import {progressInfo, progressOk, progressWarn} from '../ui/progress.js';

export type WorkflowRun = {
  task: ClassifiedTask;
  detection?: WorkspaceDetection;
  toolResults: DeterministicToolResult[];
  summary: string;
};

export async function runDeterministicWorkflow(request: string, workspace: string, execute: ToolExecutor): Promise<WorkflowRun> {
  const task = classifyTask(request);
  if (!task.requiresTools) return {task, toolResults: [], summary: task.reason};

  progressInfo('inspecting workspace');
  const detection = await detectWorkspace(workspace);
  if (detection.empty) {
    progressWarn('workspace is empty');
    return {task, detection, toolResults: [], summary: 'This workspace is empty. I can create a new website/project here if you want.'};
  }
  progressOk(`detected ${detection.kind} workspace`);

  const calls = [...bootstrapCalls(task), ...workflowCalls(request, task, detection)];
  const deduped = dedupeCalls(calls);
  const toolResults = await runToolSequence(deduped, execute);
  return {task, detection, toolResults, summary: summarizeRun(task, detection, toolResults)};
}

export function workflowCalls(request: string, task: ClassifiedTask, detection: WorkspaceDetection): DeterministicToolCall[] {
  if (task.kind === 'design_update') return designUpdateWorkflow(detection);
  if (task.kind === 'build_fix' || task.kind === 'debug_fix' || task.kind === 'test_fix') return buildFixWorkflow(request, detection);
  if (task.kind === 'explain' || task.kind === 'workspace_inspection') return repoExplainWorkflow(detection);
  if (task.kind === 'file_edit') return repoExplainWorkflow(detection).slice(0, 3);
  return [];
}

export function noToolGuardMessage(request: string): string {
  const task = classifyTask(request);
  if (!task.requiresTools) return '';
  return 'Agent workflow did not execute tools for this coding task. Run /doctor to inspect tool runtime.';
}

function summarizeRun(task: ClassifiedTask, detection: WorkspaceDetection, results: DeterministicToolResult[]): string {
  const ok = results.filter((result) => result.ok).length;
  const failed = results.length - ok;
  return [`Deterministic workflow: ${task.kind}`, detection.summary, `Tools executed: ${results.length} (${ok} ok${failed ? `, ${failed} failed` : ''})`].join('\n');
}

function dedupeCalls(calls: DeterministicToolCall[]): DeterministicToolCall[] {
  const seen = new Set<string>();
  return calls.filter((call) => {
    const key = `${call.name}:${JSON.stringify(call.arguments)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
