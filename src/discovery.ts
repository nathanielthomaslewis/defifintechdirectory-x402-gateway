import type { Capability, Registry } from './registry.ts';
import { joinUrl, paymentRequiredForTool } from './x402.js';

const resourcePath = (capability: Capability) => capability.category === 'skill-pack'
  ? `/packs/${capability.id}` : `/tools/${capability.id}`;

export function describe(capability: Capability, baseUrl: string) {
  return {
    id: capability.id, version: capability.version, description: capability.description,
    category: capability.category, tags: capability.tags, status: capability.status,
    commercial: capability.commercial, providerId: capability.providerId, price: capability.price,
    inputSchema: capability.inputSchema, outputSchema: capability.outputSchema,
    invocationUrl: joinUrl(baseUrl, resourcePath(capability)),
  };
}

export function mcpTools(registry: Registry, cfg?: any) {
  return registry.visible('mcp').map(capability => ({
    name: capability.id, description: `${capability.description} Price: ${capability.price.atomic} atomic USDC. Payment authorization required before paid execution.`,
    inputSchema: capability.inputSchema,
    _meta: { 'x402/price': capability.price, 'x402/commercial': capability.commercial,
      ...(cfg ? { 'x402/payment-required': paymentRequiredForTool(capability.id, cfg, registry) } : {}) },
  }));
}

export function catalog(registry: Registry, cfg: any) {
  return { version: '2', listed: !!cfg.listed, paymentsLive: !!cfg.livePaymentsEnabled, network: cfg.network, asset: cfg.usdcAsset,
    capabilities: registry.visible('public').filter(capability => !cfg.disabledCapabilities?.includes(capability.id)).map(capability => ({
      ...describe(capability, cfg.baseUrl), payment: paymentRequiredForTool(capability.id, cfg, registry),
    })) };
}

export function pluginPackage(registry: Registry, cfg: any) {
  return {
    schemaVersion: '1', listed: false, private: true, transport: 'streamable-http',
    name: cfg.serviceName, mcpUrl: joinUrl(cfg.baseUrl, '/mcp'),
    tools: mcpTools(registry, cfg).filter(tool => !cfg.disabledCapabilities?.includes(tool.name)),
  };
}

export function externalDiscovery(registry: Registry, cfg: any) {
  return {
    schemaVersion: '1', listed: !!cfg.listed, publishable: !!cfg.listed, source: 'registry',
    resources: registry.visible('public').filter(capability => !cfg.disabledCapabilities?.includes(capability.id)).map(capability => ({
      id: capability.id, url: joinUrl(cfg.baseUrl, resourcePath(capability)),
      description: capability.description, inputSchema: capability.inputSchema,
      outputSchema: capability.outputSchema, payment: paymentRequiredForTool(capability.id, cfg, registry),
    })),
  };
}

const httpMethod = (capability: Capability) => capability.category === 'skill-pack' ? 'GET' : 'POST';

export function wellKnownX402(registry: Registry, cfg: any) {
  const entries = registry.visible('public').filter(capability => !cfg.disabledCapabilities?.includes(capability.id));
  return { version: 1, resources: entries.map(capability => joinUrl(cfg.baseUrl, resourcePath(capability))),
    resource_methods: Object.fromEntries(entries.map(capability => [joinUrl(cfg.baseUrl, resourcePath(capability)), [httpMethod(capability)]])),
    instructions: 'POST JSON to /tools/<id> (GET for /packs/<id>). Unpaid requests return HTTP 402 with PAYMENT-REQUIRED (x402 v2, Base USDC).' };
}

export function richWellKnownX402(registry: Registry, cfg: any) {
  return { x402Version: 2, source: 'registry', resources: registry.visible('public')
    .filter(capability => !cfg.disabledCapabilities?.includes(capability.id))
    .map(capability => ({ id: capability.id, url: joinUrl(cfg.baseUrl, resourcePath(capability)),
      description: capability.description, price: capability.price, inputSchema: capability.inputSchema, outputSchema: capability.outputSchema,
      accepts: paymentRequiredForTool(capability.id, cfg, registry)!.accepts })) };
}

