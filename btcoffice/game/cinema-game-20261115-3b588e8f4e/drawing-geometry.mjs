// Price/time anchors are independent of browser size and chart zoom.
export const TOOLS = { select:'선택 / 이동', trend:'추세선', ray:'레이', channel:'평행 채널', pitchfork:'피치포크', fibonacci:'피보나치 되돌림', brush:'자유 그리기' };
export const POINTS = {trend:2,ray:2,channel:3,pitchfork:3,fibonacci:2};
export const DEFAULT_STYLE = {color:'#e9c46a',width:2,dash:'solid',extend_left:false,extend_right:false,levels:[0,.236,.382,.5,.618,.786,1],locked:false};
// Disjoint slabs prevent overlapping HUD cutouts from canceling each other under even-odd clipping.
export function unionRectangles(rects) {
  const xs=[...new Set(rects.flatMap(r=>[r[0],r[2]]))].sort((a,b)=>a-b),result=[];
  for(let i=1;i<xs.length;i++){
    const left=xs[i-1],right=xs[i];if(right<=left)continue;
    const spans=rects.filter(r=>r[0]<right&&r[2]>left).map(r=>[r[1],r[3]]).sort((a,b)=>a[0]-b[0]);
    let current=null;
    for(const span of spans){if(current&&span[0]<=current[1])current[1]=Math.max(current[1],span[1]);else{if(current)result.push([left,current[0],right,current[1]]);current=[...span];}}
    if(current)result.push([left,current[0],right,current[1]]);
  }
  return result;
}
export function timeToLogical(time,bars,step=900) {
  if(!bars.length)return null;
  let lo=0,hi=bars.length-1;
  if(time<=bars[0].time)return (time-bars[0].time)/step;
  if(time>=bars[hi].time)return hi+(time-bars[hi].time)/step;
  while(hi-lo>1){const mid=(lo+hi)>>1;if(bars[mid].time<=time)lo=mid;else hi=mid;}
  return lo+(time-bars[lo].time)/(bars[hi].time-bars[lo].time);
}
export function logicalToTime(logical,bars,step=900) {
  if(!bars.length || !Number.isFinite(logical))return null;
  if(logical<=0)return bars[0].time+logical*step;
  const last=bars.length-1;if(logical>=last)return bars[last].time+(logical-last)*step;
  const i=Math.floor(logical);return bars[i].time+(bars[i+1].time-bars[i].time)*(logical-i);
}
// Parametric clipping handles vertical rays as well as lines whose anchors are offscreen.
export function clipLine(a,b,width,height,left=false,right=false) {
  const dx=b.x-a.x,dy=b.y-a.y;if(Math.hypot(dx,dy)<.001)return null;
  let low=left?-Infinity:0,high=right?Infinity:1;
  for(const [origin,delta,max] of [[a.x,dx,width],[a.y,dy,height]]) {
    if(Math.abs(delta)<1e-10){if(origin<0||origin>max)return null;continue;}
    const t0=(0-origin)/delta,t1=(max-origin)/delta;
    low=Math.max(low,Math.min(t0,t1));high=Math.min(high,Math.max(t0,t1));
  }
  return low<=high?[{x:a.x+low*dx,y:a.y+low*dy},{x:a.x+high*dx,y:a.y+high*dy}]:null;
}
export function geometry(d,project,width,height) {
  const p=d.points.map(project),lines=[],labels=[],fills=[];
  if(p.some(v=>!v||!Number.isFinite(v.x)||!Number.isFinite(v.y)))return {lines,labels,fills,points:[]};
  const line=(a,b,left=d.extend_left,right=d.extend_right,muted=false)=>{const clipped=clipLine(a,b,width,height,left,right);if(clipped)lines.push({points:clipped,muted});return clipped;};
  if(d.kind==='brush'){for(let i=1;i<p.length;i++)line(p[i-1],p[i],false,false);}
  else if(p.length>=2) {
    const [a,b,c]=p;
    if(d.kind==='trend'||d.kind==='ray')line(a,b,d.extend_left,d.kind==='ray'||d.extend_right);
    if(d.kind==='fibonacci') {
      const x1=d.extend_left?0:Math.min(a.x,b.x),x2=d.extend_right?width:Math.max(a.x,b.x);
      for(const level of d.levels){const y=b.y+(a.y-b.y)*level;if(y<0||y>height)continue;
        line({x:x1,y},{x:x2,y},false,false);
        const price=d.points[1].price+(d.points[0].price-d.points[1].price)*level;
        labels.push({x:Math.max(4,Math.min(width-120,x1+5)),y:Math.max(13,y-4),text:`${+(level*100).toFixed(2)}%  ${price.toLocaleString('en-US',{maximumFractionDigits:Math.abs(price)<1?6:Math.abs(price)<10?4:2})}`});
      }
    }
    if(d.kind==='channel'&&c){
      const dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy;
      if(len>0){const t=((c.x-a.x)*dx+(c.y-a.y)*dy)/len,offset={x:c.x-a.x-t*dx,y:c.y-a.y-t*dy};
        const add=(q,k=1)=>({x:q.x+offset.x*k,y:q.y+offset.y*k});
        const one=line(a,b),two=line(add(a),add(b));line(add(a,.5),add(b,.5),d.extend_left,d.extend_right,true);
        if(one&&two)fills.push([one[0],one[1],two[1],two[0]]);
      }
    }
    if(d.kind==='pitchfork'&&c){const mid={x:(b.x+c.x)/2,y:(b.y+c.y)/2},delta={x:mid.x-a.x,y:mid.y-a.y};
      line(a,mid,d.extend_left,true);line(b,{x:b.x+delta.x,y:b.y+delta.y},d.extend_left,true);line(c,{x:c.x+delta.x,y:c.y+delta.y},d.extend_left,true);line(b,c,false,false,true);
    }
  }
  return {lines,labels,fills,points:p};
}
