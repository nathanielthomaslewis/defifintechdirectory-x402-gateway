import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { DemoCredits } from './human-credits.ts';
import { createPreviewRegistry, humanCatalog, type HumanCapability } from './human-preview.ts';
import { createPipeline } from './pipeline.ts';
import { canonical, digest, GatewayError, RateLimiter } from './policy.ts';
import type { Registry } from './registry.ts';
import { isProduction } from './x402.js';

export interface DemoQuote {
  id: string; capabilityId: string; version: string; inputHash: string; credits: number; amountMinor: number;
  currency: 'USD'; maxCostAtomic: string; expiresAt: number; demo: true; jobId?: string;
}
export interface DemoJob {
  id: string; capabilityId: string; title: string; state: 'running' | 'completed' | 'failed';
  demo: true; createdAt: number; result?: unknown; error?: string; artifactId?: string;
}
interface DemoSession {
  userId: string; csrfToken: string; expiresAt: number; credits: DemoCredits;
  quotes: Map<string, DemoQuote>; jobs: Map<string, DemoJob>; retries: Map<string, string>;
  pipeline: ReturnType<typeof createPipeline>;
}

export class HumanService {
  private sessions = new Map<string, DemoSession>();
  private limiter = new RateLimiter(40, 60000, 500);
  private creationLimiter = new RateLimiter(20, 60000, 500);
  private cfg: any;
  private registry: Registry;
  private now: () => number;
  private initialCredits: number;
  previewRegistry: Registry;

