import { Registry } from '../src/registry.ts';
import { loadConfig } from '../src/config.js';
import { paymentRequiredForTool } from '../src/x402.js';

export function fixture(overrides = {}) {
  const cfg = { ...loadConfig(), environment: 'test', stubMode: false, listed: false, disabledCapabilities: [] };
  const capability = {
    id: 'test_utility', version: '1.0.0', category: 'test', description: 'Test-only utility', tags: [],
    status: 'enabled', commercial: true, providerId: 'av-hub',
    inputSchema: { type: 'object', properties: { value: { type: 'string' } }, additionalProperties: false },
    outputSchema: { type: 'object', required: ['value'], properties: { value: { type: 'string' } }, additionalProperties: false },
    price: { mode: 'fixed', atomic: '10000', currency: 'USDC' },
    discovery: { public: true, mcp: true, bazaar: true, plugin: false },
    limits: { timeoutMs: 1000, maxPayloadBytes: 1000, maxOutputBytes: 1000, costAtomic: '0', dailyCostAtomic: '0', minMarginBps: 0 },
    handler: async input => ({ value: input.value || 'ok' }),
    ...overrides,
  };
  const registry = new Registry().register(capability);
  const requirements = paymentRequiredForTool(capability.id, cfg, registry);
  const payload = {
    x402Version: 2, accepted: requirements.accepts[0], resource: requirements.resource,
    payload: { signature: `0x${'ab'.repeat(65)}`, authorization: {
      from: `0x${'11'.repeat(20)}`, to: cfg.payTo, value: '10000', nonce: `0x${'22'.repeat(32)}`,
      validAfter: String(Math.floor(Date.now() / 1000) - 1), validBefore: String(Math.floor(Date.now() / 1000) + 50),
    } },
  };
  const payment = { mode: 'simulation', verify: async () => ({ isValid: true }), settle: async () => ({ success: true, mode: 'simulation' }) };
  const invocation = { id: capability.id, input: {}, payment: payload, idempotencyKey: 'test-key-0001', surface: 'http', identity: '127.0.0.1' };
  return { cfg, registry, capability, requirements, payload, payment, invocation };
}
