// Collaborative pen presence is disposable: no history, no heartbeat, no database.
const icons={brush:'<svg width="26" height="28" viewBox="0 0 26 28" aria-hidden="true"><path d="M1 27 5 16 18 3Q20 1 22 3L24 5Q26 7 24 9L11 22Z" fill="currentColor" stroke="#10171f" stroke-width="1.5"/><path d="m5 16 6 6M18 3l6 6M1 27l4-2" fill="none" stroke="#fff" stroke-width="1.4"/></svg>',cursor:'<svg width="24" height="29" viewBox="0 0 24 29" aria-hidden="true"><path d="M1 1 21 17 13 18 17 26 12 28 8 20 2 26Z" fill="currentColor" stroke="#10171f" stroke-width="1.6" stroke-linejoin="round"/><path d="m4 6 1 13" stroke="#fff" stroke-width="1.2" opacity=".8"/></svg>'};
const TOUCH_CURSOR_MS=6000;
export class Pens {
  constructor(room,plot){
    this.room=room;this.plot=plot;this.items=new Map();this.nodes=new Map();this.local=null;this.pending=undefined;this.sent=null;
    this.layer=document.createElement('div');this.layer.className='cinema-pens';plot.append(this.layer);
    this.track=e=>{
      if(e.isPrimary===false||e.target.closest?.('.cinema-selection-actions'))return;
      const point=room.drawings.point(e);
      if(!point){this.leave();return;}
      const touch=e.pointerType==='touch';
      this.local={x:e.clientX,y:e.clientY,point,touch};this.pending=point;
      clearTimeout(this.touchTimer);
      if(touch)this.touchTimer=setTimeout(()=>this.leave(),TOUCH_CURSOR_MS);
      this.render();
    };
    this.exit=e=>{if(e.pointerType!=='touch'&&!this.local?.touch)this.leave();};
    this.cancel=e=>{if(e.isPrimary&&e.pointerType==='touch')this.leave();};
    plot.addEventListener('pointerenter',this.track);
    for(const type of ['pointerdown','pointermove'])plot.addEventListener(type,this.track,true);
    plot.addEventListener('pointerleave',this.exit);plot.addEventListener('pointercancel',this.cancel);
    this.timer=setInterval(()=>this.flush(),200);
  }
  leave(){clearTimeout(this.touchTimer);this.local=null;this.pending=null;this.flush();this.render();}
  receive(packet){if(packet.point)this.items.set(packet.id,{point:packet.point,tool:packet.tool==='brush'?'brush':'cursor'});else this.items.delete(packet.id);this.render();}
  reset(){clearTimeout(this.touchTimer);this.items.clear();this.local=null;this.pending=undefined;this.sent=null;this.render();}
  toolChanged(){if(this.local)this.pending=this.local.point;this.render();}
  flush(){
    if(this.pending===undefined||!this.room.state?.context)return;
    const point=this.pending,tool=this.room.drawings.tool==='brush'?'brush':'cursor',serial=point?JSON.stringify([point,tool]):null;
    if(serial===this.sent||this.room.send({type:'cursor',point,tool})){this.sent=serial;this.pending=undefined;}
  }
  render(){
    const room=this.room,people=room.state?.participants||[],visible=new Set(),r=this.plot.getBoundingClientRect();
    const active=new Set();
    for(const person of people){
      if(person.away)continue;active.add(person.id);
      const own=person.id===room.id,item=this.items.get(person.id);
      const p=own?(this.local?this.local.touch?room.drawings.project(this.local.point):{x:this.local.x-r.left,y:this.local.y-r.top}:null):(item?room.drawings.project(item.point):null);
      if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.y<0||p.x>room.drawings.width||p.y>room.drawings.height)continue;
      visible.add(person.id);let node=this.nodes.get(person.id);
      if(!node){node=document.createElement('div');node.className='cinema-pen';node.dataset.participant=person.id;this.layer.append(node);this.nodes.set(person.id,node);}
      const tool=own?(room.drawings.tool==='brush'?'brush':'cursor'):item.tool;
      if(node.dataset.tool!==tool){node.dataset.tool=tool;node.innerHTML=icons[tool];node.append(document.createElement('span'));}
      node.querySelector('span').textContent=own?(tool==='brush'?'내 펜':'내 커서'):person.nickname;
      node.style.color=person.color||'#64d8ff';node.style.transform=`translate(${p.x}px,${p.y}px)`;node.hidden=false;
    }
    for(const id of this.items.keys())if(!active.has(id))this.items.delete(id);
    for(const [id,node] of this.nodes)if(!visible.has(id)){node.remove();this.nodes.delete(id);}
    this.plot.classList.toggle('pen-hover',visible.has(room.id));
  }
  destroy(){clearInterval(this.timer);clearTimeout(this.touchTimer);for(const type of ['pointerdown','pointermove'])this.plot.removeEventListener(type,this.track,true);this.plot.removeEventListener('pointerenter',this.track);this.plot.removeEventListener('pointerleave',this.exit);this.plot.removeEventListener('pointercancel',this.cancel);this.plot.classList.remove('pen-hover');this.layer.remove();}
}
