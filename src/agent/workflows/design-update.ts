import type {WorkspaceDetection} from '../workspace-detect.js';
import type {DeterministicToolCall} from '../tool-orchestrator.js';

export function designUpdateWorkflow(detection: WorkspaceDetection): DeterministicToolCall[] {
  if (detection.empty || detection.websiteFiles.length === 0) return [];
  const reads = detection.websiteFiles.slice(0, 6).map((file) => ({
    name: 'read_file',
    arguments: {path: file, maxLines: 260},
    reason: 'Read likely website design file before proposing or applying visual changes.'
  }));
  const stylesheet = detection.websiteFiles.find((file) => file.endsWith('.css'));
  const edits: DeterministicToolCall[] = stylesheet ? [{
    name: 'append_to_file',
    arguments: {path: stylesheet, content: designPolishCss()},
    reason: 'Apply safe responsive design polish to the detected stylesheet.'
  }] : [];
  const verify: DeterministicToolCall[] = detection.scripts.includes('build') ? [{name: 'verify_workspace', arguments: {objective: 'verify website design update', stopOnFailure: true}, reason: 'Verify website changes with detected build script.'}] : [];
  return [...reads, ...edits, ...verify];
}

function designPolishCss(): string {
  return `

/* OpenSyntax responsive design polish */
:root {
  color-scheme: light dark;
}

img,
svg,
video {
  max-width: 100%;
  height: auto;
}

@media (max-width: 768px) {
  body {
    overflow-x: hidden;
  }

  main,
  section,
  .container,
  .content {
    width: min(100%, 100vw);
  }
}
`;
}
