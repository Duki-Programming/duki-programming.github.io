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
