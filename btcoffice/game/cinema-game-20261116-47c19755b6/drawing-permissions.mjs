const el=(tag,text,attrs={})=>{const node=document.createElement(tag);if(text)node.textContent=text;Object.assign(node,attrs);return node;};

export class DrawingPermissions {
  constructor(room){this.room=room;}
  open(){
    if(!this.room.host)return;
    const {dialog,actions}=this.room.dialogBox('함께 그리기');
    this.dialog=dialog;this.selected=new Set(this.room.state.drawers||[]);this.nominee=null;this.requestId=null;this.signature='';
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
    if(this.nominee&&!people.some(p=>p.id===this.nominee)){this.nominee=null;this.status.textContent='임명할 이용자가 방을 나갔습니다.';}
    this.confirm.disabled=!!this.requestId;
    this.description.textContent=this.nominee?'확인하면 방장을 넘기고 그리기 권한을 초기화합니다. 새 방장만 그릴 수 있는 상태로 시작합니다.':'체크한 사람에게 그리기 권한을 줍니다. 차트 이동·확대/축소는 방장만 할 수 있습니다.';
    const signature=JSON.stringify([people.map(p=>[p.id,p.nickname]),[...this.selected],this.nominee,this.requestId]);
    if(signature===this.signature)return;this.signature=signature;this.list.replaceChildren();
    for(const person of people){
      const host=person.id===this.room.state.host,target=person.id===this.nominee;
      const row=el('div',null,{className:'cinema-permission-row'}),label=el('label');
      const checkbox=el('input',null,{type:'checkbox',checked:this.nominee?target:host||this.selected.has(person.id),disabled:!!this.requestId||!!this.nominee||host});
      checkbox.dataset.member=person.id;checkbox.setAttribute('aria-label',person.nickname+' 그리기 허용');
      checkbox.onchange=()=>{if(checkbox.checked)this.selected.add(person.id);else this.selected.delete(person.id);};
      const name=el('span',person.nickname+(host?' · 방장':''));label.append(checkbox,name);
      const nominate=el('button',host?'현재 방장':target?'임명 취소':'방장 임명',{type:'button',disabled:host||!!this.requestId});
      nominate.dataset.nominee=person.id;nominate.setAttribute('aria-pressed',String(target));
      nominate.onclick=()=>{this.nominee=target?null:person.id;this.update();};row.append(label,nominate);this.list.append(row);
    }
  }
  save(){
    if(!this.room.host||this.requestId)return;
    this.requestId=crypto.randomUUID();this.status.textContent='적용 중…';
    if(!this.room.send({type:'drawing_permissions',members:[...this.selected],nominee:this.nominee,request_id:this.requestId})){
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
