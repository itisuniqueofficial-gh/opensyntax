import path from 'node:path';

export type ShellKind = 'cmd' | 'powershell' | 'pwsh' | 'bash' | 'zsh' | 'fish' | 'git-bash' | 'unknown';

export function detectShell(env: NodeJS.ProcessEnv = process.env, platform = process.platform): ShellKind {
  const shell = (env.SHELL ?? '').toLowerCase();
  const comspec = (env.ComSpec ?? env.COMSPEC ?? '').toLowerCase();
  const termProgram = (env.TERM_PROGRAM ?? '').toLowerCase();
  const msystem = (env.MSYSTEM ?? '').toLowerCase();
  const psModulePath = env.PSModulePath ?? env.PSMODULEPATH;
  if (msystem || shell.includes('git') && shell.includes('bash')) return 'git-bash';
  if (shell.endsWith('/zsh') || shell.includes('zsh')) return 'zsh';
  if (shell.endsWith('/fish') || shell.includes('fish')) return 'fish';
  if (shell.endsWith('/bash') || shell.includes('bash')) return 'bash';
  if (platform === 'win32') {
    if (termProgram.includes('powershell') || (psModulePath && !comspec.includes('cmd.exe'))) return 'powershell';
    if (comspec.includes('powershell.exe')) return 'powershell';
    if (comspec.includes('pwsh.exe')) return 'pwsh';
    if (comspec.includes('cmd.exe') || path.basename(comspec) === 'cmd') return 'cmd';
  }
  return 'unknown';
}
