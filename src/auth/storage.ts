import {createCipheriv, createDecipheriv, createHash, randomBytes} from 'node:crypto';
import {readFile, writeFile, chmod} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {z} from 'zod';
import {configDir} from '../config/config.js';
import {ensureDir} from '../utils/paths.js';

const credentialSchema = z.object({
  providerId: z.string(),
  authMethod: z.enum(['api-key', 'browser', 'device-code', 'none']),
  encryptedSecret: z.string().optional(),
  baseUrl: z.string().optional(),
  model: z.string(),
  connectedAt: z.string(),
  lastValidatedAt: z.string().optional(),
  models: z.array(z.string()).optional()
});

const providersSchema = z.object({
  version: z.literal(1).default(1),
  defaultProvider: z.string().optional(),
  providers: z.record(credentialSchema).default({})
});

export type ProviderCredential = z.infer<typeof credentialSchema>;
export type ProvidersFile = z.infer<typeof providersSchema>;
export const providersPath = path.join(configDir, 'providers.json');

export async function loadProviders(): Promise<ProvidersFile> {
  try {
    return providersSchema.parse(JSON.parse(await readFile(providersPath, 'utf8')));
  } catch {
    return {version: 1, providers: {}};
  }
}

export async function saveProviders(file: ProvidersFile): Promise<void> {
  await ensureDir(configDir);
  await writeFile(providersPath, `${JSON.stringify(file, null, 2)}\n`, {encoding: 'utf8', mode: 0o600});
  await chmod(providersPath, 0o600).catch(() => undefined);
}

export async function upsertProvider(providerId: string, credential: ProviderCredential, setDefault = true): Promise<void> {
  const file = await loadProviders();
  file.providers[providerId] = credential;
  if (setDefault) file.defaultProvider = providerId;
  await saveProviders(file);
}

export async function removeProvider(providerId: string): Promise<void> {
  const file = await loadProviders();
  delete file.providers[providerId];
  if (file.defaultProvider === providerId) file.defaultProvider = Object.keys(file.providers)[0];
  await saveProviders(file);
}

export function encryptSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', localKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptSecret(value: string): string {
  const data = Buffer.from(value, 'base64');
  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const encrypted = data.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', localKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export function maskSecret(secret?: string): string {
  if (!secret) return 'not set';
  if (secret.length <= 8) return '********';
  return `${secret.slice(0, 4)}${'*'.repeat(Math.min(12, secret.length - 8))}${secret.slice(-4)}`;
}

function localKey(): Buffer {
  const material = `${os.userInfo().username}:${os.homedir()}:opensyntax-local-credentials`;
  return createHash('sha256').update(material).digest();
}
