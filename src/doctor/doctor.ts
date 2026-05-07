import {execa} from 'execa';
import {activeProviderId, hasConfiguredProvider, providerHealth, resolveModelConfig} from '../auth/manager.js';
import {loadConfig} from '../config/config.js';
import {createModelProvider} from '../agent/orchestrator.js';
import {workspaceRoot} from '../utils/paths.js';

export async function runDoctor(): Promise<string> {
  const [git, provider] = await Promise.all([checkGit(), checkProvider()]);
  return [`Workspace: ${workspaceRoot()}`, `Node.js: ${process.version}`, git, provider].join('\n');
}

async function checkProvider(): Promise<string> {
  if (!await hasConfiguredProvider()) return 'No providers connected';
  const providerId = await activeProviderId();
  const config = await resolveModelConfig(await loadConfig(), providerId);
  const health = providerId ? await providerHealth(providerId) : {ok: false, message: 'No active provider'};
  const chat = await chatTest(config);
  return [
    `Provider: ${config.providerName ?? config.provider}`,
    `Provider ID: ${config.provider}`,
    `Model: ${config.model}`,
    `Base URL: ${config.baseUrl ?? 'provider default'}`,
    `API Key: ${config.apiKey ? 'configured' : 'not required or missing'}`,
    `${health.ok ? '✓' : '✗'} Models: ${health.message}`,
    `${chat.ok ? '✓' : '✗'} Chat test: ${chat.message}`,
    `${chat.ok ? '✓' : '✗'} Streaming: ${chat.ok ? 'passed' : 'not verified'}`
  ].join('\n');
}

async function chatTest(config: Awaited<ReturnType<typeof resolveModelConfig>>): Promise<{ok: boolean; message: string}> {
  try {
    const provider = createModelProvider(config);
    let text = '';
    for await (const event of provider.stream({messages: [{role: 'user', content: 'Reply with OK only.'}], tools: [], temperature: 0, maxTokens: 32})) {
      if (event.type === 'text') text += event.text;
    }
    return text.trim() ? {ok: true, message: 'passed'} : {ok: false, message: 'empty response'};
  } catch (error) {
    return {ok: false, message: error instanceof Error ? error.message : 'failed'};
  }
}

async function checkGit(): Promise<string> {
  const version = await execa('git', ['--version'], {reject: false});
  if (version.exitCode !== 0) return '✗ Git not detected';
  const inside = await execa('git', ['rev-parse', '--is-inside-work-tree'], {cwd: workspaceRoot(), reject: false});
  if (inside.exitCode !== 0) return '• No Git repository detected; git tools are disabled for this workspace';
  const branch = await execa('git', ['branch', '--show-current'], {cwd: workspaceRoot(), reject: false});
  return `✓ Git detected${branch.stdout ? ` on ${branch.stdout}` : ' (detached HEAD)'}`;
}
