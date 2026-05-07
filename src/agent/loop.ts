import type {AppConfig} from '../config/config.js';
import type {ChatMessage, ToolCall} from '../model/types.js';
import type {SessionRecord} from '../session/history.js';
import {saveSession} from '../session/store.js';
import {maybeSetTitle} from '../session/store.js';
import {newMessageId, newToolCallId} from '../session/id.js';
import type {Session, MessageRecord, ToolCallRecord} from '../session/types.js';
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
import {printToolStart, printToolEnd, printToolError, printSessionStatusBar} from '../ui/layout.js';
import {showThinkingStep, showToolDecision} from '../ui/thinking.js';
import {modelUnavailableMessage, fallbackModel} from '../model/capabilities.js';
import {modelsForProvider} from '../model/registry.js';

export class AgentLoop {
  private config: AppConfig;
  private readonly workspace: string;
  private readonly registry: ToolRegistry;
  private rules: RuleContext;
  private autoMode = false;
  session: Session;

  constructor(options: {workspace: string; config: AppConfig; session: Session | SessionRecord; registry?: ToolRegistry; rules?: RuleContext}) {
    this.workspace = options.workspace;
    this.config = options.config;
    // Upgrade legacy SessionRecord to Session if needed
    this.session = upgradeSession(options.session, options.config.provider, options.config.model);
    this.registry = options.registry ?? defaultRegistry;
    this.rules = options.rules ?? emptyRuleContext;
  }

  get providerId() { return this.config.provider; }
  get modelId() { return this.config.model; }

  modelName() { return `${this.config.provider}/${this.config.model}`; }
  providerName() { return this.config.providerName ?? this.config.provider; }
  baseUrl() { return this.config.baseUrl; }
  toolNames() { return this.registry.names(); }
  toolSpecs() { return this.registry.specs(); }
  async setModel(model: string) { this.config = {...this.config, model}; return `Model set to ${model}`; }
  updateConfig(config: AppConfig) { this.config = config; }
  updateRules(rules: RuleContext) { this.rules = rules; }
  rulesContext() { return this.rules; }
  resetSession(session: Session) { this.session = session; }
  setAutoMode(enabled: boolean) { this.autoMode = enabled; return enabled ? 'Autonomous mode enabled. I will continue tool-assisted workflows until completion while still asking approval for risky actions.' : 'Autonomous mode disabled.'; }

  async run(request: string): Promise<void> {
    if (this.session.plan.length === 0) this.session.plan = initialPlan(request);

    // Auto-title the session from the first user message
    maybeSetTitle(this.session, request);

    // Add user message with unique ID
    const userMsg: MessageRecord = {
      id: newMessageId(),
      sessionId: this.session.id,
      role: 'user',
      content: request,
      createdAt: new Date().toISOString()
    };
    this.session.messages.push(userMsg);

    // Show thinking progress
    showThinkingStep('understanding');

    for (let step = 0; step < (this.autoMode ? 20 : 12); step++) {
      const provider = createModelProvider(this.config);
      const toolCalls: ToolCall[] = [];
      let assistantText = '';
      status(`thinking with ${this.modelName()}`);
      showThinkingStep(step === 0 ? 'preparing-request' : 'executing');
      try {
        showThinkingStep('sending-request');
        // Build ChatMessage array from session messages
        const chatMessages: ChatMessage[] = this.session.messages.map((m) => ({
          role: m.role as ChatMessage['role'],
          content: m.content,
          toolCallId: m.toolCallId,
          toolCalls: m.toolCalls
        }));
        for await (const event of provider.stream({
          messages: chatMessages,
          tools: shouldEnableTools(request) ? this.registry.specs() : [],
          systemPrompt: systemPrompt(this.workspace, this.session.plan, this.rules, this.autoMode),
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens
        })) {
          if (event.type === 'text') { assistantText += event.text; assistantChunk(event.text); }
          if (event.type === 'tool_call') toolCalls.push(event.call);
        }
      } catch (error) {
        const message = errorMessage(error);
        showThinkingStep('request-failed');
        // Model unavailable — try fallback if enabled
        if (this.config.modelFallback && isModelUnavailableError(message)) {
          const available = modelsForProvider(this.config.provider).map((m) => m.id);
          const fb = fallbackModel(this.config.provider, this.config.model, available);
          if (fb) {
            panel('Model Fallback', modelUnavailableMessage(this.config.provider, this.config.model, available));
            this.config = {...this.config, model: fb.id};
            continue;
          }
        }
        panel('Model Error', message);
        break;
      }

      if (assistantText.trim()) process.stdout.write('\n');

      // Add assistant message with unique ID
      const assistantMsg: MessageRecord = {
        id: newMessageId(),
        sessionId: this.session.id,
        role: 'assistant',
        content: assistantText,
        createdAt: new Date().toISOString(),
        toolCalls: toolCalls.map((tc) => ({id: tc.id, name: tc.name, arguments: tc.arguments}))
      };
      this.session.messages.push(assistantMsg);

      if (toolCalls.length === 0) {
        if (!assistantText.trim()) this.showEmptyResponseHelp();
        break;
      }

      showThinkingStep('selecting-tools');
      for (const call of toolCalls) {
        showToolDecision(call.name);
        await this.executeTool(call);
      }
      showThinkingStep('verifying');
      await saveSession(this.session);
    }
    showThinkingStep('summarizing');
    this.markPlanComplete();
    await saveSession(this.session);

    // Print status bar after each response
    printSessionStatusBar(this.session, this.modelName(), this.config.permission);
  }

