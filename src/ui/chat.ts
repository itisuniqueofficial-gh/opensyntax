import chalk from 'chalk';
import type {AgentLoop} from '../agent/loop.js';
import {renderPlan} from '../agent/planner.js';
import {listSessions} from '../session/store.js';
import {panel} from './renderer.js';
import {promptUser} from './prompts.js';
import {logoutProviderPrompt, runProviderSetup, switchProviderPrompt} from './onboarding.js';
import {showAuth, showModels, showProviders} from '../commands/providers.js';
import {showModelsCommand, pickModelInteractive, listProviderSummary, refreshModelsCommand} from '../commands/models.js';
import {renderSettings} from '../commands/settings.js';
import {showCapabilities} from '../commands/capabilities.js';
import {showDebugPayload} from '../commands/debug.js';
import {loadConfig} from '../config/config.js';
import {resolveModelConfig} from '../auth/manager.js';
import {header} from './renderer.js';
import {workspaceRoot} from '../utils/paths.js';
import {runDoctor} from '../doctor/doctor.js';
import {architectureSummary, commitDraft, dependencySummary, diffSummary, findFiles, gitSummary, pluginSummary, prDraft, renderProgress, repoSummary, searchWorkspace, sessionMemory, symbolSummary} from '../commands/intelligence.js';
import {createStarterRules, openNearestRulesFile, renderRules, renderRulesDebug} from '../rules/context.js';
import {loadWorkspaceRulesSafe} from '../rules/loader.js';
import {setThinkingEnabled, setReasoningSummaryEnabled, renderThinkingStatus} from './thinking.js';
import {cmdNew, cmdSessions, cmdResume, cmdHistory, cmdDeleteSession, cmdRenameSession} from '../session/commands.js';
import {printHeader} from './layout.js';
import {handleMarkdownCommand, handleHighlightCommand, handleCodeboxCommand, handleLinenosCommand} from '../commands/markdown.js';
import {handleThemeCommand} from '../commands/theme.js';
import {runAuthDebug, runAuthHealthCheck} from '../commands/auth-debug.js';
import {renderCommandRisk, renderEnv, renderOS, renderPath, renderShell, renderTerminal} from '../commands/terminal.js';
import {renderPermissions} from '../commands/permissions.js';
import {commandForScript, renderScripts} from '../commands/scripts.js';
import {executeCommandTool} from '../tools/shell.js';
import {renderHelp} from '../commands/help.js';

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
  if (command === 'help') panel('Help', renderHelp(rest.join(' ')));
  else if (command === 'new') await cmdNew(loop);
  else if (command === 'sessions') await cmdSessions(loop);
  else if (command === 'resume') await cmdResume(loop, rest.join(' '));
  else if (command === 'history') cmdHistory(loop);
  else if (command === 'delete-session') await cmdDeleteSession(rest.join(' '), loop);
  else if (command === 'rename-session') await cmdRenameSession(loop, rest.join(' '));
  else if (command === 'clear') process.stdout.write('\x1Bc');
  else if (command === 'provider') await switchProvider(loop, rest[0]);
  else if (command === 'providers') await showProviders();
  else if (command === 'provider-list') panel('Providers', await listProviderSummary());
  else if (command === 'model') {
    if (rest.length) {
      panel('Model', await loop.setModel(rest.join(' ')));
    } else {
      // Interactive model picker for current provider
      const modelId = await pickModelInteractive(loop.providerId);
      if (modelId) panel('Model', await loop.setModel(modelId));
      else panel('Model', loop.modelName());
    }
  }
  else if (command === 'models') {
    if (rest[0] === 'refresh') await refreshModelsCommand(rest[1]);
    else await showModelsCommand(rest[0], rest[0] === 'all');
  }
  else if (command === 'capabilities') {
    const config = await loadConfig();
    await showCapabilities(config.provider, config.model);
  }
  else if (command === 'debug') {
    if (rest[0] === 'provider') {
      const config = await loadConfig();
      showDebugPayload(config, loop.toolSpecs());
    } else {
      panel('Debug', 'Usage: /debug provider');
    }
  }
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
  else if (command === 'files') panel('Files', ['Useful file requests:', '- Read package.json', '- Create docs/guide.md', '- Rename src/old.ts to src/new.ts', '- Search for TODO', '', 'Commands:', '/find <name>', '/search <query>'].join('\n'));
  else if (command === 'session') await cmdSessions(loop);
  else if (command === 'git') panel('Git', await gitSummary(workspaceRoot()));
  else if (command === 'diff') panel('Diff', await diffSummary(workspaceRoot()));
  else if (command === 'commit') panel('Commit Draft', await commitDraft(workspaceRoot()));
  else if (command === 'pr') panel('PR Draft', await prDraft(workspaceRoot()));
  else if (command === 'auto') panel('Autonomous Mode', loop.setAutoMode(rest[0] !== 'off'));
  else if (command === 'memory') panel('Memory', sessionMemory(loop.session));
  else if (command === 'plugins') panel('Plugins', await pluginSummary(workspaceRoot()));
  else if (command === 'settings') panel('Settings', await renderSettings());
  else if (command === 'theme') await handleThemeCommand(rest.join(' '));
  else if (command === 'markdown') await handleMarkdownCommand(rest[0] ?? '');
  else if (command === 'highlight') await handleHighlightCommand(rest[0] ?? 'on');
  else if (command === 'codebox') await handleCodeboxCommand(rest[0] ?? 'on');
  else if (command === 'linenos') await handleLinenosCommand(rest[0] ?? 'on');
  else if (command === 'auth') {
    if (rest[0] === 'debug') await runAuthDebug();
    else if (rest[0] === 'health') await runAuthHealthCheck();
    else await showAuth();
  }
  else if (command === 'login') { if (await runProviderSetup(rest[0])) await refreshProvider(loop, rest[0]); }
  else if (command === 'logout') await logoutProviderPrompt(rest[0]);
  else if (command === 'doctor') panel('Doctor', await runDoctor());
  else if (command === 'terminal') panel('Terminal', await renderTerminal(workspaceRoot()));
  else if (command === 'os') panel('OS', await renderOS());
  else if (command === 'shell') panel('Shell', renderShell());
  else if (command === 'permissions') panel('Permissions', await renderPermissions(rest[0]));
  else if (command === 'scripts') panel('Scripts', await renderScripts(workspaceRoot()));
  else if (command === 'run') await runScript(rest.join(' '), loop);
  else if (command === 'command') panel('Command Risk', renderCommandRisk(rest.join(' ')));
  else if (command === 'env') panel('Environment', await renderEnv());
  else if (command === 'path') panel('PATH', renderPath());
  else if (command === 'rules') await handleRules(rest, loop);
  else if (command === 'thinking') {
    if (rest[0] === 'on') { setThinkingEnabled(true); panel('Thinking', 'Thinking display enabled.'); }
    else if (rest[0] === 'off') { setThinkingEnabled(false); panel('Thinking', 'Thinking display disabled.'); }
    else panel('Thinking', renderThinkingStatus());
  }
  else if (command === 'reasoning') {
    const config = await loadConfig();
    const next = !config.showReasoningSummary;
    setReasoningSummaryEnabled(next);
    panel('Reasoning', `Reasoning summary: ${next ? chalk.green('on') : chalk.red('off')}`);
  }
  else if (command === 'undo') panel('Undo', 'No automatic destructive undo is run. Use /diff, then ask for a specific safe reversal.');
  else panel('Unknown command', `/${command}`);
  return false;
}

