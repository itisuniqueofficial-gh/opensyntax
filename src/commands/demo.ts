import {panel} from '../ui/renderer.js';

export function runDemoMode(): void {
  panel('Demo Mode', ['Safe exploration mode is active.', '', '- No provider is required', '- No file changes are made', '- No shell commands are run', '', 'Try these prompts after connecting a provider:', '- Explain this project', '- Show me available commands', '- How do permissions work?', '', 'Run opensyntax auth when you are ready to connect an AI provider.'].join('\n'));
}
