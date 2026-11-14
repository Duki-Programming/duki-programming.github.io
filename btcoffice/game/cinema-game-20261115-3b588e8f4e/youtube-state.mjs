export function parseVideoLink(value){
  if(typeof value!=='string'||value.length>2000)return null;
  value=value.trim();if(/^[\w-]{11}$/.test(value))return value;
  try{const u=new URL(value);if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.port)return null;
    const host=u.hostname.toLowerCase(),parts=u.pathname.split('/').filter(Boolean);let id;
    if(host==='youtu.be')id=parts.length===1?parts[0]:null;
    else if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com'].includes(host))id=u.pathname==='/watch'?u.searchParams.get('v'):['shorts','live','embed'].includes(parts[0])&&parts.length===2?parts[1]:null;
    return /^[\w-]{11}$/.test(id||'')?id:null;
  }catch{return null;}
}
export const videoPosition=(state,serverNow)=>Math.max(0,state.position+(state.status==='playing'?Math.max(0,serverNow-state.at)/1000:0));
export function parseTime(value){const parts=String(value).trim().split(':');if(parts.length>3||parts.some(p=>!/^\d+(\.\d+)?$/.test(p)))return null;const n=parts.reduce((n,p)=>n*60+Number(p),0);return n<=604800?n:null;}
// Find an unobscured player rectangle. Game chat/touch overlays must never cover
// YouTube's controls or branding. Insufficient space gets an explicit prompt.
export function safeVideoRect(width,height,holes){
  const xs=[...new Set([0,width,...holes.flatMap(h=>[Math.max(0,h[0]),Math.min(width,h[2])])])].filter(x=>x>=0&&x<=width).sort((a,b)=>a-b);let best=null;
  for(let l=0;l<xs.length;l++)for(let r=l+1;r<xs.length;r++){
    const x=xs[l],w=xs[r]-x;if(w<200)continue;
    const blocked=holes.filter(h=>h[0]<xs[r]&&h[2]>x).map(h=>[Math.max(0,h[1]),Math.min(height,h[3])]).filter(h=>h[1]>h[0]).sort((a,b)=>a[0]-b[0]);
    let top=0;for(const span of [...blocked,[height,height]]){const h=span[0]-top;if(h>=200){const score=w*Math.min(h,w*9/16);if(!best||score>best.score)best={x,y:top,width:w,height:h,score};}top=Math.max(top,span[1]);}
  }
  return best;
}
