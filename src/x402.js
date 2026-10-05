import { createRegistry } from './registry.ts';
import { bounded, canonical, GatewayError } from './policy.ts';

export function paymentRequiredForTool(toolId, cfg, registry = createRegistry()) {
  const capability = registry.get(toolId);
  if (!capability) return null;
  return {
    x402Version: 2, error: 'PAYMENT_REQUIRED',
    resource: { url: `${cfg.baseUrl}/tools/${toolId}`, description: capability.description, mimeType: 'application/json' },
    accepts: [{ scheme: 'exact', network: cfg.network, amount: capability.price.atomic, asset: cfg.usdcAsset,
      payTo: cfg.payTo, maxTimeoutSeconds: 60, extra: { name: 'USDC', version: '2' } }],
  };
}

export const encodePaymentRequired = value => Buffer.from(JSON.stringify(value)).toString('base64');
export const encodePaymentResponse = encodePaymentRequired;

export function decodePaymentSignature(value) {
  if (!value) return null;
  if (value === 'stub-ok') return { stub: true };
  if (typeof value !== 'string' || value.length > 16384 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64').toString('utf8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch { return null; }
}

export function isProduction(cfg) {
  return cfg.environment === 'production' || process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
}

export function validatePayment(payload, requirements, now = Date.now(), checkTime = true) {
  if (!payload || payload.x402Version !== 2 || canonical(payload.accepted) !== canonical(requirements.accepts[0])) throw new GatewayError('payment_requirements_mismatch', 402);
  if (payload.resource?.url !== requirements.resource.url) throw new GatewayError('payment_resource_mismatch', 402);
  const authorization = payload.payload?.authorization;
  if (!authorization || !/^0x[0-9a-fA-F]{40}$/.test(authorization.from) || !/^0x[0-9a-fA-F]{64}$/.test(authorization.nonce)) throw new GatewayError('payment_malformed', 402);
  if (typeof payload.payload.signature !== 'string' || !/^0x[0-9a-fA-F]{130}$/.test(payload.payload.signature)) throw new GatewayError('payment_malformed', 402);
  if (authorization.to?.toLowerCase() !== requirements.accepts[0].payTo.toLowerCase() || authorization.value !== requirements.accepts[0].amount) throw new GatewayError('payment_authorization_mismatch', 402);
  const before = Number(authorization.validBefore);
  const after = Number(authorization.validAfter);
  if (!Number.isSafeInteger(before) || !Number.isSafeInteger(after) || after < 0 || before <= after || (checkTime && (before <= now / 1000 || after > now / 1000 || before - now / 1000 > 60))) throw new GatewayError('payment_expired_or_invalid_window', 402);
  return authorization;
}

export function createFacilitator({ cfg, client = undefined, fetchImpl = fetch }) {
  async function invoke(operation, payload, requirements) {
    return bounded(async signal => {
      if (client) return client[operation](payload, requirements.accepts[0]);
      const endpoint = new URL(cfg.facilitatorUrl);
      if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || !['facilitator.payai.network', 'api.cdp.coinbase.com'].includes(endpoint.hostname)) throw new Error('facilitator_not_allowed');
      if (endpoint.hostname === 'api.cdp.coinbase.com') throw new Error('authenticated_cdp_client_required');
      const response = await fetchImpl(`${cfg.facilitatorUrl.replace(/\/$/, '')}/${operation}`, {
        method: 'POST', redirect: 'error', signal, headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ x402Version: 2, paymentPayload: payload, paymentRequirements: requirements.accepts[0] }),
      });
      if (!response.ok) throw new Error('facilitator_http_error');
      const reader = response.body.getReader();
      let total = 0;
      const chunks = [];
      try {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          total += chunk.value.byteLength;
          if (total > 16384) throw new Error('facilitator_response_too_large');
          chunks.push(Buffer.from(chunk.value));
        }
      } finally { await reader.cancel(); }
      return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    }, 10000);
  }
  return {
    mode: cfg.stubMode ? 'stub' : 'live',
    async verify({ payload, requirements }) {
      if (cfg.stubMode) return { isValid: !isProduction(cfg) && payload?.stub === true, mode: 'stub' };
      try {
        validatePayment(payload, requirements);
        const result = await invoke('verify', payload, requirements);
        return { isValid: result?.isValid === true, payer: result?.payer, mode: 'live' };
      } catch { return { isValid: false, invalidReason: 'verification_failed' }; }
    },
    async settle({ payload, requirements }) {
      if (cfg.stubMode) return { success: !isProduction(cfg) && payload?.stub === true, mode: 'stub', network: cfg.network };
      try {
        validatePayment(payload, requirements);
        const result = await invoke('settle', payload, requirements);
        const success = result?.success === true && /^0x[0-9a-fA-F]{64}$/.test(result?.transaction || '') && result?.network === cfg.network;
        return success ? { success: true, transaction: result.transaction, network: result.network, payer: result.payer, mode: 'live' } : { success: false, error: 'settlement_failed' };
      } catch { return { success: false, error: 'settlement_unknown' }; }
    },
  };
}

export const verifyPayment = ({ cfg, ...request }) => createFacilitator({ cfg }).verify(request);
export const settlePayment = ({ cfg, ...request }) => createFacilitator({ cfg }).settle(request);
