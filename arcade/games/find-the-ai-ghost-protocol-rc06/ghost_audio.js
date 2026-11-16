// Ghost Protocol RC06 original synthesized audio. No external samples or copyrighted assets.
export function createGhostAudio(enabled=()=>true){
 let ctx=null,master=null,flight=null,drone=null,flightGain=null,droneGain=null;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function ensure(){
  if(!enabled())return null;
  if(!ctx){
   const Audio=window.AudioContext||window.webkitAudioContext;
   if(!Audio)return null;
   ctx=new Audio();
   master=ctx.createGain();master.gain.value=.34;master.connect(ctx.destination);
   const loop=(wave,hz)=>{
    const osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type=wave;osc.frequency.value=hz;gain.gain.value=0;
    osc.connect(gain).connect(master);osc.start();
    return {osc,gain};
   };
   flight=loop('sawtooth',94);flightGain=flight.gain;
   drone=loop('triangle',73);droneGain=drone.gain;
  }
  if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  return ctx;
 }
 function note(from,to,duration=.12,vol=.13,wave='sine',offset=0){
  const c=ensure();if(!c)return;
  const at=c.currentTime+offset,osc=c.createOscillator(),gain=c.createGain();
  osc.type=wave;
  osc.frequency.setValueAtTime(Math.max(25,from),at);
  osc.frequency.exponentialRampToValueAtTime(Math.max(25,to),at+duration);
  gain.gain.setValueAtTime(.0001,at);
  gain.gain.exponentialRampToValueAtTime(Math.max(.001,vol),at+.007);
  gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
  osc.connect(gain).connect(master);osc.start(at);osc.stop(at+duration+.015);
 }
 function tone(freq=400,duration=.1){note(freq,Math.max(70,freq*.79),duration,.075,'sine')}
 function cue(kind){
  if(!enabled())return;
  switch(kind){
   case 'laser':note(620,1390,.095,.22,'sawtooth');note(1430,520,.17,.13,'triangle',.018);break;
   case 'enemy':note(180,620,.11,.11,'square');note(550,120,.15,.07,'triangle',.03);break;
   case 'impact':note(380,80,.11,.17,'square');break;
   case 'destroy':note(710,170,.32,.18,'sawtooth');note(130,64,.26,.11,'triangle',.09);break;
   case 'pickup':for(let i=0;i<3;i++)note(480+i*165,660+i*220,.12,.11,'sine',i*.075);break;
   case 'module':for(let i=0;i<4;i++)note(310+i*155,670+i*190,.18,.13,'triangle',i*.08);break;
   case 'step':note(170,83,.065,.037,'triangle');break;
   case 'flight':note(130,420,.32,.12,'sawtooth');break;
   case 'land':note(190,75,.20,.10,'triangle');break;
   case 'hit':note(230,80,.19,.12,'square');break;
   case 'pulse':note(80,560,.28,.15,'sawtooth');break;
   case 'scan':note(320,920,.14,.07,'sine');break;
   case 'phase':note(780,140,.29,.11,'triangle');break;
   default:tone();
  }
 }
 function ambient({flying=false,distance=999,moving=false,active=true,time=0}={}){
  if(!ctx||!flight||!drone)return;
  const now=ctx.currentTime,on=enabled()&&active;
  const near=clamp((33-distance)/33,0,1);
  const flyLevel=(on&&flying)?0.058:0;
  const droneLevel=on?(0.012+near*0.095):0;
  flightGain.gain.setTargetAtTime(flyLevel,now,.08);
  droneGain.gain.setTargetAtTime(droneLevel,now,.14);
  flight.osc.frequency.setTargetAtTime(94+(flying?22:0)+Math.sin(time*4)*5,now,.1);
  drone.osc.frequency.setTargetAtTime(72+near*43+Math.sin(time*13)*7,now,.13);
 }
 return {tone,cue,ambient,get active(){return !!ctx},get state(){return ctx?.state||'not-started'}};
}
