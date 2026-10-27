import {youtubeId,parseEmbed,update} from './common.js';
const $=id=>document.getElementById(id), feedback=m=>$('feedback').textContent=m;
const run=fn=>async()=>{try{await fn();}catch(e){feedback(e.message);}};
let state={};
const es=new EventSource('/events');
es.addEventListener('state',e=>{state=JSON.parse(e.data);$('connection').textContent='Central conectada · atualização '+state.revision;$('mode').textContent=({wait:'EM ESPERA',follow:'ACOMPANHAMENTO',comment:'COMENTÁRIO NO AR'})[state.mode];if(document.activeElement!==$('volume'))$('volume').value=state.volume;$('level').textContent=state.volume+'%';$('mute').checked=state.muted;if(!$('youtube').value&&state.videoId)$('youtube').value='https://www.youtube.com/watch?v='+state.videoId;});
es.onerror=()=>{$('connection').textContent='Reconectando à central local…';};
$('load').onclick=run(async()=>{const id=youtubeId($('youtube').value);if(!id)throw Error('Cole um link válido do YouTube.');await update({videoId:id,source:'youtube',playing:true,mode:'follow',command:'play'});feedback('Sinal enviado ao OBS. Aguarde a confirmação do player.');});
$('play').onclick=run(()=>update({playing:true,command:'play'}));$('pause').onclick=run(()=>update({playing:false}));
$('volume').oninput=()=>{$('level').textContent=$('volume').value+'%';};$('volume').onchange=run(()=>update({volume:Number($('volume').value)}));$('mute').onchange=run(()=>update({muted:$('mute').checked}));
$('extract').onclick=run(()=>{const c=parseEmbed($('embed').value);$('message').value=c.text;$('reference').value=c.reference;$('posturl').value=c.url;feedback('Publicação importada. Confira o texto e clique em Exibir comentário.');});
$('example').onclick=()=>{$('embed').value='<blockquote class="twitter-tweet"><p>TESTE TÉCNICO — A Uefy acompanha o debate da Reitoria UFRN. Este é um comentário de demonstração, sem checagem de fatos.</p>— Uefy (@Uefyerryeni) <a href="https://x.com/Uefyerryeni/status/1">Demonstração · não é uma publicação real</a></blockquote>';$('extract').click();};
$('publish').onclick=run(async()=>{await update({mode:'comment',comment:{text:$('message').value,url:$('posturl').value,reference:$('reference').value}});feedback('Comentário no ar. O vídeo continua no mesmo player.');});
$('follow').onclick=run(async()=>{await update({mode:'follow'});feedback('Comentário retirado.');});$('wait').onclick=run(async()=>{await update({mode:'wait'});feedback('Tela de espera ativa; áudio silenciado sem descarregar o vídeo.');});
$('media-load').onclick=run(async()=>{const u=new URL($('media').value);if(u.protocol!=='https:')throw Error('Use uma mídia HTTPS autorizada.');await update({source:'media',mediaUrl:u.href,playing:true,mode:'follow',command:'play'});feedback('Mídia enviada ao OBS.');});
$('external').onclick=run(async()=>{await update({source:'external',mode:'follow'});feedback('Janela transparente ativa. Use somente um sinal autorizado na Fonte de mídia abaixo da composição. Controle o áudio dessa fonte no mixer do OBS.');});
$('test').onclick=run(async()=>{await update({source:'test',playing:true,mode:'follow',command:'play'});feedback('Teste local de imagem e áudio ativo. Não é uma transmissão pública.');});
$('copy').onclick=run(async()=>{await navigator.clipboard.writeText(location.origin+'/obs.html');feedback('Endereço da fonte copiado.');});
setInterval(async()=>{try{const r=await fetch('/api/status');const j=await r.json();$('player-status').textContent=j.connected?j.status+' · '+j.time.toFixed(1)+'s':'Fonte do OBS desconectada ou sem resposta. Abra a fonte Navegador.';}catch{}},2000);
new ResizeObserver(()=>{$('preview').style.transform='scale('+document.querySelector('.phone').clientWidth/1080+')';}).observe(document.querySelector('.phone'));

function configurePreview(){
 $('preview').contentWindow.postMessage({type:'uefy-preview-config',simulate:$('simulate-instagram').checked,guides:$('show-safe').checked},location.origin);
}
$('simulate-instagram').onchange=configurePreview;
$('show-safe').onchange=configurePreview;
$('preview').addEventListener('load',configurePreview);
