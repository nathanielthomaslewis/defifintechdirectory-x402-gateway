import type { Capability, Registry } from './registry.ts';
import { paymentRequiredForTool } from './x402.js';

export function describe(capability: Capability, baseUrl: string) {
  return {
    id: capability.id, version: capability.version, description: capability.description,
    category: capability.category, tags: capability.tags, status: capability.status,
    commercial: capability.commercial, providerId: capability.providerId, price: capability.price,
    inputSchema: capability.inputSchema, outputSchema: capability.outputSchema,
    invocationUrl: `${baseUrl}/tools/${capability.id}`,
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
    name: cfg.serviceName, mcpUrl: `${cfg.baseUrl}/mcp`,
    tools: mcpTools(registry, cfg).filter(tool => !cfg.disabledCapabilities?.includes(tool.name)),
  };
}

export function externalDiscovery(registry: Registry, cfg: any) {
  return {
    schemaVersion: '1', listed: !!cfg.listed, publishable: !!cfg.listed, source: 'registry',
    resources: registry.visible('public').filter(capability => !cfg.disabledCapabilities?.includes(capability.id)).map(capability => ({
      id: capability.id, url: `${cfg.baseUrl}/tools/${capability.id}`,
      description: capability.description, inputSchema: capability.inputSchema,
      outputSchema: capability.outputSchema, payment: paymentRequiredForTool(capability.id, cfg, registry),
    })),
  };
}

export function wellKnownX402(registry: Registry, cfg: any) {
  return { x402Version: 2, source: 'registry', resources: registry.visible('public')
    .filter(capability => !cfg.disabledCapabilities?.includes(capability.id))
    .map(capability => ({ id: capability.id, url: `${cfg.baseUrl}/tools/${capability.id}`,
      description: capability.description, price: capability.price, inputSchema: capability.inputSchema, outputSchema: capability.outputSchema,
      accepts: paymentRequiredForTool(capability.id, cfg, registry)!.accepts })) };
}

export function llmsText(registry: Registry, cfg: any) {
  const entries = registry.visible('public').filter(capability => !cfg.disabledCapabilities?.includes(capability.id));
  return [`# ${cfg.serviceName}`, 'x402 paid tools on Base mainnet USDC (eip155:8453).',
    `MCP: ${cfg.baseUrl}/mcp`, 'Send a request to a tool URL, read its HTTP 402 PAYMENT-REQUIRED challenge, then retry with PAYMENT-SIGNATURE.',
    'Limits: 250 paid calls per UTC day overall; 60 per payer address. A concurrent request can be refused after signing.',
    ...entries.map(capability => `- ${capability.id}: ${capability.description} Price: ${Number(capability.price.atomic) / 1e6} USDC. ${cfg.baseUrl}/tools/${capability.id}`), ''].join('\n');
}
