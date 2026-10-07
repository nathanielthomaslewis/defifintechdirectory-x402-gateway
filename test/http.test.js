import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createApp } from '../src/app.js';
import { fixture } from './helpers.js';

async function serve(context, overrides = {}, dependencies = {}) {
  const app = await createApp({ environment: 'test', stubMode: true, ...overrides }, dependencies);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  return { app, url: `http://127.0.0.1:${server.address().port}` };
}

test('HTTP unpaid 402, implemented local result, malformed payload and private catalogs', async context => {
  const { url } = await serve(context);
  const challenge = await fetch(`${url}/tools/game_launch_kit`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: 'Orbit', genre: 'puzzle', platform: 'itch', tone: 'calm', core_loop: 'rotate tiles' }) });
  assert.equal(challenge.status, 402);
  assert.equal(JSON.parse(Buffer.from(challenge.headers.get('payment-required'), 'base64')).x402Version, 2);
  const success = await fetch(`${url}/tools/game_launch_kit`, { method: 'POST', headers: { 'content-type': 'application/json', 'payment-signature': 'stub-ok' }, body: JSON.stringify({ title: 'Orbit', genre: 'puzzle', platform: 'itch', tone: 'calm', core_loop: 'rotate tiles' }) });
  assert.equal(success.status, 200);
  const body = await success.json();
  assert.match(body.result.bundle['PRD.md'], /rotate tiles/);
  assert.equal(body.result.stub, undefined);
  assert.equal(body.mode, 'stub');
  assert.equal(body.settlement.transaction, undefined);
  assert.deepEqual((await (await fetch(`${url}/capabilities`)).json()).capabilities, []);
  assert.equal((await fetch(`${url}/capabilities/game_launch_kit`)).status, 404);
  assert.deepEqual((await (await fetch(`${url}/tools`)).json()).tools, []);
  assert.equal((await fetch(`${url}/tools/toString`)).status, 404);
  const malformed = await fetch(`${url}/tools/game_launch_kit`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{bad' });
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).error, 'invalid_request');
});

test('failed settlement does not expose result or success header on HTTP or legacy MCP', async context => {
  const setup = fixture();
  setup.payment.settle = async () => ({ success: false });
  const { url } = await serve(context, setup.cfg, setup);
  const failed = await fetch(`${url}/tools/test_utility`, { method: 'POST', headers: {
    'content-type': 'application/json', 'payment-signature': Buffer.from(JSON.stringify(setup.payload)).toString('base64'), 'idempotency-key': 'http-test-0001',
  }, body: '{}' });
  assert.equal(failed.status, 502);
  assert.equal(failed.headers.get('payment-response'), null);
  assert.equal((await failed.json()).result, undefined);
  const mcp = await fetch(`${url}/mcp/tools/call`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'test_utility', arguments: {}, _meta: { 'x402/payment': setup.payload, 'x402/idempotency-key': 'http-test-0001' } }) });
  const body = await mcp.json();
  assert.equal(body.isError, true);
  assert.equal(JSON.parse(body.content[0].text).result, undefined);
});

test('official MCP client initializes, lists and calls shared pipeline', async context => {
  const setup = fixture();
  const { url } = await serve(context, setup.cfg, setup);
  const client = new Client({ name: 'gateway-contract-test', version: '1.0.0' });
  context.after(() => client.close());
  await client.connect(new StreamableHTTPClientTransport(new URL(`${url}/mcp`)));
  const list = await client.listTools();
  assert.equal(list.tools[0].name, 'test_utility');
  const unpaid = await client.callTool({ name: 'test_utility', arguments: {} });
  assert.equal(unpaid.isError, true);
  assert.equal(unpaid._meta['gateway/status'], 402);
  const paid = await client.callTool({ name: 'test_utility', arguments: { value: 'transport' }, _meta: { 'x402/payment': setup.payload, 'x402/idempotency-key': 'mcp-test-0001' } });
  assert.equal(paid.isError, false);
  assert.equal(JSON.parse(paid.content[0].text).result.value, 'transport');
});

