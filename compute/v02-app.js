'use strict';
const $=id=>document.getElementById(id);
const slider=$('power'), label=$('powerLabel'), capLabel=$('capLabel');
const consent=$('consent'), start=$('start'), stop=$('stop'), state=$('status');
const mobile=Boolean(navigator.userAgentData?.mobile || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
const lowMemory=typeof navigator.deviceMemory==='number' && navigator.deviceMemory<=2;
const cap=lowMemory?10:mobile?15:30;
let worker=null, running=false, jobId=0, jobs=0, vectors=0, lastDigest=0, battery=null;
function pct(){return Math.round(Number(slider.value)*cap/100);}
function status(text,live=false){state.textContent=text;state.dataset.state=live?'running':'idle';}
function update(){
  label.textContent=slider.value+'%';
  capLabel.textContent='100% slider = conservative '+cap+'% duty-cycle target of ONE CPU thread ('+(mobile?'mobile':'desktop')+'). Current target: '+pct()+'%. This is not a thermal reading or measured total CPU usage.';
  start.disabled=running || !consent.checked || pct()===0;
  if(worker && pct()>0)worker.postMessage({type:'set-duty',duty:pct()});
}
slider.addEventListener('input',update);
consent.addEventListener('change',update);
function createJob(){
  let seed=(0x9e3779b9 ^ ++jobId)>>>0;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return (seed%21)-10;};
  const query=Array.from({length:32},random);
  const rows=Array.from({length:128},()=>Array.from({length:32},random));
  return {type:'vector-dot-v1',id:jobId,query,rows};
}
function verify(job,scores){
  if(!Array.isArray(scores)||scores.length!==128)return false;
  for(let i=0;i<128;i++){
    let expected=0;
    for(let k=0;k<32;k++)expected+=job.query[k]*job.rows[i][k];
    if(scores[i]!==expected)return false;
  }
  return true;
}
let current=null;
function stopNow(message='Stopped. No processing is running.'){
  running=false;
  if(worker){worker.terminate();worker=null;}
  current=null;stop.disabled=true;update();status(message);
}
function sendJob(){
  if(!running || !worker)return;
  if(mobile&&document.hidden){stopNow('Paused: phone browser in background.');return;}
  if(pct()===0){stopNow('Slider at 0%. Worker stopped.');return;}
  if(battery&&!battery.charging&&battery.level<=0.2){stopNow('Battery at 20% or lower. Worker stopped.');return;}
  current=createJob();
  worker.postMessage({type:'job',job:current});
}
start.addEventListener('click',()=>{
  if(running||!consent.checked||pct()===0)return;
  try {
    worker=new Worker('./v02-worker.js');
    worker.onmessage=({data})=>{
      if(!running||!data)return;
      if(data.type==='ready')sendJob();
      if(data.type==='result'){
        if(!current || data.id!==current.id || !verify(current,data.scores)){
          stopNow('Verification failed. Worker stopped.');return;
        }
        jobs++;vectors+=128;
        lastDigest=data.scores.reduce((a,b)=>(a+Math.imul(b,2654435761))>>>0,0);
        $('jobs').textContent=jobs.toLocaleString();
        $('vectors').textContent=vectors.toLocaleString();
        $('digest').textContent=lastDigest.toString(16).padStart(8,'0');
        status('Working. Last 128-vector result independently verified on this device.',true);
        current=null;
      }
      if(data.type==='error')stopNow('Worker error: '+data.message);
    };
    worker.onerror=()=>stopNow('This browser could not run the compute worker.');
    running=true;start.disabled=true;stop.disabled=false;
    status('Starting voluntary local compute test...',true);
    worker.postMessage({type:'start',duty:pct()});
  }catch(err){stopNow('Worker unavailable: '+String(err.message||err));}
});
stop.addEventListener('click',()=>stopNow());
window.addEventListener('pagehide',()=>stopNow('Page closed: worker ended.'));
// Continue while browser permits background execution; Android may still throttle or suspend.
if(typeof navigator.getBattery==='function')navigator.getBattery().then(b=>{
  battery=b;
  const guard=()=>{if(running&&!b.charging&&b.level<=0.2)stopNow('Low battery: stopped.');};
  b.addEventListener('levelchange',guard);b.addEventListener('chargingchange',guard);
}).catch(()=>{});
const details=$('deviceDetails');
details.addEventListener('toggle',()=>{
  if(!details.open)return;
  const dl=$('metadata');dl.replaceChildren();
  const add=(name,value)=>{
    const dt=document.createElement('dt'),dd=document.createElement('dd');
    dt.textContent=name;dd.textContent=String(value??'Unavailable');dl.append(dt,dd);
  };
  add('Browser',navigator.userAgent);
  add('Platform',navigator.userAgentData?.platform || navigator.platform || 'Unavailable');
  add('Mobile device',mobile?'Yes':'No');
  add('Logical CPU threads (estimate)',navigator.hardwareConcurrency||'Unavailable');
  add('System RAM (rounded/estimated)',navigator.deviceMemory?navigator.deviceMemory+' GB':'Unavailable');
  add('Connection (reported)',navigator.connection?.effectiveType||'Unavailable');
  add('Screen',screen.width+' × '+screen.height);
  add('Browser language',navigator.language||'Unavailable');
  add('Volunteer cap (one thread)',cap+'% duty-cycle target');
  add('Remote job endpoint','None; this is a local-only demo');
});
const loopModal=$('loopModal'),loopFrame=$('loopFrame');
$('openLoop').addEventListener('click',()=>{
  if(!loopFrame.getAttribute('src'))loopFrame.src='/x13-loop-box.html';
  if(typeof loopModal.showModal==='function')loopModal.showModal();
  else loopModal.setAttribute('open','');
});
$('closeLoop').addEventListener('click',()=>{
  if(typeof loopModal.close==='function')loopModal.close();
  else loopModal.removeAttribute('open');
});
// Opening the in-page Loop Box never calls stopNow().
update();