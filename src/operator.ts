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
