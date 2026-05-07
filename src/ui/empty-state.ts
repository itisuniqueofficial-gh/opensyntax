export function noProviderState(): string {
  return ['No AI provider connected.', '', 'Start here:', '  /login openai', '', 'Or run:', '  opensyntax auth'].join('\n');
}

export function noSessionsState(): string {
  return ['No previous sessions found.', '', 'Start a new chat with:', '  /new', '', 'Ask something like:', '  Explain this project'].join('\n');
}

export function noGitState(): string {
  return ['No git repository detected.', 'Git features will be limited, but chat, file reads, and safe workspace tools still work.', '', 'To enable git features, run:', '  git init'].join('\n');
}

export function readyState(provider: string, model: string): string {
  return [`${provider} connected`, `${model} selected`, 'Workspace loaded', 'Session ready', '', 'Try:', '- Explain this project', '- Fix TypeScript errors', '- Create README'].join('\n');
}
