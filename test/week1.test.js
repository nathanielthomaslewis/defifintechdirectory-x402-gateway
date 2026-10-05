import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../src/app.js';
import { createRegistry } from '../src/registry.ts';
import { hitRow, MemoryWeek1Store, SupabaseWeek1Store } from '../src/week1-store.ts';
import { hitSummary } from '../src/operator.ts';
import { createPipeline } from '../src/pipeline.ts';
import { paymentRequiredForTool } from '../src/x402.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const input = { title: 'Orbit', genre: 'puzzle', platform: 'itch', tone: 'calm', core_loop: 'rotate tiles' };
const post = (url, body, headers = {}) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
async function serve(context, overrides = {}, dependencies = {}) {
  const app = await createApp({ environment: 'test', testMode: 'week1', stubMode: true, ...overrides }, dependencies);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  return { app, url: `http://127.0.0.1:${server.address().port}` };
}

test('week1 manifest exposes only three working tools at 20000 atomic USDC', async context => {
  const { url } = await serve(context);
  const catalog = await (await fetch(`${url}/capabilities`)).json();
  assert.equal(catalog.listed, true);
  assert.equal(catalog.capabilities.length, 3);
  assert.deepEqual(catalog.capabilities.map(item => item.id).sort(), ['game_launch_kit', 'ship_gate_audit', 'store_art_prompt_pack']);
  assert.equal(catalog.capabilities.every(item => item.price.atomic === '20000'), true);
  const health = await (await fetch(`${url}/health`)).json();
  assert.deepEqual([health.testMode, health.listed, health.paymentsLive], [true, true, false]);
  const challenge = await post(`${url}/tools/game_launch_kit`, input);
  assert.equal(challenge.status, 402);
  const payload = JSON.parse(Buffer.from(challenge.headers.get('payment-required'), 'base64').toString());
  assert.equal(payload.accepts[0].network, 'eip155:8453');
  assert.equal(payload.accepts[0].amount, '20000');
  assert.equal(payload.extensions.bazaar.info.name, 'game_launch_kit');
  assert.deepEqual(Object.keys(payload.extensions.bazaar.info.inputSchema.properties), Object.keys(input));
});

test('placeholders are 404 on HTTP, catalog and MCP call in week1', async context => {
  const { url } = await serve(context);
  for (const id of ['companion_book_outline', 'stickman_short_script']) {
    assert.equal((await post(`${url}/tools/${id}`, {})).status, 404);
    assert.equal((await fetch(`${url}/capabilities/${id}`)).status, 404);
    const mcp = await post(`${url}/mcp/tools/call`, { name: id, arguments: {} });
    assert.equal((await mcp.json())._meta['gateway/status'], 404);
  }
});

test('public MCP lists exactly the three priced week1 tools', async context => {
  const { url } = await serve(context);
  const client = new Client({ name: 'week1-test', version: '1.0.0' });
  context.after(() => client.close());
  await client.connect(new StreamableHTTPClientTransport(new URL(`${url}/mcp`)));
  const list = await client.listTools();
  assert.deepEqual(list.tools.map(tool => tool.name).sort(), ['game_launch_kit', 'ship_gate_audit', 'store_art_prompt_pack']);
  assert.equal(list.tools.every(tool => tool._meta['x402/payment-required'].accepts[0].amount === '20000'), true);
});

test('paid cap returns structured 429 without a 402 challenge', async context => {
  const store = new MemoryWeek1Store();
  for (let i = 0; i < 250; i++) await store.claim(`payer-${i % 5}`);
  const { url } = await serve(context, {}, { week1Store: store });
  const response = await post(`${url}/tools/game_launch_kit`, input);
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('payment-required'), null);
  assert.equal((await response.json()).error, 'daily_paid_cap');
  const payerStore = new MemoryWeek1Store();
  for (let i = 0; i < 60; i++) await payerStore.claim('0xabc');
  await assert.rejects(payerStore.check('0xabc'), /daily_paid_cap/);
  await payerStore.check('0xdef');
});

