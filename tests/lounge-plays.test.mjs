import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../assets/js/lounge-plays.js',import.meta.url),'utf8');
function page({failed=false,count=12}={}) {
  const calls=[],events={},number={textContent:'—'};let click;
  vm.runInNewContext(source,{URL,Intl,Number,AbortSignal,
    document:{currentScript:{dataset:{api:'https://game.test'}},documentElement:{lang:'ko'},querySelectorAll:()=>[number],addEventListener:(_,fn)=>{click=fn;}},
    window:{addEventListener:(name,fn)=>{events[name]=fn;}},
    fetch:async(url,options)=>{calls.push({url,...options});return {ok:!failed,json:async()=>({ok:true,plays:count})};}
  });
  return {calls,number,events,click:(entry=true,prevented=false)=>click({button:0,defaultPrevented:prevented,target:{closest:()=>entry?{}:null}})};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('page loading reads statistics without recording a lounge entry',async()=>{
  const p=page();await flush();assert.equal(p.number.textContent,'12');assert.equal(p.calls.length,1);assert.equal(p.calls[0].method,undefined);
  p.click(false);p.click(true,true);assert.equal(p.calls.length,1);
});
test('explicit lounge click records once without delaying navigation or submitting an identity',async()=>{
  const p=page();p.click();p.click();await flush();const posts=p.calls.filter(call=>call.method==='POST');assert.equal(posts.length,1);assert.equal(posts[0].keepalive,true);assert.equal(posts[0].credentials,'omit');assert.equal(posts[0].body,'{}');
});
test('bfcache restores refresh counts and unavailable numbers are not invented',async()=>{
  const p=page();await flush();p.events.pageshow({persisted:true});await flush();assert.equal(p.calls.length,2);
  const bad=page({failed:true});await flush();assert.equal(bad.number.textContent,'—');
  const malformed=page({count:-1});await flush();assert.equal(malformed.number.textContent,'—');
});
