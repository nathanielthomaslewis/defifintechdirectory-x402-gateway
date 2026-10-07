import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

test('factory scaffolds disabled capability, validates and refuses overwrite or traversal', () => {
  const directory = mkdtempSync(join(tmpdir(), 'gateway-factory-'));
  const script = resolve('scripts/factory.mjs');
  const run = args => spawnSync(process.execPath, [script, ...args], { cwd: directory, encoding: 'utf8', timeout: 15000 });
  try {
    const result = run(['new', '--id', 'example_utility', '--price', '0.002']);
    assert.equal(result.status, 0, result.stderr);
    const manifest = readFileSync(join(directory, 'generated/capabilities/example_utility/manifest.ts'), 'utf8');
    assert.match(manifest, /"status": "disabled"/);
    assert.match(manifest, /"atomic": "2000"/);
    const validate = run(['validate']);
    assert.equal(validate.status, 0, validate.stderr);
    assert.match(validate.stdout, /Validated 13 manifests; 0 public/);
    assert.notEqual(run(['new', '--id', 'example_utility']).status, 0);
    assert.notEqual(run(['new', '--id', '../escape']).status, 0);
    assert.equal(run(['discovery']).status, 0);
    assert.deepEqual(JSON.parse(readFileSync(join(directory, 'generated/discovery.json'))).capabilities, []);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
