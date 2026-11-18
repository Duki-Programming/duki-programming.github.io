import {TOOLS} from './drawing-geometry.mjs';
// TradingView-style flyout for the line family, plus a per-device favorites strip.
export const LINE_GROUPS=[['라인',['trend','ray','extended','hline','hray','vline','crossline']],['채널',['channel']],['피치포크',['pitchfork']]];
export const LINE_TOOLS=LINE_GROUPS.flatMap(([,tools])=>tools);
const dot=(x,y)=>`<circle cx="${x}" cy="${y}" r="2.2"/>`;
const ICONS={
  trend:`<path d="M7.5 20.5l13-13"/>${dot(6,22)}${dot(22,6)}`,
  ray:`<path d="M7.5 20.5L25 3"/>${dot(6,22)}${dot(14,14)}`,
  extended:`<path d="M3 25L25 3"/>${dot(10,18)}${dot(18,10)}`,
  hline:`<path d="M3 14h8.8m4.4 0H25"/>${dot(14,14)}`,
  hray:`<path d="M10.2 14H25"/>${dot(8,14)}`,
  vline:`<path d="M14 3v8.8m0 4.4V25"/>${dot(14,14)}`,
  crossline:`<path d="M3 14h8.8m4.4 0H25M14 3v8.8m0 4.4V25"/>${dot(14,14)}`,
  channel:`<path d="M4 17L17 4M11 24L24 11"/>${dot(6,15)}${dot(15,6)}${dot(13,22)}`,
  pitchfork:`<path d="M5 23l7-7m0 0l6-11m-6 11l11-6m-8 2l10-10m-6 14l7-7"/>${dot(5,23)}`,
};
export const toolIcon=tool=>`<svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${ICONS[tool]||''}</svg>`;
const KEY='btc-cinema-favorite-tools';
const el=(tag,text,attrs={})=>{const e=document.createElement(tag);if(text)e.textContent=text;Object.assign(e,attrs);return e;};
export function loadFavorites(storage=globalThis.localStorage){
  try{const list=JSON.parse(storage?.getItem(KEY)||'[]');return Array.isArray(list)?[...new Set(list)].filter(t=>LINE_TOOLS.includes(t)):[];}catch{return [];}
}
function saveFavorites(list,storage=globalThis.localStorage){try{storage?.setItem(KEY,JSON.stringify(list));}catch{/* Private mode: favorites last for this visit. */}}
export class ToolMenu {
  constructor(drawings,toolbar,bar){
    this.drawings=drawings;this.bar=bar;this.favorites=loadFavorites();this.last='trend';this.items=new Map();
    this.button=el('button',null,{type:'button',className:'cinema-tool-group',title:'라인',ariaLabel:'라인 도구 모음'});
    this.button.setAttribute('aria-haspopup','menu');this.button.setAttribute('aria-expanded','false');
    this.button.onclick=e=>{e.stopPropagation();this.menu.hidden?this.open():this.close();};toolbar.append(this.button);
    this.menu=el('div',null,{className:'cinema-tool-menu',hidden:true});this.menu.setAttribute('role','menu');this.menu.setAttribute('aria-label','라인');
    for(const [name,tools] of LINE_GROUPS){
      this.menu.append(el('div',name,{className:'cinema-tool-menu-heading'}));
      for(const tool of tools){
        const row=el('div',null,{className:'cinema-tool-menu-row'}),pick=el('button',null,{type:'button',className:'cinema-tool-menu-item'});
        pick.dataset.tool=tool;pick.setAttribute('role','menuitemradio');pick.innerHTML=toolIcon(tool);pick.append(el('span',TOOLS[tool]));pick.onclick=()=>this.choose(tool);
        const star=el('button',null,{type:'button',className:'cinema-tool-star'});star.dataset.favorite=tool;star.onclick=e=>{e.stopPropagation();this.toggleFavorite(tool);};
        row.append(pick,star);this.menu.append(row);this.items.set(tool,{row,pick,star});
      }
    }
    drawings.room.root.append(this.menu);
    this.outside=e=>{if(!this.menu.hidden&&!this.menu.contains(e.target)&&!this.button.contains(e.target))this.close();};
    document.addEventListener('pointerdown',this.outside,true);
    this.renderFavorites();this.sync();
  }
  open(){
    const root=this.drawings.room.root.getBoundingClientRect(),r=this.button.getBoundingClientRect();
    this.menu.hidden=false;this.button.setAttribute('aria-expanded','true');
    const height=Math.min(this.menu.scrollHeight,root.height-8);
    Object.assign(this.menu.style,{left:Math.round(r.right-root.left+4)+'px',top:Math.round(Math.max(4,Math.min(r.top-root.top,root.height-height-4)))+'px',maxHeight:(root.height-8)+'px'});
  }
  close(){this.menu.hidden=true;this.button.setAttribute('aria-expanded','false');}
  choose(tool){this.close();this.drawings.setTool(tool);}
  toggleFavorite(tool){
    this.favorites=this.favorites.includes(tool)?this.favorites.filter(t=>t!==tool):[...this.favorites,tool].sort((a,b)=>LINE_TOOLS.indexOf(a)-LINE_TOOLS.indexOf(b));
    saveFavorites(this.favorites);this.renderFavorites();this.sync();
  }
  renderFavorites(){
    if(!this.bar)return;
    const star=el('span','★',{className:'cinema-favorites-star',title:this.favorites.length?'즐겨찾기 도구':'즐겨찾기 없음 · 라인 도구 목록에서 ☆를 눌러 추가'});
    this.favoriteButtons=new Map(this.favorites.map(tool=>{const b=el('button',null,{type:'button',title:TOOLS[tool],ariaLabel:TOOLS[tool]});b.dataset.favoriteTool=tool;b.innerHTML=toolIcon(tool);b.onclick=()=>this.drawings.setTool(tool);return [tool,b];}));
    this.bar.replaceChildren(star,...this.favoriteButtons.values());
  }
  sync(){
    const tool=this.drawings.tool,allowed=this.drawings.allowed,inGroup=LINE_TOOLS.includes(tool);if(inGroup)this.last=tool;
    this.button.innerHTML=toolIcon(this.last)+'<i class="cinema-tool-caret" aria-hidden="true"></i>';this.button.title='라인 · '+TOOLS[this.last];this.button.classList.toggle('active',inGroup);
    for(const [name,{row,pick,star}] of this.items){
      const on=this.favorites.includes(name);row.classList.toggle('active',name===tool);pick.disabled=!allowed;pick.setAttribute('aria-checked',String(name===tool));
      star.classList.toggle('on',on);star.textContent=on?'★':'☆';star.title=on?'즐겨찾기에서 빼기':'즐겨찾기에 넣기';star.ariaLabel=TOOLS[name]+' '+star.title;
    }
    for(const [name,b] of this.favoriteButtons||[]){b.classList.toggle('active',name===tool);b.disabled=!allowed;}
  }
  destroy(){document.removeEventListener('pointerdown',this.outside,true);this.menu.remove();this.bar?.replaceChildren();}
}
