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
    (SELECT count FROM support_total WHERE id = 1) AS count,
    EXISTS(SELECT 1 FROM supporters WHERE ip_hash = ?) AS liked,
    EXISTS(SELECT 1 FROM downloads WHERE ip_hash = ?) AS downloaded`).bind(hash, hash);
}

function state(row) {
  return { count: Number(row.count), liked: Boolean(row.liked), downloaded: Boolean(row.downloaded) };
}

function platformSnapshot(db, hash) {
  return db.prepare(`SELECT t.platform, t.likes AS count, t.downloads,
    (v.ip_hash IS NOT NULL) AS liked, COALESCE(v.downloaded, 0) AS downloaded
    FROM platform_totals t LEFT JOIN platform_votes v ON t.platform = v.platform AND v.ip_hash = ?`).bind(hash);
}

function platformState(rows, total) {
  return { ...state(total), platforms: Object.fromEntries(rows.map(row => [row.platform, { ...state(row), downloads: Number(row.downloads) }])) };
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
    const platformRoute = route.match(/^\/(windows|macos)\/(download|likes)$/);
    if (!pathname.startsWith(`${ROOT}/`) || (!['/likes', '/download', '/stats'].includes(route) && !platformRoute)) return reply({ error: 'not_found' }, 404);
    if (request.method === 'OPTIONS') {
      headers.set('Access-Control-Allow-Methods', route === '/stats' ? 'GET, OPTIONS' : route === '/likes' ? 'GET, POST, OPTIONS' : 'POST, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'Content-Type');
      return new Response(null, { status: 204, headers });
    }
    if (route === '/stats' && request.method !== 'GET') return reply({ error: 'method_not_allowed' }, 405);
    if (request.method !== 'POST' && !(['/likes', '/stats'].includes(route) && request.method === 'GET')) return reply({ error: 'method_not_allowed' }, 405);
    if (request.method === 'POST' && request.headers.get('Content-Type') !== 'application/json') return reply({ error: 'json_required' }, 415);
    if (!env.DB || typeof env.IP_HASH_SECRET !== 'string' || env.IP_HASH_SECRET.length < 32) return reply({ error: 'unavailable' }, 503);
    try {
      const hash = await visitorHash(request, env.IP_HASH_SECRET);
      if (!hash) return reply({ error: 'client_ip_unavailable' }, 400);
      if (route === '/stats') {
        const [total, platforms] = await env.DB.batch([snapshot(env.DB, hash), platformSnapshot(env.DB, hash)]);
        return reply(platformState(platforms.results, total.results[0]));
      }
      if (platformRoute) {
        const [, platform, action] = platformRoute;
        const isDownload = action === 'download';
        const ip = isDownload ? normalizeIp(request.headers.get('CF-Connecting-IP')) : null;
        const at = isDownload ? new Date().toISOString() : null;
        const mutation = env.DB.prepare(`INSERT INTO platform_votes
          (platform, ip_hash, downloaded, source_ip, downloaded_at) VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(platform, ip_hash) DO UPDATE SET
            source_ip = CASE WHEN platform_votes.downloaded = 0 AND excluded.downloaded = 1 THEN excluded.source_ip ELSE platform_votes.source_ip END,
            downloaded_at = CASE WHEN platform_votes.downloaded = 0 AND excluded.downloaded = 1 THEN excluded.downloaded_at ELSE platform_votes.downloaded_at END,
            downloaded = MAX(platform_votes.downloaded, excluded.downloaded)`)
          .bind(platform, hash, isDownload ? 1 : 0, ip, at);
        const [, total, result] = await env.DB.batch([mutation, snapshot(env.DB, hash), platformSnapshot(env.DB, hash)]);
        return reply(platformState(result.results, total.results[0]));
      }
      // Keep the original routes for already-open pages using the previous script.
      if (request.method === 'GET') return reply(state(await snapshot(env.DB, hash).first()));
      const mutation = route === '/download'
        ? env.DB.prepare('INSERT OR IGNORE INTO downloads (ip_hash, source_ip, downloaded_at) VALUES (?, ?, ?)')
          .bind(hash, normalizeIp(request.headers.get('CF-Connecting-IP')), new Date().toISOString())
        : env.DB.prepare('INSERT OR IGNORE INTO supporters (ip_hash) VALUES (?)').bind(hash);
      // D1 batches execute transactionally. Unique keys make retries and racing clicks idempotent.
      const [, result] = await env.DB.batch([mutation, snapshot(env.DB, hash)]);
      const current = state(result.results[0]);
      return reply(current);
    } catch {
      // Never log IPs, request headers, or database internals.
      return reply({ error: 'unavailable' }, 503);
    }
  },
};
