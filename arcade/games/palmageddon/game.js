import * as pc from './vendor/playcanvas.mjs';
import {createAudioEngine} from './audio_v7.js';
// PALMAGEDDON: brand-new PlayCanvas/Blender 3D implementation, isolated from retired 2D build.
// Real exported Blender GLB meshes; mobile-first touch UI; no external fonts/artwork/dependencies.
const $=id=>document.getElementById(id);
const stage=$('stage'),canvas=$('game'),panel=$('panel'),begin=$('begin');
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const lerp=(a,b,t)=>a+(b-a)*clamp(t,0,1);
const ease=t=>t*t*(3-2*t);
const qa=window.__palmQA={booted:false,ready:false,modelsLoaded:0,pivots:0,frames:0,playerHits:0,enemyHits:0,win:false,loss:false,shaderSystem:'PlayCanvas StandardMaterial PBR GLSL',errors:[],mode:'loading',orientation:'portrait',resizes:0};
const view={wide:false,camY:2.04,camZ:3.9,lookY:1.2};
let cameraReady=false;
let app;
try{
 app=new pc.Application(canvas,{graphicsDeviceOptions:{alpha:false,antialias:true,preserveDrawingBuffer:true}});
 app.setCanvasFillMode(pc.FILLMODE_NONE);
 app.setCanvasResolution(pc.RESOLUTION_AUTO);
 app.graphicsDevice.maxPixelRatio=Math.min(window.devicePixelRatio||1,1.35);
 app.scene.ambientLight=new pc.Color(.25,.26,.29);
 app.start();
 qa.booted=true;
}catch(e){
 qa.errors.push('WebGL initialization: '+e.message);
 panel.querySelector('h2').textContent='GAME UNAVAILABLE';
 begin.textContent='TRY ANOTHER BROWSER';
 throw e;
}
const rgb=hex=>new pc.Color(((hex>>16)&255)/255,((hex>>8)&255)/255,(hex&255)/255);
function resize(){
 const w=Math.round(stage.clientWidth),h=Math.round(stage.clientHeight);
 if(!w||!h)return;
 // Landscape has its own responsive HUD and camera composition.
 // Geometry, health, timer, turn and animation state are never recreated.
 const wide=w/h>1.10;
 view.wide=wide;
 view.camY=wide?1.88:2.04;
 view.camZ=wide?3.30:3.90;
 view.lookY=wide?1.13:1.20;
 qa.orientation=wide?'landscape':'portrait';
 qa.viewport={width:w,height:h};
 qa.resizes++;
 if(cameraReady)camera.camera.fov=wide?52:55;
 app.resizeCanvas(w,h);
}
const camera=new pc.Entity('Adaptive Championship Camera');
camera.addComponent('camera',{clearColor:rgb(0x15191d),fov:55,nearClip:.09,farClip:140});
app.root.addChild(camera);
cameraReady=true;
resize();
window.addEventListener('resize',resize,{passive:true});
if(window.visualViewport)window.visualViewport.addEventListener('resize',resize,{passive:true});
if(window.ResizeObserver)new ResizeObserver(resize).observe(stage);
if(window.screen?.orientation?.addEventListener)window.screen.orientation.addEventListener('change',resize);
camera.setPosition(0,view.camY,view.camZ);camera.lookAt(0,view.lookY,0);
function light(name,type,color,intensity,pos,rot,range){
 const e=new pc.Entity(name);
 e.addComponent('light',{type,color:rgb(color),intensity,range:range||24,castShadows:false});
 if(pos)e.setPosition(...pos);if(rot)e.setEulerAngles(...rot);
 app.root.addChild(e);return e;
}
light('Soft studio key','directional',0xffeedb,1.15,[0,6,0],[45,20,0]);
light('Neutral studio fill','directional',0xd4e0eb,.62,[0,5,0],[35,-155,0]);
light('Warm stage spill left','point',0xffdbaf,2.2,[-3,4,2],null,14);
light('Natural cool spill right','point',0xe2f0ff,2.0,[3,4,2],null,14);
const LEVELS=[
 {venue:'BASEMENT GYM',rival:'MITTENS McFURY',hp:100,cameraX:0,windup:1450,attack:10},
 {venue:'BASKETBALL COURT',rival:'COACH RIVERA',hp:114,cameraX:.16,windup:1230,attack:13},
 {venue:'STREET SLAP-OFF',rival:'IRON MALIK',hp:127,cameraX:-.17,windup:1070,attack:16},
 {venue:'CHAMPIONSHIP ARENA',rival:'VANCE STONE',hp:140,cameraX:0,windup:900,attack:20}
];
let levelIndex=0,maxEnemyHP=100,arenas=[],opponents=[];
let arena,player,enemy,playerSlapPivot,enemySlapPivot,playerArmRest,enemyArmRest,playerSpine,enemySpine,playerSpineRest,enemySpineRest;
Object.assign(qa,{level:1,totalLevels:LEVELS.length,venue:LEVELS[0].venue,opponent:LEVELS[0].rival,levelsCleared:0});
function loadAsset(name,url){
 return new Promise((resolve,reject)=>{
  const asset=new pc.Asset(name,'container',{url});
  app.assets.add(asset);
  asset.ready(()=>{
   try{
    const ent=asset.resource.instantiateRenderEntity();
    ent.name=name;
    app.root.addChild(ent);
    ent.enabled=false;
    qa.modelsLoaded++;
    resolve(ent);
   }catch(e){reject(e);}
  });
  asset.on('error',e=>reject(e));
  app.assets.load(asset);
 });
}
const objects=Promise.all([
 loadAsset('BASEMENT BLENDER STAGE','./assets/basement_slap_stage.glb'),
 loadAsset('BASKETBALL COURT BLENDER STAGE','./assets/basketball_slap_stage.glb'),
 loadAsset('STREET BLENDER STAGE','./assets/street_slap_stage.glb'),
 loadAsset('CHAMPIONSHIP BLENDER STAGE','./assets/real_slap_stage.glb'),
 loadAsset('PLAYER HUMAN VOLT VIPER','./assets/VOLT_VIPER_REAL.glb'),
 loadAsset('BASEMENT HUMAN MITTENS','./assets/MITTENS_MCFURY_REAL.glb'),
 loadAsset('COURT HUMAN COACH RIVERA','./assets/COACH_RIVERA_REAL.glb'),
 loadAsset('STREET HUMAN IRON MALIK','./assets/IRON_MALIK_REAL.glb'),
 loadAsset('ARENA HUMAN VANCE STONE','./assets/VANCE_STONE_REAL.glb')
]);
let mode='loading',elapsed=0,lastImpact=0,enemyStage=0;
let turn='loading',round=1,turnUntil=0,enemyAttackAt=0;
Object.assign(qa,{turn:'loading',round:1,lastAccuracy:0,lastDamage:0,ignoredSlaps:0,turnHistory:[]});
let myHP=100,enemyHP=100,streak=0,maxStreak=0,perfects=0,hits=0;
let slapCooldown=0,dodgeCooldown=0,dodgeEnd=0,guard=false;
let guardUntil=0,defenseUsed=false,defenseType='none';
Object.assign(qa,{defenseType:'none',blocked:0,dodged:0,missedGuards:0,missedDodges:0,defenseAttempts:0});
let impactP=0,impactE=0,swingP=0,swingE=0,baseShake=0,announceUntil=0;
const soundEngine=createAudioEngine();
let soundMode=0;
qa.audio=soundEngine.status;
function updateSoundButton(){
 const button=$('sound');
 button.textContent=['🔊','🔉','🔇'][soundMode];
 button.setAttribute('aria-label',['Music and effects on. Tap for effects only.','Effects only. Tap to mute.','Muted. Tap to enable music and effects.'][soundMode]);
 button.title=['MUSIC + EFFECTS','EFFECTS ONLY','MUTED'][soundMode];
 button.setAttribute('data-mode',['both','fx','muted'][soundMode]);
}
const hpMe=$('hpMeNum'),hpThem=$('hpThemNum'),myFill=$('myHP'),themFill=$('enemyHP');
const needle=$('needle'),comboEl=$('combo'),callout=$('callout'),countdown=$('countdown');
let impactClear=null;
function animateImpact(label,strength,onPlayer){
 const x=$('impactText');
 x.textContent=label;
 x.className='hit-number '+strength+(onPlayer?' incoming':'');
 // Remove and re-add the class for every turn's independently timed hit effect.
 void x.offsetWidth;
 x.classList.add('show');
 if(impactClear)clearTimeout(impactClear);
 impactClear=setTimeout(()=>{x.classList.remove('show');},590);
}
const actions=['slap','guard','dodge'].map($);
function audioFx(freq=400,seconds=.13,wave='triangle',gain=.08){
 soundEngine.tone(freq,seconds,wave,gain);
}
$('sound').addEventListener('click',()=>{
 soundMode=(soundMode+1)%3;
 soundEngine.setMode(soundMode);
 updateSoundButton();
 qa.audio=soundEngine.status;
});
updateSoundButton();
function shout(s,duration=900){callout.textContent=s;announceUntil=elapsed+duration;}
function updateHP(){
 myFill.style.width=myHP+'%';themFill.style.width=(100*enemyHP/maxEnemyHP)+'%';
 hpMe.textContent=Math.ceil(myHP);hpThem.textContent=Math.ceil(enemyHP);
 comboEl.textContent='STREAK ×'+streak;
}
function meter(){
 const speed=.0043*(1+levelIndex*.20+Math.min(.72,(round-1)*.10)+Math.min(.18,streak*.025));
 return (Math.sin(elapsed*speed-Math.PI/2)+1)*.5;
}
function setTurn(next){
 turn=next;qa.turn=next;qa.round=round;
 qa.turnHistory.push(next);
 if(qa.turnHistory.length>80)qa.turnHistory.shift();
 $('slap').disabled=next!=='player_ready';
 $('guard').disabled=next!=='enemy_windup'||defenseUsed;
 $('dodge').disabled=next!=='enemy_windup'||defenseUsed;
 if(next==='enemy_windup'){defenseUsed=false;defenseType='none';guard=false;guardUntil=0;dodgeEnd=0;qa.defenseType='none';$('guard').disabled=false;$('dodge').disabled=false;}
 else{guard=false;guardUntil=0;$('guard').classList.remove('pressed');}
}
function activateLevel(){
 const cfg=LEVELS[levelIndex];
 soundEngine.setLevel(levelIndex);
 arenas.forEach((a,i)=>{a.enabled=i===levelIndex;});
 opponents.forEach((a,i)=>{a.enabled=i===levelIndex;});
 if(player)player.enabled=true;
 arena=arenas[levelIndex];enemy=opponents[levelIndex];
 enemySlapPivot=enemy.findByName('LeftArm');
 enemySpine=enemy.findByName('Spine');
 enemyArmRest=enemySlapPivot?.getLocalRotation().clone();
 enemySpineRest=enemySpine?.getLocalRotation().clone();
 if(!enemySlapPivot||!enemySpine)throw Error('Rival human rig bones missing for '+cfg.rival);
 maxEnemyHP=cfg.hp;
 qa.level=levelIndex+1;qa.venue=cfg.venue;qa.opponent=cfg.rival;
 $('enemyLabel').textContent=cfg.rival;
 $('venueLabel').textContent='LEVEL '+(levelIndex+1)+' / '+LEVELS.length+' · '+cfg.venue;
}
function reset(){
 activateLevel();
 mode='fight';qa.mode=mode;qa.playerHits=0;qa.enemyHits=0;qa.win=false;qa.loss=false;
 elapsed=0;myHP=100;enemyHP=maxEnemyHP;streak=0;maxStreak=0;hits=0;perfects=0;
 round=1;turnUntil=0;enemyAttackAt=0;
 qa.turnHistory=[];qa.ignoredSlaps=0;qa.lastAccuracy=0;qa.lastDamage=0;
 dodgeCooldown=0;dodgeEnd=0;slapCooldown=0;guard=false;guardUntil=0;defenseUsed=false;defenseType='none';
 qa.blocked=0;qa.dodged=0;qa.missedGuards=0;qa.missedDodges=0;qa.defenseAttempts=0;
 impactP=0;impactE=0;swingP=0;swingE=0;baseShake=0;enemyStage=0;
 player.setPosition(-.50,.0,0);enemy.setPosition(.50,.0,0);
 player.setEulerAngles(0,90,0);enemy.setEulerAngles(0,-90,0);
 panel.classList.add('hide');
 $('guard').classList.remove('pressed');
 setTurn('player_ready');
 shout('YOUR TURN!',1100);updateHP();audioFx(660,.23,'sine',.1);
}
function end(won){
 mode=won?'won':'lost';qa.mode=mode;qa.win=won;qa.loss=!won;setTurn('finished');
 panel.classList.remove('hide');
 panel.querySelector('h1').textContent='PALMAGEDDON';
 panel.querySelector('h2').textContent=won?(levelIndex===LEVELS.length-1?'👑 CHAMPION!':'🏆 YOU WIN!'):'💥 YOU LOSE';
 panel.querySelector('p').textContent=won?
  (levelIndex===LEVELS.length-1?'The crown is yours!':'Next up: '+LEVELS[levelIndex+1].rival+'.'):
  'Ready for another round?';
 begin.textContent=won?(levelIndex===LEVELS.length-1?'RESTART CHAMPIONSHIP 👋':'NEXT VENUE ⚡'):'RETRY THIS VENUE ⚡';
 if(won)qa.levelsCleared=Math.max(qa.levelsCleared,levelIndex+1);
 begin.disabled=false;audioFx(won?850:180,.35,won?'sine':'sawtooth',.12);soundEngine.stinger(won);
}
function playerSlap(){
 if(mode!=='fight'||turn!=='player_ready'){qa.ignoredSlaps++;return;}
 hits++;qa.playerHits=hits;
 const offset=Math.abs(meter()-.5);
 const closeness=clamp(1-offset/.5,0,1);
 // Continuous proximity scoring: worst timing 3 HP, exact center 41 HP.
 const dmg=Math.round(3+38*Math.pow(closeness,2.15));
 const perfect=offset<=.045,good=offset<=.17;
 qa.lastAccuracy=Math.round(closeness*100);
 qa.lastDamage=dmg;
 if(perfect){streak++;perfects++;shout('⚡ PERFECT!',800);audioFx(530,.18,'sawtooth',.12);}
 else if(good){streak++;shout('GOOD HIT!',750);audioFx(345,.15,'triangle',.11);}
 else{streak=0;shout('GLANCING HIT!',700);audioFx(215,.1,'square',.07);}
 maxStreak=Math.max(maxStreak,streak);
 enemyHP=clamp(enemyHP-dmg,0,maxEnemyHP);
 soundEngine.slap(dmg,false);
 animateImpact('-'+dmg,perfect?'perfect':good?'strong':'normal',false);
 swingP=elapsed+390;impactE=elapsed+430;baseShake=dmg/30;
 $('flash').style.background=perfect?'#b6ffe0':'#ffcbb5';
 if(navigator.vibrate&&perfect)navigator.vibrate(35);
 setTurn('player_anim');
 turnUntil=elapsed+540;
 updateHP();
 if(enemyHP<=0)end(true);
}
function useDefense(kind){
 if(mode!=='fight'||turn!=='enemy_windup'||defenseUsed)return;
 defenseUsed=true;defenseType=kind;qa.defenseType=kind;qa.defenseAttempts++;
 $('guard').disabled=true;$('dodge').disabled=true;
 if(kind==='guard'){
  // A 360ms timed shield. Holding the button cannot extend this window.
  guardUntil=elapsed+360;guard=true;
  $('guard').classList.add('pressed');
  shout('🛡️ BLOCK!',510);
  audioFx(440,.080,'triangle',.05);
 }else{
  // A longer evasion window, balanced by its one-try-per-opponent-turn rule.
  dodgeEnd=elapsed+570;
  dodgeCooldown=enemyAttackAt+1000;
  shout('↪️ DODGE!',550);audioFx(640,.09,'sine',.06);
 }
}
function dodge(){useDefense('dodge');}
function timedGuard(){useDefense('guard');}
function enemySlap(){
 if(mode!=='fight'||turn!=='enemy_windup')return;
 qa.enemyHits++;
 const evaded=defenseType==='dodge'&&elapsed<dodgeEnd;
 const defended=defenseType==='guard'&&elapsed<=guardUntil;
 if(defenseType==='guard'){if(defended)qa.blocked++;else qa.missedGuards++;}
 if(defenseType==='dodge'){if(evaded)qa.dodged++;else qa.missedDodges++;}
 const damage=evaded?0:defended?2:Math.min(26,LEVELS[levelIndex].attack+round-1);
 myHP=clamp(myHP-damage,0,100);
 soundEngine.slap(damage,true,defended,evaded);
 if(!evaded)animateImpact(defended?'BLOCK':'-'+damage,defended?'guard':'normal',true);
 swingE=elapsed+420;impactP=elapsed+520;baseShake=damage/12;
 if(evaded){streak++;maxStreak=Math.max(maxStreak,streak);shout('💫 DODGED!',800);audioFx(700,.12,'sine',.1);}
 else if(defended){shout('🛡️ BLOCKED!',700);audioFx(165,.19,'triangle',.08);}
 else{streak=0;shout(defenseUsed?'TOO EARLY!':'💥 HIT!',800);audioFx(115,.21,'sawtooth',.13);if(navigator.vibrate)navigator.vibrate(55);}
 setTurn('enemy_recover');
 turnUntil=elapsed+700;
 updateHP();if(myHP<=0)end(false);
}
function bindTap(id,fn){
 const el=$(id);
 el.addEventListener('pointerdown',ev=>{ev.preventDefault();fn();});
}
bindTap('slap',playerSlap);bindTap('dodge',dodge);
const guardBtn=$('guard');
guardBtn.addEventListener('pointerdown',ev=>{ev.preventDefault();timedGuard();});
// Button release deliberately does not change fixed-duration block state.
// This prevents holding or rotating the tablet from exploiting an indefinite guard.
window.addEventListener('keydown',ev=>{
 if(ev.repeat)return;
 if(ev.code==='Space'){ev.preventDefault();playerSlap();}
 if(ev.code==='KeyG')timedGuard();
 if(ev.code==='KeyD')dodge();
});
begin.addEventListener('click',()=>{
 if(!qa.ready)return;
 soundEngine.unlock();
 if(mode==='won')levelIndex=(levelIndex+1)%LEVELS.length;
 reset();
});
app.on('update',dt=>{
 qa.frames++;
 soundEngine.update(mode==='fight');
 qa.audio=soundEngine.status;
 const delta=Math.min(dt*1000,50);
 if(mode==='fight'){
  elapsed+=delta;
  if(turn==='player_anim'&&elapsed>=turnUntil){
   setTurn('enemy_windup');
   enemyAttackAt=elapsed+Math.max(580,LEVELS[levelIndex].windup-(round-1)*75);
   shout('THEIR TURN!',900);
  }
  if(turn==='enemy_windup'){
   const until=enemyAttackAt-elapsed;
   if(defenseType==='guard'&&guard&&elapsed>guardUntil){guard=false;$('guard').classList.remove('pressed');}
   if(until<=0)enemySlap();
   else if(until<360)countdown.textContent='BLOCK!';
   else if(until<570)countdown.textContent='DODGE!';
   else countdown.textContent='INCOMING…';
  }else if(turn==='enemy_recover'&&elapsed>=turnUntil){
   round++;
   setTurn('player_ready');
   shout('YOUR TURN!',850);
  }
  if(turn==='player_ready')countdown.textContent='YOUR TURN';
  else if(turn==='player_anim')countdown.textContent='THEIR TURN';
  else if(turn==='enemy_recover')countdown.textContent='GET READY';
  needle.style.left=(meter()*100)+'%';
  if(elapsed>announceUntil)callout.textContent='';
 }
 if(!player||!enemy)return;
 const t=elapsed*.001;
 const impulseP=Math.max(0,(swingP-elapsed)/390),impulseE=Math.max(0,(swingE-elapsed)/420);
 const pAngle=102*Math.sin((1-impulseP)*Math.PI)*(swingP>elapsed?1:0);
 const eAngle=102*Math.sin((1-impulseE)*Math.PI)*(swingE>elapsed?1:0);
 if(playerSlapPivot){const swing=new pc.Quat().setFromEulerAngles(pAngle,0,0);playerSlapPivot.setLocalRotation(playerArmRest.clone().mul(swing));}
 if(enemySlapPivot){const swing=new pc.Quat().setFromEulerAngles(eAngle,0,0);enemySlapPivot.setLocalRotation(enemyArmRest.clone().mul(swing));}
 const attackLeanP=swingP>elapsed?Math.sin((1-impulseP)*Math.PI)*5:0;
 const attackLeanE=swingE>elapsed?Math.sin((1-impulseE)*Math.PI)*5:0;
 const enemyRecoil=impactE>elapsed&&impactE-elapsed<250?-13*Math.sin((1-(impactE-elapsed)/250)*Math.PI):0;
 if(playerSpine&&playerSpineRest)playerSpine.setLocalRotation(playerSpineRest.clone().mul(new pc.Quat().setFromEulerAngles(attackLeanP,0,0)));
 if(enemySpine&&enemySpineRest)enemySpine.setLocalRotation(enemySpineRest.clone().mul(new pc.Quat().setFromEulerAngles(attackLeanE+enemyRecoil,0,0)));
 const staggerP=impactP>elapsed?Math.sin((impactP-elapsed)*.038)*.105*(impactP-elapsed)/520:0;
 const staggerE=impactE>elapsed?Math.sin((impactE-elapsed)*.039)*.13*(impactE-elapsed)/430:0;
 player.setLocalPosition(-.50+(swingP>elapsed?.25*Math.sin(Math.PI*(swingP-elapsed)/390):0)+(dodgeEnd>elapsed?-.28*Math.sin(Math.PI*(dodgeEnd-elapsed)/720):0)+staggerP,.0+Math.sin(t*3.4)*.009,0);
 enemy.setLocalPosition(.50+staggerE,.0+Math.sin(t*3.8+.6)*.009,0);
 player.setLocalEulerAngles(0,90,staggerP*10);
 enemy.setLocalEulerAngles(0,-90,staggerE*10+Math.sin(t*3)*.7);
 camera.setPosition(LEVELS[levelIndex].cameraX+Math.sin(t*1.2)*.036+Math.sin(t*60)*baseShake*.01,view.camY,view.camZ);
 camera.lookAt(0,view.lookY,0);
 baseShake=Math.max(0,baseShake-dt*3);
 const flash=Math.max(impactP-elapsed,impactE-elapsed,0);
 $('flash').style.opacity=flash>0?Math.min(.20,flash/400*.16).toFixed(3):'0';
});
objects.then((entities)=>{
 arenas=entities.slice(0,4);
 player=entities[4];
 opponents=entities.slice(5);
 playerSlapPivot=player.findByName('RightArm');
 playerArmRest=playerSlapPivot?.getLocalRotation().clone();
 playerSpine=player.findByName('Spine');
 playerSpineRest=playerSpine?.getLocalRotation().clone();
 qa.pivots=Number(!!playerSlapPivot)+Number(!!playerArmRest);
 qa.spines=Number(!!playerSpine)+Number(!!playerSpineRest);
 if(!playerSlapPivot||!playerSpine||opponents.length!==4||arenas.length!==4)throw Error('Campaign rigs and GLB stage validation failed');
 player.setPosition(-.50,0,0);
 player.setEulerAngles(0,90,0);
 levelIndex=0;
 activateLevel();
 enemy.setPosition(.50,0,0);
 enemy.setEulerAngles(0,-90,0);
 qa.ready=true;qa.mode=mode='menu';
 begin.disabled=false;begin.textContent='ENTER THE BASEMENT ⚡';
 $('smoke').textContent='';
 setTimeout(()=>{$('smoke').textContent='';},5000);
}).catch(e=>{
 qa.errors.push(String(e));console.error('PALMAGEDDON 3D ASSET FAILURE',e);
 panel.querySelector('h2').textContent='UNABLE TO LOAD';
 begin.textContent='TRY AGAIN';
 $('smoke').textContent='';
});
