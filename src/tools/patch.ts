import {applyPatch as applyUnifiedPatch} from 'diff';

export type PatchMode =
  | {kind: 'exact'; search: string; replace: string; all?: boolean}
  | {kind: 'line-range'; startLine: number; endLine: number; replacement: string}
  | {kind: 'append'; text: string}
  | {kind: 'prepend'; text: string}
  | {kind: 'insert-after'; search: string; text: string}
  | {kind: 'insert-before'; search: string; text: string}
  | {kind: 'unified-diff'; patch: string}
  | {kind: 'json-patch'; operations: JsonPatchOperation[]};

export type JsonPatchOperation = {
  op: 'add' | 'replace' | 'remove';
  path: string;
  value?: unknown;
};

export function detectLineEnding(text: string): '\r\n' | '\n' {
  return text.includes('\r\n') ? '\r\n' : '\n';
}

export function hasFinalNewline(text: string): boolean {
  return text.endsWith('\n');
}

export function applyTextPatch(previous: string, mode: PatchMode): string {
  const eol = detectLineEnding(previous);
  const finalNewline = hasFinalNewline(previous);
  let next: string;
  switch (mode.kind) {
    case 'exact': {
      const first = previous.indexOf(mode.search);
      if (first === -1) throw new Error('Search text not found');
      if (!mode.all && previous.indexOf(mode.search, first + mode.search.length) !== -1) throw new Error('Search text is ambiguous');
      next = mode.all ? previous.split(mode.search).join(mode.replace) : previous.slice(0, first) + mode.replace + previous.slice(first + mode.search.length);
      break;
    }
    case 'line-range': {
      if (mode.startLine < 1 || mode.endLine < mode.startLine) throw new Error('Invalid line range');
      const lines = previous.split(/\r?\n/);
      const replacement = mode.replacement.split(/\r?\n/);
      lines.splice(mode.startLine - 1, mode.endLine - mode.startLine + 1, ...replacement);
      next = lines.join(eol);
      break;
    }
    case 'append':
      next = previous + (previous && !previous.endsWith('\n') ? eol : '') + normalizeEol(mode.text, eol);
      break;
    case 'prepend':
      next = normalizeEol(mode.text, eol) + (mode.text.endsWith('\n') || !previous ? '' : eol) + previous;
      break;
    case 'insert-after': {
      const index = previous.indexOf(mode.search);
      if (index === -1) throw new Error('Search text not found');
      next = previous.slice(0, index + mode.search.length) + normalizeEol(mode.text, eol) + previous.slice(index + mode.search.length);
      break;
    }
    case 'insert-before': {
      const index = previous.indexOf(mode.search);
      if (index === -1) throw new Error('Search text not found');
      next = previous.slice(0, index) + normalizeEol(mode.text, eol) + previous.slice(index);
      break;
    }
    case 'unified-diff': {
      const patched = applyUnifiedPatch(previous, mode.patch);
      if (patched === false) throw new Error('Unified diff did not apply');
      next = patched;
      break;
    }
    case 'json-patch':
      next = `${JSON.stringify(applyJsonPatch(JSON.parse(previous), mode.operations), null, 2)}${eol}`;
      break;
  }
  if (finalNewline && next && !next.endsWith('\n')) next += eol;
  return next;
}

function normalizeEol(text: string, eol: string): string {
  return text.replace(/\r?\n/g, eol);
}

function applyJsonPatch(document: unknown, operations: JsonPatchOperation[]): unknown {
  const root = structuredClone(document) as Record<string, unknown>;
  for (const operation of operations) {
    const parts = operation.path.split('/').slice(1).map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'));
    if (parts.length === 0) throw new Error('JSON patch root replacement is not supported');
    let target: any = root;
    for (const part of parts.slice(0, -1)) {
      target = Array.isArray(target) ? target[Number(part)] : target[part];
      if (target === undefined) throw new Error(`JSON patch path not found: ${operation.path}`);
    }
    const key = parts.at(-1)!;
    if (operation.op === 'remove') {
      if (Array.isArray(target)) target.splice(Number(key), 1);
      else delete target[key];
    } else {
      if (Array.isArray(target)) target[key === '-' ? target.length : Number(key)] = operation.value;
      else target[key] = operation.value;
    }
  }
  return root;
}
