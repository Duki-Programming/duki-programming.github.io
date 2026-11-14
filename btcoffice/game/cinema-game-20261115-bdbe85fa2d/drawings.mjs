import {TOOLS,POINTS,DEFAULT_STYLE,geometry,logicalToTime,timeToLogical} from './drawing-geometry.mjs';
const NS='http://www.w3.org/2000/svg';
const svg=(tag,attrs={})=>{const el=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));return el;};
const element=(tag,text,attrs={})=>{const el=document.createElement(tag);if(text)el.textContent=text;Object.assign(el,attrs);return el;};
export class Drawings {
  constructor(room,plot,toolbar) {
    this.room=room;this.plot=plot;this.toolbar=toolbar;this.items=new Map();this.tool='select';this.anchors=[];this.selected=null;this.preview=null;this.drag=null;
    this.svg=svg('svg',{class:'cinema-drawings','aria-label':'공유 차트 도형'});plot.append(this.svg);
    this.buttons=new Map();
    const icons={select:'↖',trend:'╱',ray:'↗',channel:'⫽',pitchfork:'⑂',fibonacci:'☷',brush:'✎'};
    for(const [tool,title] of Object.entries(TOOLS)){const button=element('button',icons[tool],{title,'ariaLabel':title});button.dataset.tool=tool;button.onclick=()=>this.setTool(tool);toolbar.append(button);this.buttons.set(tool,button);}
    const undo=element('button','↶',{title:'내 마지막 도형 삭제'});undo.onclick=()=>{const own=[...this.items.values()].filter(d=>this.owns(d));const last=own.at(-1);if(last)this.remove(last);};toolbar.append(undo);
    const del=element('button','⌫',{title:'선택한 도형 삭제'});del.onclick=()=>{const d=this.items.get(this.selected);if(d)this.remove(d);};toolbar.append(del);
    this.editButton=element('button','⚙',{title:'선택한 도형 설정 · 더블클릭'});this.editButton.onclick=()=>{const d=this.items.get(this.selected);if(d)this.settings(d);};toolbar.append(this.editButton);
    this.clearButton=element('button','▤',{title:'현재 차트 도형 모두 지우기 · 방장'});this.clearButton.onclick=()=>{
      if(!this.room.host)return;const {dialog,actions}=this.room.dialogBox('모든 도형 지우기');dialog.append(element('p','현재 종목·주기에 그려진 도형을 모두 지웁니다.'));
      const clear=element('button','모두 지우기',{type:'button'});clear.onclick=()=>{this.room.send({type:'drawing_clear'});this.room.closeDialog();};actions.prepend(clear);dialog.append(actions);dialog.showModal();
    };toolbar.append(this.clearButton);
    this.svg.addEventListener('pointerdown',e=>this.down(e));this.svg.addEventListener('pointermove',e=>this.move(e));this.svg.addEventListener('pointerup',e=>this.up(e));
    this.svg.addEventListener('pointercancel',()=>this.cancel());
    this.svg.addEventListener('dblclick',e=>{const d=this.items.get(e.target.closest('[data-drawing]')?.dataset.drawing||this.selected);if(d){e.preventDefault();e.stopPropagation();this.cancel();this.settings(d);}});
    this.key=e=>{if(!this.room.active||e.target.closest('input,select,textarea,dialog'))return;
      if(e.key==='Escape'){this.cancel();this.setTool('select');this.selected=null;this.render();}
      if(['Delete','Backspace'].includes(e.key)&&this.selected){e.preventDefault();const d=this.items.get(this.selected);if(d)this.remove(d);}
    };document.addEventListener('keydown',this.key);
    this.setTool('select');
  }
  get allowed(){return !!this.room.state && (this.room.host||this.room.state.everyone);}
  get style(){return {...DEFAULT_STYLE,color:this.room.me?.color||DEFAULT_STYLE.color};}
  owns(d){return d.owner===this.room.id || !!this.room.me?.user_id&&d.owner===this.room.me.user_id;}
  editable(d){return this.allowed&&(this.room.host||this.owns(d));}
  setTool(tool){if(tool!=='select'&&!this.allowed){this.room.notice('방장만 그릴 수 있습니다.');return;}this.cancel();this.tool=tool;
    this.svg.classList.toggle('drawing-active',tool!=='select');for(const [name,b] of this.buttons)b.classList.toggle('active',name===tool);
    this.room.hint.textContent=tool==='select'?'도형 더블클릭 · 설정  /  모서리 점 · 이동':tool==='brush'?'드래그해서 그리기 · Esc 취소':`${TOOLS[tool]} · ${POINTS[tool]}개의 점을 차례로 선택 · Esc 취소`;
  }
  permission(){for(const [key,b] of this.buttons)b.disabled=key!=='select'&&!this.allowed;this.clearButton.disabled=!this.room.host;if(!this.allowed){this.setTool('select');this.closeDialog();}}
  replace(items){this.items=new Map(items.map(d=>[d.id,d]));this.selected=null;this.cancel();this.render();}
  update(d){this.items.set(d.id,d);this.preview=null;this.render();}
  delete(id){this.items.delete(id);if(this.selected===id)this.selected=null;this.render();}
  remove(d){if(!this.editable(d)){this.room.notice('내 도형 또는 방장 권한으로만 삭제할 수 있습니다.');return;}this.room.send({type:'drawing_delete',id:d.id,revision:d.revision});}
  step(){return ({'1m':60,'5m':300,'15m':900,'30m':1800,'1h':3600,'4h':14400,'1d':86400,'1w':604800})[this.room.state?.interval]||900;}
  point(e){const r=this.svg.getBoundingClientRect(),chart=this.room.chart;if(!chart?.candles||!chart.bars.length)return null;
    const x=e.clientX-r.left,y=e.clientY-r.top;if(x<0||x>this.width||y<0||y>this.height)return null;
    const logical=chart.chart.timeScale().coordinateToLogical(x),price=chart.candles.coordinateToPrice(y),time=logicalToTime(logical,chart.bars,this.step());
    return Number.isFinite(time)&&Number.isFinite(price)?{time,price}:null;
  }
  project(p){const chart=this.room.chart;if(!chart?.candles)return null;const logical=timeToLogical(p.time,chart.bars,this.step());if(logical===null)return null;
    return {x:chart.chart.timeScale().logicalToCoordinate(logical),y:chart.candles.priceToCoordinate(p.price)};
  }
  down(e){if(e.button!==0)return;const p=this.point(e);if(!p)return;
    const id=e.target.closest('[data-drawing]')?.dataset.drawing;
    if(this.tool==='select'){
      if(!id)return;this.selected=id;const d=this.items.get(id),now=performance.now();
      // SVG nodes are redrawn when selection changes. Detect the second press by drawing ID,
      // so double-click/tap still works when the original hit-test node has been replaced.
      if(this.lastTap?.id===id&&now-this.lastTap.at<400&&Math.hypot(e.clientX-this.lastTap.x,e.clientY-this.lastTap.y)<12){
        this.lastTap=null;this.cancel();this.settings(d);e.preventDefault();e.stopPropagation();return;
      }
      this.lastTap={id,at:now,x:e.clientX,y:e.clientY};this.render();
      if(this.editable(d)&&!d.locked){this.drag={id,original:structuredClone(d),point:p,handle:e.target.dataset.handle===undefined?null:+e.target.dataset.handle,moved:false};this.svg.setPointerCapture(e.pointerId);}
      e.stopPropagation();e.preventDefault();return;
    }
    if(!this.allowed)return;e.preventDefault();e.stopPropagation();
    if(this.tool==='brush'){this.anchors=[p];this.drag={brush:true};this.svg.setPointerCapture(e.pointerId);}
    else {this.anchors.push(p);if(this.anchors.length===POINTS[this.tool])this.finish();else this.preview={...this.style,kind:this.tool,points:[...this.anchors,p]};}
    this.render();
  }
  move(e){const p=this.point(e);if(!p)return;
    if(this.drag?.brush){if(this.anchors.length<200)this.anchors.push(p);this.preview={...this.style,kind:'brush',points:[...this.anchors]};this.render();return;}
    if(this.drag){const d=structuredClone(this.drag.original),delta={time:p.time-this.drag.point.time,price:p.price-this.drag.point.price};
      this.drag.moved=Math.abs(delta.time)>.1||Math.abs(delta.price)>.000001;
      if(this.drag.handle!==null)d.points[this.drag.handle]=p;else d.points=d.points.map(a=>({time:a.time+delta.time,price:a.price+delta.price}));
      this.preview=d;this.render();return;
    }
    if(this.anchors.length){this.preview={...this.style,kind:this.tool,points:[...this.anchors,p]};this.render();}
  }
  up(e){if(!this.drag)return;if(this.svg.hasPointerCapture(e.pointerId))this.svg.releasePointerCapture(e.pointerId);
    if(this.drag.brush){if(this.anchors.length>1)this.finish();else this.cancel();}
    else {if(this.drag.moved&&this.preview)this.room.send({type:'drawing_update',id:this.drag.id,revision:this.drag.original.revision,drawing:this.preview});this.preview=null;this.drag=null;this.render();}
  }
  finish(){const drawing={...this.style,kind:this.tool,points:[...this.anchors],extend_right:['ray','pitchfork','fibonacci'].includes(this.tool)};
    this.room.send({type:'drawing_create',drawing});this.cancel();this.setTool('select');
  }
  cancel(){this.anchors=[];this.preview=null;this.drag=null;this.render();}
  render(){
    if(this.room.state?.media?.tab==='youtube'||document.hidden)return;
    const chart=this.room.chart;if(!chart?.chart||!chart.candles)return;
    const pane=chart.chart.panes()[0];this.width=Math.max(0,this.plot.clientWidth-chart.chart.priceScale('right').width());this.height=pane.getHeight();
    const scale=chart.chart.priceScale('right'),signature=JSON.stringify([this.width,this.height,this.selected,this.preview,[...this.items.values()].map(d=>[d.id,d.revision]),chart.firstTime,chart.chart.timeScale().getVisibleLogicalRange(),scale.getVisibleRange(),scale.options().mode,scale.options().invertScale]);
    if(signature===this.renderSignature)return;this.renderSignature=signature;
    this.svg.style.width=this.width+'px';this.svg.style.height=this.height+'px';this.svg.setAttribute('viewBox',`0 0 ${this.width} ${this.height}`);this.svg.replaceChildren();
    const items=[...this.items.values()].filter(d=>!this.preview?.id||d.id!==this.preview.id);if(this.preview)items.push(this.preview);
    for(const d of items){const g=svg('g',{'data-drawing':d.id||'',stroke:d.color,'stroke-width':d.width,fill:'none','stroke-linecap':'round'}),shape=geometry(d,p=>this.project(p),this.width,this.height);
      const dash=d.dash==='dashed'?'8 6':d.dash==='dotted'?'2 5':'';
      for(const points of shape.fills)g.append(svg('polygon',{points:points.map(p=>`${p.x},${p.y}`).join(' '),fill:d.color,'fill-opacity':.09,stroke:'none','pointer-events':'none'}));
      for(const line of shape.lines){const [a,b]=line.points,attrs={x1:a.x,y1:a.y,x2:b.x,y2:b.y};
        if(d.id)g.append(svg('line',{...attrs,stroke:'transparent','stroke-width':12,'pointer-events':'stroke'}));
        g.append(svg('line',{...attrs,'stroke-dasharray':line.muted?'3 5':dash,opacity:line.muted?.5:1,'pointer-events':'none'}));
      }
      for(const label of shape.labels){const text=svg('text',{x:label.x,y:label.y,fill:d.color,stroke:'none','font-size':11,'pointer-events':'none'});text.textContent=label.text;g.append(text);}
      if(this.selected===d.id || !d.id)shape.points.forEach((p,i)=>{if(d.kind==='brush'&&i!==0&&i!==shape.points.length-1)return;g.append(svg('circle',{cx:p.x,cy:p.y,r:5,fill:'#10171f',stroke:d.color,'stroke-width':2,'data-handle':i,'pointer-events':'all'}));});
      this.svg.append(g);
    }
  }
  closeDialog(){this.dialog?.remove();this.dialog=null;this.room.capture(false);}
  settings(d){
    this.closeDialog();const dialog=element('dialog'),form=element('form');dialog.className='cinema-dialog';form.method='dialog';
    const title=element('h3',TOOLS[d.kind]+' 설정');form.append(title,element('p',d.nickname+' · 도형 더블클릭으로 다시 열기'));
    const fields={};const field=(name,label,control)=>{const row=element('label',label);row.append(control);form.append(row);fields[name]=control;return control;};
    field('color','색상',element('input',null,{type:'color',value:d.color}));
    const width=field('width','두께',element('select'));for(let i=1;i<=6;i++)width.add(new Option(i+' px',i));width.value=d.width;
    const dash=field('dash','선 스타일',element('select'));for(const [id,name] of [['solid','실선'],['dashed','파선'],['dotted','점선']])dash.add(new Option(name,id));dash.value=d.dash;
    for(const [name,label] of [['extend_left','시작점 반대 방향으로 연장'],['extend_right','끝점 방향으로 연장'],['locked','위치 잠금']])field(name,label,element('input',null,{type:'checkbox',checked:d[name]}));
    if(d.kind==='fibonacci')field('levels','비율 (0~1, 쉼표로 구분)',element('input',null,{type:'text',value:d.levels.join(', '),maxLength:160}));
    const controls=element('div',null,{className:'dialog-actions'}),remove=element('button','삭제',{type:'button'}),cancel=element('button','닫기',{type:'button'}),save=element('button','저장',{type:'submit'});
    remove.onclick=()=>{this.remove(d);this.closeDialog();};cancel.onclick=()=>this.closeDialog();controls.append(remove,cancel,save);form.append(controls);
    const canEdit=this.editable(d);save.disabled=remove.disabled=!canEdit;for(const el of Object.values(fields))el.disabled=!canEdit;
    if(!canEdit)form.append(element('p','본인 도형 또는 방장 권한으로만 수정할 수 있습니다.'));
    form.onsubmit=e=>{e.preventDefault();if(!this.editable(d))return;const levels=fields.levels?fields.levels.value.split(',').map(v=>Number(v.trim())):d.levels;
      if(!levels.length||levels.length>12||levels.some(n=>!Number.isFinite(n)||Math.abs(n)>10)){this.room.notice('비율은 -10~10 범위의 숫자를 12개까지 입력하세요.');return;}
      this.room.send({type:'drawing_update',id:d.id,revision:d.revision,drawing:{...d,color:fields.color.value,width:+fields.width.value,dash:fields.dash.value,extend_left:fields.extend_left.checked,extend_right:fields.extend_right.checked,locked:fields.locked.checked,levels}});this.closeDialog();};
    dialog.addEventListener('cancel',()=>this.closeDialog());dialog.append(form);document.body.append(dialog);this.dialog=dialog;this.room.capture(true);dialog.showModal();
  }
  destroy(){this.closeDialog();document.removeEventListener('keydown',this.key);this.svg.remove();}
}
