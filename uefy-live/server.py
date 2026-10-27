"""UEFY LIVE: servidor local leve, sem dependencias externas."""
import http.server,json,secrets,threading,queue,time,os,re
from pathlib import Path
from urllib.parse import urlparse
ROOT=Path(__file__).resolve().parent
PORT=int(os.environ.get('UEFY_PORT','17831'))
ORIGIN=f'http://127.0.0.1:{PORT}'
TOKEN=secrets.token_hex(32)
LOCK=threading.RLock()
CLIENTS=set()
STATE=dict(revision=0,videoId='',mediaUrl='',source='youtube',mode='wait',comment=None,volume=70,muted=False,playing=True,command=0)
DATA=ROOT/'data'
DATA.mkdir(exist_ok=True)
try:
 STATE.update(json.loads((DATA/'state.json').read_text(encoding='utf-8-sig')))
 STATE['mode']='wait'
except (OSError,ValueError):pass
TELEMETRY=dict(status='Sem fonte conectada',time=0,updatedAt=0)
ROUTES={'/':'painel.html','/painel.html':'painel.html','/obs.html':'obs.html','/panel.js':'panel.js','/output.js':'output.js','/common.js':'common.js','/style.css':'style.css','/logo.png':'logo.png','/test.wav':'test.wav'}

def patch(data):
 n=STATE.copy()
 for k in ('playing','muted'):
  if k in data:
   if type(data[k])is not bool:raise ValueError('Controle invalido')
   n[k]=data[k]
 if 'volume'in data:
  if type(data['volume'])not in(int,float)or not 0<=data['volume']<=100:raise ValueError('Volume invalido')
  n['volume']=data['volume']
 if 'videoId'in data:
  if not isinstance(data['videoId'],str)or(data['videoId']and not re.fullmatch(r'[\w-]{11}',data['videoId'],flags=re.ASCII)):raise ValueError('Video invalido')
  n['videoId']=data['videoId']
 for key,values in [('source',('youtube','media','external','test')),('mode',('wait','follow','comment'))]:
  if key in data:
   if data[key]not in values:raise ValueError('Modo ou fonte invalida')
   n[key]=data[key]
 if 'mediaUrl'in data:
  if not isinstance(data['mediaUrl'],str)or(data['mediaUrl']and(urlparse(data['mediaUrl']).scheme!='https'or not urlparse(data['mediaUrl']).netloc)):raise ValueError('Use uma midia HTTPS autorizada')
  n['mediaUrl']=data['mediaUrl']
 if 'comment'in data:
  c=data['comment']
  if c is not None:
   if not isinstance(c,dict)or not isinstance(c.get('text'),str)or not 1<=len(c['text'].strip())<=1000 or not isinstance(c.get('url'),str)or not re.fullmatch(r'https://x\.com/Uefyerryeni/status/\d+',c['url'],flags=re.I)or not isinstance(c.get('reference'),str)or len(c['reference'])>160:raise ValueError('Publicacao invalida')
   c=dict(text=c['text'].strip(),url=c['url'],reference=c['reference'])
  n['comment']=c
 if n['mode']=='comment'and not n['comment']:raise ValueError('Importe uma publicacao primeiro')
 if data.get('command')=='play':n['command']=STATE['command']+1
 n['revision']=STATE['revision']+1
 return n

if not(ROOT/'public/test.wav').exists():
 import wave,math,struct
 with wave.open(str(ROOT/'public/test.wav'),'wb')as w:
  w.setparams((2,2,44100,0,'NONE','not compressed'))
  b=bytearray()
  for i in range(44100*5):
   t=i/44100;a=round(6500*math.sin(2*math.pi*880*t)*min(1,t%1*200)*min(1,max(0,.12-t%1)*200))if t%1<.12 else 0
   b.extend(struct.pack('<hh',a,a))
  w.writeframes(b)
import asyncio
COUNTS={}
async def response(writer,code,data,kind='application/json',cookie=False):
 body=json.dumps(data,ensure_ascii=False).encode('utf-8')if kind=='application/json'else data
 headers=[f'HTTP/1.1 {code} Response',f'Content-Type: {kind}',f'Content-Length: {len(body)}','Cache-Control: no-store','Connection: close','X-Content-Type-Options: nosniff','Referrer-Policy: strict-origin-when-cross-origin']
 if cookie:headers.append(f'Set-Cookie: uefy={TOKEN}; HttpOnly; SameSite=Strict; Path=/')
 writer.write(('\r\n'.join(headers)+'\r\n\r\n').encode()+body)
 await writer.drain()

