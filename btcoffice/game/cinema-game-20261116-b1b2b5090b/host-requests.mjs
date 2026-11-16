const el=(tag,text,attrs={})=>{const node=document.createElement(tag);if(text)node.textContent=text;Object.assign(node,attrs);return node;};

export class HostRequests {
  constructor(room){
    this.room=room;this.lastRequest=0;
    this.root=el('aside',null,{className:'cinema-host-controls',hidden:true});
    this.raise=el('button',null,{type:'button',className:'cinema-raise-hand',ariaLabel:'방장 할래!'});
    // A code-native palm keeps its black outline crisp at mobile sizes.
    this.raise.innerHTML='<svg viewBox="0 0 110 122" aria-hidden="true"><path d="M29 61V27Q29 17 37 17Q45 17 45 27V48V15Q45 5 53 5Q61 5 61 15V47V22Q61 12 69 12Q77 12 77 22V51V34Q77 24 85 24Q93 24 93 34V72Q94 109 63 115Q40 120 27 99L10 74Q4 64 12 60Q19 56 29 72Z"/><text x="57" y="77">방장</text><text x="57" y="98">할래!</text></svg>';
    this.raise.onclick=()=>{if(Date.now()-this.lastRequest<500)return;this.lastRequest=Date.now();room.send({type:'host_request',request_id:crypto.randomUUID()});};
    this.appoint=el('button','방장 임명',{type:'button',className:'cinema-appoint'});this.appoint.onclick=()=>this.open();
    this.root.append(this.raise,this.appoint);document.body.append(this.root);
  }
  get requests(){return (this.room.state?.participants||[]).filter(p=>p.host_requested_at&&!p.away&&p.id!==this.room.state.host).sort((a,b)=>a.host_requested_at-b.host_requested_at);}
  update(){
    const room=this.room,requests=this.requests;
    this.root.hidden=!this.placed||this.geometryHidden||!room.state;
    this.raise.hidden=room.host||!room.state;this.appoint.hidden=!room.host||!requests.length;
    this.raise.setAttribute('aria-pressed',String(!!room.me?.host_requested_at));
    this.appoint.title=`방장 신청 ${requests.length}명`;
    if(!this.dialog?.isConnected)return;
    if(!room.host){room.closeDialog();return;}
    const signature=JSON.stringify([requests.map(p=>[p.id,p.nickname]),this.pending]);
    if(signature===this.signature)return;this.signature=signature;this.list.replaceChildren();
    if(!requests.length)this.list.append(el('p','아직 방장 신청이 없습니다.'));
    for(const person of requests){
      const button=el('button',null,{type:'button',className:'cinema-appoint-person',disabled:!!this.pending,title:person.nickname+'로 임명하기'});
      button.dataset.appoint=person.id;button.append(el('span',person.nickname,{className:'cinema-appoint-name'}),el('span','로 임명하기'));
      button.onclick=()=>{this.pending=crypto.randomUUID();this.status.textContent='임명 중…';if(!room.send({type:'host_approve',id:person.id,request_id:this.pending})){this.pending=null;this.status.textContent='연결 후 다시 시도해 주세요.';}this.update();};
      this.list.append(button);
    }
  }
  open(){
    if(!this.room.host)return;
    const {dialog,actions}=this.room.dialogBox('방장 임명');dialog.classList.add('cinema-host-dialog');this.dialog=dialog;this.pending=null;this.signature='';
    this.list=el('div',null,{className:'cinema-host-request-list'});this.status=el('p','',{role:'status'});
    dialog.append(this.list,this.status,actions);this.update();dialog.showModal();
  }
  receive(data){
    if(!this.pending||data.request_id!==this.pending)return;
    if(data.type==='host_approved'){this.room.closeDialog();this.pending=null;}
    else if(data.type==='error'){this.pending=null;if(this.status)this.status.textContent=data.message;this.update();}
  }
  geometry(g,r,sx,sy){
    this.placed=true;this.geometryHidden=!!g.hidden;
    const rect=g.host_rect||[g.rect[0]+g.rect[2]+6,g.rect[1]+80,86,132];
    Object.assign(this.root.style,{left:r.left+rect[0]*sx+'px',top:r.top+rect[1]*sy+'px',width:rect[2]*sx+'px'});
    this.root.hidden=!!g.hidden||!this.room.state;
  }
  destroy(){this.root.remove();}
}
