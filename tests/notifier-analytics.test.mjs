import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../assets/js/notifier-analytics.js', import.meta.url), 'utf8');
function page(storage = new Map(), endpoint = 'https://metrics.example', path = '/market-peek/', program) {
  const calls = []; let click;
  const context = { URL, Date, Map, crypto, location: { pathname: path },
    sessionStorage: { getItem: key => storage.get(key), setItem: (k,v) => storage.set(k,v) },
    fetch: async (url, options) => { calls.push(JSON.parse(options.body)); },
    document: { currentScript: { dataset: { api: endpoint, program } }, addEventListener: (_, fn) => { click = fn; } } };
  vm.runInNewContext(source, context);
  return { calls, click: (href, disabled = false) => click({ target: { closest: () => ({ href, getAttribute: () => disabled ? 'true' : null }) } }) };
}
test('refreshes in a tab do not inflate views; query strings are absent', () => {
  const storage = new Map(); assert.equal(page(storage).calls.length, 1);
  assert.equal(page(storage).calls.length, 0);
});
test('catalog roots are excluded while product and translated product pages remain tracked', () => {
  for (const path of ['/', '/en/', '/index.html', '/en/index.html']) {
    assert.equal(page(new Map(), 'https://metrics.example', path).calls.length, 0);
  }
  for (const path of ['/market-peek/', '/market-peek/en/', '/ble-smart-cube/', '/doro-modbus/', '/doro-modbus/en/']) {
    const p = page(new Map(), 'https://metrics.example', path);
    assert.equal(p.calls.length, 1);
    assert.equal(p.calls[0].page, path);
  }
});
test('tracks live download links and suppresses double clicks, disabled links and release notes', () => {
  const p = page();
  const file = 'https://github.com/Duki-Programming/Market-Peek-releases/releases/download/v1/app.dmg';
  p.click(file); p.click(file);
  p.click('https://github.com/Duki-Programming/Market-Peek-releases/releases/tag/v1');
  p.click(file.replace('.dmg', '.exe'), true);
  assert.equal(p.calls.length, 2); assert.equal(p.calls[1].platform, 'macos');
});
test('unconfigured or insecure collectors remain inactive', () => {
  assert.equal(page(new Map(), '').calls.length, 0);
  assert.equal(page(new Map(), 'http://metrics.example').calls.length, 0);
});

test('new products work without editing a hard-coded list in either language', () => {
  for (const path of ['/new-serial-tool/', '/new-serial-tool/en/']) {
    const p = page(new Map(), 'https://metrics.example', path);
    assert.equal(p.calls[0].program, 'new-serial-tool');
    p.click('https://github.com/Duki-Programming/New-Tool-releases/releases/download/v1/tool.exe');
    assert.equal(p.calls[1].program, 'new-serial-tool');
  }
});
test('product metadata supports nested routes and keeps identities stable', () => {
  const p = page(new Map(), 'https://metrics.example', '/tools/new-tool/en/', 'new-tool');
  assert.equal(p.calls[0].program, 'new-tool');
});
