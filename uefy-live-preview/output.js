const openState=()=>{};const api=()=>Promise.resolve({});
const params=new URLSearchParams(location.search);
const demo=true;if(!params.has('clean'))params.set('sim','1');
const preview=params.has('preview')||demo;
const $=id=>document.getElementById(id);
let state=null,identity='',yt=null,ready=false,lastCommand=-1,status='Aguardando sinal',error='',parts=[],partIndex=0,commentKey='',rotateAt=0,pageStarted=0,pageDuration=7000;
function testToneUrl(){
 const rate=44100,frames=rate*5,buf=new ArrayBuffer(44+frames*4),view=new DataView(buf);
 const ascii=(offset,s)=>{for(let i=0;i<s.length;i++)view.setUint8(offset+i,s.charCodeAt(i));};
 ascii(0,'RIFF');view.setUint32(4,36+frames*4,true);ascii(8,'WAVE');ascii(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);view.setUint32(24,rate,true);view.setUint32(28,rate*4,true);view.setUint16(32,4,true);view.setUint16(34,16,true);ascii(36,'data');view.setUint32(40,frames*4,true);
 for(let i=0;i<frames;i++){const t=i/rate,p=t%1,a=p<.12?Math.round(6500*Math.sin(2*Math.PI*880*t)*Math.min(1,p*200)*Math.min(1,Math.max(0,.12-p)*200)):0;view.setInt16(44+i*4,a,true);view.setInt16(46+i*4,a,true);}
 return URL.createObjectURL(new Blob([buf],{type:'audio/wav'}));
}

