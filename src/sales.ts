import { DatabaseSync } from 'node:sqlite';

// Persistent sales log for bookkeeping (UK: HMRC treats USDC received as income at its GBP value
// on the date received). USDC is valued 1:1 with USD; the USD->GBP rate is captured at settlement
// time from a public reference-rate API and stored with its source and date so it can be audited
// or backfilled. A failed FX lookup never blocks the sale: gbp fields stay null and fx_source says why.

export interface SaleRecord {
  ts: string; tool_id: string; amount_atomic: string; amount_usd: string; currency: 'USDC';
  network: string; mode: string; payer_address: string | null; tx_hash: string | null; invocation_id: string;
  usd_gbp_rate: string | null; amount_gbp: string | null; fx_source: string; fx_date: string | null;
}
export interface SalesLog { durable: boolean; record(sale: SaleRecord): Promise<void>; list(): Promise<SaleRecord[]> }

export function atomicToUsd(atomic: string): string {
  const value = BigInt(atomic);
  return `${value / 1000000n}.${(value % 1000000n).toString().padStart(6, '0')}`;
}

export class FxRates {
  private cached?: { rate: string; date: string; source: string; at: number };
  private fetchImpl: typeof fetch; private url: string; private ttlMs: number;
  constructor(fetchImpl: typeof fetch = fetch, url = 'https://api.frankfurter.app/latest?from=USD&to=GBP', ttlMs = 6 * 3600 * 1000) {
    this.fetchImpl = fetchImpl; this.url = url; this.ttlMs = ttlMs;
  }
  async usdGbp(): Promise<{ rate: string; date: string; source: string } | null> {
    if (this.cached && Date.now() - this.cached.at < this.ttlMs) return this.cached;
    try {
      const response = await this.fetchImpl(this.url, { signal: AbortSignal.timeout(2500), redirect: 'error' });
      if (!response.ok) return null;
      const body: any = await response.json();
      const rate = Number(body?.rates?.GBP);
      if (!Number.isFinite(rate) || rate <= 0 || rate > 10) return null;
      this.cached = { rate: rate.toFixed(6), date: String(body.date || '').slice(0, 10), source: 'frankfurter.app (ECB reference rate)', at: Date.now() };
      return this.cached;
    } catch { return null; }
  }
}

export async function buildSale(input: { toolId: string; atomic: string; network: string; mode: string; payer?: string; tx?: string; invocationId: string; now?: Date }, fx: Pick<FxRates, 'usdGbp'>): Promise<SaleRecord> {
  const usd = atomicToUsd(input.atomic);
  const quote = await fx.usdGbp();
  return {
    ts: (input.now || new Date()).toISOString(), tool_id: input.toolId, amount_atomic: input.atomic, amount_usd: usd, currency: 'USDC',
    network: input.network, mode: input.mode, payer_address: input.payer ? input.payer.toLowerCase() : null, tx_hash: input.tx || null,
    invocation_id: input.invocationId,
    usd_gbp_rate: quote?.rate || null, amount_gbp: quote ? (Number(usd) * Number(quote.rate)).toFixed(6) : null,
    fx_source: quote?.source || 'unavailable_backfill_required', fx_date: quote?.date || null,
  };
}

export class MemorySalesLog implements SalesLog {
  durable = false;
  private rows: SaleRecord[] = [];
  async record(sale: SaleRecord) { this.rows.push(structuredClone(sale)); }
  async list() { return structuredClone(this.rows); }
}

const COLUMNS = ['ts', 'tool_id', 'amount_atomic', 'amount_usd', 'currency', 'network', 'mode', 'payer_address', 'tx_hash', 'invocation_id', 'usd_gbp_rate', 'amount_gbp', 'fx_source', 'fx_date'] as const;

export class SqliteSalesLog implements SalesLog {
  durable = true;
  private db: DatabaseSync;
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec(`CREATE TABLE IF NOT EXISTS x402_sales (id INTEGER PRIMARY KEY AUTOINCREMENT, ${COLUMNS.map(column => `${column} TEXT`).join(', ')}, UNIQUE(invocation_id))`);
  }
  async record(sale: SaleRecord) {
    this.db.prepare(`INSERT OR IGNORE INTO x402_sales (${COLUMNS.join(',')}) VALUES (${COLUMNS.map(() => '?').join(',')})`).run(...COLUMNS.map(column => sale[column] as any));
  }
  async list() { return this.db.prepare(`SELECT ${COLUMNS.join(',')} FROM x402_sales ORDER BY id`).all() as any; }
}

export class SupabaseSalesLog implements SalesLog {
  durable = true;
  private url: string; private key: string; private fetchImpl: typeof fetch;
  constructor(cfg: any, fetchImpl: typeof fetch = fetch) {
    this.fetchImpl = fetchImpl;
    this.url = String(cfg.supabaseUrl || '').replace(/\/$/, '');
    this.key = cfg.supabaseServiceRoleKey || '';
    if (!/^https:\/\//.test(this.url) || !this.key) throw new Error('sales log Supabase configuration missing');
  }
  private headers(extra: Record<string, string> = {}) { return { apikey: this.key, authorization: `Bearer ${this.key}`, 'content-type': 'application/json', ...extra }; }
  async record(sale: SaleRecord) {
    const response = await this.fetchImpl(`${this.url}/rest/v1/x402_sales`, { method: 'POST', redirect: 'error', headers: this.headers({ Prefer: 'return=minimal,resolution=ignore-duplicates' }), body: JSON.stringify(sale) });
    if (!response.ok) throw new Error(`Supabase sales HTTP ${response.status}`);
  }
  async list() {
    const response = await this.fetchImpl(`${this.url}/rest/v1/x402_sales?select=${COLUMNS.join(',')}&order=ts.asc&limit=10000`, { redirect: 'error', headers: this.headers() });
    if (!response.ok) throw new Error(`Supabase sales HTTP ${response.status}`);
    return response.json();
  }
}

export function salesCsv(rows: SaleRecord[]): string {
  const escape = (value: unknown) => { const text = value === null || value === undefined ? '' : String(value); return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; };
  return [COLUMNS.join(','), ...rows.map(row => COLUMNS.map(column => escape(row[column])).join(','))].join('\n') + '\n';
}
