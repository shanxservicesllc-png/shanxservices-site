"use strict";
/* X13 MONSTER volunteer compute: browser client. First-use one-click consent;
   later visits auto-start at 75% safe-device cap until Stop/revoke. */
(function(){
const $=id=>document.getElementById(id);
const savedKey="x13-volunteer-consent-v1";
const mobile=Boolean(navigator.userAgentData?.mobile||/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
const lowRam=typeof navigator.deviceMemory==="number"&&navigator.deviceMemory<=2;
const cap=lowRam?10:mobile?15:30;
let enabled=false,generation=0,controller=null,activeWorker=null,jobReject=null,endpoint="",jobs=0,records=0,battery=null;
let configMode="MONSTER";
let activeSince=0,lastElapsed=0;
function clock(ms){
 const sec=Math.floor(ms/1000),h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),r=sec%60;
 return [h,m,r].map(x=>String(x).padStart(2,"0")).join(":");
}
function tick(){
 const ms=activeSince?Math.max(0,Date.now()-activeSince):lastElapsed;
 $("uptime").textContent=clock(ms);
}
setInterval(tick,1000);
document.addEventListener("visibilitychange",tick);
const volunteerSession=crypto.randomUUID();
let lastHeartbeat=0;
async function pulse(){
 if(Date.now()-lastHeartbeat<10000)return;
 const p=await json("/api/heartbeat",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({session:volunteerSession,kind:"browser",power:Number(power.value)})});
 lastHeartbeat=Date.now();
 $("connection").textContent="Connected";
 $("online").textContent=String(Number(p.connectedWorkers||1));
}
function getSaved(){try{return localStorage.getItem(savedKey)==="enabled";}catch{return false;}}
function setSaved(value){try{if(value)localStorage.setItem(savedKey,"enabled");else localStorage.removeItem(savedKey);}catch{}}
const power=$("power"),start=$("start"),stop=$("stop"),status=$("status");
function actualDuty(){return Math.round(cap*Number(power.value)/100);}
function viewSlider(){
 $("powerLabel").textContent=power.value+"%";
 $("capLabel").textContent="75% slider default. 100% slider is capped at approximately "+cap+
 "% duty cycle of ONE browser CPU thread on this "+(mobile?"phone":"computer")+
 ". Currently "+actualDuty()+"%; this does not measure total CPU/GPU load or temperature.";
 start.disabled=enabled||actualDuty()===0;stop.disabled=!enabled;
}
function setStatus(message,live=false){status.textContent=message;status.dataset.state=live?"running":"idle";}
function updateConsent(){const granted=getSaved();$("permissionNote").textContent=granted?
 "Auto-start enabled. Stop to disable.": "Tap Start to allow contributions.";
}
power.addEventListener("input",()=>{viewSlider();if(enabled&&actualDuty()<=0)stopNow("Slider set to 0%, stopped.",true);});
async function json(path,options={}){
 if(!endpoint)throw Error("MONSTER HTTPS endpoint not configured");
 controller=new AbortController();
 const r=await fetch(endpoint+path,{cache:"no-store",credentials:"omit",signal:controller.signal,...options});
 const result=await r.json();controller=null;
 if(!r.ok)throw Error(result.error||("MONSTER HTTP "+r.status));
 return result;
}
function cancelInFlight(){
 try{controller?.abort()}catch{}controller=null;
 try{activeWorker?.terminate()}catch{}activeWorker=null;
 if(jobReject){jobReject(Error("Stopped"));jobReject=null;}
}
function stopNow(message="Stopped by volunteer.",revoke=true){
 enabled=false;generation++;if(activeSince){lastElapsed=Math.max(0,Date.now()-activeSince);activeSince=0;tick();}cancelInFlight();
 if(endpoint)fetch(endpoint+"/api/disconnect",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({session:volunteerSession}),keepalive:true}).catch(()=>{});
 if(revoke)setSaved(false);viewSlider();updateConsent();setStatus(message);
}
stop.addEventListener("click",()=>stopNow());
$("revoke").addEventListener("click",()=>stopNow("Permission removed. This browser will not restart automatically."));
window.addEventListener("pagehide",()=>{enabled=false;generation++;cancelInFlight();});
// Background tabs may be throttled by the OS. Do not deliberately stop on visibilitychange.
function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
async function runTask(task,duty){
 return new Promise((resolve,reject)=>{
  if(!enabled)return reject(Error("Volunteer stopped"));
  jobReject=reject;
  const w=new Worker("./live-worker.js");activeWorker=w;
  const timeout=setTimeout(()=>{w.terminate();if(activeWorker===w)activeWorker=null;jobReject=null;reject(Error("Work item exceeded time cap"));},35000);
  w.onmessage=({data})=>{
   if(data?.type!=="complete"&&data?.type!=="error")return;
   clearTimeout(timeout);w.terminate();if(activeWorker===w)activeWorker=null;jobReject=null;
   if(data.type==="error")reject(Error(data.message||"Worker failed"));
   else resolve(data);
  };
  w.onerror=()=>{clearTimeout(timeout);w.terminate();if(activeWorker===w)activeWorker=null;jobReject=null;reject(Error("Worker JavaScript error"));};
  w.postMessage({type:"run",task,duty});
 });
}
async function showLatest(){
 try{
  const [h,r]=await Promise.all([json("/api/health"),json("/api/rabbitry/latest")]);
  $("monster").textContent=String(h.verified||0);
  $("online").textContent=String(h.connectedWorkers||0);
  if(r?.result?.report){
   const x=r.result.report;
   $("latest").textContent="MONSTER's verified RABBITRY audit: "+x.records+" real citations, "+x.distinctDoi+" distinct DOIs and "+x.possibleDuplicatePairs.length+" potential duplicate pairs.";
  }
  if(h.rabbitryRelevance)$("gpuState").textContent=h.rabbitryRelevance.engine==="webgpu"?"WebGPU":h.rabbitryRelevance.engine==="gles31"?"GPU":"CPU";
 }catch{}
}
async function runLoop(my){
 let failures=0;
 while(enabled&&my===generation){
  if(!navigator.onLine){setStatus("Offline, reconnecting...",false);await wait(3000);continue;}
  if(battery&&!battery.charging&&battery.level<=0.20){
   setStatus("Battery low: paused for device protection.",false);await wait(8000);continue;
  }
  if(actualDuty()<=0){setStatus("Processing slider at zero. Paused.",false);await wait(1800);continue;}
  try{
   const health=await json("/api/health");
   if(!enabled||my!==generation)return;
   $("monster").textContent=String(health.verified||0);
   $("online").textContent=String(health.connectedWorkers||0);
   await pulse();
   setStatus("Connected · checking work",true);
   const response=await json("/api/job?session="+encodeURIComponent(volunteerSession));
   if(!enabled||my!==generation)return;
   if(!response.job){
     failures=0;
     setStatus("Connected · waiting for next job",true);
     await wait(3000);continue;
   }
   const ticket=response.job;
   $("jobType").textContent=ticket.task.type==="rabbitry-citation-audit-v1"?"Citation audit":ticket.task.origin==="rabbitry-relevance-v1"?"Relevance scoring":"Numerical task";
   setStatus("Processing "+ticket.task.type.replace("rabbitry-citation-audit-v1","RABBITRY audit").replace("dot-batch-v1","research scores"),true);
   const completed=await runTask(ticket.task,actualDuty());
   if(!enabled||my!==generation)return;
   const payload={id:ticket.id,lease:ticket.lease,engine:completed.engine||"cpu"};
   if(completed.report)payload.report=completed.report;
   else payload.scores=completed.scores;
   const receipt=await json("/api/result",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
   if(!enabled||my!==generation)return;
   if(!receipt.accepted||!receipt.verified)throw Error("MONSTER did not verify this result");
   jobs++;records+=completed.report?completed.report.records:completed.scores.length;
   $("jobs").textContent=String(jobs);
   $("vectors").textContent=String(records);
   $("monster").textContent=String(health.verified+1);
   $("digest").textContent=receipt.receiptSha256?.slice(0,12)||receipt.jobId.slice(0,12);
   $("latest").textContent=completed.report?"Verified "+completed.report.records+" real RABBITRY citations; "+completed.report.possibleDuplicatePairs.length+" duplicate-review pairs.":(ticket.task.origin==="rabbitry-relevance-v1"?"Verified real RABBITRY relevance scoring across "+completed.scores.length+" citations.":"Verified "+completed.scores.length+" numeric scores.");
   $("gpuState").textContent=completed.engine==="webgpu"?"WebGPU":completed.engine==="gles31"?"GPU":"CPU";
   setStatus("MONSTER verified job · running",true);
   failures=0;await wait(900);
  }catch(e){
   if(!enabled||my!==generation)return;
   failures++;setStatus("Reconnecting ("+failures+"): "+String(e.message||e),false);
   await wait(Math.min(15000,2000+failures*1200));
  }
 }
}
async function startNow(){
 if(enabled||actualDuty()<=0)return;
 enabled=true;generation++;activeSince=Date.now();lastElapsed=0;tick();setSaved(true);updateConsent();viewSlider();
 setStatus("Connecting to MONSTER HTTPS...",false);
 try{
  if(!endpoint){
   const r=await fetch("./endpoint.json",{cache:"no-store"});
   if(!r.ok)throw Error("Backend configuration unavailable");
   const config=await r.json();
   if(!/^https:\/\/[-a-z0-9.]+$/i.test(config.apiBase))throw Error("HTTPS endpoint invalid");
   endpoint=config.apiBase.replace(/\/$/,"");configMode="MONSTER";
   $("connection").textContent="Connecting";
  }
  await showLatest();await runLoop(generation);
 }catch(e){if(enabled)stopNow("Cannot connect: "+String(e.message||e),false);}
}
start.addEventListener("click",startNow);
try{if(typeof navigator.getBattery==="function")navigator.getBattery().then(b=>{battery=b;}).catch(()=>{});}catch{}
const box=$("deviceDetails");
box.addEventListener("toggle",()=>{
 if(!box.open)return;
 const dl=$("metadata");dl.replaceChildren();
 const add=(key,value)=>{const dt=document.createElement("dt"),dd=document.createElement("dd");dt.textContent=key;dd.textContent=String(value||"Unavailable");dl.append(dt,dd);};
 add("Browser",navigator.userAgent);add("Platform",navigator.userAgentData?.platform||navigator.platform);
 add("Mobile",mobile?"Yes":"No");add("Logical cores (estimate)",navigator.hardwareConcurrency);
 add("RAM rounded estimate",navigator.deviceMemory?navigator.deviceMemory+" GB":null);
 add("Screen",screen.width+" × "+screen.height);
 add("Network",navigator.connection?.effectiveType);
 add("WebGPU API available",!!navigator.gpu?"Yes":"No");
 add("Single-thread cap",cap+"% duty cycle target");
});
const modal=$("loopModal"),frame=$("loopFrame");
$("openLoop").addEventListener("click",()=>{if(!frame.getAttribute("src"))frame.src="/x13-loop-box.html";modal.showModal();});
$("closeLoop").addEventListener("click",()=>modal.close());
viewSlider();updateConsent();
if(getSaved()&&actualDuty()>0)startNow();
})();