import {loadConfig, saveConfig} from '../config/config.js';

const MODES = ['read-only', 'workspace-safe', 'workspace-write', 'shell-safe', 'full-os', 'danger'] as const;

export async function renderPermissions(next?: string): Promise<string> {
  const config = await loadConfig();
  if (!next) return [`Current permission: ${config.permission}`, `Shell mode: ${config.shellMode}`, `Command timeout: ${config.commandTimeoutMs}ms`, `Available: ${MODES.join(', ')}`].join('\n');
  if (!MODES.includes(next as any) && next !== 'full-access') return `Unknown permission mode: ${next}`;
  const permission = next === 'full-access' ? 'full-os' : next;
  await saveConfig({...config, permission: permission as any, shellMode: permission as any});
  return `Permission mode set to ${permission}`;
}