async function runScript(script: string, loop: AgentLoop): Promise<void> {
  if (!script) { panel('Run Script', 'Usage: /run <script>'); return; }
  try {
    const command = await commandForScript(workspaceRoot(), script);
    const config = await loadConfig();
    const result = await executeCommandTool.execute({command, reason: `Run package script ${script}`, timeoutMs: config.commandTimeoutMs, permission: 'safe'}, {workspace: workspaceRoot(), permission: config.permission, rules: loop.rulesContext(), log: (message) => process.stdout.write(message.endsWith('\n') ? message : `${message}\n`), askPermission: async (request) => (await import('../agent/permissions.js')).askPermission(request)});
    if (!result.ok) panel('Run Failed', result.output.slice(0, 4000));
  } catch (error) {
    panel('Run Script', error instanceof Error ? error.message : String(error));
  }
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
  await loop.setProviderConfig(config);
  header(workspaceRoot(), loop.modelName(), config.permission);
}

async function switchProvider(loop: AgentLoop, providerId?: string): Promise<void> {
  if (providerId) {
    const {listConnectedProviders, setDefaultProvider} = await import('../auth/manager.js');
    const connected = await listConnectedProviders();
    const match = connected.find((item) => item.providerId === providerId || item.name.toLowerCase() === providerId.toLowerCase());
    if (!match) {
      panel('Provider', [`Provider "${providerId}" is not connected.`, '', 'Run /login openai to connect OpenAI, then /provider openai.'].join('\n'));
      return;
    }
    await setDefaultProvider(match.providerId);
    await refreshProvider(loop, match.providerId);
    panel('Provider Updated', `Active provider: ${loop.modelName()}`);
    return;
  }
  await refreshProvider(loop, await switchProviderPrompt());
}
