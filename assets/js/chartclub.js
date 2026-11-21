(() => {
  const install=document.querySelector('[data-app-install]');
  if(install){
    const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1),android=/Android/.test(navigator.userAgent),lang=document.documentElement.lang;
    const labels={ko:ios?'아이폰 설치 안내':android?'안드로이드 앱 다운로드':'앱 다운로드',en:ios?'Install on iPhone':android?'Download Android app':'Download app',ja:ios?'iPhoneのインストール案内':android?'Androidアプリをダウンロード':'アプリをダウンロード'};
    install.textContent=labels[lang]||labels.en;
    if(android)install.href='https://github.com/Duki-Programming/duki-programming.github.io/releases/download/chart-club-v1.0.8/Chart-Club-1.0.8-Android.apk';
  }
  document.querySelectorAll('[data-gallery]').forEach(gallery => {
    const buttons=[...gallery.querySelectorAll('[data-panel]')];
    const select=button=>buttons.forEach(tab=>{const selected=tab===button;tab.setAttribute('aria-pressed',String(selected));document.getElementById(tab.dataset.panel).hidden=!selected;});
    buttons.forEach((button,index)=>{button.addEventListener('click',()=>select(button));button.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const target=buttons[event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length];select(target);target.focus();});});
  });
  const dialog=document.querySelector('.bb-lightbox');
  if(dialog?.showModal){document.querySelectorAll('[data-enlarge]').forEach(button=>button.addEventListener('click',()=>{const source=button.querySelector('img'),image=dialog.querySelector('img');image.src=source.currentSrc||source.src;image.alt=source.alt;dialog.querySelector('p').textContent=button.closest('figure').querySelector('figcaption').textContent;dialog.showModal();}));dialog.querySelector('button').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});}
  const canvas=document.querySelector('[data-traffic]'),control=document.querySelector('.bb-motion');if(!canvas)return;
  const ctx=canvas.getContext('2d'),motion=matchMedia('(prefers-reduced-motion: reduce)');
  let paused=motion.matches,visible=true,frame=0,last=0,cars=[Math.random()<.5?{lane:0,x:170,speed:190}:{lane:1,x:1150,speed:210}],wait=[4.8,8.2];
  const random=(min,max)=>min+Math.random()*(max-min);
  let lighting=null;
  const silhouettes=new Map();
  fetch(canvas.dataset.assets+'lighting.json').then(response=>response.ok?response.json():null).then(value=>{lighting=value;paint();}).catch(()=>{});
  const sprites=['east','west'].map(name=>{const img=new Image();img.src=canvas.dataset.assets+'taxi-'+name+'.png';return img;});
  function castShadow(image,x,y,wheels){
    if(!lighting||!image.complete||!image.naturalWidth)return;
    const footX=x+image.naturalWidth/2,footY=y+wheels,height=lighting.caster_height;
    let dx=0,dy=0,total=0;
    for(const light of lighting.lights){const ax=footX-light.x,ay=footY-light.y,weight=Math.max(0,1-Math.hypot(ax,ay)/light.radius)**2*light.strength;
      dx+=ax*height/Math.max(1,light.height-height)*weight;dy+=ay*height/Math.max(1,light.height-height)*weight;total+=weight;}
    if(total<=.001)return;
    dx/=total;dy/=total;const length=Math.hypot(dx,dy),limit=lighting.max_length;
    if(length>limit){dx*=limit/length;dy*=limit/length;}
    let silhouette=silhouettes.get(image);
    if(!silhouette){silhouette=document.createElement('canvas');silhouette.width=image.naturalWidth;silhouette.height=image.naturalHeight;const mask=silhouette.getContext('2d');mask.drawImage(image,0,0);mask.globalCompositeOperation='source-in';mask.fillStyle='#05050c';mask.fillRect(0,0,silhouette.width,silhouette.height);silhouettes.set(image,silhouette);}
    const sx=dx/image.naturalHeight,sy=dy/image.naturalHeight;
    for(const [fx,fy] of [[-2,1],[2,1],[0,0]]){ctx.save();ctx.globalAlpha=Math.min(1,total)*lighting.opacity/3;ctx.transform(1,0,-sx,-sy,x+wheels*sx+fx,footY+wheels*sy+fy);ctx.drawImage(silhouette,0,0);ctx.restore();}
  }
  function paint(){ctx.clearRect(0,0,1536,1024);ctx.imageSmoothingEnabled=false;
    for(const car of cars){const east=car.lane===0,x=Math.round(car.x/2)*2,y=east?838:900,d=east?1:-1,lamp=x+(east?202:20),ly=east?899:971;
      castShadow(sprites[car.lane],x,y,east?92:114);
      ctx.fillStyle='#0005';ctx.fillRect(x+(east?19:30),y+(east?92:114),190,5);if(sprites[car.lane].complete&&sprites[car.lane].naturalWidth)ctx.drawImage(sprites[car.lane],x,y);
      ctx.save();ctx.globalCompositeOperation='screen';
      for(let band=0;band<6;band++){const reach=520-band*14,spread=60-band*7,beam=ctx.createLinearGradient(lamp,ly,lamp+d*reach,ly);beam.addColorStop(0,'rgba(255,184,77,.035)');beam.addColorStop(1,'rgba(255,125,33,0)');ctx.fillStyle=beam;ctx.beginPath();ctx.moveTo(lamp,ly-5);ctx.lineTo(lamp+d*reach,ly+12-spread);ctx.lineTo(lamp+d*reach,ly+12+spread);ctx.lineTo(lamp,ly+8);ctx.closePath();ctx.fill();}
      const core=ctx.createLinearGradient(lamp,ly,lamp+d*280,ly);core.addColorStop(0,'rgba(255,217,117,.15)');core.addColorStop(1,'rgba(255,166,56,0)');ctx.fillStyle=core;ctx.beginPath();ctx.moveTo(lamp,ly-3);ctx.lineTo(lamp+d*280,ly-5);ctx.lineTo(lamp+d*280,ly+18);ctx.lineTo(lamp,ly+5);ctx.closePath();ctx.fill();ctx.fillStyle='rgba(255,219,133,.6)';ctx.fillRect(lamp-4,ly-3,8,6);ctx.restore();
    }
  }
  function tick(now){frame=0;const delta=Math.min(.08,last?(now-last)/1000:0);last=now;for(const car of cars)car.x+=car.speed*delta*(car.lane===0?1:-1);cars=cars.filter(car=>car.x>-560&&car.x<1850);
    for(let lane=0;lane<2;lane++){wait[lane]-=delta;if(wait[lane]>0)continue;const x=lane===0?-250:1550;if(cars.every(car=>car.lane!==lane||Math.abs(car.x-x)>=600)){cars.push({lane,x,speed:random(165,225)});wait[lane]=random(6.4,14);}else wait[lane]=.5;}
    paint();if(!paused&&visible&&!document.hidden)frame=requestAnimationFrame(tick);
  }
  function sync(){cancelAnimationFrame(frame);frame=0;last=0;control.hidden=false;control.setAttribute('aria-label',paused?control.dataset.resumeLabel:control.dataset.pauseLabel);control.setAttribute('aria-pressed',String(paused));control.querySelector('span').textContent=paused?'▶':'Ⅱ';paint();if(!paused&&visible&&!document.hidden)frame=requestAnimationFrame(tick);}
  control.addEventListener('click',()=>{paused=!paused;sync();});motion.addEventListener('change',()=>{paused=motion.matches;sync();});document.addEventListener('visibilitychange',sync);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{rootMargin:'100px'}).observe(canvas.closest('.bb-hero'));
  sprites.forEach(img=>img.addEventListener('load',paint));sync();
})();
