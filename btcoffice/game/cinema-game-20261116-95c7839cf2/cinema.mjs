import {MarketChart} from './market-peek/chart.mjs';
import {DEFAULTS} from './market-peek/core.mjs';
import {Drawings} from './drawings.mjs';
import {unionRectangles} from './drawing-geometry.mjs';
import {CryptoFeed,mergeCandles} from './crypto-feed.mjs';
import {sharedView,localRange} from './view-state.mjs';
import {Pens} from './pens.mjs';
import {YoutubeScreen} from './youtube.mjs';
import {GameKeyboard} from './keyboard.mjs';
const element=(tag,text,attrs={})=>{const el=document.createElement(tag);if(text)el.textContent=text;Object.assign(el,attrs);return el;};
class Cinema {
  constructor(){this.active=false;this.state=null;this.id='';this.callback=null;this.captured=false;this.chart=null;this.lastView='';this.suppressView=false;this.retries=0;this.lastGeometry='';this.serverOffset=0;}
  get host(){return !!this.state&&this.state.host===this.id;}
  get me(){return this.state?.participants.find(p=>p.id===this.id);}
  mount(options={}) {
    if(this.active)return;this.active=true;this.options=typeof options==='string'?JSON.parse(options):options;this.origin=this.options.api_origin||window.BTC_OFFICE_CONFIG?.api_origin;
    if(!this.origin)return;this.state=null;this.id='';this.lastView='';this.lastGeometry='';
    this.root=element('section',null,{id:'btc-cinema'});this.root.setAttribute('aria-label','공유 차트 시네마');
    const tabs=element('nav',null,{className:'cinema-tabs',ariaLabel:'공용 화면'});this.tabButtons=new Map();
    for(const [tab,title] of [['chart','차트'],['youtube','유튜브']]){const button=element('button',title,{type:'button'});button.dataset.tab=tab;button.onclick=()=>this.mediaCommand('tab',{tab});tabs.append(button);this.tabButtons.set(tab,button);}this.root.append(tabs);
    const header=element('div',null,{className:'cinema-header'});this.symbol=element('strong','BTCUSDT.P',{className:'cinema-symbol'});
    this.searchButton=element('button','⌕ 종목 검색',{title:'코인 · 미국 · 한국 · 중국 · 일본 주식'});this.searchButton.onclick=()=>this.search();
    this.interval=element('select',null,{ariaLabel:'차트 주기'});for(const [value,label] of [['1m','1분'],['5m','5분'],['15m','15분'],['30m','30분'],['1h','1시간'],['4h','4시간'],['1d','일봉'],['1w','주봉']])this.interval.add(new Option(label,value));
    this.interval.onchange=()=>this.send({type:'configure',instrument:this.state.instrument,interval:this.interval.value});
    this.policy=element('button','모두 그리기');this.policy.onclick=()=>this.send({type:'drawing_policy',everyone:!this.state.everyone});
    this.clearButton=element('button','전체 지우기',{title:'현재 차트의 도형 전체 지우기 · 방장 전용',hidden:true});
    this.role=element('span','연결 중…',{className:'cinema-role'});header.append(this.symbol,this.searchButton,this.interval,this.policy,this.clearButton,this.role);
    const body=element('div',null,{className:'cinema-body'}),toolbar=element('nav',null,{className:'cinema-tools'});toolbar.setAttribute('aria-label','차트 그리기 도구');
    this.plot=element('div',null,{className:'cinema-plot'});this.container=element('div',null,{className:'cinema-chart'});this.plot.append(this.container);body.append(toolbar,this.plot);
    const footer=element('div',null,{className:'cinema-footer'});this.hint=element('span','',{className:'cinema-hint'});this.source=element('span','Binance · 데이터 연결 중',{className:'cinema-source'});footer.append(this.hint,this.source);
    this.chartParts=[header,body,footer];this.toast=element('div',null,{className:'cinema-toast'});this.root.append(header,body,footer,this.toast);document.body.append(this.root);
    this.youtube=new YoutubeScreen(this);
    this.chart=new MarketChart(this.container,()=>{});this.container.removeEventListener('dblclick',this.chart.doubleClick,true);
    this.drawings=new Drawings(this,this.plot,toolbar);
    this.pens=new Pens(this,this.plot);
    this.resize=new ResizeObserver(()=>this.drawings.render());this.resize.observe(this.plot);
    this.viewDirty=false;this.chartPointer=false;
    this.viewTimer=setInterval(()=>{if(document.hidden||this.state?.media?.tab!=='chart')return;if(this.host&&this.viewDirty&&!this.suppressView)this.publishView();},200);
    // Market ticks and automatic price scaling never generate room traffic. Only
    // actual chart gestures make the viewport dirty, capped at five updates/sec.
    this.viewInput=e=>{
      const chartTarget=this.plot.contains(e.target),scaleTarget=e.target.closest?.('.price-scale-menu,.price-scale-controls');
      if(e.type==='pointerdown')this.chartPointer=chartTarget;
      if(this.host&&((chartTarget&&['pointerdown','wheel','dblclick'].includes(e.type))||scaleTarget||this.chartPointer&&['pointermove','pointerup'].includes(e.type)))this.markViewDirty();
      if(e.type==='pointerup'||e.type==='pointercancel')this.chartPointer=false;
    };
    for(const type of ['pointerdown','pointermove','pointerup','pointercancel','wheel','click','dblclick'])document.addEventListener(type,this.viewInput,{capture:true,passive:true});
    this.heartbeat=setInterval(()=>{if(this.socket?.readyState===WebSocket.OPEN)this.socket.send('ping');},25000);
    this.visibility=()=>{if(document.hidden)this.pens.leave();this.send({type:'watching',value:!document.hidden});this.feed?.pause(document.hidden||this.state?.media?.tab!=='chart');this.youtube.visibility();if(!document.hidden)this.send({type:'clock',client_time:Date.now()});};document.addEventListener('visibilitychange',this.visibility);
    this.keyboard=new GameKeyboard(this);
    this.connect();
  }
  connect(){
    if(!this.active)return;
    this.socket=new WebSocket(this.origin.replace(/^http/,'ws')+'/api/cinema');
    this.socket.onmessage=e=>{if(e.data==='pong')return;try{this.receive(JSON.parse(e.data));}catch(error){console.error('Cinema packet',error);this.notice('차트를 표시하지 못했습니다. 다시 연결합니다.');}};
    this.socket.onclose=event=>{if(!this.active)return;this.state=null;this.drawings.history.reset();this.drawings.permission();this.emit();
      if([1008,4001,4401,4403].includes(event.code)){this.notice('로그인이 변경되거나 연결이 종료되었습니다. 다시 입장해 주세요.');return;}
      this.notice('연결이 끊어져 다시 연결합니다.');this.reconnect=setTimeout(()=>this.connect(),Math.min(15000,1000*2**this.retries++));};
    this.socket.onerror=()=>{};
  }
  receive(data){
    if(data.type==='clock'){if(Number.isFinite(data.server_time)&&Number.isFinite(data.client_time))this.serverOffset=data.server_time-(Date.now()+data.client_time)/2;return;}
    if(data.type==='media'){if(this.state){this.state.media=data.media;this.applyMedia();}return;}
    if(data.type==='youtube_results'){this.youtube.receive(data);return;}
    if(data.type==='welcome'){
      this.retries=0;this.id=data.id;this.serverOffset=data.server_time-Date.now();this.applyRoom(data);this.drawings.replace(data.drawings);if(this.state.instrument.venue==='yahoo')this.bars(data,true);
      if(this.options.avatar?.character)this.send({type:'avatar',avatar:this.options.avatar});this.visibility();return;
    }
    if(data.type==='room'){this.applyRoom(data);return;}
    if(data.type==='context'){if(data.context!==this.state?.context)return;this.drawings.closeDialog();this.drawings.replace(data.drawings);if(this.state.instrument.venue==='yahoo')this.bars(data,true);return;}
    if(data.type==='bars'){if(data.context===this.state?.context)this.bars(data,false);return;}
    if(data.type==='bars_delta'){if(data.context===this.state?.context){const removed=new Set(data.removed);this.bars({...data,bars:mergeCandles(this.chart.bars.filter(b=>!removed.has(b.time)),data.upsert)},false);}return;}
    if(data.type==='view'){if(data.context===this.state?.context&&data.by!==this.id)this.applyView(data.view);return;}
    if(data.type==='cursor'){if(data.context===this.state?.context)this.pens.receive(data);return;}
    if(data.type==='drawing'){if(data.context===this.state?.context)this.drawings.update(data.drawing,data);return;}
    if(data.type==='drawing_deleted'){if(data.context===this.state?.context)this.drawings.delete(data.id,data);return;}
    if(data.type==='drawings'){if(data.context===this.state?.context)this.drawings.replace(data.drawings);return;}
    if(data.type==='error'||data.type==='chart_error'){this.drawings.history.reject(data.request_id);this.youtube.receive(data);this.notice(data.message);if(data.type==='chart_error')this.source.textContent='데이터 지연 · 자동 재연결';}
  }
  applyRoom(data){
    const changed=this.state?.context!==data.context,wasHost=this.host;this.state=data;
    this.root.classList.toggle('guest',!this.host);this.searchButton.disabled=this.interval.disabled=this.policy.disabled=!this.host;
    this.interval.value=data.interval;this.interval.querySelector('option[value="4h"]').disabled=data.instrument.venue==='yahoo';
    this.symbol.textContent=data.instrument.symbol+(data.instrument.venue==='futures'?'.P':'');this.symbol.title=data.instrument.label;
    this.policy.textContent=data.everyone?'✎ 모두 그리기':'✎ 방장만 그리기';
    const host=data.participants.find(p=>p.id===data.host);this.role.textContent=`${this.host?'★ 내가 방장':'방장 '+(host?.nickname||'없음')} · ${data.participants.length}명`;
    if(changed){
      this.pens.reset();
      this.feed?.destroy();this.feed=null;this.viewDirty=false;this.lastView='';this.source.textContent='데이터 연결 중';const instrument={...data.instrument,id:data.instrument.venue+':'+data.instrument.symbol,name:data.instrument.label,short:data.instrument.symbol};
      const settings={...structuredClone(DEFAULTS),interval:data.interval,cryptoMarket:data.instrument.venue==='futures'?'futures':'spot',cryptoExchange:'binance',theme:'dark',showVolume:true};
      // Retain Market Peek's candlestick/volume renderer; the cinema owns shared navigation.
      for(const indicator of Object.values(settings.indicators))indicator.enabled=false;
      this.chart.configure(settings,instrument);this.drawings.bindSeries();this.chart.setData([],true);this.configureControls();
      if(data.instrument.venue!=='yahoo'){
        const context=data.context;
        this.feed=new CryptoFeed(data.instrument,data.interval,(bars,reset,incremental)=>{if(this.state?.context===context)this.bars({bars},reset,incremental);},status=>{
          if(this.state?.context===context)this.source.textContent='Binance · '+(data.instrument.venue==='futures'?'무기한 선물':'현물')+' · '+(status==='live'?'실시간':'재연결 중');
        });
        this.feed.suspended=document.hidden||data.media?.tab!=='chart';if(!this.feed.suspended)this.feed.start();
      }
    } else if(wasHost!==this.host)this.configureControls();
    this.drawings.permission();this.pens.render();this.applyMedia();this.emit();if(this.host&&!data.view&&this.chart.bars.length>=20)this.markViewDirty();
    if(!this.host&&data.view)this.applyView(data.view);
  }
  configureControls(){
    if(!this.chart?.chart)return;
    this.chart.chart.applyOptions({handleScroll:this.host,handleScale:this.host,kineticScroll:{mouse:false,touch:false},layout:{panes:{enableResize:false}}});
    this.chart.scaleControls.unbind();if(this.host)this.chart.scaleControls.bind();
  }
  applyMedia(){
    const media=this.state?.media;if(!media)return;const chart=media.tab==='chart';
    for(const part of this.chartParts)part.hidden=!chart;
    for(const [name,button] of this.tabButtons){button.disabled=!this.host;button.classList.toggle('active',name===media.tab);button.setAttribute('aria-pressed',String(name===media.tab));}
    this.root.classList.toggle('youtube-active',!chart);this.feed?.pause(document.hidden||!chart);
    if(!chart){this.pens.leave();this.drawings.cancel();}this.youtube.apply(media);
    if(chart)requestAnimationFrame(()=>this.drawings.render());
  }
  mediaCommand(command,extra={}){if(!this.host||!this.state?.media)return;const media=this.state.media;this.send({type:'media_command',command,...extra,generation:media.generation,version:media.version,playback_id:media.playback_id,request_id:crypto.randomUUID()});}
  bars(data,reset,incremental=false){
    if(!this.chart?.chart)return;this.suppressView=true;
    const before=this.chart.bars,structural=reset||before[0]?.time!==data.bars?.[0]?.time||before.at(-1)?.time!==data.bars?.at(-1)?.time;
    this.chart.setData(data.bars||[],reset||!before.length,incremental);
    if(structural&&this.state.view&&!this.viewDirty)this.applyView(this.state.view);
    if(this.host&&!this.state.view&&this.chart.bars.length>=20)this.markViewDirty();
    if(this.state.instrument.venue==='yahoo')this.source.textContent='Yahoo Finance · 지연 시세'+(data.checked?' · '+new Date(data.checked).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'}):' · 조회 중');
    requestAnimationFrame(()=>{this.suppressView=false;this.drawings.render();});
  }
  markViewDirty(){if(this.host)this.viewDirty=true;}
  publishView(){
    if(!this.chart?.bars.length)return;const range=this.chart.chart.timeScale().getVisibleLogicalRange(),scale=this.chart.chart.priceScale('right');if(!range)return;
    const p=scale.getVisibleRange(),view=sharedView(range,p?{from:p.from,to:p.to}:null,scale.options(),this.chart.bars);this.viewDirty=false;
    const serial=JSON.stringify(view);if(serial===this.lastView)return;this.lastView=serial;this.state.view=view;this.send({type:'view',view});
  }
  applyView(view){
    if(!this.chart?.bars.length||!view)return;this.suppressView=true;this.state.view=view;
    const step=({'1m':60,'5m':300,'15m':900,'30m':1800,'1h':3600,'4h':14400,'1d':86400,'1w':604800})[this.state.interval];
    this.chart.chart.timeScale().setVisibleLogicalRange(localRange(view,this.chart.bars,step));const scale=this.chart.chart.priceScale('right');scale.applyOptions({mode:view.mode,invertScale:view.invert,autoScale:view.auto===true});if(!view.auto&&view.price)scale.setVisibleRange(view.price);
    this.lastView=JSON.stringify(view);this.drawings.render();requestAnimationFrame(()=>{this.suppressView=false;});
  }
  command(json){this.send(JSON.parse(json));}
  send(data){if(this.socket?.readyState!==WebSocket.OPEN)return false;this.socket.send(JSON.stringify({context:this.state?.context,...data}));return true;}
  emit(){if(this.callback)this.callback(JSON.stringify({id:this.id,host:this.host,state:this.state,captured:this.captured}));}
  capture(){this.keyboard?.refresh();}
  notice(message){if(!this.toast)return;this.toast.textContent=message;clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>{if(this.toast)this.toast.textContent='';},5000);}
  closeDialog(){this.dialog?.remove();this.dialog=null;this.searchAbort?.abort();clearTimeout(this.searchTimer);this.capture(false);}
  dialogBox(title){this.closeDialog();this.drawings.closeDialog();const dialog=element('dialog',null,{className:'cinema-dialog'});dialog.append(element('h3',title));
    const close=element('button','닫기',{type:'button'}),actions=element('div',null,{className:'dialog-actions'});close.onclick=()=>this.closeDialog();actions.append(close);dialog.addEventListener('cancel',()=>this.closeDialog());document.body.append(dialog);this.dialog=dialog;this.capture(true);return {dialog,actions};
  }
  search(){if(!this.host)return;const {dialog,actions}=this.dialogBox('종목 검색'),input=element('input',null,{className:'cinema-search',placeholder:'BTC, 삼성전자, AAPL, 일본·중국 주식…',type:'search',autocomplete:'off',maxLength:80});
    input.setAttribute('name','cinema-instrument-search');const results=element('div',null,{className:'cinema-results'});
    const lookup=async()=>{const query=input.value.trim();if(!query){results.replaceChildren(element('p','코인 이름 또는 주식 이름·티커를 입력하세요.'));return;}
      this.searchAbort?.abort();this.searchAbort=new AbortController();results.replaceChildren(element('p','검색 중…'));
      try{const response=await fetch(this.origin+'/api/market/search?'+new URLSearchParams({q:query,market:'all'}),{signal:this.searchAbort.signal}),data=await response.json();if(!response.ok)throw new Error();results.replaceChildren();
        for(const item of data.items||[]){const button=element('button',item.label+' · '+item.symbol+(item.venue==='futures'?'.P':''));button.append(element('div',`${item.exchange||'Binance'} · ${{crypto:'크립토',us:'미국 주식',kr:'한국 주식',cn:'중국 주식',jp:'일본 주식',world:'세계 주식'}[item.market]||item.market} · ${item.venue==='futures'?'무기한 선물':item.venue==='spot'?'현물':item.currency}`,{className:'cinema-market'}));button.onclick=()=>{if(this.host)this.send({type:'configure',instrument:item,interval:item.venue==='yahoo'&&this.state.interval==='4h'?'1h':this.state.interval});this.closeDialog();};results.append(button);}
        if(!results.children.length)results.append(element('p','검색 결과가 없습니다.'));if(data.warning)results.append(element('p',data.warning));
      }catch(error){if(error.name!=='AbortError')results.replaceChildren(element('p','검색 연결이 지연되고 있습니다. 다시 입력해 주세요.'));}
    };input.oninput=()=>{clearTimeout(this.searchTimer);this.searchTimer=setTimeout(lookup,350);};dialog.append(input,results,actions);dialog.showModal();input.focus();lookup();
  }
  nominate(){if(!this.host){this.notice('방장만 다른 사람을 임명할 수 있습니다.');return;}const {dialog,actions}=this.dialogBox('방장 임명'),list=element('div',null,{className:'cinema-results'});
    for(const person of this.state.participants.filter(p=>p.id!==this.id)){const button=element('button',person.nickname);button.onclick=()=>{this.send({type:'nominate',id:person.id});this.closeDialog();};list.append(button);}
    if(!list.children.length)list.append(element('p','방에 다른 이용자가 들어오면 임명할 수 있습니다.'));dialog.append(element('p','종목 변경과 차트 조작 권한을 넘깁니다.'),list,actions);dialog.showModal();
  }
  geometry(json){if(!this.active||!this.root)return;if(json===this.lastGeometry)return;this.lastGeometry=json;const g=typeof json==='string'?JSON.parse(json):json,canvas=document.getElementById('canvas'),r=canvas.getBoundingClientRect(),sx=r.width/g.viewport[0],sy=r.height/g.viewport[1];
    this.gameTyping=g.typing===true;
    const [x,y,w,h]=g.rect;Object.assign(this.root.style,{left:r.left+x*sx+'px',top:r.top+y*sy+'px',width:w*sx+'px',height:h*sy+'px'});const hiddenChanged=this.root.hidden!==!!g.hidden;this.root.hidden=!!g.hidden;
    // Godot draws its menus into one canvas. Cut holes in the DOM chart so movable chat,
    // market windows and touch controls always remain above it without moving the map.
    const width=w*sx,height=h*sy;let path=`M0 0H${width}V${height}H0Z`;
    const holes=(g.holes||[]).map(rect=>[Math.max(0,(rect[0]-x)*sx),Math.max(0,(rect[1]-y)*sy),Math.min(width,(rect[0]+rect[2]-x)*sx),Math.min(height,(rect[1]+rect[3]-y)*sy)]).filter(r=>r[2]>r[0]&&r[3]>r[1]);
    if(hiddenChanged)this.youtube.visibility();
    for(const [ax,ay,bx,by] of unionRectangles(holes))path+=`M${ax} ${ay}V${by}H${bx}V${ay}Z`;
    this.root.style.clipPath=`path(evenodd, "${path}")`;
  }
  destroy(){this.active=false;this.keyboard?.destroy();this.keyboard=null;this.youtube?.destroy();this.feed?.destroy();this.feed=null;clearTimeout(this.reconnect);clearTimeout(this.toastTimer);clearInterval(this.viewTimer);clearInterval(this.heartbeat);document.removeEventListener('visibilitychange',this.visibility);for(const type of ['pointerdown','pointermove','pointerup','pointercancel','wheel','click','dblclick'])document.removeEventListener(type,this.viewInput,true);this.socket?.close(1000,'left cinema');this.closeDialog();this.pens?.destroy();this.drawings?.destroy();this.resize?.disconnect();this.chart?.destroy();this.chart=null;this.root?.remove();this.root=null;this.state=null;this.id='';this.inputFocused=false;this.captured=false;this.emit();}
}
window.BTCCinema=new Cinema();
