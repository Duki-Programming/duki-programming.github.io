import {TOOLS,POINTS,DEFAULT_STYLE,geometry,logicalToTime,timeToLogical,pitchforkStyle} from './drawing-geometry.mjs';
import {DrawingHistory} from './drawing-history.mjs';
const NS='http://www.w3.org/2000/svg';
const TOUCH_SLOP=8; // CSS pixels, independent of device pixel ratio and chart zoom.
const svg=(tag,attrs={})=>{const el=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));return el;};
const element=(tag,text,attrs={})=>{const el=document.createElement(tag);if(text)el.textContent=text;Object.assign(el,attrs);return el;};
export class Drawings {
  constructor(room,plot,toolbar) {
    this.room=room;this.plot=plot;this.toolbar=toolbar;this.items=new Map();this.tool='select';this.anchors=[];this.selected=null;this.preview=null;this.drag=null;
    this.svg=svg('svg',{class:'cinema-drawings','aria-label':'공유 차트 도형'});plot.append(this.svg);
    this.selectionActions=element('div',null,{className:'cinema-selection-actions',hidden:true});
    this.selectionEdit=element('button','⚙',{title:'선택한 도형 수정',ariaLabel:'선택한 도형 수정'});this.selectionEdit.onclick=()=>{const d=this.items.get(this.selected);if(d)this.settings(d);};
    this.selectionDelete=element('button',null,{className:'cinema-drawing-trash',title:'선택한 도형 삭제',ariaLabel:'선택한 도형 삭제'});
    this.selectionDelete.innerHTML='<svg width="17" height="18" viewBox="0 0 20 22" aria-hidden="true"><path d="M3 6h14M7 6V3h6v3M5 6l1 14h8l1-14M8 9v8m4-8v8" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    this.selectionDelete.onclick=()=>{const d=this.items.get(this.selected);if(d)this.remove(d);};this.selectionActions.append(this.selectionEdit,this.selectionDelete);plot.append(this.selectionActions);
    this.buttons=new Map();
    const icons={select:'↖',trend:'╱',ray:'↗',channel:'⫽',pitchfork:'⑂',fibonacci:'☷',brush:'✎'};
    for(const [tool,title] of Object.entries(TOOLS)){const button=element('button',icons[tool],{title,'ariaLabel':title});button.dataset.tool=tool;button.onclick=()=>this.setTool(tool);toolbar.append(button);this.buttons.set(tool,button);}
    this.history=new DrawingHistory({send:data=>room.send(data),owns:d=>this.owns(d),allowed:()=>this.allowed,notice:text=>room.notice(text),changed:()=>this.historyButtons()});
    this.undoButton=element('button','↶',{title:'내 그리기 실행 취소 · Ctrl+Z / ⌘Z',ariaLabel:'내 그리기 실행 취소'});this.undoButton.onclick=()=>this.undo();toolbar.append(this.undoButton);
    this.redoButton=element('button','↷',{title:'내 그리기 다시 실행 · Ctrl+Shift+Z / ⌘⇧Z',ariaLabel:'내 그리기 다시 실행'});this.redoButton.onclick=()=>this.undo(true);toolbar.append(this.redoButton);
    const del=element('button','⌫',{title:'선택한 도형 삭제'});del.onclick=()=>{const d=this.items.get(this.selected);if(d)this.remove(d);};toolbar.append(del);
    this.editButton=element('button','⚙',{title:'선택한 도형 설정 · 더블클릭'});this.editButton.onclick=()=>{const d=this.items.get(this.selected);if(d)this.settings(d);};toolbar.append(this.editButton);
    this.clearButton=room.clearButton;this.clearButton.onclick=()=>{
      if(!this.room.host)return;const {dialog,actions}=this.room.dialogBox('모든 도형 지우기');dialog.append(element('p','현재 종목·주기에 그려진 도형을 모두 지웁니다.'));
      const clear=element('button','모두 지우기',{type:'button'});clear.onclick=()=>{this.room.send({type:'drawing_clear'});this.room.closeDialog();};actions.prepend(clear);dialog.append(actions);dialog.showModal();
    };
    this.svg.addEventListener('pointerdown',e=>this.down(e));this.svg.addEventListener('pointermove',e=>this.move(e));this.svg.addEventListener('pointerup',e=>this.up(e));
    this.svg.addEventListener('pointercancel',e=>this.cancelPointer(e));
    this.svg.addEventListener('lostpointercapture',e=>this.cancelPointer(e));
    this.svg.addEventListener('dblclick',e=>{if(this.tool!=='select')return;const d=this.items.get(e.target.closest('[data-drawing]')?.dataset.drawing||this.selected);if(d){e.preventDefault();e.stopPropagation();this.cancel();this.settings(d);}});
    this.key=e=>{if(!this.room.active||this.room.root.hidden||this.room.gameTyping||this.room.state?.media?.tab!=='chart'||e.isComposing||e.target.closest?.('input,select,textarea,dialog,[contenteditable="true"]')||document.querySelector('dialog[open]'))return;
      if((e.ctrlKey||e.metaKey)&&!e.altKey&&e.key.toLowerCase()==='z'){e.preventDefault();e.stopPropagation();if(!e.repeat)this.undo(e.shiftKey);return;}
      if(e.key==='Escape'){this.cancel();this.setTool('select');this.selected=null;this.render();}
      if(['Delete','Backspace'].includes(e.key)&&this.selected){e.preventDefault();const d=this.items.get(this.selected);if(d)this.remove(d);}
    };document.addEventListener('keydown',this.key,true);
    this.setTool('select');this.historyButtons();
  }
  get allowed(){return !!this.room.state && (this.room.host||this.room.state.everyone);}
  get style(){return {...DEFAULT_STYLE,color:this.tool==='pitchfork'?'#f23645':this.room.me?.color||DEFAULT_STYLE.color,...(this.tool==='pitchfork'?{pitchfork:pitchforkStyle({})}:{})};}
  owns(d){return !!d&&(d.owner===this.room.id || !!this.room.me?.user_id&&d.owner===this.room.me.user_id);}
  editable(d){return this.allowed&&(this.room.host||this.owns(d));}
  setTool(tool){if(tool!=='select'&&!this.allowed){this.room.notice('방장만 그릴 수 있습니다.');return;}this.cancel();this.tool=tool;
    this.svg.classList.toggle('drawing-active',tool!=='select');for(const [name,b] of this.buttons)b.classList.toggle('active',name===tool);
    this.room.hint.textContent=tool==='select'?'도형 더블클릭 · 설정  /  모서리 점 · 이동':tool==='brush'?'드래그해서 그리기 · Esc 취소':`${TOOLS[tool]} · ${POINTS[tool]}점 · 탭: 점 찍기 / 드래그: 위치 확인`;
    this.room.pens?.toolChanged();
  }
  permission(){for(const [key,b] of this.buttons)b.disabled=key!=='select'&&!this.allowed;this.clearButton.hidden=this.clearButton.disabled=!this.room.host;if(!this.allowed){this.setTool('select');this.closeDialog();}this.historyButtons();this.render();}
  historyButtons(){if(this.undoButton)this.undoButton.disabled=!this.history.canUndo;if(this.redoButton)this.redoButton.disabled=!this.history.canRedo;}
  undo(redo=false){this.cancel();this.history.travel(redo);}
  replace(items){this.items=new Map(items.map(d=>[d.id,d]));this.history.reset();this.selected=null;this.cancel();this.render();}
  update(d,packet={}){this.items.set(d.id,d);this.history.accept(packet.by===this.room.id?packet.request_id:null,d.id,d);this.render();}
  delete(id,packet={}){this.items.delete(id);this.history.accept(packet.by===this.room.id?packet.request_id:null,id,null);if(this.selected===id)this.selected=null;this.render();}
  remove(d){if(!this.editable(d)){this.room.notice('내 도형 또는 방장 권한으로만 삭제할 수 있습니다.');return;}this.history.submit('drawing_delete',{id:d.id,revision:d.revision},d);}
  bindSeries(){
    const series=this.room.chart?.candles;if(!series||series===this.boundSeries)return;
    this.unbindSeries();this.boundSeries=series;
    // Run in the candle renderer's paint pass, including price-scale gestures.
    // Network viewport broadcasts remain throttled independently at 5 Hz.
    const renderer={draw:()=>{this.render();this.room.pens?.render();}},views=[{zOrder:()=> 'top',renderer:()=>renderer}];
    this.primitive={paneViews:()=>views};series.attachPrimitive(this.primitive);
  }
  unbindSeries(){if(this.boundSeries&&this.primitive)try{this.boundSeries.detachPrimitive(this.primitive);}catch{/* The previous chart may already be disposed. */}this.boundSeries=null;this.primitive=null;}
  step(){return ({'1m':60,'5m':300,'15m':900,'30m':1800,'1h':3600,'4h':14400,'1d':86400,'1w':604800})[this.room.state?.interval]||900;}
  point(e){const r=this.svg.getBoundingClientRect(),chart=this.room.chart;if(!chart?.candles||!chart.bars.length)return null;
    const x=e.clientX-r.left,y=e.clientY-r.top;if(x<0||x>this.width||y<0||y>this.height)return null;
    const logical=chart.chart.timeScale().coordinateToLogical(x),price=chart.candles.coordinateToPrice(y),time=logicalToTime(logical,chart.bars,this.step());
    return Number.isFinite(time)&&Number.isFinite(price)?{time,price}:null;
  }
  project(p){const chart=this.room.chart;if(!chart?.candles)return null;const logical=timeToLogical(p.time,chart.bars,this.step());if(logical===null)return null;
    return {x:chart.chart.timeScale().logicalToCoordinate(logical),y:chart.candles.priceToCoordinate(p.price)};
  }
  down(e){if(e.button!==0)return;
    if(e.isPrimary===false){if(this.touch)this.touch.moved=true;return;}
    if(this.pointerId!==undefined)return;const p=this.point(e);if(!p)return;
    const id=e.target.closest('[data-drawing]')?.dataset.drawing;
    if(this.tool==='select'){
      if(!id)return;this.selected=id;const d=this.items.get(id),now=performance.now();
      // SVG nodes are redrawn when selection changes. Detect the second press by drawing ID,
      // so double-click/tap still works when the original hit-test node has been replaced.
      if(this.lastTap?.id===id&&now-this.lastTap.at<400&&Math.hypot(e.clientX-this.lastTap.x,e.clientY-this.lastTap.y)<12){
        this.lastTap=null;this.cancel();this.settings(d);e.preventDefault();e.stopPropagation();return;
      }
      this.lastTap={id,at:now,x:e.clientX,y:e.clientY};this.render();
      if(this.editable(d)&&!d.locked){this.drag={id,original:structuredClone(d),point:p,handle:e.target.dataset.handle===undefined?null:+e.target.dataset.handle,moved:false};this.holdPointer(e);}
      e.stopPropagation();e.preventDefault();return;
    }
    if(!this.allowed)return;e.preventDefault();e.stopPropagation();
    if(this.tool==='brush'){this.anchors=[p];this.drag={brush:true};this.holdPointer(e);}
    else if(e.pointerType==='touch'){
      // A touch becomes an anchor only on release, provided it never became a drag.
      this.touch={x:e.clientX,y:e.clientY,moved:false};this.holdPointer(e);this.aimAt(p);
    }
    else this.place(p);
    this.render();
  }
  holdPointer(e){this.pointerId=e.pointerId;this.svg.setPointerCapture(e.pointerId);}
  releasePointer(){const id=this.pointerId;this.pointerId=undefined;if(id!==undefined&&this.svg.hasPointerCapture(id))this.svg.releasePointerCapture(id);}
  place(p){this.anchors.push(p);if(this.anchors.length===POINTS[this.tool])this.finish();else this.preview={...this.style,kind:this.tool,points:[...this.anchors,p]};}
  aimAt(p){this.aim=p;if(this.anchors.length)this.preview={...this.style,kind:this.tool,points:[...this.anchors,p]};this.render();}
  move(e){if(this.pointerId!==undefined&&e.pointerId!==this.pointerId)return;
    if(this.touch&&Math.hypot(e.clientX-this.touch.x,e.clientY-this.touch.y)>TOUCH_SLOP)this.touch.moved=true;
    const p=this.point(e);if(!p)return;
    if(this.touch){e.preventDefault();e.stopPropagation();this.aimAt(p);return;}
    if(this.drag?.brush){if(this.anchors.length<200)this.anchors.push(p);this.preview={...this.style,kind:'brush',points:[...this.anchors]};this.render();return;}
    if(this.drag){const d=structuredClone(this.drag.original),delta={time:p.time-this.drag.point.time,price:p.price-this.drag.point.price};
      this.drag.moved=Math.abs(delta.time)>.1||Math.abs(delta.price)>.000001;
      if(this.drag.handle!==null)d.points[this.drag.handle]=p;else d.points=d.points.map(a=>({time:a.time+delta.time,price:a.price+delta.price}));
      this.preview=d;this.render();return;
    }
    if(this.anchors.length){this.preview={...this.style,kind:this.tool,points:[...this.anchors,p]};this.render();}
  }
  up(e){if(e.pointerId!==this.pointerId)return;
    if(this.touch){
      const p=this.point(e),tap=!this.touch.moved&&Math.hypot(e.clientX-this.touch.x,e.clientY-this.touch.y)<=TOUCH_SLOP;
      this.touch=null;this.releasePointer();e.preventDefault();e.stopPropagation();
      if(p){this.aimAt(p);if(tap)this.place(p);}this.render();return;
    }
    this.releasePointer();if(!this.drag)return;
    if(this.drag.brush){if(this.anchors.length>1)this.finish();else this.cancel();}
    else {if(this.drag.moved&&this.preview)this.history.submit('drawing_update',{id:this.drag.id,revision:this.drag.original.revision,drawing:this.preview},this.drag.original);this.preview=null;this.drag=null;this.render();}
  }
  finish(){const drawing={...this.style,kind:this.tool,points:[...this.anchors],extend_right:['ray','pitchfork'].includes(this.tool)};
    this.history.submit('drawing_create',{drawing});this.cancel();
  }
  cancelPointer(e){if(e.pointerId!==this.pointerId)return;
    if(this.touch){this.touch=null;this.releasePointer();this.render();}else this.cancel();
  }
  cancel(){this.touch=null;this.aim=null;this.releasePointer();this.anchors=[];this.preview=null;this.drag=null;this.render();}
  render(){
    if(this.room.state?.media?.tab==='youtube'||document.hidden)return;
    const chart=this.room.chart;if(!chart?.chart||!chart.candles)return;
    const pane=chart.chart.panes()[0];this.width=Math.max(0,this.plot.clientWidth-chart.chart.priceScale('right').width());this.height=pane.getHeight();
    const scale=chart.chart.priceScale('right'),signature=JSON.stringify([this.width,this.height,this.selected,this.preview,this.aim,this.allowed,this.room.host,[...this.items.values()].map(d=>[d.id,d.revision]),chart.firstTime,chart.chart.timeScale().getVisibleLogicalRange(),scale.getVisibleRange(),scale.options().mode,scale.options().invertScale]);
    if(signature===this.renderSignature)return;this.renderSignature=signature;
    this.svg.style.width=this.width+'px';this.svg.style.height=this.height+'px';this.svg.setAttribute('viewBox',`0 0 ${this.width} ${this.height}`);this.svg.replaceChildren();
    this.selectionActions.hidden=true;
    const items=[...this.items.values()].filter(d=>!this.preview?.id||d.id!==this.preview.id);if(this.preview)items.push(this.preview);
    for(const d of items){const g=svg('g',{'data-drawing':d.id||'',stroke:d.color,'stroke-width':d.width,fill:'none','stroke-linecap':'round'}),shape=geometry(d,p=>this.project(p),this.width,this.height);
      const dash=d.dash==='dashed'?'8 6':d.dash==='dotted'?'2 5':'';
      for(const fill of shape.fills)g.append(svg('polygon',{points:fill.points.map(p=>`${p.x},${p.y}`).join(' '),fill:fill.color,'fill-opacity':fill.opacity,stroke:'none','pointer-events':d.id?'visiblePainted':'none'}));
      for(const line of shape.lines){const [a,b]=line.points,attrs={x1:a.x,y1:a.y,x2:b.x,y2:b.y};
        if(d.id)g.append(svg('line',{...attrs,stroke:'transparent','stroke-width':12,'pointer-events':'stroke'}));
        g.append(svg('line',{...attrs,stroke:line.color||d.color,'stroke-dasharray':line.muted?'3 5':dash,opacity:line.muted?.5:1,'pointer-events':'none'}));
      }
      for(const label of shape.labels){const text=svg('text',{x:label.x,y:label.y,fill:label.color||d.color,stroke:'none','font-size':12,'text-anchor':label.align||'start','pointer-events':'none'});text.textContent=label.text;g.append(text);}
      if(this.selected===d.id || !d.id)shape.points.forEach((p,i)=>{if(d.kind==='brush'&&i!==0&&i!==shape.points.length-1)return;g.append(svg('circle',{cx:p.x,cy:p.y,r:5,fill:'#10171f',stroke:d.color,'stroke-width':2,'data-handle':i,'pointer-events':'all'}));});
      this.svg.append(g);
      if(this.selected===d.id&&shape.points.length){const xs=shape.points.map(p=>p.x),ys=shape.points.map(p=>p.y),right=Math.max(...xs),top=Math.min(...ys);
        if(right>=0&&Math.min(...xs)<=this.width&&Math.max(...ys)>=0&&top<=this.height){this.selectionActions.hidden=false;this.selectionDelete.hidden=!this.editable(d);Object.assign(this.selectionActions.style,{left:Math.max(4,Math.min(this.width-82,right+10))+'px',top:Math.max(4,Math.min(this.height-36,top))+'px'});}
      }
    }
    if(this.aim){const p=this.project(this.aim);if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y)){
      const cross=svg('g',{class:'cinema-touch-aim',stroke:this.style.color,'stroke-width':1,fill:'none','pointer-events':'none'});
      cross.append(svg('path',{d:`M0 ${p.y}H${this.width}M${p.x} 0V${this.height}`,'stroke-dasharray':'4 4',opacity:.7}),svg('circle',{cx:p.x,cy:p.y,r:8,'stroke-width':2}));this.svg.append(cross);
    }}
  }
  closeDialog(){this.dialog?.remove();this.dialog=null;this.room.capture(false);}
  pitchforkSettings(form,d,canEdit){
    const style=pitchforkStyle(d),rows=[];
    const heading=element('div','모습',{className:'cinema-appearance-heading'});form.append(heading);
    const list=element('div',null,{className:'cinema-pitchfork-levels'});form.append(list);
    const addRow=level=>{
      const row=element('div',null,{className:'cinema-pitchfork-level'});
      const enabled=element('input',null,{type:'checkbox',checked:level.enabled,ariaLabel:`${level.value} 구간 표시`,disabled:!canEdit});
      const value=element('input',null,{type:'number',value:level.value,min:'0.001',max:'10',step:'any',required:true,ariaLabel:'피보나치 비율'});
      const color=element('input',null,{type:'color',value:level.color,ariaLabel:`${level.value} 구간 색상`});
      const swatch=element('span',null,{className:'cinema-level-swatch'});
      const refresh=()=>{value.disabled=color.disabled=!canEdit||!enabled.checked;swatch.style.background=color.value;row.classList.toggle('inactive',!enabled.checked);};
      enabled.onchange=color.oninput=refresh;refresh();row.append(enabled,value,color,swatch);list.append(row);rows.push({enabled,value,color});
    };
    style.levels.forEach(addRow);
    const add=element('button','+ 구간 추가',{type:'button',disabled:!canEdit||rows.length>=12});
    add.onclick=()=>{if(rows.length>=12)return;let value=1;while(rows.some(r=>Number(r.value.value)===value)&&value<10)value+=.25;addRow({value,color:d.color,enabled:true});add.disabled=rows.length>=12;};form.append(add);
    const option=(text,control)=>{const label=element('label',text);control.disabled=!canEdit;label.append(control);form.append(label);return control;};
    const single=option('한 가지 색만 쓰기',element('input',null,{type:'checkbox',checked:style.single_color}));
    const background=option('배경 채우기',element('input',null,{type:'checkbox',checked:style.background}));
    const opacity=option('배경 불투명도',element('input',null,{type:'range',min:'0',max:'100',value:Math.round(style.opacity*100),ariaLabel:'배경 불투명도'}));
    const amount=element('output',opacity.value+'%');opacity.after(amount);opacity.oninput=()=>amount.textContent=opacity.value+'%';
    return ()=>{
      const levels=rows.map(r=>({value:Number(r.value.value),enabled:r.enabled.checked,color:r.color.value}));
      if(levels.some(l=>!Number.isFinite(l.value)||l.value<=0||l.value>10)||new Set(levels.map(l=>l.value)).size!==levels.length){this.room.notice('구간 비율은 0보다 크고 10 이하인 서로 다른 숫자로 입력하세요.');return null;}
      return {levels,background:background.checked,opacity:Number(opacity.value)/100,single_color:single.checked};
    };
  }
  settings(d){
    this.closeDialog();const dialog=element('dialog'),form=element('form');dialog.className='cinema-dialog';form.method='dialog';
    const title=element('h3',TOOLS[d.kind]+' 설정');form.append(title,element('p',d.nickname+' · 도형 더블클릭으로 다시 열기'));
    const fields={};const field=(name,label,control)=>{const row=element('label',label);row.append(control);form.append(row);fields[name]=control;return control;};
    const canEdit=this.editable(d);
    field('color',d.kind==='pitchfork'?'미디언 색상':'색상',element('input',null,{type:'color',value:d.color}));
    const width=field('width','두께',element('select'));for(let i=1;i<=6;i++)width.add(new Option(i+' px',i));width.value=d.width;
    const dash=field('dash','선 스타일',element('select'));for(const [id,name] of [['solid','실선'],['dashed','파선'],['dotted','점선']])dash.add(new Option(name,id));dash.value=d.dash;
    for(const [name,label] of [['extend_left',d.kind==='pitchfork'?'확장선':'시작점 반대 방향으로 연장'],['extend_right','끝점 방향으로 연장'],['locked','위치 잠금']]){if(d.kind==='fibonacci'&&name!=='locked'||d.kind==='pitchfork'&&name==='extend_right')continue;field(name,label,element('input',null,{type:'checkbox',checked:d[name]}));}
    if(d.kind==='fibonacci')field('levels','비율 (0~1, 쉼표로 구분)',element('input',null,{type:'text',value:d.levels.join(', '),maxLength:160}));
    const readPitchfork=d.kind==='pitchfork'?this.pitchforkSettings(form,d,canEdit):null;
    const controls=element('div',null,{className:'dialog-actions'}),remove=element('button','삭제',{type:'button'}),cancel=element('button','닫기',{type:'button'}),save=element('button','저장',{type:'submit'});
    remove.onclick=()=>{this.remove(d);this.closeDialog();};cancel.onclick=()=>this.closeDialog();controls.append(remove,cancel,save);form.append(controls);
    save.disabled=remove.disabled=!canEdit;for(const el of Object.values(fields))el.disabled=!canEdit;
    if(!canEdit)form.append(element('p','본인 도형 또는 방장 권한으로만 수정할 수 있습니다.'));
    form.onsubmit=e=>{e.preventDefault();if(!this.editable(d))return;const levels=fields.levels?fields.levels.value.split(',').map(v=>Number(v.trim())):d.levels;
      if(!levels.length||levels.length>12||levels.some(n=>!Number.isFinite(n)||Math.abs(n)>10)){this.room.notice('비율은 -10~10 범위의 숫자를 12개까지 입력하세요.');return;}
      const pitchfork=readPitchfork?.();if(readPitchfork&&!pitchfork)return;
      this.history.submit('drawing_update',{id:d.id,revision:d.revision,drawing:{...d,color:fields.color.value,width:+fields.width.value,dash:fields.dash.value,extend_left:fields.extend_left?.checked||false,extend_right:d.kind==='pitchfork'||fields.extend_right?.checked||false,locked:fields.locked.checked,levels,...(pitchfork?{pitchfork}:{})}},d);this.closeDialog();};
    dialog.addEventListener('cancel',()=>this.closeDialog());dialog.append(form);document.body.append(dialog);this.dialog=dialog;this.room.capture(true);dialog.showModal();
  }
  destroy(){this.cancel();this.closeDialog();this.unbindSeries();this.history.reset();this.items.clear();this.selected=null;document.removeEventListener('keydown',this.key,true);this.selectionActions.remove();this.svg.remove();}
}
