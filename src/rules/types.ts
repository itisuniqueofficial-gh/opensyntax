export type RuleFrontmatter = {
  priority?: 'low' | 'normal' | 'high';
  autoTest?: boolean;
  shellSafety?: 'normal' | 'strict';
  preferredProvider?: string;
};

export type RuleSection = {
  title: string;
  content: string;
  items: string[];
};

export type RuleFile = {
  path: string;
  scope: 'global' | 'workspace';
  depth: number;
  mtimeMs: number;
  raw: string;
  frontmatter: RuleFrontmatter;
  sections: RuleSection[];
};

export type RuleContext = {
  files: RuleFile[];
  effectiveBullets: string[];
  restrictions: string[];
  shellRules: string[];
  testingRules: string[];
  prompt: string;
  tokenEstimate: number;
  debug: string;
  loadedAt: string;
};

export const emptyRuleContext: RuleContext = {
  files: [],
  effectiveBullets: [],
  restrictions: [],
  shellRules: [],
  testingRules: [],
  prompt: 'No OPENSYNTAX.md rules loaded.',
  tokenEstimate: 0,
  debug: 'No OPENSYNTAX.md files found.',
  loadedAt: new Date(0).toISOString()
};
