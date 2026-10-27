import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const source=readFileSync(new URL('../assets/js/doro-modbus-releases.js',import.meta.url),'utf8');
const release = (version,extra={}) => ({tag_name:`v${version}`,draft:false,assets:[{name:`Doro.Modbus.${version}.exe`,size:1234567,browser_download_url:`https://github.com/Duki-Programming/Doro-Modbus-releases/releases/download/v${version}/Doro.Modbus.${version}.exe`}],...extra});
async function page(releases, current='v0.1.0') {
 const nodes=new Map(['download-link','windows-release-version','windows-release-notes'].map(k=>[k,{href:'original',textContent:'original'}]));
 const root={dataset:{releaseVersion:current}},details={};
 const context={AbortSignal,fetch:async()=>({ok:Array.isArray(releases),json:async()=>releases}),document:{documentElement:{lang:'en'},getElementById:id=>nodes.get(id),querySelector:s=>s==='[data-release-version]'?root:details}};
 await vm.runInNewContext(source,context);await new Promise(resolve=>setImmediate(resolve));
 return {nodes,root};
}
test('selects newest numeric beta with an EXE and ignores drafts and incomplete releases',async()=>{
 const p=await page([release('0.9.0'),release('0.10.0'),release('1.0.0',{draft:true}),release('2.0.0',{assets:[]})]);
 assert.equal(p.nodes.get('windows-release-version').textContent,'v0.10.0 Beta');
 assert.match(p.nodes.get('download-link').href,/v0\.10\.0/);
});
test('unavailable API and stale release lists preserve generated links',async()=>{
 for(const releases of [null,[release('0.0.9')]]){
  const p=await page(releases);assert.equal(p.nodes.get('download-link').href,'original');
 }
});
test('rejects unexpected asset download destinations',async()=>{
 const p=await page([release('0.2.0',{assets:[{name:'Doro.Modbus.0.2.0.exe',browser_download_url:'https://other.example/file.exe'}]})]);
 assert.equal(p.nodes.get('download-link').href,'original');
});
