import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/app.js';
import { createRegistry } from '../src/registry.ts';
import { createPipeline } from '../src/pipeline.ts';
import { BUNDLES, buildBundle } from '../src/bundles.ts';
import { atomicToUsd, buildSale, FxRates, MemorySalesLog, SqliteSalesLog, SupabaseSalesLog, salesCsv } from '../src/sales.ts';
import { paymentRequiredForTool } from '../src/x402.js';
import { fixture } from './helpers.js';

const brief = { title: 'Echo Vault', genre: 'tycoon', hook: 'Grow echoes by day, steal them by night' };
const post = (url, body, headers = {}) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
async function serve(context, overrides = {}, dependencies = {}) {
  const app = await createApp({ environment: 'test', testMode: 'week1', stubMode: true, ...overrides }, dependencies);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  return { app, url: `http://127.0.0.1:${server.address().port}` };
}

test('three launch bundles priced $1-$3, public in week1 and private by default', () => {
  const prices = Object.fromEntries(BUNDLES.map(bundle => [bundle.id, bundle.priceUsd]));
  assert.deepEqual(prices, { roblox_launch_bundle: '1.00', godot_steam_launch_bundle: '2.00', xr_store_submission_bundle: '3.00' });
  const week1 = createRegistry({ testMode: 'week1' });
  for (const bundle of BUNDLES) {
    const entry = week1.get(bundle.id);
    assert.equal(entry.price.atomic, String(Number(bundle.priceUsd) * 1e6));
    assert.equal(entry.discovery.public && entry.discovery.bazaar && entry.commercial, true);
    assert.equal(createRegistry().get(bundle.id).discovery.public, false);
  }
  for (const pack of ['designer_pack', 'marketer_pack', 'game_dev_pack']) assert.equal(week1.get(pack).price.atomic, '3000000');
});

test('every bundle output validates against its schema and scores evidence', () => {
  const registry = createRegistry({ testMode: 'week1' });
  for (const bundle of BUNDLES) {
    const empty = buildBundle(bundle, brief);
    assert.equal(registry.validate(bundle.id, 'output', empty), true, bundle.id);
    assert.equal(empty.readiness.score, 0);
    assert.equal(empty.readiness.verdict, 'hold');
    assert.equal(empty.readiness.missing.length, bundle.gates.length);
    const all = buildBundle(bundle, { ...brief, evidence: Object.fromEntries(bundle.gates.map(gate => [gate.id, true])) });
    assert.equal(all.readiness.score, 1);
    assert.equal(all.readiness.verdict, 'ready_to_submit');
    assert.ok(all.files['LAUNCH-PLAN.md'].includes('Next 7 days'));
    assert.ok(all.files['QUALITY-GATES.md'].includes('Core loop'));
    assert.ok(all.disclaimer.includes('Not legal'));
  }
});

test('bundle inputs are strict and platform warnings fire', () => {
  const registry = createRegistry({ testMode: 'week1' });
  assert.equal(registry.validate('roblox_launch_bundle', 'input', { ...brief, extra: 1 }), false);
  assert.equal(registry.validate('roblox_launch_bundle', 'input', { title: 'x' }), false);
  assert.equal(registry.validate('godot_steam_launch_bundle', 'input', { ...brief, godot_version: '3.5' }), false);
  assert.equal(registry.validate('xr_store_submission_bundle', 'input', { ...brief, targets: ['steam'] }), false);
  assert.equal(registry.validate('xr_store_submission_bundle', 'input', { ...brief, evidence: { unknown_gate: true } }), false);
  const xr = BUNDLES.find(bundle => bundle.id === 'xr_store_submission_bundle');
  const kids = buildBundle(xr, { ...brief, targets: ['horizon_store'], audience: 'kids_only' });
  assert.ok(kids.files['LAUNCH-PLAN.md'].includes('solely for under-10s'));
  assert.ok(buildBundle(xr, brief).files['QUALITY-GATES.md'].includes('XR comfort'));
});

test('bundle endpoints issue 402 with Bazaar POST metadata and pay in stub mode', async context => {
  const { url } = await serve(context);
  const challenge = await post(`${url}/tools/godot_steam_launch_bundle`, brief);
  assert.equal(challenge.status, 402);
  const required = JSON.parse(Buffer.from(challenge.headers.get('payment-required'), 'base64').toString());
  assert.equal(required.accepts[0].amount, '2000000');
  assert.equal(required.extensions.bazaar.info.input.method, 'POST');
  const paid = await post(`${url}/tools/godot_steam_launch_bundle`, brief, { 'payment-signature': 'stub-ok' });
  assert.equal(paid.status, 200);
  const body = await paid.json();
  assert.equal(body.result.tool, 'godot_steam_launch_bundle');
  assert.ok(body.result.files['STORE-CHECKLIST.md'].includes('Steam'));
  const known = await (await fetch(`${url}/.well-known/x402`)).json();
  const resource = known.resources.find(item => item.endsWith('/tools/xr_store_submission_bundle'));
  assert.deepEqual(known.resource_methods[resource], ['POST']);
  assert.deepEqual(known.resource_methods[known.resources.find(item => item.endsWith('/packs/game_dev_pack'))], ['GET']);
  const llms = await (await fetch(`${url}/llms.txt`)).text();
  assert.ok(llms.includes('Game launch bundles'));
  const openapi = await (await fetch(`${url}/openapi.json`)).json();
  assert.ok(openapi.paths['/tools/roblox_launch_bundle'].post.requestBody);
});

