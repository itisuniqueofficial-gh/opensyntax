import chalk from 'chalk';
import type {AgentLoop} from '../agent/loop.js';
import {renderPlan} from '../agent/planner.js';
import {listSessions} from '../session/store.js';
import {panel} from './renderer.js';
import {promptUser} from './prompts.js';
import {logoutProviderPrompt, runProviderSetup, switchProviderPrompt} from './onboarding.js';
import {showAuth, showModels, showProviders} from '../commands/providers.js';

export async function runInteractive(loop: AgentLoop): Promise<void> {
  while (true) {
    const input = await promptUser(chalk.green('you'));
    if (!input) continue;
    if (input.startsWith('/')) {
      const exit = await handleCommand(input, loop);
      if (exit) return;
      continue;
    }
    await loop.run(input);
  }
}

async function handleCommand(input: string, loop: AgentLoop): Promise<boolean> {
  const [command, ...rest] = input.slice(1).split(/\s+/);
  if (command === 'exit') return true;
  if (command === 'help') panel('Commands', ['/help', '/clear', '/provider', '/providers', '/model [name]', '/tools', '/plan', '/session', '/diff', '/auth', '/login', '/logout', '/exit'].join('\n'));
  else if (command === 'clear') process.stdout.write('\x1Bc');
  else if (command === 'provider') await switchProviderPrompt();
  else if (command === 'providers') await showProviders();
  else if (command === 'model') panel('Model', rest.length ? await loop.setModel(rest.join(' ')) : loop.modelName());
  else if (command === 'models') await showModels();
  else if (command === 'tools') panel('Tools', loop.toolNames().join('\n'));
  else if (command === 'plan') panel('Plan', renderPlan(loop.session.plan));
  else if (command === 'session') panel('Sessions', (await listSessions()).join('\n') || 'No saved sessions');
  else if (command === 'diff') await loop.run('Show the current git diff and summarize changed files.');
  else if (command === 'auth') await showAuth();
  else if (command === 'login') await runProviderSetup(rest[0]);
  else if (command === 'logout') await logoutProviderPrompt(rest[0]);
  else if (command === 'undo') panel('Undo', 'No automatic destructive undo is run. Use /diff, then ask for a specific safe reversal.');
  else panel('Unknown command', `/${command}`);
  return false;
}
