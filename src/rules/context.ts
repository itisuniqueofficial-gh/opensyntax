import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import type {RuleContext} from './types.js';

export const starterTemplate = `# OPENSYNTAX.md

## Stack
- TypeScript
- Node.js

## Rules
- Keep code modular.
- Avoid unnecessary abstractions.
- Prefer small, focused changes.
- Keep edits minimal and reviewable.

## Testing
- Run typecheck after edits.
- Run relevant tests before completion.

## UI
- Use responsive layouts.
- Prefer professional typography.
- Avoid unnecessary shadows and visual clutter.
`;

export async function createStarterRules(cwd = process.cwd()): Promise<string> {
  const file = path.join(cwd, 'OPENSYNTAX.md');
  await writeFile(file, starterTemplate, {encoding: 'utf8', flag: 'wx'});
  return file;
}

export function renderRules(context: RuleContext): string {
  if (!context.files.length) return 'No OPENSYNTAX.md found.';
  return ['Loaded Rules:', ...context.files.map((file) => `✓ ${file.scope === 'global' ? 'Global' : 'Workspace'} ${file.path}`), '', 'Effective Rules:', ...context.effectiveBullets.slice(0, 30).map((item) => `- ${item}`)].join('\n');
}

export function renderRulesDebug(context: RuleContext): string {
  return context.debug;
}
