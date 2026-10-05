import { createHmac } from 'node:crypto';
import { GatewayError } from './policy.ts';

const API_LIMIT = 1000;
const outcomes = new Set(['402_issued', 'paid', 'verify_failed', 'settle_failed', 'cap_429', '404', 'error']);

export function hitOutcome(status: number, code?: string, settled = false) {
  if (status === 429) return code === 'daily_paid_cap' ? 'cap_429' : 'error';
  if (status === 404) return '404';
  if (status === 402) return code === 'payment_invalid' || code?.startsWith('payment_') ? 'verify_failed' : '402_issued';
  if (code === 'settlement_failed' || code === 'settlement_unknown') return 'settle_failed';
  if (status === 200 && settled) return 'paid';
  return 'error';
}

export function hitRow(input: any, salt: string) {
  const outcome = outcomes.has(input.outcome) ? input.outcome : 'error';
  return {
    ts: new Date(input.ts || Date.now()).toISOString(),
    path: String(input.path || '').slice(0, 512), method: String(input.method || '').slice(0, 12),
    surface: String(input.surface || 'http').slice(0, 32), tool_id: input.toolId || null,
    user_agent: String(input.userAgent || '').slice(0, 512), referer: String(input.referer || '').slice(0, 512),
    ip_hash: createHmac('sha256', salt).update(String(input.ip || '')).digest('hex'),
    had_payment_header: !!input.hadPaymentHeader, outcome,
    amount_atomic: String(input.amountAtomic || '0'), payer_address: input.payerAddress || null,
    tx_hash: input.txHash || null, latency_ms: Math.max(0, Math.floor(input.latencyMs || 0)),
  };
}

export class SupabaseWeek1Store {
  private url: string;
  private key: string;
  private fetchImpl: typeof fetch;
  constructor(cfg: any, fetchImpl: typeof fetch = fetch) {
    this.url = String(cfg.supabaseUrl || '').replace(/\/$/, '');
    this.key = cfg.supabaseServiceRoleKey || '';
    this.fetchImpl = fetchImpl;
    if (!/^https:\/\//.test(this.url) || !this.key) throw new Error('Week1 Supabase configuration missing: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  }
  private async request(path: string, init: RequestInit = {}) {
    const response = await this.fetchImpl(`${this.url}/rest/v1/${path}`, {
      ...init, redirect: 'error', headers: { apikey: this.key, authorization: `Bearer ${this.key}`,
        'content-type': 'application/json', ...init.headers },
    });
    if (!response.ok) throw new Error(`Supabase PostgREST HTTP ${response.status}`);
    return response;
  }
  async write(row: any) {
    await this.request('x402_hits', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(row) });
  }
  private async rpc(name: string, body: any) {
    const response = await this.request(`rpc/${name}`, { method: 'POST', body: JSON.stringify(body) });
    const payload = await response.text();
    return payload ? JSON.parse(payload) : null;
  }
  async check(payer?: string) {
    const value = await this.rpc('x402_week1_check', { p_payer: payer || null });
    if (typeof value?.allowed !== 'boolean') throw new Error('Supabase cap response invalid');
    if (value?.allowed !== true) throw new GatewayError('daily_paid_cap', 429);
  }
  async claim(payer: string) {
    const value = await this.rpc('x402_week1_claim', { p_payer: payer });
    if (typeof value?.allowed !== 'boolean') throw new Error('Supabase cap response invalid');
    if (value?.allowed !== true) throw new GatewayError('daily_paid_cap', 429);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value.day || '')) throw new Error('Supabase cap day invalid');
    return value.day;
  }
  async release(payer: string, day: string) {
    await this.rpc('x402_week1_release', { p_payer: payer, p_day: day });
  }
  async readHits() {
    const rows: any[] = [];
    for (let offset = 0; offset < 100000; offset += API_LIMIT) {
      const response = await this.request(`x402_hits?select=ts,path,method,surface,tool_id,user_agent,referer,ip_hash,had_payment_header,outcome,amount_atomic,payer_address,tx_hash,latency_ms&order=ts.asc&offset=${offset}&limit=${API_LIMIT}`);
      const page = await response.json();
      if (!Array.isArray(page)) throw new Error('Supabase response invalid');
      rows.push(...page);
      if (page.length < API_LIMIT) return { rows, truncated: false };
    }
    return { rows, truncated: true };
  }
}

export class MemoryWeek1Store {
  private day = '';
  private total = 0;
  private payers = new Map<string, number>();
  private reset() {
    const today = new Date().toISOString().slice(0, 10);
    if (this.day !== today) { this.day = today; this.total = 0; this.payers.clear(); }
  }
  async check(payer?: string) {
    this.reset();
    if (this.total >= 250 || (payer && (this.payers.get(payer.toLowerCase()) || 0) >= 60)) throw new GatewayError('daily_paid_cap', 429);
  }
  async claim(payer: string) {
    await this.check(payer);
    this.total++;
    const key = payer.toLowerCase();
    this.payers.set(key, (this.payers.get(key) || 0) + 1);
    return this.day;
  }
  async release(payer: string, day?: string) {
    this.reset();
    if (day && day !== this.day) return;
    const key = payer.toLowerCase();
    this.total = Math.max(0, this.total - 1);
    this.payers.set(key, Math.max(0, (this.payers.get(key) || 0) - 1));
  }
}