  private async executeTool(call: ToolCall): Promise<void> {
    const startMs = Date.now();
    printToolStart(call.name, call.arguments);
    const context: ToolContext = {
      workspace: this.workspace,
      permission: this.config.permission,
      rules: this.rules,
      log: (message) => process.stdout.write(message.endsWith('\n') ? message : `${message}\n`),
      askPermission
    };
    const result = await this.registry.execute(call.name, call.arguments, context);
    const durationMs = Date.now() - startMs;

    // Record tool call with unique ID
    const tcRecord: ToolCallRecord = {
      id: newToolCallId(),
      sessionId: this.session.id,
      name: call.name,
      input: call.arguments,
      output: result.output,
      ok: result.ok,
      durationMs,
      at: new Date().toISOString()
    };
    this.session.toolCalls.push(tcRecord);

    // Add tool result message
    const toolMsg: MessageRecord = {
      id: newMessageId(),
      sessionId: this.session.id,
      role: 'tool',
      content: result.output.slice(0, 12000),
      toolCallId: call.id,
      createdAt: new Date().toISOString()
    };
    this.session.messages.push(toolMsg);

    printToolEnd(call.name, result.ok, durationMs);
    if (!result.ok) printToolError(call.name, result.output);
    if (result.ok && this.config.showToolSummary) panel('Tool', `${call.name}: ${result.output.slice(0, 500)}`);
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shouldEnableTools(request: string): boolean {
  return /\b(file|files|repo|repository|workspace|code|edit|fix|refactor|run|command|shell|test|build|lint|typecheck|git|diff|commit|read|search|find|create|write|delete|install)\b/i.test(request);
}

function isModelUnavailableError(message: string): boolean {
  return /model.*not.*found|model.*unavailable|does not exist|invalid model|no such model/i.test(message);
}

/** Upgrade a legacy SessionRecord to the new Session type. */
function upgradeSession(session: Session | SessionRecord, providerId: string, modelId: string): Session {
  const s = session as any;
  // Check if already a proper Session (has message IDs)
  if (s.messages?.length && typeof s.messages[0]?.id === 'string' && s.messages[0].id.startsWith('msg_')) {
    return s as Session;
  }
  const now = new Date().toISOString();
  const messages: MessageRecord[] = (s.messages ?? []).map((m: any) => ({
    id: newMessageId(),
    sessionId: s.id,
    role: m.role,
    content: m.content,
    toolCallId: m.toolCallId,
    toolCalls: m.toolCalls,
    createdAt: now
  }));
  const toolCalls: ToolCallRecord[] = (s.toolLog ?? []).map((tc: any) => ({
    id: newToolCallId(),
    sessionId: s.id,
    name: tc.name,
    input: tc.input,
    output: tc.output,
    ok: tc.ok,
    at: tc.at ?? now
  }));
  return {
    id: s.id,
    title: s.title ?? 'New Chat',
    workspace: s.workspace,
    providerId,
    modelId,
    createdAt: s.createdAt ?? now,
    updatedAt: s.updatedAt ?? now,
    status: 'active',
    messages,
    todos: s.todos ?? [],
    toolCalls,
    edits: s.edits ?? [],
    plan: s.plan ?? []
  };
}
