import {describe, expect, it, vi} from 'vitest';
import {suggestSlashCommands} from '../ui/autocomplete.js';
import {noProviderState, noSessionsState, readyState} from '../ui/empty-state.js';
import {renderHelp, renderHelpTopic} from '../ui/help.js';
import {theme} from '../ui/theme.js';
import {defaultConfig} from '../config/defaults.js';

describe('user experience helpers', () => {
  it('renders categorized help with beginner commands', () => {
    const help = renderHelp();
    expect(help).toContain('Chat');
    expect(help).toContain('/provider [id]');
    expect(help).toContain('/run <script>');
    expect(help).toContain('/verify [objective]');
    expect(help).toContain('fix build errors');
  });

  it('renders focused help topics', () => {
    expect(renderHelpTopic('providers')).toContain('/provider [id]');
    expect(renderHelpTopic('permissions')).toContain('/permissions');
  });

  it('suggests slash commands with fuzzy matching', () => {
    expect(suggestSlashCommands('/prov')).toEqual(expect.arrayContaining(['/provider', '/providers']));
    expect(suggestSlashCommands('/ses')).toContain('/sessions');
    expect(suggestSlashCommands('/ver')).toContain('/verify');
  });

  it('defaults to beginner-friendly workspace write permissions', () => {
    expect(defaultConfig.permission).toBe('workspace-write');
    expect(defaultConfig.shellMode).toBe('workspace-write');
  });

  it('renders friendly empty states', () => {
    expect(noProviderState()).toContain('/login openai');
    expect(noSessionsState()).toContain('/new');
    expect(readyState('OpenAI', 'gpt-4o-mini')).toContain('Explain this project');
  });

  it('supports no-color icon fallback when module is loaded with NO_COLOR', async () => {
    vi.resetModules();
    const old = process.env.NO_COLOR;
    process.env.NO_COLOR = '1';
    const mod = await import('../ui/theme.js');
    expect(mod.theme.ok).toBe('[ok]');
    if (old === undefined) delete process.env.NO_COLOR;
    else process.env.NO_COLOR = old;
  });

  it('has default colorful status icon in normal mode', () => {
    expect(theme.ok.length).toBeGreaterThan(0);
  });
});
