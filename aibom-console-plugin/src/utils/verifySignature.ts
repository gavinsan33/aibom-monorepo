import { ed25519 } from '@noble/curves/ed25519.js';
import type { AIBOMResource } from '../types/aibom';

/**
 * Port of `oc-aibom`'s `internal/aibom/verify.go` (see aibom-webhook-service's
 * CLAUDE.md, "Compiled AIBOM Signing"). `valid` is the only status that may be
 * shown as "verified": the signature matches `spec.data` AND the embedded key
 * equals the one the cluster publishes.
 */
export type VerifyStatus = 'unsigned' | 'valid' | 'invalid' | 'key-mismatch' | 'unconfirmed';

export interface VerifyResult {
  status: VerifyStatus;
  detail: string;
}

/** Cluster-side anchor: the `aibom-compiled-signing-public-key` ConfigMap's `ed25519-public-key`. */
export const SIGNING_KEY_CONFIGMAP = 'aibom-compiled-signing-public-key';
export const SIGNING_KEY_DATA_KEY = 'ed25519-public-key';

const ED25519_PUBLIC_KEY_BYTES = 32;
const BASE64_RE = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

function decodeBase64(text: string): Uint8Array | undefined {
  if (!BASE64_RE.test(text)) return undefined;
  try {
    return Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
  } catch {
    return undefined;
  }
}

/**
 * RFC 8785 (JCS) canonical JSON. Sound in JS because JCS defines primitives via
 * ECMAScript's own `JSON.stringify`/number formatting, and object keys sort by
 * UTF-16 code unit, which is the default `Array.prototype.sort` order. Input is
 * parsed JSON, so there are no NaN/Infinity/undefined values to reject.
 */
export function canonicalize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

/**
 * Checks `spec.signature` over the canonicalized `spec.data` under
 * `spec.signaturePublicKey`, then cross-checks that key against the cluster
 * anchor. `clusterKey` is the anchor's value, or undefined when it couldn't be
 * read (no grant, no ConfigMap, request failed) -- the result is then capped at
 * `unconfirmed`, since a forger who controls `data` could embed their own key.
 * Never throws.
 */
export function verifySignature(
  spec: AIBOMResource['spec'],
  clusterKey: string | undefined,
): VerifyResult {
  if (!spec?.signature || !spec.signaturePublicKey) {
    return { status: 'unsigned', detail: 'no signature present' };
  }
  const invalid = (detail: string): VerifyResult => ({ status: 'invalid', detail });

  const signature = decodeBase64(spec.signature);
  if (!signature) return invalid('signature is not valid base64');
  const publicKey = decodeBase64(spec.signaturePublicKey);
  if (!publicKey) return invalid('signaturePublicKey is not valid base64');
  if (publicKey.length !== ED25519_PUBLIC_KEY_BYTES) {
    return invalid(
      `signaturePublicKey is ${String(publicKey.length)} bytes, want ${String(ED25519_PUBLIC_KEY_BYTES)}`,
    );
  }
  // spec.data is unvalidated in the cluster, so don't trust its declared type.
  const specData: unknown = spec.data;
  if (typeof specData !== 'object' || specData === null) {
    return invalid('spec.data is missing, so there is nothing the signature could cover');
  }

  let matches = false;
  try {
    matches = ed25519.verify(
      signature,
      new TextEncoder().encode(canonicalize(specData)),
      publicKey,
    );
  } catch {
    matches = false;
  }
  if (!matches) {
    return invalid(
      'signature does not match spec.data under the embedded public key -- data was altered after signing, or the signature/key is corrupt',
    );
  }

  if (clusterKey === undefined) {
    return {
      status: 'unconfirmed',
      detail: `signature is internally consistent, but the cluster's ${SIGNING_KEY_CONFIGMAP} ConfigMap could not be read to confirm the signing key`,
    };
  }
  if (clusterKey !== spec.signaturePublicKey) {
    return {
      status: 'key-mismatch',
      detail:
        "signature is valid, but the embedded public key does not match the cluster's published key -- possible key rotation, or a forged signature paired with its own key",
    };
  }
  return {
    status: 'valid',
    detail:
      "signature matches spec.data, and the signing key matches the cluster's published anchor",
  };
}
