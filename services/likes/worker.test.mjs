import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import worker, { normalizeIp } from './worker.mjs';

const origin = 'https://duki-programming.github.io';
function fixture(t) {
  const sqlite = new DatabaseSync(':memory:');
  for (const name of readdirSync(new URL('./migrations/', import.meta.url)).sort()) {
    sqlite.exec(readFileSync(new URL(`./migrations/${name}`, import.meta.url), 'utf8'));
  }
  t.after(() => sqlite.close());
  const wrap = (sql, args = []) => ({
    bind: (...values) => wrap(sql, values),
    first: async () => sqlite.prepare(sql).get(...args),
    all: async () => ({ results: sqlite.prepare(sql).all(...args) }),
    execute: () => sql.trim().startsWith('SELECT') ? { results: sqlite.prepare(sql).all(...args) } : { results: [], meta: sqlite.prepare(sql).run(...args) },
  });
  const env = { ALLOWED_ORIGIN: origin, IP_HASH_SECRET: 'test-only-secret-with-at-least-32-characters', DB: {
    prepare: sql => wrap(sql),
    batch: async statements => {
      sqlite.exec('BEGIN');
      try { const result = statements.map(statement => statement.execute()); sqlite.exec('COMMIT'); return result; }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  } };
  const send = async (route, { ip = '203.0.113.1', method = 'GET', headers = {}, environment = env } = {}) => {
    const response = await worker.fetch(new Request(`https://likes.example/v1/market-peek/${route}`, {
      method, headers: { Origin: origin, 'CF-Connecting-IP': ip, ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}), ...headers },
    }), environment);
    return { response, data: response.status === 204 ? null : await response.json() };
  };
  return { send, sqlite, env };
}

test('downloads unlock one like per IP, concurrent requests and both languages share the count', async t => {
  const { send, sqlite } = fixture(t);
  assert.deepEqual((await send('likes')).data, { count: 0, liked: false, downloaded: false });
  assert.equal((await send('likes', { method: 'POST' })).response.status, 409);
  assert.equal((await send('download', { method: 'POST' })).data.downloaded, true);
  await Promise.all(Array.from({ length: 12 }, () => send('likes', { method: 'POST' })));
  assert.deepEqual((await send('likes')).data, { count: 1, liked: true, downloaded: true });
  assert.equal((await send('likes', { ip: '203.0.113.2' })).data.liked, false);
  await send('download', { ip: '203.0.113.2', method: 'POST' });
  assert.equal((await send('likes', { ip: '203.0.113.2', method: 'POST' })).data.count, 2);
  assert.equal((await send('likes')).data.count, 2);
  const rows = sqlite.prepare('SELECT ip_hash FROM likes').all();
  assert(rows.every(row => /^[a-f0-9]{64}$/.test(row.ip_hash)));
});

test('equivalent IPv6 and mapped IPv4 addresses cannot bypass duplicate protection', async t => {
  const { send } = fixture(t);
  assert.equal(normalizeIp('2001:0db8:0000:0000:0000:0000:0000:0001'), '2001:db8::1');
  assert.equal(normalizeIp('::ffff:203.0.113.1'), '203.0.113.1');
  await send('download', { ip: '2001:db8::1', method: 'POST' });
  await send('likes', { ip: '2001:0db8:0000:0000:0000:0000:0000:0001', method: 'POST' });
  assert.equal((await send('likes', { ip: '2001:db8::1' })).data.liked, true);
});

test('rejects other origins, missing edge identity, invalid writes, and missing secrets', async t => {
  const { send, env } = fixture(t);
  assert.equal((await send('likes', { method: 'POST', headers: { Origin: 'https://elsewhere.example' } })).response.status, 403);
  assert.equal((await send('likes', { ip: '', headers: { 'X-Forwarded-For': '203.0.113.2' } })).response.status, 400);
  assert.equal((await send('likes', { method: 'POST', headers: { 'Content-Type': 'text/plain' } })).response.status, 415);
  assert.equal((await send('likes', { environment: { ...env, IP_HASH_SECRET: '' } })).response.status, 503);
  const { response } = await send('likes', { method: 'OPTIONS' });
  assert.equal(response.status, 204); assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal((await send('likes')).response.headers.get('Cache-Control'), 'no-store');
});

test('manual likes work immediately; a later download does not add a second like for that OS', async t => {
  const { send } = fixture(t);
  let response = await send('windows/likes', { method: 'POST' });
  assert.deepEqual(response.data.platforms.windows, { count: 1, liked: true, downloaded: false, downloads: 0 });
  response = await send('windows/download', { method: 'POST' });
  assert.deepEqual(response.data.platforms.windows, { count: 1, liked: true, downloaded: true, downloads: 1 });
  await Promise.all(Array.from({ length: 10 }, () => send('windows/download', { method: 'POST' })));
  assert.equal((await send('stats')).data.platforms.windows.downloads, 1);
  assert.equal((await send('stats')).data.platforms.windows.count, 1);
});

test('Windows and macOS each count once per IP; downloads automatically add support', async t => {
  const { send } = fixture(t);
  await send('windows/download', { method: 'POST' });
  await send('macos/download', { method: 'POST' });
  await send('macos/likes', { method: 'POST' });
  await send('windows/likes', { method: 'POST' });
  let state = (await send('stats')).data;
  for (const platform of ['windows', 'macos']) assert.deepEqual(state.platforms[platform], { count: 1, liked: true, downloaded: true, downloads: 1 });
  await send('macos/likes', { method: 'POST', ip: '203.0.113.2' });
  state = (await send('stats', { ip: '203.0.113.2' })).data;
  assert.deepEqual(state.platforms.macos, { count: 2, liked: true, downloaded: false, downloads: 1 });
  assert.deepEqual(state.platforms.windows, { count: 1, liked: false, downloaded: false, downloads: 1 });
  assert.equal((await send('linux/download', { method: 'POST' })).response.status, 404);
  assert.equal((await send('stats', { method: 'POST' })).response.status, 405);
});
