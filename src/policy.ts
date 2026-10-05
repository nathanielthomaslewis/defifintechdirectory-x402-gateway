import { createHash } from 'node:crypto';

export class GatewayError extends Error {
  status: number;
  constructor(code: string, status = 400) { super(code); this.status = status; }
}

export function canonical(value: any): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
}

export function digest(value: unknown) { return createHash('sha256').update(canonical(value)).digest('hex'); }

export async function bounded<T>(operation: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve().then(() => operation(controller.signal)),
      new Promise<never>((_resolve, reject) => { timer = setTimeout(() => { controller.abort(); reject(new GatewayError('operation_timeout', 504)); }, timeoutMs); }),
    ]);
  } finally { clearTimeout(timer); }
}

export class RateLimiter {
  private windows = new Map<string, { count: number; until: number }>();
  private limit: number;
  private windowMs: number;
  private capacity: number;
  constructor(limit = 60, windowMs = 60000, capacity = 10000) { this.limit = limit; this.windowMs = windowMs; this.capacity = capacity; }
  check(identity: string, now = Date.now()) {
    for (const [key, value] of this.windows) if (value.until <= now) this.windows.delete(key);
    const key = digest(identity);
    const entry = this.windows.get(key) || { count: 0, until: now + this.windowMs };
    if (!this.windows.has(key) && this.windows.size >= this.capacity) throw new GatewayError('rate_limit_capacity', 429);
    this.windows.set(key, entry);
    if (++entry.count > this.limit) throw new GatewayError('rate_limited', 429);
  }
}
