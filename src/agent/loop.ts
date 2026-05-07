import type {AppConfig} from '../config/config.js';
import type {ChatMessage, ToolCall} from '../model/types.js';
import type {SessionRecord} from '../session/history.js';
import {saveSession} from '../session/store.js';
import {defaultRegistry, type ToolRegistry} from '../tools/registry.js';
import type {ToolContext} from '../tools/types.js';
import type {RuleContext} from '../rules/types.js';
import {emptyRuleContext} from '../rules/types.js';
import {errorMessage} from '../utils/errors.js';
import {askPermission} from './permissions.js';
import {initialPlan} from './planner.js';
import {createModelProvider} from './orchestrator.js';
import {systemPrompt} from './prompts.js';
import {assistantChunk, panel, status} from '../ui/renderer.js';

export class AgentLoop {
  private config: AppConfig;
  private readonly workspace: string;
  private readonly registry: ToolRegistry;
  private rules: RuleContext;
  readonly session: SessionRecord;

  constructor(options: {workspace: string; config: AppConfig; session: SessionRecord; registry?: ToolRegistry; rules?: RuleContext}) {
    this.workspace = options.workspace;
    this.config = options.config;
    this.session = options.session;
    this.registry = options.registry ?? defaultRegistry;
    this.rules = options.rules ?? emptyRuleContext;
  }

  modelName() { return `${this.config.provider}/${this.config.model}`; }
  providerName() { return this.config.providerName ?? this.config.provider; }
  baseUrl() { return this.config.baseUrl; }
  toolNames() { return this.registry.names(); }
  async setModel(model: string) { this.config = {...this.config, model}; return `Model set to ${model}`; }
  updateConfig(config: AppConfig) { this.config = config; }
  updateRules(rules: RuleContext) { this.rules = rules; }
  rulesContext() { return this.rules; }

  async run(request: string): Promise<void> {
    if (this.session.plan.length === 0) this.session.plan = initialPlan(request);
    this.session.messages.push({role: 'user', content: request});

    for (let step = 0; step < 12; step++) {
      const provider = createModelProvider(this.config);
      const toolCalls: ToolCall[] = [];
      let assistantText = '';
      status(`thinking with ${this.modelName()}`);
      try {
        for await (const event of provider.stream({
          messages: this.session.messages,
          tools: shouldEnableTools(request) ? this.registry.specs() : [],
          systemPrompt: systemPrompt(this.workspace, this.session.plan, this.rules),
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens
        })) {
          if (event.type === 'text') { assistantText += event.text; assistantChunk(event.text); }
          if (event.type === 'tool_call') toolCalls.push(event.call);
        }
      } catch (error) {
        panel('Model Error', errorMessage(error));
        break;
      }

      if (assistantText.trim()) process.stdout.write('\n');
      this.session.messages.push({role: 'assistant', content: assistantText, toolCalls});
      if (toolCalls.length === 0) {
        if (!assistantText.trim()) this.showEmptyResponseHelp();
        break;
      }

      for (const call of toolCalls) await this.executeTool(call);
      await saveSession(this.session);
    }
    this.markPlanComplete();
    await saveSession(this.session);
  }

  private async executeTool(call: ToolCall): Promise<void> {
    status(`tool ${call.name}`);
    const context: ToolContext = {workspace: this.workspace, permission: this.config.permission, rules: this.rules, log: (message) => process.stdout.write(message.endsWith('\n') ? message : `${message}\n`), askPermission};
    const result = await this.registry.execute(call.name, call.arguments, context);
    this.session.toolLog.push({at: new Date().toISOString(), name: call.name, input: call.arguments, output: result.output, ok: result.ok});
    this.session.messages.push({role: 'tool', toolCallId: call.id, content: result.output.slice(0, 12000)});
    if (result.ok && this.config.showToolSummary) panel('Tool', `${call.name}: ${result.output.slice(0, 500)}`);
    if (!result.ok) panel('Tool Failed', `${call.name}: ${result.output}`);
  }

  private showEmptyResponseHelp(): void {
    panel('No Assistant Response', [
      `No assistant response received from ${this.providerName()}.`,
      'Try:',
      '- switching model',
      '- running /doctor',
      '- checking API credits',
      '- checking provider status'
    ].join('\n'));
  }

  private markPlanComplete(): void {
    this.session.plan = this.session.plan.map((item) => item.state === 'pending' || item.state === 'in_progress' ? {...item, state: 'completed'} : item);
  }
}

function shouldEnableTools(request: string): boolean {
  return /\b(file|files|repo|repository|workspace|code|edit|fix|refactor|run|command|shell|test|build|lint|typecheck|git|diff|commit|read|search|find|create|write|delete|install)\b/i.test(request);
}
