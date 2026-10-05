import { randomUUID } from 'node:crypto';
import { GatewayError } from './policy.ts';

export interface CreditEntry { id: string; type: 'demo_grant' | 'reservation' | 'capture' | 'release'; amount: number; jobId?: string; createdAt: number; demo: true }
export class DemoCredits {
  private entries: CreditEntry[] = [];
  private reservations = new Map<string, { amount: number; state: 'reserved' | 'captured' | 'released' }>();
  constructor(amount = 10) {
    if (!Number.isSafeInteger(amount) || amount < 0 || amount > 1000) throw new Error('invalid_demo_grant');
    this.record('demo_grant', amount);
  }
  private record(type: CreditEntry['type'], amount: number, jobId?: string) {
    this.entries.push(Object.freeze({ id: randomUUID(), type, amount, jobId, createdAt: Date.now(), demo: true }));
  }
  snapshot() {
    let available = 0;
    let reserved = 0;
    for (const entry of this.entries) {
      if (entry.type === 'demo_grant' || entry.type === 'release') available += entry.amount;
      if (entry.type === 'reservation') { available -= entry.amount; reserved += entry.amount; }
      if (entry.type === 'capture' || entry.type === 'release') reserved -= entry.amount;
    }
    if (available < 0 || reserved < 0) throw new Error('credit_invariant_failed');
    return { demo: true, available, reserved, entries: structuredClone(this.entries) };
  }
  reserve(jobId: string, amount: number) {
    if (!Number.isSafeInteger(amount) || amount < 1) throw new GatewayError('invalid_quote', 400);
    const prior = this.reservations.get(jobId);
    if (prior) {
      if (prior.amount !== amount) throw new GatewayError('reservation_conflict', 409);
      return;
    }
    if (this.snapshot().available < amount) throw new GatewayError('insufficient_credits', 402);
    this.reservations.set(jobId, { amount, state: 'reserved' });
    this.record('reservation', amount, jobId);
  }
  capture(jobId: string) { this.finish(jobId, 'captured'); }
  release(jobId: string) { this.finish(jobId, 'released'); }
  private finish(jobId: string, state: 'captured' | 'released') {
    const reservation = this.reservations.get(jobId);
    if (!reservation) throw new Error('reservation_missing');
    if (reservation.state === state) return;
    if (reservation.state !== 'reserved') throw new Error('reservation_already_final');
    this.record(state === 'captured' ? 'capture' : 'release', reservation.amount, jobId);
    reservation.state = state;
  }
}
