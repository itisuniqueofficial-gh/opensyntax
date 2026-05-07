/**
 * Markdown table renderer for terminal output.
 *
 * Renders aligned tables with Unicode box-drawing characters.
 * Falls back to plain ASCII on narrow terminals or when Unicode is disabled.
 */

import chalk from 'chalk';
import {getUiConfig} from '../ui-config.js';

type TableRow = string[];

export function renderTable(rawTable: string): string {
  const lines = rawTable.trim().split('\n').map((l) => l.trim());
  if (lines.length < 2) return rawTable;

  // Parse rows
  const rows: TableRow[] = lines
    .filter((l) => !l.match(/^\|[-: |]+\|$/)) // skip separator rows
    .map((l) =>
      l.replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim())
    );

  if (!rows.length) return rawTable;

  const colCount = Math.max(...rows.map((r) => r.length));
  // Normalise all rows to same column count
  const normalised = rows.map((r) => {
    while (r.length < colCount) r.push('');
    return r;
  });

  // Compute column widths
  const widths: number[] = Array.from({length: colCount}, (_, i) =>
    Math.max(...normalised.map((r) => stripAnsi(r[i] ?? '').length), 3)
  );

  const cfg = getUiConfig();
  const useUnicode = cfg.unicodeBoxes;

  const h = useUnicode ? '─' : '-';
  const v = useUnicode ? '│' : '|';
  const tl = useUnicode ? '╭' : '+';
  const tr = useUnicode ? '╮' : '+';
  const bl = useUnicode ? '╰' : '+';
  const br = useUnicode ? '╯' : '+';
  const ml = useUnicode ? '├' : '+';
  const mr = useUnicode ? '┤' : '+';
  const mt = useUnicode ? '┬' : '+';
  const mb = useUnicode ? '┴' : '+';
  const mx = useUnicode ? '┼' : '+';

  const topBorder = tl + widths.map((w) => h.repeat(w + 2)).join(mt) + tr;
  const midBorder = ml + widths.map((w) => h.repeat(w + 2)).join(mx) + mr;
  const botBorder = bl + widths.map((w) => h.repeat(w + 2)).join(mb) + br;

  const renderRow = (row: TableRow, isHeader = false): string => {
    const cells = widths.map((w, i) => {
      const cell = row[i] ?? '';
      const padded = cell.padEnd(w);
      return isHeader ? chalk.bold(padded) : padded;
    });
    return chalk.gray(v) + cells.map((c) => ` ${c} `).join(chalk.gray(v)) + chalk.gray(v);
  };

  const output: string[] = [chalk.gray(topBorder)];

  normalised.forEach((row, index) => {
    output.push(renderRow(row, index === 0));
    if (index === 0 && normalised.length > 1) output.push(chalk.gray(midBorder));
  });

  output.push(chalk.gray(botBorder));
  return output.join('\n');
}

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*m/g, '');
}
