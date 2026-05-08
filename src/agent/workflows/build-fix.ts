import type {WorkspaceDetection} from '../workspace-detect.js';
import type {DeterministicToolCall} from '../tool-orchestrator.js';

export function buildFixWorkflow(request: string, detection: WorkspaceDetection): DeterministicToolCall[] {
  const calls: DeterministicToolCall[] = [];
  if (detection.files.includes('package.json')) calls.push({name: 'read_file', arguments: {path: 'package.json', maxLines: 220}, reason: 'Inspect scripts and dependencies before running verification.'});
  if (detection.files.some((file) => file.startsWith('tsconfig'))) calls.push({name: 'read_file', arguments: {path: detection.files.find((file) => file.startsWith('tsconfig')) ?? 'tsconfig.json', maxLines: 220}, reason: 'Inspect TypeScript configuration for build/type errors.'});
  calls.push({name: 'verify_workspace', arguments: {objective: request, stopOnFailure: true}, reason: 'Run detected build/typecheck/test verification workflow.'});
  return calls;
}
