export type HelpCommand = {
  command: string;
  description: string;
  category: 'Chat' | 'Providers' | 'Workspace' | 'Terminal' | 'Settings' | 'Advanced';
  examples?: string[];
  aliases?: string[];
};

export const helpCommands: HelpCommand[] = [
  {category: 'Chat', command: '/new', description: 'Start a fresh chat while saving the current session.'},
  {category: 'Chat', command: '/sessions', description: 'Browse saved sessions.', aliases: ['/session']},
  {category: 'Chat', command: '/resume [id]', description: 'Resume a previous session.'},
  {category: 'Chat', command: '/history', description: 'Show messages and tool calls in the current session.'},
  {category: 'Providers', command: '/login [provider]', description: 'Connect or update a provider.', examples: ['/login openai']},
  {category: 'Providers', command: '/providers', description: 'Show connected providers.'},
  {category: 'Providers', command: '/provider [id]', description: 'Switch active provider.', examples: ['/provider openai']},
  {category: 'Providers', command: '/model [id]', description: 'Show or switch model for the active provider.', examples: ['/model gpt-4o-mini']},
  {category: 'Providers', command: '/models', description: 'List models for the active provider.'},
  {category: 'Workspace', command: '/repo', description: 'Summarize the current project.'},
  {category: 'Workspace', command: '/files', description: 'Show useful file commands and examples.', aliases: ['/find']},
  {category: 'Workspace', command: '/search <query>', description: 'Search workspace content.', aliases: ['/grep']},
  {category: 'Workspace', command: '/git', description: 'Show branch, status, and git context.'},
  {category: 'Workspace', command: '/diff', description: 'Summarize current git diff.'},
  {category: 'Terminal', command: '/terminal', description: 'Show OS, shell, WSL, Node, and package-manager detection.'},
  {category: 'Terminal', command: '/scripts', description: 'List package.json scripts and commands.'},
  {category: 'Terminal', command: '/run <script>', description: 'Run a package script safely.', examples: ['/run build']},
  {category: 'Terminal', command: '/command <cmd>', description: 'Preview command risk before running.'},
  {category: 'Settings', command: '/settings', description: 'Open settings summary.'},
  {category: 'Settings', command: '/permissions [mode]', description: 'Show or change permission mode.'},
  {category: 'Settings', command: '/theme [mode]', description: 'Switch theme.'},
  {category: 'Advanced', command: '/doctor', description: 'Check provider, model, auth, shell, git, workspace, and config.'},
  {category: 'Advanced', command: '/rules', description: 'Show loaded OPENSYNTAX.md and AGENTS.md guidance.'},
  {category: 'Advanced', command: '/debug provider', description: 'Show provider debug details.'},
  {category: 'Advanced', command: '/tools', description: 'List registered tools.'}
];

export function renderHelp(topic?: string): string {
  if (topic) return renderHelpTopic(topic);
  const categories = [...new Set(helpCommands.map((item) => item.category))];
  return categories.map((category) => {
    const rows = helpCommands.filter((item) => item.category === category).map((item) => `${item.command.padEnd(24)} ${item.description}`);
    return `${category}\n${rows.join('\n')}`;
  }).join('\n\n') + '\n\nExamples\n/provider openai\n/model gpt-4o-mini\n/run build\n/help providers';
}

export function renderHelpTopic(topic: string): string {
  const normalized = topic.toLowerCase();
  const category = helpCommands.find((item) => item.category.toLowerCase() === normalized)?.category;
  const matches = category
    ? helpCommands.filter((item) => item.category === category)
    : helpCommands.filter((item) => item.command.includes(normalized) || item.description.toLowerCase().includes(normalized) || item.aliases?.some((alias) => alias.includes(normalized)));
  if (!matches.length) return `No help topic found for "${topic}". Try /help providers, /help sessions, /help workspace, or /help permissions.`;
  return matches.map((item) => [item.command, item.description, ...(item.examples?.map((example) => `Example: ${example}`) ?? [])].join('\n')).join('\n\n');
}
