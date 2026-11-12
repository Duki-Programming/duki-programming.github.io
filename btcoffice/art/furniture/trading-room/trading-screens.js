/* Offline trading-terminal artwork. Prices are deterministic demo data. */
(function (root) {
  'use strict';
  const colors = {bg:'#0c121c',panel:'#121c29',line:'#223040',muted:'#73849a',text:'#ccd6e3',up:'#38c7a2',down:'#ef6b79',fast:'#59bfe9',slow:'#e8b759'};
  const closes = [73240,73278,73256,73318,73401,73362,73448,73420,73512,73568,73529,73486,73526,73584,73633,73592,73514,73462,73496,73561,73625,73604,73676,73736,73702,73651,73708,73772,73846,73801,73758,73822,73871,73833,73791,73841];
  const candles = closes.map((close,i)=>({open:i?closes[i-1]:73192,close,high:Math.max(i?closes[i-1]:73192,close)+18+(i*17%39),low:Math.min(i?closes[i-1]:73192,close)-15-(i*13%31),volume:18+Math.abs(close-(i?closes[i-1]:73192))*.52+(i*29%53)}));
  const latest = candles.at(-1).close;
  function average(period){return closes.map((_,i)=>closes.slice(Math.max(0,i-period+1),i+1).reduce((a,b)=>a+b,0)/Math.min(i+1,period));}
  const ma7=average(7),ma25=average(25);
  const markets=[['BTC',latest,'+0.82%','#38c7a2'],['ETH',2684.37,'+1.24%','#38c7a2'],['SOL',183.42,'-0.63%','#ef6b79'],['XRP',.7238,'+2.10%','#38c7a2'],['BNB',612.80,'-0.28%','#ef6b79']];
  function makeCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
  function text(c,value,x,y,size=14,color=colors.text,align='left'){c.font=`${size}px Galmuri, monospace`;c.textBaseline='top';c.textAlign=align;c.fillStyle=color;c.fillText(value,Math.round(x),Math.round(y));}
  function line(c,points,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
  function rule(c,x,y,w){c.fillStyle=colors.line;c.fillRect(x,y,w,1);}
  function chart(c,w,h){
    const narrow=w<500;
    c.fillStyle=colors.panel;c.fillRect(0,0,w,31);
    text(c,'BTC/USDT',10,7,16);text(c,'15m',narrow?116:126,8,14,colors.fast);
    text(c,latest.toLocaleString('en-US')+'.0',w-10,7,16,colors.up,'right');
    text(c,'MA 7',10,38,12,colors.fast);text(c,'MA 25',65,38,12,colors.slow);
    const last=candles.at(-1);
    if(!narrow)text(c,['O','H','L','C'].map((label,i)=>label+' '+[last.open,last.high,last.low,last.close][i].toLocaleString('en-US')).join('  '),124,38,11,colors.muted);
    const plot={x:9,y:57,w:w-76,h:h-114};
    const low=73100,high=74000,mapY=p=>plot.y+(high-p)/(high-low)*plot.h;
    c.strokeStyle=colors.line;c.lineWidth=1;
    for(let i=0;i<=3;i++){const y=plot.y+i*plot.h/3;rule(c,plot.x,Math.round(y),plot.w);text(c,String(Math.round(high-i*(high-low)/3)),w-6,y-5,11,colors.muted,'right');}
    for(let i=0;i<6;i++){const x=plot.x+i*plot.w/5;line(c,[[x,plot.y],[x,plot.y+plot.h]],colors.line);}
    const first=narrow?12:0,list=candles.slice(first),step=plot.w/list.length,body=Math.max(3,Math.floor(step*.57));
    const volumeY=plot.y+plot.h+7,volumeH=24,maxV=Math.max(...candles.map(d=>d.volume));
    list.forEach((d,i)=>{const x=Math.round(plot.x+(i+.5)*step),top=mapY(Math.max(d.open,d.close)),bottom=mapY(Math.min(d.open,d.close)),color=d.close>=d.open?colors.up:colors.down;
      c.fillStyle=color;c.fillRect(x-1,Math.round(mapY(d.high)),2,Math.max(2,Math.round(mapY(d.low)-mapY(d.high))));
      c.fillRect(x-Math.floor(body/2),Math.round(top),body,Math.max(2,Math.round(bottom-top)));
      c.globalAlpha=.58;c.fillRect(x-Math.floor(body/2),Math.round(volumeY+volumeH*(1-d.volume/maxV)),body,Math.max(2,Math.round(volumeH*d.volume/maxV)));c.globalAlpha=1;
    });
    for(const [values,color]of [[ma7,colors.fast],[ma25,colors.slow]])line(c,values.slice(first).map((v,i)=>[plot.x+(i+.5)*step,mapY(v)]),color,1.5);
    const lastY=mapY(latest);c.setLineDash([4,4]);line(c,[[plot.x,lastY],[plot.x+plot.w,lastY]],colors.up,1);c.setLineDash([]);
    c.fillStyle='#183c38';c.fillRect(w-64,lastY-7,64,15);text(c,String(latest),w-5,lastY-5,11,colors.up,'right');
    text(c,'VOL',10,volumeY+2,10,colors.muted);
    for(let i=0;i<4;i++)text(c,String(9+first/4+i*list.length/12).padStart(2,'0')+':00',plot.x+i*plot.w/3,h-17,11,colors.muted,i===3?'right':'left');
  }
  function watchlist(c,w,h){
    c.fillStyle=colors.panel;c.fillRect(0,0,w,28);text(c,'MARKETS',9,6,15);text(c,'USDT',w-8,7,12,colors.muted,'right');
    text(c,'PAIR',9,34,11,colors.muted);text(c,'LAST',w*.60,34,11,colors.muted,'right');text(c,'24H',w-8,34,11,colors.muted,'right');
    markets.forEach(([symbol,price,change,color],i)=>{const y=52+i*22;
      if(i===0){c.fillStyle='#172c37';c.fillRect(3,y-2,w-6,21);}
      text(c,symbol,9,y,14);text(c,price<1?price.toFixed(4):price.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}),w*.60,y,13,colors.text,'right');text(c,change,w-8,y,13,color,'right');rule(c,8,y+19,w-16);
    });
    const top=171; if(h-top<28)return;
    text(c,'BTC  1H',9,top,11,colors.muted);const x0=92,x1=w-10,y0=top+3,y1=h-9;
    rule(c,x0,y1,x1-x0);const points=closes.map((v,i)=>[x0+i*(x1-x0)/(closes.length-1),y1-(v-73100)/950*(y1-y0)]);line(c,points,colors.fast,2);
  }
  function orderbook(c,w,h){
    c.fillStyle=colors.panel;c.fillRect(0,0,w,28);text(c,'BTC / USDT',9,6,14);text(c,'ORDER BOOK',w-8,8,10,colors.muted,'right');
    text(c,'PRICE',9,34,11,colors.muted);text(c,'SIZE',w*.68,34,11,colors.muted,'right');text(c,'TOTAL',w-8,34,11,colors.muted,'right');
    const row=12,start=49,count=4,amounts=[.482,1.316,.743,2.108];
    for(let side=0;side<2;side++){
      let total=0;
      for(let i=0;i<count;i++){
        const sell=side===0,amount=amounts[(i+side)%4],price=sell?latest+(count-i)*.2:latest-(i+1)*.2,y=start+i*row+side*(count*row+23);total+=amount;
        const cumulative=sell?amounts.slice(i).reduce((a,b)=>a+b,0):total;
        c.fillStyle=sell?'#39232d':'#15372f';const depth=Math.round(cumulative/4.649*w*.64);c.fillRect(w-depth,y-1,depth,row-1);
        text(c,price.toFixed(1),9,y,11,sell?colors.down:colors.up);text(c,amount.toFixed(3),w*.68,y,11,colors.text,'right');text(c,cumulative.toFixed(3),w-8,y,11,colors.muted,'right');
      }
    }
    const mid=start+count*row+2;rule(c,6,mid-3,w-12);text(c,latest.toLocaleString('en-US')+'.0',10,mid,17,colors.up);text(c,'0.4 spread',w-8,mid+3,10,colors.muted,'right');
    if(h>=220){rule(c,6,175,w-12);text(c,'RECENT TRADES',9,181,10,colors.muted);text(c,'18:00:02   73841.0   0.120',9,195,11,colors.up);text(c,'18:00:01   73840.8   0.284',9,208,11,colors.down);}
  }
  function createTexture(kind,w,h){const canvas=makeCanvas(w,h),c=canvas.getContext('2d');c.fillStyle=colors.bg;c.fillRect(0,0,w,h);({chart,markets:watchlist,book:orderbook}[kind]||chart)(c,w,h);return canvas;}

  // Unit rectangle -> measured screen quadrilateral, including perspective.
  function homography(q){
    const [[x0,y0],[x1,y1],[x2,y2],[x3,y3]]=q;
    const dx1=x1-x2,dx2=x3-x2,dx3=x0-x1+x2-x3,dy1=y1-y2,dy2=y3-y2,dy3=y0-y1+y2-y3;
    let g=0,h=0;
    if(Math.abs(dx3)+Math.abs(dy3)>1e-12){const det=dx1*dy2-dx2*dy1;if(Math.abs(det)<1e-12)throw Error('Degenerate screen quadrilateral');g=(dx3*dy2-dx2*dy3)/det;h=(dx1*dy3-dx3*dy1)/det;}
    return [x1-x0+g*x1,x3-x0+h*x3,x0,y1-y0+g*y1,y3-y0+h*y3,y0,g,h,1];
  }
  function inverse(m){const[a,b,c,d,e,f,g,h,i]=m,det=a*(e*i-f*h)-b*(d*i-f*g)+c*(d*h-e*g);if(Math.abs(det)<1e-12)throw Error('Singular screen transform');return[(e*i-f*h)/det,(c*h-b*i)/det,(b*f-c*e)/det,(f*g-d*i)/det,(a*i-c*g)/det,(c*d-a*f)/det,(d*h-e*g)/det,(b*g-a*h)/det,(a*e-b*d)/det];}
  function point(m,x,y){const den=m[6]*x+m[7]*y+m[8];return[(m[0]*x+m[1]*y+m[2])/den,(m[3]*x+m[4]*y+m[5])/den];}
  function project(texture,asset,mask,scale){
    const out=makeCanvas(asset.width*scale,asset.height*scale),c=out.getContext('2d'),pixels=c.createImageData(out.width,out.height),input=texture.getContext('2d').getImageData(0,0,texture.width,texture.height),map=inverse(homography(asset.screen_quad));
    for(let y=0;y<out.height;y++)for(let x=0;x<out.width;x++){
      const[u,v]=point(map,(x+.5)/scale,(y+.5)/scale);if(u<0||u>=1||v<0||v>=1)continue;
      const sx=Math.min(texture.width-1,Math.floor(u*texture.width)),sy=Math.min(texture.height-1,Math.floor(v*texture.height)),from=(sy*texture.width+sx)*4,to=(y*out.width+x)*4;
      pixels.data[to]=input.data[from];pixels.data[to+1]=input.data[from+1];pixels.data[to+2]=input.data[from+2];pixels.data[to+3]=255;
    }
    c.putImageData(pixels,0,0);c.imageSmoothingEnabled=false;c.globalCompositeOperation='destination-in';c.drawImage(mask,0,0,out.width,out.height);c.globalCompositeOperation='source-over';return out;
  }
  const api={candles,closes,ma7,ma25,latest,createTexture,homography,inverse,point,project};
  root.TradingScreens=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
