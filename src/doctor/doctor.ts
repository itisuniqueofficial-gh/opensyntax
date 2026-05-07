import {execa} from 'execa';
import {showProviderHealth} from '../commands/providers.js';
import {workspaceRoot} from '../utils/paths.js';

export async function runDoctor(): Promise<string> {
  const [git, providers] = await Promise.all([checkGit(), showProviderHealth()]);
  return [`Workspace: ${workspaceRoot()}`, `Node.js: ${process.version}`, git, providers].join('\n');
}

async function checkGit(): Promise<string> {
  const version = await execa('git', ['--version'], {reject: false});
  if (version.exitCode !== 0) return '✗ Git not detected';
  const inside = await execa('git', ['rev-parse', '--is-inside-work-tree'], {cwd: workspaceRoot(), reject: false});
  if (inside.exitCode !== 0) return '• No Git repository detected; git tools are disabled for this workspace';
  const branch = await execa('git', ['branch', '--show-current'], {cwd: workspaceRoot(), reject: false});
  return `✓ Git detected${branch.stdout ? ` on ${branch.stdout}` : ' (detached HEAD)'}`;
}
