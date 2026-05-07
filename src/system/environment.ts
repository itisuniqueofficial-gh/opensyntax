import {detectOS, type OSInfo} from './os.js';

const SECRET_NAME = /(api[_-]?key|token|secret|password|credential|private[_-]?key)/i;

export type EnvironmentInfo = OSInfo & {
  node: string;
  npmUserAgent?: string;
  ci: boolean;
};

export async function detectEnvironment(): Promise<EnvironmentInfo> {
  return {...await detectOS(), node: process.version, npmUserAgent: process.env.npm_config_user_agent, ci: process.env.CI === 'true'};
}

export function maskSecrets(text: string, env: NodeJS.ProcessEnv = process.env): string {
  let masked = text;
  for (const [key, value] of Object.entries(env)) {
    if (!value || value.length < 6) continue;
    if (SECRET_NAME.test(key)) masked = masked.split(value).join(maskValue(value));
  }
  masked = masked.replace(/\b(?:sk|nvapi|ghp|github_pat|xoxb|AKIA)[A-Za-z0-9_\-]{12,}\b/g, '[secret]');
  return masked;
}

function maskValue(value: string): string {
  return `${value.slice(0, 2)}…${value.slice(-2)}`;
}
