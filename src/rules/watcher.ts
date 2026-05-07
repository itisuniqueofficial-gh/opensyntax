import {watch, type FSWatcher} from 'node:fs';
import {dirname} from 'node:path';
import type {RuleContext} from './types.js';
import {loadWorkspaceRulesSafe} from './loader.js';

export type RuleWatcher = {close(): void};

export function watchRules(cwd: string, initial: RuleContext, onChange: (context: RuleContext) => void): RuleWatcher {
  const watchers: FSWatcher[] = [];
  let timer: NodeJS.Timeout | undefined;
  const reload = () => {
    clearTimeout(timer);
    timer = setTimeout(async () => onChange(await loadWorkspaceRulesSafe(cwd)), 150);
  };
  for (const file of initial.files) {
    try { watchers.push(watch(dirname(file.path), reload)); } catch {}
  }
  return {close: () => { clearTimeout(timer); for (const item of watchers) item.close(); }};
}
