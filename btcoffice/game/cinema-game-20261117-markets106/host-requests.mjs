const el=(tag,text,attrs={})=>{const node=document.createElement(tag);if(text)node.textContent=text;Object.assign(node,attrs);return node;};

export class HostRequests {
  constructor(room){
    this.room=room;this.lastRequest=0;
  }
  request(){
    const room=this.room;
    if(!room.active||room.host||!room.me||room.me.away||Date.now()-this.lastRequest<500)return;
    if(room.send({type:'host_request',request_id:crypto.randomUUID()}))this.lastRequest=Date.now();
    else room.notice('연결 후 다시 시도해 주세요.');
  }
  get requests(){return (this.room.state?.participants||[]).filter(p=>p.host_requested_at&&!p.away&&p.id!==this.room.state.host).sort((a,b)=>a.host_requested_at-b.host_requested_at);}
  update(){
    const room=this.room,requests=this.requests;
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
}
