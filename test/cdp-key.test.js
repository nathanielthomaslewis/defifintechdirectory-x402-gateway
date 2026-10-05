import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign, verify } from 'node:crypto';
import { cdpSigningKey } from '../src/x402.js';

test('CDP Ed25519 secret (base64 seed+public) signs EdDSA', () => {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const jwk = privateKey.export({ format: 'jwk' });
  const secret = Buffer.concat([Buffer.from(jwk.d, 'base64url'), Buffer.from(jwk.x, 'base64url')]).toString('base64');
  const { alg, key } = cdpSigningKey(secret);
  assert.equal(alg, 'EdDSA');
  assert.ok(verify(null, Buffer.from('x'), publicKey, sign(null, Buffer.from('x'), key)));
});

test('CDP EC PEM secret uses ES256 and junk is refused', () => {
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  assert.equal(cdpSigningKey(privateKey.export({ type: 'sec1', format: 'pem' })).alg, 'ES256');
  assert.throws(() => cdpSigningKey('not-a-key'), /cdp_key_unrecognised/);
});
