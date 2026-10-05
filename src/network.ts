import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { isIP } from 'node:net';
import { bounded, GatewayError } from './policy.ts';

export function publicIpv4(address: string) {
  if (isIP(address) !== 4) return false;
  const [first, second, third] = address.split('.').map(Number);
  return !(first === 0 || first === 10 || first === 127 || first >= 224 ||
    (first === 100 && second >= 64 && second <= 127) || (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && (second === 0 || second === 168 || (second === 88 && third === 99))) ||
    (first === 198 && (second === 18 || second === 19 || (second === 51 && third === 100))) ||
    (first === 203 && second === 0 && third === 113));
}

export async function resolvePublicUrl(raw: string, allowedHosts: string[], resolver = lookup) {
  const url = new URL(raw);
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || !allowedHosts.includes(url.hostname) || isIP(url.hostname)) throw new GatewayError('url_not_allowed', 400);
  const addresses = await bounded(() => resolver(url.hostname, { all: true, verbatim: true }), 5000);
  if (!addresses.length || addresses.some(entry => !publicIpv4(entry.address))) throw new GatewayError('unsafe_address', 400);
  return { url, address: addresses[0].address };
}

export async function safeGet(raw: string, options: { allowedHosts: string[]; signal: AbortSignal; maxBytes: number }, dependencies = { resolver: lookup, requester: request }) {
  if (!Number.isSafeInteger(options.maxBytes) || options.maxBytes <= 0 || options.maxBytes > 1000000) throw new GatewayError('invalid_response_limit', 400);
  const { url, address } = await resolvePublicUrl(raw, options.allowedHosts, dependencies.resolver);
  options.signal.throwIfAborted();
  return new Promise<Buffer>((resolve, reject) => {
    const outgoing = dependencies.requester(url, {
      method: 'GET', signal: options.signal, timeout: 5000, family: 4,
      lookup: (_hostname, _options, callback) => callback(null, address, 4),
    }, response => {
      if (response.statusCode !== 200) { response.destroy(); reject(new GatewayError('upstream_status_denied', 502)); return; }
      const chunks: Buffer[] = [];
      let length = 0;
      response.on('data', (chunk: Buffer) => {
        length += chunk.length;
        if (length > options.maxBytes) { response.destroy(new GatewayError('upstream_too_large', 502)); return; }
        chunks.push(chunk);
      });
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    });
    outgoing.on('timeout', () => outgoing.destroy(new GatewayError('upstream_timeout', 504)));
    outgoing.on('error', reject);
    outgoing.end();
  });
}