const media=$('media-player'),testAudio=new Audio();testAudio.loop=true;
function scale(){
 const factor=Math.min(innerWidth/1080,innerHeight/1920);
 $('canvas').style.transform='translate('+((innerWidth-1080*factor)/2)+'px,'+((innerHeight-1920*factor)/2)+'px) scale('+factor+')';
}
addEventListener('resize',scale);scale();
let lastTelemetry=0;function telemetry(){if(Date.now()-lastTelemetry<10000)return;lastTelemetry=Date.now();if(!preview)api('/api/telemetry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:state?.mode==='wait'?'Tela de espera · áudio silenciado':status,time:state?.source==='youtube'&&ready?yt.getCurrentTime():state?.source==='test'?testAudio.currentTime:media.currentTime||0})}).catch(()=>{});}
function sound(){if(!state)return;const mute=state.muted||state.mode==='wait';if(ready&&yt){yt.setVolume(state.volume);mute?yt.mute():yt.unMute();}media.volume=state.volume/100;media.muted=mute;testAudio.volume=state.volume/100;testAudio.muted=mute;}
function playing(force=false){if(!state||preview)return;sound();if(ready&&state.source==='youtube'){if(state.playing&&(force||yt.getPlayerState()===2))yt.playVideo();else if(!state.playing)yt.pauseVideo();}for(const [a,active]of [[media,state.source==='media'],[testAudio,state.source==='test']]){if(active&&state.playing)a.play().catch(()=>{status='Autoplay bloqueado: Interagir na fonte e clicar em reproduzir';telemetry();});else a.pause();}}
function loadPlayer(){if(preview||!state)return;const next=state.source+'|'+(state.source==='youtube'?state.videoId:state.source==='media'?state.mediaUrl:'');if(next===identity)return;identity=next;error='';ready=false;if(yt){yt.destroy();yt=null;}if(!$('player')){const d=document.createElement('div');d.id='player';$('video-region').prepend(d);}media.pause();testAudio.pause();media.removeAttribute('src');media.style.display='none';$('test-image').style.display='none';
 if(state.source==='youtube'&&state.videoId){status='Carregando YouTube…';if(!window.YT?.Player){identity='';return;}yt=new YT.Player('player',{width:900,height:506,videoId:state.videoId,playerVars:{autoplay:1,playsinline:1,controls:1,rel:0,origin:location.origin},events:{onReady:()=>{ready=true;yt.getIframe().setAttribute('referrerpolicy','strict-origin-when-cross-origin');playing(true);telemetry();},onStateChange:e=>{status=({1:'YouTube reproduzindo',2:'YouTube pausado',3:'YouTube carregando',0:'Vídeo encerrado',5:'YouTube pronto'})[e.data]||'YouTube aguardando reprodução';if(e.data===1)error='';renderCover();telemetry();},onError:e=>{const errors={2:'Link inválido',5:'Falha do player HTML5',100:'Vídeo removido ou privado',101:'Canal não autoriza incorporação',150:'Canal não autoriza incorporação',153:'YouTube não reconheceu a identificação do player'};error=errors[e.data]||'YouTube indisponível ('+e.data+')';status=error;renderCover();telemetry();},onAutoplayBlocked:()=>{status='Autoplay bloqueado: use Interagir na fonte para iniciar o vídeo';telemetry();}}});}
 else if(state.source==='media'){media.src=state.mediaUrl;media.style.display='block';status='Carregando mídia autorizada…';playing(true);}
 else if(state.source==='test'){if(!testAudio.src)testAudio.src=testToneUrl();$('test-image').style.display='flex';testAudio.currentTime=0;status='Teste local de imagem e pulso sonoro';playing(true);}
 else status=state.source==='external'?'Fonte de mídia externa do OBS (confira no mixer)':'Aguardando link do vídeo';
 renderCover();
}
function renderCover(){if(!state)return;const show=state.mode==='wait'||!!error||(state.source==='youtube'&&!state.videoId)||(state.source==='media'&&!state.mediaUrl);$('cover').style.display=show?'flex':'none';$('cover-note').textContent=error?error+'. Use um sinal autorizado em Alternativas.':'A transmissão começa em instantes.';$('preview-video').style.display=preview&&!show?'block':'none';}
function makePages(text){
 const el=$('comment-text'), result=[];
 el.style.removeProperty('font-size');
 let remaining=text.trim();
 while(remaining){
  const chars=Array.from(remaining);
  let low=1,high=Math.min(700,chars.length),fit=1;
  while(low<=high){
   const mid=Math.floor((low+high)/2);
   el.textContent=chars.slice(0,mid).join('');
   if(el.scrollHeight<=el.clientHeight+1){fit=mid;low=mid+1;}else high=mid-1;
  }
  let cut=fit;
  if(fit<chars.length){
   const candidate=chars.slice(0,fit).join('');
   const last=Math.max(candidate.lastIndexOf(' '),candidate.lastIndexOf('\n'));
   if(last>candidate.length*.55)cut=Array.from(candidate.slice(0,last)).length;
  }
  result.push(chars.slice(0,cut).join('').trim());
  remaining=chars.slice(cut).join('').trimStart();
 }
 return result.length?result:[''];
}
function page(){
 if(!state||state.mode!=='comment')return;
 $('comment-text').textContent=parts[partIndex]||'';
 $('pagination').textContent=parts.length>1?(partIndex+1)+' / '+parts.length:'';
 pageDuration=Math.max(9000,Array.from(parts[partIndex]||'').length/11*1000);pageStarted=Date.now();rotateAt=pageStarted+pageDuration;
}
function render(next){const previous=state;state=next;document.body.classList.toggle('overlay',state.source==='external');$('badge').textContent=state.mode==='wait'?'EM ESPERA':state.source==='test'?'TESTE TÉCNICO':'ACOMPANHANDO';$('kind').textContent=state.mode==='comment'?'COMENTÁRIO DA UEFY / X':'ACOMPANHAMENTO';$('post').style.display=state.mode==='comment'?'grid':'none';$('notice').style.display=state.mode==='comment'?'none':'block';const key=JSON.stringify(state.comment);if(key!==commentKey||previous?.mode!==state.mode){commentKey=key;parts=makePages(state.comment?.text||'');partIndex=0;page();}if(state.comment){$('post-reference').textContent=state.comment.reference.length>20?'Publicado no X':state.comment.reference;$('post-reference').title=state.comment.reference;$('post-link').textContent='Ver no X ↗';$('post-link').title=state.comment.url;}if(state.mode!=='comment')$('pagination').textContent='';loadPlayer();if(previous?.playing!==state.playing||lastCommand!==state.command){lastCommand=state.command;playing(true);}sound();renderCover();}
media.addEventListener('playing',()=>{status='Mídia autorizada reproduzindo';});media.addEventListener('error',()=>{error='Formato ou endereço de mídia indisponível';status=error;renderCover();});
if(!demo)openState(render,()=>{status='Conexão com o painel interrompida; mantendo o último conteúdo';});
if(!preview){window.onYouTubeIframeAPIReady=()=>{identity='';loadPlayer();};const s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';document.head.append(s);}
setInterval(()=>{if(parts.length>1&&Date.now()>rotateAt&&state?.mode==='comment'){partIndex=(partIndex+1)%parts.length;page();}},250);
setInterval(telemetry,1000);
function animate(){if($('reading-progress'))$('reading-progress').style.transform='scaleX('+Math.max(0,1-(Date.now()-pageStarted)/pageDuration)+')';if(state?.source==='test'){$('test-counter').textContent=String(Math.floor(testAudio.currentTime)%5+1);$('test-counter').style.background=testAudio.currentTime%1<.13?'#fffdf0':'#141414';}requestAnimationFrame(animate);}requestAnimationFrame(animate);

document.body.classList.toggle('preview',preview);
function previewOptions(options){
 document.body.classList.toggle('simulate',preview&&!!options.simulate);
 document.body.classList.toggle('show-guides',preview&&!!options.guides);
}
previewOptions({simulate:params.has('sim'),guides:params.has('guides')});
addEventListener('message',event=>{
 if(preview&&event.origin===location.origin&&event.source===parent&&event.data?.type==='uefy-preview-config')previewOptions(event.data);
});
if(demo){
 $('preview-video').innerHTML='<div class="demo-frame"><svg viewBox="0 0 900 506.25" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><defs><pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0H0V50" fill="none" stroke="#141414" stroke-opacity=".10"/></pattern></defs><rect width="900" height="506.25" fill="url(#grid)"/><rect x="2" y="2" width="896" height="502.25" fill="none" stroke="#141414" stroke-width="4"/><circle cx="450" cy="253.125" r="155" fill="#f4dd19" stroke="#141414" stroke-width="4"/><path d="M0 253.125H900M450 0V506.25" stroke="#141414" stroke-opacity=".2"/></svg><strong>VÍDEO 16:9</strong><small>Amostra de enquadramento</small></div>';
 render({revision:0,source:'youtube',videoId:'M7lc1UVf-VE',mediaUrl:'',mode:'comment',volume:0,muted:true,playing:false,command:0,comment:{text:'A universidade precisa de propostas que possam ser acompanhadas pela comunidade. No debate da Reitoria da UFRN, vamos observar os compromissos com a permanência estudantil, a pesquisa e as condições de trabalho. Publicações longas continuam nas próximas páginas, com tempo para ler e sem diminuir demais as letras.',reference:'Prévia de demonstração',url:'https://x.com/Uefyerryeni/status/1'}});
}
