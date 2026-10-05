import test from 'node:test';
import assert from 'node:assert/strict';
import { createPipeline } from '../src/pipeline.ts';
import { createFacilitator, decodePaymentSignature, verifyPayment, settlePayment } from '../src/x402.js';
import { fixture } from './helpers.js';

test('unpaid returns a challenge without verification, execution or settlement', async () => {
  const setup = fixture({ handler: () => assert.fail('handler ran') });
  setup.payment.verify = () => assert.fail('verification ran');
  const result = await createPipeline(setup).execute({ ...setup.invocation, payment: undefined });
  assert.equal(result.status, 402);
  assert.equal(result.requirements.accepts[0].amount, '10000');
});

for (const response of [{ success: false }, {}, { success: 'true' }]) test(`settlement ${JSON.stringify(response)} withholds result`, async () => {
  const setup = fixture();
  setup.payment.settle = async () => response;
  const result = await createPipeline(setup).execute(setup.invocation);
  assert.equal(result.status, 502);
  assert.equal(result.body.ok, false);
  assert.equal(result.body.result, undefined);
  assert.equal(result.settlement, undefined);
});

for (const result of [{}, { isValid: 'true' }, { isValid: false }]) test(`verification ${JSON.stringify(result)} does not execute`, async () => {
  const setup = fixture({ handler: () => assert.fail('handler ran') });
  setup.payment.verify = async () => result;
  assert.equal((await createPipeline(setup).execute(setup.invocation)).status, 402);
});

test('awaits async handler before settlement; rejects asynchronous errors', async () => {
  let completed = false;
  const setup = fixture({ handler: async () => { await new Promise(resolve => setTimeout(resolve, 10)); completed = true; return { value: 'awaited' }; } });
  setup.payment.settle = async () => { assert.equal(completed, true); return { success: true }; };
  assert.equal((await createPipeline(setup).execute(setup.invocation)).body.result.value, 'awaited');
  const failure = fixture({ handler: async () => { throw new Error('secret'); } });
  failure.payment.settle = () => assert.fail('settled handler failure');
  const result = await createPipeline(failure).execute(failure.invocation);
  assert.equal(result.status, 500);
  assert.equal(JSON.stringify(result).includes('secret'), false);
});

test('concurrent retries execute and settle once; cross-surface retry returns same result', async () => {
  let executions = 0;
  let settlements = 0;
  const setup = fixture({ handler: async () => { executions++; await new Promise(resolve => setTimeout(resolve, 20)); return { value: 'once' }; } });
  setup.payment.settle = async () => { settlements++; return { success: true }; };
  const pipeline = createPipeline(setup);
  const results = await Promise.all([pipeline.execute(setup.invocation), pipeline.execute(setup.invocation)]);
  assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
  assert.equal((await pipeline.execute({ ...setup.invocation, surface: 'mcp' })).status, 200);
  assert.equal(executions, 1);
  assert.equal(settlements, 1);
  setup.payment.verify = () => assert.fail('cached response must not re-verify a settled authorization');
  assert.equal((await pipeline.execute(setup.invocation)).status, 200);
  setup.payment.verify = async () => ({ isValid: true });
  assert.equal((await pipeline.execute({ ...setup.invocation, input: { value: 'changed' } })).body.error, 'idempotency_conflict');
  assert.equal((await pipeline.execute({ ...setup.invocation, idempotencyKey: 'different-key' })).body.error, 'payment_replayed');
});

test('failed settlement retries never repeat execution or settlement', async () => {
  let executions = 0;
  let settlements = 0;
  const setup = fixture({ handler: () => { executions++; return { value: 'private' }; } });
  setup.payment.settle = async () => { settlements++; throw new Error('uncertain'); };
  const pipeline = createPipeline(setup);
  await pipeline.execute(setup.invocation);
  const retry = await pipeline.execute(setup.invocation);
  assert.equal(retry.body.result, undefined);
  assert.equal(executions, 1);
  assert.equal(settlements, 1);
});

test('expiry, recipient, amount, resource and nonce validation fail closed', async () => {
  for (const mutate of [
    payload => { payload.payload.authorization.validBefore = '1'; },
    payload => { payload.payload.authorization.to = `0x${'00'.repeat(20)}`; },
    payload => { payload.payload.authorization.value = '1'; },
    payload => { payload.resource.url = 'https://other.example'; },
    payload => { payload.payload.authorization.nonce = 'invalid'; },
    payload => { payload.accepted.amount = '1'; },
  ]) {
    const setup = fixture({ handler: () => assert.fail('handler ran') });
    const payload = structuredClone(setup.payload);
    mutate(payload);
    assert.equal((await createPipeline(setup).execute({ ...setup.invocation, payment: payload })).status, 402);
  }
});

test('production denies stub via pipeline and direct helpers', async () => {
  const setup = fixture();
  setup.cfg.environment = 'production';
  setup.cfg.stubMode = true;
  const payload = { stub: true };
  assert.equal((await createPipeline(setup).execute({ ...setup.invocation, payment: payload })).status, 503);
  assert.equal((await verifyPayment({ cfg: setup.cfg, payload, requirements: setup.requirements })).isValid, false);
  assert.equal((await settlePayment({ cfg: setup.cfg, payload, requirements: setup.requirements })).success, false);
});

test('live execution disabled even if caller sets live flag', async () => {
  const setup = fixture();
  setup.cfg.livePaymentsEnabled = true;
  setup.payment.mode = 'live';
  setup.payment.verify = () => assert.fail('network must not be called');
  assert.equal((await createPipeline(setup).execute(setup.invocation)).status, 503);
});

test('facilitator flags missing, false, wrong type and non-2xx never succeed', async () => {
  const setup = fixture();
  for (const response of [{}, { isValid: false, success: false }, { isValid: 'true', success: 'true' }]) {
    const adapter = createFacilitator({ cfg: setup.cfg, client: { verify: async () => response, settle: async () => response } });
    assert.equal((await adapter.verify({ payload: setup.payload, requirements: setup.requirements })).isValid, false);
    assert.equal((await adapter.settle({ payload: setup.payload, requirements: setup.requirements })).success, false);
  }
  const adapter = createFacilitator({ cfg: { ...setup.cfg, facilitatorUrl: 'https://facilitator.payai.network' }, fetchImpl: async () => new Response(JSON.stringify({ isValid: true, success: true }), { status: 500 }) });
  assert.equal((await adapter.verify({ payload: setup.payload, requirements: setup.requirements })).isValid, false);
  assert.equal((await adapter.settle({ payload: setup.payload, requirements: setup.requirements })).success, false);
});

test('malformed payment headers reject; arbitrary stub objects are not accepted', async () => {
  assert.equal(decodePaymentSignature('not-base64!?'), null);
  assert.equal(decodePaymentSignature(Buffer.from('[]').toString('base64')), null);
  const setup = fixture();
  setup.cfg.stubMode = true;
  assert.equal((await verifyPayment({ cfg: setup.cfg, payload: { arbitrary: true }, requirements: setup.requirements })).isValid, false);
});
