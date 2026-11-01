import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
test('BitBox remains an introduction with no live download route', () => {
  const page = read('_includes/bitbox-page.html');
  assert.match(page, /data-release-state="development"/);
  assert.match(page, /<button[^>]*class="[^"]*bitbox-download[^>]*disabled[^>]*aria-disabled="true"/);
  assert.doesNotMatch(page, /releases\/download|\.ipa\b|testflight\.apple|apps\.apple|data-release-version|releases\.js/);
  for (const path of ['bitbox/index.html', 'bitbox/en/index.html', 'bitbox/ja/index.html']) {
    assert.match(read(path), /product: bitbox/);
    assert.doesNotMatch(read(path), /release_repository|releases_url/);
  }
});
test('BitBox is registered in all three languages and clearly marks sample data', () => {
  assert.equal((read('_data/catalog.yml').match(/id: bitbox/g) || []).length, 3);
  const copy = JSON.parse(read('_data/bitbox_copy.yml'));
  assert.match(copy.ko.status, /작업 중/);
  assert.match(copy.en.status, /In development/);
  assert.match(copy.ja.status, /開発中/);
  assert.match(copy.ko.preview_note, /예시 계좌 데이터/);
  assert.match(copy.en.preview_note, /sample account data/);
  assert.match(copy.ja.preview_note, /サンプルの口座データ/);
  assert.match(read('sitemap.xml'), /\/bitbox\/,\/bitbox\/en\//);
});
