// Godot listens on its canvas, while the cinema uses sibling DOM controls.
// Only a text editing caret owns game keys; chart tools and video controls do not.
const GAME_KEYS=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','KeyE','KeyP','KeyR']);
const MOVEMENT_KEYS=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight']);
let activeKeyboard=null;
// Every room transition returns key-up delivery to the persistent game canvas.
// Keep physical movement held; only typing, focus loss, or a real release stops it.
export function prepareRoomTransition(){
  const canvas=document.getElementById('canvas');
  if(!canvas||document.hidden||hasTextCaret(document.activeElement)){activeKeyboard?.release();return;}
  canvas.focus({preventScroll:true});
  if(activeKeyboard){
    for(const data of activeKeyboard.held.values())if(!MOVEMENT_KEYS.has(data.code))activeKeyboard.dispatch('keyup',{...data,repeat:false});
    activeKeyboard.held.clear();
  }
}
export function hasTextCaret(node){
  if(!node||node.disabled||node.readOnly)return false;
  return node.isContentEditable||node.tagName==='TEXTAREA'||node.tagName==='INPUT'&&['text','search','url','email','tel','password','number'].includes(node.type);
}
export class GameKeyboard {
  constructor(room){
    activeKeyboard=this;
    this.room=room;this.held=new Map();this.forwarding=false;this.viewportLocked=false;
    this.key=e=>this.route(e);
    this.focus=()=>{this.refresh();clearTimeout(this.focusTimer);this.focusTimer=setTimeout(()=>this.refresh(),0);};
    this.blur=()=>{this.release();this.focus();clearTimeout(this.frameTimer);this.frameTimer=setTimeout(()=>this.returnFromPlayer(),0);};
    this.visibility=()=>{if(document.hidden)this.release();};
    document.addEventListener('keydown',this.key,true);document.addEventListener('keyup',this.key,true);
    document.addEventListener('focusin',this.focus);document.addEventListener('focusout',this.focus);
    window.addEventListener('blur',this.blur);window.addEventListener('focus',this.focus);
    document.addEventListener('visibilitychange',this.visibility);
    this.refresh();
  }
  owns(node){return !!node&&(this.room.root?.contains(node)||!!node.closest?.('.cinema-dialog,.price-scale-menu'));}
  refresh(){
    const node=document.activeElement,typing=hasTextCaret(node),modal=!!document.querySelector('dialog[open]'),captured=this.room.active&&(modal||this.owns(node)&&typing);
    if(typing||modal)this.release();
    const soft=typing&&captured&&matchMedia('(pointer:coarse)').matches;
    if(soft&&!this.viewportLocked)window.btcGameViewport?.lock('cinema');
    else if(!soft&&this.viewportLocked)window.btcGameViewport?.release('cinema');
    this.viewportLocked=soft;this.room.inputFocused=captured;
    if(this.room.captured!==captured){this.room.captured=captured;if(captured)this.room.pens?.leave();this.room.emit();}
  }
  dispatch(type,data){
    const canvas=document.getElementById('canvas');if(!canvas)return;
    this.forwarding=true;
    try{canvas.dispatchEvent(new KeyboardEvent(type,{...data,bubbles:true,cancelable:true}));}
    finally{this.forwarding=false;}
  }
  route(e){
    if(this.forwarding||!this.room.active)return;
    if(e.key==='Enter'&&(e.code==='Enter'||e.code==='NumpadEnter')){this.routeChat(e);return;}
    if(!GAME_KEYS.has(e.code))return;
    const down=e.type==='keydown',canvas=document.getElementById('canvas');
    const data={code:e.code,key:e.key,repeat:e.repeat,shiftKey:e.shiftKey,ctrlKey:e.ctrlKey,altKey:e.altKey,metaKey:e.metaKey};
    if(!down&&this.held.has(e.code)){
      this.held.delete(e.code);
      if(e.target!==canvas){this.dispatch('keyup',data);e.preventDefault();}
      return;
    }
    if(e.isComposing||e.ctrlKey||e.metaKey||e.altKey||this.room.gameTyping||document.querySelector('dialog[open]')||hasTextCaret(e.target)||hasTextCaret(document.activeElement))return;
    if(down)this.held.set(e.code,data);
    if(e.target!==canvas){this.dispatch(e.type,data);e.preventDefault();}
  }
  routeChat(e){
    if(e.isComposing||e.keyCode===229||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey||hasTextCaret(e.target)||hasTextCaret(document.activeElement))return;
    const canvas=document.getElementById('canvas');
    if(this.room.root.hidden||document.querySelector('dialog[open],.cinema-tool-menu:not([hidden]),.price-scale-menu')){
      if(e.target===canvas&&!this.room.root.hidden){e.preventDefault();e.stopPropagation();}
      return;
    }
    if(!canvas||e.target===canvas)return;
    e.preventDefault();e.stopPropagation();
    if(e.type!=='keydown'||e.repeat)return;
    canvas.focus({preventScroll:true});
    this.dispatch('keydown',{code:e.code,key:e.key});
  }
  release(){for(const data of this.held.values())this.dispatch('keyup',{...data,repeat:false});this.held.clear();}
  returnFromPlayer(){
    const frame=document.activeElement;
    // Cross-origin iframe key events never reach the parent. Return keyboard
    // focus after a player click; pointer controls and YouTube branding stay intact.
    if(this.room.active&&!document.hidden&&frame?.tagName==='IFRAME'&&this.room.youtube?.root.contains(frame)){
      document.getElementById('canvas')?.focus({preventScroll:true});this.refresh();
    }
  }
  destroy(){
    this.release();clearTimeout(this.focusTimer);clearTimeout(this.frameTimer);
    if(activeKeyboard===this)activeKeyboard=null;
    document.removeEventListener('keydown',this.key,true);document.removeEventListener('keyup',this.key,true);
    document.removeEventListener('focusin',this.focus);document.removeEventListener('focusout',this.focus);
    window.removeEventListener('blur',this.blur);window.removeEventListener('focus',this.focus);
    document.removeEventListener('visibilitychange',this.visibility);
    if(this.viewportLocked)window.btcGameViewport?.release('cinema');this.viewportLocked=false;
  }
}
