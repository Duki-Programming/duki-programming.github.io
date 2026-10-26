import { isIP } from 'node:net';

const ROOT = '/v1/market-peek';
const encoder = new TextEncoder();

export function normalizeIp(raw) {
  if (!raw || !isIP(raw)) return null;
  if (isIP(raw) === 4) return raw;
  const normalized = new URL(`http://[${raw}]/`).hostname.slice(1, -1);
  const mapped = normalized.match(/^::ffff:([a-f0-9]+):([a-f0-9]+)$/);
  if (!mapped) return normalized;
  const high = parseInt(mapped[1], 16), low = parseInt(mapped[2], 16);
  return [high >> 8, high & 255, low >> 8, low & 255].join('.');
}

async function visitorHash(request, secret) {
  // Trust only Cloudflare's edge-supplied client IP, never a browser payload.
  const ip = normalizeIp(request.headers.get('CF-Connecting-IP'));
  if (!ip) return null;
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`market-peek\n${ip}`));
  return [...new Uint8Array(signature)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function snapshot(db, hash) {
  return db.prepare(`SELECT
    (SELECT count FROM totals WHERE id = 1) AS count,
    EXISTS(SELECT 1 FROM likes WHERE ip_hash = ?) AS liked,
    EXISTS(SELECT 1 FROM downloads WHERE ip_hash = ?) AS downloaded`).bind(hash, hash);
}

function state(row) {
  return { count: Number(row.count), liked: Boolean(row.liked), downloaded: Boolean(row.downloaded) };
}

export default {
  async fetch(request, env) {
    const headers = new Headers({ 'Cache-Control': 'no-store', 'Vary': 'Origin', 'X-Content-Type-Options': 'nosniff' });
    const reply = (body, status = 200) => Response.json(body, { status, headers });
    const origin = request.headers.get('Origin');
    if (!env.ALLOWED_ORIGIN || origin !== env.ALLOWED_ORIGIN) return reply({ error: 'origin_not_allowed' }, 403);
    headers.set('Access-Control-Allow-Origin', origin);
    const pathname = new URL(request.url).pathname;
    const route = pathname.slice(ROOT.length);
    if (!pathname.startsWith(`${ROOT}/`) || !['/likes', '/download'].includes(route)) return reply({ error: 'not_found' }, 404);
    if (request.method === 'OPTIONS') {
      headers.set('Access-Control-Allow-Methods', route === '/likes' ? 'GET, POST, OPTIONS' : 'POST, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'Content-Type');
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== 'POST' && !(route === '/likes' && request.method === 'GET')) return reply({ error: 'method_not_allowed' }, 405);
    if (request.method === 'POST' && request.headers.get('Content-Type') !== 'application/json') return reply({ error: 'json_required' }, 415);
    if (!env.DB || typeof env.IP_HASH_SECRET !== 'string' || env.IP_HASH_SECRET.length < 32) return reply({ error: 'unavailable' }, 503);
    try {
      const hash = await visitorHash(request, env.IP_HASH_SECRET);
      if (!hash) return reply({ error: 'client_ip_unavailable' }, 400);
      if (request.method === 'GET') return reply(state(await snapshot(env.DB, hash).first()));
      const mutation = route === '/download'
        ? env.DB.prepare('INSERT OR IGNORE INTO downloads (ip_hash) VALUES (?)').bind(hash)
        : env.DB.prepare('INSERT OR IGNORE INTO likes (ip_hash) SELECT ip_hash FROM downloads WHERE ip_hash = ?').bind(hash);
      // D1 batches execute transactionally. Unique keys make retries and racing clicks idempotent.
      const [, result] = await env.DB.batch([mutation, snapshot(env.DB, hash)]);
      const current = state(result.results[0]);
      if (route === '/likes' && !current.downloaded) return reply({ ...current, error: 'download_required' }, 409);
      return reply(current);
    } catch {
      // Never log IPs, request headers, or database internals.
      return reply({ error: 'unavailable' }, 503);
    }
  },
};
