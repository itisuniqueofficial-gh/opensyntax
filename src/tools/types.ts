import {z} from 'zod';
import type {ToolSpec} from '../model/types.js';
import type {RuleContext} from '../rules/types.js';

export type PermissionLevel = 'read-only' | 'workspace-write' | 'shell-safe' | 'full-access';

export type ToolContext = {
  workspace: string;
  permission: PermissionLevel;
  signal?: AbortSignal;
  rules?: RuleContext;
  log: (message: string) => void;
  askPermission: (request: PermissionRequest) => Promise<boolean>;
};

export type PermissionRequest = {
  action: string;
  reason: string;
  risk: 'low' | 'medium' | 'high';
};

export type ToolResult = {
  ok: boolean;
  output: string;
  data?: unknown;
};

export type Tool<I = unknown> = ToolSpec & {
  schema: z.ZodType<I>;
  execute(input: I, context: ToolContext): Promise<ToolResult>;
};

export function tool<I>(definition: Tool<I>): Tool<I> {
  return definition;
}