test('settled payments are written to the sales log with GBP at receipt', async () => {
  const setup = fixture();
  const sales = new MemorySalesLog();
  const fx = { usdGbp: async () => ({ rate: '0.750000', date: '2026-10-14', source: 'test' }) };
  const pipeline = createPipeline({ registry: setup.registry, cfg: setup.cfg, payment: setup.payment, sales, fx });
  assert.equal((await pipeline.execute(setup.invocation)).status, 200);
  const [row] = await sales.list();
  assert.equal(row.tool_id, 'test_utility');
  assert.equal(row.amount_usd, '0.010000');
  assert.equal(row.amount_gbp, '0.007500');
  assert.equal(row.usd_gbp_rate, '0.750000');
  assert.equal(row.payer_address, `0x${'11'.repeat(20)}`);
  assert.equal(row.mode, 'simulation');
  assert.equal((await sales.list()).length, 1);
  const failing = createPipeline({ registry: setup.registry, cfg: setup.cfg, payment: setup.payment, sales: { durable: true, record: async () => { throw new Error('down'); }, list: async () => [] }, fx });
  assert.equal((await failing.execute({ ...setup.invocation, idempotencyKey: 'test-key-0002', payment: { ...setup.payload, payload: { ...setup.payload.payload, authorization: { ...setup.payload.payload.authorization, nonce: `0x${'33'.repeat(32)}` } } } })).status, 200);
});

test('FX lookup failure keeps the sale and flags backfill; FX caches', async () => {
  let calls = 0;
  const fx = new FxRates(async () => { calls++; return new Response(JSON.stringify({ date: '2026-10-14', rates: { GBP: 0.7512 } }), { status: 200 }); });
  assert.equal((await fx.usdGbp()).rate, '0.751200');
  await fx.usdGbp();
  assert.equal(calls, 1);
  const broken = new FxRates(async () => { throw new Error('offline'); });
  const sale = await buildSale({ toolId: 'x', atomic: '1000000', network: 'eip155:8453', mode: 'live', invocationId: 'i1', tx: '0xabc' }, broken);
  assert.equal(sale.amount_gbp, null);
  assert.equal(sale.fx_source, 'unavailable_backfill_required');
  assert.equal(atomicToUsd('2500001'), '2.500001');
});

test('SQLite sales log persists across instances and dedupes by invocation', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'sales-'));
  try {
    const path = join(directory, 'sales.db');
    const fx = { usdGbp: async () => null };
    const sale = await buildSale({ toolId: 'roblox_launch_bundle', atomic: '1000000', network: 'eip155:8453', mode: 'live', invocationId: 'inv-1' }, fx);
    const log = new SqliteSalesLog(path);
    await log.record(sale); await log.record(sale);
    const rows = await new SqliteSalesLog(path).list();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].amount_usd, '1.000000');
    assert.ok(salesCsv(rows).startsWith('ts,tool_id,amount_atomic'));
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('Supabase sales log posts to x402_sales with service role', async () => {
  const requests = [];
  const log = new SupabaseSalesLog({ supabaseUrl: 'https://example.supabase.co', supabaseServiceRoleKey: 'k' }, async (url, init) => { requests.push({ url, init }); return new Response(url.includes('select=') ? '[]' : null, { status: url.includes('select=') ? 200 : 201 }); });
  await log.record(await buildSale({ toolId: 't', atomic: '1', network: 'n', mode: 'live', invocationId: 'i' }, { usdGbp: async () => null }));
  assert.equal(requests[0].url, 'https://example.supabase.co/rest/v1/x402_sales');
  assert.equal(requests[0].init.headers.authorization, 'Bearer k');
  assert.deepEqual(await log.list(), []);
});

test('operator sales endpoint requires the operator token and exports CSV', async context => {
  const sales = new MemorySalesLog();
  await sales.record(await buildSale({ toolId: 'roblox_launch_bundle', atomic: '1000000', network: 'eip155:8453', mode: 'live', invocationId: 'a' }, { usdGbp: async () => ({ rate: '0.8', date: '2026-10-14', source: 't' }) }));
  const { url } = await serve(context, { operatorToken: 'local-test-operator-token-sales-0001' }, { sales });
  assert.equal((await fetch(`${url}/operator/sales`)).status, 401);
  const json = await (await fetch(`${url}/operator/sales`, { headers: { authorization: 'Bearer local-test-operator-token-sales-0001' } })).json();
  assert.equal(json.count, 1);
  const csv = await (await fetch(`${url}/operator/sales?format=csv`, { headers: { authorization: 'Bearer local-test-operator-token-sales-0001' } })).text();
  assert.ok(csv.includes('roblox_launch_bundle'));
  const health = await (await fetch(`${url}/health`)).json();
  assert.equal(health.salesLogDurable, false);
});
