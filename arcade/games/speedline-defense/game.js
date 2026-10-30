import * as pc from './playcanvas.mjs';

const $ = id=>document.getElementById(id), canvas=$('app');
const clamp=(a,b,c)=>Math.max(b,Math.min(c,a)),rng=(a,b)=>a+Math.random()*(b-a);
const MAPS=[
 {name:'NEON DEPOT',title:'THE KINETIC DEPOT',asset:'neon_depot_extended',line:'#36eddb',sky:'#0c2435',s:'1',path:[[-8,-16],[-8,-12.5],[7.5,-12.5],[7.5,-9],[-6.3,-9],[-6.3,-5],[8,-5],[8,-1],[-7.5,-1],[-7.5,3.5],[7,3.5],[7,7.5],[-6,7.5],[-6,12],[7,12],[7,16]]},
 {name:'RUSTWIND CANYON',title:'REDLINE RUSH',asset:'rustwind_canyon',line:'#ffab54',sky:'#4c231c',s:'2',path:[[-7.5,-16],[8,-16],[8,-12],[-7,-12],[-7,-8],[7,-8],[7,-3],[-7,-3],[-7,1],[7,1],[7,5],[-7,5],[-7,10],[8,10],[8,15],[-6.5,15]]},
 {name:'SKYRAIL BLITZ',title:'THE LAST RAIL',asset:'skyrail_blitz',line:'#a988ff',sky:'#10172e',s:'3',path:[[-8,-16],[8,-16],[8,-11],[-6,-11],[-6,-7],[7,-7],[7,-2],[-8,-2],[-8,2],[7.5,2],[7.5,7],[-7,7],[-7,12],[7,12],[7,16]]}
];
const SPECS={
 pulse:{name:'PULSE SPRINTER',model:'pulse_sprinter',cost:45,range:4.05,damage:1.12,reload:.51,speed:23},
 rail:{name:'RAIL LANCE',model:'rail_lance',cost:75,range:5.7,damage:3.75,reload:1.48,speed:26},
 drag:{name:'DRAG FIELD',model:'drag_field',cost:65,range:3.85,damage:.62,reload:.87,speed:21}
};
const NAMES=['pulse_sprinter','rail_lance','drag_field','velocity_scout','armored_bulwark','defense_reactor',...MAPS.map(x=>x.asset),'field_guardian','breach_raider','reactor_interior'];
let app,cam,world,shader,assets={},state='loading',scene=0,wave=1,credits=165,core=14,score=0,energy=0,kills=0,combo=0,comboTimer=0,elapsed=0,overTimer=0,brakeTimer=0,spawnTimer=0,spawned=0,shots=0,hits=0,abilityUses=0,chosen='pulse',toastTimer=0,viewMode='tactical',cameraAngle=0;
let audioCtx=null,soundOn=true,musicNext=0,noteIndex=0,lastShootSound=0;
let enemies=[],towers=[],bullets=[],sparks=[],pads=[],path=[],root=null;
const mapsBuilt=[false,false,false];
const pointers=new Map(),focus=new pc.Vec3(0,0,0),cameraOffset=new pc.Vec3(20,38,26);
const interaction={taps:0,padsHit:0,pans:0,pinches:0,zoomButtons:0,ignored:0};
// V5 seamless player-controlled 3D field and separate reactor breach arena.
let guardian=null,interiorRoot=null,breach=null,breachers=[],breachCooldown=0,beams=[];
let joystick={x:0,y:0,id:null},firing=false,fireCount=0,hitCount=0,breachesWon=0,breachesLost=0;
let aimLockTarget=null,aimLockSwitches=0,cameraSwipes=0;
let fieldHits=0,fieldIFrames=0,fieldKnockouts=0,reentryKillsNeeded=0,lastFieldHit='none';
let fieldTimeLeft=0,fieldExpirations=0,fieldDeployments=0;
const FIELD_SECONDS=25,REENTRY_KILLS=7,MAX_FIELD_HITS=3;
const keys=new Set();
const modelCount=()=>Object.keys(assets).length;
const material=(hex,metal=.15,emission=0)=>{
 const m=new pc.StandardMaterial(),c=new pc.Color().fromString(hex);
 m.diffuse=c;m.useMetalness=metal>0;m.metalness=metal;m.shininess=70;
 if(emission){m.emissive=c;m.emissiveIntensity=emission}m.update();return m;
};
const MAT={
 ground:material('#182a3b',.35),edge:material('#405b6c',.6),
 cyan:material('#46ffe3',0,2),gold:material('#ffce72',0,1.9),
 blue:material('#629fff',0,2.5),pink:material('#ef6c90',0,2),
 red:material('#ff5266',0,2),dark:material('#122031',.6),
 used:material('#324454',.4),pulse:material('#fcda71',0,2),
 orange:material('#f9a14d',0,1.6),purple:material('#ae8fff',0,2.3)
};
function part(name,type,pos,dim,mat,parent=root){
 const e=new pc.Entity(name);e.addComponent('render',{type,material:mat,castShadows:false,receiveShadows:true});
 e.setLocalPosition(...pos);e.setLocalScale(...dim);parent.addChild(e);return e;
}
function addModel(name,parent,pos=[0,0,0],scale=1){
 const a=assets[name];if(!a)throw Error('MISSING BLENDER 3D MODEL '+name);
 const e=a.resource.instantiateRenderEntity({castShadows:true,receiveShadows:true});
 e.name='Original modeled '+name;e.setLocalPosition(...pos);e.setLocalScale(scale,scale,scale);parent.addChild(e);return e;
}
function message(t){$('hint').textContent=t}
function toast(t){$('toast').textContent=t;$('toast').classList.add('show');toastTimer=2.4}
function sound(f=440,len=.11,type='triangle',gain=.07){
 if(!soundOn||!audioCtx||audioCtx.state!=='running')return;
 try{
  const t=audioCtx.currentTime,o=audioCtx.createOscillator(),v=audioCtx.createGain();
  o.type=type;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(Math.max(40,f*.73),t+len);
  v.gain.setValueAtTime(gain,t);v.gain.exponentialRampToValueAtTime(.001,t+len);
  o.connect(v);v.connect(audioCtx.destination);o.start(t);o.stop(t+len+.018);
 }catch(e){console.warn('Audio:',e.message)}
}
function unlockAudio(){
 if(!soundOn)return;
 try{
  if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state==='suspended')audioCtx.resume();
  musicNext=0;
 }catch(e){soundOn=false}
}
function music(){
 if(!soundOn||!audioCtx||audioCtx.state!=='running'||state!=='running')return;
 if(audioCtx.currentTime<musicNext)return;
 musicNext=audioCtx.currentTime+.28;
 const notes=[130.81,164.81,196,261.63,174.61,196,164.81,130.81];
 const f=notes[noteIndex++%notes.length]*(scene===1?1.059:scene===2?1.122:1);
 sound(f,.23,'sine',.017);
 if(noteIndex%4===1)sound(65.41,.12,'triangle',.029);
}
function sfx(label){
 if(label==='tap')sound(580,.045,'triangle',.035);
 else if(label==='build'){sound(220,.16,'sawtooth',.07);sound(440,.2,'sine',.045)}
 else if(label==='shot'){if(!audioCtx||audioCtx.currentTime-lastShootSound<.085)return;lastShootSound=audioCtx.currentTime;sound(390,.042,'triangle',.022)}
 else if(label==='hit')sound(155,.07,'triangle',.02);
 else if(label==='power')sound(650,.35,'sawtooth',.065);
 else if(label==='win'){sound(523,.36,'sine',.08);sound(784,.38,'sine',.06)}
}
function setState(s){state=s;updateHUD()}
function updateHUD(){
 $('wave').textContent=wave+'/10';$('sectorNum').textContent=(scene+1)+'/3';
 $('speed').textContent=wave+'/10';$('gold').textContent=credits;$('health').textContent=core;
 $('combo').textContent=combo+'×';$('score').textContent=score;$('fill').style.width=energy+'%';
 $('mapName').textContent=MAPS[scene].name;
 for(const k of Object.keys(SPECS)){$(k).disabled=state!=='running'||credits<SPECS[k].cost;$(k).classList.toggle('chosen',chosen===k)}
 $('upgrade').classList.toggle('chosen',chosen==='upgrade');
 $('overdrive').disabled=state!=='running'||energy<45||overTimer>0;
 $('brake').disabled=state!=='running'||energy<30||brakeTimer>0;
 $('pause').textContent=state==='paused'?'▶ RESUME':'Ⅱ PAUSE';
 $('sound').textContent=soundOn?'♫ ON':'♫ OFF';
 $('view').textContent=viewMode==='tactical'?(reentryKillsNeeded>0?'🔒 '+reentryKillsNeeded+' KOs':'◉ ENTER'):viewMode==='interior'?'⚠ BREACH':'⌖ MAP';
 $('view').disabled=state!=='running'||(viewMode==='tactical'&&reentryKillsNeeded>0);
 $('combat').classList.toggle('active',viewMode!=='tactical');
 if(guardian&&viewMode!=='tactical')
  $('combatStatus').textContent=viewMode==='interior'
   ?'BREACH '+(breach?.down||0)+'/'+(breach?.total||0)+' · SHIELD '+Math.ceil(guardian.hp)
   :'⏱ '+Math.ceil(fieldTimeLeft)+'s · HITS '+fieldHits+'/3 · HP '+Math.ceil(guardian.hp);
}
function banner(t,d,b){$('heading').innerHTML=t;$('desc').innerHTML=d;$('start').textContent=b;$('veil').style.display='flex'}
function glsl(){
 const vertex='attribute vec3 aPosition;uniform mat4 matrix_model;uniform mat4 matrix_viewProjection;varying vec3 vPos;void main(void){vPos=aPosition;gl_Position=matrix_viewProjection*matrix_model*vec4(aPosition,1.0);}';
 const fragment='precision mediump float;uniform float uTime;uniform float uBoost;uniform float uStage;varying vec3 vPos;void main(void){float g=sin(uTime*(7.0+uBoost*10.0)+vPos.z*18.0)*0.5+0.5;vec3 a=mix(vec3(.02,.83,.79),vec3(.85,.29,.95),step(1.5,uStage));a=mix(a,vec3(.98,.56,.12),step(.5,uStage)*(1.0-step(1.5,uStage)));gl_FragColor=vec4(a*(.55+.45*g),1.0);}';
 shader=new pc.ShaderMaterial({uniqueName:'X13_V4_VelocityFlowRoads',vertexGLSL:vertex,fragmentGLSL:fragment,attributes:{aPosition:pc.SEMANTIC_POSITION}});
 shader.setParameter('uTime',0);shader.setParameter('uBoost',0);shader.setParameter('uStage',0);shader.update();
}
function distanceSegment(x,z,a,b){
 const dx=b[0]-a[0],dz=b[1]-a[1],d=dx*dx+dz*dz;
 const t=clamp(((x-a[0])*dx+(z-a[1])*dz)/d,0,1);
 return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);
}
function distanceTrack(x,z){
 let d=Infinity;for(let i=1;i<path.length;i++)d=Math.min(d,distanceSegment(x,z,path[i-1],path[i]));return d;
}
function buildPads(){
 const options=[];
 for(const z of [-14.8,-12,-9.2,-6.4,-3.6,-.8,2,4.8,7.6,10.4,13.2,15.2]){
  for(const x of [-9.4,-7.1,-4.8,-2.5,-.2,2.1,4.4,6.7,9]){
   const d=distanceTrack(x,z);
   if(d>1.28&&d<3.5)options.push({x,z,d});
  }
 }
 // Select pads across every section of the route, not just the first third.
 const bands=Array.from({length:12},()=>[]);
 for(const p of options)bands[clamp(Math.floor((p.z+16)/2.8),0,11)].push(p);
 const locations=[];
 for(let round=0;round<5;round++)for(let band=0;band<bands.length;band++){
  const choices=bands[band].sort((a,b)=>Math.abs(a.x+(round%2?4:-4))-Math.abs(b.x+(round%2?4:-4)));
  for(const p of choices){
   if(locations.length>=32)break;
   if(!locations.some(q=>Math.hypot(p.x-q.x,p.z-q.z)<2.25)){locations.push(p);break}
  }
 }
 for(let i=0;i<locations.length;i++){
  const {x,z}=locations[i];
  const e=new pc.Entity('Active build pad #'+i);e.setPosition(x,.21,z);root.addChild(e);
  part('Forged titanium docking collar','cylinder',[0,0,0],[1.28,.20,1.28],MAT.dark,e);
  const ring=part('Genuine 3D luminous build disk','cylinder',[0,.12,0],[.94,.08,.94],scene===1?MAT.orange:scene===2?MAT.purple:MAT.cyan,e);
  const light=part('Central build docking light','cylinder',[0,.19,0],[.30,.025,.30],MAT.gold,e);
  pads.push({x,z,holder:e,ring,light,tower:null});
 }
}
function track(){
 const theme=scene===1?MAT.orange:scene===2?MAT.purple:MAT.cyan;
 const base=scene===1?MAT.orange:MAT.edge;
 for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i],dx=b[0]-a[0],dz=b[1]-a[1];
  const len=Math.hypot(dx,dz),ang=Math.atan2(dx,dz)*180/Math.PI,cx=(a[0]+b[0])/2,cz=(a[1]+b[1])/2;
  let obj=part('Reinforced longer highway','box',[cx,.07,cz],[1.60,.19,len+.23],MAT.edge);
  obj.setLocalEulerAngles(0,ang,0);
  obj=part('Detailed carbon track','box',[cx,.20,cz],[1.35,.07,len+.20],MAT.ground);
  obj.setLocalEulerAngles(0,ang,0);
  for(const lateral of [-.70,.70]){
   const e=part('GLSL high speed lighting','box',[cx+lateral*dz/len,.265,cz-lateral*dx/len],[.075,.025,len+.15],shader);
   e.setLocalEulerAngles(0,ang,0);
  }
  for(let t=.6;t<len;t+=1.12){
   const n=t/len,e=part('Inset road chevron','box',[a[0]+dx*n,.275,a[1]+dz*n],[.09,.025,.38],theme);
   e.setLocalEulerAngles(0,ang,0);
  }
 }
}
function destroyScene(){
 for(const b of bullets)b.entity.destroy();
 for(const e of enemies)if(e.live)e.entity.destroy();
 for(const p of sparks)p.entity.destroy();
 if(root)root.destroy();root=null;
 bullets=[];enemies=[];towers=[];sparks=[];pads=[];
}
function loadScene(next){
 resetCombatWorld();
 destroyScene();scene=next;path=MAPS[scene].path;wave=1;
 core=Math.min(14,core+2);credits=next===0?165:Math.min(390,Math.max(205,Math.floor(credits*.43)+150));
 energy=next===0?0:Math.min(60,energy);
 spawned=0;spawnTimer=-2.4;overTimer=0;brakeTimer=0;combo=0;comboTimer=0;
 root=new pc.Entity('Scene '+(scene+1)+' '+MAPS[scene].name);world.addChild(root);
 addModel(MAPS[scene].asset,root);
 track();buildPads();addModel('defense_reactor',root,[path[path.length-1][0],.24,path[path.length-1][1]],1.05);
 part('Arrival transmitter','cylinder',[path[0][0],.22,path[0][1]],[.65,.23,.65],MAT.orange);
 shader.setParameter('uStage',scene);cam.camera.clearColor=new pc.Color().fromString(MAPS[scene].sky);
 viewMode='tactical';$('view').textContent='◉ ENTER';focus.set(0,0,0);setCamera();cam.camera.projection=pc.PROJECTION_ORTHOGRAPHIC;cam.camera.orthoHeight=tacticalHeight();
 $('zoomStatus').textContent='100%';
 message('Choose a turret and tap a glowing pad. Faster drones approach each wave!');
 updateHUD();
}
function toastCredits(val){toast('+'+val+' credits · SPEED COMBO '+combo+'×')}
function place(i,type=chosen){
 if(state!=='running'||viewMode!=='tactical')return false;
 const p=pads[i],spec=SPECS[type];if(!p||!spec||p.tower||credits<spec.cost)return false;
 credits-=spec.cost;
 const e=new pc.Entity(spec.name);e.setPosition(p.x,.19,p.z);root.addChild(e);
 const g=addModel(spec.model,e,[0,0,0],.85);
 p.ring.render.material=MAT.used;p.light.enabled=false;
 const t={entity:e,visual:g,x:p.x,z:p.z,p,type,level:1,reload:0,shots:0};
 p.tower=t;towers.push(t);sfx('build');toast(spec.name+' READY');updateHUD();return true;
}
function upgrade(t){
 if(!t||state!=='running'||t.level>=3)return false;
 const price=Math.ceil(SPECS[t.type].cost*(t.level===1?1.1:1.85));
 if(credits<price){toast('NEED '+price+' CREDITS');return false}
 credits-=price;t.level++;t.visual.setLocalScale(.85+t.level*.05,.85+t.level*.05,.85+t.level*.05);
 part('Upgrade energy ring','cylinder',[0,.1,0],[.94+t.level*.1,.1,.94+t.level*.1],MAT.gold,t.entity);
 sfx('build');toast(SPECS[t.type].name+' LEVEL '+t.level);updateHUD();return true;
}
function emit(x,y,z,color=MAT.cyan,n=4){
 if(sparks.length>100)return;
 for(let i=0;i<n;i++){
  const p=part('Volumetric spark','sphere',[x,y,z],[.09,.09,.09],i%2?color:MAT.gold);
  sparks.push({entity:p,x,y,z,vx:rng(-2.3,2.3),vy:rng(.1,2.6),vz:rng(-2.3,2.3),life:rng(.2,.6)});
 }
}
function enemyCount(){return Math.min(28,11+wave*1.65|0)}
function slowFactor(){return .52+.30*(wave-1)/9}
function dragFactor(){return .57+.26*(wave-1)/9}
function spawn(){
 const heavy=(wave>=3&&(spawned%5===4||wave===10&&spawned%3===2));
 const fast=(wave>=5&&spawned%4===1);
 const speed=(2.25+(wave-1)*.58)*(1+scene*.16)*(heavy?.86:fast?1.40:1);
 const hp=(5.2+(wave-1)*1.55)*(1+scene*.32)*(heavy?2.5:fast?.86:1);
 const pt=path[0],e=new pc.Entity('Fast enemy '+spawned);
 e.setPosition(pt[0],.40,pt[1]);root.addChild(e);
 const visual=addModel(heavy?'armored_bulwark':'velocity_scout',e,[0,0,0],heavy?.66:.63);
 enemies.push({entity:e,visual,x:pt[0],z:pt[1],next:1,speed,hp,maxHp:hp,heavy,fast,slow:0,bob:rng(0,6),live:true});
}
function kill(e,cause='turret'){
 if(!e.live)return;
 e.live=false;kills++;combo=comboTimer>0?combo+1:1;comboTimer=2.7;
 if(reentryKillsNeeded>0&&cause!=='player'){
  reentryKillsNeeded=Math.max(0,reentryKillsNeeded-1);
  if(reentryKillsNeeded===0){toast('⚡ FIELD ACCESS RECHARGED · ENTER WORLD UNLOCKED');sound(650,.13,'triangle',.07)}
  else if(reentryKillsNeeded<=3)message('FIELD RECHARGE · '+reentryKillsNeeded+' more turret eliminations');
 }
 const money=12+Math.floor(wave/2)+(e.heavy?9:0);credits+=money;score+=110*wave+Math.min(combo,10)*25+scene*70;
 energy=clamp(energy+8+Math.min(combo,6)*2,0,100);
 emit(e.x,.8,e.z,scene===1?MAT.orange:MAT.cyan,7);
 e.entity.destroy();sfx('hit');if(combo%5===0)toastCredits(money);updateHUD();
}
function damage(e,damage,type){
 if(!e.live)return;
 e.hp-=damage;
 if(type==='drag')e.slow=Math.max(e.slow,1.4);
 if(e.hp<=0)kill(e,type);
 else emit(e.x,.65,e.z,type==='rail'?MAT.blue:MAT.cyan,1);
}
function fire(t,target){
 const spec=SPECS[t.type];
 const e=new pc.Entity('Projectile');e.setPosition(t.x,1.6,t.z);root.addChild(e);
 part('3D traveling plasma projectile','sphere',[0,0,0],[t.type==='rail'?.2:.11,.11,.11],t.type==='rail'?MAT.blue:MAT.gold,e);
 bullets.push({entity:e,x:t.x,y:1.6,z:t.z,target,ttl:1.25,type:t.type,damage:spec.damage*(1+.65*(t.level-1)),speed:spec.speed});
 shots++;t.shots++;sfx('shot');
}
function bulletUpdate(dt){
 for(let i=bullets.length-1;i>=0;i--){
  const b=bullets[i],e=b.target;b.ttl-=dt;
  if(e.live&&b.ttl>0){
   const dx=e.x-b.x,dy=.75-b.y,dz=e.z-b.z,d=Math.hypot(dx,dy,dz),step=b.speed*dt;
   if(d<=step+.15){hits++;damage(e,b.damage,b.type)}
   else{b.x+=dx/d*step;b.y+=dy/d*step;b.z+=dz/d*step;b.entity.setPosition(b.x,b.y,b.z);continue}
  }
  b.entity.destroy();bullets.splice(i,1);
 }
}
function activateOverdrive(){
 if(state!=='running'||energy<45||overTimer>0)return false;
 energy-=45;overTimer=3.8;abilityUses++;sfx('power');toast('⚡ HYPER OVERDRIVE +100% FIRE RATE');updateHUD();return true;
}
function activateBrake(){
 if(state!=='running'||energy<30||brakeTimer>0)return false;
 energy-=30;brakeTimer=2.6;abilityUses++;sfx('power');
 const pct=Math.round((1-slowFactor())*100);
 toast('❄ BRAKE PULSE · '+pct+'% SLOW AT SPEED '+wave);
 updateHUD();return true;
}
function nextWave(){
 if(wave<10){
  wave++;spawned=0;spawnTimer=-3.0;
  toast('SPEED '+wave+'/10 · FASTER ASSAULT INCOMING');updateHUD();
 }else{
  setState('transition');sfx('win');
  if(scene<2){
   banner(MAPS[scene].name+'<br><em>SECURED!</em>',
    'All 10 speed waves complete!<br><b>Next: '+MAPS[scene+1].name+'</b><br>More speed. A new larger track. New surroundings.<br>Score '+score+' · Core '+core+'/14',
    'ENTER SECTOR '+(scene+2)+' →');
  }else{
   setState('won');banner('SPEEDLINE<br><em>CHAMPION!</em>',
    'THREE UNIQUE 3D SECTORS · THIRTY SPEED WAVES CLEARED<br>Final Score '+score+' · Total Drones '+kills+' · Core '+core+'/14<br><b>SPEED IS YOUR WEAPON.</b>',
    'REPLAY CAMPAIGN ↻');
  }
 }
}
function mainUpdate(dt){
 music();
 if(state!=='running')return;
 dt=clamp(dt,0,.055);elapsed+=dt;
 if(viewMode==='interior'){
  updateCombat(dt);if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('toast').classList.remove('show')}
  return;
 }
 breachCooldown=Math.max(0,breachCooldown-dt);
 shader.setParameter('uTime',elapsed);shader.setParameter('uBoost',overTimer>0?1:0);
 if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('toast').classList.remove('show')}
 if(comboTimer>0){comboTimer-=dt;if(comboTimer<=0){combo=0;updateHUD()}}
 overTimer=Math.max(0,overTimer-dt);brakeTimer=Math.max(0,brakeTimer-dt);
 spawnTimer+=dt;
 const count=enemyCount();
 const interval=Math.max(.38,.96-(wave-1)*.055);
 if(spawned<count&&spawnTimer>=interval){spawnTimer=0;spawned++;spawn()}
 for(const e of enemies){
  if(!e.live)continue;
  const next=path[e.next];
  if(!next){
   e.live=false;e.entity.destroy();emit(e.x,.8,e.z,MAT.red,4);
   if(breachCooldown<=0){enterBreach();return}
   core--;updateHUD();
   if(core<=0){setState('loss');sfx('power');banner('REACTOR<br><em>OVERRUN!</em>',
    'Sector '+(scene+1)+' · Wave '+wave+'/10<br>Speed defeated your defenses.<br>Score '+score,'RETRY THIS SECTOR ↻');}
   continue;
  }
  const dx=next[0]-e.x,dz=next[1]-e.z,d=Math.hypot(dx,dz);
  const factor=(brakeTimer>0?slowFactor():1)*(e.slow>0?dragFactor():1);
  const travel=e.speed*factor*dt;
  if(travel>=d){e.x=next[0];e.z=next[1];e.next++}
  else{e.x+=dx/d*travel;e.z+=dz/d*travel}
  e.entity.setPosition(e.x,.29+Math.sin(elapsed*7+e.bob)*.085,e.z);
  e.entity.setEulerAngles(0,Math.atan2(dx,dz)*180/Math.PI,0);
  e.slow=Math.max(0,e.slow-dt);
 }
 enemies=enemies.filter(e=>e.live);
 for(const t of towers){
  const spec=SPECS[t.type];t.reload-=dt*(overTimer>0?2.0:1)*(1+.18*(t.level-1));
  if(t.reload>0)continue;
  let best=null,progress=-1;
  for(const e of enemies){
   const d=Math.hypot(t.x-e.x,t.z-e.z);if(d>spec.range)continue;
   const p=e.next*10000-d;if(p>progress){progress=p;best=e}
  }
  if(best){
   fire(t,best);t.reload=spec.reload;t.visual.setLocalEulerAngles(0,Math.atan2(best.x-t.x,best.z-t.z)*180/Math.PI,0);
  }
 }
 bulletUpdate(dt);
 for(let i=sparks.length-1;i>=0;i--){
  const p=sparks[i];p.life-=dt;if(p.life<=0){p.entity.destroy();sparks.splice(i,1);continue}
  p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=7*dt;p.entity.setPosition(p.x,p.y,p.z);
 }
 if(viewMode==='battlefield')updateCombat(dt);
 if(state==='running'&&spawned>=count&&!enemies.length)nextWave();
}
function tacticalHeight(){return canvas.clientWidth>canvas.clientHeight?20.4:(canvas.clientWidth/canvas.clientHeight<.65?27:25)}
function setCamera(){
 cam.setPosition(focus.x+cameraOffset.x,cameraOffset.y,focus.z+cameraOffset.z);
 cam.lookAt(focus.x,0,focus.z);
}
function zoomBy(f,byButton=true){
 if(viewMode!=='tactical'){cam.camera.fov=clamp(cam.camera.fov*f,42,85)}
 else cam.camera.orthoHeight=clamp(cam.camera.orthoHeight*f,14,44);
 if(byButton)interaction.zoomButtons++;else interaction.pinches++;
 $('zoomStatus').textContent=viewMode==='tactical'?Math.round(tacticalHeight()/cam.camera.orthoHeight*100)+'%':'3D';
}
function panBy(dx,dy){
 if(viewMode!=='tactical'){cameraAngle=clamp(cameraAngle+dx*.005,-1.05,1.05);cameraSwipes++;interaction.pans++;return}
 const scale=cam.camera.orthoHeight/Math.max(220,canvas.clientHeight),right=cam.right,up=cam.up;
 focus.x=clamp(focus.x-dx*scale*right.x+dy*scale*up.x,-9,9);
 focus.z=clamp(focus.z-dx*scale*right.z+dy*scale*up.z,-12,12);
 setCamera();interaction.pans++;
}
function cinemaCamera(){
 const e=enemies[0],target=e?{x:e.x,z:e.z,next:e.next}:{x:path[0][0]+3,z:path[0][1]+2,next:1};
 const next=path[Math.min(target.next,path.length-1)]||[target.x,target.z+1];
 let dx=next[0]-target.x,dz=next[1]-target.z,d=Math.hypot(dx,dz)||1;
 dx/=d;dz/=d;
 const c=Math.cos(cameraAngle),s=Math.sin(cameraAngle),bx=dx*c-dz*s,bz=dz*c+dx*s;
 cam.setPosition(target.x-bx*5.2,3.1,target.z-bz*5.2);
 cam.lookAt(target.x+dx*3.5,1.0,target.z+dz*3.5);
}
function switchView(){
 if(state!=='running')return;
 if(viewMode==='interior'){toast('REACTOR BREACHED · DEFEAT ALL RAIDERS');return}
 if(viewMode==='tactical')enterBattlefield();else returnMap();
}
function projectPad(i){
 const p=pads[i];if(!p||!cam)return null;
 const rect=canvas.getBoundingClientRect(),out=cam.camera.worldToScreen(new pc.Vec3(p.x,.33,p.z));
 return{x:rect.left+out.x*rect.width/canvas.clientWidth,y:rect.top+out.y*rect.height/canvas.clientHeight,index:i};
}
function closestPad(x,y){
 let best=null,dmin=22;for(let i=0;i<pads.length;i++){
  const p=projectPad(i);if(!p)continue;const d=Math.hypot(x-p.x,y-p.y);
  if(d<dmin){dmin=d;best=i}
 }return best;
}
function activatePad(i){
 if(state!=='running'||viewMode==='cinematic')return false;
 if(i===null){interaction.ignored++;toast('Tap a glowing circular build pad');return false}
 const p=pads[i];interaction.padsHit++;if(p.tower)return upgrade(p.tower);
 if(chosen==='upgrade'){toast('Tap a built turret to upgrade');return false}
 return place(i,chosen);
}
function begin(){
 if(state==='won'){location.reload();return}
 if(state==='loss'){loadScene(scene);setState('running');$('veil').style.display='none';unlockAudio();return}
 if(state==='transition'){loadScene(scene+1);setState('running');$('veil').style.display='none';unlockAudio();return}
 $('veil').style.display='none';if(state==='menu'){setState('running');message('Build on green pads. Survive all 10 waves to unlock the next 3D sector.')}
 else if(state==='paused')setState('running');
 unlockAudio();sfx('tap');
}

