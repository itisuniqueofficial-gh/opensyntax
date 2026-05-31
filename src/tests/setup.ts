/**
 * Global test setup.
 *
 * Isolates every test run from the real user config directory by pointing
 * OPENSYNTAX_CONFIG_DIR at a throwaway temp directory. This prevents tests
 * from reading or writing ~/.opensyntax (config, sessions, model cache,
 * credentials) and removes cross-file races on the shared model cache.
 *
 * Set before any source module that captures `configDir` is imported.
 */
import {mkdtempSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';

if (!process.env.OPENSYNTAX_CONFIG_DIR) {
  process.env.OPENSYNTAX_CONFIG_DIR = mkdtempSync(path.join(os.tmpdir(), 'opensyntax-test-'));
}
