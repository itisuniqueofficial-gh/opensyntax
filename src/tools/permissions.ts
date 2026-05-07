/**
 * Permission system for file and folder operations.
 *
 * Levels:
 *   read-only        — no writes at all
 *   workspace-write  — create/edit files inside workspace; no shell; no deletes without approval
 *   shell-safe       — workspace-write + safe shell commands
 *   full-access      — all operations; risky ones still prompt
 */

import type {PermissionLevel} from './types.js';

export type OperationType =
  | 'read'
  | 'create-file'
  | 'write-file'
  | 'patch-file'
  | 'delete-file'
  | 'rename-file'
  | 'copy-file'
  | 'move-file'
  | 'create-folder'
  | 'delete-folder'
  | 'copy-folder'
  | 'move-folder'
  | 'rename-folder'
  | 'shell';

export type PermissionDecision = {
  allowed: boolean;
  requiresApproval: boolean;
  reason?: string;
};

/** Determine whether an operation is allowed under the current permission level. */
export function checkPermission(level: PermissionLevel, operation: OperationType): PermissionDecision {
  switch (level) {
    case 'read-only':
      if (operation === 'read') return {allowed: true, requiresApproval: false};
      return {allowed: false, requiresApproval: false, reason: `Current permission level is read-only; ${operation} is not allowed`};

    case 'workspace-write':
      if (operation === 'shell') return {allowed: false, requiresApproval: false, reason: 'Shell execution requires shell-safe or full-access permission'};
      if (operation === 'delete-file' || operation === 'delete-folder') return {allowed: true, requiresApproval: true, reason: 'Delete operations require approval'};
      return {allowed: true, requiresApproval: false};

    case 'shell-safe':
      if (operation === 'delete-file' || operation === 'delete-folder') return {allowed: true, requiresApproval: true, reason: 'Delete operations require approval'};
      return {allowed: true, requiresApproval: false};

    case 'full-access':
      // Deletes still require approval even in full-access
      if (operation === 'delete-file' || operation === 'delete-folder') return {allowed: true, requiresApproval: true, reason: 'Delete operations require approval'};
      return {allowed: true, requiresApproval: false};

    default:
      return {allowed: false, requiresApproval: false, reason: `Unknown permission level: ${level}`};
  }
}

/** Throw if the operation is not allowed. */
export function requirePermission(level: PermissionLevel, operation: OperationType): void {
  const decision = checkPermission(level, operation);
  if (!decision.allowed) throw new Error(decision.reason ?? `Operation not allowed: ${operation}`);
}

/** Check if the permission level allows any writes. */
export function canWrite(level: PermissionLevel): boolean {
  return level !== 'read-only';
}

/** Check if the permission level allows shell execution. */
export function canShell(level: PermissionLevel): boolean {
  return level === 'shell-safe' || level === 'full-access';
}