async def handle(reader,writer):
 global STATE,TELEMETRY
 q=None
 try:
  raw=await asyncio.wait_for(reader.readuntil(b'\r\n\r\n'),5)
  lines=raw.decode('iso-8859-1').split('\r\n');method,target,_=lines[0].split(' ',2)
  headers=dict((a.strip().lower(),b.strip())for a,b in(line.split(':',1)for line in lines[1:]if ':'in line))
  if headers.get('host')!=f'127.0.0.1:{PORT}':return await response(writer,403,dict(error='Host nao autorizado'))
  route=urlparse(target).path;COUNTS[route]=COUNTS.get(route,0)+1
  if method=='GET':
   if route=='/health':return await response(writer,200,dict(app='UEFY LIVE',version='2.0.1',runtime='python',localOnly=True,clients=len(CLIENTS)))
   if route=='/api/status':return await response(writer,200,dict(TELEMETRY,connected=time.time()*1000-TELEMETRY['updatedAt']<6000,clients=len(CLIENTS)))
   if route=='/events':
    if headers.get('origin')not in(None,ORIGIN):return await response(writer,403,dict(error='Origem nao autorizada'))
    if len(CLIENTS)>=24:return await response(writer,429,dict(error='Muitas fontes abertas'))
    q=asyncio.Queue(maxsize=20);CLIENTS.add(q)
    writer.write(b'HTTP/1.1 200 OK\r\nContent-Type: text/event-stream\r\nCache-Control: no-store\r\nConnection: keep-alive\r\n\r\n')
    writer.write(('retry: 1000\nevent: state\ndata: '+json.dumps(STATE,ensure_ascii=False)+'\n\n').encode('utf-8'));await writer.drain()
    while True:
     try:event='event: state\ndata: '+await asyncio.wait_for(q.get(),15)+'\n\n'
     except asyncio.TimeoutError:event=': heartbeat\n\n'
     writer.write(event.encode('utf-8'));await writer.drain()
   if route in ROUTES:
    f=ROUTES[route];p=ROOT/'public'/f
    if f=='logo.png'and not p.exists():p=ROOT.parent/'uefyerryeni-logo.png'
    try:b=p.read_bytes()
    except OSError:return await response(writer,404,dict(error='Arquivo nao encontrado'))
    kind={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.wav':'audio/wav'}.get(p.suffix,'application/octet-stream')
    return await response(writer,200,b,kind,route in('/','/painel.html','/obs.html'))
  elif method=='POST':
   cookies=[x.strip()for x in headers.get('cookie','').split(';')]
   if f'uefy={TOKEN}'not in cookies or headers.get('origin')!=ORIGIN or not headers.get('content-type','').startswith('application/json'):return await response(writer,403,dict(error='Controle permitido apenas na central local'))
   length=int(headers.get('content-length','0'))
   if not 0<length<=20000:raise ValueError('Conteudo muito grande ou vazio')
   data=json.loads(await asyncio.wait_for(reader.readexactly(length),5))
   if not isinstance(data,dict):raise ValueError('Controle invalido')
   if route=='/api/state':
    STATE=patch(data);snapshot=json.dumps(STATE,ensure_ascii=False)
    (DATA/'state.tmp').write_text(snapshot,encoding='utf-8');(DATA/'state.tmp').replace(DATA/'state.json')
    for client in CLIENTS:
     if client.full():client.get_nowait()
     client.put_nowait(snapshot)
    return await response(writer,200,STATE)
   if route=='/api/telemetry':
    TELEMETRY=dict(status=str(data.get('status',''))[:200],time=float(data.get('time',0)),updatedAt=time.time()*1000)
    return await response(writer,200,dict(ok=True))
  await response(writer,404,dict(error='Nao encontrado'))
 except (OSError,ConnectionError,asyncio.IncompleteReadError,asyncio.TimeoutError):pass
 except (ValueError,TypeError,KeyError,asyncio.LimitOverrunError)as e:
  try:await response(writer,400,dict(error=str(e)))
  except OSError:pass
 finally:
  if q is not None:CLIENTS.discard(q)
  writer.close()
  try:await writer.wait_closed()
  except OSError:pass

async def main():
 server=await asyncio.start_server(handle,'127.0.0.1',PORT,limit=20000)
 print(f'UEFY LIVE: {ORIGIN}/painel.html',flush=True)
 async with server:await server.serve_forever()
asyncio.run(main())
