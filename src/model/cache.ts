/**
 * Model list cache — persists fetched model IDs per provider to disk.
 * Location: ~/.opensyntax/cache/models/<providerId>.json
 * TTL: 1 hour (refreshed on auth, provider switch, or /models refresh)
 */

import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {configDir} from '../config/config.js';
import {ensureDir} from '../utils/paths.js';

const CACHE_DIR = path.join(configDir, 'cache', 'models');
const TTL_MS = 60 * 60 * 1000; // 1 hour

type ModelCacheEntry = {
  providerId: string;
  models: string[];
  fetchedAt: string; // ISO timestamp
};

function cachePath(providerId: string): string {
  return path.join(CACHE_DIR, `${providerId}.json`);
}

/** Load cached model list for a provider. Returns undefined if missing or expired. */
export async function loadCachedModels(providerId: string): Promise<string[] | undefined> {
  try {
    const raw = await readFile(cachePath(providerId), 'utf8');
    const entry = JSON.parse(raw) as ModelCacheEntry;
    const age = Date.now() - new Date(entry.fetchedAt).getTime();
    if (age > TTL_MS) return undefined; // expired
    return entry.models;
  } catch {
    return undefined;
  }
}

/** Save a fetched model list to the cache. */
export async function saveCachedModels(providerId: string, models: string[]): Promise<void> {
  await ensureDir(CACHE_DIR);
  const entry: ModelCacheEntry = {
    providerId,
    models,
    fetchedAt: new Date().toISOString()
  };
  await writeFile(cachePath(providerId), `${JSON.stringify(entry, null, 2)}\n`, 'utf8');
}

/** Invalidate (delete) the cache for a provider. */
export async function invalidateModelCache(providerId: string): Promise<void> {
  try {
    const {unlink} = await import('node:fs/promises');
    await unlink(cachePath(providerId));
  } catch {
    // Already gone — fine
  }
}

/** Check whether a fresh cache exists for a provider. */
export async function hasFreshCache(providerId: string): Promise<boolean> {
  const models = await loadCachedModels(providerId);
  return models !== undefined && models.length > 0;
}