function resetCombatWorld(){
 if(guardian){guardian.entity.destroy();guardian=null}
 if(interiorRoot){interiorRoot.destroy();interiorRoot=null}
 for(const b of beams)if(b.entity?.parent)b.entity.destroy();
 beams=[];breachers=[];breach=null;breachCooldown=0;firing=false;aimLockTarget=null;
 fieldTimeLeft=0;fieldHits=0;fieldIFrames=0;reentryKillsNeeded=0;
 joystick.x=0;joystick.y=0;joystick.id=null;keys.clear();
 const stick=$('joystick');if(stick)stick.style.transform='translate(-50%,-50%)';
}
function ensureGuardian(){
 if(!guardian){
  const entity=new pc.Entity('X13 actual playable third person soldier');
  world.addChild(entity);
  const visual=addModel('field_guardian',entity,[0,0,0],.92);
  guardian={entity,visual,x:0,z:3.5,hp:100,cooldown:0,walk:0,facing:0,targetYaw:0};
 }
 guardian.entity.enabled=true;return guardian;
}
function fieldProjection(){
 cam.camera.projection=pc.PROJECTION_PERSPECTIVE;
 cam.camera.nearClip=.08;cam.camera.farClip=125;cam.camera.fov=65;
 cameraAngle=0;aimLockTarget=null;chaseCamera();$('zoomStatus').textContent='3D';
}
function chaseCamera(dt=1){
 if(!guardian)return;
 const p=guardian,inRoom=viewMode==='interior';
 // Follow the player from BEHIND, aligned with the steerable horizontal camera yaw.
 const radius=inRoom?5.2:6.5,camHeight=inRoom?3.15:4.15;
 let x=p.x+Math.sin(cameraAngle)*radius,z=p.z+Math.cos(cameraAngle)*radius;
 if(inRoom){x=clamp(x,-6.3,6.3);z=clamp(z,-8.65,8.7)}
 const now=cam.getPosition(),smooth=clamp(dt*8,0,1);
 cam.setPosition(now.x+(x-now.x)*smooth,now.y+(camHeight-now.y)*smooth,now.z+(z-now.z)*smooth);
 cam.lookAt(p.x,1.04,p.z);
}
function enterBattlefield(){
 if(state!=='running'||viewMode==='interior')return false;
 if(reentryKillsNeeded>0){toast('🔒 EARN '+reentryKillsNeeded+' MORE TURRET KILLS TO RE-ENTER');return false}
 if(viewMode==='battlefield')return true;
 ensureGuardian();
 // Redeploy near the middle of the board. The old lower-left corner spawn
 // pinned the player against both movement clamps after a single joystick push.
 guardian.x=0;guardian.z=3.5;guardian.entity.setPosition(0,.20,3.5);
 fieldHits=0;fieldTimeLeft=FIELD_SECONDS;fieldDeployments++;fieldIFrames=1.3;guardian.hp=100;
 viewMode='battlefield';root.enabled=true;fieldProjection();
 message('YOU ARE ON THE FIELD · Left stick / WASD moves · FIRE shoots the nearest drone · MAP returns to command');
 sfx('power');updateHUD();return true;
}
function returnMap(){
 if(viewMode==='interior')return false;
 if(viewMode==='tactical')return true;
 const wasOnField=viewMode==='battlefield';
 if(wasOnField&&reentryKillsNeeded===0)reentryKillsNeeded=REENTRY_KILLS;
 fieldTimeLeft=0;
 viewMode='tactical';firing=false;aimLockTarget=null;joystick.x=0;joystick.y=0;if(guardian)guardian.entity.enabled=false;
 cam.camera.projection=pc.PROJECTION_ORTHOGRAPHIC;cam.camera.orthoHeight=tacticalHeight();
 focus.set(0,0,0);setCamera();$('zoomStatus').textContent='100%';
 message(reentryKillsNeeded>0?'FIELD LOCKED · Destroy '+reentryKillsNeeded+' drones with towers to earn entry again':'COMMAND DEFENSE · Build turrets · ENTER WORLD when ready');
 updateHUD();return true;
}
function enterBreach(){
 if(state!=='running'||viewMode==='interior'||!root)return false;
 ensureGuardian();viewMode='interior';root.enabled=false;
 interiorRoot=new pc.Entity('Real Blender-modeled reactor inner defense world');world.addChild(interiorRoot);
 addModel('reactor_interior',interiorRoot,[0,0,0],1);
 guardian.x=0;guardian.z=5.0;guardian.hp=100;guardian.entity.setPosition(0,.20,5.0);
 guardian.entity.enabled=true;
 breach={time:50,total:6+scene*2,spawned:0,down:0,escaped:0,spawnClock:0};
 breachers=[];firing=false;fieldProjection();sfx('power');
 toast('⚠ REACTOR BREACH · DEFEND THE INNER CORE!');
 message('LAST STAND · Raiders are inside! Move and FIRE to protect the reactor · You must fight your way out');
 updateHUD();return true;
}
function spawnRaider(){
 if(!interiorRoot||!breach)return;
 const x=rng(-4.0,4.0),z=-7.5;
 const entity=new pc.Entity('Reactor breach hostile raider');interiorRoot.addChild(entity);
 entity.setPosition(x,.22,z);
 const visual=addModel('breach_raider',entity,[0,0,0],.86);
 breachers.push({entity,visual,x,z,hp:5.5+scene*2.6,speed:1.0+scene*.2,attack:1.25,live:true});
 breach.spawned++;
}
function finishBreach(won){
 if(!breach)return;
 if(won){breachesWon++;core=Math.min(14,core+1);credits+=55+wave*5;
  toast('REACTOR SECURED · +'+(55+wave*5)+' CREDITS');sfx('win')}
 else{breachesLost++;core-=4;toast('INTERIOR LOST · CORE -4');sfx('power')}
 if(interiorRoot){interiorRoot.destroy();interiorRoot=null}
 breachers=[];breach=null;breachCooldown=18;
 root.enabled=true;viewMode='battlefield';guardian.hp=100;
 guardian.x=-4;guardian.z=path[0][1]+3;
 guardian.entity.setPosition(guardian.x,.20,guardian.z);
 returnMap();
 message('BREACH CLEARED · COMMAND RESTORED · 7 TURRET KILLS TO REDEPLOY');
 updateHUD();
 if(core<=0){setState('loss');banner('REACTOR<br><em>FALLEN!</em>',
  'The enemies overwhelmed both outer defense and the inner reactor.<br>Score '+score,'RETRY THIS SECTOR ↻')}
}
function manualTarget(){
 if(!guardian)return null;
 const list=viewMode==='interior'?breachers:enemies;
 const maxRange=viewMode==='interior'?16:10.5;
 // Keep the same live target while it stays within reach. Reacquiring
 // the nearest target for every shot made the character flip rapidly.
 if(aimLockTarget?.live && list.includes(aimLockTarget) &&
   Math.hypot(aimLockTarget.x-guardian.x,aimLockTarget.z-guardian.z)<maxRange+1.3)return aimLockTarget;
 let best=null,dmin=maxRange;
 for(const e of list)if(e.live){
  const d=Math.hypot(e.x-guardian.x,e.z-guardian.z);
  if(d<dmin){dmin=d;best=e}
 }
 if(best!==aimLockTarget)aimLockSwitches++;
 aimLockTarget=best;
 return best;
}
function firePlayer(){
 if(state!=='running'||!guardian||viewMode==='tactical'||guardian.cooldown>0)return false;
 guardian.cooldown=.20;fireCount++;sfx('shot');
 const e=manualTarget();
 if(!e){emit(guardian.x,1.12,guardian.z,MAT.gold,1);return true}
 const dx=e.x-guardian.x,dz=e.z-guardian.z,d=Math.hypot(dx,dz)||1;
 // Shooting uses a lock-on beam. It must NEVER override movement steering.
 // Only turn the character toward the enemy while standing still.
 const steering= Math.hypot(joystick.x,joystick.y)>.12 ||
  keys.has('KeyW')||keys.has('KeyA')||keys.has('KeyS')||keys.has('KeyD')||
  keys.has('ArrowUp')||keys.has('ArrowDown')||keys.has('ArrowLeft')||keys.has('ArrowRight');
 if(!steering)guardian.targetYaw=Math.atan2(dx,dz)*180/Math.PI+180;
 const from=new pc.Vec3(guardian.x,1.15,guardian.z-.24),to=new pc.Vec3(e.x,.95,e.z);
 const center=from.clone().add(to).mulScalar(.5);
 const beamParent=viewMode==='interior'?interiorRoot:root;
 const beam=new pc.Entity('Plasma blaster impact tracer');
 beam.setPosition(center);beam.lookAt(to);beamParent.addChild(beam);
 part('Visible luminous kinetic laser','box',[0,0,0],[.065,.07,d],viewMode==='interior'?MAT.gold:MAT.cyan,beam);
 beams.push({entity:beam,life:.14});
 if(viewMode==='interior'){
  e.hp-=3.25;hitCount++;
  emit(e.x,1.03,e.z,MAT.gold,3);
  if(e.hp<=0){e.live=false;e.entity.destroy();breach.down++;score+=150+wave*35;sfx('hit')}
 }else{
  hitCount++;damage(e,2.45+wave*.16,'player');
 }
 updateHUD();return true;
}
function fieldTakeHit(enemy){
 if(viewMode!=='battlefield'||fieldIFrames>0||!guardian)return false;
 fieldHits++;guardian.hp=Math.max(0,guardian.hp-34);fieldIFrames=1.2;
 lastFieldHit=enemy?.heavy?'armored drone collision':'velocity drone collision';
 emit(guardian.x,1.0,guardian.z,MAT.red,9);sfx('hit');
 if(fieldHits>=MAX_FIELD_HITS){
  fieldKnockouts++;core=Math.max(0,core-1);reentryKillsNeeded=REENTRY_KILLS;fieldIFrames=0;guardian.hp=100;
  returnMap();
  if(core<=0){setState('loss');banner('REACTOR<br><em>OVERWHELMED</em>',
    'Field fighter knocked out, reactor fell.','RETRY THIS SECTOR ↻')}
  else{toast('💥 3 HITS · BACK TO COMMAND · CORE -1');
   message('FIELD LOCKED · EARN '+REENTRY_KILLS+' TURRET KILLS TO RE-ENTER')}
 }else{toast('⚠ HIT '+fieldHits+'/3 · DODGE NEXT DRONE');updateHUD()}
 return true;
}
function updateCombat(dt){
 if(!guardian)return;
 guardian.cooldown=Math.max(0,guardian.cooldown-dt);
 if(viewMode==='battlefield'){
  fieldTimeLeft=Math.max(0,fieldTimeLeft-dt);
  if(fieldTimeLeft<=0){
   fieldExpirations++;reentryKillsNeeded=REENTRY_KILLS;returnMap();
   toast('⏱ DEPLOYMENT EXPIRED · 7 TURRET KILLS TO RECHARGE');
   message('FIELD TIME EXPIRED · Earn seven turret eliminations before your next deployment');
   return;
  }
 }
 const kx=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
 const kz=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0);
 // Screen-forward is -Z: keep up on stick / W moving AWAY from the camera.
 // Interpret stick in camera SCREEN coordinates so right/up are always
 // screen-right / away from the player's view even after camera swipes.
 const sx=joystick.x+kx,sy=joystick.y-kz;
 let mx=Math.cos(cameraAngle)*sx+Math.sin(cameraAngle)*sy;
 let mz=-Math.sin(cameraAngle)*sx+Math.cos(cameraAngle)*sy;
 const mag=Math.hypot(mx,mz);
 if(mag>.04){
  mx/=Math.max(1,mag);mz/=Math.max(1,mag);
  const speed=viewMode==='interior'?5.0:6.15;
  const nx=clamp(guardian.x+mx*speed*dt,viewMode==='interior'?-4.8:-10,viewMode==='interior'?4.8:10);
  const nz=clamp(guardian.z+mz*speed*dt,viewMode==='interior'?-7.5:-16.3,viewMode==='interior'?7.5:16.3);
  guardian.x=nx;guardian.z=nz;guardian.walk+=dt*12;
  guardian.targetYaw=Math.atan2(mx,mz)*180/Math.PI+180;
 }
 guardian.entity.setPosition(guardian.x,.20+Math.sin(guardian.walk)*.017,guardian.z);
 if(firing||keys.has('Space')||keys.has('Enter'))firePlayer();
 const turn=((guardian.targetYaw-guardian.facing+540)%360)-180;
 // Cap rotation speed instead of multiplying a 180-degree target jump in
 // a single frame; target lock holds the heading stable while moving.
 guardian.facing+=clamp(turn,-420*dt,420*dt);
 guardian.visual.setLocalEulerAngles(0,guardian.facing,Math.sin(guardian.walk)*1.4);
 for(let i=beams.length-1;i>=0;i--){const b=beams[i];b.life-=dt;if(b.life<=0){b.entity.destroy();beams.splice(i,1)}}
 if(viewMode==='interior'&&breach){
  breach.time-=dt;breach.spawnClock-=dt;
  if(breach.spawned<breach.total&&breach.spawnClock<=0){breach.spawnClock=2.1;spawnRaider()}
  for(const e of breachers)if(e.live){
   const dx=guardian.x-e.x,dz=guardian.z-e.z,d=Math.hypot(dx,dz)||1;
   const targetReactor=e.z>=6.7;
   if(d>1.65&&!targetReactor){e.z+=e.speed*dt;e.x=clamp(e.x+dx/d*dt*.12,-4.2,4.2);
    e.entity.setPosition(e.x,.2+Math.sin(elapsed*5+e.x)*.035,e.z);
    e.visual.setLocalEulerAngles(0,180,0);
   }else{
    e.attack-=dt;
    if(e.attack<=0){
     e.attack=1.45;
     if(d<2.1){guardian.hp=Math.max(0,guardian.hp-9);sfx('hit')}
    }
   }
   if(targetReactor){e.live=false;e.entity.destroy();breach.escaped++;core=Math.max(0,core-1);emit(e.x,1,e.z,MAT.red,5)}
  }
  breachers=breachers.filter(e=>e.live);
  if(breach.spawned>=breach.total&&!breachers.length){finishBreach(true);return}
  if(breach.time<=0||guardian.hp<=0||core<=0){finishBreach(false);return}
  $('combatStatus').textContent='BREACH '+breach.down+'/'+breach.total+' · '+Math.ceil(breach.time)+'s · HP '+Math.ceil(guardian.hp);
 }else if(viewMode==='battlefield'){
  fieldIFrames=Math.max(0,fieldIFrames-dt);
  if(fieldIFrames<=0){
   const collision=enemies.find(e=>e.live&&Math.hypot(e.x-guardian.x,e.z-guardian.z)<1.35);
   if(collision){fieldTakeHit(collision);if(viewMode==='tactical')return;}
  }
  $('combatStatus').textContent='⏱ '+Math.ceil(fieldTimeLeft)+'s · HITS '+fieldHits+'/3 · HP '+Math.ceil(guardian.hp);
 }
 chaseCamera(dt);
}
function bindCombatInputs(){
 const base=$('joybase'),stick=$('joystick'),fire=$('fire');
 const position=e=>{
  const rect=base.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
  const radius=Math.min(rect.width,rect.height)*.33;
  let dx=(e.clientX-cx)/radius,dy=(e.clientY-cy)/radius,d=Math.hypot(dx,dy);
  if(d>1){dx/=d;dy/=d}
  joystick.x=Math.abs(dx)<.045?0:clamp(dx,-1,1);
  joystick.y=Math.abs(dy)<.045?0:clamp(dy,-1,1);
  stick.style.transform='translate(calc(-50% + '+(joystick.x*radius)+'px),calc(-50% + '+(joystick.y*radius)+'px))';
 };
 const clear=e=>{
  if(joystick.id!==e.pointerId)return;
  joystick.id=null;joystick.x=0;joystick.y=0;
  stick.style.transform='translate(-50%,-50%)';
  try{base.releasePointerCapture(e.pointerId)}catch{}
 };
 base.addEventListener('pointerdown',e=>{if(viewMode==='tactical')return;e.preventDefault();
  joystick.id=e.pointerId;try{base.setPointerCapture(e.pointerId)}catch{}position(e)},{passive:false});
 base.addEventListener('pointermove',e=>{if(joystick.id===e.pointerId){e.preventDefault();position(e)}},{passive:false});
 base.addEventListener('pointerup',clear);base.addEventListener('pointercancel',clear);
 fire.addEventListener('pointerdown',e=>{
  if(state!=='running'||viewMode==='tactical')return;e.preventDefault();firing=true;
  try{fire.setPointerCapture(e.pointerId)}catch{}firePlayer()
 },{passive:false});
 const stop=e=>{firing=false;try{fire.releasePointerCapture(e.pointerId)}catch{}};
 fire.addEventListener('pointerup',stop);fire.addEventListener('pointercancel',stop);
 window.addEventListener('keydown',e=>{
  if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Enter'].includes(e.code)){
   if(viewMode!=='tactical')e.preventDefault();keys.add(e.code)
  }
 });
 window.addEventListener('keyup',e=>keys.delete(e.code));
 window.addEventListener('blur',()=>{keys.clear();firing=false;joystick.x=0;joystick.y=0;stick.style.transform='translate(-50%,-50%)'});
}

