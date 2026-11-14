// Collaborative pen presence is disposable: no history, no heartbeat, no database.
const icon='<svg width="26" height="28" viewBox="0 0 26 28" aria-hidden="true"><path d="M1 27 5 16 18 3Q20 1 22 3L24 5Q26 7 24 9L11 22Z" fill="currentColor" stroke="#10171f" stroke-width="1.5"/><path d="m5 16 6 6M18 3l6 6M1 27l4-2" fill="none" stroke="#fff" stroke-width="1.4"/></svg>';
export class Pens {
  constructor(room,plot){
    this.room=room;this.plot=plot;this.items=new Map();this.nodes=new Map();this.local=null;this.pending=undefined;this.sent=null;
    this.layer=document.createElement('div');this.layer.className='cinema-pens';plot.append(this.layer);
    this.move=e=>{if(e.pointerType==='touch')return;const point=room.drawings.point(e);this.local=point?{x:e.clientX,y:e.clientY}:null;this.pending=point;this.render();};
    this.leave=()=>{this.local=null;this.pending=null;this.flush();this.render();};
    plot.addEventListener('pointermove',this.move);plot.addEventListener('pointerleave',this.leave);
    this.timer=setInterval(()=>{this.flush();this.render();},200);
  }
  receive(packet){if(packet.point)this.items.set(packet.id,{point:packet.point,at:Date.now()});else this.items.delete(packet.id);this.render();}
  reset(){this.items.clear();this.local=null;this.pending=null;this.sent=null;this.render();}
  flush(){
    if(this.pending===undefined)return;
    const point=this.pending,serial=JSON.stringify(point);this.pending=undefined;
    if(serial===this.sent)return;this.sent=serial;this.room.send({type:'cursor',point});
  }
  render(){
    const room=this.room,people=room.state?.participants||[],visible=new Set(),r=this.plot.getBoundingClientRect();
    for(const person of people){
      const own=person.id===room.id,item=this.items.get(person.id);
      const p=own?(this.local?{x:this.local.x-r.left,y:this.local.y-r.top}:null):(item&&Date.now()-item.at<6000?room.drawings.project(item.point):null);
      if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.y<0||p.x>room.drawings.width||p.y>room.drawings.height)continue;
      visible.add(person.id);let node=this.nodes.get(person.id);
      if(!node){node=document.createElement('div');node.className='cinema-pen';node.innerHTML=icon;const label=document.createElement('span');label.textContent=own?'내 펜':person.nickname;node.append(label);node.dataset.participant=person.id;this.layer.append(node);this.nodes.set(person.id,node);}
      node.style.color=person.color||'#64d8ff';node.style.transform=`translate(${p.x}px,${p.y}px)`;node.hidden=false;
    }
    for(const [id,node] of this.nodes)if(!visible.has(id)){node.remove();this.nodes.delete(id);}
    this.plot.classList.toggle('pen-hover',visible.has(room.id));
  }
  destroy(){clearInterval(this.timer);this.plot.removeEventListener('pointermove',this.move);this.plot.removeEventListener('pointerleave',this.leave);this.plot.classList.remove('pen-hover');this.layer.remove();}
}
