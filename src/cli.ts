#!/usr/bin/env node
import {Command} from 'commander';
import {loadConfig, saveConfig} from './config/config.js';
import {loadOrCreateSession} from './session/store.js';
import {workspaceRoot} from './utils/paths.js';
import {header, panel} from './ui/renderer.js';
import {runInteractive} from './ui/chat.js';
import {AgentLoop} from './agent/loop.js';
import {logger} from './utils/logger.js';
import {ensureOnboarded, logoutProviderPrompt, runProviderSetup} from './ui/onboarding.js';
import {runSettingsCommand} from './commands/settings.js';
import {hasConfiguredProvider, resolveModelConfig} from './auth/manager.js';
import {showAuth, showModels, showProviders} from './commands/providers.js';
import {showModelsCommand, refreshModelsCommand} from './commands/models.js';
import {runDoctor} from './doctor/doctor.js';
import {loadWorkspaceRulesSafe} from './rules/loader.js';
import {watchRules} from './rules/watcher.js';
import {createStarterRules} from './rules/context.js';
import {setThinkingEnabled, setReasoningSummaryEnabled} from './ui/thinking.js';
import {buildRuntimeState, refreshProviderModels} from './model/runtime.js';
import {validateProviderModel} from './model/validation.js';
import {applyAppConfig} from './ui/ui-config.js';
import {renderTerminal} from './commands/terminal.js';
import {renderPermissions} from './commands/permissions.js';
import {runDemoMode} from './commands/demo.js';

const program = new Command()
  .name('opensyntax')
  .alias('agent')
  .description('Terminal AI coding agent')
  .version('0.3.0')
  .option('-m, --model <model>', 'override model')
  .option('-p, --provider <provider>', 'openai, anthropic, gemini, openrouter, groq, together, nvidia, deepseek, mistral, ollama, lmstudio, or azure-openai')
  .option('--permission <level>', 'read-only, workspace-safe, workspace-write, shell-safe, full-os, or danger')
  .option('--session <id>', 'resume a specific session')
  .option('--demo', 'start in safe demo mode without provider, file changes, or shell commands')
  .option('--debug', 'show debug details for optional subsystem failures');

program.command('auth')
  .description('Connect or update an AI provider')
  .option('-p, --provider <provider>', 'provider id')
  .action(async (options: {provider?: string}) => { await runProviderSetup(options.provider); });

program.command('login')
  .description('Alias for auth')
  .option('-p, --provider <provider>', 'provider id')
  .action(async (options: {provider?: string}) => { await runProviderSetup(options.provider); });

program.command('logout')
  .description('Remove stored provider credentials')
  .argument('[provider]', 'provider id')
  .action(async (provider?: string) => { await logoutProviderPrompt(provider); });

program.command('providers')
  .description('List supported and connected providers')
  .action(showProviders);

program.command('models')
  .description('List models for the active or specified connected provider')
  .argument('[provider]', 'provider id, "all", or "refresh"')
  .action(async (provider?: string) => {
    if (provider === 'refresh') await refreshModelsCommand();
    else await showModelsCommand(provider, provider === 'all');
  });

program.command('settings')
  .description('Open interactive settings manager')
  .action(runSettingsCommand);

program.command('config')
  .description('Write local OpenSyntax config')
  .option('--provider <provider>')
  .option('--model <model>')
  .option('--api-key <key>')
  .option('--base-url <url>')
  .option('--permission <level>')
  .action(async (options) => {
    const config = await loadConfig({...options, provider: normalizeProvider(options.provider) as any});
    await saveConfig(config);
    logger.success('Config saved to ~/.opensyntax/config.json');
  });

program.command('doctor')
  .description('Check providers, configuration, git, and workspace health')
  .action(async () => { panel('Doctor', await runDoctor()); });

program.command('terminal')
  .description('Show OS, shell, terminal, and package-manager detection')
  .action(async () => { panel('Terminal', await renderTerminal(workspaceRoot())); });

program.command('permissions')
  .description('Show or change OpenSyntax permission mode')
  .argument('[mode]', 'read-only, workspace-safe, workspace-write, shell-safe, full-os, or danger')
  .action(async (mode?: string) => { panel('Permissions', await renderPermissions(mode)); });

program.command('providers:auth')
  .description('Show connected provider authentication state')
  .action(showAuth);

const rulesCommand = program.command('rules').description('Manage OPENSYNTAX.md and AGENTS.md workspace instructions');
rulesCommand.command('init')
  .description('Create a starter OPENSYNTAX.md in the current workspace')
  .action(async () => { logger.success(`Created ${await createStarterRules(workspaceRoot())}`); });

program.argument('[prompt...]', 'optional one-shot request')
  .action(async (promptParts: string[], options: {model?: string; provider?: string; permission?: string; session?: string; debug?: boolean; demo?: boolean}) => {
    const workspace = workspaceRoot();
    const prompt = promptParts.join(' ').trim();
    if (options.demo) { runDemoMode(); return; }
    if (!await hasConfiguredProvider()) {
      const connected = await ensureOnboarded();
      if (!connected && !prompt) return;
    }
    const loaded = await loadConfig({model: options.model, provider: normalizeProvider(options.provider) as any, permission: options.permission as any});
    const config = await resolveModelConfig(loaded, options.provider);
    // Apply thinking config from saved settings
    setThinkingEnabled(loaded.thinkingDisplay ?? true);
    setReasoningSummaryEnabled(loaded.showReasoningSummary ?? false);
    // Apply UI rendering config
    applyAppConfig(loaded);
    const session = await loadOrCreateSession(workspace, options.session);
    const rules = await loadRulesForCli(workspace, options.debug);
    const loop = new AgentLoop({workspace, config, session, rules});
    const watcher = watchRules(workspace, rules, (next) => {
      loop.updateRules(next);
      panel('Rules Reloaded', next.files.length ? `Reloaded ${next.files.length} OPENSYNTAX.md file${next.files.length === 1 ? '' : 's'}` : 'No OPENSYNTAX.md found.');
    });
    process.once('exit', () => watcher.close());
    header(workspace, loop.modelName(), config.permission, session.id, (session as any).title);
    if (rules.files.length) logger.success('Workspace instructions loaded');
    else if (options.debug) logger.status('No workspace instructions found.');

    // Startup validation — check provider/model and show warnings
    await startupValidation(config.provider, config.model, options.debug);

    if (prompt) await loop.run(prompt);
    else await runInteractive(loop);
  });

async function loadRulesForCli(workspace: string, debug = false) {
  return loadWorkspaceRulesSafe(workspace, (error) => {
    logger.warn('Warning: Could not load OPENSYNTAX.md rules.');
    logger.warn('OpenSyntax will continue without workspace instructions.');
    logger.warn('Run with --debug for details.');
    if (debug) logger.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  });
}

async function startupValidation(providerId: string, modelId: string, debug = false): Promise<void> {
  try {
    const runtime = await buildRuntimeState(providerId, modelId);
    for (const warning of runtime.warnings) logger.warn(warning);
    if (!runtime.toolsEnabled) {
      logger.status(`Tool calling disabled for ${providerId}/${modelId} — text-only mode`);
    }
  } catch (error) {
    if (debug) logger.error(`Startup validation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function normalizeProvider(provider?: string): string | undefined {
  // All providers are now handled natively; no remapping needed
  return provider;
}

await program.parseAsync(process.argv);
