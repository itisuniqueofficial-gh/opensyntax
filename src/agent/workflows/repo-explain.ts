import type {WorkspaceDetection} from '../workspace-detect.js';
import type {DeterministicToolCall} from '../tool-orchestrator.js';

export function repoExplainWorkflow(detection: WorkspaceDetection): DeterministicToolCall[] {
  const candidates = ['README.md', 'package.json', 'tsconfig.json', 'vite.config.ts', 'next.config.js', 'docs/index.html'].filter((file) => detection.files.includes(file));
  return candidates.slice(0, 6).map((file) => ({name: 'read_file', arguments: {path: file, maxLines: 260}, reason: 'Read high-signal project file for repository explanation.'}));
}
