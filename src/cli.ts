#!/usr/bin/env node
import {Command} from 'commander';
import {loadConfig, saveConfig} from './config/config.js';
import {loadOrCreateSession} from './session/store.js';
import {workspaceRoot} from './utils/paths.js';
import {header, panel} from './ui/renderer.js';
import {runInteractive} from './ui/chat.js';
import {AgentLoop} from './agent/loop.js';
import {logger} from './utils/logger.js';
import {ensureOnboarded, logoutProviderPrompt, runProviderSetup, runSettings} from './ui/onboarding.js';
import {hasConfiguredProvider, resolveModelConfig} from './auth/manager.js';
import {showAuth, showModels, showProviders} from './commands/providers.js';
import {runDoctor} from './doctor/doctor.js';
import {loadWorkspaceRulesSafe} from './rules/loader.js';
import {watchRules} from './rules/watcher.js';
import {createStarterRules} from './rules/context.js';

const program = new Command()
  .name('opensyntax')
  .alias('agent')
  .description('Terminal AI coding agent')
  .version('0.3.0')
  .option('-m, --model <model>', 'override model')
  .option('-p, --provider <provider>', 'openai, anthropic, gemini, openrouter, groq, together, nvidia, deepseek, mistral, ollama, lmstudio, or azure-openai')
  .option('--permission <level>', 'read-only, workspace-write, shell-safe, or full-access')
  .option('--session <id>', 'resume a specific session')
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
  .description('List models for the default or selected provider')
  .argument('[provider]', 'provider id')
  .action(async (provider?: string) => { await showModels(provider); });

program.command('settings')
  .description('Open interactive settings manager')
  .action(runSettings);

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

program.command('providers:auth')
  .description('Show connected provider authentication state')
  .action(showAuth);

const rulesCommand = program.command('rules').description('Manage OPENSYNTAX.md and AGENTS.md workspace instructions');
rulesCommand.command('init')
  .description('Create a starter OPENSYNTAX.md in the current workspace')
  .action(async () => { logger.success(`Created ${await createStarterRules(workspaceRoot())}`); });

program.argument('[prompt...]', 'optional one-shot request')
  .action(async (promptParts: string[], options: {model?: string; provider?: string; permission?: string; session?: string; debug?: boolean}) => {
    const workspace = workspaceRoot();
    const prompt = promptParts.join(' ').trim();
    if (!await hasConfiguredProvider()) {
      const connected = await ensureOnboarded();
      if (!connected && !prompt) return;
    }
    const loaded = await loadConfig({model: options.model, provider: normalizeProvider(options.provider) as any, permission: options.permission as any});
    const config = await resolveModelConfig(loaded, options.provider);
    const session = await loadOrCreateSession(workspace, options.session);
    const rules = await loadRulesForCli(workspace, options.debug);
    const loop = new AgentLoop({workspace, config, session, rules});
    const watcher = watchRules(workspace, rules, (next) => {
      loop.updateRules(next);
      panel('Rules Reloaded', next.files.length ? `Reloaded ${next.files.length} OPENSYNTAX.md file${next.files.length === 1 ? '' : 's'}` : 'No OPENSYNTAX.md found.');
    });
    process.once('exit', () => watcher.close());
    header(workspace, loop.modelName(), config.permission);
    if (rules.files.length) logger.success('Workspace instructions loaded');
    else if (options.debug) logger.status('No workspace instructions found.');
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

function normalizeProvider(provider?: string): string | undefined {
  if (!provider) return undefined;
  if (['groq', 'together', 'nvidia', 'deepseek', 'mistral', 'ollama', 'lmstudio', 'azure-openai'].includes(provider)) return 'openai';
  return provider;
}

await program.parseAsync(process.argv);
