import type {ChatMessage} from '../model/types.js';

export type TaskState = 'pending' | 'in_progress' | 'completed' | 'failed';
export type PlanItem = {id: string; content: string; state: TaskState};
export type SessionRecord = {
  id: string;
  workspace: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  plan: PlanItem[];
  toolLog: Array<{at: string; name: string; input: unknown; output: string; ok: boolean}>;
};

export function createSession(workspace: string): SessionRecord {
  const now = new Date().toISOString();
  return {id: now.replace(/[:.]/g, '-'), workspace, createdAt: now, updatedAt: now, messages: [], plan: [], toolLog: []};
}