test('production week1 refuses startup and names missing live variables', async () => {
  await assert.rejects(createApp({ environment: 'production', testMode: 'week1', stubMode: true,
    payTo: '', cdpApiKeyId: '', cdpApiKeySecret: '', supabaseUrl: '', supabaseServiceRoleKey: '', hitLogSalt: '', operatorToken: '' }),
  error => ['STUB_MODE=0', 'PAY_TO', 'CDP_API_KEY_ID', 'CDP_API_KEY_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'HIT_LOG_SALT', 'OPERATOR_TOKEN'].every(name => error.message.includes(name)));
});

test('off profile keeps private registry and stub challenge', async context => {
  const { url } = await serve(context, { testMode: '' });
  assert.equal((await (await fetch(`${url}/tools`)).json()).tools.length, 0);
  assert.equal((await (await fetch(`${url}/health`)).json()).testMode, false);
  const response = await post(`${url}/tools/game_launch_kit`, input);
  assert.equal(response.status, 402);
  const payload = JSON.parse(Buffer.from(response.headers.get('payment-required'), 'base64').toString());
  assert.equal(payload.accepts[0].amount, '1000000');
  assert.equal(payload.extensions, undefined);
  assert.equal(createRegistry().visible('public').length, 0);
});

test('hit row hashes IP and failing hit sink does not change response', async context => {
  const row = hitRow({ path: '/tools/game_launch_kit', method: 'POST', surface: 'http', toolId: 'game_launch_kit',
    ip: '203.0.113.1', hadPaymentHeader: true, outcome: '402_issued', amountAtomic: '20000', latencyMs: 7 }, 'test-salt');
  assert.match(row.ip_hash, /^[0-9a-f]{64}$/);
  assert.equal(JSON.stringify(row).includes('203.0.113.1'), false);
  assert.deepEqual(Object.keys(row), ['ts', 'path', 'method', 'surface', 'tool_id', 'user_agent', 'referer', 'ip_hash', 'had_payment_header', 'outcome', 'amount_atomic', 'payer_address', 'tx_hash', 'latency_ms']);
  const store = new MemoryWeek1Store();
  store.write = async () => { throw new Error('test sink unavailable'); };
  const { url } = await serve(context, {}, { week1Store: store });
  const response = await post(`${url}/tools/game_launch_kit`, input);
  assert.equal(response.status, 402);
  assert.ok(response.headers.get('payment-required'));
});

test('week1 HTTP request writes one shaped hit without a raw IP', async context => {
  const rows = [];
  const store = new MemoryWeek1Store();
  store.write = async row => { rows.push(row); };
  const { url } = await serve(context, { hitLogSalt: '0123456789abcdef0123456789abcdef' }, { week1Store: store });
  const response = await post(`${url}/tools/game_launch_kit`, input, { 'user-agent': 'week1-probe' });
  assert.equal(response.status, 402);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].surface, 'http');
  assert.equal(rows[0].outcome, '402_issued');
  assert.equal(rows[0].amount_atomic, '20000');
  assert.equal(rows[0].user_agent, 'week1-probe');
  assert.match(rows[0].ip_hash, /^[0-9a-f]{64}$/);
  assert.equal(JSON.stringify(rows[0]).includes('127.0.0.1'), false);
});

test('well-known and llms discovery contain exactly three registry tools', async context => {
  const { url } = await serve(context);
  const manifest = await (await fetch(`${url}/.well-known/x402`)).json();
  assert.equal(manifest.resources.length, 3);
  assert.equal(manifest.resources.every(resource => resource.accepts[0].amount === '20000' && resource.inputSchema && resource.outputSchema), true);
  const llms = await (await fetch(`${url}/llms.txt`)).text();
  assert.equal(llms.split('\n').filter(line => line.startsWith('- ')).length, 3);
  for (const resource of manifest.resources) assert.ok(llms.includes(resource.id));
  assert.equal(llms.includes('companion_book_outline'), false);
});

test('operator hits authenticates and reports Supabase rows in JSON and HTML', async context => {
  const token = 'local-test-operator-token-00000001';
  const store = new MemoryWeek1Store();
  store.readHits = async () => ({ rows: [{ ts: '2026-10-05T00:00:00Z', outcome: 'paid', amount_atomic: '20000', tx_hash: '0xabc', payer_address: '0xabc', tool_id: 'game_launch_kit', surface: 'http', user_agent: '<robot>' },
    { ts: '2026-10-05T00:00:01Z', outcome: 'paid', amount_atomic: '20000', tx_hash: '0xabc', payer_address: '0xabc', tool_id: 'game_launch_kit', surface: 'http', user_agent: '<robot>' }], truncated: false });
  const { url } = await serve(context, { operatorToken: token }, { week1Store: store });
  assert.equal((await fetch(`${url}/operator/hits`)).status, 401);
  assert.equal((await fetch(`${url}/operator/hits`, { headers: { authorization: 'Bearer wrong' } })).status, 401);
  const response = await fetch(`${url}/operator/hits?format=json`, { headers: { authorization: `Bearer ${token}` } });
  assert.equal(response.status, 200);
  const summary = await response.json();
  assert.equal(summary.total, 2);
  assert.equal(summary.paidCalls, 1);
  assert.equal(summary.grossAtomic, '20000');
  assert.equal(summary.distinctPayers, 1);
  const html = await (await fetch(`${url}/operator/hits`, { headers: { authorization: `Bearer ${token}`, accept: 'text/html' } })).text();
  assert.ok(html.includes('&lt;robot&gt;'));
  assert.equal(html.includes('<robot>'), false);
  assert.equal(hitSummary([]).grossAtomic, '0');
});

