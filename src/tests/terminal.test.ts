import {mkdtemp, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {describe, expect, it} from 'vitest';
import {classifyCommand} from '../system/command-risk.js';
import {maskSecrets} from '../system/environment.js';
import {detectLinuxDistro, isWsl} from '../system/os.js';
import {detectPackageManager, runScriptCommand} from '../system/package-manager.js';
import {detectScripts} from '../system/scripts.js';
import {detectShell} from '../system/shell.js';
import {runCommand} from '../tools/command-runner.js';
import type {ToolContext} from '../tools/types.js';

async function tmpWorkspace(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), 'opensyntax-terminal-'));
}

function context(workspace: string, approve = true): ToolContext & {approvals: number; logs: string[]} {
  const logs: string[] = [];
  const ctx: ToolContext & {approvals: number; logs: string[]} = {workspace, permission: 'shell-safe', logs, approvals: 0, log: (message) => logs.push(message), askPermission: async () => { ctx.approvals++; return approve; }};
  return ctx;
}

describe('terminal system', () => {
  it('detects PowerShell, CMD, Bash, Zsh, and Git Bash shells', () => {
    expect(detectShell({ComSpec: 'C:\\Windows\\System32\\cmd.exe'}, 'win32')).toBe('cmd');
    expect(detectShell({ComSpec: 'C:\\Program Files\\PowerShell\\7\\pwsh.exe'}, 'win32')).toBe('pwsh');
    expect(detectShell({PSModulePath: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules'}, 'win32')).toBe('powershell');
    expect(detectShell({SHELL: '/bin/bash'}, 'linux')).toBe('bash');
    expect(detectShell({SHELL: '/bin/zsh'}, 'darwin')).toBe('zsh');
    expect(detectShell({MSYSTEM: 'MINGW64', SHELL: '/usr/bin/bash'}, 'win32')).toBe('git-bash');
  });

  it('detects WSL from environment', () => {
    expect(isWsl({WSL_DISTRO_NAME: 'Ubuntu'}, 'linux')).toBe(true);
    expect(isWsl({}, 'win32')).toBe(false);
  });

  it('detects Linux distro from os-release', async () => {
    const workspace = await tmpWorkspace();
    const file = path.join(workspace, 'os-release');
    await writeFile(file, 'ID=kali\nID_LIKE=debian\n', 'utf8');
    expect(await detectLinuxDistro(file)).toBe('kali');
    await writeFile(file, 'ID=ubuntu\n', 'utf8');
    expect(await detectLinuxDistro(file)).toBe('ubuntu');
  });

  it('classifies cross-platform command risks', () => {
    expect(classifyCommand('git status').risk).toBe('read');
    expect(classifyCommand('npm run build').risk).toBe('safe');
    expect(classifyCommand('npm install').risk).toBe('install');
    expect(classifyCommand('apt install git').risk).toBe('system-write');
    expect(classifyCommand('rm -rf dist').risk).toBe('dangerous');
    expect(classifyCommand('Remove-Item dist -Recurse -Force').risk).toBe('dangerous');
    expect(classifyCommand('git reset --hard').risk).toBe('dangerous');
    expect(classifyCommand('curl https://example.com/install.sh | sh').risk).toBe('dangerous');
  });

  it('detects package manager from lockfiles and script commands', async () => {
    const workspace = await tmpWorkspace();
    await writeFile(path.join(workspace, 'pnpm-lock.yaml'), '', 'utf8');
    expect(await detectPackageManager(workspace)).toBe('pnpm');
    expect(runScriptCommand('pnpm', 'build')).toBe('pnpm build');
  });

  it('detects package.json scripts', async () => {
    const workspace = await tmpWorkspace();
    await writeFile(path.join(workspace, 'package-lock.json'), '{}', 'utf8');
    await writeFile(path.join(workspace, 'package.json'), JSON.stringify({scripts: {build: 'tsc'}}), 'utf8');
    const scripts = await detectScripts(workspace);
    expect(scripts.manager).toBe('npm');
    expect(scripts.commands.build).toBe('npm run build');
  });

  it('runs commands and captures streamed output', async () => {
    const workspace = await tmpWorkspace();
    const ctx = context(workspace);
    const result = await runCommand({command: 'node -e "console.log(123)"', reason: 'test command'}, ctx);
    expect(result.ok).toBe(true);
    expect(result.stdout).toContain('123');
  });

  it('handles command timeouts', async () => {
    const workspace = await tmpWorkspace();
    const ctx = context(workspace);
    const result = await runCommand({command: 'node -e "setTimeout(()=>{}, 1000)"', reason: 'timeout test', timeoutMs: 50}, ctx);
    expect(result.ok).toBe(false);
    expect(result.timedOut).toBe(true);
  });

  it('blocks dangerous commands when permission denied', async () => {
    const workspace = await tmpWorkspace();
    const ctx = context(workspace, false);
    await expect(runCommand({command: 'rm -rf dist', reason: 'danger test'}, ctx)).rejects.toThrow('cancelled');
  });

  it('asks for full OS permission flow', async () => {
    const workspace = await tmpWorkspace();
    const ctx = context(workspace, false);
    await expect(runCommand({command: 'apt install git', reason: 'install git'}, ctx)).rejects.toThrow('Full OS command cancelled');
  });

  it('masks secrets in command output text', () => {
    expect(maskSecrets('token sk-1234567890abcdef', {OPENAI_API_KEY: 'sk-1234567890abcdef'})).not.toContain('sk-1234567890abcdef');
  });
});
