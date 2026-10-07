import { createHash } from 'node:crypto';
import type { Capability, Schema } from './registry.ts';

const str = (maxLength: number): Schema => ({ type: 'string', minLength: 1, maxLength });
const obj = (properties: Record<string, unknown>, required = Object.keys(properties)): Schema => ({ type: 'object', properties, required, additionalProperties: false });
const outString = { type: 'string', maxLength: 30000 };
const count = { type: 'integer', minimum: 0 };
const common = { version: '1.0.0', category: 'local-utility', tags: ['local', 'deterministic'], providerId: 'av-hub' };
const limits = { timeoutMs: 2000, maxPayloadBytes: 4096, maxOutputBytes: 30000, costAtomic: '0', dailyCostAtomic: '0', minMarginBps: 0 };

type Definition = Pick<Capability, 'id' | 'description' | 'inputSchema' | 'outputSchema' | 'handler'> & { priceAtomic: string };

function normalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeJson);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, normalizeJson((value as Record<string, unknown>)[key])]));
  return value;
}

function csvRows(source: string): string[][] | null {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  let afterQuote = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quoted) {
      if (ch === '"' && source[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') { quoted = false; afterQuote = true; }
      else cell += ch;
    } else if (afterQuote) {
      if (ch === ',') { row.push(cell); cell = ''; afterQuote = false; }
      else if (ch === '\n' || ch === '\r') { row.push(cell); rows.push(row); row = []; cell = ''; afterQuote = false; if (ch === '\r' && source[i + 1] === '\n') i++; }
      else return null;
    } else if (ch === '"' && cell === '') quoted = true;
    else if (ch === '"') return null;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { row.push(cell); rows.push(row); row = []; cell = ''; if (ch === '\r' && source[i + 1] === '\n') i++; }
    else cell += ch;
    if (rows.length > 200 || row.length > 20) return null;
  }
  if (quoted) return null;
  if (row.length || cell !== '' || afterQuote) { row.push(cell); rows.push(row); }
  return rows.length && rows.length <= 200 && rows.every(r => r.length <= 20 && r.length === rows[0].length) ? rows : null;
}

const csvCell = (value: string) => /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
function parseField(field: string, min: number, max: number): Set<number> | null {
  const result = new Set<number>();
  for (const part of field.split(',')) {
    const match = /^(\*|\d{1,2})(?:-(\d{1,2}))?(?:\/(\d{1,2}))?$/.exec(part);
    if (!match) return null;
    const first = match[1] === '*' ? min : Number(match[1]);
    const last = match[1] === '*' ? max : match[2] ? Number(match[2]) : match[3] ? max : first;
    const step = match[3] ? Number(match[3]) : 1;
    if (first < min || last > max || first > last || step < 1) return null;
    for (let n = first; n <= last; n += step) result.add(n);
  }
  return result;
}

