import express from 'express';
import { randomUUID } from 'node:crypto';
import { GatewayError } from './policy.ts';
import { HumanService } from './human-service.ts';
import { humanIntegrationStatus } from './human-integrations.ts';

const cookieName = 'avhub_demo';
const messages = {
  session_required: 'Start a new local demo session. Previous demo data may have expired.', csrf_invalid: 'Refresh the page and try again.',
  origin_denied: 'Open this preview on its local address and try again.', service_unavailable: 'This service is not configured. Only the local preview is available.',
  capability_unavailable: 'This workspace cannot run yet. Choose the text preview instead.', input_invalid: 'Enter between 1 and 4,000 non-blank characters.',
  payload_too_large: 'Your input is too large. Shorten it and request a new quote.', quote_expired: 'This quote has expired. Review a new quote before running.',
  quote_mismatch: 'The input or tool has changed. Request a new quote.', quote_unavailable: 'This quote is unavailable. Request a new quote in this session.',
  insufficient_credits: 'You do not have enough demo credits. Demo credits cannot be purchased.', rate_limited: 'Too many requests. Wait a minute and try again.',
  confirmation_required: 'Confirm the displayed quote before running.', idempotency_key_invalid: 'Refresh the workspace and try again.',
  idempotency_conflict: 'This retry belongs to another quote. Review the current quote again.', job_running: 'This job is still running. Check your job history shortly.',
  job_unavailable: 'This job is unavailable in your session.', artifact_unavailable: 'This sample result is unavailable in your session.', invalid_request: 'Check the form and try again.',
};

export function createHumanRouter({ cfg, registry, service = new HumanService({ cfg, registry }) }) {
  const router = express.Router();
  function token(req) {
    const entries = (req.headers.cookie || '').split(';').map(value => value.trim().split('='));
    return entries.find(([name]) => name === cookieName)?.[1];
  }
  const guarded = handler => async (req, res) => {
    try { await handler(req, res); } catch (error) {
      const known = error instanceof GatewayError;
      const code = known ? error.message : 'service_unavailable';
      res.status(known ? error.status : 503).json({ error: code, message: messages[code] || 'The request could not finish. Please try again later.', traceId: randomUUID() });
    }
  };
  router.use((req, res, next) => {
    const address = req.socket.remoteAddress;
    let hostname;
    try { hostname = new URL(`http://${req.headers.host}`).hostname; } catch { hostname = ''; }
    if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address) || !['127.0.0.1', 'localhost', '[::1]'].includes(hostname)) {
      return res.status(403).json({ error: 'origin_denied', message: messages.origin_denied, traceId: randomUUID() });
    }
    const origin = req.get('origin');
    const expected = `${req.protocol}://${req.get('host')}`;
    if ((origin && origin !== expected) || (!['GET', 'HEAD'].includes(req.method) && origin !== expected)) {
      return res.status(403).json({ error: 'origin_denied', message: messages.origin_denied, traceId: randomUUID() });
    }
    next();
  });
  const keys = (body, allowed) => {
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !allowed.includes(key))) throw new GatewayError('invalid_request', 400);
  };
  const mutate = handler => guarded(async (req, res) => {
    if (!req.is('application/json')) throw new GatewayError('invalid_request', 400);
    service.authorize(token(req), req.get('x-csrf-token'));
    await handler(req, res);
  });
  router.get('/config', (_req, res) => res.json(humanIntegrationStatus()));
  router.get('/catalog', (_req, res) => res.json(service.catalog()));
  router.post('/session', guarded((req, res) => {
    if (!req.is('application/json')) throw new GatewayError('invalid_request', 400);
    keys(req.body, []);
    if (token(req)) {
      try { return res.json(service.getSession(token(req))); } catch (error) { if (error.message !== 'session_required') throw error; }
    }
    const { token: sessionToken, ...session } = service.createSession(req.ip);
    res.cookie(cookieName, sessionToken, { httpOnly: true, sameSite: 'strict', secure: req.secure, path: '/api/human', maxAge: 30 * 60000 });
    res.status(201).json(session);
  }));
  router.get('/session', guarded((req, res) => res.json(service.getSession(token(req)))));
  router.post('/quotes', mutate((req, res) => {
    keys(req.body, ['capabilityId', 'input']);
    res.status(201).json(service.quote(token(req), req.body.capabilityId, req.body.input));
  }));
  router.post('/jobs', mutate(async (req, res) => {
    keys(req.body, ['quoteId', 'input', 'confirmed', 'idempotencyKey']);
    const result = await service.run(token(req), req.body);
    res.status(result.job.state === 'failed' ? 500 : 200).json(result);
  }));
  router.get('/jobs', guarded((req, res) => res.json(service.jobs(token(req)))));
  router.get('/jobs/:id', guarded((req, res) => res.json(service.job(token(req), req.params.id))));
  router.get('/credits', guarded((req, res) => res.json(service.credits(token(req)))));
  router.get('/artifacts/:id', guarded((req, res) => {
    const result = service.artifact(token(req), req.params.id);
    res.set('Content-Disposition', `attachment; filename="sample-${req.params.id}.json"`).json(result);
  }));
  router.get('/export', guarded((req, res) => res.set('Content-Disposition', 'attachment; filename="local-demo-export.json"').json(service.export(token(req)))));
  const remove = mutate((req, res) => {
    keys(req.body, []);
    const result = service.logout(token(req));
    res.clearCookie(cookieName, { httpOnly: true, sameSite: 'strict', secure: req.secure, path: '/api/human' });
    res.json(result);
  });
  router.post('/logout', remove);
  router.delete('/account', remove);
  router.post('/checkout', guarded(() => { throw new GatewayError('service_unavailable', 503); }));
  router.post('/webhooks/stripe', guarded(() => { throw new GatewayError('service_unavailable', 503); }));
  router.post('/uploads', guarded(() => { throw new GatewayError('service_unavailable', 503); }));
  return { router, service };
}
