import { randomUUID } from 'node:crypto';
import type { Registry } from './registry.ts';
import { MemoryLedger, type Ledger } from './store.ts';
import { Telemetry } from './telemetry.ts';
import { bounded, canonical, digest, GatewayError, RateLimiter } from './policy.ts';
import { createFacilitator, isProduction, paymentRequiredForTool, validatePayment } from './x402.js';

export interface Invocation { id: string; input: any; payment?: any; idempotencyKey?: string; surface: string; identity: string; paymentMethod?: 'x402' | 'demo_credits' }
export interface Outcome { status: number; body: any; requirements?: any; settlement?: any }

export function createPipeline({ registry, cfg, ledger = new MemoryLedger(), telemetry = new Telemetry(), payment = createFacilitator({ cfg }), limiter = new RateLimiter() }: {
  registry: Registry; cfg: any; ledger?: Ledger; telemetry?: Telemetry; payment?: any; limiter?: RateLimiter;
}) {
  async function execute(request: Invocation): Promise<Outcome> {
    const started = Date.now();
    const invocationId = randomUUID();
    const capability = registry.get(request.id);
    let claimedKey: string | undefined;
    let settlementStarted = false;
    let payer: string | undefined;
    const emit = (event: string, status?: number, transaction?: string) => telemetry.emit({
      event, invocation_id: invocationId, capability_id: request.id, version: capability?.version || 'unknown', surface: request.surface,
      environment: cfg.environment, mode: payment.mode, at: Date.now(), latency_ms: Date.now() - started,
      price_atomic: capability?.price.atomic || '0', cost_estimate_atomic: capability?.limits.costAtomic || '0',
      status, payer_hash: telemetry.payer(payer), transaction,
    });
    const delivered = (outcome: Outcome) => { emit('response_delivered', outcome.status); return outcome; };
    emit('request_received');
    try {
      limiter.check(request.identity);
      if (request.paymentMethod === 'demo_credits' && (request.surface !== 'browser' || payment.mode !== 'stub' || !cfg.stubMode)) throw new GatewayError('payment_method_denied', 403);
      if (!capability || capability.status === 'disabled' || cfg.disabledCapabilities?.includes(request.id)) throw new GatewayError('capability_unavailable', 404);
      if (isProduction(cfg)) throw new GatewayError(cfg.stubMode ? 'production_stub_denied' : 'live_payments_disabled', 503);
      if (!cfg.stubMode && payment.mode !== 'simulation') throw new GatewayError('live_payments_disabled', 503);
      if (capability.status === 'placeholder' && !cfg.stubMode) throw new GatewayError('placeholder_noncommercial', 403);
      if (Buffer.byteLength(canonical(request.input) || '') > capability.limits.maxPayloadBytes) throw new GatewayError('payload_too_large', 413);
      if (!registry.validate(request.id, 'input', request.input)) throw new GatewayError('input_invalid', 400);
      const requirements = paymentRequiredForTool(request.id, cfg, registry);
      if (!request.payment) {
        emit('payment_required', 402);
        return delivered({ status: 402, body: { ...requirements, mode: cfg.stubMode ? 'stub' : 'simulation', listed: false }, requirements });
      }
      if (cfg.stubMode && request.payment.stub !== true) throw new GatewayError('payment_invalid', 402);
      if (request.idempotencyKey !== undefined && !/^[A-Za-z0-9_-]{8,128}$/.test(request.idempotencyKey)) throw new GatewayError('idempotency_key_invalid', 400);
      if (!cfg.stubMode && !request.idempotencyKey) throw new GatewayError('idempotency_key_required', 428);
      const authorization = cfg.stubMode ? undefined : validatePayment(request.payment, requirements, Date.now(), false);
      payer = authorization?.from;
      const fingerprint = digest({ id: request.id, version: capability.version, input: request.input, requirements, payment: request.payment });
      const paymentIdentity = cfg.stubMode ? { stub: true, identity: request.identity } : {
        from: authorization.from.toLowerCase(), nonce: authorization.nonce.toLowerCase(), network: cfg.network, asset: cfg.usdcAsset.toLowerCase(),
      };
      const key = digest({ paymentIdentity, key: request.idempotencyKey || randomUUID() });
      const replay = cfg.stubMode ? key : digest(paymentIdentity);
      const cached = ledger.find(key);
      if (cached) {
        if (cached.fingerprint !== fingerprint) throw new GatewayError('idempotency_conflict', 409);
        if (!cached.response) throw new GatewayError('invocation_pending_reconciliation', 409);
        return delivered(cached.response);
      }
      if (!cfg.stubMode) validatePayment(request.payment, requirements);
      const verification = await bounded(() => payment.verify({ payload: request.payment, requirements }), 10000) as any;
      if (verification?.isValid !== true) throw new GatewayError('payment_invalid', 402);
      emit('payment_verified');
      const existing = ledger.claim(key, fingerprint, replay);
      if (existing) {
        if (existing.fingerprint !== fingerprint) throw new GatewayError('idempotency_conflict', 409);
        if (!existing.response) throw new GatewayError('invocation_pending_reconciliation', 409);
        return delivered(existing.response);
      }
      claimedKey = key;
      const price = BigInt(capability.price.atomic);
      const cost = BigInt(capability.limits.costAtomic);
      if (cost > price || (price - cost) * 10000n < price * BigInt(capability.limits.minMarginBps)) throw new GatewayError('margin_ceiling', 503);
      ledger.reserve(request.id, new Date().toISOString().slice(0, 10), capability.limits.costAtomic, capability.limits.dailyCostAtomic);
      emit('execution_started');
      const result = await bounded(signal => Promise.resolve(capability.handler(request.input, { signal })), capability.limits.timeoutMs);
      if (!registry.validate(request.id, 'output', result)) throw new GatewayError('output_invalid', 500);
      if (Buffer.byteLength(canonical(result)) > capability.limits.maxOutputBytes) throw new GatewayError('output_too_large', 500);
      emit('execution_completed');
      settlementStarted = true;
      const settlement = await bounded(() => payment.settle({ payload: request.payment, requirements }), 10000) as any;
      if (settlement?.success !== true) throw new GatewayError('settlement_failed', 502);
      emit('settlement_completed', undefined, settlement.mode === 'live' ? settlement.transaction : undefined);
      const publicSettlement = { success: true, mode: payment.mode, network: cfg.network,
        ...(payment.mode === 'live' ? { transaction: settlement.transaction } : {}) };
      const outcome = { status: 200, body: { ok: true, tool: request.id, listed: false, mode: payment.mode, result, settlement: publicSettlement }, settlement: publicSettlement };
      ledger.finish(key, 'completed', outcome);
      return delivered(outcome);
    } catch (error) {
      const known = error instanceof GatewayError;
      const status = known ? error.status : 500;
      const code = known ? error.message : 'internal_error';
      emit(settlementStarted ? 'settlement_failed' : 'execution_failed', status);
      const outcome = { status, body: { ok: false, error: code, invocationId } };
      if (claimedKey) {
        try { ledger.finish(claimedKey, settlementStarted ? 'settlement_unknown' : 'failed', outcome); } catch { }
      }
      return delivered(outcome);
    }
  }
  return { execute, ledger, telemetry };
}
