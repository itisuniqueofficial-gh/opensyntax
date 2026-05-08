export type Shortcut = {
  key: string;
  action: string;
  description: string;
  available: 'current' | 'planned';
};

export const shortcuts: Shortcut[] = [
  {key: 'Esc', action: 'cancel', description: 'Cancel current task or close modal.', available: 'current'},
  {key: 'Ctrl+C', action: 'interrupt', description: 'Interrupt current command/stream.', available: 'current'},
  {key: 'Ctrl+D', action: 'exit', description: 'Exit interactive session.', available: 'current'},
  {key: 'Ctrl+L', action: 'clear', description: 'Clear screen.', available: 'planned'},
  {key: 'Ctrl+R', action: 'history', description: 'Search session history.', available: 'planned'},
  {key: 'Ctrl+N', action: 'new', description: 'Start new chat.', available: 'planned'},
  {key: 'Ctrl+S', action: 'save', description: 'Save current session.', available: 'planned'},
  {key: 'Ctrl+P', action: 'palette', description: 'Open command palette.', available: 'planned'},
  {key: 'Ctrl+K', action: 'clear-input', description: 'Clear input.', available: 'planned'},
  {key: 'Ctrl+Space', action: 'autocomplete', description: 'Show autocomplete.', available: 'planned'},
  {key: 'Tab', action: 'accept-suggestion', description: 'Accept suggestion.', available: 'planned'},
  {key: 'Shift+Tab', action: 'previous-suggestion', description: 'Previous suggestion.', available: 'planned'},
  {key: 'Alt+Enter', action: 'newline', description: 'Insert newline in input.', available: 'planned'},
  {key: 'Enter', action: 'submit', description: 'Submit input.', available: 'current'}
];

export function renderShortcuts(): string {
  return shortcuts.map((shortcut) => `${shortcut.key.padEnd(12)} ${shortcut.description} ${shortcut.available === 'current' ? '' : '(planned raw-mode)'}`.trim()).join('\n');
}
