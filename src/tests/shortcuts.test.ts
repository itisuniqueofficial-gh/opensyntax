import {describe, expect, it} from 'vitest';
import {defaultConfig} from '../config/defaults.js';
import {globalInterrupt, InterruptController} from '../agent/interrupt.js';
import {renderCommandPalette, searchCommandPalette} from '../ui/command-palette.js';
import {renderShortcuts, shortcuts} from '../ui/shortcuts.js';
import {renderHelp} from '../ui/help.js';

describe('terminal shortcuts and palette', () => {
  it('enables visible safe reasoning summaries by default', () => {
    expect(defaultConfig.showReasoningSummary).toBe(true);
    expect(defaultConfig.shellMode).toBe('shell-safe');
    expect(defaultConfig.permission).toBe('workspace-write');
  });

  it('registers interrupt and palette shortcuts', () => {
    expect(shortcuts.map((shortcut) => shortcut.key)).toEqual(expect.arrayContaining(['Esc', 'Ctrl+C', 'Ctrl+P']));
    expect(renderShortcuts()).toContain('Cancel current task');
  });

  it('searches command palette commands', () => {
    expect(searchCommandPalette('providers').map((item) => item.command)).toContain('/providers');
    expect(renderCommandPalette('sessions')).toContain('/sessions');
  });

  it('shows shortcuts and command palette in help', () => {
    const help = renderHelp();
    expect(help).toContain('/shortcuts');
    expect(help).toContain('/command-palette');
  });

  it('supports abort reset and interrupt state', async () => {
    const controller = new InterruptController();
    expect(controller.signal.aborted).toBe(false);
    await controller.interrupt();
    expect(controller.signal.aborted).toBe(true);
    expect(controller.reset().aborted).toBe(false);
    expect(globalInterrupt.reset().aborted).toBe(false);
  });
});