export const X3_TOOLS: Definition[] = [
  {
    id: 'text_sha256', priceAtomic: '1000',
    description: 'Return the SHA-256 fingerprint of supplied UTF-8 text. No file fetching, identity check, or signature verification.',
    inputSchema: obj({ text: str(3000) }),
    outputSchema: obj({ tool: { const: 'text_sha256' }, sha256_hex: { type: 'string', pattern: '^[0-9a-f]{64}$' }, bytes: count }),
    handler: input => ({ tool: 'text_sha256', sha256_hex: createHash('sha256').update(input.text as string, 'utf8').digest('hex'), bytes: Buffer.byteLength(input.text as string, 'utf8') }),
  },
  {
    id: 'json_normalize', priceAtomic: '5000',
    description: 'Parse JSON and sort object keys recursively. Returns an error for malformed JSON; no schema repair or semantic validation.',
    inputSchema: obj({ json: str(3500) }),
    outputSchema: obj({ tool: { const: 'json_normalize' }, valid: { type: 'boolean' }, normalized: outString, error: { enum: ['', 'invalid_json'] } }),
    handler: input => {
      try { return { tool: 'json_normalize', valid: true, normalized: JSON.stringify(normalizeJson(JSON.parse(input.json as string))), error: '' }; }
      catch { return { tool: 'json_normalize', valid: false, normalized: '', error: 'invalid_json' }; }
    },
  },
  {
    id: 'json_csv_convert', priceAtomic: '2000',
    description: 'Convert bounded CSV with a header or a JSON array of flat string records. No spreadsheets, type inference, or nested objects.',
    inputSchema: obj({ direction: { enum: ['csv_to_json', 'json_to_csv'] }, data: str(3500) }),
    outputSchema: obj({ tool: { const: 'json_csv_convert' }, ok: { type: 'boolean' }, format: { enum: ['json', 'csv'] }, data: outString, rows: count, error: { enum: ['', 'invalid_data'] } }),
    handler: input => {
      const toJson = input.direction === 'csv_to_json';
      const format = toJson ? 'json' : 'csv';
      const fail = { tool: 'json_csv_convert', ok: false, format, data: '', rows: 0, error: 'invalid_data' };
      if (toJson) {
        const rows = csvRows(input.data as string);
        if (!rows || rows.length < 2 || rows[0].some(h => !h || h === '__proto__') || new Set(rows[0]).size !== rows[0].length) return fail;
        const records = rows.slice(1).map(row => Object.fromEntries(rows[0].map((key, i) => [key, row[i]])));
        return { tool: 'json_csv_convert', ok: true, format, data: JSON.stringify(records), rows: records.length, error: '' };
      }
      try {
        const records = JSON.parse(input.data as string);
        if (!Array.isArray(records) || !records.length || records.length > 199 || records.some(record => !record || Array.isArray(record) || typeof record !== 'object')) return fail;
        const columns = Object.keys(records[0]);
        if (!columns.length || columns.length > 20 || records.some(record => Object.keys(record).length !== columns.length || columns.some(col => typeof record[col] !== 'string' || !Object.hasOwn(record, col)))) return fail;
        const data = [columns.map(csvCell).join(','), ...records.map(record => columns.map(col => csvCell(record[col])).join(','))].join('\r\n');
        return { tool: 'json_csv_convert', ok: true, format, data, rows: records.length, error: '' };
      } catch { return fail; }
    },
  },
  {
    id: 'url_normalize', priceAtomic: '5000',
    description: 'Canonicalize a supplied HTTP(S) URL and remove common tracking parameters. Does not visit or validate the destination.',
    inputSchema: obj({ url: str(2000) }),
    outputSchema: obj({ tool: { const: 'url_normalize' }, valid: { type: 'boolean' }, normalized: outString, removed_parameters: { type: 'array', maxItems: 100, items: outString }, error: { enum: ['', 'invalid_url'] } }),
    handler: input => {
      const fail = { tool: 'url_normalize', valid: false, normalized: '', removed_parameters: [], error: 'invalid_url' };
      try {
        const url = new URL(input.url as string);
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return fail;
        const removed: string[] = [];
        const kept: [string, string][] = [];
        for (const [key, value] of url.searchParams) {
          if (/^utm_/i.test(key) || /^(fbclid|gclid|msclkid)$/i.test(key)) removed.push(key);
          else kept.push([key, value]);
        }
        url.search = '';
        kept.sort(([ak, av], [bk, bv]) => ak < bk ? -1 : ak > bk ? 1 : av < bv ? -1 : av > bv ? 1 : 0);
        for (const [key, value] of kept) url.searchParams.append(key, value);
        url.hash = '';
        if (removed.length > 100) return fail;
        return { tool: 'url_normalize', valid: true, normalized: url.toString(), removed_parameters: removed, error: '' };
      } catch { return fail; }
    },
  },
  {
    id: 'cron_next_utc', priceAtomic: '1000',
    description: 'Calculate up to five next UTC times for a numeric five-field cron with wildcard day-of-month or weekday. No timezone, named fields, or delivery.',
    inputSchema: obj({ expression: str(100), after_utc: { type: 'string', minLength: 20, maxLength: 24, pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{3})?Z$' }, count: { type: 'integer', minimum: 1, maximum: 5 } }),
    outputSchema: obj({ tool: { const: 'cron_next_utc' }, valid: { type: 'boolean' }, next_utc: { type: 'array', maxItems: 5, items: outString }, error: { enum: ['', 'invalid_schedule', 'no_run_within_year'] } }),
    handler: input => {
      const fail = (error: 'invalid_schedule' | 'no_run_within_year') => ({ tool: 'cron_next_utc', valid: false, next_utc: [], error });
      const parts = (input.expression as string).trim().split(/\s+/);
      const ranges = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 6]];
      const fields = parts.length === 5 ? parts.map((part, i) => parseField(part, ranges[i][0], ranges[i][1])) : [];
      const start = new Date(input.after_utc as string);
      if (fields.length !== 5 || fields.some(field => !field) || !Number.isFinite(start.getTime()) || !start.toISOString().startsWith((input.after_utc as string).slice(0, 19))) return fail('invalid_schedule');
      if (parts[2] !== '*' && parts[4] !== '*') return fail('invalid_schedule');
      const next: string[] = [];
      let t = Math.floor(start.getTime() / 60000) * 60000 + 60000;
      for (let i = 0; i < 366 * 24 * 60 && next.length < (input.count as number); i++, t += 60000) {
        const d = new Date(t);
        const values = [d.getUTCMinutes(), d.getUTCHours(), d.getUTCDate(), d.getUTCMonth() + 1, d.getUTCDay()];
        if (values.every((value, j) => fields[j]!.has(value))) next.push(d.toISOString());
      }
      return next.length === input.count ? { tool: 'cron_next_utc', valid: true, next_utc: next, error: '' } : fail('no_run_within_year');
    },
  },
  {
    id: 'utm_url_build', priceAtomic: '5000',
    description: 'Add source, medium, and campaign UTM parameters to an HTTP(S) URL. Does not test links or track visits.',
    inputSchema: obj({ url: str(2000), source: str(100), medium: str(100), campaign: str(100) }),
    outputSchema: obj({ tool: { const: 'utm_url_build' }, valid: { type: 'boolean' }, url: outString, error: { enum: ['', 'invalid_url'] } }),
    handler: input => {
      try {
        const url = new URL(input.url as string);
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('invalid_url');
        for (const [key, value] of [['utm_source', input.source as string], ['utm_medium', input.medium as string], ['utm_campaign', input.campaign as string]] as [string, string][]) {
          url.searchParams.delete(key);
          url.searchParams.append(key, value as string);
        }
        return { tool: 'utm_url_build', valid: true, url: url.toString(), error: '' };
      } catch { return { tool: 'utm_url_build', valid: false, url: '', error: 'invalid_url' }; }
    },
  },
  {
    id: 'base64_text_codec', priceAtomic: '1000',
    description: 'Encode UTF-8 text to base64 or decode strict base64 to UTF-8. No JWT inspection, binary files, or secret handling.',
    inputSchema: obj({ action: { enum: ['encode', 'decode'] }, text: str(3000) }),
    outputSchema: obj({ tool: { const: 'base64_text_codec' }, valid: { type: 'boolean' }, text: outString, error: { enum: ['', 'invalid_base64_or_utf8'] } }),
    handler: input => {
      if (input.action === 'encode') return { tool: 'base64_text_codec', valid: true, text: Buffer.from(input.text as string, 'utf8').toString('base64'), error: '' };
      const source = input.text as string;
      try {
        if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(source)) throw new Error('invalid_base64');
        const decoded = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.from(source, 'base64'));
        if (Buffer.from(decoded, 'utf8').toString('base64') !== source) throw new Error('noncanonical_base64');
        return { tool: 'base64_text_codec', valid: true, text: decoded, error: '' };
      } catch { return { tool: 'base64_text_codec', valid: false, text: '', error: 'invalid_base64_or_utf8' }; }
    },
  },
];

export function registerX3Tools(registry: { register: (capability: Capability) => unknown }, week1: boolean) {
  for (const { priceAtomic, ...definition } of X3_TOOLS) registry.register({
    ...common, ...definition, status: 'enabled', commercial: week1,
    price: { mode: 'fixed', atomic: priceAtomic, currency: 'USDC' },
    discovery: { public: week1, mcp: true, bazaar: week1, plugin: false },
    limits,
  } as Capability);
}
