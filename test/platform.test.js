import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EventEmitter } from 'node:events';
import { createRegistry, Registry, usdToAtomic } from '../src/registry.ts';
import { createPipeline } from '../src/pipeline.ts';
import { MemoryLedger, SqliteLedger } from '../src/store.ts';
import { Telemetry, SqliteEventSink } from '../src/telemetry.ts';
import { RateLimiter } from '../src/policy.ts';
import { publicIpv4, resolvePublicUrl, safeGet } from '../src/network.ts';
import { catalog, mcpTools, pluginPackage, externalDiscovery } from '../src/discovery.ts';
import { fixture } from './helpers.js';
import { X3_TOOLS } from '../src/x3-tools.ts';

test('ten implemented local tools, three packs and two placeholders remain noncommercial and unlisted by default', () => {
  const registry = createRegistry();
  const packIds = ['designer_pack', 'marketer_pack', 'game_dev_pack'];
  assert.deepEqual(registry.all().map(entry => entry.id), ['game_launch_kit', 'store_art_prompt_pack', 'ship_gate_audit', 'companion_book_outline', 'stickman_short_script', ...X3_TOOLS.map(tool => tool.id), ...packIds]);
  assert.equal(registry.all().every(entry => !entry.commercial && !entry.discovery.public && !entry.discovery.bazaar && !entry.discovery.plugin), true);
  assert.deepEqual(registry.all().map(entry => entry.status), ['enabled', 'enabled', 'enabled', 'placeholder', 'placeholder', ...X3_TOOLS.map(() => 'enabled'), ...packIds.map(() => 'enabled')]);
  assert.deepEqual(mcpTools(registry).map(entry => entry.name), ['game_launch_kit', 'store_art_prompt_pack', 'ship_gate_audit', ...X3_TOOLS.map(tool => tool.id), ...packIds]);
  assert.deepEqual(catalog(registry, fixture().cfg).capabilities, []);
  assert.deepEqual(pluginPackage(registry, fixture().cfg).tools.map(tool => tool.name), ['game_launch_kit', 'store_art_prompt_pack', 'ship_gate_audit', ...X3_TOOLS.map(tool => tool.id), ...packIds]);
  assert.deepEqual(externalDiscovery(registry, fixture().cfg).resources, []);
  assert.throws(() => new Registry().register({ ...registry.all()[3], commercial: true }));
  assert.equal(registry.get('constructor'), undefined);
});

test('schema rejects wrong types, unknown keys and invalid manifests', () => {
  const registry = createRegistry();
  assert.equal(registry.validate('store_art_prompt_pack', 'input', { aspects: 'bad' }), false);
  assert.equal(registry.validate('game_launch_kit', 'input', { extra: 'bad' }), false);
  assert.equal(registry.validate('companion_book_outline', 'input', { chapter_count: 100 }), false);
  const setup = fixture();
  assert.throws(() => setup.registry.register(setup.capability));
  assert.throws(() => new Registry().register({ ...setup.capability, inputSchema: { type: 'object', unknownKeyword: true } }));
  assert.throws(() => new Registry().register({ ...setup.capability, providerId: 'external' }));
  assert.throws(() => { setup.registry.get(setup.capability.id).price.atomic = '1'; });
});

test('all preserved handlers satisfy their full output schema in local stub mode', async () => {
  const setup = fixture();
  const registry = createRegistry();
  const cfg = { ...setup.cfg, stubMode: true };
  const pipeline = createPipeline({ registry, cfg });
  const inputs = {
    game_launch_kit: { title: 'Orbit', genre: 'puzzle', platform: 'itch', tone: 'calm', core_loop: 'rotate tiles to connect paths' },
    store_art_prompt_pack: { title: 'Orbit', genre: 'puzzle', palette: 'blue', aspects: ['1:1'] },
    ship_gate_audit: { project_type: 'web_game', evidence: { title_reviewed: true, description_reviewed: true, privacy_reviewed: true, asset_rights_reviewed: true, accessibility_reviewed: true, smoke_test_passed: true } },
  };
  for (const capability of registry.all().slice(0, 5)) {
    const result = await pipeline.execute({ id: capability.id, input: inputs[capability.id] || {}, payment: { stub: true }, surface: 'http', identity: 'local-test' });
    assert.equal(result.status, 200, capability.id);
    assert.equal(registry.validate(capability.id, 'output', result.body.result), true);
    assert.equal(registry.validate(capability.id, 'output', { tool: capability.id, stub: true }), false);
  }
});

