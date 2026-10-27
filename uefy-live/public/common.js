export function youtubeId(raw){try{const u=new URL(raw.trim());if(!['https:','http:'].includes(u.protocol))return '';const h=u.hostname.toLowerCase().replace(/^(www\.|m\.)/,'');let id='';if(h==='youtu.be')id=u.pathname.split('/')[1];else if(['youtube.com','youtube-nocookie.com'].includes(h)){const p=u.pathname.split('/');id=p[1]==='watch'?u.searchParams.get('v'):['live','embed','shorts'].includes(p[1])?p[2]:'';}return /^[\w-]{11}$/.test(id||'')?id:'';}catch{return '';}}
export function parseEmbed(raw){
 if(raw.length>20000)throw Error('Código muito grande. Cole apenas uma publicação.');
 const d=new DOMParser().parseFromString(raw,'text/html'),q=d.querySelector('blockquote.twitter-tweet'),p=q?.querySelector('p');
 const links=[...(q?.querySelectorAll('a')||[])].map(a=>{try{return {a,u:new URL(a.getAttribute('href'))};}catch{return null;}}).filter(Boolean);
 const own=links.filter(({u})=>['x.com','twitter.com','www.x.com','www.twitter.com'].includes(u.hostname.toLowerCase())&&/^\/Uefyerryeni\/status\/\d+\/?$/i.test(u.pathname));
 if(!p||!own.length)throw Error('Cole a incorporação de uma publicação de @Uefyerryeni. URLs isoladas não contêm o texto.');
 const link=own.at(-1);p.querySelectorAll('script,style,iframe,object').forEach(e=>e.remove());p.querySelectorAll('br').forEach(e=>e.replaceWith('\n'));
 const text=p.textContent.trim();if(!text||text.length>1000)throw Error('O texto deve ter de 1 a 1000 caracteres.');
 return {text,url:'https://x.com/Uefyerryeni/status/'+link.u.pathname.match(/status\/(\d+)/)[1],reference:link.a.textContent.trim().slice(0,160)||'Publicado no X'};
}
export function pages(text,max=360){const out=[];let part='';for(const word of text.split(/\s+/)){if((part+' '+word).trim().length>max&&part){out.push(part);part='';}if(word.length>max){if(part){out.push(part);part='';}for(let i=0;i<word.length;i+=max)out.push(word.slice(i,i+max));}else part+=(part?' ':'')+word;}if(part)out.push(part);return out;}
export async function update(data){const r=await fetch('/api/state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const j=await r.json();if(!r.ok)throw Error(j.error||'Falha de conexão');return j;}
