import test from 'node:test';
import assert from 'node:assert/strict';
import { HumanService } from '../src/human-service.ts';
import { createRegistry } from '../src/registry.ts';
import { createPreviewRegistry } from '../src/human-preview.ts';
import { DemoCredits } from '../src/human-credits.ts';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';

const config = () => ({ ...loadConfig(), environment: 'test', stubMode: true, disabledCapabilities: [] });
const input = { text: 'A small useful sample.' };
const setup = (options = {}) => new HumanService({ cfg: config(), registry: createRegistry(), ...options });
const request = (quote, overrides = {}) => ({ quoteId: quote.id, input, confirmed: true, idempotencyKey: 'human-retry-0001', ...overrides });

test('human catalog excludes original placeholders and quotes reject unavailable or invalid input', () => {
  const service = setup();
  const session = service.createSession('one');
  assert.equal(service.catalog().ready.length, 0);
  assert.equal(service.catalog().previews.length, 3);
  assert.throws(() => service.quote(session.token, 'seo_audit', input), /capability_unavailable/);
  for (const text of ['', '  ', 'x'.repeat(4001)]) assert.throws(() => service.quote(session.token, 'preview_text_workspace', { text }), /input_invalid/);
});

test('quotes bind input, expiry, confirmation and owner; successful retries capture once', async () => {
  let now = Date.now();
  const service = setup({ now: () => now });
  const a = service.createSession('one');
  const b = service.createSession('two');
  const { quote } = service.quote(a.token, 'preview_text_workspace', input);
  await assert.rejects(service.run(b.token, request(quote)), /quote_unavailable/);
  await assert.rejects(service.run(a.token, request(quote, { confirmed: false })), /confirmation_required/);
  await assert.rejects(service.run(a.token, request(quote, { input: { text: 'changed' } })), /quote_mismatch/);
  const result = await service.run(a.token, request(quote));
  assert.equal(result.job.state, 'completed');
  assert.equal(result.credits.available, 9);
  assert.deepEqual(await service.run(a.token, request(quote)), result);
  assert.equal(service.credits(a.token).entries.filter(e => e.type === 'capture').length, 1);
  assert.deepEqual(service.artifact(a.token, result.job.artifactId), result.job.result);
  assert.throws(() => service.artifact(b.token, result.job.artifactId), /artifact_unavailable/);
  assert.throws(() => service.job(b.token, result.job.id), /job_unavailable/);
  const later = service.quote(a.token, 'preview_text_workspace', input).quote;
  now += 120001;
  await assert.rejects(service.run(a.token, request(later, { idempotencyKey: 'human-expired-0001' })), /quote_expired/);
  service.logout(a.token);
  assert.throws(() => service.jobs(a.token), /session_required/);
});

test('failed execution releases reservation and concurrent retry does not double capture', async () => {
  const service = setup();
  const session = service.createSession('one');
  const { quote } = service.quote(session.token, 'preview_text_workspace', input);
  const results = await Promise.allSettled([service.run(session.token, request(quote)), service.run(session.token, request(quote))]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(service.credits(session.token).available, 9);
  const previews = createPreviewRegistry();
  const failed = setup({ previewRegistry: { get: id => previews.get(id), validate: (id, kind, value) => kind === 'output' ? false : previews.validate(id, kind, value) } });
  const owner = failed.createSession('failed');
  const badQuote = failed.quote(owner.token, 'preview_text_workspace', input).quote;
  const outcome = await failed.run(owner.token, request(badQuote));
  assert.equal(outcome.job.state, 'failed');
  assert.equal(outcome.job.result, undefined);
  assert.equal(outcome.credits.available, 10);
  assert.equal(outcome.credits.reserved, 0);
});

test('credit invariant, CSRF, session expiry and production fail closed', () => {
  const credits = new DemoCredits(1);
  credits.reserve('a', 1);
  assert.throws(() => credits.reserve('b', 1), /insufficient_credits/);
  credits.release('a'); credits.release('a');
  assert.equal(credits.snapshot().available, 1);
  let now = Date.now();
  const service = setup({ now: () => now });
  const session = service.createSession('one');
  assert.throws(() => service.authorize(session.token, 'wrong'), /csrf_invalid/);
  service.authorize(session.token, session.csrfToken);
  now += 30 * 60000;
  assert.throws(() => service.getSession(session.token), /session_required/);
  assert.throws(() => setup({ cfg: { ...config(), environment: 'production' } }).createSession('one'), /service_unavailable/);
});

test('HTTP browser session enforces origin, CSRF, private artifacts and unavailable integrations', async t => {
  const app = await createApp(config());
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  for (const path of ['/', '/tools', '/tools/preview_text_workspace', '/pricing', '/account/jobs', '/account/credits', '/account/settings', '/developers', '/help', '/legal/privacy', '/legal/terms']) {
    const page = await fetch(origin + path, { headers: { Accept: 'text/html' } });
    assert.equal(page.status, 200, path);
    assert.match(page.headers.get('content-type'), /text\/html/);
    assert.match(await page.text(), /LOCAL PREVIEW/);
  }
  const catalog = await (await fetch(origin + '/tools', { headers: { Accept: 'text/html' } })).text();
  assert.doesNotMatch(catalog, /game_launch_kit|store_art_prompt_pack/);
  assert.deepEqual((await (await fetch(origin + '/tools?format=json', { headers: { Accept: 'text/html' } })).json()).tools, []);
  const post = (path, body, headers = {}) => fetch(origin + '/api/human' + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, ...headers }, body: JSON.stringify(body) });
  assert.equal((await post('/session', {}, { Origin: 'https://example.com' })).status, 403);
  const response = await post('/session', {});
  const cookie = response.headers.get('set-cookie').split(';')[0];
  const session = await response.json();
  assert.match(response.headers.get('set-cookie'), /HttpOnly/);
  assert.equal((await post('/quotes', { capabilityId: 'preview_text_workspace', input }, { Cookie: cookie })).status, 403);
  const headers = { Cookie: cookie, 'X-CSRF-Token': session.csrfToken };
  const { quote } = await (await post('/quotes', { capabilityId: 'preview_text_workspace', input }, headers)).json();
  const { job } = await (await post('/jobs', request(quote), headers)).json();
  const artifact = await fetch(origin + '/api/human/artifacts/' + job.artifactId, { headers: { Cookie: cookie } });
  assert.deepEqual(await artifact.json(), job.result);
  assert.equal((await fetch(origin + '/api/human/artifacts/' + job.artifactId)).status, 401);
  assert.equal((await post('/checkout', {}, headers)).status, 503);
  assert.equal((await post('/uploads', {}, headers)).status, 503);
  await post('/logout', {}, headers);
  assert.equal((await fetch(origin + '/api/human/jobs', { headers: { Cookie: cookie } })).status, 401);
});
