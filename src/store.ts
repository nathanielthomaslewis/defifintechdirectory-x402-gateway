import { DatabaseSync } from 'node:sqlite';
import { GatewayError } from './policy.ts';

export interface StoredInvocation { fingerprint: string; state: string; response?: any }
export interface Ledger {
  durable: boolean;
  find(key: string): StoredInvocation | undefined;
  claim(key: string, fingerprint: string, replay: string): StoredInvocation | undefined;
  finish(key: string, state: string, response: any): void;
  reserve(capability: string, day: string, cost: string, ceiling: string): void;
}

export class MemoryLedger implements Ledger {
  durable = false;
  private invocations = new Map<string, StoredInvocation>();
  private replays = new Set<string>();
  private budgets = new Map<string, bigint>();
  private capacity: number;
  constructor(capacity = 10000) { this.capacity = capacity; }
  find(key: string) {
    const row = this.invocations.get(key);
    return row ? structuredClone(row) : undefined;
  }
  claim(key: string, fingerprint: string, replay: string) {
    const existing = this.invocations.get(key);
    if (existing) return structuredClone(existing);
    if (this.replays.has(replay)) throw new GatewayError('payment_replayed', 409);
    if (this.invocations.size >= this.capacity) throw new GatewayError('ledger_capacity', 503);
    this.invocations.set(key, { fingerprint, state: 'pending' });
    this.replays.add(replay);
  }
  finish(key: string, state: string, response: any) {
    const row = this.invocations.get(key);
    if (!row) throw new Error('invocation_missing');
    this.invocations.set(key, { ...row, state, response: structuredClone(response) });
  }
  reserve(capability: string, day: string, cost: string, ceiling: string) {
    const key = `${day}:${capability}`;
    const next = (this.budgets.get(key) || 0n) + BigInt(cost);
    if (next > BigInt(ceiling)) throw new GatewayError('daily_cost_ceiling', 503);
    this.budgets.set(key, next);
  }
}

export class SqliteLedger implements Ledger {
  durable = true;
  private db: DatabaseSync;
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=1000;
      CREATE TABLE IF NOT EXISTS invocations (key TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, replay TEXT NOT NULL UNIQUE, state TEXT NOT NULL, response TEXT);
      CREATE TABLE IF NOT EXISTS budgets (key TEXT PRIMARY KEY, amount TEXT NOT NULL);`);
  }
  find(key: string): StoredInvocation | undefined {
    const row = this.db.prepare('SELECT fingerprint, state, response FROM invocations WHERE key=?').get(key) as any;
    return row ? { fingerprint: row.fingerprint, state: row.state, response: row.response ? JSON.parse(row.response) : undefined } : undefined;
  }
  claim(key: string, fingerprint: string, replay: string): StoredInvocation | undefined {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const row = this.db.prepare('SELECT fingerprint, state, response FROM invocations WHERE key=?').get(key) as any;
      if (row) {
        this.db.exec('COMMIT');
        return { fingerprint: row.fingerprint, state: row.state, response: row.response ? JSON.parse(row.response) : undefined };
      }
      if (this.db.prepare('SELECT key FROM invocations WHERE replay=?').get(replay)) throw new GatewayError('payment_replayed', 409);
      this.db.prepare('INSERT INTO invocations (key,fingerprint,replay,state) VALUES (?,?,?,?)').run(key, fingerprint, replay, 'pending');
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  finish(key: string, state: string, response: any) {
    const result = this.db.prepare('UPDATE invocations SET state=?,response=? WHERE key=?').run(state, JSON.stringify(response), key);
    if (result.changes !== 1) throw new Error('invocation_missing');
  }
  reserve(capability: string, day: string, cost: string, ceiling: string) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const key = `${day}:${capability}`;
      const row = this.db.prepare('SELECT amount FROM budgets WHERE key=?').get(key) as any;
      const next = BigInt(row?.amount || '0') + BigInt(cost);
      if (next > BigInt(ceiling)) throw new GatewayError('daily_cost_ceiling', 503);
      this.db.prepare('INSERT INTO budgets (key,amount) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET amount=excluded.amount').run(key, next.toString());
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  close() { this.db.close(); }
}
