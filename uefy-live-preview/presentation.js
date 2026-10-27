export const DEFAULT_COMMENT_SECONDS=60;
export const PARTICIPATION_HASHTAG='#DebateReitoriaUFRN';
export function slideDurationMs(slide){
 return slide?.type==='photo'?10000:Math.max(9000,Array.from(slide?.text||'').length/11*1000);
}
export function presentationAt(mode,slides,startedAt,minimumSeconds=DEFAULT_COMMENT_SECONDS,now=Date.now()){
 if(mode==='wait')return {phase:'wait',remainingSeconds:0};
 if(mode!=='comment'||!slides.length)return {phase:'participation',remainingSeconds:0};
 const durations=slides.map(slideDurationMs),cycleMs=durations.reduce((a,b)=>a+b,0),lifetimeMs=Math.max(minimumSeconds*1000,cycleMs),expiresAt=startedAt+lifetimeMs;
 if(now>=expiresAt)return {phase:'participation',remainingSeconds:0,expiresAt,lifetimeMs};
 const elapsed=Math.max(0,now-startedAt),cycle=Math.floor(elapsed/cycleMs);
 let within=elapsed%cycleMs,index=0,prefix=0;
 while(index<durations.length-1&&within>=durations[index]){within-=durations[index];prefix+=durations[index];index++;}
 return {phase:'comment',index,slideStart:startedAt+cycle*cycleMs+prefix,slideDuration:durations[index],remainingSeconds:Math.ceil((expiresAt-now)/1000),expiresAt,lifetimeMs};
}
