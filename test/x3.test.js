import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../src/app.js';
import { createRegistry } from '../src/registry.ts';
import { X3_TOOLS } from '../src/x3-tools.ts';
import { MemoryWeek1Store } from '../src/week1-store.ts';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const inputs = {
  text_sha256: { text: 'abc' },
  json_normalize: { json: '{"z":1,"a":{"b":2,"a":3}}' },
  json_csv_convert: { direction: 'csv_to_json', data: 'name,note\r\nAda,"a,b"' },
  url_normalize: { url: 'https://Example.com:443/a/../b?z=2&utm_source=test&a=1#frag' },
  cron_next_utc: { expression: '0 12 * * *', after_utc: '2026-10-07T12:00:00Z', count: 2 },
  utm_url_build: { url: 'https://example.com/p?x=1&utm_source=old#frag', source: 'new', medium: 'email', campaign: 'fall' },
  base64_text_codec: { action: 'encode', text: 'café' },
};
const post = (url, body, headers = {}) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });

async function serve(context, dependencies = {}) {
  const app = await createApp({ environment: 'test', testMode: 'week1', stubMode: true }, dependencies);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  return `http://127.0.0.1:${server.address().port}`;
}

test('seven bounded tools return documented deterministic results and strict schemas', async () => {
  const registry = createRegistry({ testMode: 'week1' });
  assert.equal(X3_TOOLS.length, 7);
  for (const [id, input] of Object.entries(inputs)) {
    assert.equal(registry.validate(id, 'input', input), true, id);
    assert.equal(registry.validate(id, 'input', { ...input, extra: 1 }), false, id);
    const result = await registry.get(id).handler(input, { signal: new AbortController().signal });
    assert.equal(registry.validate(id, 'output', result), true, id);
    assert.equal(registry.validate(id, 'output', { ...result, extra: 1 }), false, id);
    assert.equal(registry.get(id).limits.timeoutMs, 2000);
    assert.equal(registry.get(id).limits.maxPayloadBytes, 4096);
    assert.equal(registry.get(id).limits.maxOutputBytes, 30000);
    assert.equal(registry.get(id).limits.costAtomic, '0');
  }
  const run = (id, input) => registry.get(id).handler(input, { signal: new AbortController().signal });
  assert.equal((await run('text_sha256', inputs.text_sha256)).sha256_hex, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal((await run('json_normalize', inputs.json_normalize)).normalized, '{"a":{"a":3,"b":2},"z":1}');
  assert.deepEqual(JSON.parse((await run('json_csv_convert', inputs.json_csv_convert)).data), [{ name: 'Ada', note: 'a,b' }]);
  assert.equal((await run('json_csv_convert', { direction: 'json_to_csv', data: '[{"name":"Ada","note":"a,b"}]' })).data, 'name,note\r\nAda,"a,b"');
  assert.equal((await run('url_normalize', inputs.url_normalize)).normalized, 'https://example.com/b?a=1&z=2');
  assert.deepEqual((await run('cron_next_utc', inputs.cron_next_utc)).next_utc, ['2026-10-08T12:00:00.000Z', '2026-10-09T12:00:00.000Z']);
  assert.equal((await run('utm_url_build', inputs.utm_url_build)).url, 'https://example.com/p?x=1&utm_source=new&utm_medium=email&utm_campaign=fall#frag');
  assert.equal((await run('base64_text_codec', inputs.base64_text_codec)).text, 'Y2Fmw6k=');
  assert.equal((await run('base64_text_codec', { action: 'decode', text: 'Y2Fmw6k=' })).text, 'café');
  assert.equal((await run('base64_text_codec', { action: 'decode', text: '***' })).valid, false);
  assert.equal((await run('json_normalize', { json: '{bad' })).valid, false);
  assert.equal((await run('cron_next_utc', { expression: '* * 1 * 1', after_utc: '2026-10-07T00:00:00Z', count: 1 })).valid, false);
});

test('all seven share HTTP and MCP 402, stub paid result, and settlement withholding', async context => {
  const url = await serve(context);
  const client = new Client({ name: 'x3-contract', version: '1.0.0' });
  context.after(() => client.close());
  await client.connect(new StreamableHTTPClientTransport(new URL(`${url}/mcp`)));
  const list = await client.listTools();
  assert.equal(list.tools.length, 10);
  for (const tool of X3_TOOLS) {
    const input = inputs[tool.id];
    const challenge = await post(`${url}/tools/${tool.id}`, input);
    assert.equal(challenge.status, 402, tool.id);
    const required = JSON.parse(Buffer.from(challenge.headers.get('payment-required'), 'base64').toString());
    assert.equal(required.accepts[0].amount, tool.priceAtomic);
    assert.equal(required.extensions.bazaar.info.name, tool.id);
    assert.deepEqual(required.extensions.bazaar.info.inputSchema, tool.inputSchema);
    assert.deepEqual(required.extensions.bazaar.info.outputSchema, tool.outputSchema);
    const paid = await post(`${url}/tools/${tool.id}`, input, { 'payment-signature': 'stub-ok' });
    assert.equal(paid.status, 200, tool.id);
    const paidBody = await paid.json();
    assert.equal(paidBody.result.tool, tool.id);
    assert.ok(paid.headers.get('payment-response'));
    const unpaidMcp = await client.callTool({ name: tool.id, arguments: input });
    assert.equal(unpaidMcp._meta['gateway/status'], 402);
    const paidMcp = await client.callTool({ name: tool.id, arguments: input, _meta: { 'x402/payment': 'stub-ok' } });
    assert.equal(paidMcp._meta['gateway/status'], 200);
    assert.equal(JSON.parse(paidMcp.content[0].text).result.tool, tool.id);
  }
  const failing = await serve(context, { payment: { mode: 'stub', verify: async () => ({ isValid: true }), settle: async () => ({ success: false }) } });
  for (const tool of X3_TOOLS) {
    const input = inputs[tool.id];
    const http = await post(`${failing}/tools/${tool.id}`, input, { 'payment-signature': 'stub-ok' });
    assert.equal(http.status, 502, tool.id);
    assert.equal(http.headers.get('payment-response'), null);
    assert.equal((await http.json()).result, undefined);
    const mcp = await post(`${failing}/mcp/tools/call`, { name: tool.id, arguments: input, _meta: { 'x402/payment': 'stub-ok' } });
    const body = await mcp.json();
    assert.equal(body._meta['gateway/status'], 502, tool.id);
    assert.equal(JSON.parse(body.content[0].text).result, undefined);
  }
});

test('new tools are absent from public discovery outside week1', async context => {
  const app = await createApp({ environment: 'test', testMode: '', stubMode: true });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const url = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await (await fetch(`${url}/.well-known/x402`)).json()).resources.length, 0);
  assert.equal((await (await fetch(`${url}/openapi.json`)).json()).paths['/tools/text_sha256'], undefined);
});

test('the global paid cap is shared by old and new tools', async context => {
  const store = new MemoryWeek1Store();
  for (let i = 0; i < 249; i++) await store.claim(`payer-${i % 5}`);
  const url = await serve(context, { week1Store: store });
  const last = await post(`${url}/tools/text_sha256`, inputs.text_sha256, { 'payment-signature': 'stub-ok' });
  assert.equal(last.status, 200);
  const newTool = await post(`${url}/tools/utm_url_build`, inputs.utm_url_build);
  assert.equal(newTool.status, 429);
  assert.equal(newTool.headers.get('payment-required'), null);
  const oldTool = await post(`${url}/tools/game_launch_kit`, { title: 'Orbit', genre: 'puzzle', platform: 'itch', tone: 'calm', core_loop: 'rotate tiles' });
  assert.equal(oldTool.status, 429);
});
