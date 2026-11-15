// Per-browser history. Only acknowledged edits to the author's own drawings enter it.
export class DrawingHistory {
  constructor({send,owns,allowed,notice,changed=()=>{}}){Object.assign(this,{send,owns,allowed,notice,changed});this.undoStack=[];this.redoStack=[];this.pending=new Map();this.records=new Map();}
  get canUndo(){return this.allowed()&&!this.pending.size&&!!this.undoStack.length;}
  get canRedo(){return this.allowed()&&!this.pending.size&&!!this.redoStack.length;}
  reset(){this.undoStack=[];this.redoStack=[];this.pending.clear();this.records.clear();this.changed();}
  submit(type,fields={},before=null){
    if(!this.allowed())return false;
    if([...this.pending.values()].some(p=>p.mode!=='edit')){this.notice('되돌리기가 적용된 뒤 다시 그려 주세요.');return false;}
    return this.dispatch(type,fields,{mode:'edit',before:before?structuredClone(before):null,record:before?this.records.get(before.id):null});
  }
  dispatch(type,fields,operation){
    const request_id=crypto.randomUUID();this.pending.set(request_id,operation);
    if(this.send({type,...fields,request_id})===false){this.pending.delete(request_id);this.notice('연결 후 다시 시도해 주세요.');this.changed();return false;}
    this.changed();return true;
  }
  travel(redo=false){
    const source=redo?this.redoStack:this.undoStack;if(!this.allowed()||this.pending.size||!source.length)return false;
    const entry=source.at(-1),target=redo?entry.after:entry.before,current=entry.record.current;
    const operation={mode:redo?'redo':'undo',entry,record:entry.record};
    if(current&&target)return this.dispatch('drawing_update',{id:current.id,revision:current.revision,drawing:target},operation);
    if(current)return this.dispatch('drawing_delete',{id:current.id,revision:current.revision},operation);
    if(target)return this.dispatch('drawing_create',{drawing:target},operation);
    return false;
  }
  accept(requestId,id,after){
    const op=this.pending.get(requestId);
    if(!op){this.observe(id,after);return;}
    this.pending.delete(requestId);
    if(op.mode==='edit'){
      if(!this.owns(op.before||after)){this.observe(id,after);this.changed();return;}
      const record=op.record||this.records.get(id)||{current:null};this.setCurrent(record,after);
      this.undoStack.push({record,before:op.before,after:after?structuredClone(after):null});this.undoStack=this.undoStack.slice(-50);this.redoStack=[];
    }else{
      this.setCurrent(op.record,after);
      const source=op.mode==='undo'?this.undoStack:this.redoStack,destination=op.mode==='undo'?this.redoStack:this.undoStack;
      if(source.at(-1)===op.entry){source.pop();destination.push(op.entry);}
    }
    this.prune();this.changed();
  }
  setCurrent(record,value){if(record.current)this.records.delete(record.current.id);record.current=value?structuredClone(value):null;if(value)this.records.set(value.id,record);}
  observe(id,after){
    const record=this.records.get(id);if(!record)return;
    // A moderator or another session changed this shape. Do not undo their edit.
    this.undoStack=this.undoStack.filter(e=>e.record!==record);this.redoStack=this.redoStack.filter(e=>e.record!==record);this.records.delete(id);this.changed();
  }
  reject(requestId){if(this.pending.delete(requestId))this.changed();}
  prune(){const keep=new Set([...this.undoStack,...this.redoStack].map(e=>e.record));for(const [id,record] of this.records)if(!keep.has(record))this.records.delete(id);}
}
