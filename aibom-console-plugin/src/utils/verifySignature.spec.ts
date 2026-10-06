import { ed25519 } from '@noble/curves/ed25519.js';
import type { AIBOMResource } from '../types/aibom';
import { canonicalize, verifySignature } from './verifySignature';

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...Array.from(bytes)));

const data = {
  model: { name: 'tinyllama-1.1b-chat', quantization: null },
  training: { learning_rate: 2e-5, epochs: 3, random_seed: 42 },
  tags: ['sft', 'lora'],
  dirty: false,
};

const secret = ed25519.utils.randomSecretKey();
const publicKey = b64(ed25519.getPublicKey(secret));
const sign = (d: unknown) => b64(ed25519.sign(new TextEncoder().encode(canonicalize(d)), secret));
const signed = (d: Record<string, unknown> = data): NonNullable<AIBOMResource['spec']> => ({
  data: d,
  signature: sign(data),
  signaturePublicKey: publicKey,
});

describe('canonicalize', () => {
  // Same fixture and expected bytes as aibom-webhook-service's
  // test_sign_aibom_matches_go_jcs_reference_output (produced by Go's gowebpki/jcs).
  it('matches the Go/Python RFC 8785 reference output', () => {
    expect(canonicalize(data)).toBe(
      '{"dirty":false,"model":{"name":"tinyllama-1.1b-chat","quantization":null},' +
        '"tags":["sft","lora"],"training":{"epochs":3,"learning_rate":0.00002,"random_seed":42}}',
    );
  });

  it('is independent of key order and sorts by UTF-16 code unit', () => {
    expect(canonicalize({ b: 1, a: { d: 1, c: [] } })).toBe('{"a":{"c":[],"d":1},"b":1}');
    expect(canonicalize({ é: 1, z: 2, '😀': 3 })).toBe('{"z":2,"é":1,"😀":3}');
  });
});

describe('verifySignature', () => {
  it('reports unsigned when either field is absent', () => {
    expect(verifySignature({ data: data as never }, publicKey).status).toBe('unsigned');
    expect(verifySignature({ data: data as never, signature: 'x' }, publicKey).status).toBe(
      'unsigned',
    );
    expect(verifySignature(undefined, publicKey).status).toBe('unsigned');
  });

  it('is valid only when the signature and the cluster anchor both match', () => {
    expect(verifySignature(signed(), publicKey).status).toBe('valid');
  });

  it('verifies regardless of key order in spec.data', () => {
    const reordered = { dirty: false, tags: data.tags, training: data.training, model: data.model };
    expect(verifySignature(signed(reordered), publicKey).status).toBe('valid');
  });

  it('is invalid when spec.data was altered', () => {
    const tampered = { ...data, dirty: true };
    expect(verifySignature(signed(tampered), publicKey).status).toBe('invalid');
  });

  it('is invalid for a wrong-length key or malformed base64', () => {
    expect(
      verifySignature({ ...signed(), signaturePublicKey: b64(new Uint8Array(16)) }, publicKey)
        .status,
    ).toBe('invalid');
    expect(verifySignature({ ...signed(), signature: '!!!not base64' }, publicKey).status).toBe(
      'invalid',
    );
    expect(verifySignature({ ...signed(), signaturePublicKey: '%%%' }, publicKey).status).toBe(
      'invalid',
    );
  });

  it('is invalid (not throwing) when spec.data is missing', () => {
    expect(verifySignature({ ...signed(), data: undefined }, publicKey).status).toBe('invalid');
  });

  it('is a key mismatch when a self-consistent signature uses a different key than the anchor', () => {
    const other = b64(ed25519.getPublicKey(ed25519.utils.randomSecretKey()));
    expect(verifySignature(signed(), other).status).toBe('key-mismatch');
  });

  it('is capped at unconfirmed when the anchor could not be read', () => {
    expect(verifySignature(signed(), undefined).status).toBe('unconfirmed');
  });
});
