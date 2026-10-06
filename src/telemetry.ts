import { createHmac, randomBytes } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

export type Event = {
  event: string; invocation_id: string; capability_id: string; version: string; surface: string;
  environment: string; mode: string; at: number; latency_ms: number; price_atomic: string;
  cost_estimate_atomic: string; status?: number; payer_hash?: string; transaction?: string;
};

export class Telemetry {
  events: Event[] = [];
  dropped = 0;
  private salt: string;
  private sink?: (event: Event) => void | Promise<void>;
  private capacity: number;
  private hitSink?: (row: any) => void | Promise<void>;
  constructor(sink?: (event: Event) => void | Promise<void>, salt?: string, capacity = 10000) {
    this.sink = sink;
    this.capacity = capacity;
    this.salt = salt || randomBytes(32).toString('hex');
  }
  payer(value?: string) { return value ? createHmac('sha256', this.salt).update(value.toLowerCase()).digest('hex') : undefined; }
  setHitSink(sink: (row: any) => void | Promise<void>) { this.hitSink = sink; }
  hit(row: any) {
    try {
      const write = Promise.resolve(this.hitSink?.(row)).catch(error => { console.error('x402 hit log failed:', error?.message || 'unknown'); });
      // On Vercel the instance can freeze once the response is sent; register the write so it completes.
      const ctx = (globalThis as any)[Symbol.for('@vercel/request-context')]?.get?.();
      ctx?.waitUntil?.(write);
    } catch (error: any) { console.error('x402 hit log failed:', error?.message || 'unknown'); }
  }
  emit(event: Event) {
    if (this.events.length >= this.capacity) this.events.shift();
    this.events.push(structuredClone(event));
    try { Promise.resolve(this.sink?.(structuredClone(event))).catch(() => { this.dropped++; }); } catch { this.dropped++; }
  }
  summary() {
    const settled = this.events.filter(event => event.event === 'settlement_completed' && event.mode === 'live');
    const completed = this.events.filter(event => event.event === 'execution_completed').map(event => event.latency_ms).sort((left, right) => left - right);
    const payerCounts = new Map<string, number>();
    for (const event of settled) if (event.payer_hash) payerCounts.set(event.payer_hash, (payerCounts.get(event.payer_hash) || 0) + 1);
    return {
      scope: 'bounded_process_window', paidCalls: settled.length,
      grossAtomic: settled.reduce((total, event) => total + BigInt(event.price_atomic), 0n).toString(),
      uniquePayers: new Set(settled.map(event => event.payer_hash).filter(Boolean)).size,
      repeatPayerRate: payerCounts.size ? [...payerCounts.values()].filter(count => count > 1).length / payerCounts.size : null,
      estimatedContributionAtomic: settled.reduce((total, event) => total + BigInt(event.price_atomic) - BigInt(event.cost_estimate_atomic), 0n).toString(),
      paymentChallenges: this.events.filter(event => event.event === 'payment_required').length,
      paymentVerifications: this.events.filter(event => event.event === 'payment_verified').length,
      calls: this.events.filter(event => event.event === 'request_received').length,
      failures: this.events.filter(event => event.event.endsWith('_failed')).length,
      p50Ms: completed[Math.max(0, Math.ceil(completed.length * 0.5) - 1)] ?? null,
      p95Ms: completed[Math.max(0, Math.ceil(completed.length * 0.95) - 1)] ?? null,
      dropped: this.dropped,
    };
  }
}

export class SqliteEventSink {
  private db: DatabaseSync;
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=1000; CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY, at INTEGER NOT NULL, event TEXT NOT NULL, capability TEXT NOT NULL, data TEXT NOT NULL); CREATE INDEX IF NOT EXISTS events_at ON events(at);');
  }
  write(event: Event) { this.db.prepare('INSERT INTO events (at,event,capability,data) VALUES (?,?,?,?)').run(event.at, event.event, event.capability_id, JSON.stringify(event)); }
  read(limit = 10000): Event[] {
    if (!Number.isInteger(limit) || limit < 1 || limit > 10000) throw new Error('invalid_event_limit');
    return this.db.prepare('SELECT data FROM events ORDER BY id DESC LIMIT ?').all(limit).reverse().map(row => JSON.parse(String(row.data)));
  }
  prune(before: number) { this.db.prepare('DELETE FROM events WHERE at < ?').run(before); }
  close() { this.db.close(); }
}
