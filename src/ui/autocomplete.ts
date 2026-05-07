import {helpCommands} from './help.js';

export function suggestSlashCommands(input: string, limit = 8): string[] {
  const query = input.startsWith('/') ? input.toLowerCase() : `/${input.toLowerCase()}`;
  const commands = new Set<string>();
  for (const item of helpCommands) {
    commands.add(item.command.split(' ')[0]);
    for (const alias of item.aliases ?? []) commands.add(alias.split(' ')[0]);
  }
  return [...commands]
    .map((command) => ({command, score: fuzzyScore(command, query)}))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.command.localeCompare(b.command))
    .slice(0, limit)
    .map((item) => item.command);
}

function fuzzyScore(value: string, query: string): number {
  if (value === query) return 100;
  if (value.startsWith(query)) return 80 - (value.length - query.length);
  let score = 0;
  let index = 0;
  for (const char of query) {
    const found = value.indexOf(char, index);
    if (found === -1) return 0;
    score += found === index ? 4 : 1;
    index = found + 1;
  }
  return score;
}
