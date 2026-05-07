import type {RuleFile, RuleFrontmatter, RuleSection} from './types.js';

export function parseRuleFile(input: {path: string; scope: 'global' | 'workspace'; depth: number; mtimeMs: number; raw: string}): RuleFile {
  const {frontmatter, body} = splitFrontmatter(input.raw);
  return {...input, raw: body.trim(), frontmatter, sections: parseSections(body)};
}

function splitFrontmatter(raw: string): {frontmatter: RuleFrontmatter; body: string} {
  if (!raw.startsWith('---\n')) return {frontmatter: {}, body: raw};
  const end = raw.indexOf('\n---', 4);
  if (end === -1) return {frontmatter: {}, body: raw};
  const yaml = raw.slice(4, end).trim();
  const body = raw.slice(end + 4).replace(/^\r?\n/, '');
  const frontmatter: RuleFrontmatter = {};
  for (const line of yaml.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z][\w-]*):\s*(.+)$/);
    if (!match) continue;
    const key = match[1];
    const value = match[2].trim().replace(/^['"]|['"]$/g, '');
    if (key === 'priority' && ['low', 'normal', 'high'].includes(value)) frontmatter.priority = value as RuleFrontmatter['priority'];
    if (key === 'autoTest') frontmatter.autoTest = value === 'true';
    if (key === 'shellSafety' && ['normal', 'strict'].includes(value)) frontmatter.shellSafety = value as RuleFrontmatter['shellSafety'];
    if (key === 'preferredProvider') frontmatter.preferredProvider = value;
  }
  return {frontmatter, body};
}

function parseSections(body: string): RuleSection[] {
  const sections: RuleSection[] = [];
  let current: RuleSection = {title: 'General', content: '', items: []};
  const push = () => {
    current.content = current.content.trim();
    if (current.content || current.items.length) sections.push(current);
  };
  for (const line of body.split(/\r?\n/)) {
    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      push();
      current = {title: heading[1].trim(), content: '', items: []};
      continue;
    }
    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    if (bullet) current.items.push(bullet[1].trim());
    current.content += `${line}\n`;
  }
  push();
  return sections;
}
