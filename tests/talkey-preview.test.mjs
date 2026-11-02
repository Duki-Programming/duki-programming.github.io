import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
test('Talkey is an introduction with no distribution files or live download links',()=>{
 const page=read('_includes/talkey-page.html');
 assert.match(page,/data-release-state="development"/);
 assert.match(page,/<button[^>]*disabled[^>]*aria-disabled="true"/);
 assert.doesNotMatch(page,/releases\/download|\.ipa\b|testflight\.apple|apps\.apple|releases\.js/);
 for(const lang of ['','en/','ja/']){
  const route=read(`talkey/${lang}index.html`);
  assert.match(route,/product: talkey/);
  assert.doesNotMatch(route,/release_repository|releases_url/);
 }
 assert.ok(readdirSync(new URL('../assets/programs/talkey/',import.meta.url)).every(name=>/\.png$/.test(name)));
 const copy=JSON.parse(read('_data/talkey_copy.yml'));
 assert.match(copy.ko.status,/작업 중/);
 assert.match(copy.en.status,/In development/);
 assert.match(copy.ja.status,/開発中/);
 assert.equal((read('_data/catalog.yml').match(/id: talkey/g)||[]).length,3);
});