export function llmsText(registry: Registry, cfg: any) {
  const entries = registry.visible('public').filter(capability => !cfg.disabledCapabilities?.includes(capability.id));
  return [`# ${cfg.serviceName}`, 'x402 paid tools on Base mainnet USDC (eip155:8453).',
    `MCP: ${joinUrl(cfg.baseUrl, '/mcp')}`, 'Send a request to a tool URL, read its HTTP 402 PAYMENT-REQUIRED challenge, then retry with PAYMENT-SIGNATURE.',
    'Limits: 250 paid calls per UTC day overall; 60 per payer address. A concurrent request can be refused after signing.',
    ...(entries.some(capability => capability.category === 'launch-bundle') ? ['', '## Game launch bundles (one call = full platform launch kit)',
      ...entries.filter(capability => capability.category === 'launch-bundle').map(capability => `* ${capability.id}: POST ${joinUrl(cfg.baseUrl, resourcePath(capability))} ${Number(capability.price.atomic) / 1e6} USDC. Body: {"title","genre","hook", optional platform fields, optional "evidence" booleans}.`), '', '## All tools'] : []),
    ...entries.map(capability => `- ${capability.id}: ${capability.description} Price: ${Number(capability.price.atomic) / 1e6} USDC. ${httpMethod(capability)} ${joinUrl(cfg.baseUrl, resourcePath(capability))}`), ''].join('\n');
}

// OpenAPI 3.1 document for crawlers such as x402scan, which read /openapi.json and then probe each
// operation for a real 402. Generated from the registry so it never drifts from the live tools.
export function openApi(registry: Registry, cfg: any) {
  const entries = registry.visible('public').filter(capability => !cfg.disabledCapabilities?.includes(capability.id));
  const paths: Record<string, any> = {};
  for (const capability of entries) {
    const usd = Number(capability.price.atomic) / 1e6;
    const isPack = capability.category === 'skill-pack';
    paths[resourcePath(capability)] = { [isPack ? 'get' : 'post']: {
      operationId: capability.id, summary: capability.description, tags: capability.tags,
      description: `${capability.description} Paid with x402: ${usd} USDC on Base (${cfg.network}). The first request returns HTTP 402 with a PAYMENT-REQUIRED header; retry with PAYMENT-SIGNATURE.`,
      ...(!isPack ? { requestBody: { required: true, content: { 'application/json': { schema: capability.inputSchema } } } } : {}),
      responses: {
        '200': { description: 'Result (after payment settles).', content: isPack ? { 'application/zip': { schema: { type: 'string', format: 'binary' } } } : { 'application/json': { schema: capability.outputSchema } } },
        '402': { description: 'Payment required. See the PAYMENT-REQUIRED header (base64 JSON, x402 v2).' },
        '400': { description: 'Input failed schema validation.' }, '429': { description: 'Daily paid-call cap reached.' },
      },
      'x-x402': { price: capability.price, accepts: paymentRequiredForTool(capability.id, cfg, registry)!.accepts },
      'x-payment-info': { price: { mode: 'fixed', currency: 'USD', amount: usd.toFixed(6) }, protocols: [{ x402: {} }] },
    } };
  }
  return { openapi: '3.1.0',
    info: { title: cfg.serviceName, version: '1.1.0', description: 'x402 paid tools on Base mainnet USDC. Discovery: /.well-known/x402, /llms.txt, MCP at /mcp.',
      'x-guidance': 'POST JSON to /tools/<id>, or GET /packs/<id>. Unpaid requests return HTTP 402 with a PAYMENT-REQUIRED header (x402 v2, Base USDC); retry with PAYMENT-SIGNATURE.',
      ...(process.env.CONTACT_EMAIL ? { contact: { name: 'AV Hub', email: process.env.CONTACT_EMAIL, url: cfg.baseUrl.replace(/\/+$/, '') } } : {}) },
    servers: [{ url: cfg.baseUrl.replace(/\/+$/, '') }], paths };
}
