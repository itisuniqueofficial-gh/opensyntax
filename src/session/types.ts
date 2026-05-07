/**
 * Advanced session data model with unique IDs for every entity.
 */

import type {ChatMessage} from '../model/types.js';
import type {TaskState, PlanItem} from './history.js';

export type {TaskState, PlanItem};

export type MessageRecord = {
  id: string;
  sessionId: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  createdAt: string;
  toolCallId?: string;
  toolCalls?: Array<{id: string; name: string; arguments: unknown}>;
};

export type ToolCallRecord = {
  id: string;
  sessionId: string;
  name: string;
  input: unknown;
  output: string;
  ok: boolean;
  durationMs?: number;
  at: string;
};

export type EditRecord = {
  id: string;
  sessionId: string;
  path: string;
  diff: string;
  at: string;
};

export type TodoItem = {
  id: string;
  content: string;
  state: TaskState;
};

export type Session = {
  id: string;
  title: string;
  workspace: string;
  providerId: string;
  modelId: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'archived';
  messages: MessageRecord[];
  todos: TodoItem[];
  toolCalls: ToolCallRecord[];
  edits: EditRecord[];
  plan: PlanItem[];
  contextSummary?: string;
};

/** Convert a Session's messages to the ChatMessage format used by providers. */
export function sessionToChatMessages(session: Session): ChatMessage[] {
  return session.messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role as ChatMessage['role'],
      content: m.content,
      toolCallId: m.toolCallId,
      toolCalls: m.toolCalls
    }));
}
