import {unionRectangles} from './drawing-geometry.mjs';

// Godot paints sprite alpha and text over the DOM chart. An invisible input
// surface forwards the floor and HUD's pointer areas to the game canvas.
export class CinemaCompositor {
  constructor(canvas){
    this.canvas=canvas;this.saved={zIndex:canvas.style.zIndex,pointerEvents:canvas.style.pointerEvents,backgroundColor:canvas.style.backgroundColor,position:canvas.style.position};
    Object.assign(canvas.style,{zIndex:'41',pointerEvents:'none',backgroundColor:'transparent'});
    if(getComputedStyle(canvas).position==='static')canvas.style.position='relative';
    this.surface=document.createElement('div');this.surface.id='btc-cinema-game-input';
    Object.assign(this.surface.style,{position:'fixed',zIndex:'42',touchAction:'none',webkitTouchCallout:'none',background:'transparent'});
    // Native fields need the original tap to open a phone's keyboard.
    this.nativeFieldLayer=document.documentElement.style.getPropertyValue('--btc-native-field-layer');
    document.documentElement.style.setProperty('--btc-native-field-layer','43');
    this.surface.setAttribute('aria-hidden','true');document.body.append(this.surface);
    this.forward=e=>{
      e.stopPropagation();
      if(['mousedown','touchstart'].includes(e.type))canvas.focus({preventScroll:true});
      let copy;
      if(typeof TouchEvent!=='undefined'&&e instanceof TouchEvent){
        const touches=list=>Array.from(list,t=>new Touch({identifier:t.identifier,target:canvas,clientX:t.clientX,clientY:t.clientY,screenX:t.screenX,screenY:t.screenY,pageX:t.pageX,pageY:t.pageY,radiusX:t.radiusX,radiusY:t.radiusY,rotationAngle:t.rotationAngle,force:t.force}));
        copy=new TouchEvent(e.type,{bubbles:true,cancelable:true,touches:touches(e.touches),targetTouches:touches(e.targetTouches),changedTouches:touches(e.changedTouches),ctrlKey:e.ctrlKey,shiftKey:e.shiftKey,altKey:e.altKey,metaKey:e.metaKey});
      }else{
        const init={bubbles:true,cancelable:true,clientX:e.clientX,clientY:e.clientY,screenX:e.screenX,screenY:e.screenY,button:e.button,buttons:e.buttons,ctrlKey:e.ctrlKey,shiftKey:e.shiftKey,altKey:e.altKey,metaKey:e.metaKey,movementX:e.movementX,movementY:e.movementY,detail:e.detail};
        copy=e instanceof WheelEvent?new WheelEvent(e.type,{...init,deltaX:e.deltaX,deltaY:e.deltaY,deltaZ:e.deltaZ,deltaMode:e.deltaMode}):new MouseEvent(e.type,init);
      }
      if(!canvas.dispatchEvent(copy))e.preventDefault();
    };
    for(const type of ['mousedown','mouseup','mousemove','mouseenter','mouseleave','click','dblclick','contextmenu','wheel','touchstart','touchmove','touchend','touchcancel'])this.surface.addEventListener(type,this.forward,{passive:false});
    this.surface.addEventListener('pointerdown',e=>this.surface.setPointerCapture(e.pointerId));
  }

  geometry(g,rect){
    const sx=rect.width/g.viewport[0],sy=rect.height/g.viewport[1],width=rect.width,height=rect.height;
    Object.assign(this.surface.style,{left:rect.left+'px',top:rect.top+'px',width:width+'px',height:height+'px'});
    let path=`M0 0H${width}V${height}H0Z`;
    if(!g.hidden){
      const [x,y,w,h]=g.rect,[left,top,right,bottom]=[x*sx,y*sy,(x+w)*sx,(y+h)*sy];
      path+=`M${left} ${top}V${bottom}H${right}V${top}Z`;
      const holes=(g.holes||[]).map(([hx,hy,hw,hh])=>[Math.max(left,hx*sx),Math.max(top,hy*sy),Math.min(right,(hx+hw)*sx),Math.min(bottom,(hy+hh)*sy)]).filter(r=>r[2]>r[0]&&r[3]>r[1]);
      const hand=(g.hand||[]).map(([px,py])=>[px*sx,py*sy]);
      if(hand.length){
        const bounds=[Math.min(...hand.map(p=>p[0])),Math.min(...hand.map(p=>p[1])),Math.max(...hand.map(p=>p[0])),Math.max(...hand.map(p=>p[1]))];
        if(bounds[0]>=left&&bounds[2]<=right&&bounds[1]>=top&&bounds[3]<=bottom&&!holes.some(r=>r[0]<bounds[2]&&r[2]>bounds[0]&&r[1]<bounds[3]&&r[3]>bounds[1]))path+='M'+hand.map(p=>p.join(' ')).join('L')+'Z';
        else holes.push([Math.max(left,bounds[0]),Math.max(top,bounds[1]),Math.min(right,bounds[2]),Math.min(bottom,bounds[3])]);
      }
      for(const [ax,ay,bx,by] of unionRectangles(holes.filter(r=>r[2]>r[0]&&r[3]>r[1])))path+=`M${ax} ${ay}V${by}H${bx}V${ay}Z`;
    }
    this.surface.style.clipPath=`path(evenodd, "${path}")`;
  }

  destroy(){
    this.surface.remove();Object.assign(this.canvas.style,this.saved);
    if(this.nativeFieldLayer)document.documentElement.style.setProperty('--btc-native-field-layer',this.nativeFieldLayer);
    else document.documentElement.style.removeProperty('--btc-native-field-layer');
  }
}
