import {parseVideoLink,parseTime,videoPosition,safeVideoRect} from './youtube-state.mjs';
const el=(tag,text,props={})=>{const node=document.createElement(tag);if(text)node.textContent=text;Object.assign(node,props);return node;};
let loading;
function loadAPI(signal){
  if(window.YT?.Player)return Promise.resolve(window.YT);
  if(loading)return loading;
  loading=new Promise((resolve,reject)=>{
    const previous=window.onYouTubeIframeAPIReady,script=el('script',null,{src:'https://www.youtube.com/iframe_api',id:'btc-youtube-api'});
    let timer;const cleanup=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);if(window.onYouTubeIframeAPIReady===ready)window.onYouTubeIframeAPIReady=previous;};
    const abort=()=>{cleanup();script.remove();loading=null;reject(new Error('cancelled'));};
    const ready=()=>{cleanup();try{previous?.();}catch{}resolve(window.YT);};
    window.onYouTubeIframeAPIReady=ready;script.onerror=abort;timer=setTimeout(abort,15000);signal.addEventListener('abort',abort,{once:true});document.head.append(script);
  });return loading;
}
export class YoutubeScreen {
  constructor(room){
    this.room=room;this.joined=true;this.browsing=false;this.manualPaused=false;this.destroyed=false;this.ready=false;this.media=null;this.round='';this.error='';this.volume=70;this.muted=false;this.generation=0;
    this.root=el('section',null,{className:'cinema-youtube'});this.root.hidden=true;
    this.link=el('input',null,{type:'url',placeholder:'YouTube 영상 링크 붙여넣기',ariaLabel:'유튜브 영상 링크',autocomplete:'off',maxLength:2000});this.link.name='youtube-video-url';
    this.load=el('button','불러오기',{type:'submit'});const address=el('form',null,{className:'yt-address'});address.append(this.link,this.load);address.onsubmit=e=>{e.preventDefault();this.previewLink();};this.root.append(address);
    this.shared=el('div',null,{className:'yt-shared-controls'});this.shared.append(el('span','공용 제어',{className:'yt-control-label'}));
    this.sharedButtons=[];
    for(const [text,command] of [['전체 재생','play'],['전체 일시정지','pause'],['영상 종료','stop']]){const button=el('button',text,{type:'button'});button.onclick=()=>room.mediaCommand(command);this.shared.append(button);this.sharedButtons.push(button);}
    this.seek=el('input',null,{type:'text',inputMode:'decimal',placeholder:'분:초',ariaLabel:'공용 재생 위치',maxLength:12});this.seekButton=el('button','전체 이동',{type:'button'});this.seekButton.onclick=()=>this.seekTo();this.seek.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();this.seekTo();}});this.shared.append(this.seek,this.seekButton);this.root.append(this.shared);
    this.personal=el('div',null,{className:'yt-personal-controls'});
    this.findButton=el('button','다른 영상 찾기',{type:'button'});this.findButton.onclick=()=>{this.browsing=true;this.update();};
    this.backButton=el('button','함께 보기로 돌아가기',{type:'button'});this.backButton.onclick=()=>{this.browsing=false;this.manualPaused=false;this.update();this.sync(true);};
    this.joinButton=el('button','함께 보기',{type:'button'});this.joinButton.onclick=()=>{this.joined=true;this.blocked=false;this.manualPaused=false;this.error='';this.browsing=false;this.update();this.sync(true);};
    this.leaveButton=el('button','내 시청 종료',{type:'button'});this.leaveButton.onclick=()=>{this.joined=false;this.disposePlayer();this.update();};
    this.muteButton=el('button','내 음소거',{type:'button'});this.muteButton.onclick=()=>{this.muted=!this.muted;this.player?.[this.muted?'mute':'unMute']?.();this.update();};
    this.volumeInput=el('input',null,{type:'range',min:0,max:100,value:this.volume,ariaLabel:'내 음량',title:'내 음량'});this.volumeInput.oninput=()=>{this.volume=+this.volumeInput.value;this.player?.setVolume?.(this.volume);};
    this.personal.append(this.findButton,this.backButton,this.joinButton,this.leaveButton,this.muteButton,this.volumeInput);this.root.append(this.personal);
    this.message=el('p','',{className:'yt-message',role:'status'});this.root.append(this.message);
    this.stage=el('div',null,{className:'yt-stage'});this.root.append(this.stage);
    this.finder=el('div',null,{className:'yt-finder'});const brand=el('div',null,{className:'yt-brand'});brand.append(el('i','▶'),el('strong','YOUTUBE'));this.finder.append(brand);
    this.query=el('input',null,{type:'search',placeholder:'유튜브 영상 검색',ariaLabel:'유튜브 검색어',autocomplete:'off',maxLength:120});this.query.name='youtube-search-query';this.searchButton=el('button','검색',{type:'submit'});
    const search=el('form',null,{className:'yt-search'});search.append(this.query,this.searchButton);search.onsubmit=e=>{e.preventDefault();this.search();};this.finder.append(search);
    this.searchStatus=el('p','',{className:'yt-search-status',role:'status'});this.results=el('div',null,{className:'yt-results'});this.finder.append(this.searchStatus,this.results);this.stage.append(this.finder);
    this.watch=el('div',null,{className:'yt-watch'});this.playerBox=el('div',null,{className:'yt-player-box'});this.watch.append(this.playerBox);this.stage.append(this.watch);
    const note=el('p','광고·네트워크 환경에 따라 재생에 시차가 생길 수 있습니다. 개인 플레이어 조작은 다른 사람에게 전달되지 않습니다.',{className:'yt-sync-note'});this.root.append(note);
    room.root.append(this.root);this.observer=new ResizeObserver(()=>this.fit());this.observer.observe(this.stage);
  }
  get visible(){return this.media?.tab==='youtube'&&!this.browsing&&this.joined&&!document.hidden&&!this.room.root.hidden&&!!this.media.video_id&&this.fits!==false;}
  apply(media){
    const changed=this.media?.generation!==media.generation||this.media?.playback_id!==media.playback_id;
    const advanced=changed||this.media?.version!==media.version;
    this.media=media;
    if(changed){this.error='';this.manualPaused=false;this.blocked=false;if(media.video_id)this.browsing=false;}
    if(!media.video_id)this.disposePlayer();this.update();if(advanced)this.sync(true);
  }
  update(){
    if(this.destroyed)return;const host=this.room.host,video=!!this.media?.video_id;
    this.root.hidden=this.media?.tab!=='youtube';this.link.disabled=this.load.disabled=!host;for(const button of this.results.querySelectorAll('button'))button.disabled=!host;
    this.query.disabled=this.searchButton.disabled=!host||!this.room.me?.user_id||!this.room.state?.youtube_search_enabled;
    if(!this.requestId&&!this.results.children.length)this.searchStatus.textContent=!host?'방장이 영상을 선택하면 함께 볼 수 있습니다.':!this.room.me?.user_id?'로그인한 방장은 검색할 수 있습니다. 링크 붙여넣기도 사용할 수 있습니다.':!this.room.state.youtube_search_enabled?'영상 검색을 준비 중입니다. 위에 유튜브 링크를 붙여넣어 주세요.':'';
    this.shared.hidden=!video||!host;for(const b of this.sharedButtons)b.disabled=!host;this.seek.disabled=this.seekButton.disabled=!host;
    this.personal.hidden=!video;this.findButton.hidden=!host||this.browsing;this.backButton.hidden=!this.browsing;this.joinButton.hidden=this.joined&&!this.blocked&&!this.manualPaused&&!this.error;
    this.leaveButton.hidden=!this.joined;this.muteButton.textContent=this.muted?'내 음소거 해제':'내 음소거';
    this.finder.hidden=video&&!this.browsing;this.watch.hidden=!video||this.browsing||!this.joined;
    this.message.textContent=this.error||(!this.joined&&video?'시청을 종료했습니다. 함께 보기를 누르면 현재 위치로 돌아갑니다.':this.blocked?'자동재생이 차단되었습니다. 함께 보기 버튼을 눌러 주세요.':this.manualPaused?'개인 재생을 멈췄습니다. 함께 보기로 다시 맞출 수 있습니다.':video?(this.media.status==='playing'?'함께 재생 중':'공용 영상 일시정지'):'');
    this.message.hidden=!this.message.textContent;
    if(this.visible){this.ensurePlayer();this.startSync();}else{this.pausePersonal();this.stopSync();}
    requestAnimationFrame(()=>this.fit());
  }
  previewLink(){if(!this.room.host)return;const id=parseVideoLink(this.link.value);if(!id){this.room.notice('youtube.com/watch 또는 youtu.be 영상 링크를 입력하세요.');return;}
    this.requestId=null;this.browsing=true;this.results.replaceChildren();this.searchStatus.textContent='영상을 확인한 뒤 함께 재생을 눌러 주세요.';this.result({id,title:'선택한 YouTube 영상',channel:'youtube.com · '+id});this.update();
  }
  search(){if(!this.room.host||this.query.disabled)return;const q=this.query.value.trim();if(!q)return;this.browsing=true;this.requestId=crypto.randomUUID();this.results.replaceChildren();this.searchStatus.textContent='검색 중…';this.room.send({type:'youtube_search',q,request_id:this.requestId,generation:this.media.generation});this.update();}
  receive(data){if(data.request_id!==this.requestId)return;this.requestId=null;
    if(data.type==='error'){this.searchStatus.textContent=data.message;return;}
    if(data.generation!==this.media?.generation)return;
    this.results.replaceChildren();for(const item of data.items)this.result(item);this.searchStatus.textContent=data.items.length?'함께 볼 영상을 선택하세요.':'검색 결과가 없습니다. 영상 링크도 사용할 수 있습니다.';
  }
  result(item){
    const card=el('article',null,{className:'yt-result'}),image=el('img',null,{src:'https://i.ytimg.com/vi/'+item.id+'/mqdefault.jpg',alt:'영상 썸네일',loading:'lazy',referrerPolicy:'strict-origin-when-cross-origin'});
    const info=el('div');info.append(el('strong',item.title),el('span',item.channel));const open=el('a','YouTube에서 확인',{href:'https://www.youtube.com/watch?v='+item.id,target:'_blank',rel:'noopener noreferrer'});info.append(open);
    const play=el('button','함께 재생',{type:'button'});play.disabled=!this.room.host;play.onclick=()=>{if(!this.room.host)return;this.room.mediaCommand('select',{video_id:item.id});};card.append(image,info,play);this.results.append(card);
  }
  seekTo(){const position=parseTime(this.seek.value);if(position===null){this.room.notice('이동할 시간을 초 또는 분:초 형식으로 입력하세요.');return;}this.room.mediaCommand('seek',{position});}
  async ensurePlayer(){
    if(this.player||this.creating||!this.visible||this.error||this.destroyed)return;
    this.fit();if(!this.fits)return;
    this.creating=true;const generation=++this.generation;this.apiAbort=new AbortController();
    try{const YT=await loadAPI(this.apiAbort.signal);if(this.destroyed||generation!==this.generation||!this.visible)return;
      const target=el('div');this.playerBox.replaceChildren(target);
      this.player=new YT.Player(target,{width:'100%',height:'100%',videoId:this.media.video_id,playerVars:{playsinline:1,controls:1,origin:location.origin,rel:0},events:{
        onReady:e=>{if(this.destroyed||generation!==this.generation){e.target.destroy();return;}this.ready=true;e.target.setVolume(this.volume);if(this.muted)e.target.mute();this.sync(true);this.fit();},
        onStateChange:e=>{if(this.destroyed||generation!==this.generation)return;this.buffering=e.data===3;if(e.data===2&&Date.now()>this.applyingUntil&&this.visible){this.manualPaused=true;this.update();}if(e.data===1){clearTimeout(this.autoplayTimer);const update=this.blocked||this.manualPaused;this.blocked=false;this.manualPaused=false;if(update)this.update();}},
        onAutoplayBlocked:()=>{if(this.destroyed)return;this.blocked=true;this.update();},
        onError:e=>{if(this.destroyed)return;this.error=({2:'영상 주소가 올바르지 않습니다.',5:'이 브라우저에서 영상을 재생하지 못했습니다.',100:'비공개이거나 삭제된 영상입니다.',101:'외부 재생이 허용되지 않는 영상입니다.',150:'외부 재생이 허용되지 않는 영상입니다.',153:'유튜브가 이 페이지의 재생 요청을 확인하지 못했습니다.'})[e.data]||'유튜브 재생 중 오류가 발생했습니다.';this.stopSync();this.update();}
      }});
      this.player.getIframe()?.setAttribute('referrerpolicy','strict-origin-when-cross-origin');
    }catch{if(!this.destroyed&&generation===this.generation){this.error='유튜브 플레이어에 연결하지 못했습니다. 함께 보기로 다시 시도해 주세요.';this.update();}}
    finally{if(generation===this.generation)this.creating=false;}
  }
  sync(force=false){
    if(!this.ready||!this.player||!this.visible||this.error||this.blocked||this.manualPaused)return;
    const state=this.media;let target=videoPosition(state,Date.now()+this.room.serverOffset),duration=this.player.getDuration?.()||0;
    if(duration>0)target=Math.min(target,Math.max(0,duration-.25));
    const round=state.generation+':'+state.playback_id;
    if(this.round!==round){this.round=round;this.applyingUntil=Date.now()+2500;
      this.player[state.status==='playing'?'loadVideoById':'cueVideoById']({videoId:state.video_id,startSeconds:target});if(state.status==='playing')this.checkAutoplay();return;
    }
    if(force){this.applyingUntil=Date.now()+2500;if(Math.abs((this.player.getCurrentTime?.()||0)-target)>1)this.player.seekTo(target,true);this.player[state.status==='playing'?'playVideo':'pauseVideo']();if(state.status==='playing')this.checkAutoplay();return;}
    // No server report. Never repeatedly seek a paused, buffering or ad-diverted player.
    const playing=this.player.getPlayerState?.()===1,video=this.player.getVideoData?.().video_id;
    if(state.status!=='playing'||!playing||this.buffering||video&&video!==state.video_id||Date.now()-(this.correctedAt||0)<20000)return;
    if(Math.abs((this.player.getCurrentTime?.()||0)-target)>4){this.applyingUntil=Date.now()+2500;this.correctedAt=Date.now();this.player.seekTo(target,true);}
  }
  checkAutoplay(){clearTimeout(this.autoplayTimer);this.autoplayTimer=setTimeout(()=>{if(this.visible&&this.media?.status==='playing'&&[-1,2,5].includes(this.player?.getPlayerState?.())){this.blocked=true;this.update();}},4000);}
  pausePersonal(){clearTimeout(this.autoplayTimer);if(this.ready){this.applyingUntil=Date.now()+2500;this.player?.pauseVideo?.();}}
  startSync(){if(!this.syncTimer&&this.visible&&!this.error&&!this.manualPaused&&!this.blocked)this.syncTimer=setInterval(()=>this.sync(),10000);}
  stopSync(){clearInterval(this.syncTimer);this.syncTimer=null;}
  visibility(){if(!document.hidden){this.update();this.sync(true);}else{this.pausePersonal();this.stopSync();}}
  fit(){
    if(this.destroyed||this.root.hidden||this.watch.hidden)return;const r=this.watch.getBoundingClientRect();
    const holes=(this.room.screenHoles||[]).map(h=>[h[0]-r.left,h[1]-r.top,h[2]-r.left,h[3]-r.top]);
    const box=safeVideoRect(r.width,r.height,holes);this.fits=!!box;this.playerBox.hidden=!box;
    if(!box){this.pausePersonal();this.message.textContent='채팅·시세 창을 접거나 화면을 넓히면 영상을 볼 수 있습니다.';this.message.hidden=false;return;}
    Object.assign(this.playerBox.style,{left:box.x+'px',top:box.y+'px',width:box.width+'px',height:box.height+'px'});
    if(this.visible&&!this.player&&!this.creating&&!this.error)queueMicrotask(()=>this.ensurePlayer());
  }
  disposePlayer(){this.generation++;this.apiAbort?.abort();this.creating=false;this.stopSync();this.pausePersonal();this.player?.destroy?.();this.player=null;this.ready=false;this.round='';this.playerBox.replaceChildren();}
  destroy(){this.destroyed=true;this.disposePlayer();this.observer.disconnect();this.root.remove();}
}
