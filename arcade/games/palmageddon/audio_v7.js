// PALMAGEDDON original procedural soundscape: 100% generated locally with Web Audio.
// No prerecorded music, third-party audio, networking, autoplay, or copyrighted samples.
export function createAudioEngine(){
 const AC=window.AudioContext||window.webkitAudioContext;
 let ctx=null,master=null,musicBus=null,fxBus=null,noise=null;
 let mode=0,level=0,nextBeat=0,stepIndex=0,scheduled=0,impacts=0,playing=false;
 const scale=[[43.65,55,65.41,73.42],[49,61.74,73.42,82.41],[55,65.41,82.41,98],[65.41,82.41,98,110]];
 const bpm=[87,94,103,114];
 const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
 function init(){
  if(ctx||!AC)return ctx;
  try{
   ctx=new AC();
   master=ctx.createGain();master.gain.value=.65;master.connect(ctx.destination);
   fxBus=ctx.createGain();fxBus.gain.value=1;fxBus.connect(master);
   musicBus=ctx.createGain();musicBus.gain.value=.085;musicBus.connect(master);
   noise=ctx.createBuffer(1,Math.floor(ctx.sampleRate*.30),ctx.sampleRate);
   const data=noise.getChannelData(0);
   // Deterministic seeded original noise, so each event never needs heavy allocations.
   let seed=11813;
   for(let i=0;i<data.length;i++){seed=(1664525*seed+1013904223)>>>0;data[i]=(seed/4294967295)*2-1;}
   nextBeat=ctx.currentTime+.05;
   return ctx;
  }catch(e){ctx=null;return null;}
 }
 function unlock(){
  const ac=init();
  if(!ac)return false;
  if(ac.state==='suspended')ac.resume().catch(()=>{});
  return true;
 }
 function busVolume(){
  if(!ctx)return;
  fxBus.gain.setTargetAtTime(mode===2?0:1,ctx.currentTime,.012);
  musicBus.gain.setTargetAtTime(mode===0?.085:0,ctx.currentTime,.014);
 }
 function setMode(m){
  mode=clamp(m|0,0,2);
  unlock();busVolume();
  if(ctx){nextBeat=ctx.currentTime+.06;}
  return mode;
 }
 function setLevel(index){level=clamp(index|0,0,3);if(ctx)nextBeat=ctx.currentTime+.05;}
 function oscillator(freq,when,duration,volume,wave='sine',target=fxBus,freqEnd=null){
  if(!ctx||!target)return;
  const o=ctx.createOscillator(),v=ctx.createGain();
  const at=Math.max(when,ctx.currentTime+.002);
  o.type=wave;
  o.frequency.setValueAtTime(Math.max(25,freq),at);
  if(freqEnd)o.frequency.exponentialRampToValueAtTime(Math.max(25,freqEnd),at+duration*.89);
  v.gain.setValueAtTime(.0001,at);
  v.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),at+.009);
  v.gain.exponentialRampToValueAtTime(.0001,at+duration);
  o.connect(v);v.connect(target);o.start(at);o.stop(at+duration+.025);
 }
 function burst(when,duration,volume,highpass=850,target=fxBus){
  if(!ctx||!target||!noise)return;
  const at=Math.max(ctx.currentTime+.002,when);
  const node=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),v=ctx.createGain();
  node.buffer=noise;filter.type='highpass';filter.frequency.value=highpass;filter.Q.value=.5;
  v.gain.setValueAtTime(.0001,at);
  v.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),at+.004);
  v.gain.exponentialRampToValueAtTime(.0001,at+duration);
  node.connect(filter);filter.connect(v);v.connect(target);
  node.start(at);node.stop(at+duration+.01);
 }
 function tone(freq=400,seconds=.13,wave='triangle',gain=.08){
  if(mode===2||!unlock())return;
  oscillator(freq,ctx.currentTime+.008,seconds,gain,wave,fxBus,Math.max(55,freq*.55));
 }
 function slap(damage,opponent=false,blocked=false,evaded=false){
  if(mode===2||!unlock())return;
  impacts++;
  const strength=clamp(damage/41,.06,1);
  const at=ctx.currentTime+.11; // Align sound with the mid-swing animated contact.
  if(evaded){burst(at,.06,.018,3100);oscillator(460,at,.12,.024,'sine',fxBus,720);return;}
  if(blocked){burst(at,.07,.050,2100);oscillator(140,at,.11,.045,'triangle',fxBus,83);return;}
  burst(at,.10+.045*strength,.09+.14*strength,1100+1500*strength);
  oscillator(118+90*strength,at,.14+.08*strength,.06+.11*strength,'sine',fxBus,62+22*strength);
  if(strength>.70)burst(at+.035,.11,.04+.055*strength,2400);
  if(opponent)oscillator(98,at+.037,.10,.038,'triangle',fxBus,61);
 }
 function stinger(win){
  if(mode===2||!unlock())return;
  const t=ctx.currentTime+.06;
  const notes=win?[261.63,329.63,392,523.25]:[246.94,220,174.61];
  notes.forEach((f,i)=>oscillator(f,t+i*.115,.33,.046,'triangle',fxBus,f*.96));
 }
 function scheduleStep(at){
  const k=stepIndex%16,bar=Math.floor(stepIndex/16);
  const pace=60/bpm[level]/4;
  if(k===0||k===8){
   oscillator(k===0?77:68,at,.18,.13,'sine',musicBus,37);
   burst(at,.045,.013,210);
  }
  if(k===4||k===12){
   burst(at,.088,.027,950,musicBus);
   oscillator(180,at,.060,.015,'triangle',musicBus,100);
  }
  if(k%2===0)burst(at,.030,k%4===2?.009:.006,5700,musicBus);
  if([0,3,6,8,10,14].includes(k)){
   const bass=scale[level][(bar+Math.floor(k/4))%4];
   oscillator(bass,at,.21,.045,'triangle',musicBus,bass*.99);
  }
  if(k===0&&bar%2===0){
   for(const n of [0,2]){
    const f=scale[level][n]*4;
    oscillator(f,at,.58,.011,'sine',musicBus,f);
   }
  }
  stepIndex++;
  scheduled++;
  return pace;
 }
 function update(active){
  playing=!!active;
  if(!ctx||ctx.state!=='running'||mode!==0||!active)return;
  const now=ctx.currentTime;
  if(nextBeat<now-.1)nextBeat=now+.02;
  let loops=0;
  while(nextBeat<now+.12&&loops<3){
   nextBeat+=scheduleStep(nextBeat);
   loops++;
  }
 }
 return {
  unlock,setMode,setLevel,tone,slap,stinger,update,
  get status(){return {supported:!!AC,ready:!!ctx,state:ctx?.state||'not-started',mode:['music+effects','effects-only','muted'][mode],venue:level+1,notesScheduled:scheduled,impacts,playing};}
 };
}
