import { createHash, timingSafeEqual } from 'node:crypto';
import type { Registry } from './registry.ts';
import type { Telemetry } from './telemetry.ts';

export function operatorAuthorized(header: string | undefined, configured: string | undefined): boolean {
  if (!configured || configured.length < 24 || !header?.startsWith('Bearer ')) return false;
  const supplied = header.slice(7);
  const a = createHash('sha256').update(supplied).digest();
  const b = createHash('sha256').update(configured).digest();
  return timingSafeEqual(a, b);
}

export function operatorSnapshot(registry: Registry, telemetry: Telemetry) {
  const events = telemetry.events;
  const capabilities = registry.all().map(capability => {
    const own = events.filter(event => event.capability_id === capability.id);
    const count = (name: string) => own.filter(event => event.event === name).length;
    const settled = own.filter(event => event.event === 'settlement_completed' && event.mode === 'live');
    return {
      id: capability.id, version: capability.version, status: capability.status, public: capability.discovery.public,
      priceAtomic: capability.price.atomic, calls: count('request_received'), challenges: count('payment_required'),
      completed: count('execution_completed'), failures: own.filter(event => event.event.endsWith('_failed')).length,
      paidCalls: settled.length, grossAtomic: settled.reduce((sum, event) => sum + BigInt(event.price_atomic), 0n).toString(),
    };
  });
  return { listed: false, scope: 'bounded_process_window', summary: telemetry.summary(), capabilities };
}

export function hitSummary(rows: any[], truncated = false) {
  const tally = (key: (row: any) => string) => Object.entries(rows.reduce((result: Record<string, number>, row) => {
    const value = key(row) || '(none)'; result[value] = (result[value] || 0) + 1; return result;
  }, {})).sort((a, b) => Number(b[1]) - Number(a[1]));
  const paidRows = rows.filter(row => row.outcome === 'paid');
  const paid = [...new Map(paidRows.map(row => [row.tx_hash || `${row.ts}:${row.tool_id}:${row.payer_address}`, row])).values()];
  return { scope: 'supabase_hits', truncated, total: rows.length, paidCalls: paid.length,
    grossAtomic: paid.reduce((sum, row) => sum + BigInt(row.amount_atomic || '0'), 0n).toString(),
    distinctPayers: new Set(paid.map(row => row.payer_address?.toLowerCase()).filter(Boolean)).size,
    byDay: tally(row => row.ts?.slice(0, 10)), byOutcome: tally(row => row.outcome),
    byTool: tally(row => row.tool_id), bySurface: tally(row => row.surface),
    topUserAgents: tally(row => row.user_agent).slice(0, 20) };
}

export function hitSummaryHtml(summary: ReturnType<typeof hitSummary>) {
  const escape = (value: unknown) => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
  const table = (title: string, entries: [string, number][]) => `<h2>${escape(title)}</h2><table><tr><th>Value</th><th>Requests</th></tr>${entries.map(([name, count]) => `<tr><td>${escape(name)}</td><td>${count}</td></tr>`).join('')}</table>`;
  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>Week1 hits</title><h1>Week1 hits</h1><p>Total ${summary.total}; paid ${summary.paidCalls}; distinct payers ${summary.distinctPayers}; gross ${Number(summary.grossAtomic) / 1e6} USDC.${summary.truncated ? ' Data truncated at 100,000 rows.' : ''}</p>${table('Day', summary.byDay as [string, number][])}${table('Outcome', summary.byOutcome as [string, number][])}${table('Tool', summary.byTool as [string, number][])}${table('Surface', summary.bySurface as [string, number][])}${table('Top user agents', summary.topUserAgents as [string, number][])}</html>`;
}
