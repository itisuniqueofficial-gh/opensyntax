#!/usr/bin/env node
import {Command} from 'commander';
import {loadConfig, saveConfig} from './config/config.js';
import {loadOrCreateSession} from './session/store.js';
import {workspaceRoot} from './utils/paths.js';
import {header, panel} from './ui/renderer.js';
import {runInteractive} from './ui/chat.js';
import {AgentLoop} from './agent/loop.js';
import {logger} from './utils/logger.js';

const program = new Command()
  .name('opensyntax')
  .alias('agent')
  .description('Terminal AI coding agent')
  .version('0.3.0')
  .option('-m, --model <model>', 'override model')
  .option('-p, --provider <provider>', 'openai, anthropic, gemini, or openrouter')
  .option('--permission <level>', 'read-only, workspace-write, shell-safe, or full-access')
  .option('--session <id>', 'resume a specific session')
  .argument('[prompt...]', 'optional one-shot request')
  .action(async (promptParts: string[], options: {model?: string; provider?: string; permission?: string; session?: string}) => {
    const workspace = workspaceRoot();
    const config = await loadConfig({model: options.model, provider: options.provider as any, permission: options.permission as any});
    const session = await loadOrCreateSession(workspace, options.session);
    const loop = new AgentLoop({workspace, config, session});
    header(workspace, loop.modelName(), config.permission);
    const prompt = promptParts.join(' ').trim();
    if (prompt) await loop.run(prompt);
    else await runInteractive(loop);
  });

program.command('config')
  .description('Write local OpenSyntax config')
  .option('--provider <provider>')
  .option('--model <model>')
  .option('--api-key <key>')
  .option('--base-url <url>')
  .option('--permission <level>')
  .action(async (options) => {
    const config = await loadConfig(options);
    await saveConfig(config);
    logger.success('Config saved to ~/.opensyntax/config.json');
  });

program.command('doctor')
  .description('Check configuration and workspace')
  .action(async () => {
    const config = await loadConfig();
    panel('Doctor', [`Workspace: ${workspaceRoot()}`, `Provider: ${config.provider}`, `Model: ${config.model}`, `API key: ${config.apiKey ? 'set' : 'missing'}`, `Permission: ${config.permission}`].join('\n'));
  });

await program.parseAsync(process.argv);
