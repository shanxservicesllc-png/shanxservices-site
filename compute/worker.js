'use strict';
// X13 volunteer compute browser pilot: local-only arithmetic, no network or persistence.
let active=false,timer=null,duty=5,operations=0,checksum=0;
function tick(){
  if(!active)return;
  const start=performance.now(),budget=10;
  while(active&&performance.now()-start<budget){
    const n=(operations%100003)+2;
    checksum=(checksum+((n*2654435761)>>>0))>>>0;
    operations++;
  }
  postMessage({type:'progress',operations,checksum});
  timer=setTimeout(tick,Math.max(25,Math.round(budget*(100/duty-1))));
}
onmessage=({data})=>{
  if(data?.type==='stop'){active=false;clearTimeout(timer);timer=null;postMessage({type:'stopped',operations});}
  else if(data?.type==='start'&&!active){
    duty=[2,5,10].includes(Number(data.duty))?Number(data.duty):5;
    operations=0;checksum=0;active=true;
    postMessage({type:'started',duty});tick();
  }
};