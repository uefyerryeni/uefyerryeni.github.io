import http from 'node:http';
import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
const root=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.UEFY_PORT||17831), origin=`http://127.0.0.1:${port}`;
const cookie=randomBytes(32).toString('hex'), clients=new Set();
const initial={revision:0,videoId:'',mediaUrl:'',source:'youtube',mode:'wait',comment:null,volume:70,muted:false,playing:true,command:0};
await mkdir(path.join(root,'data'),{recursive:true});
const tonePath=path.join(root,'public/test.wav');
try{await readFile(tonePath);}catch{const b=Buffer.alloc(44+44100*5*4);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(2,22);b.writeUInt32LE(44100,24);b.writeUInt32LE(176400,28);b.writeUInt16LE(4,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(b.length-44,40);for(let i=0;i<44100*5;i++){const t=i/44100,a=t%1<.12?Math.round(6500*Math.sin(2*Math.PI*880*t)*Math.min(1,t%1*200)*Math.min(1,Math.max(0,.12-t%1)*200)):0;b.writeInt16LE(a,44+i*4);b.writeInt16LE(a,46+i*4);}await writeFile(tonePath,b);}
let state={...initial};
try{state={...initial,...JSON.parse(await readFile(path.join(root,'data/state.json'),'utf8')),mode:'wait'};}catch{}
let telemetry={status:'Sem fonte conectada',time:0,updatedAt:0}, save=Promise.resolve();
const send=(res,code,data,type='application/json')=>{res.writeHead(code,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'});res.end(type==='application/json'?JSON.stringify(data):data);};
function authorized(req){return (req.headers.cookie||'').split(';').some(c=>c.trim()===`uefy=${cookie}`)&&req.headers.origin===origin;}
function fanout(){for(const c of clients)c.write(`event: state\ndata: ${JSON.stringify(state)}\n\n`);}
async function json(req){let b='';for await(const chunk of req){b+=chunk;if(b.length>20000)throw Error('Conteúdo muito grande');}return JSON.parse(b);}
function patch(data){
 const next={...state};
 for(const k of ['playing','muted'])if(k in data){if(typeof data[k]!=='boolean')throw Error('Controle inválido');next[k]=data[k];}
 if('volume'in data){if(!Number.isFinite(data.volume)||data.volume<0||data.volume>100)throw Error('Volume inválido');next.volume=data.volume;}
 if('videoId'in data){if(data.videoId!==''&&!/^[\w-]{11}$/.test(data.videoId))throw Error('Vídeo inválido');next.videoId=data.videoId;}
 if('source'in data){if(!['youtube','media','external','test'].includes(data.source))throw Error('Fonte inválida');next.source=data.source;}
 if('mediaUrl'in data){if(data.mediaUrl){const u=new URL(data.mediaUrl);if(u.protocol!=='https:')throw Error('Use uma mídia HTTPS autorizada');}next.mediaUrl=data.mediaUrl;}
 if('mode'in data){if(!['wait','follow','comment'].includes(data.mode))throw Error('Modo inválido');next.mode=data.mode;}
 if('comment'in data){const c=data.comment;if(c!==null&&(!c||typeof c.text!=='string'||!c.text.trim()||c.text.length>1000||typeof c.url!=='string'||!/^https:\/\/x\.com\/Uefyerryeni\/status\/\d+$/i.test(c.url)||typeof c.reference!=='string'||c.reference.length>160))throw Error('Publicação inválida');next.comment=c?{text:c.text.trim(),url:c.url,reference:c.reference}:null;}
 if(next.mode==='comment'&&!next.comment)throw Error('Importe uma publicação primeiro');
 if(data.command==='play')next.command=state.command+1;
 return {...next,revision:state.revision+1};
}
const server=http.createServer(async(req,res)=>{
 try{
 if(req.headers.host!==`127.0.0.1:${port}`)return send(res,403,{error:'Host não autorizado'});
 const u=new URL(req.url,origin);
 if(req.method==='GET'&&u.pathname==='/health')return send(res,200,{app:'UEFY LIVE',version:'2.0.0',localOnly:true});
 if(req.method==='GET'&&u.pathname==='/events'){
  if(req.headers.origin&&req.headers.origin!==origin)return send(res,403,{error:'Origem não autorizada'});
  res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write(`retry: 1000\nevent: state\ndata: ${JSON.stringify(state)}\n\n`);clients.add(res);req.on('close',()=>clients.delete(res));return;
 }
 if(req.method==='POST'){
  if(!authorized(req)||!String(req.headers['content-type']).startsWith('application/json'))return send(res,403,{error:'Controle permitido apenas na central local'});
  const data=await json(req);
  if(u.pathname==='/api/state'){state=patch(data);const snapshot=JSON.stringify(state,null,2);save=save.then(async()=>{await writeFile(path.join(root,'data/state.tmp'),snapshot);await rename(path.join(root,'data/state.tmp'),path.join(root,'data/state.json'));}).catch(()=>{});fanout();return send(res,200,state);}
  if(u.pathname==='/api/telemetry'){telemetry={status:String(data.status||'').slice(0,200),time:Number(data.time)||0,updatedAt:Date.now()};return send(res,200,{ok:true});}
 }
 if(req.method==='GET'&&u.pathname==='/api/status')return send(res,200,{...telemetry,connected:Date.now()-telemetry.updatedAt<6000,clients:clients.size});
 const routes={'/':'painel.html','/painel.html':'painel.html','/obs.html':'obs.html','/panel.js':'panel.js','/output.js':'output.js','/common.js':'common.js','/style.css':'style.css','/logo.png':'logo.png','/test.wav':'test.wav'};
 if(req.method==='GET'&&routes[u.pathname]){
  if(['/','/painel.html','/obs.html'].includes(u.pathname))res.setHeader('Set-Cookie',`uefy=${cookie}; HttpOnly; SameSite=Strict; Path=/`);
  const file=routes[u.pathname],type=file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':file.endsWith('.wav')?'audio/wav':'image/png';
  return send(res,200,await readFile(path.join(root,'public',file)).catch(async e=>{if(file==='logo.png')return readFile(path.join(root,'../uefyerryeni-logo.png'));throw e;}),type);
 }
 send(res,404,{error:'Não encontrado'});
 }catch(e){send(res,400,{error:e.message});}
});
const heartbeat=setInterval(()=>{for(const c of clients)c.write(': heartbeat\n\n');},15000);heartbeat.unref();
server.listen(port,'127.0.0.1',()=>console.log(`UEFY LIVE v2 — ${origin}/painel.html`));
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'A central já está aberta na porta 17831.':e.message);process.exitCode=1;});
