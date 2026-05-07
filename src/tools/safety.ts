/**
 * File and folder safety checks.
 * Centralises path validation, dangerous-operation detection, and approval logic.
 */

import path from 'node:path';
import {stat, readdir} from 'node:fs/promises';
import {relativePath} from '../utils/paths.js';

// ---------------------------------------------------------------------------
// Dangerous path patterns — always blocked unless explicit confirmation
// ---------------------------------------------------------------------------

const ALWAYS_BLOCKED_PATTERNS = [
  /^\.git(\/|\\|$)/,          // .git directory
  /^node_modules(\/|\\|$)/,   // node_modules
  /^\.(env|env\..+)$/i,       // .env files (handled separately as "require approval")
];

const SYSTEM_ROOTS = [
  '/',
  'C:\\',
  'C:/',
  process.env.HOME ?? '',
  process.env.USERPROFILE ?? ''
].filter(Boolean);

/** Check if a path is a system root or home directory. */
export function isSystemRoot(absolutePath: string): boolean {
  const normalized = absolutePath.replace(/\\/g, '/').replace(/\/$/, '');
  return SYSTEM_ROOTS.some((root) => {
    const normalizedRoot = root.replace(/\\/g, '/').replace(/\/$/, '');
    return normalizedRoot && normalized === normalizedRoot;
  });
}

/** Check if a path is always blocked (git, node_modules). */
export function isAlwaysBlocked(workspaceRoot: string, absolutePath: string): {blocked: boolean; reason?: string} {
  const relative = relativePath(workspaceRoot, absolutePath).replaceAll('\\', '/');
  for (const pattern of ALWAYS_BLOCKED_PATTERNS) {
    if (pattern.test(relative)) {
      return {blocked: true, reason: `Path is protected: ${relative}`};
    }
  }
  if (isSystemRoot(absolutePath)) {
    return {blocked: true, reason: `Refusing to operate on system root: ${absolutePath}`};
  }
  return {blocked: false};
}

// ---------------------------------------------------------------------------
// Approval-required patterns
// ---------------------------------------------------------------------------

/** Check if a file path requires explicit approval before write/delete. */
export function requiresApproval(workspaceRoot: string, absolutePath: string): {required: boolean; reason?: string} {
  const relative = relativePath(workspaceRoot, absolutePath).replaceAll('\\', '/');
  const basename = path.basename(absolutePath);

  if (/^\.env(\..+)?$/i.test(basename)) return {required: true, reason: 'Modifying environment files can expose secrets'};
  if (/^(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb)$/.test(basename)) return {required: true, reason: 'Modifying lockfiles can break reproducible installs'};
  if (/^(\.github|\.circleci|\.gitlab-ci\.yml)/.test(relative)) return {required: true, reason: 'Modifying CI/CD configuration'};
  if (/secrets?|credentials?|private[-_]key/i.test(basename)) return {required: true, reason: 'File name suggests sensitive content'};

  return {required: false};
}

// ---------------------------------------------------------------------------
// Folder size estimation
// ---------------------------------------------------------------------------

export type FolderInfo = {
  path: string;
  fileCount: number;
  sizeBytes?: number;
};

/** Estimate folder file count (non-recursive for speed; capped at 500). */
export async function estimateFolderInfo(absolutePath: string): Promise<FolderInfo> {
  try {
    const entries = await readdir(absolutePath, {withFileTypes: true, recursive: false});
    return {path: absolutePath, fileCount: entries.length};
  } catch {
    return {path: absolutePath, fileCount: 0};
  }
}

// ---------------------------------------------------------------------------
// Windows path normalisation
// ---------------------------------------------------------------------------

/** Normalise a path for safe comparison on Windows and POSIX. */
export function normalizePath(value: string): string {
  return path.normalize(value).replaceAll('\\', '/');
}

/** Detect Windows-style absolute paths. */
export function isWindowsAbsolute(value: string): boolean {
  return /^[a-zA-Z]:[\\/]/.test(value);
}

/** Resolve a path safely, handling both Windows and POSIX separators. */
export function safeResolve(root: string, target: string): string {
  // Normalise separators before resolving
  const normalizedRoot = root.replaceAll('\\', '/');
  const normalizedTarget = target.replaceAll('\\', '/');
  const resolved = path.resolve(normalizedRoot, normalizedTarget);
  const relative = path.relative(normalizedRoot, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Path escapes workspace: ${target}`);
  }
  return resolved;
}

// ---------------------------------------------------------------------------
// Approval message builders
// ---------------------------------------------------------------------------

/** Build a human-readable approval prompt for a file delete. */
export function buildFileDeletePrompt(workspaceRoot: string, absolutePath: string): string {
  const relative = relativePath(workspaceRoot, absolutePath).replaceAll('\\', '/');
  return [
    'OpenSyntax wants to delete:',
    `  ${relative}`,
    '',
    'Reason: Requested by user.',
    'This action cannot be automatically undone.'
  ].join('\n');
}

/** Build a human-readable approval prompt for a folder delete. */
export async function buildFolderDeletePrompt(workspaceRoot: string, absolutePath: string): Promise<string> {
  const relative = relativePath(workspaceRoot, absolutePath).replaceAll('\\', '/');
  const info = await estimateFolderInfo(absolutePath);
  return [
    'OpenSyntax wants to delete folder:',
    `  ${relative}`,
    `  ~${info.fileCount} direct entries`,
    '',
    'WARNING: This will recursively delete all contents.',
    'Reason: Requested by user.',
    '',
    `To confirm, type: delete ${relative}`
  ].join('\n');
}

/** Check if a stat result indicates the path exists. */
export async function pathExists(absolutePath: string): Promise<boolean> {
  try {
    await stat(absolutePath);
    return true;
  } catch {
    return false;
  }
}
