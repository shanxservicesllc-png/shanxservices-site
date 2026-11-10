'use strict';
// X13 local web test v0.2: numerical vector workloads only.
// No network, filesystem access, autostart, persistence or remote instructions.
let running = false;
let percentage = 5;
let timer = null;
let pending = null;
function compute(job) {
  if(!job || job.type !== 'vector-dot-v1' || !Array.isArray(job.query) ||
     job.query.length !== 32 || !job.query.every(n=>Number.isInteger(n)&&Math.abs(n)<=20) ||
     !Array.isArray(job.rows) || job.rows.length !== 128) throw Error('Invalid numerical job');
  const scores = [];
  for(let i=0;i<128;i++) {
    const row = job.rows[i];
    if(!Array.isArray(row) || row.length !== 32 || !row.every(n=>Number.isInteger(n)&&Math.abs(n)<=20)) throw Error('Invalid vector');
    let score = 0;
    for(let k=0;k<32;k++) score += row[k]*job.query[k];
    scores.push(score);
  }
  return scores;
}
function processJob(job) {
  if(!running) return;
  const t0=performance.now();
  try {
    // Compute actual integer dot products. The main thread independently verifies the result.
    const scores=compute(job);
    const busy=Math.max(1,performance.now()-t0);
    postMessage({type:'result',id:job.id,scores,busyMs:busy});
    // Approximate one-thread duty target; browsers may throttle or suspend execution.
    const idle=Math.max(20,Math.min(10000,Math.round(busy*(100/percentage-1))));
    timer=setTimeout(()=>{
      timer=null;
      if(running)postMessage({type:'ready'});
    },idle);
  } catch(error) {
    running=false;
    postMessage({type:'error',message:String(error.message||error)});
  }
}
onmessage=({data})=>{
  if(!data || typeof data.type!=='string')return;
  if(data.type==='stop') {running=false;pending=null;if(timer)clearTimeout(timer);timer=null;postMessage({type:'stopped'});return;}
  if(data.type==='start'&&!running) {
    percentage=Math.max(1,Math.min(30,Number(data.duty)||5));
    running=true;
    postMessage({type:'ready'});
  } else if(data.type==='set-duty') {
    percentage=Math.max(1,Math.min(30,Number(data.duty)||5));
  } else if(data.type==='job'&&running) {
    if(timer){ // only accept one job after the idle period
      return;
    }
    processJob(data.job);
  }
};