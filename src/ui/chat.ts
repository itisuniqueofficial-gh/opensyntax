import chalk from 'chalk';
import type {AgentLoop} from '../agent/loop.js';
import {renderPlan} from '../agent/planner.js';
import {listSessions} from '../session/store.js';
import {panel} from './renderer.js';
import {promptUser} from './prompts.js';
import {logoutProviderPrompt, runProviderSetup, switchProviderPrompt} from './onboarding.js';
import {showAuth, showModels, showProviders} from '../commands/providers.js';
import {loadConfig} from '../config/config.js';
import {resolveModelConfig} from '../auth/manager.js';
import {header} from './renderer.js';
import {workspaceRoot} from '../utils/paths.js';
import {runDoctor} from '../doctor/doctor.js';
import {architectureSummary, commitDraft, dependencySummary, diffSummary, findFiles, gitSummary, pluginSummary, prDraft, renderProgress, repoSummary, searchWorkspace, sessionMemory, symbolSummary} from '../commands/intelligence.js';
import {createStarterRules, openNearestRulesFile, renderRules, renderRulesDebug} from '../rules/context.js';
import {loadWorkspaceRulesSafe} from '../rules/loader.js';

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
  if (command === 'help') panel('Commands', ['/help', '/clear', '/provider', '/providers', '/model [name]', '/models', '/tools', '/plan', '/tasks', '/todo', '/progress', '/repo', '/architecture', '/dependencies', '/symbols [query]', '/search <query>', '/find <query>', '/grep <query>', '/git', '/diff', '/commit', '/pr', '/auto', '/memory', '/history', '/plugins', '/settings', '/theme', '/auth', '/login', '/logout', '/doctor', '/rules', '/rules debug', '/rules reload', '/rules open', '/rules init', '/exit'].join('\n'));
  else if (command === 'clear') process.stdout.write('\x1Bc');
  else if (command === 'provider') await refreshProvider(loop, await switchProviderPrompt());
  else if (command === 'providers') await showProviders();
  else if (command === 'model') panel('Model', rest.length ? await loop.setModel(rest.join(' ')) : loop.modelName());
  else if (command === 'models') await showModels();
  else if (command === 'tools') panel('Tools', loop.toolNames().join('\n'));
  else if (command === 'plan') panel('Plan', renderPlan(loop.session.plan));
  else if (command === 'tasks' || command === 'todo') panel('Tasks', renderPlan(loop.session.plan) || 'No active tasks yet.');
  else if (command === 'progress') panel('Progress', renderProgress(loop.session));
  else if (command === 'repo') panel('Repository', await repoSummary(workspaceRoot()));
  else if (command === 'architecture') panel('Architecture', await architectureSummary(workspaceRoot()));
  else if (command === 'dependencies') panel('Dependencies', await dependencySummary(workspaceRoot()));
  else if (command === 'symbols' || command === 'symbol') panel('Symbols', await symbolSummary(workspaceRoot(), rest.join(' ')));
  else if (command === 'search' || command === 'grep') panel('Search', await searchWorkspace(workspaceRoot(), rest.join(' ')));
  else if (command === 'find') panel('Find Files', await findFiles(workspaceRoot(), rest.join(' ')));
  else if (command === 'session') panel('Sessions', (await listSessions()).join('\n') || 'No saved sessions');
  else if (command === 'git') panel('Git', await gitSummary(workspaceRoot()));
  else if (command === 'diff') panel('Diff', await diffSummary(workspaceRoot()));
  else if (command === 'commit') panel('Commit Draft', await commitDraft(workspaceRoot()));
  else if (command === 'pr') panel('PR Draft', await prDraft(workspaceRoot()));
  else if (command === 'auto') panel('Autonomous Mode', loop.setAutoMode(rest[0] !== 'off'));
  else if (command === 'memory' || command === 'history') panel('Memory', sessionMemory(loop.session));
  else if (command === 'plugins') panel('Plugins', await pluginSummary(workspaceRoot()));
  else if (command === 'settings') panel('Settings', 'Use `opensyntax settings` from your shell to open the interactive settings manager.');
  else if (command === 'theme') panel('Theme', 'Terminal theme follows your shell. Rich theme controls are planned for the interactive UI layer.');
  else if (command === 'auth') await showAuth();
  else if (command === 'login') { if (await runProviderSetup(rest[0])) await refreshProvider(loop, rest[0]); }
  else if (command === 'logout') await logoutProviderPrompt(rest[0]);
  else if (command === 'doctor') panel('Doctor', await runDoctor());
  else if (command === 'rules') await handleRules(rest, loop);
  else if (command === 'undo') panel('Undo', 'No automatic destructive undo is run. Use /diff, then ask for a specific safe reversal.');
  else panel('Unknown command', `/${command}`);
  return false;
}

async function handleRules(args: string[], loop: AgentLoop): Promise<void> {
  const action = args[0];
  if (action === 'debug') panel('Rules Debug', renderRulesDebug(loop.rulesContext()));
  else if (action === 'reload') {
    const next = await loadWorkspaceRulesSafe(workspaceRoot(), () => {
      panel('Rules Warning', 'Warning: Could not load OPENSYNTAX.md rules.\nOpenSyntax will continue without workspace instructions.');
    });
    loop.updateRules(next);
    panel('Rules Reloaded', renderRules(next));
  } else if (action === 'open') {
    panel('Rules File', await openNearestRulesFile(workspaceRoot()));
  } else if (action === 'init') {
    try { panel('Rules File', `Created ${await createStarterRules(workspaceRoot())}`); }
    catch (error) { panel('Rules File', isFileExistsError(error) ? 'OPENSYNTAX.md already exists.' : String(error)); }
  } else {
    panel('Rules', renderRules(loop.rulesContext()));
  }
}

function isFileExistsError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && (error as Error & {code?: string}).code === 'EEXIST';
}

async function refreshProvider(loop: AgentLoop, providerId?: string): Promise<void> {
  if (!providerId) return;
  const config = await resolveModelConfig(await loadConfig(), providerId);
  loop.updateConfig(config);
  header(workspaceRoot(), loop.modelName(), config.permission);
}