function input(){
 bindCombatInputs();
 for(const name of Object.keys(SPECS))$(name).addEventListener('click',()=>{chosen=name;updateHUD();sfx('tap');message(SPECS[name].name+' SELECTED · Tap a glowing pad')});
 $('upgrade').addEventListener('click',()=>{chosen='upgrade';updateHUD();sfx('tap');message('Tap a turret to upgrade it')});
 $('overdrive').addEventListener('click',activateOverdrive);$('brake').addEventListener('click',activateBrake);
 $('start').addEventListener('click',begin);
 $('pause').addEventListener('click',()=>{if(state==='running')setState('paused');else if(state==='paused')setState('running')});
 $('sound').addEventListener('click',()=>{soundOn=!soundOn;if(soundOn)unlockAudio();updateHUD()});
 $('view').addEventListener('click',switchView);
 $('zoomPlus').addEventListener('click',()=>zoomBy(.82));
 $('zoomMinus').addEventListener('click',()=>zoomBy(1.22));
 $('zoomReset').addEventListener('click',()=>{
  if(viewMode!=='tactical'){cameraAngle=0;chaseCamera();cam.camera.fov=65}
  else{focus.set(0,0,0);setCamera();cam.camera.orthoHeight=tacticalHeight()}
  $('zoomStatus').textContent='100%';
 });
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 let lastPinch=null;
 canvas.addEventListener('pointerdown',e=>{
  if(state!=='running')return;
  e.preventDefault();
  // Outside the HUD, a one-finger drag on the 3D scene turns the camera.
  // The left joystick continues to move and FIRE continues to auto-lock.
  if(viewMode!=='tactical' && pointers.size>0)return;
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,moved:false});
  try{canvas.setPointerCapture(e.pointerId)}catch{}
  if(pointers.size>=2){for(const p of pointers.values())p.moved=true;const pts=[...pointers.values()];lastPinch=distance(pts[0],pts[1])}
 },{passive:false});
 canvas.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId)||state!=='running')return;
  e.preventDefault();
  const p=pointers.get(e.pointerId),dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
  if(viewMode!=='tactical'){
   if(Math.abs(dx)>0.3){p.moved=true;panBy(dx,dy)}
   return;
  }
  if(pointers.size>=2){const ps=[...pointers.values()],nd=distance(ps[0],ps[1]);
   if(lastPinch>2&&nd>2&&Math.abs(nd-lastPinch)>1)zoomBy(lastPinch/nd,false);
   lastPinch=nd;for(const q of ps)q.moved=true;
  }else if(pointers.size===1){
   if(Math.hypot(p.x-p.sx,p.y-p.sy)>9)p.moved=true;
   if(p.moved&&Math.abs(dx)+Math.abs(dy)>.2)panBy(dx,dy);
  }
 },{passive:false});
 function release(e,cancel=false){
  const p=pointers.get(e.pointerId);if(!p)return;e.preventDefault();
  const multi=pointers.size>1;pointers.delete(e.pointerId);
  try{canvas.releasePointerCapture(e.pointerId)}catch{}
  if(pointers.size<2)lastPinch=null;
  if(!cancel&&!p.moved&&!multi&&state==='running'&&viewMode==='tactical'){
   interaction.taps++;activatePad(closestPad(e.clientX,e.clientY));
  }
 }
 canvas.addEventListener('pointerup',e=>release(e),{passive:false});
 canvas.addEventListener('pointercancel',e=>release(e,true),{passive:false});
}
function status(){
 return {state,scene:scene+1,sceneName:MAPS[scene].name,wave,maxWaves:10,totalCampaignWaves:30,
  speedLevel:wave,brakeFactor:+slowFactor().toFixed(3),dragFactor:+dragFactor().toFixed(3),
  credits,core,score,kills,spawned,shots,hits,abilityUses,energy,enemyCount:enemies.length,
  models:modelCount(),worlds:MAPS.map(x=>x.name),pads:pads.length,pathLength:+path.slice(1).reduce((s,p,i)=>s+Math.hypot(p[0]-path[i][0],p[1]-path[i][1]),0).toFixed(1),
  towerCount:towers.length,towerLevels:towers.map(t=>t.level),camera:viewMode,fieldHits,fieldIFrames,fieldKnockouts,reentryKillsNeeded,lastFieldHit,fieldTimeLeft:+fieldTimeLeft.toFixed(2),fieldExpirations,fieldDeployments,fieldDuration:FIELD_SECONDS,
  interaction:{...interaction},controls:{cameraYaw:+cameraAngle.toFixed(3),cameraSwipes,joystickX:+joystick.x.toFixed(3),joystickY:+joystick.y.toFixed(3),aimLockSwitches,hasLock:!!aimLockTarget?.live},player:guardian?{x:+guardian.x.toFixed(2),z:+guardian.z.toFixed(2),hp:guardian.hp,yaw:+guardian.facing.toFixed(2),targetYaw:+guardian.targetYaw.toFixed(2)}:null,fireCount,hitCount,breachesWon,breachesLost,breach:breach?{...breach}:null,audio:soundOn?'enabled':'muted',proof:'PlayCanvas+Blender+original GLSL+25sec-field-deployment'};
}
async function init(){
 try{
  app=new pc.Application(canvas,{graphicsDeviceOptions:{antialias:true,alpha:false,preferWebGl2:true}});
  app.graphicsDevice.maxPixelRatio=Math.min(devicePixelRatio||1,1.5);
  app.setCanvasFillMode(pc.FILLMODE_NONE);app.setCanvasResolution(pc.RESOLUTION_AUTO);
  app.resizeCanvas(canvas.clientWidth,canvas.clientHeight);
  app.scene.ambientLight=new pc.Color(.34,.47,.58);
  world=new pc.Entity('X13 Speedline V4 3D world root');app.root.addChild(world);
  cam=new pc.Entity('3D tactical and immersive camera');
  cam.addComponent('camera',{projection:pc.PROJECTION_ORTHOGRAPHIC,orthoHeight:26.5,nearClip:.1,farClip:150,clearColor:new pc.Color(.04,.13,.18)});
  app.root.addChild(cam);setCamera();
  const sun=new pc.Entity('Directional dramatic sunlight');sun.addComponent('light',{type:'directional',color:new pc.Color(.85,.92,1),intensity:1.65,castShadows:true,shadowResolution:1024,shadowDistance:66,normalOffsetBias:.07});
  sun.setEulerAngles(51,32,0);app.root.addChild(sun);
  const fill=new pc.Entity('Blue metallic fill');fill.addComponent('light',{type:'directional',color:new pc.Color(.31,.79,1),intensity:.4,castShadows:false});
  fill.setEulerAngles(30,-120,0);app.root.addChild(fill);
  glsl();
  let loaded=0;
  await Promise.all(NAMES.map(n=>new Promise((resolve,reject)=>{
   app.assets.loadFromUrl('./assets/'+n+'.glb','container',(err,a)=>{
    if(err){reject(new Error('3D model load '+n+': '+String(err)));return}
    assets[n]=a;$('loader').textContent='Loading modeled 3D worlds '+(++loaded)+'/'+NAMES.length;resolve();
   });
  })));
  loadScene(0);input();app.on('update',mainUpdate);app.start();
  const resize=()=>{
   app.resizeCanvas(canvas.clientWidth,canvas.clientHeight);
   if(viewMode==='tactical')cam.camera.orthoHeight=tacticalHeight();
  };
  window.addEventListener('resize',resize);resize();
  setState('menu');$('loader').style.display='none';
  window.__X13_SPEEDLINE_V4__={
   status,begin,place,activatePad,projectPad,switchView,enterBattlefield,returnMap,firePlayer,enterBreach,updateCombat,overdrive:activateOverdrive,brake:activateBrake,
   qaCollisionSetup:()=>{
    if(viewMode!=='battlefield')return false;
    let e=enemies.find(x=>x.live);
    if(!e){spawn();e=enemies.at(-1)}
    e.x=guardian.x;e.z=guardian.z;e.entity.setPosition(e.x,.35,e.z);
    return true;
   },
   qaEarnTurretKill:()=>{
    if(!reentryKillsNeeded)return false;
    spawn();const e=enemies.at(-1);damage(e,e.hp+100,'pulse');return true;
   },
   // QA simulation uses ordinary tower purchase costs and normal campaign rules.
   qaAdvance:(steps=1600)=>{
    if(state==='menu'||state==='transition')begin();
    let n=0;for(;n<steps&&state==='running';n++){
     const choices=['pulse','pulse','rail','drag'];
     if(n%31===0&&credits>65)for(let i=0;i<pads.length;i++)if(!pads[i].tower){place(i,choices[(Math.floor(n/31))%4]);break}
     if(energy>=45&&overTimer<=0)activateOverdrive();
     // QA agent follows the same 0.20s weapon cooldown and real reactor combat rules.
     if(viewMode==='interior')firePlayer();
     // The automated QA commander reinvests earned credits into real upgrades.
     if(n%37===0&&towers.length>=15&&credits>95){
      const candidate=towers.find(t=>t.level<3);
      if(candidate)upgrade(candidate);
     }
     mainUpdate(.05);
    }
    return {steps:n,...status()};
   },
   qaLoadScene:i=>{if(i>=0&&i<3){loadScene(i);setState('running');return status()}return null}
  };
  const params=new URLSearchParams(location.search);
  if(params.get('autostart')==='1')begin();
 }catch(e){
  console.error('X13 V4 init failure',e);
  $('error').style.display='flex';$('errorText').textContent=e.stack||String(e);$('loader').style.display='none';state='error';
 }
}
init();
