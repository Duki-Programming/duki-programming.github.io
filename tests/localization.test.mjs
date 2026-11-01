import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const build=process.env.JEKYLL_DESTINATION || path.join(root,'dist');
const read=file=>readFileSync(file,'utf8');
const families=['','market-peek','doro-modbus','bitbox','privacy'];
const route=(family,lang)=>`/${family ? family+'/' : ''}${lang==='ko' ? '' : lang+'/'}`;
const output=url=>path.join(build,url,'index.html');

test('all copy fields have Japanese translations with matching data types',()=>{
 const names=['catalog','market_peek_copy','doro_modbus_copy','bitbox_copy','privacy','ui'];
 const data=JSON.parse(execFileSync('ruby',['-ryaml','-rjson','-e',"puts JSON.generate(ARGV.to_h { |name| [name,YAML.load_file(\"_data/#{name}.yml\")] })",...names],{cwd:root,encoding:'utf8'}));
 const shape=value=>Array.isArray(value)?value.map(shape):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,shape(v)])):typeof value;
 for(const [name,copy] of Object.entries(data)){
  assert.deepEqual(shape(copy.ja),shape(copy.en),name);
  assert.doesNotMatch(JSON.stringify(copy.ja),/[가-힣]/,`${name}: Korean text in Japanese copy`);
 }
});

test('every published page has reciprocal language routes and fonts stay within English product pages',()=>{
 assert.ok(existsSync(build),'Run bundle exec jekyll build --destination dist first.');
 const sitemap=read(path.join(build,'sitemap.xml'));
 for(const family of families) for(const lang of ['ko','en','ja']){
  const url=route(family,lang), html=read(output(url));
  assert.match(html,new RegExp(`<html lang="${lang}">`));
  assert.doesNotMatch(html,/Liquid (?:Exception|error)|<h1[^>]*>\s*<\/h1>/);
  for(const other of ['ko','en','ja']){
   const otherUrl=route(family,other);
   assert.ok(html.includes(`hreflang="${other}" href="https://duki-programming.github.io${otherUrl}"`),`${url}: SEO ${other}`);
   assert.ok(html.includes(`href="${otherUrl}" lang="${other}" hreflang="${other}"`),`${url}: switch ${other}`);
  }
  const switchHtml=html.match(/<nav class="(?:company|product)-language"[\s\S]*?<\/nav>/)?.[0];
  assert.ok(switchHtml,url);assert.equal((switchHtml.match(/aria-current="page"/g)||[]).length,1,url);
  const product=['market-peek','doro-modbus','bitbox'].includes(family);
  assert.equal(html.includes('/assets/css/product-english-font.css'),product&&lang==='en',`${url}: font scope`);
  assert.ok(sitemap.includes(`https://duki-programming.github.io${url}</loc>`),url);
  if(family==='privacy') assert.doesNotMatch(html,/adsbygoogle|notifier-analytics/);
  if(!family) assert.doesNotMatch(html,/notifier-analytics/);
 }
 const main=read(output('/ja/'));
 for(const product of ['market-peek','doro-modbus','bitbox']) assert.ok(main.includes(`href="/${product}/ja/"`));
 for(const file of ['PixelOperator.ttf','PixelOperator-Bold.ttf','LICENSE.txt']) assert.ok(existsSync(path.join(build,'assets/fonts/pixel-operator',file)));
});
