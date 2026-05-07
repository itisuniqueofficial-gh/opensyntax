import type {RuleContext} from './types.js';

let cachedKey = '';
let cachedContext: RuleContext | undefined;

export function getCachedRules(key: string): RuleContext | undefined {
  return key === cachedKey ? cachedContext : undefined;
}

export function setCachedRules(key: string, context: RuleContext): RuleContext {
  cachedKey = key;
  cachedContext = context;
  return context;
}
