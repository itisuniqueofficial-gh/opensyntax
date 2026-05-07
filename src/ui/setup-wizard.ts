import {runProviderSetup} from './onboarding.js';
import {panel} from './renderer.js';
import {readyState} from './empty-state.js';
import {loadConfig} from '../config/config.js';

export async function runSetupWizard(providerId?: string): Promise<boolean> {
  panel('Setup Wizard', ['Choose Provider', '→ Choose Login Method', '→ Validate Provider', '→ Select Default Model', '→ Configure Permissions', '→ Create First Session', '→ Ready'].join('\n'));
  const ok = await runProviderSetup(providerId, {skipWelcome: true});
  if (!ok) return false;
  const config = await loadConfig();
  panel('Ready', readyState(config.providerName ?? config.provider, config.model));
  return true;
}
