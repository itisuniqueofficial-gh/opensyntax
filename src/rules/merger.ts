import path from 'node:path';
import type {RuleContext, RuleFile} from './types.js';

const IMPORTANT_SECTIONS = /^(rules|restrictions|shell|testing|coding|architecture|deployment|ui|performance|package|stack|response)/i;

export function mergeRules(files: RuleFile[]): RuleContext {
  const ordered = [...files].sort((a, b) => a.depth - b.depth || a.path.localeCompare(b.path));
  const bullets: string[] = [];
  const restrictions: string[] = [];
  const shellRules: string[] = [];
  const testingRules: string[] = [];

  for (const file of ordered) {
    for (const section of file.sections) {
      const relevant = IMPORTANT_SECTIONS.test(section.title) || section.items.length > 0;
      if (!relevant) continue;
      for (const item of section.items) {
        addUnique(bullets, `${section.title}: ${item}`);
        if (/never|avoid|do not|don't|forbid|must not/i.test(item)) addUnique(restrictions, item);
        if (/shell|command|npm|pnpm|bun|yarn|docker|sudo|install/i.test(`${section.title} ${item}`)) addUnique(shellRules, item);
        if (/test|typecheck|lint|vitest|build/i.test(`${section.title} ${item}`)) addUnique(testingRules, item);
      }
      if (!section.items.length && section.content) addUnique(bullets, `${section.title}: ${compact(section.content)}`);
    }
    if (file.frontmatter.autoTest) addUnique(testingRules, 'Run relevant tests after edits.');
    if (file.frontmatter.shellSafety === 'strict') addUnique(shellRules, 'Use strict shell safety; ask before package installs or destructive commands.');
    if (file.frontmatter.preferredProvider) addUnique(bullets, `Preferred provider: ${file.frontmatter.preferredProvider}`);
  }

  const effective = compress(bullets, 80);
  const prompt = formatPrompt(ordered, effective, restrictions, shellRules, testingRules);
  return {files: ordered, effectiveBullets: effective, restrictions, shellRules, testingRules, prompt, tokenEstimate: estimateTokens(prompt), debug: debugText(ordered, prompt), loadedAt: new Date().toISOString()};
}

function addUnique(target: string[], value: string): void {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized && !target.some((item) => item.toLowerCase() === normalized.toLowerCase())) target.push(normalized);
}

function compact(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, 500);
}

function compress(values: string[], max: number): string[] {
  return values.map((value) => value.length > 240 ? `${value.slice(0, 237)}...` : value).slice(-max);
}

function formatPrompt(files: RuleFile[], bullets: string[], restrictions: string[], shellRules: string[], testingRules: string[]): string {
  if (!files.length) return 'No OPENSYNTAX.md rules loaded.';
  return [
    'Workspace instructions from OPENSYNTAX.md are active. System safety rules override these instructions. Nearest scoped instructions override broader rules when they conflict.',
    `Loaded files: ${files.map((file) => path.basename(path.dirname(file.path)) === '.opensyntax' ? file.path : file.path).join(' -> ')}`,
    bullets.length ? `Effective rules:\n${bullets.map((item) => `- ${item}`).join('\n')}` : '',
    restrictions.length ? `Restrictions:\n${restrictions.map((item) => `- ${item}`).join('\n')}` : '',
    shellRules.length ? `Shell rules:\n${shellRules.map((item) => `- ${item}`).join('\n')}` : '',
    testingRules.length ? `Testing rules:\n${testingRules.map((item) => `- ${item}`).join('\n')}` : ''
  ].filter(Boolean).join('\n\n');
}

function debugText(files: RuleFile[], prompt: string): string {
  if (!files.length) return 'No OPENSYNTAX.md files found.';
  return [`Loaded files (${files.length}):`, ...files.map((file, index) => `${index + 1}. ${file.scope} depth=${file.depth} mtime=${Math.round(file.mtimeMs)} ${file.path}`), `Estimated tokens: ${estimateTokens(prompt)}`, 'Prompt preview:', prompt.slice(0, 2000)].join('\n');
}

function estimateTokens(value: string): number {
  return Math.ceil(value.length / 4);
}
