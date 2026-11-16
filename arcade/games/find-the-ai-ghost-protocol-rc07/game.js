import * as pc from './vendor/playcanvas.mjs';
import { createAnalogJoystick } from './joystick.js';
import { installSurfaces } from './environment.js';
import { buildDistrict } from './district.js';
import { createDeviceControls } from './device_controls.js';
import { createGhostAudio } from './ghost_audio.js';
const $=id=>document.getElementById(id),clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const qa=window.__FIND_THE_AI__={version:'ghost-protocol-rc07-shift-beam-20261116',ready:false,playing:false,sector:0,fragments:0,health:100,score:0,errors:[],frames:0,complete:false};
let app;try{app=new pc.Application($('game'),{graphicsDeviceOptions:{alpha:false,antialias:true,preserveDrawingBuffer:true}});app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);app.setCanvasResolution(pc.RESOLUTION_AUTO);app.graphicsDevice.maxPixelRatio=Math.min(devicePixelRatio||1,1.45);app.scene.ambientLight=new pc.Color(.26,.39,.54);app.scene.toneMapping=pc.TONEMAP_ACES;app.scene.gammaCorrection=pc.GAMMA_SRGB;app.scene.exposure=1.28;app.start()}catch(e){qa.errors.push(String(e));$('load').textContent='3D LOAD FAILED: '+e;throw e}
function syncTabletViewport(){if(app)app.resizeCanvas()}
window.addEventListener('resize',syncTabletViewport,{passive:true});
if(window.visualViewport)window.visualViewport.addEventListener('resize',syncTabletViewport,{passive:true});
window.addEventListener('orientationchange',()=>setTimeout(syncTabletViewport,150));
const camera=new pc.Entity('ISOMETRIC CHASE CAMERA');camera.addComponent('camera',{fov:59,nearClip:.2,farClip:180,clearColor:new pc.Color(.012,.022,.049)});app.root.addChild(camera);
const keyLight=new pc.Entity('ICE LIGHT');keyLight.addComponent('light',{type:'directional',color:new pc.Color(.65,.85,1),intensity:1.7,castShadows:false});keyLight.setEulerAngles(44,-34,0);app.root.addChild(keyLight);
const warmLight=new pc.Entity('GOLD RIM LIGHT');warmLight.addComponent('light',{type:'directional',color:new pc.Color(1,.62,.38),intensity:.8,castShadows:false});warmLight.setEulerAngles(40,143,0);app.root.addChild(warmLight);
const playerLight=new pc.Entity('SEEKER FLASHLIGHT');playerLight.addComponent('light',{type:'point',color:new pc.Color(.12,1,.84),intensity:2.4,range:15,castShadows:false});app.root.addChild(playerLight);
const aiLight=new pc.Entity('HIDDEN AI LIGHT');aiLight.addComponent('light',{type:'point',color:new pc.Color(.92,.23,1),intensity:2.8,range:18,castShadows:false});app.root.addChild(aiLight);
function material(name,r,g,b,glow=0,opacity=1){const m=new pc.StandardMaterial();m.name=name;m.diffuse=new pc.Color(r,g,b);m.metalness=.12;m.gloss=.44;m.emissive=new pc.Color(clamp(.12+r*(1.5+glow),0,1),clamp(.15+g*(1.5+glow),0,1),clamp(.19+b*(1.5+glow),0,1));if(opacity<1){m.opacity=opacity;m.blendType=pc.BLEND_NORMAL;m.depthWrite=false}m.update();return m}
const M={floor:material('stone floor',.054,.10,.17,.2),tile:material('tech floor',.08,.15,.22,.2),wall:material('wall graphite',.065,.09,.16),cap:material('silver caps',.16,.23,.32),dark:material('black chrome',.015,.027,.055),cyan:material('bright cyan',.1,1,.85,1.9),teal:material('teal strips',.07,.42,.53,.8),gold:material('gold system key',1,.7,.25,1.4),magenta:material('neon pink',.95,.16,.73,2),purple:material('AI ultraviolet',.55,.26,1,1.7),red:material('enemy warning',1,.13,.26,2),white:material('robot visor',.85,1,1,1.2),blue:material('seeker armor',.08,.35,.55,.3),green:material('medical cache',.17,1,.39,1.3),glass:material('translucent shield',.2,.8,1,.7,.45)};
const models={};qa.modelStatus={runner:'pending',drone:'pending',pickup:'pending'};
for(const [id,file] of Object.entries({runner:'runner.glb',drone:'hazard_drone.glb',pickup:'pickup.glb'})){
 app.assets.loadFromUrl('./assets/'+file,'container',(err,asset)=>{if(err){qa.modelStatus[id]='procedural fallback';console.warn('Optional model unavailable',id,String(err));}else{models[id]=asset;qa.modelStatus[id]='verified loaded';}});
}
qa.surfaceStatus=installSurfaces(pc,app,M);
let world=new pc.Entity('GHOST PROTOCOL EMPTY WORLD');app.root.addChild(world);
function group(name,parent=world){const e=new pc.Entity(name);parent.addChild(e);return e}
function mesh(name,type,m,pos,scale,parent=world){const e=new pc.Entity(name);e.addComponent('render',{type,material:m});e.setLocalPosition(...pos);e.setLocalScale(...scale);parent.addChild(e);return e}
const N=21,S=3.25,H=10,wp=(c,r)=>({x:(c-H)*S,z:(r-H)*S}),gr=(x,z)=>({c:Math.round(x/S+H),r:Math.round(z/S+H)});
const sectors=['THE SIGNAL','NEON DISTRICT','AI STREETS'];
const chatter=['YOU FOUND MY FOOTPRINTS. NOT ME.','THERE ARE MORE DOORS THAN ANSWERS.','I LEARN WHEN YOU REPEAT A MISTAKE.','THE SCANNER CANNOT FIND WHAT HAS ALREADY MOVED.','YOUR TOOLS ARE SCATTERED. HOW UNFORTUNATE.','THAT WAS A DECOY. TRY AGAIN.','YOU CANNOT DEBUG A GHOST.','CLOSER. MUCH CLOSER.'];
const puzzles=[
 {clue:'LOG: TRACE → ISOLATE → ?',choices:['PATCH','IGNORE','REPEAT'],answer:0,desc:'Follow the safe debugging sequence.'},
 {clue:'CHECKSUM: 2, 4, 8, 16, ?',choices:['20','32','24'],answer:1,desc:'Complete the doubling sequence.'},
 {clue:'SECURITY: least privilege means...',choices:['grant all','deny every read','grant only what is needed'],answer:2,desc:'Select the safe access policy.'},
 {clue:'BUG REPORT: loop repeats forever. Fix?',choices:['add an exit condition','increase repetitions','hide the error'],answer:0,desc:'Stop the infinite loop without hiding failure.'},
 {clue:'MEMORY: source → verify → ?',choices:['erase','retain','guess'],answer:1,desc:'Preserve verified knowledge.'},
 {clue:'PROOF: code compiles. Is it done?',choices:['yes, always','skip gameplay','test actual behavior'],answer:2,desc:'Proof Before Done requires observed function.'},
 {clue:'AI SIGNAL: one real origin, two copies. Use...',choices:['signature matching','random guessing','volume alone'],answer:0,desc:'Find the original process using its identity.'},
 {clue:'SECURITY: corrupted input detected. Next?',choices:['trust immediately','validate before using','disable every guard'],answer:1,desc:'Recover safely from untrusted data.'},
 {clue:'FINAL CORE: matching result but no evidence...',choices:['mark success','erase log','mark unverified'],answer:2,desc:'Unknown must remain unknown.'}
];
let map=[],floors=[],terminals=[],caches=[],drones=[],bolts=[],hideouts=[],player=null,ghost=null,scan=false,scanSec=0,scanCd=0,pulseCd=0,ghostCd=0,health=100,pulses=3,shields=0,score=0,sector=0,fragmentCount=0,active=false,paused=false,puzzleOpen=false,puzzleTarget=null,t=0,immune=0,dialogueSec=0,toastSec=0,aiIdx=0,seed=0,finished=false,nextMode='advance',isSound=true,lastUi=0;
const held={};let cameraView='map',controllerGuideOpen=false,gamepadChoice=0;const analog=createAnalogJoystick($('joystick'),$('joy-knob'));qa.controller='analog';qa.joystickVector=()=>({x:analog.x,z:analog.z,active:analog.active});
function rng(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
function pick(a){return a[Math.floor(rng()*a.length)]}
function say(msg,d=4){$('dialogue').textContent='AI // '+msg;dialogueSec=d}
function toast(msg,d=2.6){$('message').textContent=msg;$('message').classList.add('visible');toastSec=d}
const sfx=createGhostAudio(()=>isSound);
function sound(f=400,d=.10){sfx.tone(f,d)}
function valid(c,r){return r>=0&&r<N&&c>=0&&c<N&&map[r]?.[c]===0}
function free(x,z,rad=.52){
 if(sector===2){
  if(Math.abs(x)>229||Math.abs(z)>229)return false;
  if(phaseTime<=0&&districtBuildings.some(b=>orbAltitude<(b.sy||12)+1.7&&Math.abs(x-b.x)<b.sx*.5+rad&&Math.abs(z-b.z)<b.sz*.5+rad))return false;
  return true;
 }
 for(const dx of [-rad,rad])for(const dz of [-rad,rad]){const {c,r}=gr(x+dx,z+dz);if(!valid(c,r))return false}
 if(sector===2&&phaseFloor===1&&(Math.abs(x)>19||z<-18||z>0))return false;
 if(sector===2&&phaseFloor===2&&(Math.abs(x)>17||z<4||z>22))return false;
 if(phaseTime<=0&&sector>0)for(const b of solidBlocks)if((b.floor||0)===phaseFloor&&Math.abs(x-b.x)<b.sx*.5+rad&&Math.abs(z-b.z)<b.sz*.5+rad)return false;
 return true;
}
function maze(){
 map=Array.from({length:N},()=>Array(N).fill(1));map[1][1]=0;const stack=[[1,1]];
 while(stack.length){const [c,r]=stack.at(-1),opts=[];for(const [dx,dy] of [[2,0],[-2,0],[0,2],[0,-2]])if(c+dx>0&&c+dx<N-1&&r+dy>0&&r+dy<N-1&&map[r+dy][c+dx])opts.push([dx,dy]);if(!opts.length){stack.pop();continue}const [dx,dy]=pick(opts);map[r+dy/2][c+dx/2]=0;map[r+dy][c+dx]=0;stack.push([c+dx,r+dy])}
 for(let k=0;k<24;k++){const c=2+Math.floor(rng()*(N-4)),r=2+Math.floor(rng()*(N-4));if(map[r][c]&&((!map[r-1][c]&&!map[r+1][c])||(!map[r][c-1]&&!map[r][c+1])))map[r][c]=0}
 floors=[];for(let r=1;r<N-1;r++)for(let c=1;c<N-1;c++)if(!map[r][c])floors.push({c,r,...wp(c,r)});
 const start=wp(9,9);const pool=floors.filter(p=>dist(p,start)>13).sort((a,b)=>dist(b,start)-dist(a,start)),used=[start];
 const take=(spacing=12)=>{let j=pool.findIndex(p=>used.every(q=>dist(q,p)>spacing));if(j<0)j=0;const p=pool.splice(j,1)[0]||floors[0];used.push(p);return p};
 return{trace:[take(15),take(13),take(13)],hides:[take(10),take(9),take(9),take(9)],loot:Array.from({length:9},()=>take(3.8))}
}
function rigBlenderRobot(art,player){
 // Blender GLB exports independent mesh siblings and EMPTY pivots. Bind actual
 // articulated meshes to their shoulder/hip pivots, preserving world transforms.
 const groupParts=(pivotName,names)=>{
  const pivot=art.findByName(pivotName);
  if(!pivot)return null;
  for(const name of names){
   const part=art.findByName(name);
   if(!part||part===pivot)continue;
   const pos=part.getPosition().clone(),rot=part.getRotation().clone();
   pivot.addChild(part);part.setPosition(pos);part.setRotation(rot);
  }
  return pivot;
 };
 const leftArm=groupParts('ArmPivot_L',['shoulder-guard-1','upper-arm-1','elbow-1','forearm-1','gauntlet-light-1','glove-1']);
 const rightArm=groupParts('ArmPivot_R',['shoulder-guard1','upper-arm1','elbow1','forearm1','gauntlet-light1','glove1']);
 const leftLeg=groupParts('LegPivot_L',['thigh-1','knee-brace-1','calf-1','runner-boot-1','sole-light-1']);
 const rightLeg=groupParts('LegPivot_R',['thigh1','knee-brace1','calf1','runner-boot1','sole-light1']);
 player.lArm=leftArm;player.rArm=rightArm;player.lLeg=leftLeg;player.rLeg=rightLeg;
 player.robotRigged=!!(leftArm&&rightArm&&leftLeg&&rightLeg);
}
// Integrated optical weapon. No held gun; stronger modules are visible suit attachments.
function installLaserRig(bot){
 const visual=bot.robotVisual;
 bot.eyeEmitters=[-0.19,0.19].map((x,i)=>mesh('OPTIC EYE LASER '+(i+1),'sphere',M.cyan,[x,1.81,-.49],[.105,.08,.075],visual));
 const capacitor=group('ARC CAPACITOR BACK ATTACHMENT',visual);
 mesh('capacitor plate','box',M.dark,[0,1.13,.43],[.68,.52,.25],capacitor);
 mesh('capacitor core','box',M.purple,[0,1.14,.59],[.32,.31,.11],capacitor);
 const prism=group('PRISM SHOULDER ATTACHMENT',visual);
 for(const side of [-1,1]){
  mesh('prism shoulder armor','box',M.cap,[side*.70,1.38,.04],[.32,.30,.56],prism);
  mesh('prism glowing lens','sphere',M.gold,[side*.71,1.42,-.34],[.15,.14,.16],prism);
 }
 const amplifier=group('NOVA POWER FIN ATTACHMENT',visual);
 for(const side of [-1,1]){
  mesh('energy fin','box',M.magenta,[side*.63,.94,.33],[.16,.65,.35],amplifier);
  mesh('power bar','box',M.cyan,[side*.63,1.02,.55],[.095,.43,.06],amplifier);
 }
 bot.weaponModules=[capacitor,prism,amplifier];
 bot.weaponModules.forEach((e,i)=>{e.enabled=weaponTier>i});
}
function refreshLaserRig(){
 if(player?.weaponModules)player.weaponModules.forEach((e,i)=>{e.enabled=weaponTier>i});
}
function makeBot(){
 const e=group('GHOST PROTOCOL ROBOT SEEKER');
 const visual=group('GHOST PROTOCOL ROBOT VISUAL',e);
 e.robotVisual=visual;
 e.orbVisual=visual; // Preserve camera API; now points to the robot model.
 e.robotFlightBlend=0; // Each newly created robot starts standing upright.
 if(models.runner){
  try{
   const art=models.runner.resource.instantiateRenderEntity({castShadows:false});
   art.name='Original Blender robot seeker';
   visual.addChild(art);art.setLocalScale(.92,.92,.92);
   rigBlenderRobot(art,e);
   e.lArm=e.lArm||group('robot left arm',visual);
   e.rArm=e.rArm||group('robot right arm',visual);
   e.lLeg=e.lLeg||group('robot left leg',visual);
   e.rLeg=e.rLeg||group('robot right leg',visual);
   const spawn=wp(9,9);e.setPosition(spawn.x,0,spawn.z);installLaserRig(e);return e;
  }catch(err){console.warn('Robot GLB unavailable, using generated robot:',String(err))}
 }
 mesh('robot reinforced lower chassis','cylinder',M.dark,[0,.18,0],[.98,.27,.91],visual);
 mesh('robot torso armored blue','box',M.blue,[0,.96,0],[.91,.86,.60],visual);
 mesh('robot power chest','box',M.cyan,[0,1.02,-.34],[.37,.29,.08],visual);
 mesh('robot neck','cylinder',M.cap,[0,1.48,0],[.18,.16,.18],visual);
 mesh('robot helmet','box',M.cap,[0,1.77,-.04],[.82,.57,.67],visual);
 mesh('robot cyan visor','box',M.white,[0,1.82,-.395],[.67,.18,.08],visual);
 mesh('robot antenna','cylinder',M.gold,[.23,2.2,0],[.045,.34,.045],visual);
 mesh('robot antenna tip','sphere',M.cyan,[.23,2.39,0],[.11,.11,.11],visual);
 e.lArm=mesh('robot left articulated arm','capsule',M.cap,[-.62,.97,0],[.25,.69,.26],visual);
 e.rArm=mesh('robot right articulated arm','capsule',M.cap,[.62,.97,0],[.25,.69,.26],visual);
 e.lLeg=mesh('robot left articulated leg','box',M.dark,[-.22,.33,0],[.28,.53,.38],visual);
 e.rLeg=mesh('robot right articulated leg','box',M.dark,[.22,.33,0],[.28,.53,.38],visual);
 const spawn=wp(9,9);e.setPosition(spawn.x,0,spawn.z);installLaserRig(e);return e;
}
function makeTerminal(p,i){
 const e=group('PBD CODE TRACE TERMINAL '+(i+1));e.setPosition(p.x,0,p.z);
 mesh('hexagonal platform','cylinder',M.cap,[0,.20,0],[1.35,.30,1.35],e);
 mesh('console stand','box',M.dark,[0,.92,0],[.75,1,.55],e);
 mesh('holo frame','box',M.cyan,[0,1.57,-.13],[1.2,.89,.13],e);
 mesh('monitor','box',M.dark,[0,1.57,-.23],[1.04,.7,.03],e);
 for(let k=0;k<4;k++)mesh('code glyph','box',M.gold,[-.38+k*.23,1.53+(k%2)*.10,-.25],[.14,.035,.03],e);
 mesh('trace signal','sphere',M.magenta,[0,2.17,0],[.3,.3,.3],e);
 return{entity:e,...p,id:i,done:false};
}
function makeLoot(p,i){
 const e=group('LOOT GENERATOR CACHE '+(i+1));e.setPosition(p.x,0,p.z);
 const kind=i%5===1?'shift':i%5===3?'module':['med','charge','shield'][i%3],m=kind==='module'?M.purple:kind==='shift'?M.gold:kind==='med'?M.green:kind==='charge'?M.gold:M.cyan;
 if(models.pickup){const art=models.pickup.resource.instantiateRenderEntity({castShadows:false});art.name='Original Blender modeled loot collectible';e.addChild(art);art.setLocalScale(.57,.57,.57);art.setLocalPosition(0,1.08,0);if(kind==='module'||kind==='shift')mesh(kind==='shift'?'GOLD SHIFT CHIP PICKUP':'GLOWING LASER ATTACHMENT PICKUP','sphere',kind==='shift'?M.gold:M.purple,[0,1.79,0],[.24,.24,.24],e);return{entity:e,...p,kind,taken:false}}
 mesh('loot chest','box',m,[0,.49,0],[.87,.70,.83],e);
 mesh('loot lid','box',M.dark,[0,.91,0],[.9,.16,.85],e);
 mesh('floating charge','sphere',m,[0,1.32,0],[.22,.22,.22],e);
 return{entity:e,...p,kind,taken:false};
}
function makeGhost(){
 const e=group('AI GHOST MOVING CORE');
 mesh('signal pedestal','cylinder',M.magenta,[0,.18,0],[2.2,.09,2.2],e);
 const head=group('rotating fragments',e);
 mesh('dark core','sphere',M.dark,[0,2.00,0],[1.40,1.40,1.4],head);
 mesh('violet core','sphere',M.purple,[0,2.00,0],[.99,.99,.99],head);
 mesh('central eye','sphere',M.white,[0,2,-.81],[.33,.32,.21],head);
 for(let k=0;k<8;k++){const a=k*Math.PI/4;mesh('cipher shard '+k,'box',k%2?M.gold:M.magenta,[Math.sin(a)*1.54,1.95+(k%3)*.21,Math.cos(a)*1.54],[.20,.63,.23],head)}
 return{entity:e,head,index:0};
}
function makeDrone(p,i){
 const kind=sector===2?(i%5===0?'heavy robot':i%2===0?'security robot':'drone'):(sector===1&&i%4===0?'security robot':'drone');
 const toughness=Math.min(17,2+sector*2+Math.floor(t/100)+Math.floor(droneKills/5)+(kind==='heavy robot'?4:kind==='security robot'?2:0));
 const e=group(kind.toUpperCase()+' '+i);e.setPosition(p.x,(sector===2&&kind!=='drone'?0:p.y||0)+.28,p.z);
 if(models.drone&&kind==='drone'){const art=models.drone.resource.instantiateRenderEntity({castShadows:false});art.name='Original Blender modeled security drone';e.addChild(art);art.setLocalScale(.83,.83,.83);art.setLocalPosition(0,.2,0);return{entity:e,x:p.x,z:p.z,hp:toughness,maxHp:toughness,kind,alt:p.y||0,stunned:0,shoot:1.9+rng()*2,phase:rng()*6}}
 if(kind!=='drone'){
  const heavy=kind==='heavy robot';
  mesh('robot armor chassis','box',heavy?M.cap:M.wall,[0,1.35,0],[heavy?1.9:1.18,heavy?2.3:1.65,heavy?1.5:1.1],e);
  mesh('robot helmet','box',M.dark,[0,heavy?2.82:2.42,0],[heavy?1.25:.9,.55,.92],e);
  mesh('robot visor','box',M.red,[0,heavy?2.86:2.44,-.49],[.65,.16,.08],e);
  for(const side of [-1,1]){
   mesh('robot articulated leg','box',M.wall,[side*.46,.45,0],[heavy?.54:.34,.9,.55],e);
   mesh('robot arm','box',M.cap,[side*(heavy?1.26:.83),1.58,-.02],[.3,heavy?1.8:1.15,.32],e);
  }
  return{entity:e,x:p.x,z:p.z,hp:toughness,maxHp:toughness,kind,alt:p.y||0,stunned:0,shoot:2+rng()*2,phase:rng()*6};
 }
 mesh('drone armor','sphere',M.wall,[0,.57,0],[.89,.69,.91],e);
 mesh('hostile eye','sphere',M.red,[0,.59,-.58],[.35,.21,.16],e);
 mesh('antenna','cylinder',M.cap,[0,1.07,0],[.15,.41,.15],e);
 mesh('alert beacon','sphere',M.magenta,[0,1.32,0],[.17,.17,.17],e);
 for(const s of [-1,1]){mesh('rotor hub','cylinder',M.dark,[s*.71,.72,0],[.66,.07,.66],e);mesh('rotor blade','box',M.cyan,[s*.71,.77,0],[.95,.03,.1],e)}
 return{entity:e,x:p.x,z:p.z,hp:toughness,maxHp:toughness,kind,alt:p.y||0,stunned:0,shoot:1.9+rng()*2,phase:rng()*6};
}
function putGhost(i){ghost.index=i%hideouts.length;const p=hideouts[ghost.index];ghost.entity.setPosition(p.x,0,p.z);aiLight.setPosition(p.x,3,p.z);ghostCd=22+sector*3+rng()*6}
function spawnDrone(){const pool=floors.filter(p=>dist(p,player.getPosition())>14);const nearby=sector===2?pool.filter(p=>dist(p,player.getPosition())<54):[];const cell=pick(nearby.length?nearby:pool.length?pool:floors);if(!cell)return;const spawn=(sector===2&&phaseFloor>0)?{...cell,y:phaseFloor*4}:sector===2?{...cell,y:(enemySerial%4===0?2.2:0)}:cell;
 const enemy=makeDrone(spawn,++enemySerial);
 if(sector===2&&enemy.kind!=='drone'){enemy.alt=0;enemy.entity.setPosition(enemy.x,.28,enemy.z)}
 drones.push(enemy)}
// X13 THREE DIFFERENT WORLDS: sector 1 labyrinth, sector 2 city hunt, sector 3 core siege.
let bossHealth=100,bossCooldown=3,powerRegen=0;
let boltCd=0,droneKills=0,droneSpawnTimer=0,phaseCd=0,phaseTime=0,phaseFloor=0,solidBlocks=[],phaseGates=[],boltFx=[],fpsYaw=0,fpsPitch=0,lookPointer=null,lookLastX=0,lookLastY=0;
let districtBuildings=[],districtShops=[],districtContracts=[],districtInfo=null,enemySerial=0,cameraDistance=19;
let orbFlying=false,orbLanding=false,orbAltitude=0,orbVerticalVelocity=0,touchHyper=false,touchUp=false,touchDown=false,lastMoveSpeed=0,stepSoundCd=0;
let touchLaserHeld=false,laserPointer=null,laserHoldTime=0,laserSpecialTriggered=false,laserTicks=0;
const firingLaser=()=>active&&!paused&&!puzzleOpen&&!controllerGuideOpen&&(touchLaserHeld||!!held.b||!!held.r||(controls?.mode==='controller'&&controls.laserHeld));
function hyperActive(){return controls.mode==='controller'?controls.hyper:(touchHyper||!!held.h)}
function climbActive(){return (controls.mode==='controller'&&controls.climbing)||touchUp||!!held[' ']}
function descendActive(){return (controls.mode==='controller'&&controls.descending)||touchDown||!!held.c}
function roofClearance(x,z){
 const roofs=districtBuildings.filter(b=>Math.abs(x-b.x)<b.sx*.5+.6&&Math.abs(z-b.z)<b.sz*.5+.6);
 return roofs.length?Math.max(...roofs.map(b=>(b.sy||12)+2)):0;
}
function toggleFlight(){
 if(!active||paused||puzzleOpen)return;
 if(sector!==2){toast('FLIGHT UNLOCKS IN AI STREETS · LEVEL 3');return;}
 if(orbFlying){orbFlying=false;orbLanding=true;orbVerticalVelocity=0;toast('LANDING · MOVE TO AN OPEN ROAD');sfx.cue('land');}
 else{orbFlying=true;orbLanding=false;orbAltitude=Math.max(orbAltitude,1.8);orbVerticalVelocity=0;toast('ROBOT FLIGHT ENGAGED · HOLD UP / DOWN TO CHANGE ALTITUDE');sfx.cue('flight');}
 document.body.classList.toggle('orb-flying',orbFlying||orbLanding);
 $('flyToggle').textContent=orbFlying?'LAND':'FLY';
}
const storedProgress=(()=>{try{return JSON.parse(localStorage.getItem('ghost-protocol-rc03-progress-v1')||'{}')}catch(_){return {}}})();
let credits=Math.max(0,Math.min(999999,Number(storedProgress.credits)||0));
let orbPower=Math.max(1,Math.min(6,Number(storedProgress.orbPower)||1));
let weaponTier=Math.max(0,Math.min(3,Number(storedProgress.weaponTier)||0));
const weaponNames=['BASIC OPTICS','ARC CAPACITOR','PRISM ARRAY','NOVA AMPLIFIER'];
let shiftChips=Math.max(0,Math.min(9999,Math.floor(Number(storedProgress.shiftChips)||0)));
const shiftRank=()=>shiftChips>=15?3:shiftChips>=8?2:shiftChips>=3?1:0;
const shiftLabels=['CORE BEAM','FOCUS BEAM','PIERCE CHARGE','NOVA CORE'];
function gainShiftChips(amount){
 const previous=shiftRank();
 shiftChips=Math.min(9999,shiftChips+Math.max(0,Math.floor(amount)));
 if(shiftRank()>previous){
  weaponTier=Math.max(weaponTier,shiftRank());
  refreshLaserRig();
  toast('SHIFT UNLOCKED: '+shiftLabels[shiftRank()]+' • HOLD LASER TO CHARGE',4);
  sfx.cue('module');
 }else toast('SHIFT CHIPS +'+amount+' • '+shiftChips+' TOTAL',2);
 saveOrbProgress();updateUI();
}
function laserTickDamage(){return .16*laserDamage()*(1+shiftRank()*.55)}

function laserDamage(){return orbPower+weaponTier}
function saveOrbProgress(){try{localStorage.setItem('ghost-protocol-rc03-progress-v1',JSON.stringify({credits,orbPower,weaponTier,shiftChips}))}catch(_){}}

function openGrid(inside){
 map=Array.from({length:N},(_,r)=>Array.from({length:N},(_,c)=>inside(c,r)?0:1));
 floors=[];for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(map[r][c]===0)floors.push({c,r,...wp(c,r)});
}
function solidCover(name,x,z,sx,sz,height=3,floor=0){
 const y=floor*4+height/2;
 mesh(name,'box',M.wall,[x,y,z],[sx,height,sz]);
 mesh(name+' luminous trim','box',floor===0?M.cyan:M.magenta,[x,y+height/2,z],[sx+.05,.12,sz+.05]);
 solidBlocks.push({x,z,sx,sz,floor});
}
function phasePad(label,x,z,y,to,tx,tz){
 const g=group('PHASE GATE '+label);
 g.setPosition(x,y,z);
 mesh('phase pad','cylinder',M.magenta,[0,.06,0],[2.5,.16,2.5],g);
 mesh('phase column','cylinder',M.glass,[0,1.65,0],[1.3,3.1,1.3],g);
 mesh('gateway top','sphere',M.cyan,[0,3.3,0],[.8,.5,.8],g);
 phaseGates.push({label,x,z,floor:Math.round(y/4),to,tx,tz});
}
function createOpenCity(){
 openGrid((c,r)=>c>0&&r>0&&c<N-1&&r<N-1);
 mesh('NEON CITY EXPRESSWAY','box',M.dark,[0,-.24,0],[N*S,.36,N*S]);
 for(let i=-3;i<=3;i++){
  const offset=i*8;
  mesh('east west avenue '+i,'box',i%2?M.floor:M.tile,[0,-.04,offset],[N*S-3,.065,5.7]);
  mesh('north south avenue '+i,'box',i%2?M.tile:M.floor,[offset,-.03,0],[5.7,.07,N*S-3]);
 }
 for(let i=0;i<60;i++){
  const side=i%4,bay=Math.floor(i/4),angle=(bay/15)*Math.PI*2;
  const edge=39+Math.sin(i*12.3)*6,xx=Math.cos(angle)*edge,zz=Math.sin(angle)*edge;
  const height=5+(i*19%13);
  const tower=mesh('SKYLINE HIGHRISE '+i,'box',i%4?M.wall:M.cap,[xx,height/2-.02,zz],[4.4,height,4.5]);
  mesh('SKYLINE LIGHT STRIP '+i,'box',i%2?M.magenta:M.cyan,[xx,height+.2,zz],[3.6,.25,3.6]);
 }
 for(let i=0;i<9;i++){
  const a=i*Math.PI*2/9;
  const x=Math.sin(a)*21,z=Math.cos(a)*21;
  mesh('traffic-light column '+i,'cylinder',M.cap,[x,1.2,z],[.35,2.5,.35]);
  mesh('electric traffic light '+i,'sphere',i%2?M.gold:M.cyan,[x,2.58,z],[.34,.34,.34]);
 }
 for(const x of [-31.4,31.4])for(const z of [-31.4,31.4]){
  mesh('CITY CORNER BEACON','cylinder',M.cyan,[x,1.8,z],[.55,3.6,.55]);
 }
 for(const [x,z,sx,sz] of [[-12,-10,10,1.2],[11,-14,1.2,12],[-9,9,12,1.2],[14,10,1.2,13],[-19,15,1.2,9],[0,20,18,1.2]]){
   solidCover('NEON CITY STREET BARRIER',x,z,sx,sz,3.2);
  }
  for(const [x,z] of [[-6,-16],[5,6],[-17,1],[19,-2]]){
   solidCover('STREET COVER',x,z,2.4,2.2,2.6);
  }
  return{trace:[wp(4,4),wp(16,5),wp(10,16)],hides:[wp(17,17),wp(2,15),wp(17,2),wp(10,10)],
  loot:[wp(8,6),wp(12,7),wp(4,12),wp(15,12),wp(8,16),wp(15,16),wp(6,9),wp(11,11),wp(3,17)]};
}
function createCoreArena(){
 openGrid((c,r)=>Math.hypot(c-10,r-10)<8.9);
 mesh('GHOST CORE ABYSS','cylinder',M.dark,[0,-2.3,0],[78,3.5,78]);
 mesh('CORE COMBAT PLATFORM','cylinder',M.wall,[0,-.30,0],[58,.48,58]);
 mesh('GOLD CIRCUIT INNER PLATFORM','cylinder',M.tile,[0,-.04,0],[47,.14,47]);
 for(let i=0;i<36;i++){
  const a=i*Math.PI/18;
  mesh('GHOST ARENA LIGHT RING '+i,'box',i%3===0?M.gold:M.cyan,[Math.sin(a)*29,.03,Math.cos(a)*29],[1.3,.16,.55]);
  if(i%3===0){
   mesh('ENERGY SPIRE '+i,'cylinder',M.cap,[Math.sin(a)*32,1.65,Math.cos(a)*32],[.8,3.2,.8]);
   mesh('ENERGY SPIRE LIGHT '+i,'sphere',M.magenta,[Math.sin(a)*32,3.34,Math.cos(a)*32],[.53,.53,.53]);
  }
 }
 for(let i=0;i<14;i++){
  const a=i*Math.PI*2/14;
  mesh('CORE ENERGY CIRCUIT '+i,'box',i%2?M.magenta:M.cyan,[Math.sin(a)*17,.035,Math.cos(a)*17],[.18,.07,5.8]);
 }
 mesh('CENTRAL BOSS PEDESTAL','cylinder',M.magenta,[0,.12,0],[5.2,.31,5.2]);
 mesh('SECOND FLOOR SKYBRIDGE','box',M.dark,[0,3.87,-9],[40,.36,20]);
  mesh('THIRD FLOOR GHOST DECK','box',M.wall,[0,7.85,13],[37,.36,20]);
  for(const [name,x,z,sx,sz,h,floor] of [
    ['MIDDECK SAFETY RAIL',-19,-9,.7,18,2.7,1],
    ['MIDDECK COVER',1,-13,8,1,2.5,1],
    ['MIDDECK CROSS WALL',6,-4,1,8,2.5,1],
    ['ROOF BARRIER',-16,14,1,15,3,2],
    ['ROOF CROSS WALL',10,10,1,12,3,2]
  ])solidCover(name,x,z,sx,sz,h,floor);
  phasePad('GROUND TO SKYBRIDGE',-13,-8,0,1,-14,-9);
  phasePad('SKYBRIDGE TO ROOF',14,-5,4,2,0,12);
  phasePad('ROOF TO BOSS',0,16,8,0,0,10);
  return{trace:[{...wp(5,7),y:0},{...wp(15,7),y:4},{...wp(10,16),y:8}],hides:[wp(10,10)],
  loot:[wp(10,16),wp(5,11),wp(15,11),wp(8,5),wp(12,5),wp(7,15),wp(13,15),wp(5,7),wp(15,7)]};
}
function makeRelay(p,i){
 const e=group((sector===1?'CITY RELAY TOWER ':'CORE SHIELD GENERATOR ')+(i+1));e.setPosition(p.x,p.y||0,p.z);
 mesh('relay base','cylinder',M.dark,[0,.20,0],[2,.33,2],e);
 mesh('relay body','cylinder',M.cap,[0,1.38,0],[.65,2.3,.65],e);
 mesh('relay power tube','cylinder',sector===1?M.cyan:M.magenta,[0,1.52,0],[.39,2.05,.39],e);
 mesh('relay luminous top','sphere',sector===1?M.gold:M.white,[0,2.82,0],[.72,.72,.72],e);
 for(let k=0;k<4;k++){const a=k*Math.PI/2;mesh('relay wing '+k,'box',M.cyan,[Math.sin(a)*.75,1.43,Math.cos(a)*.75],[.23,1.4,.23],e)}
 return{entity:e,...p,id:i,done:false};
}
function build(n){
 sector=n;bossHealth=100;bossCooldown=3;powerRegen=0;boltCd=0;droneKills=0;droneSpawnTimer=0;phaseCd=0;phaseTime=0;phaseFloor=0;solidBlocks=[];phaseGates=[];boltFx=[];fpsYaw=0;fpsPitch=0;seed=(513337+n*7331)>>>0;world.destroy();world=new pc.Entity('FIND THE AI SECTOR '+(n+1));app.root.addChild(world);terminals=[];caches=[];drones=[];bolts=[];fragmentCount=0;scanSec=0;scanCd=0;pulseCd=0;immune=8;aiIdx=0;ghostCd=20;
 districtBuildings=[];districtShops=[];districtContracts=[];districtInfo=null;enemySerial=0;
 orbFlying=false;orbLanding=false;orbAltitude=0;orbVerticalVelocity=0;touchHyper=false;touchUp=false;touchDown=false;touchLaserHeld=false;laserPointer=null;laserHoldTime=0;laserSpecialTriggered=false;lastMoveSpeed=0;
 document.body.classList.remove('orb-flying');$('flyToggle').textContent='FLY';
  const data=n===0?maze():n===1?createOpenCity():buildDistrict(pc,app,{mesh,group,M,world,addCollider:b=>districtBuildings.push(b)});
  if(n===2){districtInfo=data;districtShops=data.shops;districtContracts=data.contracts||[];floors=data.spawn;}
  hideouts=data.hides;
 if(n===0){
 mesh('foundation','box',M.dark,[0,-.23,0],[N*S,.34,N*S]);
 for(let r=0;r<N;r++)for(let c=0;c<N;c++){
  const p=wp(c,r),wall=map[r][c]!==0;
  if(!wall){
   mesh('ceramic floor '+c+' '+r,'box',(c+r)%2?M.floor:M.tile,[p.x,-.032,p.z],[S-.065,.12,S-.065]);
   if((c+r)%3===0)mesh('grid tracer','box',M.teal,[p.x,-.018,p.z-S*.46],[S-.28,.014,.055]);
  }else{
   mesh('server barrier','box',M.wall,[p.x,1.55,p.z],[S-.04,3.1,S-.04]);
   mesh('armored roof','box',M.cap,[p.x,3.10,p.z],[S-.035,.11,S-.035]);
   if((c+r)%4===0&&c>0&&r>0&&c<N-1&&r<N-1)mesh('wall cable','box',M.teal,[p.x,2.16,p.z-S*.48],[S*.71,.065,.05]);
  }
 }
 }
 if(n>0){health=Math.max(health,80);pulses=Math.max(8,pulses);shields=Math.max(shields,1)}
 player=makeBot();refreshLaserRig();if(n===2)player.setPosition(0,0,0);cameraView=n===0?'map':n===1?'fps':'angled';cameraDistance=n===2?20:19;$('view').textContent=cameraView==='map'?'MAP':cameraView==='fps'?'FPS':'3D';
 for(let i=0;i<3;i++)terminals.push(n===0?makeTerminal(data.trace[i],i):makeRelay(data.trace[i],i));
 for(let i=0;i<data.loot.length;i++)caches.push(makeLoot(data.loot[i],i));
 ghost=makeGhost();putGhost(0);if(n===2)ghost.entity.setLocalScale(1.25,1.25,1.25);
 for(let i=0;i<(n===2?17:2+n*2);i++)spawnDrone();
 if(n===0)for(let k=0;k<18;k++){const cell=pick(floors);mesh('decorative data column','cylinder',k%3?M.teal:M.gold,[cell.x,.06,cell.z],[.16,.1,.16])}
 $('sector').textContent=String(n+1).padStart(2,'0')+' · '+sectors[n];$('dialogue').textContent='';$('message').classList.remove('visible');say(['NEW PRESENCE DETECTED. YOU ARE NOT SUPPOSED TO BE HERE.','YOU LEARNED THE MAZE. I CHANGED THE RULES.','THE CITY IS YOURS TO EXPLORE. FIND THE RELAYS AND VISIT THE GARAGE.'][n],5);
 active=true;paused=false;puzzleOpen=false;finished=false;t=0;toast(n===0?'SIGNAL MAZE: SCAN • USE • PULSE':n===1?'NEON CITY: LASER DRONES • PHASE WALLS • PULSE RELAYS':'AI STREETS: EXPLORE • VISIT UPGRADE GARAGE • PULSE RELAYS',5);qa.ready=true;qa.sector=n+1;qa.fragments=0;qa.playing=true;updateUI();renderMap();followCamera(1);
}
function currentCell(e){return gr(e.x,e.z)}
function nextStep(d,target){
 const start=currentCell(d),end=gr(target.x,target.z);
 if(!valid(start.c,start.r)||!valid(end.c,end.r))return null;
 if(start.c===end.c&&start.r===end.r)return target;
 const queue=[[start.c,start.r]],seen=new Set([start.r*N+start.c]),from=new Map();
 let found=false;
 for(let index=0;index<queue.length;index++){
  const [c,r]=queue[index];
  if(c===end.c&&r===end.r){found=true;break}
  for(const [dc,dr] of [[0,1],[1,0],[-1,0],[0,-1]]){
   const nc=c+dc,nr=r+dr,key=nr*N+nc;
   if(!valid(nc,nr)||seen.has(key))continue;
   seen.add(key);from.set(key,r*N+c);queue.push([nc,nr]);
  }
 }
 if(!found)return null;
 let cursor=end.r*N+end.c,startKey=start.r*N+start.c;
 while(from.has(cursor)&&from.get(cursor)!==startKey)cursor=from.get(cursor);
 return wp(cursor%N,Math.floor(cursor/N));
}
function hit(dmg){
 if(immune>0||!active)return;
 if(shields>0){shields--;toast('🛡 SHIELD ABSORBED THE HIT');sound(280,.18)}
 else{health=Math.max(0,health-dmg);toast('FIREWALL ATTACK! -'+dmg+' INTEGRITY');sound(125,.28)}
 sfx.cue('hit');immune=1.25;if(health<=0)failRun();updateUI();
}
function enemyFireRange(d){return sector===2?(d.kind==='drone'?24:15):22}
function fire(d){
 // Real 3D range and aim. Ground turrets fire UP but never travel UP.
 const to=player.getPosition(),height=d.kind==='drone'?(d.alt||0)+.85:1.65;
 const dx=to.x-d.x,dy=(to.y+1.0)-height,dz=to.z-d.z;
 const length=Math.hypot(dx,dy,dz),maxRange=enemyFireRange(d);
 if(length<1||length>maxRange)return false;
 const bullet=mesh('SECURITY PROJECTILE','sphere',M.red,[d.x,height,d.z],[.20,.20,.20]);
 const speed=d.kind==='drone'?15:11;
 bolts.push({entity:bullet,x:d.x,y:height,z:d.z,dx:dx/length,dy:dy/length,dz:dz/length,speed,life:Math.min(2.5,length/speed+.35)});
 sfx.cue('enemy');return true;
}
function sparkLink(start,end,material=M.cyan,thickness=.12){
 const dx=end.x-start.x,dy=end.y-start.y,dz=end.z-start.z,length=Math.hypot(dx,dy,dz);
 if(length<.05)return;
 const beam=mesh('OPTIC LASER TRACE','box',material,[(start.x+end.x)/2,(start.y+end.y)/2,(start.z+end.z)/2],[thickness,thickness,length]);
 beam.lookAt(end.x,end.y,end.z);boltFx.push({entity:beam,time:.205});
 const spark=mesh('ENERGY IMPACT','sphere',M.white,[end.x,end.y,end.z],[.27,.27,.27]);
 boltFx.push({entity:spark,time:.19});
}
function aimAngleTo(point,pos){
 return Math.atan2(point.x-pos.x,-(point.z-pos.z));
}
function angleDifference(a,b){
 return Math.atan2(Math.sin(a-b),Math.cos(a-b));
}
// Holding the laser charges SHIFT tech without preventing walking or aiming.
function chargedShiftAttack(){
 const rank=shiftRank();
 if(laserSpecialTriggered||rank<2||laserHoldTime<(rank>=3?1.75:1.25))return false;
 laserSpecialTriggered=true;
 const pos=player.getPosition();
 if(rank>=3){
  qa.shiftNovas=(qa.shiftNovas||0)+1;
  const nearby=drones.filter(d=>Math.hypot(d.x-pos.x,d.z-pos.z,(d.alt||0)-pos.y)<23);
  const pulse=mesh('SHIFT NOVA EXPLOSION','sphere',M.magenta,[pos.x,pos.y+1,pos.z],[1,1,1]);
  boltFx.push({entity:pulse,time:.36});
  for(const d of nearby){
   sparkLink({x:pos.x,y:pos.y+1.5,z:pos.z},{x:d.x,y:(d.alt||0)+1.0,z:d.z},M.gold,.27);
   d.entity.destroy();drones.splice(drones.indexOf(d),1);
   droneKills++;score+=250;credits+=50+sector*20;gainShiftChips(1);
  }
  toast('SHIFT NOVA • '+nearby.length+' TARGETS DISABLED',3);
  sfx.cue('destroy');sfx.cue('pulse');saveOrbProgress();updateUI();
  return true;
 }
 const target=drones.filter(d=>dist(d,pos)<42&&Math.abs((d.alt||0)-pos.y)<12)
   .filter(d=>sector===0||Math.abs(angleDifference(aimAngleTo(d,pos),fpsYaw))<.49)
   .sort((a,b)=>dist(a,pos)-dist(b,pos))[0];
 if(!target){laserSpecialTriggered=false;return false}
 qa.shiftPierces=(qa.shiftPierces||0)+1;
 const eyes=(player.eyeEmitters||[]).map(e=>e.getPosition());
 for(const origin of eyes)sparkLink({x:origin.x,y:origin.y,z:origin.z},
   {x:target.x,y:(target.alt||0)+1.1,z:target.z},M.gold,.24);
 target.entity.destroy();drones.splice(drones.indexOf(target),1);
 droneKills++;score+=250;credits+=50+sector*20;gainShiftChips(1);
 toast('SHIFT PIERCER • ONE-SHOT DRONE DISABLED',2.3);
 sfx.cue('destroy');saveOrbProgress();updateUI();
 return true;
}
function stopLaserHold(){
 touchLaserHeld=false;laserPointer=null;laserHoldTime=0;laserSpecialTriggered=false;
 $('bolt')?.classList.remove('pressed');
}
function boltNow(){
 if(!active||paused||puzzleOpen||boltCd>0)return;
 boltCd=.16;laserTicks++;
 const pos=player.getPosition();
 const origins=(player.eyeEmitters||[]).map(e=>{const p=e.getPosition();return{x:p.x,y:p.y,z:p.z}});
 if(!origins.length)origins.push({x:pos.x,y:pos.y+1.65,z:pos.z});
 const target=drones.filter(d=>Math.abs((d.alt||0)-pos.y)<(sector===2?12:3)&&dist(d,pos)<40)
  .filter(d=>sector===0||Math.abs(angleDifference(aimAngleTo(d,pos),fpsYaw))<.49)
  .sort((a,b)=>dist(a,pos)-dist(b,pos))[0];
 const beamMat=weaponTier>=2?M.gold:weaponTier>=1?M.magenta:M.cyan;
 const thickness=.07+.02*weaponTier+.015*shiftRank();
 if(target){
  const end={x:target.x,y:(target.alt||0)+1.13,z:target.z};
  for(const origin of origins)sparkLink(origin,end,beamMat,thickness);
  target.hp=Math.max(0,target.hp-laserTickDamage());target.stunned=Math.max(target.stunned,.16);
  sfx.cue('impact');
  if(target.hp<=0){
   target.entity.destroy();drones.splice(drones.indexOf(target),1);
   droneKills++;score+=250;credits+=50+sector*20;gainShiftChips(1);saveOrbProgress();
   toast('DRONE DESTROYED • '+droneKills+' CONFIRMED');sfx.cue('destroy');
  }else toast(target.kind.toUpperCase()+' HIT • '+target.hp.toFixed(1)+'/'+target.maxHp+' HP',.38);
 }else{
  const end={x:pos.x+Math.sin(fpsYaw)*24,y:pos.y+1.5-Math.sin(fpsPitch)*8,z:pos.z-Math.cos(fpsYaw)*24};
  for(const origin of origins)sparkLink(origin,end,beamMat,thickness);
  if(!firingLaser())toast('EYE LASER • AIM AT A DRONE',1.1);
 }
 sfx.cue('laser');updateUI();
}
function phaseNow(){
 if(!active||paused||puzzleOpen||sector===0||phaseCd>0)return;
 const pos=player.getPosition();
 const gate=phaseGates.find(g=>g.floor===phaseFloor&&Math.hypot(pos.x-g.x,pos.z-g.z)<5);
 if(sector===2&&gate){
  phaseFloor=gate.to;phaseCd=1.5;phaseTime=1.3;
  player.setPosition(gate.tx,phaseFloor*4,gate.tz);
  toast('GHOST PHASE • FLOOR '+(phaseFloor+1),3);sound(980,.22);
 }else{
  phaseTime=3.4;phaseCd=5.0;
  toast('GHOST PHASE • MOVE THROUGH WALLS FOR 3 SECONDS',3);sound(880,.23);
 }
 document.body.classList.add('phasing');sfx.cue('phase');
 updateUI();followCamera(1);
}
function lootGrab(c){
 c.taken=true;c.entity.destroy();score+=125;credits+=65;saveOrbProgress();
 if(c.kind==='med'){health=Math.min(100,health+25);toast('LOOT GENERATOR: +25 INTEGRITY')}
 if(c.kind==='charge'){pulses=Math.min(9,pulses+2);toast('LOOT GENERATOR: +2 EMP PULSES')}
 if(c.kind==='shield'){shields=Math.min(5,shields+1);toast('LOOT GENERATOR: +1 SHIELD')}
 if(c.kind==='shift'){gainShiftChips(2);sfx.cue('pickup')}
 if(c.kind==='module'){
  if(weaponTier<3){weaponTier++;refreshLaserRig();toast('LASER ATTACHMENT COLLECTED: '+weaponNames[weaponTier],3.5)}
  else{credits+=150;toast('LASER MODULE MAXED • +150 BONUS CREDITS')}
  saveOrbProgress();sfx.cue('module');
 }else if(c.kind!=='shift')sfx.cue('pickup');
 updateUI();
}
function scanNow(){
 if(!active||paused||puzzleOpen||scanCd>0)return;
 scanSec=5;scanCd=9;document.body.classList.add('scanning');setTimeout(()=>document.body.classList.remove('scanning'),500);
 const target=terminals.filter(p=>!p.done);if(fragmentCount<3&&target.length){target.sort((a,b)=>dist(a,player.getPosition())-dist(b,player.getPosition()));toast('SCAN: NEAREST TRACE '+Math.round(dist(player.getPosition(),target[0]))+'m')}
 else toast('SCAN: GHOST POSITION REVEALED FOR 5 SECONDS');
 sfx.cue('scan');renderMap();
}
function pulseNow(){
 if(!active||paused||puzzleOpen||pulseCd>0)return;
 if(pulses<=0){toast('NO EMP CHARGES. FIND A LOOT CACHE.');return}
 pulses--;pulseCd=1.3;const pos=player.getPosition();
 const wave=mesh('X13 ELECTROMAGNETIC BURST','sphere',M.glass,[pos.x,.44,pos.z],[.2,.15,.2]);wave.enabled=true;bolts.push({entity:wave,wave:true,x:pos.x,z:pos.z,life:.44,age:0});
 const targets=drones.filter(d=>dist(d,pos)<12).sort((a,b)=>dist(a,pos)-dist(b,pos)).slice(0,3);
 let num=0,origin={x:pos.x,z:pos.z};
 for(const d of targets){
  const len=dist(d,origin);
  if(len>.1){
   const ray=mesh('X13 LIGHTNING BEAM','box',M.cyan,[(d.x+origin.x)/2,.9,(d.z+origin.z)/2],[.17,.18,len]);
   ray.lookAt(d.x,.9,d.z);setTimeout(()=>{if(!ray.destroyed)ray.destroy()},250);
   const flash=mesh('X13 ELECTRIC SPARK','sphere',M.white,[d.x,.95,d.z],[.36,.36,.36]);
   setTimeout(()=>{if(!flash.destroyed)flash.destroy()},270);
  }
  d.stunned=5;num++;score+=75;origin={x:d.x,z:d.z};
 }
 let relays=0;
 if(sector>0){
  for(const p of terminals){
   if(!p.done&&dist(pos,p)<9.5&&Math.abs(pos.y-(p.y||0))<2.6){
    p.done=true;p.entity.destroy();fragmentCount++;relays++;score+=400;
   }
  }
 }
 if(false&&sector===2&&phaseFloor===0&&fragmentCount===3&&dist(pos,ghost.entity.getPosition())<16){
  bossHealth=Math.max(0,bossHealth-20);score+=200;
  if(bossHealth===0){winSector();return}
  toast('GHOST CORE HIT! BOSS INTEGRITY '+bossHealth+'%');sound(350,.25);updateUI();return;
 }
 if(relays){
  toast((sector===1?'CITY RELAY OVERLOADED ':'DISTRICT RELAY OVERLOADED ')+fragmentCount+'/3');
  if(fragmentCount===3){say(sector===1?'THE CITY IS DARK. FIND THE AI EXTRACTION CORE.':'ALL DISTRICT RELAYS DOWN. FIND THE EXTRACTION SIGNAL!',5)}
 }else toast(num?'ELECTRIC SHOCK STUNNED '+num+' DRONES':'ELECTRIC PULSE FIRED');
 sfx.cue('pulse');updateUI();renderMap();
}
function beginPuzzle(target){
 if(!active||paused||puzzleOpen)return;
 puzzleOpen=true;puzzleTarget=target;
 const p=puzzles[sector*3+target.id];$('puzzleTitle').textContent='TRACE '+(target.id+1)+' // DEBUG TERMINAL';$('puzzleDesc').textContent=p.desc;$('puzzleClue').textContent=p.clue;
 const box=$('choices');box.innerHTML='';p.choices.forEach((label,i)=>{const b=document.createElement('button');b.className='choice';b.textContent=String.fromCharCode(65+i)+'  '+label;b.addEventListener('click',()=>answerPuzzle(i));box.appendChild(b)});
 $('puzzle').classList.remove('hidden');gamepadChoice=0;if(controls.mode==='controller')box.querySelector('.choice')?.focus();sound(420,.13);
}
function answerPuzzle(i){
 if(!puzzleTarget)return;
 const p=puzzles[sector*3+puzzleTarget.id];
 if(i===p.answer){
  puzzleTarget.done=true;fragmentCount++;score+=600;const m=puzzleTarget.entity.findByName('trace signal');if(m)m.destroy();
  $('puzzle').classList.add('hidden');puzzleOpen=false;puzzleTarget=null;
  toast('TRACE VERIFIED · '+fragmentCount+'/3 FRAGMENTS');say(fragmentCount<3?'YOU RECOVERED A PIECE. I STILL HAVE THE OTHERS.':'THREE TRACES? IMPOSSIBLE. NOW FIND MY REAL CORE.',5);sound(1000,.25);
 }else{
  health=Math.max(0,health-9);score=Math.max(0,score-30);toast('INVALID PATCH · -9 INTEGRITY');say('THAT FAILED. DID YOU READ THE EVIDENCE?',3);sound(120,.24);
  $('puzzle').classList.add('hidden');puzzleOpen=false;puzzleTarget=null;if(health===0){failRun();return}spawnDrone();
 }
 updateUI();renderMap();
}
function actionNow(){
 if(!active||paused||puzzleOpen)return;
 const pos=player.getPosition();
 if(sector>0){
  if(sector===1&&fragmentCount===3&&dist(pos,ghost.entity.getPosition())<4){winSector();return}
  if(sector===1){const g=ghost.entity.getPosition();toast(fragmentCount===3?'FOLLOW PURPLE GHOST ON RADAR • '+Math.round(dist(g,pos))+'m AWAY • PRESS USE NEAR IT':'PULSE ALL THREE RELAYS FIRST');return}
  if(sector===2){
    if(orbAltitude>4){toast('DESCEND BELOW 4m TO USE SHOPS AND MISSIONS');return}
    const side=districtContracts.find(c=>!c.done&&dist(pos,c)<5);
    if(side){
      side.done=true;side.entity.destroy();credits+=side.reward;score+=side.reward*2;saveOrbProgress();
      toast('SIDE MISSION COMPLETE: '+side.name+' · +'+side.reward+' CREDITS',4);
      sound(980,.22);updateUI();renderMap();return;
    }
    const shop=districtShops.find(s=>dist(pos,s)<7);
    if(shop){
     const price=500+(orbPower-1)*350;
     if(orbPower>=6){toast('ROBOT UPGRADE GARAGE: ALL BOLT UPGRADES UNLOCKED');return;}
     if(credits<price){toast('ROBOT UPGRADE GARAGE: '+price+' CREDITS REQUIRED. YOU HAVE '+credits);return;}
     credits-=price;orbPower++;saveOrbProgress();toast('ROBOT UPGRADE GARAGE: ELECTRIC BOLT POWER '+orbPower+' UNLOCKED!');updateUI();return;
    }
    if(fragmentCount===3&&dist(pos,ghost.entity.getPosition())<7){winSector();return;}
    toast(fragmentCount<3?'PULSE 3 DISTRICT RELAYS • FIND THE UPGRADE GARAGE':'LOCATE THE AI STREETS EXTRACTION SIGNAL');return;
   }
   toast('PULSE THE SHIELD GENERATORS');return;
 }
 for(const p of terminals)if(!p.done&&dist(p,pos)<2.8){beginPuzzle(p);return}
 if(dist(pos,ghost.entity.getPosition())<3.6){
  if(fragmentCount===3){winSector();return}
  toast('GHOST LOCKED · RECOVER ALL 3 CODE FRAGMENTS');say('I AM RIGHT HERE. AND STILL OUT OF YOUR REACH.',4);return;
 }
 const near=terminals.filter(p=>!p.done).map(p=>dist(p,pos)).sort((a,b)=>a-b)[0];
 toast(near?'NEAREST TERMINAL '+Math.round(near)+'m · USE Q TO SCAN':'SCAN FOR THE GHOST');
}
function updateUI(){
 $('hp').textContent=Math.round(health);$('healthFill').style.width=health+'%';$('score').textContent='SCORE '+String(score).padStart(6,'0');$('charge').textContent=pulses;$('shield').textContent=shields;$('credits').textContent=credits;$('power').textContent=orbPower;$('laserModule').textContent=weaponNames[weaponTier];$('shiftChips').textContent=shiftChips;$('shiftRank').textContent=shiftLabels[shiftRank()];
 $('keys').textContent=(sector===0?'FRAGMENTS ':sector===1?'CITY RELAYS ':'DISTRICT RELAYS ')+fragmentCount+'/3';
 const remain=terminals.filter(q=>!q.done);const pos=player?.getPosition();const target=remain.length?remain.reduce((a,b)=>dist(a,pos)<dist(b,pos)?a:b):ghost?.entity?.getPosition();let direction='◆',metres='';if(target&&pos){const step=sector===2?target:(nextStep(pos,target)||target);const angle=Math.atan2(step.z-pos.z,step.x-pos.x);direction=['→','↘','↓','↙','←','↖','↑','↗'][Math.round((angle+2*Math.PI)%(2*Math.PI)/(Math.PI/4))%8];metres=' · '+Math.round(dist(target,pos))+'m'}$('objective').textContent=(fragmentCount<3?'RECOVER '+(3-fragmentCount)+' CODE TRACES':'FIND THE MOVING AI CORE')+' · '+direction+metres;
 if(sector===1)$('objective').textContent=fragmentCount<3?'PULSE '+(3-fragmentCount)+' RELAYS • LASER DRONES • PHASE COVER':'GHOST EXIT '+Math.round(dist(ghost.entity.getPosition(),pos))+'m • PURPLE MARKER ON MAP • PRESS USE WHEN CLOSE';
 if(sector===2){
  const jobsDone=districtContracts.filter(c=>c.done).length;
   $('objective').textContent=(fragmentCount<3?'AI STREETS • '+(3-fragmentCount)+' RELAYS':'AI STREETS • EXTRACTION AVAILABLE')+' · SIDE JOBS '+jobsDone+'/'+districtContracts.length+' · ALT '+Math.round(orbAltitude)+'m';
  $('sector').textContent='03 · AI STREETS / OPEN DISTRICT';
 }
 qa.worldType=['MAZE','OPEN_CITY','OPEN_DISTRICT'][sector];qa.bossHealth=bossHealth;$('altitude').textContent=Math.round(orbAltitude);
 qa.sector=sector+1;qa.fragments=fragmentCount;qa.score=score;qa.health=health;qa.playing=active;qa.drones=drones.length;qa.weaponTier=weaponTier;qa.laserDamage=laserDamage();qa.shiftChips=shiftChips;qa.shiftRank=shiftRank();
}
function renderMap(){
 const canvas=$('minimap'),ctx=canvas.getContext('2d'),size=119,center=size/2;
 ctx.clearRect(0,0,size,size);
 ctx.fillStyle='#061421';ctx.fillRect(0,0,size,size);
 const p=player?.getPosition();if(!p)return;
 const s=sector===2?.93:sector===1?1.62:1.8;
 const xval=x=>(x-p.x)*s,zval=z=>(z-p.z)*s;
 ctx.save();ctx.beginPath();ctx.rect(0,0,size,size);ctx.clip();
 ctx.translate(center,center);
 // Heading-up local radar: ORB remains in the center; world rotates with the right stick.
 ctx.rotate(-fpsYaw);
 function block(x,z,w,h,color){
  ctx.fillStyle=color;ctx.fillRect(xval(x-w/2),zval(z-h/2),w*s,h*s);
 }
 function dot(q,color,rad=2.6){
  ctx.fillStyle=color;ctx.beginPath();
  ctx.arc(xval(q.x),zval(q.z),rad,0,Math.PI*2);ctx.fill();
 }
 if(sector===2){
  for(const line of [-140,0,140]){
   block(line,0,16,464,'#295774');
   block(0,line,464,16,'#295774');
  }
  for(const b of districtBuildings)block(b.x,b.z,b.sx,b.sz,'#6a8798');
  for(const shop of districtShops)dot(shop,'#ffe58b',4);for(const c of districtContracts)if(!c.done)dot(c,'#93ffbd',2.8);
 }else{
  for(let row=0;row<N;row++)for(let col=0;col<N;col++){
   const q=wp(col,row);block(q.x,q.z,S,S,map[row][col]?'#496074':'#132c41');
  }
  if(sector===1)for(const b of solidBlocks)block(b.x,b.z,b.sx,b.sz,'#b4a1c7');
 }
 for(const t of terminals)if(!t.done)dot(t,'#ffcb64',3);
 if(scanSec>0){
  for(const c of caches)if(!c.taken)dot(c,'#70f6a7',2.4);
  for(const d of drones)dot(d,'#ff5e7b',2.25);
 }
 if(fragmentCount===3&&ghost?.entity)dot(ghost.entity.getPosition(),'#e58fff',5);
 ctx.restore();
 // Player arrow remains fixed facing up; no more drifting into the radar corners.
 ctx.fillStyle='#85fff0';ctx.strokeStyle='#032d3a';ctx.lineWidth=1.4;
 ctx.beginPath();ctx.moveTo(center,center-7);ctx.lineTo(center-5,center+5);ctx.lineTo(center,center+2);ctx.lineTo(center+5,center+5);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.strokeStyle='#4cbfbda6';ctx.lineWidth=1;ctx.strokeRect(.5,.5,size-1,size-1);
}
function results(tag,title,text,mode,button){
 active=false;nextMode=mode;qa.playing=false;$('endTag').textContent=tag;$('endTitle').textContent=title;$('endText').textContent=text;$('next').textContent=button;$('results').classList.remove('hidden');updateUI();
}
function winSector(){
 score+=1500;finished=true;const final=sector>=2;
 if(final){qa.complete=true;results('AI STREETS / DISTRICT CLEARED','THE SIGNAL CONTINUES','You restored district relays, earned upgrades and reached extraction. Levels 4–10 and CLOSAI are future development. District score: '+score+'.','restart','A · PLAY AGAIN ▶')}
 else results('SECTOR VERIFIED','GHOST RELOCATED','Level cleared! Press A on controller or select the button below to enter the next level. Score '+score+'. The defenses are adapting.','advance','A · CHASE THE SIGNAL ▶');
 sound(1100,.3);
}
function failRun(){results('INTEGRITY ZERO','THE SIGNAL WENT DARK','Your seeker was disabled by the firewall. You reached '+fragmentCount+'/3 traces in sector '+(sector+1)+'. Recover and try again.','retry','RESTART MISSION ▶')}
function togglePause(){
 if(puzzleOpen)return;
 if(!active&&nextMode!=='resume')return;
 paused=!paused;
 if(paused){analog.reset();results('SYSTEM SUSPENDED','PAUSED','Your pursuit is on hold. Resume whenever ready.','resume','RESUME HUNT ▶')}
 else{$('results').classList.add('hidden');active=true;updateUI()}
}
function restart(selectedSector=0){cameraView='map';$('view').textContent='▦';analog.reset();$('hud').classList.add('show');health=100;shields=0;pulses=selectedSector===0?3:8;score=0;qa.complete=false;build(selectedSector)}
function followCamera(factor=.14){
 const p=player?.getPosition();if(!p)return;
 if(cameraView==='fps'){
  document.body.classList.add('fpsmode');player.orbVisual.enabled=false;
  const eye=p.y+1.75;camera.camera.fov=hyperActive()?82:75;
  camera.setPosition(p.x,eye,p.z);
  camera.lookAt(p.x+Math.sin(fpsYaw)*12,eye-Math.sin(fpsPitch)*11,p.z-Math.cos(fpsYaw)*12);
 }else{
  document.body.classList.remove('fpsmode');camera.camera.fov=59;
  player.orbVisual.enabled=true;
  const d=cameraDistance,overhead=cameraView==='map';
  const radial=overhead?Math.max(2,d*.18):d;
  const altitude=overhead?d*1.65:Math.max(4,d*.50+fpsPitch*d*.6);
  const tx=p.x-Math.sin(fpsYaw)*radial,ty=p.y+altitude,tz=p.z+Math.cos(fpsYaw)*radial;
  const old=camera.getPosition();
  camera.setPosition(old.x+(tx-old.x)*factor,old.y+(ty-old.y)*factor,old.z+(tz-old.z)*factor);
  camera.lookAt(p.x,p.y+.7,p.z);
 }
 playerLight.setPosition(p.x,p.y+2.6,p.z);
}
$('start').onclick=()=>{const code=$('sectorCode').value.trim().toUpperCase();const levels={SIGNAL:0,MEMORY:1,CITY:1,GHOST:2,CORE:2,STREETS:2,DISTRICT:2};if(code&&!Object.prototype.hasOwnProperty.call(levels,code)){$('codeStatus').textContent='CODE UNKNOWN · USE SIGNAL / CITY / STREETS';return}$('menu').classList.add('hidden');restart(code?levels[code]:0);if(controls.mode==='controller')showControllerGuide();sound(620,.2)};
$('next').onclick=()=>{$('results').classList.add('hidden');if(nextMode==='advance')build(sector+1);else if(nextMode==='restart')restart();else if(nextMode==='retry')restart(sector);else if(nextMode==='resume'){paused=false;active=true;updateUI()}};
$('home').onclick=()=>{active=false;paused=false;$('hud').classList.remove('show');$('results').classList.add('hidden');$('menu').classList.remove('hidden');document.body.classList.remove('fpsmode','phasing');qa.playing=false};
$('pause').onclick=togglePause;
$('audio').onclick=()=>{isSound=!isSound;$('audio').textContent=isSound?'♫':'♪̸';if(isSound)sfx.cue('pickup')};
function setCameraView(view){
 if(!['map','angled','fps'].includes(view))return;
 cameraView=view;$('view').textContent=view==='map'?'MAP':view==='fps'?'FPS':'3D';
 toast('CAMERA: '+view.toUpperCase(),1.4);followCamera(1);
}
function cycleCamera(direction=1){const views=['map','angled','fps'];setCameraView(views[(views.indexOf(cameraView)+views.length+direction)%views.length])}
function showControllerGuide(){
 const profile=$('controllerProfile').value;
 const labels={xbox:'XBOX / XINPUT',playstation:'PLAYSTATION / DUALSENSE',switch:'NINTENDO / SWITCH',generic:'GENERIC GAMEPAD'};
 $('mappingProfile').textContent=labels[profile]||'STANDARD GAMEPAD';
 $('controllerGuide').classList.remove('hidden');controllerGuideOpen=true;
 $('closeControls').focus();
}
function hideControllerGuide(){controllerGuideOpen=false;$('controllerGuide').classList.add('hidden')}
function toggleControllerGuide(){if(controllerGuideOpen)hideControllerGuide();else showControllerGuide()}
$('showControls').onclick=toggleControllerGuide;
$('showHudControls').onclick=toggleControllerGuide;
$('closeControls').onclick=hideControllerGuide;
function puzzleNavigate(delta){
 const choices=Array.from($('choices').querySelectorAll('.choice'));
 if(!choices.length)return;
 gamepadChoice=(gamepadChoice+delta+choices.length)%choices.length;
 choices[gamepadChoice].focus();
}
function controllerAction(name){
 if(controllerGuideOpen){if(['use','phase','pause','recenter'].includes(name))hideControllerGuide();return;}
 if(!$('menu').classList.contains('hidden')){
   if(name==='use'||name==='pause')$('start').click();
   return;
 }
 if(!$('results').classList.contains('hidden')){
   if(name==='use'||name==='pause')$('next').click();
   if(name==='phase')$('home').click();
   return;
 }
 if(puzzleOpen){
   if(name==='use')$('choices').querySelectorAll('.choice')[gamepadChoice]?.click();
   if(name==='phase')$('leavePuzzle').click();
   return;
 }
 if(name==='fly'){toggleFlight();return;}
 if(name==='sprint'){toast('ROBOT SPRINT '+(controls.sprinting?'ON':'OFF'),1.2);return;}
 if(name==='recenter'){fpsYaw=0;fpsPitch=0;followCamera(1);toast('CAMERA RECENTERED',1.2);return;}
 if(name==='bolt')boltNow();
 if(name==='pulse'&&!orbFlying)pulseNow();
 if(name==='phase'&&!orbFlying)phaseNow();
 if(name==='scan')scanNow();
 if(name==='use')actionNow();
 if(name==='pause')togglePause();
}
$('view').onclick=()=>cycleCamera(1);
const controls=createDeviceControls({
 onAction:controllerAction,
 onLook:(dx,dy)=>{if(controllerGuideOpen||!active||paused||puzzleOpen)return;fpsYaw+=dx;fpsPitch=clamp(fpsPitch+dy,-.9,.9);followCamera(1);},
 onStart:()=>{$('start').click();},
 onCamera:direction=>{if(controllerGuideOpen)return;if(puzzleOpen){puzzleNavigate(direction);return;}if(active&&!paused)cycleCamera(direction);},
 onCameraSet:direction=>{if(controllerGuideOpen)return;if(puzzleOpen){puzzleNavigate(direction==='map'?-1:1);return;}if(active&&!paused)setCameraView(direction);},
 onGuide:toggleControllerGuide
});
$('scan').onclick=scanNow;$('pulse').onclick=pulseNow;$('interact').onclick=actionNow;$('phase').onclick=phaseNow;
const laserButton=$('bolt');
laserButton.addEventListener('pointerdown',e=>{
 if(!active||paused||puzzleOpen)return;
 e.preventDefault();touchLaserHeld=true;laserPointer=e.pointerId;laserHoldTime=0;laserSpecialTriggered=false;
 laserButton.classList.add('pressed');
 try{laserButton.setPointerCapture(e.pointerId)}catch(_){}
 boltNow();
});
for(const eventName of ['pointerup','pointercancel','lostpointercapture']){
 laserButton.addEventListener(eventName,e=>{if(e.pointerId===laserPointer)stopLaserHold()});
}
// Accessibility-triggered clicks still produce one shot, pointer clicks use hold.
laserButton.addEventListener('click',e=>{if(e.detail===0)boltNow()});
$('flyToggle').onclick=toggleFlight;
function bindHeldTouch(id,flag){
 const el=$(id);el.addEventListener('pointerdown',e=>{e.preventDefault();if(flag==='hyper')touchHyper=true;if(flag==='up')touchUp=true;if(flag==='down')touchDown=true;el.classList.add('pressed');try{el.setPointerCapture(e.pointerId)}catch(_){}});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(type,()=>{if(flag==='hyper')touchHyper=false;if(flag==='up')touchUp=false;if(flag==='down')touchDown=false;el.classList.remove('pressed')});
}
bindHeldTouch('hyperHold','hyper');bindHeldTouch('flyUp','up');bindHeldTouch('flyDown','down');
$('leavePuzzle').onclick=()=>{$('puzzle').classList.add('hidden');puzzleOpen=false;puzzleTarget=null};
for(const b of document.querySelectorAll('[data-key]')){
 const name=b.dataset.key;
 const hold=e=>{e.preventDefault();held[name]=true;b.classList.add('pressed');try{b.setPointerCapture(e.pointerId)}catch(_){}};
 const release=e=>{held[name]=false;b.classList.remove('pressed')};
 b.addEventListener('pointerdown',hold);for(const v of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(v,release);
}
const screenCanvas=$('game');
screenCanvas.addEventListener('pointerdown',e=>{
 if(!active||paused||puzzleOpen||(e.pointerType==='touch'&&e.clientX<window.innerWidth*.36))return;
 lookPointer=e.pointerId;lookLastX=e.clientX;lookLastY=e.clientY;
 try{screenCanvas.setPointerCapture(e.pointerId)}catch(_){}
});
screenCanvas.addEventListener('pointermove',e=>{
 if(e.pointerId!==lookPointer)return;
 const deltaX=e.clientX-lookLastX,deltaY=e.clientY-lookLastY;
 fpsYaw+=deltaX*.005;fpsPitch=clamp(fpsPitch+deltaY*.004,-.95,.95);
 lookLastX=e.clientX;lookLastY=e.clientY;followCamera(1);
});
for(const eventName of ['pointerup','pointercancel','lostpointercapture']){
 screenCanvas.addEventListener(eventName,e=>{if(e.pointerId===lookPointer)lookPointer=null});
}
screenCanvas.addEventListener('wheel',e=>{if(!active)return;e.preventDefault();cameraDistance=clamp(cameraDistance+Math.sign(e.deltaY)*2,8,58);followCamera(1);},{passive:false});
screenCanvas.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('keydown',e=>{
 const key=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key))e.preventDefault();
 if(e.repeat)return;held[key]=true;
 if(key==='q')scanNow();if(key==='e')actionNow();if(key===' '&&!orbFlying)pulseNow();if(key==='b'||key==='r')boltNow();if(key==='f'&&!orbFlying)phaseNow();if(key==='g')toggleFlight();if(key==='escape')togglePause();if(key==='v')cycleCamera();
});
window.addEventListener('keyup',e=>{held[e.key.toLowerCase()]=false});
window.addEventListener('blur',()=>{for(const k of Object.keys(held))held[k]=false;touchHyper=false;touchUp=false;touchDown=false;stopLaserHold()});
function step(dt){
 controls.poll(dt);
 if(toastSec>0){toastSec-=dt;if(toastSec<=0)$('message').classList.remove('visible')}
 if(dialogueSec>0){dialogueSec-=dt;if(dialogueSec<=0)$('dialogue').textContent=''}
 const nearDrone=player&&drones.length?Math.min(...drones.filter(d=>d.kind==='drone').map(d=>Math.hypot(d.x-player.getPosition().x,d.z-player.getPosition().z)).concat([999])):999;
 sfx.ambient({flying:orbFlying||orbLanding,distance:nearDrone,laser:firingLaser(),moving:lastMoveSpeed>.5,active:active&&!paused,time:t});
 if(!active||paused||puzzleOpen||controllerGuideOpen)return;
 t+=dt;
 if(firingLaser()){
  laserHoldTime+=dt;
  if(boltCd<=0)boltNow();
  chargedShiftAttack();
 }else if(laserHoldTime>0){
  laserHoldTime=0;laserSpecialTriggered=false;
 }
 boltCd=Math.max(0,boltCd-dt);phaseCd=Math.max(0,phaseCd-dt);phaseTime=Math.max(0,phaseTime-dt);
 document.body.classList.toggle('phasing',phaseTime>0);
 for(let j=boltFx.length-1;j>=0;j--){boltFx[j].time-=dt;if(boltFx[j].time<=0){boltFx[j].entity.destroy();boltFx.splice(j,1)}}
 if(sector>0){
  droneSpawnTimer+=dt;
  if(droneSpawnTimer>=8&&drones.length<(sector===1?5:sector===2?21:4)){
   droneSpawnTimer=0;spawnDrone();
  }
 }
 if(sector>0){powerRegen+=dt;if(powerRegen>=3.5){powerRegen=0;pulses=Math.min(8,pulses+1)}}
 if(sector===2){/* Level 3 is the open district, not the final boss fight. */}
 immune=Math.max(0,immune-dt);scanSec=Math.max(0,scanSec-dt);scanCd=Math.max(0,scanCd-dt);pulseCd=Math.max(0,pulseCd-dt);ghostCd-=dt;
 let x=(held.d||held.arrowright?1:0)-(held.a||held.arrowleft?1:0),z=(held.s||held.arrowdown?1:0)-(held.w||held.arrowup?1:0);
 if(controls.mode==='controller'){x=controls.move.x;z=controls.move.z}else if(analog.active){x=analog.x;z=analog.z}
 const inputLength=Math.hypot(x,z);if(inputLength>1){x/=inputLength;z/=inputLength}
 if(inputLength>.015){
   const strafe=x,forward=z;x=strafe*Math.cos(fpsYaw)-forward*Math.sin(fpsYaw);
   z=strafe*Math.sin(fpsYaw)+forward*Math.cos(fpsYaw);
  }
  // ShanX Streets analogue throttle principle: light tilt means slow, full tilt means fast.
  const strength=Math.min(1,inputLength);
  const curve=.22*strength+.78*strength*strength;
  const sprinting=controls.mode==='controller'?controls.sprinting:!!held.shift;
  const base=sector===2?4.2:3.5,maximum=sector===2?18:7.2;
  const normalSpeed=base+(maximum-base)*curve;
  const desiredSpeed=(normalSpeed*(sprinting?1.3:1))*(hyperActive()?1.9:1);
  const speed=Math.min(sector===2?37:17,desiredSpeed);
  lastMoveSpeed=inputLength>.015?speed:0;
  if(inputLength>.015){
    const pos=player.getPosition(),v=speed*dt;
    if(free(pos.x+x*v,pos.z))player.setPosition(pos.x+x*v,pos.y,pos.z);
    const pos2=player.getPosition();
    if(free(pos2.x,pos2.z+z*v))player.setPosition(pos2.x,pos2.y,pos2.z+z*v);
    player.setEulerAngles(0,Math.atan2(-x,-z)*180/Math.PI,0);
  }
  if(sector===2){
    if(orbFlying){
      const vertical=(climbActive()?1:0)-(descendActive()?1:0);
      orbVerticalVelocity+=(vertical*15-orbVerticalVelocity)*Math.min(1,dt*3.5);
      orbAltitude=clamp(orbAltitude+orbVerticalVelocity*dt,1.8,42);
    }else if(orbLanding){
      const now=player.getPosition(),roof=roofClearance(now.x,now.z);
      orbAltitude=Math.max(roof,orbAltitude-21*dt);
      if(orbAltitude<=.02){
        orbLanding=false;orbAltitude=0;document.body.classList.remove('orb-flying');
        toast('ROBOT LANDED');$('flyToggle').textContent='FLY';sfx.cue('land');
      }else if(roof>0&&orbAltitude<=roof+.05){
        orbFlying=true;orbLanding=false;toast('ROOFTOP BELOW · LAND IN AN OPEN STREET');
        $('flyToggle').textContent='LAND';
      }
    }
    const p=player.getPosition();player.setPosition(p.x,orbAltitude,p.z);
  }
 // Rigged walk: hips and shoulders counter-swing. In flight, BOTH arms extend
 // forward/up in a stable superhero flight pose, with legs streamlined.
 // RC05: A real horizontal robot in flight, not merely raised arms.
 // In the Blender model the robot stands along local +Y and faces local -Z.
 // Pitch the entire visible robot about local X by -85 degrees so the head
 // points forward. Leave the physics/gameplay player root upright for collision,
 // touch controls and camera consistency. Smooth entrance and landing.
 const airborne=sector===2&&(orbFlying||orbLanding);
 const walking=lastMoveSpeed>.2&&!airborne;
 stepSoundCd=Math.max(0,stepSoundCd-dt);
 if(walking&&stepSoundCd<=0){sfx.cue('step');stepSoundCd=.27+Math.max(0,.12-lastMoveSpeed*.01);}
 const gait=walking?Math.sin(t*(8+Math.min(12,lastMoveSpeed*.55))):0;
 const intensity=walking?Math.min(1,.36+lastMoveSpeed/8):0;
 const legAngle=gait*34*intensity,armAngle=gait*26*intensity;
 const blend=player.robotFlightBlend=(player.robotFlightBlend||0)
   +((airborne?1:0)-(player.robotFlightBlend||0))*Math.min(1,dt*11);
 player.lLeg.setLocalEulerAngles(legAngle*(1-blend)-5*blend,0,0);
 player.rLeg.setLocalEulerAngles(-legAngle*(1-blend)-5*blend,0,0);
 // The shoulder joints extend forward in world space after the body pitches.
 player.lArm.setLocalEulerAngles(-armAngle*(1-blend)+175*blend,0,-8*blend);
 player.rArm.setLocalEulerAngles( armAngle*(1-blend)+175*blend,0, 8*blend);
 if(player.robotVisual){
  player.robotVisual.setLocalEulerAngles(-85*blend,0,0);
  player.robotVisual.setLocalPosition(0,
   (walking?Math.abs(gait)*.045:0)+.34*blend+Math.sin(t*2.5)*.02*blend,0);
 }
 for(const c of caches)if(!c.taken&&dist(c,player.getPosition())<1.20&&Math.abs(player.getPosition().y-(c.y||0))<2.6)lootGrab(c);
 for(const d of drones){
  d.stunned=Math.max(0,d.stunned-dt);d.shoot-=dt;d.phase+=dt;
  const p=player.getPosition(),isFlyer=d.kind==='drone';
  if(sector===2){
   if(isFlyer){
    // Drones take off and climb after the player's flight, but are slower
    // than the robot's HYPER. No instant vertical teleporting.
    const desiredAlt=orbFlying?clamp(p.y+.45,1.6,40):1.35;
    d.alt=clamp((d.alt||0)+clamp(desiredAlt-(d.alt||0),-6.2*dt,6.2*dt),0,40);
   }else d.alt=0;
  }
  d.entity.setPosition(d.x,(d.alt||0)+.25+(isFlyer?Math.sin(d.phase*3)*.12:0),d.z);
  if(d.stunned>0)continue;
  const dTo=dist(d,p),verticalDiff=Math.abs((d.alt||0)-p.y);
  const chaseRange=sector===2?(isFlyer?49:19):22;
  if(dTo<chaseRange&&dTo>1.8){
   const target=sector===0?nextStep(d,p):p;
   if(target){
    const dd=dist(d,target);
    const speed=sector===2?(isFlyer?6.0:2.35):(sector+1)*.36+1.9;
    const mv=Math.min(dd,speed*dt);
    if(dd>.01){d.x+=(target.x-d.x)/dd*mv;d.z+=(target.z-d.z)/dd*mv}
   }
  }
  d.entity.setEulerAngles(0,Math.atan2(p.x-d.x,p.z-d.z)*180/Math.PI,0);
  if(dTo<1.18&&verticalDiff<1.5)hit(13+sector*3);
  if(d.shoot<=0){fire(d);d.shoot=2.4+rng()*2.2-sector*.4}
 }
 for(let i=bolts.length-1;i>=0;i--){const b=bolts[i];b.life-=dt;if(b.wave){b.age+=dt;b.entity.setLocalScale(1+b.age*29,.09,1+b.age*29)}else{
   const speed=b.speed||11;
   b.x+=b.dx*speed*dt;b.z+=b.dz*speed*dt;
   b.y=(b.y??.85)+(b.dy||0)*speed*dt;
   b.entity.setPosition(b.x,b.y,b.z);
   const point=player.getPosition();
   if(Math.hypot(b.x-point.x,b.y-(point.y+1.0),b.z-point.z)<.95){hit(11+sector*3);b.life=0}
   else if(!free(b.x,b.z,.08))b.life=0;
  }if(b.life<=0){b.entity.destroy();bolts.splice(i,1)}}
 /* Movement animates the robot visual above, no overriding glide bob. */
 ghost.head.rotateLocal(0,dt*40,dt*12);
 if(sector!==2&&ghostCd<=0){let far=hideouts.map((p,i)=>({i,d:dist(p,player.getPosition())})).sort((a,b)=>b.d-a.d),choice=far.find(q=>q.i!==ghost.index)||far[0];putGhost(choice.i);say('I HAVE RELOCATED. THE OLD SIGNAL IS NOW A MEMORY.',4);sound(240,.17)}
 if(t>15+aiIdx*22){aiIdx++;say(chatter[(aiIdx+sector*2)%chatter.length],4)}
 followCamera();lastUi+=dt;if(lastUi>.16){lastUi=0;renderMap();updateUI()}
}
let frames=0;app.on('update',dt=>{qa.frames++;step(Math.min(dt,.05))});
camera.setPosition(0,28,22);camera.lookAt(0,0,0);
$('load').style.display='none';qa.ready=true;qa.usingEngine='local PlayCanvas ESM';qa.start=restart;qa.scan=scanNow;qa.pulse=pulseNow;qa.bolt=boltNow;qa.phase=phaseNow;qa.act=actionNow;qa.state=()=>({ready:qa.ready,worldType:qa.worldType,cameraMode:cameraView,cameraYaw:fpsYaw,cameraDistance,sector:sector+1,fragments:fragmentCount,bossHealth,pulses,pulseCd,scanCd,health,score,drones:drones.length,droneKills,phaseFloor,phaseCd,boltCd,active,paused,puzzleOpen,complete:qa.complete,credits,orbPower,weaponTier,weaponName:weaponNames[weaponTier],laserDamage:laserDamage(),laserTickDamage:laserTickDamage(),laserTicks,laserHeld:firingLaser(),laserHoldTime,shiftChips,shiftRank:shiftRank(),shiftPierces:qa.shiftPierces||0,shiftNovas:qa.shiftNovas||0,opticEmitters:player?.eyeEmitters?.length||0,audioState:sfx.state,deviceMode:controls.mode,gamepadProfile:controls.profile,gamepadSprinting:controls.sprinting,aiming:controls.aiming,guideOpen:controllerGuideOpen,orbFlying,orbLanding,orbAltitude,lastMoveSpeed,hyperActive:hyperActive(),sideMissions:districtContracts.length,sideMissionsDone:districtContracts.filter(c=>c.done).length,streetProps:districtInfo?.streetProps||0,districtBuildings:districtInfo?.buildingCount||0,districtModels:districtInfo?.modelStatus||null,districtSize:districtInfo?.bounds||null,districtShops:districtShops.map(x=>({x:x.x,z:x.z})),districtContracts:districtContracts.map(c=>({x:c.x,z:c.z,done:c.done,reward:c.reward})),electricArcCount:player?.electricArcs?.length||0,enemyTypes:drones.map(x=>x.kind),enemyHP:drones.map(x=>x.hp)});
const preview=new URLSearchParams(location.search);if(preview.has('preview')&&['192.168.1.211','192.168.1.208','127.0.0.1','localhost'].includes(location.hostname)){$('menu').classList.add('hidden');restart(Math.max(0,Math.min(2,Number(preview.get('preview'))||0)))}
if(new URLSearchParams(location.search).has('qa')&&['100.122.234.50','192.168.1.211','192.168.1.208','127.0.0.1','localhost'].includes(location.hostname)){qa.test={position:()=>{const p=player.getPosition();return{x:p.x,z:p.z}},toTrace:i=>{const p=terminals[i];if(!p||p.done)throw Error('trace not available');player.setPosition(p.x,p.y||0,p.z);phaseFloor=Math.round((p.y||0)/4);followCamera(1)},toGhost:()=>{const p=ghost.entity.getPosition();player.setPosition(p.x+1.4,0,p.z);phaseFloor=0;followCamera(1)},relocate:()=>{putGhost((ghost.index+1)%hideouts.length);return ghost.index},invincible:()=>{immune=1000},aimAtDrone:i=>{const d=drones[i];if(!d)throw Error('drone absent');const p=player.getPosition();fpsYaw=aimAngleTo(d,p);followCamera(1);return {yaw:fpsYaw,droneHp:d.hp}},toDrone:i=>{const d=drones[i];if(!d)throw Error('drone absent');phaseFloor=Math.round((d.alt||0)/4);player.setPosition(d.x,(d.alt||0),d.z+6);fpsYaw=0;followCamera(1);return{hp:d.hp,x:d.x,z:d.z}},phaseAtGate:i=>{const g=phaseGates[i];if(!g)throw Error('phase gate missing');phaseFloor=g.floor;phaseCd=0;player.setPosition(g.x,g.floor*4,g.z);phaseNow();return{floor:phaseFloor,playerY:player.getPosition().y}},advance:seconds=>{const count=Math.ceil(seconds/.05);for(let i=0;i<count;i++)step(.05)},damage:d=>{immune=0;hit(d)},toLoot:i=>{const c=caches[i]&&!caches[i].taken?caches[i]:caches.find(x=>!x.taken);if(!c)throw Error('all loot collected');player.setPosition(c.x,0,c.z);followCamera(1)},toShop:()=>{const s=districtShops[0];if(!s)throw Error('shop unavailable');player.setPosition(s.x,0,s.z);followCamera(1)},toContract:i=>{const c=districtContracts[i];if(!c)throw Error('mission unavailable');player.setPosition(c.x,0,c.z);orbAltitude=0;followCamera(1)},toggleFlight,setPosition:(x,z)=>{player.setPosition(x,0,z);followCamera(1)},canMove:(x,z)=>free(x,z),cameraPosition:()=>{const p=camera.getPosition();return{x:p.x,y:p.y,z:p.z}},
 robotRig:()=>({rigged:!!player.robotRigged,visualPitch:player.robotVisual.getLocalEulerAngles().x,blend:player.robotFlightBlend||0,armLeft:player.lArm.getLocalEulerAngles().x,armRight:player.rArm.getLocalEulerAngles().x,legLeft:player.lLeg.getLocalEulerAngles().x,legRight:player.rLeg.getLocalEulerAngles().x}),
 enemyPositions:()=>drones.map(d=>({kind:d.kind,x:d.x,z:d.z,alt:d.alt||0,range:enemyFireRange(d)})),
 setAirborne:(alt)=>{if(sector!==2)throw Error('level 3 only');orbFlying=true;orbLanding=false;orbAltitude=clamp(alt,1.8,42);const p=player.getPosition();player.setPosition(p.x,orbAltitude,p.z);document.body.classList.add('orb-flying');return orbAltitude},
 fireEnemyAt:(i)=>{const d=drones[i];if(!d)throw Error('enemy missing');const before=bolts.length;return{fired:fire(d),newProjectiles:bolts.slice(before).map(b=>({y:b.y,dy:b.dy}))}},
 setShiftChips:value=>{shiftChips=Math.max(0,Math.floor(Number(value)||0));weaponTier=Math.max(weaponTier,shiftRank());refreshLaserRig();saveOrbProgress();updateUI();return{chips:shiftChips,rank:shiftRank()}},
 setWeaponTier:value=>{weaponTier=Math.max(0,Math.min(3,Number(value)||0));refreshLaserRig();saveOrbProgress();updateUI();return {tier:weaponTier,power:laserDamage()}},
 eyePositions:()=>player?.eyeEmitters?.map(e=>{const p=e.getPosition();return {x:p.x,y:p.y,z:p.z}})||[],
 laserTraces:()=>boltFx.filter(f=>f.entity.name==='OPTIC LASER TRACE').length,
 moduleState:()=>player?.weaponModules?.map(e=>e._enabled===true)||[],
 moduleDebug:()=>({tier:weaponTier,robot:player?.name,appRoot:{enabled:app.root.enabled,own:app.root._enabled},world:{enabled:world.enabled,own:world._enabled,parent:world.parent?.name},player:{enabled:player?.enabled,own:player?._enabled},visual:{enabled:player?.robotVisual?.enabled,own:player?.robotVisual?._enabled},visualEnabled:player?.robotVisual?.enabled,parent:player?.parent?.name,modules:player?.weaponModules?.map((e,i)=>({name:e.name,enabled:e.enabled,own:e._enabled,parent:e.parent?.name,expected:weaponTier>i}))||[]}),
 targetState:()=>({traces:terminals.map(t=>({done:t.done,x:t.x,z:t.z})),hiding:ghost.index,hideouts:hideouts.length,loot:caches.length,pulses,shields,scanCd,pulseCd})};}
