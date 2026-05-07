/**
 * PKCE (Proof Key for Code Exchange) helpers for OAuth 2.0 browser flows.
 * RFC 7636 — prevents authorization code interception attacks.
 */

import {randomBytes, createHash} from 'node:crypto';

export type PkceChallenge = {
  verifier: string;
  challenge: string;
  method: 'S256';
};

/** Generate a cryptographically random PKCE verifier (43–128 chars, URL-safe). */
export function generateVerifier(): string {
  return randomBytes(32).toString('base64url');
}

/** Derive the S256 code challenge from a verifier. */
export function deriveChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

/** Generate a complete PKCE pair. */
export function generatePkce(): PkceChallenge {
  const verifier = generateVerifier();
  return {verifier, challenge: deriveChallenge(verifier), method: 'S256'};
}

/** Generate a random state parameter for CSRF protection. */
export function generateState(): string {
  return randomBytes(16).toString('hex');
}
