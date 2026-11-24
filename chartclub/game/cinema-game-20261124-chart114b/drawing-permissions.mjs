const el=(tag,text,attrs={})=>{const node=document.createElement(tag);if(text)node.textContent=text;Object.assign(node,attrs);return node;};

export class DrawingPermissions {
  constructor(room){this.room=room;}
  open(){
    if(!this.room.host)return;
    const {dialog,actions}=this.room.dialogBox('함께 그리기');
    this.dialog=dialog;this.selected=new Set(this.room.state.drawers||[]);this.known=new Set(this.room.state.participants.map(p=>p.id));this.requestId=null;this.signature='';
    this.description=el('p');this.list=el('div',null,{className:'cinema-permissions-list'});
    this.status=el('p','',{role:'status'});this.confirm=el('button','확인',{type:'button'});
    this.confirm.onclick=()=>this.save();actions.firstChild.textContent='취소';actions.prepend(this.confirm);
    dialog.append(this.description,this.list,this.status,actions);this.update();dialog.showModal();
  }
  update(){
    if(!this.dialog?.isConnected)return;
    if(!this.room.host){this.room.closeDialog();return;}
    const people=this.room.state.participants;
    this.selected=new Set([...this.selected].filter(id=>people.some(p=>p.id===id)));
    for(const id of this.room.state.drawers)if(!this.known.has(id))this.selected.add(id);
    this.known=new Set(people.map(p=>p.id));
    this.confirm.disabled=!!this.requestId;
    this.description.textContent='로그인한 참여자는 입장하면 바로 그릴 수 있습니다. 차트 이동·확대/축소는 방장이 합니다.';
    const signature=JSON.stringify([people.map(p=>[p.id,p.nickname]),[...this.selected],this.requestId]);
    if(signature===this.signature)return;this.signature=signature;this.list.replaceChildren();
    for(const person of people){
      const host=person.id===this.room.state.host,checked=host||this.selected.has(person.id);
      const row=el('div',null,{className:'cinema-permission-row'}),name=el('span',person.nickname+(host?' · 방장':''),{className:'cinema-permission-name'});
      const toggle=el('button',(checked?'✓ ':'□ ')+(host?'방장':'그리기'),{type:'button',disabled:!!this.requestId||host||!person.user_id,className:'cinema-permission-toggle'});
      toggle.dataset.member=person.id;toggle.setAttribute('aria-label',person.nickname+' 그리기 허용');toggle.setAttribute('aria-pressed',String(checked));
      toggle.onclick=()=>{if(checked)this.selected.delete(person.id);else this.selected.add(person.id);this.update();};
      row.append(name,toggle);this.list.append(row);
    }
  }
  save(){
    if(!this.room.host||this.requestId)return;
    this.requestId=crypto.randomUUID();this.status.textContent='적용 중…';
    if(!this.room.send({type:'drawing_permissions',members:[...this.selected],nominee:null,request_id:this.requestId})){
      this.requestId=null;this.status.textContent='연결 후 다시 시도해 주세요.';
    }
    this.update();
  }
  receive(data){
    if(!this.dialog?.isConnected||!this.requestId||data.request_id!==this.requestId)return;
    if(data.type==='drawing_permissions_saved'){this.room.closeDialog();return;}
    if(data.type==='error'){this.requestId=null;this.status.textContent=data.message;this.update();}
  }
}