test('implemented handlers use supplied facts and evidence without invented research', async () => {
  const registry = createRegistry();
  const run = async (id, input) => registry.get(id).handler(input, { signal: new AbortController().signal });
  const kit = await run('game_launch_kit', { title: 'Orbit', genre: 'puzzle', platform: 'itch', tone: 'calm', core_loop: 'rotate tiles' });
  assert.match(kit.bundle['PRD.md'], /rotate tiles/);
  assert.match(kit.bundle['COMPS.md'], /No competitors were fetched or verified/);
  assert.equal(kit.stub, undefined);
  const art = await run('store_art_prompt_pack', { title: 'Orbit', genre: 'puzzle', palette: 'blue', aspects: ['1:1'] });
  assert.equal(art.prompts.length, 1);
  assert.match(art.prompts[0].prompt, /original/i);
  const audit = await run('ship_gate_audit', { project_type: 'web_game', evidence: { title_reviewed: true, description_reviewed: true, privacy_reviewed: false, asset_rights_reviewed: true, accessibility_reviewed: true, smoke_test_passed: true } });
  assert.equal(audit.score, 0.8);
  assert.equal(audit.verdict, 'hold');
});

test('fixed price conversion uses exact decimal arithmetic', () => {
  assert.equal(usdToAtomic('$0.000001'), '1');
  assert.equal(usdToAtomic('1.25'), '1250000');
  for (const value of ['-1', '1e3', '1.0000001', 'garbage', '01.00']) assert.throws(() => usdToAtomic(value));
});

test('invalid input/output and oversized payload never settle', async () => {
  const setup = fixture();
  setup.payment.settle = () => assert.fail('must not settle');
  const pipeline = createPipeline(setup);
  assert.equal((await pipeline.execute({ ...setup.invocation, input: { unknown: 1 } })).status, 400);
  assert.equal((await pipeline.execute({ ...setup.invocation, input: { value: 'x'.repeat(2000) } })).status, 413);
  const invalid = fixture({ handler: () => ({ wrong: true }) });
  invalid.payment.settle = () => assert.fail('must not settle');
  assert.equal((await createPipeline(invalid).execute(invalid.invocation)).body.error, 'output_invalid');
});

test('timeout aborts handler, withholds result and never settles', async () => {
  let aborted = false;
  const setup = fixture({ handler: (_input, { signal }) => new Promise(() => signal.addEventListener('abort', () => { aborted = true; })) });
  const registry = new Registry().register({ ...setup.capability, limits: { ...setup.capability.limits, timeoutMs: 10 } });
  setup.payment.settle = () => assert.fail('must not settle');
  const result = await createPipeline({ ...setup, registry }).execute(setup.invocation);
  assert.equal(result.status, 504);
  assert.equal(aborted, true);
});

test('cost ceiling and rate limit stop handler', async () => {
  const setup = fixture({ handler: () => assert.fail('must not run') });
  const registry = new Registry().register({ ...setup.capability, limits: { ...setup.capability.limits, costAtomic: '1', dailyCostAtomic: '0' } });
  assert.equal((await createPipeline({ ...setup, registry }).execute(setup.invocation)).body.error, 'daily_cost_ceiling');
  const pipeline = createPipeline({ ...setup, limiter: new RateLimiter(1) });
  await pipeline.execute({ ...setup.invocation, payment: undefined });
  assert.equal((await pipeline.execute(setup.invocation)).status, 429);
});

test('memory ledger does not evict replay tombstones at capacity', () => {
  const ledger = new MemoryLedger(1);
  ledger.claim('first', 'fingerprint', 'nonce');
  assert.throws(() => ledger.claim('second', 'fingerprint', 'other'), /ledger_capacity/);
  assert.throws(() => ledger.claim('third', 'fingerprint', 'nonce'), /payment_replayed/);
});

test('SQLite persists claims, results and budgets across independent connections', () => {
  const directory = mkdtempSync(join(tmpdir(), 'gateway-ledger-'));
  const filename = join(directory, 'ledger.sqlite');
  let ledger = new SqliteLedger(filename);
  try {
    ledger.claim('key', 'fingerprint', 'replay');
    ledger.reserve('test', '2026-10-03', '5', '5');
    const other = new SqliteLedger(filename);
    try {
      assert.equal(other.claim('key', 'fingerprint', 'replay').state, 'pending');
      assert.throws(() => other.claim('new-key', 'fingerprint', 'replay'), /payment_replayed/);
      assert.throws(() => other.reserve('test', '2026-10-03', '1', '5'), /daily_cost_ceiling/);
      other.finish('key', 'completed', { status: 200 });
    } finally { other.close(); }
    ledger.close();
    ledger = new SqliteLedger(filename);
    assert.deepEqual(ledger.claim('key', 'fingerprint', 'replay').response, { status: 200 });
  } finally { ledger.close(); rmSync(directory, { recursive: true, force: true }); }
});

