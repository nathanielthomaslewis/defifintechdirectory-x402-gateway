import express from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { loadConfig } from './config.js';
import { createRegistry } from './registry.ts';
import { createPipeline } from './pipeline.ts';
import { catalog, describe, mcpTools, wellKnownX402, llmsText } from './discovery.ts';
import { decodePaymentSignature, encodePaymentRequired, encodePaymentResponse } from './x402.js';
import { createHumanRouter } from './human-router.js';
import { createHumanPages } from './human-pages.js';
import { operatorAuthorized, operatorSnapshot, hitSummary, hitSummaryHtml } from './operator.ts';
import { hitOutcome, hitRow, MemoryWeek1Store, SupabaseWeek1Store } from './week1-store.ts';
import { randomBytes } from 'node:crypto';

export async function createApp(overrides = {}, dependencies = {}) {
  const cfg = { ...loadConfig(), ...overrides };
  cfg.listed = cfg.testMode === 'week1';
  cfg.livePaymentsEnabled = cfg.testMode === 'week1' && !cfg.stubMode && !!(cfg.payTo && cfg.cdpApiKeyId && cfg.cdpApiKeySecret);
  if (cfg.testMode === 'week1' && cfg.environment === 'production') {
    const missing = [];
    if (cfg.stubMode) missing.push('STUB_MODE=0');
    for (const [key, name] of [['payTo', 'PAY_TO'], ['cdpApiKeyId', 'CDP_API_KEY_ID'], ['cdpApiKeySecret', 'CDP_API_KEY_SECRET'], ['supabaseUrl', 'SUPABASE_URL'], ['supabaseServiceRoleKey', 'SUPABASE_SERVICE_ROLE_KEY'], ['hitLogSalt', 'HIT_LOG_SALT'], ['operatorToken', 'OPERATOR_TOKEN']]) if (!cfg[key]) missing.push(name);
    if (cfg.network !== 'eip155:8453') missing.push('NETWORK=eip155:8453');
    try { if (cfg.facilitatorProvider !== 'cdp' || new URL(cfg.facilitatorUrl).hostname !== 'api.cdp.coinbase.com') missing.push('FACILITATOR_PROVIDER=cdp'); }
    catch { missing.push('FACILITATOR_URL'); }
    if (missing.length) throw new Error(`Week1 production configuration missing or invalid: ${missing.join(', ')}`);
  }
  const registry = dependencies.registry || createRegistry(cfg);
  const week1Store = dependencies.week1Store || (cfg.testMode === 'week1' && cfg.supabaseUrl && cfg.supabaseServiceRoleKey ? new SupabaseWeek1Store(cfg) : new MemoryWeek1Store());
  const pipeline = createPipeline({ ...dependencies, cfg, registry, week1Store });
  if (cfg.testMode === 'week1' && typeof week1Store.write === 'function') pipeline.telemetry.setHitSink(row => week1Store.write(row));
  const hitSalt = cfg.hitLogSalt || randomBytes(32).toString('hex');
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', false);
  const requestIp = req => process.env.VERCEL && req.get('x-vercel-forwarded-for')?.split(',')[0].trim() || req.ip;
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    if (cfg.testMode !== 'week1' || req.path.startsWith('/operator')) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Access-Control-Expose-Headers', 'PAYMENT-REQUIRED, PAYMENT-RESPONSE');
    next();
  });
  app.use((req, res, next) => {
    if (cfg.testMode !== 'week1') return next();
    const started = Date.now();
    let recorded = false;
    const record = () => {
      if (recorded) return;
      recorded = true;
      const path = req.path;
      const surface = path.startsWith('/mcp') ? 'mcp' : path === '/.well-known/x402' ? 'well-known' : path === '/llms.txt' ? 'llms' : ['/tools', '/capabilities'].some(prefix => path === prefix || path.startsWith(`${prefix}/`)) && !path.startsWith('/tools/') ? 'discovery' : 'http';
      const outcome = res.writableFinished ? res.locals.hitOutcome || hitOutcome(res.locals.hitStatus || res.statusCode, res.locals.hitCode, !!res.locals.hitSettled) : 'error';
      const toolId = res.locals.hitToolId || (path.startsWith('/tools/') ? path.slice(7) : null);
      const amountAtomic = res.locals.hitAmountAtomic || registry.get(toolId)?.price.atomic || '0';
      const ip = requestIp(req);
      pipeline.telemetry.hit(hitRow({ ts: started, path, method: req.method, surface, toolId,
        userAgent: req.get('user-agent'), referer: req.get('referer'), ip,
        hadPaymentHeader: !!req.get('payment-signature') || !!req.body?._meta?.['x402/payment'] || !!req.body?.params?._meta?.['x402/payment'], outcome,
        amountAtomic, payerAddress: res.locals.hitPayer, txHash: res.locals.hitTx, latencyMs: Date.now() - started }, hitSalt));
    };
    res.on('finish', record);
    res.on('close', record);
    next();
  });
  app.use(express.json({ limit: '1mb' }));
  const human = createHumanRouter({ cfg, registry });
  app.use('/api/human', human.router);
  app.use(createHumanPages({ service: human.service, cfg, registry }));
  app.locals.humanService = human.service;
  const enabled = () => registry.visible('public').filter(entry => !cfg.disabledCapabilities.includes(entry.id));
  app.get('/health', (_req, res) => res.json({
    ok: true, service: cfg.serviceName, testMode: cfg.testMode === 'week1', listed: cfg.listed, paymentsLive: cfg.livePaymentsEnabled,
    stubMode: cfg.stubMode, network: cfg.network, phase: 2, ledgerDurable: pipeline.ledger.durable,
  }));
  app.get('/operator/analytics', (req, res) => {
    if (!cfg.operatorReadToken) return res.status(503).json({ error: 'operator_unconfigured' });
    if (!operatorAuthorized(req.get('authorization'), cfg.operatorReadToken)) return res.status(401).json({ error: 'unauthorized' });
    return res.json(operatorSnapshot(registry, pipeline.telemetry));
  });
  app.get('/operator/hits', async (req, res) => {
    if (!cfg.operatorToken || typeof week1Store.readHits !== 'function') return res.status(503).json({ error: 'operator_unconfigured' });
    if (!operatorAuthorized(req.get('authorization'), cfg.operatorToken)) return res.status(401).json({ error: 'unauthorized' });
    try {
      const { rows, truncated } = await week1Store.readHits();
      const summary = hitSummary(rows, truncated);
      if (req.query.format === 'json' || req.accepts(['html', 'json']) === 'json') return res.json(summary);
      res.set('Content-Security-Policy', "default-src 'none'; style-src 'none'; frame-ancestors 'none'; base-uri 'none'");
      return res.type('html').send(hitSummaryHtml(summary));
    } catch { return res.status(503).json({ error: 'hit_log_unavailable' }); }
  });
  app.get('/tools', (_req, res) => res.json({ listed: cfg.listed, tools: enabled().map(entry => describe(entry, cfg.baseUrl)) }));
  app.get('/capabilities', (_req, res) => res.json(catalog(registry, cfg)));
  app.get('/.well-known/x402', (_req, res) => res.json(wellKnownX402(registry, cfg)));
  app.get('/llms.txt', (_req, res) => res.type('text/plain').send(llmsText(registry, cfg)));
  app.get('/capabilities/:id', (req, res) => {
    const capability = enabled().find(entry => entry.id === req.params.id);
    if (!capability) return res.status(404).json({ error: 'capability_unavailable' });
    res.json(catalog(registry, cfg).capabilities.find(entry => entry.id === capability.id));
  });
  app.get('/robots.txt', (_req, res) => res.type('text/plain').send(cfg.testMode === 'week1' ? 'User-agent: *\nDisallow: /operator/\n' : 'User-agent: *\nDisallow: /\n'));

  const privateAllowed = req => cfg.stubMode && ['development', 'test'].includes(cfg.environment) && !process.env.VERCEL &&
    ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);

  async function invoke(req, res) {
    const capability = registry.get(req.params.toolId);
    if (capability && !capability.discovery.public && !privateAllowed(req)) return res.status(404).json({ error: 'capability_unavailable' });
    const outcome = await pipeline.execute({
      id: req.params.toolId, input: req.method === 'GET' ? req.query : req.body || {},
      payment: decodePaymentSignature(req.get('payment-signature')),
      idempotencyKey: req.get('idempotency-key'), surface: 'http', identity: requestIp(req),
    });
    res.locals.hitStatus = outcome.status; res.locals.hitCode = outcome.body?.error;
    res.locals.hitToolId = req.params.toolId; res.locals.hitSettled = !!outcome.settlement;
    res.locals.hitPayer = outcome.payerAddress; res.locals.hitTx = outcome.txHash;
    if (outcome.requirements) res.setHeader('PAYMENT-REQUIRED', encodePaymentRequired(outcome.requirements));
    if (outcome.settlement) res.setHeader('PAYMENT-RESPONSE', encodePaymentResponse(outcome.settlement));
    res.status(outcome.status).json(outcome.body);
  }
  app.get('/tools/:toolId', invoke);
  app.post('/tools/:toolId', invoke);

  async function callMcp(params, req) {
    const capability = registry.get(params.name);
    if (capability && !capability.discovery.public && !privateAllowed(req)) return {
      isError: true, content: [{ type: 'text', text: JSON.stringify({ ok: false, error: 'capability_unavailable' }) }],
      _meta: { 'gateway/status': 404 },
    };
    const payment = params._meta?.['x402/payment'];
    const outcome = await pipeline.execute({
      id: params.name, input: params.arguments || {}, payment: payment === 'stub-ok' ? { stub: true } : payment,
      idempotencyKey: params._meta?.['x402/idempotency-key'], surface: 'mcp', identity: requestIp(req),
    });
    req.res.locals.hitStatus = outcome.status; req.res.locals.hitCode = outcome.body?.error;
    req.res.locals.hitToolId = params.name; req.res.locals.hitSettled = !!outcome.settlement;
    req.res.locals.hitPayer = outcome.payerAddress; req.res.locals.hitTx = outcome.txHash;
    return {
      isError: outcome.status !== 200,
      content: [{ type: 'text', text: JSON.stringify(outcome.body) }],
      _meta: { 'gateway/status': outcome.status, ...(outcome.settlement ? { 'x402/payment-response': outcome.settlement } : {}),
        ...(outcome.requirements ? { 'x402/payment-required': outcome.requirements } : {}) },
    };
  }

  app.use('/mcp', (req, res, next) => {
    const origin = req.get('origin');
    if (origin && origin !== new URL(cfg.baseUrl).origin) return res.status(403).json({ error: 'origin_denied' });
    next();
  });
  app.post('/mcp/tools/call', async (req, res) => {
    const result = await callMcp(req.body || {}, req);
    return res.status(result._meta['gateway/status']).json(result);
  });
  app.post('/mcp', async (req, res) => {
    const server = new Server({ name: cfg.serviceName, version: '0.3.0' }, { capabilities: { tools: {} } });
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: mcpTools(registry, cfg).filter(entry => !cfg.disabledCapabilities.includes(entry.name) &&
        (registry.get(entry.name)?.discovery.public || privateAllowed(req))),
    }));
    server.setRequestHandler(CallToolRequestSchema, async request => callMcp(request.params, req));
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on('close', () => { void transport.close(); void server.close(); });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch {
      if (!res.headersSent) res.status(500).json({ jsonrpc: '2.0', id: null, error: { code: -32603, message: 'Internal error' } });
    }
  });
  app.get('/mcp', (_req, res) => res.status(405).set('Allow', 'POST').end());
  app.delete('/mcp', (_req, res) => res.status(405).set('Allow', 'POST').end());
  app.use((error, _req, res, _next) => res.status(error?.type === 'entity.too.large' ? 413 : 400).json({ ok: false, error: error?.type === 'entity.too.large' ? 'payload_too_large' : 'invalid_request' }));
  app.locals.cfg = cfg;
  app.locals.pipeline = pipeline;
  app.locals.registry = registry;
  return app;
}

export default createApp;