test('Supabase adapter uses PostgREST fetch with service role and no SDK', async () => {
  const requests = [];
  const fakeFetch = async (url, init) => { requests.push({ url, init });
    if (url.includes('/rpc/x402_week1_release')) return new Response(null, { status: 204 });
    return new Response(JSON.stringify(url.includes('/rpc/') ? { allowed: true, day: '2026-10-05' } : []), { status: 200 }); };
  const store = new SupabaseWeek1Store({ supabaseUrl: 'https://example.supabase.co', supabaseServiceRoleKey: 'test-key' }, fakeFetch);
  await store.check();
  await store.claim('0xabc');
  await store.release('0xabc');
  await store.write(hitRow({ ip: '127.0.0.1', outcome: '404' }, 'salt'));
  await store.readHits();
  assert.equal(requests.length, 5);
  assert.ok(requests.every(request => request.init.headers.authorization === 'Bearer test-key'));
  assert.ok(requests.some(request => request.url.endsWith('/rest/v1/x402_hits')));
});

test('mock live week1 path settles only after execution and retains uncertain cap reservation', async () => {
  const cfg = { environment: 'production', testMode: 'week1', stubMode: false, livePaymentsEnabled: true,
    listed: true, disabledCapabilities: [], baseUrl: 'https://example.invalid', network: 'eip155:8453',
    usdcAsset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', payTo: `0x${'11'.repeat(20)}` };
  const registry = createRegistry(cfg);
  const requirements = paymentRequiredForTool('game_launch_kit', cfg, registry);
  const payer = `0x${'22'.repeat(20)}`;
  const payload = { x402Version: 2, accepted: requirements.accepts[0], resource: requirements.resource,
    payload: { signature: `0x${'ab'.repeat(65)}`, authorization: { from: payer, to: cfg.payTo,
      value: '20000', nonce: `0x${'33'.repeat(32)}`, validAfter: String(Math.floor(Date.now() / 1000) - 1),
      validBefore: String(Math.floor(Date.now() / 1000) + 50) } } };
  const invocation = { id: 'game_launch_kit', input, payment: payload, idempotencyKey: 'week1-test-key', surface: 'http', identity: '127.0.0.1' };
  const cappedStore = new MemoryWeek1Store();
  for (let i = 0; i < 60; i++) await cappedStore.claim(payer);
  const capped = await createPipeline({ registry, cfg, week1Store: cappedStore,
    payment: { mode: 'live', verify: () => assert.fail('capped payment must not verify'), settle: () => assert.fail('capped payment must not settle') } }).execute(invocation);
  assert.equal(capped.status, 429);
  assert.equal(capped.requirements, undefined);
  let claims = 0;
  let releases = 0;
  const store = { check: async () => {}, claim: async () => { claims++; return '2026-10-05'; }, release: async () => { releases++; } };
  const payment = { mode: 'live', verify: async () => ({ isValid: true }), settle: async () => ({ success: false }) };
  const failed = await createPipeline({ registry, cfg, week1Store: store, payment }).execute(invocation);
  assert.equal(failed.status, 502);
  assert.equal(failed.body.result, undefined);
  assert.equal(claims, 1);
  assert.equal(releases, 0);
  payment.settle = async () => ({ success: true, mode: 'live', transaction: `0x${'44'.repeat(32)}` });
  const paid = await createPipeline({ registry, cfg, week1Store: store, payment }).execute(invocation);
  assert.equal(paid.status, 200);
  assert.equal(paid.body.mode, 'live');
  assert.equal(paid.txHash, `0x${'44'.repeat(32)}`);
  assert.equal(paid.payerAddress, payer);
});
