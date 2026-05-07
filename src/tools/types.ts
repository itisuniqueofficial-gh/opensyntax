import {z} from 'zod';
import type {ToolSpec} from '../model/types.js';
import type {RuleContext} from '../rules/types.js';

export type PermissionLevel = 'read-only' | 'workspace-safe' | 'workspace-write' | 'shell-safe' | 'full-access' | 'full-os' | 'danger';

export type ToolContext = {
  workspace: string;
  permission: PermissionLevel;
  signal?: AbortSignal;
  rules?: RuleContext;
  log: (message: string) => void;
  askPermission: (request: PermissionRequest) => Promise<boolean>;
};

export type PermissionRequest = {
  tool?: string;
  path?: string;
  action: string;
  reason: string;
  risk: 'low' | 'medium' | 'high';
  confirmationText?: string;
};

export type ToolResult = {
  ok: boolean;
  output: string;
  tool?: string;
  path?: string;
  changed?: boolean;
  diff?: string;
  message?: string;
  error?: string;
  warnings?: string[];
  data?: unknown;
};

export type Tool<I = unknown> = ToolSpec & {
  schema: z.ZodType<I>;
  execute(input: I, context: ToolContext): Promise<ToolResult>;
};

export function tool<I>(definition: Tool<I>): Tool<I> {
  return definition;
}
