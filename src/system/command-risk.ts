import path from 'node:path';

export type CommandRisk = 'read' | 'safe' | 'workspace-write' | 'network' | 'install' | 'git-write' | 'system-write' | 'destructive' | 'dangerous';

export type CommandRiskResult = {
  risk: CommandRisk;
  reasons: string[];
  modifies: string[];
  requiresApproval: boolean;
  requiresTypedConfirmation: boolean;
  fullOsRequired: boolean;
};

const READ_PATTERNS = [/^\s*(pwd|cd\s*$|ls\b|dir\b|cat\b|type\b|Get-ChildItem\b|Get-Content\b|git\s+(status|diff|log)\b|node\s+--version|npm\s+--version|pnpm\s+--version|yarn\s+--version|bun\s+--version)/i];
const SAFE_PATTERNS = [/\b(npm|pnpm|yarn|bun)\s+(run\s+)?(test|build|lint|typecheck|check)\b/i, /\b(tsc|vitest|jest|mocha|pytest|cargo\s+test|go\s+test)\b/i];
const INSTALL_PATTERNS = [/\b(npm|pnpm|yarn|bun)\s+(install|add|i)\b/i];
const NETWORK_PATTERNS = [/\b(curl|wget|Invoke-WebRequest|iwr|irm|Invoke-RestMethod)\b/i, /\|\s*(sh|bash|iex|Invoke-Expression)\b/i];
const GIT_WRITE_PATTERNS = [/\bgit\s+(add|commit|merge|rebase|checkout|switch|branch|tag|push)\b/i];
const SYSTEM_WRITE_PATTERNS = [/\b(sudo|apt|apt-get|pacman|dnf|yum|brew|winget|choco|scoop|systemctl|service|netsh|setx|reg\s+add|takeown|icacls)\b/i];
const DESTRUCTIVE_PATTERNS = [/\b(del|erase)\b/i, /\bRemove-Item\b/i, /\brm\b/i, /\brmdir\b/i, /\brd\s+\/s\b/i, /\bgit\s+reset\b/i, /\bgit\s+clean\b/i, /\bdocker\s+(system\s+prune|volume\s+rm|container\s+prune|image\s+prune)\b/i];
const DANGEROUS_PATTERNS = [/rm\s+.*-(?:r|f|rf|fr)\b/i, /Remove-Item\b.*(-Recurse|-Force)/i, /\brmdir\b.*\/s/i, /\bgit\s+reset\s+--hard\b/i, /\bgit\s+clean\s+-f/i, /\bgit\s+push\b.*--force/i, /\b(format|diskpart|mkfs|dd)\b/i, /\bchmod\s+-R\s+777\b/i, /\bchown\s+-R\b/i, /\bdocker\s+system\s+prune\b/i, /\b(reg\s+(delete|add)|netsh\s+advfirewall)\b/i, /\b(curl|wget)\b.*\|\s*(sh|bash)/i, /\b(irm|iwr|Invoke-WebRequest)\b.*\|\s*(iex|Invoke-Expression)/i];

export function classifyCommand(command: string, cwd = process.cwd()): CommandRiskResult {
  const normalized = command.trim();
  const reasons: string[] = [];
  const modifies: string[] = [];
  let risk: CommandRisk = 'safe';
  if (READ_PATTERNS.some((pattern) => pattern.test(normalized))) risk = 'read';
  if (SAFE_PATTERNS.some((pattern) => pattern.test(normalized))) risk = maxRisk(risk, 'safe');
  if (/\b(prettier|eslint)\b.*(--write|--fix)/i.test(normalized)) { risk = maxRisk(risk, 'workspace-write'); reasons.push('formatter or fixer may modify workspace files'); }
  if (INSTALL_PATTERNS.some((pattern) => pattern.test(normalized))) { risk = maxRisk(risk, 'install'); reasons.push('package install may modify dependencies and lockfiles'); modifies.push('node_modules', 'lockfiles'); }
  if (NETWORK_PATTERNS.some((pattern) => pattern.test(normalized))) { risk = maxRisk(risk, 'network'); reasons.push('network command or downloaded script detected'); }
  if (GIT_WRITE_PATTERNS.some((pattern) => pattern.test(normalized))) { risk = maxRisk(risk, 'git-write'); reasons.push('git command may modify repository state'); }
  if (SYSTEM_WRITE_PATTERNS.some((pattern) => pattern.test(normalized))) { risk = maxRisk(risk, 'system-write'); reasons.push('command may modify OS-level state'); }
  if (DESTRUCTIVE_PATTERNS.some((pattern) => pattern.test(normalized))) { risk = maxRisk(risk, 'destructive'); reasons.push('destructive command pattern detected'); }
  if (DANGEROUS_PATTERNS.some((pattern) => pattern.test(normalized))) { risk = 'dangerous'; reasons.push('dangerous command pattern detected'); }
  if (targetsRootOrHome(normalized, cwd)) { risk = 'dangerous'; reasons.push('command targets root, home, or workspace root'); }
  return {
    risk,
    reasons: reasons.length ? reasons : [risk === 'read' ? 'read-only command' : 'developer command'],
    modifies,
    requiresApproval: ['workspace-write', 'network', 'install', 'git-write', 'system-write', 'destructive', 'dangerous'].includes(risk),
    requiresTypedConfirmation: risk === 'dangerous',
    fullOsRequired: risk === 'system-write' || risk === 'dangerous'
  };
}

const ORDER: CommandRisk[] = ['read', 'safe', 'workspace-write', 'network', 'install', 'git-write', 'system-write', 'destructive', 'dangerous'];

function maxRisk(a: CommandRisk, b: CommandRisk): CommandRisk {
  return ORDER.indexOf(b) > ORDER.indexOf(a) ? b : a;
}

function targetsRootOrHome(command: string, cwd: string): boolean {
  const home = process.env.USERPROFILE ?? process.env.HOME ?? '';
  const suspicious = [path.parse(cwd).root, home, cwd].filter(Boolean).map((item) => item.replaceAll('\\', '\\\\'));
  return suspicious.some((target) => new RegExp(`(rm|rmdir|rd|del|Remove-Item)\\s+.*${escapeRegExp(target)}(?:\\s|$)`, 'i').test(command));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