test('analytics failures do not alter result and simulated payments never count as revenue', async () => {
  const telemetry = new Telemetry(async () => { throw new Error('offline'); }, 'test-salt');
  const setup = fixture();
  const result = await createPipeline({ ...setup, telemetry }).execute(setup.invocation);
  assert.equal(result.status, 200);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(telemetry.summary().paidCalls, 0);
  assert.equal(telemetry.summary().grossAtomic, '0');
  assert.ok(telemetry.dropped > 0);
  const logged = JSON.stringify(telemetry.events);
  assert.equal(logged.includes(setup.payload.payload.signature), false);
  assert.equal(logged.includes(setup.payload.payload.authorization.from), false);
  assert.ok(telemetry.events.some(event => event.payer_hash));
});

test('URL boundary rejects private, metadata, mapped IPv6, credentials, ports and mixed DNS answers', async () => {
  for (const address of ['127.0.0.1', '10.0.0.1', '169.254.169.254', '172.16.0.1', '192.168.1.1', '100.64.1.1', '::1', '::ffff:127.0.0.1', '198.18.0.1', '224.0.0.1']) assert.equal(publicIpv4(address), false);
  assert.equal(publicIpv4('8.8.8.8'), true);
  for (const url of ['http://example.com', 'https://user:pass@example.com', 'https://example.com:8443', 'https://127.0.0.1', 'https://other.example']) await assert.rejects(resolvePublicUrl(url, ['example.com']));
  await assert.rejects(resolvePublicUrl('https://example.com', ['example.com'], async () => [{ address: '8.8.8.8' }, { address: '10.0.0.1' }]));
  const resolved = await resolvePublicUrl('https://example.com', ['example.com'], async () => [{ address: '8.8.8.8' }]);
  assert.equal(resolved.address, '8.8.8.8');
});

test('telemetry sink persists safe events independently of payment ledger', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'gateway-events-'));
  const filename = join(directory, 'events.sqlite');
  let sink = new SqliteEventSink(filename);
  try {
    const setup = fixture();
    const telemetry = new Telemetry(event => sink.write(event), 'local-test-salt');
    assert.equal((await createPipeline({ ...setup, telemetry }).execute(setup.invocation)).status, 200);
    sink.close();
    sink = new SqliteEventSink(filename);
    const events = sink.read();
    assert.ok(events.some(event => event.event === 'settlement_completed'));
    assert.equal(JSON.stringify(events).includes(setup.payload.payload.signature), false);
    sink.prune(Date.now() + 1);
    assert.deepEqual(sink.read(), []);
  } finally { sink.close(); rmSync(directory, { recursive: true, force: true }); }
});

test('safe fetch pins DNS, refuses redirects and enforces response byte limits', async () => {
  const options = { allowedHosts: ['example.com'], signal: new AbortController().signal, maxBytes: 5 };
  function dependencies(status, body) {
    return {
      resolver: async () => [{ address: '8.8.8.8', family: 4 }],
      requester(url, config, callback) {
        assert.equal(url.hostname, 'example.com');
        assert.equal(config.family, 4);
        config.lookup('example.com', {}, (error, address, family) => {
          assert.equal(error, null);
          assert.equal(address, '8.8.8.8');
          assert.equal(family, 4);
        });
        const outgoing = new EventEmitter();
        outgoing.destroy = error => outgoing.emit('error', error);
        outgoing.end = () => {
          const response = new EventEmitter();
          response.statusCode = status;
          response.destroy = error => { if (error) response.emit('error', error); };
          callback(response);
          if (status === 200) { response.emit('data', Buffer.from(body)); response.emit('end'); }
        };
        return outgoing;
      },
    };
  }
  assert.equal((await safeGet('https://example.com', options, dependencies(200, 'ok'))).toString(), 'ok');
  await assert.rejects(safeGet('https://example.com', options, dependencies(302, '')), /upstream_status_denied/);
  await assert.rejects(safeGet('https://example.com', options, dependencies(200, 'too large')), /upstream_too_large/);
});