  constructor({ cfg, registry, previewRegistry = createPreviewRegistry(), now = Date.now, initialCredits = 10 }: {
    cfg: any; registry: Registry; previewRegistry?: Registry; now?: () => number; initialCredits?: number;
  }) {
    this.cfg = cfg;
    this.registry = registry;
    this.previewRegistry = previewRegistry;
    this.now = now;
    this.initialCredits = initialCredits;
  }
  private requireDemo() {
    if (isProduction(this.cfg) || !this.cfg.stubMode || process.env.VERCEL || !['development', 'test'].includes(this.cfg.environment)) throw new GatewayError('service_unavailable', 503);
  }
  private prune() {
    for (const [key, session] of this.sessions) if (session.expiresAt <= this.now()) this.sessions.delete(key);
  }
  private session(token: string | undefined) {
    this.requireDemo();
    this.prune();
    const session = token ? this.sessions.get(digest(token)) : undefined;
    if (!session) throw new GatewayError('session_required', 401);
    return session;
  }
  catalog() { return humanCatalog(this.registry, this.previewRegistry, this.cfg.disabledCapabilities); }
  createSession(identity: string) {
    this.requireDemo();
    this.prune();
    this.creationLimiter.check(identity, this.now());
    if (this.sessions.size >= 200) throw new GatewayError('service_unavailable', 503);
    const token = randomBytes(32).toString('base64url');
    const session: DemoSession = { userId: randomUUID(), csrfToken: randomBytes(32).toString('base64url'), expiresAt: this.now() + 30 * 60000, credits: new DemoCredits(this.initialCredits), quotes: new Map(), jobs: new Map(), retries: new Map(), pipeline: createPipeline({ cfg: this.cfg, registry: this.previewRegistry }) };
    const sessionKey = digest(token);
    this.sessions.set(sessionKey, session);
    // Drop the session and its private execution cache even without a later request.
    setTimeout(() => this.sessions.delete(sessionKey), 30 * 60000).unref();
    return { token, ...this.describeSession(session) };
  }
  private describeSession(session: DemoSession) {
    const { available, reserved } = session.credits.snapshot();
    return { demo: true, csrfToken: session.csrfToken, expiresAt: session.expiresAt, credits: { available, reserved } };
  }
  getSession(token?: string) { return this.describeSession(this.session(token)); }
  authorize(token: string | undefined, csrf?: string) {
    const session = this.session(token);
    const supplied = Buffer.from(csrf || '');
    const expected = Buffer.from(session.csrfToken);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new GatewayError('csrf_invalid', 403);
    this.limiter.check(session.userId, this.now());
  }
  private capability(id: string) {
    const capability = this.previewRegistry.get(id) as HumanCapability | undefined;
    if (!capability || capability.status !== 'placeholder' || capability.commercial || Object.values(capability.discovery).some(Boolean) || this.cfg.disabledCapabilities?.includes(id)) throw new GatewayError('capability_unavailable', 404);
    if (capability.price.atomic !== '0' || capability.limits.costAtomic !== '0') throw new GatewayError('service_unavailable', 503);
    return capability;
  }
  private validateInput(capability: HumanCapability, input: unknown) {
    if (Buffer.byteLength(canonical(input) || '') > capability.limits.maxPayloadBytes) throw new GatewayError('payload_too_large', 413);
    if (!this.previewRegistry.validate(capability.id, 'input', input)) throw new GatewayError('input_invalid', 400);
  }
  quote(token: string | undefined, capabilityId: string, input: unknown) {
    const session = this.session(token);
    const capability = this.capability(capabilityId);
    this.validateInput(capability, input);
    for (const [key, quote] of session.quotes) if (!quote.jobId && quote.expiresAt <= this.now()) session.quotes.delete(key);
    if (session.quotes.size >= 100) throw new GatewayError('rate_limited', 429);
    const quote: DemoQuote = { id: randomUUID(), capabilityId, version: capability.version, inputHash: digest(input), credits: 1, amountMinor: 0, currency: 'USD', expiresAt: this.now() + 120000, maxCostAtomic: '0', demo: true };
    session.quotes.set(quote.id, quote);
    return { quote: structuredClone(quote) };
  }
  async run(token: string | undefined, request: { quoteId: string; input: unknown; confirmed: boolean; idempotencyKey: string }) {
    const session = this.session(token);
    if (request.confirmed !== true) throw new GatewayError('confirmation_required', 400);
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(request.idempotencyKey || '')) throw new GatewayError('idempotency_key_invalid', 400);
    const quote = session.quotes.get(request.quoteId);
    if (!quote) throw new GatewayError('quote_unavailable', 404);
    const capability = this.capability(quote.capabilityId);
    this.validateInput(capability, request.input);
    if (quote.version !== capability.version || quote.maxCostAtomic !== capability.limits.costAtomic || quote.inputHash !== digest(request.input)) throw new GatewayError('quote_mismatch', 409);
    const priorQuoteId = session.retries.get(request.idempotencyKey);
    if (priorQuoteId && priorQuoteId !== quote.id) throw new GatewayError('idempotency_conflict', 409);
    if (quote.jobId) {
      const job = session.jobs.get(quote.jobId)!;
      if (job.state === 'running') throw new GatewayError('job_running', 409);
      return { job: structuredClone(job), credits: this.balance(session) };
    }
    if (quote.expiresAt <= this.now()) throw new GatewayError('quote_expired', 409);
    if (session.jobs.size >= 50) throw new GatewayError('rate_limited', 429);
    const job: DemoJob = { id: randomUUID(), capabilityId: capability.id, title: capability.human.title, state: 'running', demo: true, createdAt: this.now() };
    session.credits.reserve(job.id, quote.credits);
    quote.jobId = job.id;
    session.retries.set(request.idempotencyKey, quote.id);
    session.jobs.set(job.id, job);
    try {
      const outcome = await session.pipeline.execute({ id: capability.id, input: request.input, payment: { stub: true }, paymentMethod: 'demo_credits', idempotencyKey: job.id, surface: 'browser', identity: session.userId });
      this.session(token);
      if (outcome.status !== 200 || outcome.body?.ok !== true || outcome.settlement?.success !== true) throw new GatewayError('job_failed', 500);
      session.credits.capture(job.id);
      job.result = structuredClone(outcome.body.result);
      job.artifactId = randomUUID();
      job.state = 'completed';
    } catch {
      session.credits.release(job.id);
      job.state = 'failed';
      job.error = 'The sample could not finish. Your demo credit was released. Review your input and request a new quote.';
    }
    this.session(token);
    return { job: structuredClone(job), credits: this.balance(session) };
  }
  private balance(session: DemoSession) {
    const { available, reserved } = session.credits.snapshot();
    return { available, reserved };
  }
  jobs(token?: string) { return { demo: true, jobs: [...this.session(token).jobs.values()].map(job => structuredClone(job)).sort((left, right) => right.createdAt - left.createdAt) }; }
  job(token: string | undefined, id: string) {
    const job = this.session(token).jobs.get(id);
    if (!job) throw new GatewayError('job_unavailable', 404);
    return { job: structuredClone(job) };
  }
  artifact(token: string | undefined, id: string) {
    const job = [...this.session(token).jobs.values()].find(entry => entry.artifactId === id && entry.state === 'completed');
    if (!job) throw new GatewayError('artifact_unavailable', 404);
    return structuredClone(job.result);
  }
  credits(token?: string) { return this.session(token).credits.snapshot(); }
  export(token?: string) {
    const session = this.session(token);
    return { demo: true, exportedAt: this.now(), expiresAt: session.expiresAt, jobs: this.jobs(token).jobs, credits: session.credits.snapshot() };
  }
  logout(token?: string) { this.session(token); this.sessions.delete(digest(token)); return { demo: true, deleted: true }; }
}
