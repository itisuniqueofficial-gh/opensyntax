import {saveSession} from '../session/store.js';
import type {Session} from '../session/types.js';
import {progressWarn} from '../ui/progress.js';

export class InterruptController {
  private controller = new AbortController();

  get signal(): AbortSignal {
    return this.controller.signal;
  }

  reset(): AbortSignal {
    if (this.controller.signal.aborted) this.controller = new AbortController();
    return this.controller.signal;
  }

  async interrupt(session?: Session): Promise<void> {
    if (!this.controller.signal.aborted) this.controller.abort();
    if (session) await saveSession(session).catch(() => undefined);
    progressWarn('Interrupted by user. Partial progress saved.');
  }
}

export const globalInterrupt = new InterruptController();
