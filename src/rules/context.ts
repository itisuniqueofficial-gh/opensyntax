import {spawn} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import type {RuleContext} from './types.js';
import {findNearestInstructionFile} from './loader.js';

export const starterTemplate = `# OPENSYNTAX.md

Workspace instructions for OpenSyntax.

## Project Overview
Describe what this project does.

## Tech Stack
- TypeScript
- Node.js
- Bun

## Coding Rules
- Keep code simple, modular, and maintainable.
- Prefer small composable functions.
- Prefer small, focused changes.
- Keep edits minimal and focused.
- Preserve existing design and architecture unless asked.

## Package Manager
- Use the package manager already used by this project.
- Do not change lockfiles unless dependency changes require it.

## Testing
- Run relevant tests after code changes.
- Run typecheck when TypeScript files change.
- Explain any test failures clearly.

## Safety
- Do not run destructive commands without approval.
- Do not expose secrets or API keys.
- Do not edit generated folders like dist/, build/, coverage/, or node_modules/.

## Response Style
- Be concise.
- Explain changed files clearly.
- Mention verification steps.
`;

export async function createStarterRules(cwd = process.cwd()): Promise<string> {
  const file = path.join(cwd, 'OPENSYNTAX.md');
  await writeFile(file, starterTemplate, {encoding: 'utf8', flag: 'wx'});
  return file;
}

export function renderRules(context: RuleContext): string {
  if (!context.files.length) return 'No workspace instructions found.';
  return ['Workspace Instructions', ...context.files.map((file) => `✓ Loaded ${file.path}`), '', 'Effective rules:', ...context.effectiveBullets.slice(0, 30).map((item) => `- ${item}`)].join('\n');
}

export function renderRulesDebug(context: RuleContext): string {
  return context.debug;
}

export async function openNearestRulesFile(cwd = process.cwd()): Promise<string> {
  const file = await findNearestInstructionFile(cwd) ?? await createStarterRules(cwd);
  const editor = process.env.EDITOR || process.env.VISUAL;
  if (!editor) return `Instruction file: ${file}`;
  const child = spawn(editor, [file], {stdio: 'inherit', shell: true});
  child.unref();
  return `Opened ${file}`;
}
