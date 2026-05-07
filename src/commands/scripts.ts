import {detectScripts} from '../system/scripts.js';

export async function renderScripts(workspace: string): Promise<string> {
  try {
    const {manager, scripts, commands} = await detectScripts(workspace);
    const rows = Object.entries(scripts).map(([name, script]) => `${name}\n  script: ${script}\n  run: ${commands[name]}`);
    return rows.length ? `Package manager: ${manager}\n\n${rows.join('\n\n')}` : 'No package.json scripts found.';
  } catch {
    return 'No package.json found.';
  }
}

export async function commandForScript(workspace: string, script: string): Promise<string> {
  const {commands} = await detectScripts(workspace);
  const command = commands[script];
  if (!command) throw new Error(`Unknown package script: ${script}`);
  return command;
}
