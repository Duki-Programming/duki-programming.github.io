import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../assets/js/market-peek-releases.js', import.meta.url), 'utf8');
const release = version => ({ tag_name: `v${version}`, assets: [
  { name: `Market.Peek.Setup.${version}.exe`, size: 12345 },
  { name: `market-peek-${version}-x64.7z`, size: 12345 },
  { name: `market-peek-${version}-universal.dmg`, size: 12345 },
] });

function page(language = 'ko') {
  const nodes = new Map();
  for (const id of ['windows-release-version', 'mac-release-version', 'download-link', 'archive-link', 'mac-download-link', 'windows-release-notes']) {
    nodes.set(id, { textContent: 'v1.0.4 Beta', href: 'static-1.0.4', firstChild: { textContent: 'static download' }, nextElementSibling: { textContent: 'static size' }, attributes: {},
      removeAttribute(name) { delete this.attributes[name]; if (name === 'href') delete this.href; },
      setAttribute(name, value) { this.attributes[name] = value; },
    });
  }
  nodes.set('main', { dataset: { releaseVersion: 'v1.0.4' } });
  const storage = new Map();
  return { nodes, storage, context: { document: { documentElement: { lang: language }, getElementById: id => nodes.get(id) }, AbortSignal,
    window: { localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) } } } };
}

test('blocked GitHub API preserves the published static downloads in both languages', async () => {
  for (const language of ['ko', 'en']) {
    const p = page(language);
    await vm.runInNewContext(source, { ...p.context, fetch: async () => { throw new Error('blocked'); } });
    assert.equal(p.nodes.get('windows-release-version').textContent, 'v1.0.4 Beta');
    assert.equal(p.nodes.get('mac-download-link').href, 'static-1.0.4');
  }
});

test('older and incomplete same-version caches cannot downgrade static downloads', async () => {
  for (const version of ['1.0.2', '1.0.4']) {
    const p = page();
    const cached = release(version); cached.assets.pop();
    p.storage.set('market-peek-downloads-v2', JSON.stringify({ savedAt: Date.now(), releases: [cached] }));
    await vm.runInNewContext(source, { ...p.context, fetch: async () => ({ ok: false }) });
    assert.equal(p.nodes.get('download-link').href, 'static-1.0.4');
    assert.equal(p.nodes.get('mac-download-link').href, 'static-1.0.4');
  }
});

test('newer published releases can still update both platforms and English labels', async () => {
  const p = page('en');
  await vm.runInNewContext(source, { ...p.context, fetch: async () => ({ ok: true, json: async () => [release('1.0.10')] }) });
  assert.equal(p.nodes.get('windows-release-version').textContent, 'v1.0.10 Beta');
  assert.match(p.nodes.get('download-link').href, /v1.0.10\/Market.Peek.Setup.1.0.10.exe$/);
  assert.equal(p.nodes.get('mac-download-link').firstChild.textContent, 'Download for macOS ');
});

test('a newer Windows-only release disables the obsolete Mac download', async () => {
  const p = page(), latest = release('1.0.5'); latest.assets.pop();
  await vm.runInNewContext(source, { ...p.context, fetch: async () => ({ ok: true, json: async () => [latest, release('1.0.4')] }) });
  assert.equal(p.nodes.get('mac-download-link').attributes['aria-disabled'], 'true');
  assert.equal(p.nodes.get('mac-download-link').href, undefined);
  assert.equal(p.nodes.get('mac-release-version').textContent, 'v1.0.5 Beta 준비 중');
});
