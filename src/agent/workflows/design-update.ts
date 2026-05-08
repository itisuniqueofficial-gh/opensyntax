import type {WorkspaceDetection} from '../workspace-detect.js';
import type {DeterministicToolCall} from '../tool-orchestrator.js';

export function designUpdateWorkflow(detection: WorkspaceDetection): DeterministicToolCall[] {
  if (detection.empty || detection.websiteFiles.length === 0) return [];
  return detection.websiteFiles.slice(0, 6).map((file) => ({
    name: 'read_file',
    arguments: {path: file, maxLines: 260},
    reason: 'Read likely website design file before proposing or applying visual changes.'
  }));
}
