import {helpCommands} from './help.js';

export type PaletteItem = {
  command: string;
  description: string;
  category: string;
};

export function commandPaletteItems(): PaletteItem[] {
  return helpCommands.map((item) => ({command: item.command, description: item.description, category: item.category}));
}

export function searchCommandPalette(query: string, limit = 12): PaletteItem[] {
  const q = query.trim().toLowerCase();
  const items = commandPaletteItems();
  if (!q) return items.slice(0, limit);
  return items
    .map((item) => ({item, score: score(item, q)}))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.command.localeCompare(b.item.command))
    .slice(0, limit)
    .map((entry) => entry.item);
}

export function renderCommandPalette(query = ''): string {
  const rows = searchCommandPalette(query).map((item) => `${item.command.padEnd(24)} ${item.description}`);
  return ['Search commands...', query ? `> ${query}` : '> ', ...rows].join('\n');
}

function score(item: PaletteItem, query: string): number {
  const haystack = `${item.command} ${item.description} ${item.category}`.toLowerCase();
  if (item.command.toLowerCase().startsWith(`/${query}`) || item.command.toLowerCase().startsWith(query)) return 100;
  if (haystack.includes(query)) return 50;
  let index = 0;
  let points = 0;
  for (const char of query) {
    const found = haystack.indexOf(char, index);
    if (found === -1) return 0;
    points += found === index ? 4 : 1;
    index = found + 1;
  }
  return points;
}
