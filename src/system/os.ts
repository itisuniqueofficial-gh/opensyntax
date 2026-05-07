import {readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {detectShell, type ShellKind} from './shell.js';

export type OSPlatform = 'windows' | 'macos' | 'linux' | 'wsl' | 'unknown';
export type LinuxDistro = 'ubuntu' | 'debian' | 'kali' | 'arch' | 'fedora' | 'centos' | 'alpine' | 'unknown';

export type OSInfo = {
  platform: OSPlatform;
  distro?: LinuxDistro;
  shell: ShellKind;
  isWSL: boolean;
  cwd: string;
  home: string;
  pathSeparator: string;
};

export async function detectOS(env: NodeJS.ProcessEnv = process.env, platform = process.platform): Promise<OSInfo> {
  const isWSL = isWsl(env, platform);
  const distro = platform === 'linux' || isWSL ? await detectLinuxDistro() : undefined;
  return {
    platform: isWSL ? 'wsl' : platform === 'win32' ? 'windows' : platform === 'darwin' ? 'macos' : platform === 'linux' ? 'linux' : 'unknown',
    distro,
    shell: detectShell(env, platform),
    isWSL,
    cwd: process.cwd(),
    home: os.homedir(),
    pathSeparator: path.sep
  };
}

export function isWsl(env: NodeJS.ProcessEnv = process.env, platform = process.platform): boolean {
  if (platform !== 'linux') return false;
  if (env.WSL_DISTRO_NAME || env.WSL_INTEROP) return true;
  return /microsoft/i.test(os.release());
}

export async function detectLinuxDistro(osReleasePath = '/etc/os-release'): Promise<LinuxDistro> {
  let text = '';
  try { text = await readFile(osReleasePath, 'utf8'); } catch { return 'unknown'; }
  const id = /^ID=(.+)$/m.exec(text)?.[1]?.replaceAll('"', '').toLowerCase() ?? '';
  const like = /^ID_LIKE=(.+)$/m.exec(text)?.[1]?.replaceAll('"', '').toLowerCase() ?? '';
  const haystack = `${id} ${like}`;
  if (haystack.includes('ubuntu')) return 'ubuntu';
  if (haystack.includes('kali')) return 'kali';
  if (haystack.includes('debian')) return 'debian';
  if (haystack.includes('arch')) return 'arch';
  if (haystack.includes('fedora')) return 'fedora';
  if (haystack.includes('centos') || haystack.includes('rhel')) return 'centos';
  if (haystack.includes('alpine')) return 'alpine';
  return 'unknown';
}