test('MCP rejects hostile Origin and GET streams; production stub remains denied', async context => {
  const { url } = await serve(context, { environment: 'production' });
  const denied = await fetch(`${url}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://evil.example' }, body: '{}' });
  assert.equal(denied.status, 403);
  assert.equal((await fetch(`${url}/mcp`)).status, 405);
  const tool = await fetch(`${url}/tools/game_launch_kit`, { headers: { 'payment-signature': 'stub-ok' } });
  assert.equal(tool.status, 404);
  const privateCall = await fetch(`${url}/mcp/tools/call`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'game_launch_kit', arguments: {}, _meta: { 'x402/payment': 'stub-ok' } }) });
  assert.equal((await privateCall.json())._meta['gateway/status'], 404);
  const client = new Client({ name: 'private-list-check', version: '1.0.0' });
  context.after(() => client.close());
  await client.connect(new StreamableHTTPClientTransport(new URL(`${url}/mcp`)));
  assert.deepEqual((await client.listTools()).tools, []);
  assert.equal((await (await fetch(`${url}/health`)).json()).paymentsLive, false);
});

test('three private capabilities share HTTP and MCP challenge, result and settlement withholding', async context => {
  const inputs = {
    game_launch_kit: { title: 'Orbit', genre: 'puzzle', platform: 'itch', tone: 'calm', core_loop: 'rotate tiles' },
    store_art_prompt_pack: { title: 'Orbit', genre: 'puzzle', palette: 'blue', aspects: ['1:1', '16:9'] },
    ship_gate_audit: { project_type: 'web_game', evidence: { title_reviewed: true, description_reviewed: true, privacy_reviewed: false, asset_rights_reviewed: true, accessibility_reviewed: true, smoke_test_passed: true } },
  };
  const { url } = await serve(context);
  for (const [id, input] of Object.entries(inputs)) {
    const endpoint = `${url}/tools/${id}`;
    const challenge = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) });
    assert.equal(challenge.status, 402, id);
    assert.equal(JSON.parse(Buffer.from(challenge.headers.get('payment-required'), 'base64')).accepts[0].amount, ({ game_launch_kit: '1000000', store_art_prompt_pack: '150000', ship_gate_audit: '100000' })[id]);
    const paid = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json', 'payment-signature': 'stub-ok' }, body: JSON.stringify(input) });
    assert.equal(paid.status, 200, id);
    const body = await paid.json();
    assert.equal(body.result.tool, id);
    assert.equal(body.result.stub, undefined);
    assert.equal((await fetch(`${url}/capabilities/${id}`)).status, 404);
    const mcpUnpaid = await fetch(`${url}/mcp/tools/call`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: id, arguments: input }) });
    assert.equal((await mcpUnpaid.json())._meta['gateway/status'], 402);
    const mcpPaid = await fetch(`${url}/mcp/tools/call`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: id, arguments: input, _meta: { 'x402/payment': 'stub-ok' } }) });
    const mcpBody = await mcpPaid.json();
    assert.equal(mcpBody.isError, false);
    assert.equal(JSON.parse(mcpBody.content[0].text).result.tool, id);
  }
  const failurePayment = { mode: 'stub', verify: async () => ({ isValid: true }), settle: async () => ({ success: false }) };
  const failure = await serve(context, {}, { payment: failurePayment });
  for (const [id, input] of Object.entries(inputs)) {
    const http = await fetch(`${failure.url}/tools/${id}`, { method: 'POST', headers: { 'content-type': 'application/json', 'payment-signature': 'stub-ok' }, body: JSON.stringify(input) });
    assert.equal(http.status, 502);
    assert.equal(http.headers.get('payment-response'), null);
    assert.equal((await http.json()).result, undefined);
    const mcp = await fetch(`${failure.url}/mcp/tools/call`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: id, arguments: input, _meta: { 'x402/payment': 'stub-ok' } }) });
    const mcpBody = await mcp.json();
    assert.equal(mcpBody.isError, true);
    assert.equal(JSON.parse(mcpBody.content[0].text).result, undefined);
  }
});

test('operator analytics requires a configured token and excludes stub revenue', async context => {
  const token = 'local-test-operator-token-00000001';
  const { url } = await serve(context, { operatorReadToken: token });
  assert.equal((await fetch(`${url}/operator/analytics`)).status, 401);
  assert.equal((await fetch(`${url}/operator/analytics`, { headers: { authorization: 'Bearer wrong' } })).status, 401);
  const input = { title: 'Orbit', genre: 'puzzle', platform: 'itch', tone: 'calm', core_loop: 'rotate tiles' };
  await fetch(`${url}/tools/game_launch_kit`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) });
  const response = await fetch(`${url}/operator/analytics`, { headers: { authorization: `Bearer ${token}` } });
  assert.equal(response.status, 200);
  const snapshot = await response.json();
  assert.equal(snapshot.listed, false);
  assert.equal(snapshot.summary.paidCalls, 0);
  assert.equal(snapshot.summary.grossAtomic, '0');
  assert.equal(snapshot.capabilities.find(capability => capability.id === 'game_launch_kit').challenges, 1);
  assert.equal(snapshot.capabilities.length, 12);
});
