import * as pc from './vendor/playcanvas.mjs';



const $=id=>document.getElementById(id);

const canvas=$('game');

const qa=window.__RIFT_QA__={ready:false,mode:'loading',models:{},errors:[],portalOpenCount:0,arenaEntered:0,exitPortalsEntered:0,shots:0,slashes:0,dashes:0,blinks:0,bubbles:0,kills:0,pickups:0,chainWhips:0,chainHits:0,laserLength:0,laserShots:0,activeChainLinks:0};

let app,worlds=[],stage=null,stageIndex=0,mode='loading',paused=false,gameTime=0,clock=0,timeLeft=72,energy=100,health=100,combo=0,boost=0,speed=25,progress=0,seed=13013,playerX=0,steeringX=0,yaw=0,movement={x:0,y:0},shotWait=0,slashWait=0,dashWait=0,blinkWait=0,warpWait=0,invuln=0,portalTimer=0,nextStage=null,riftOpened=false,toastTimer=0,frame=0,cameraShake=0,holdingTime=false,pausedBefore='run';

let runPhase=0,actorYaw=0,actorMove=0,arenaWave=0,arenaKills=0,arenaNextWaveDelay=0,arenaScenes={},runnerWorld,arenaWorld,player,rift,arena,segments=[],enemies=[],drones=[],rings=[],particles=[],chainStrikes=[],fx,pointLight;

const res={},modelled={};

const objects={};

const pos=(e,x,y,z)=>e.setPosition(x,y,z);

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

const dist=(x,z,x2,z2)=>Math.hypot(x-x2,z-z2);

const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};

const heroX=()=>player.getPosition().x;

const heroZ=()=>player.getPosition().z;

const inArena=()=>mode.startsWith('arena');

const inRun=()=>mode==='run'||mode==='run-rift';

const qaMode=new URLSearchParams(window.location.search).has('qa');



function fail(where,error){

 const message=where+': '+String(error);

 qa.errors.push(message);console.error('TIMEBREAKER REDLINE ERROR',where,error);

 $('title').textContent='WORLD LOAD FAILED';$('description').textContent=message;$('play').disabled=true;

}

function state(){

 qa.mode=mode;qa.stageId=stage?.id;qa.stageIndex=stageIndex;qa.energy=energy;qa.health=health;qa.combo=combo;qa.boost=boost;qa.speed=speed+boost;

 qa.timeLeft=timeLeft;qa.progress=progress;qa.totalStages=worlds.length;qa.completedArenaKills=arenaKills;qa.arenaWave=arenaWave+1;qa.totalWaves=stage?.enemies?.waves?.length||1;qa.waveDelay=arenaNextWaveDelay;qa.activeArenaScene=stage?.scene;qa.player={x:heroX(),z:heroZ()};qa.enemyCount=enemies.length;qa.droneCount=drones.length;qa.portalVisible=rift?.enabled||false;qa.ready=!!player&&!!stage;qa.paused=paused;qa.riftOpened=riftOpened;qa.activeChainLinks=chainStrikes.reduce((n,a)=>n+a.links.length,0);qa.weaponStowed=chainStrikes.length===0;qa.productionPBR=!!res.chronospine_tunnel;qa.renderAssetCount=modelled.hero||0;qa.facingDegrees=actorYaw*180/Math.PI;qa.runGait=runPhase;qa.rigLegs=Boolean(player?.findByName('LegPivot_L')&&player?.findByName('LegPivot_R'));qa.cameraYaw=yaw;qa.legSwingL=player?.findByName("LegPivot_L")?.getLocalEulerAngles().x??null;qa.legSwingR=player?.findByName("LegPivot_R")?.getLocalEulerAngles().x??null;qa.rigArms=Boolean(player?.findByName('ArmPivot_L')&&player?.findByName('ArmPivot_R'));

 return qa;

}

function message(text,seconds=1.5){

 $('toast').textContent=text;$('toast').classList.add('show');toastTimer=seconds;

}

function flash(){

 $('transition').classList.add('flash');

 setTimeout(()=>$('transition').classList.remove('flash'),210);

}

function setOverlay(title,description,cta){

 $('title').innerHTML=title;$('description').innerHTML=description;$('play').textContent=cta;$('play').disabled=false;$('overlay').classList.remove('hidden');

}

function clearActors(){

 for(const list of [drones,rings,enemies,particles]){for(const o of list)o.entity?.destroy();list.length=0}
 for(const a of chainStrikes)for(const link of a.links)link.destroy();chainStrikes.length=0;

}

function setStage(index,{save=true}={}){

 stageIndex=index;stage=worlds[index];if(!stage)throw Error('unknown stage index '+index);

 paused=false;holdingTime=false;mode=stage.type==='runner'?'run':'arena';

 speed=stage.baseSpeed||0;boost=0;progress=0;combo=0;timeLeft=stage.timeLimit||105;energy=100;health=100;

 steeringX=0;playerX=0;movement.x=0;movement.y=0;yaw=0;actorYaw=0;runPhase=0;actorMove=0;arenaWave=0;arenaKills=0;arenaNextWaveDelay=0;riftOpened=false;shotWait=0;dashWait=0;slashWait=0;blinkWait=0;warpWait=0;invuln=0;clock=0;

 clearActors();rift.enabled=false;

 runnerWorld.enabled=mode==='run';arenaWorld.enabled=mode==='arena';
 for(const [asset,obj] of Object.entries(arenaScenes))obj.enabled=(mode==='arena'&&asset===stage.scene);
 if(mode==='arena'&&!arenaScenes[stage.scene])throw Error('No matching true 3D world GLB for '+stage.scene);

 segments.forEach((e,i)=>pos(e,0,0,-i*32));

 if(mode==='run')pos(player,0,.12,3.2);

 else{pos(player,stage.playerStart?.x||0,.12,stage.playerStart?.z||8);createEnemies()}

 cameraMode(0);

 $('arenaControls').classList.toggle('active',mode==='arena');

 $('runActions').style.display=mode==='arena'?'none':'flex';

 $('help').style.display=mode==='arena'?'none':'block';

 $('interact').style.display='none';$('overlay').classList.add('hidden');

 if(save){try{localStorage.setItem('timebreaker:redline:checkpoint:v4',stage.id)}catch(e){}}

 message(stage.world+' · '+stage.title,2.0);

 updateUI();state();

}

function cameraMode(dt){

 const x=heroX(),z=heroZ(),s=Math.min(1,dt*6);

 let tx,ty,tz,lookX,lookY,lookZ;

 if(inRun()||mode==='transition-from-run'){

  tx=x*.31;ty=6.15;tz=10.35;

  lookX=x*.22;lookY=1.50;lookZ=-11.8;

 }else{

  const forward={x:Math.sin(yaw),z:-Math.cos(yaw)};

  tx=x-forward.x*9.3;ty=8.8;tz=z-forward.z*9.3;lookX=x+forward.x*2.8;lookY=1.25;lookZ=z+forward.z*2.8;

 }

 if(cameraShake>0){tx+=(rand()-.5)*cameraShake*.2;ty+=(rand()-.5)*cameraShake*.18}

 let cur=camera.getPosition();pos(camera,cur.x+(tx-cur.x)*s,cur.y+(ty-cur.y)*s,cur.z+(tz-cur.z)*s);camera.lookAt(lookX,lookY,lookZ);

}

function announceObjective(){

 if(mode==='run')return 'RUN THROUGH TIME · '+Math.round(progress)+' / '+stage.distance+'m';

 if(mode==='run-rift')return 'SWIPE UP TO SLASH OPEN THE TIME RIFT';

 if(mode==='arena')return stage.objective.description+' · '+arenaKills+' / '+stage.objective.count+' · WAVE '+(arenaWave+1)+' / '+(stage.enemies?.waves?.length||1);

 if(mode==='arena-portal')return 'PORTAL UNLOCKED · REACH IT & SLASH';

 if(mode.startsWith('transition'))return 'CUTTING THROUGH REALITY…';

 if(mode==='complete')return 'TIME RIFT JOURNEY COMPLETE';

 return 'RUN THROUGH TIME · FIGHT THROUGH WORLDS';

}

function updateUI(){

 $('worldName').textContent=stage?(stage.world+' · '+(stageIndex+1)+'/'+worlds.length):'LOADING WORLDS';

 $('objective').textContent=announceObjective();

 $('timer').textContent=Math.max(0,timeLeft).toFixed(1);

 $('timerbox').firstElementChild.textContent=mode==='arena'?'TIME TO CLEAR':'TIME LEFT';

 $('bar').style.width=(stage?.type==='arena'?arenaKills/(stage?.objective?.count||1):progress/(stage?.distance||1))*100+'%';

 $('speed').textContent=inRun()?Math.round((speed+boost)*6.4)+' KM/H':'FREE ROAM';

 $('energyText').textContent='TIME '+Math.round(energy)+'%';

 $('healthText').textContent='HP '+Math.round(health);

 $('comboText').textContent='COMBO ×'+Math.max(1,combo);

 $('timeBreak').disabled=!inRun()||energy<1;

 $('runWarp').disabled=!inRun()||energy<35||warpWait>0;

 $('warp').disabled=!inArena()||energy<35||warpWait>0;

 $('dash').disabled=!inArena()||energy<8||dashWait>0;

 $('blink').disabled=!inArena()||energy<20||blinkWait>0;

 $('slash').disabled=!inArena()||slashWait>0;

 $('interact').style.display=mode==='arena-portal'&&dist(heroX(),heroZ(),0,-12)<4?'block':'none';

 document.body.classList.toggle('timewarp',holdingTime||mode.startsWith('transition'));

}

function instantiate(asset,name,parent=app.root){

 const e=res[asset]?.resource.instantiateRenderEntity({castShadows:asset==='redline_warden_skinned',receiveShadows:true});

 if(!e)throw Error('GLB resource missing '+asset);

 e.name=name;parent.addChild(e);

 return e;

}

function setupModels(){

 runnerWorld=new pc.Entity('ORIGINAL TIMEBREAKER WORLD RUN');arenaWorld=new pc.Entity('SHATTERED CITY ARENA');

 app.root.addChild(runnerWorld);app.root.addChild(arenaWorld);

 player=instantiate('redline_warden_skinned','ORIGINAL CC0-SKINNED SXS REDLINE WARDEN');

 player.setLocalScale(1.22,1.22,1.22);

 modelled.hero=player.findComponents('render').length;
 const tracks=res.redline_warden_skinned.resource.animations;
 qa.realBoneAnimationAssets=tracks.length;qa.skinnedHeroMeshes=modelled.hero;
 if(tracks.length){
  player.addComponent('anim',{activate:true});
  player.anim.assignAnimation('RIFTWALKER_RUN_24FRAME_LOOP',tracks[0].resource);
  player.anim.baseLayer.transition('RIFTWALKER_RUN_24FRAME_LOOP',.08);
 }
 // The real skinned character's bone animation replaces the old fake pivot posing.
 const avatarSkin=player.findComponents('render').flatMap(r=>r.meshInstances).filter(m=>!!m.skinInstance).length;
 qa.actualSkinInstances=avatarSkin;

 for(let i=0;i<4;i++){const ent=instantiate('chronospine_tunnel','SXS PHYSICALLY UV-TEXTURED CHRONOSPINE TUBE '+i,runnerWorld);segments.push(ent);pos(ent,0,0,-i*32)}

 modelled.corridor=segments[0].findComponents('render').length;

 arena=instantiate('ruined_city_arena','BLENDER SHATTERED CITY ARENA',arenaWorld);
 arenaScenes.ruined_city_arena=arena;
 for(const asset of ['temporal_battlefield','time_factory','collapse_dimension']){
  arenaScenes[asset]=instantiate(asset,'SXS ORIGINAL 3D WORLD '+asset,arenaWorld);
  arenaScenes[asset].enabled=false;
 }

 modelled.arena=arena.findComponents('render').length;

 rift=instantiate('time_rift_gateway','SLASH-OPENED 3D TEMPORAL RIFT');

 modelled.rift=rift.findComponents('render').length;rift.enabled=false;rift.setLocalScale(1.3,1.3,1.3);

 for(const key of ['redline_warden_skinned','chronospine_tunnel','ruined_city_arena','temporal_battlefield','time_factory','collapse_dimension','temporal_marauder','time_rift_gateway'])qa.models[key]=!!res[key];

 if(modelled.hero<14||modelled.arena<50||modelled.rift<10)throw Error('Required original model detail missing '+JSON.stringify(modelled));

 const savedCheckpoint=(()=>{try{return localStorage.getItem('timebreaker:redline:checkpoint:v4')}catch(e){return null}})();
 qa.resumeStage=worlds.findIndex(w=>w.id===savedCheckpoint)>0?savedCheckpoint:null;
 setStage(0,{save:false});

 qa.ready=true;
 mode='menu';paused=true;holdingTime=false;state();

 $('play').disabled=false;$('play').textContent='RUN THROUGH TIME';

 setOverlay('TIME<br>BREAKER','<span class="guide-title">HOW TO PLAY</span><span class="guide-step"><strong>⚡ RUN</strong><span class="guide-detail">Slide left/right to dodge. Tap to fire your laser. Grab energy dots to speed up.</span></span><span class="guide-step"><strong>⛓️ CHAIN</strong><span class="guide-detail">Swipe UP to whip enemies. Hold TIME BREAK or tap WARP BUBBLE when charged.</span></span><span class="guide-step"><strong>🌀 RIFT</strong><span class="guide-detail">Reach the gateway, then swipe UP to slash open the portal.</span></span><span class="guide-step"><strong>⚔️ FIGHT</strong><span class="guide-detail">Use the left joystick to move and drag on the right to look. CHAIN, DASH, BLINK and WARP through foes.</span></span><span class="guide-foot">⏱ Beat the clock, finish each objective and enter the next portal.</span>',qa.resumeStage?'GOT IT · RESUME RIFT':'GOT IT · START RUN');

 $('runActions').style.display='none';$('arenaControls').classList.remove('active');

 mode='menu';state();

}

async function bootstrap(){

 try{

  const response=await fetch('./worlds.json',{cache:'no-store'});

  if(!response.ok)throw Error('world config HTTP '+response.status);

  const data=await response.json();worlds=data.stages;

  if(worlds.length<3||worlds[0].type!=='runner'||worlds[1].type!=='arena')throw Error('Invalid world graph');

  const names=['redline_warden_skinned','chronospine_tunnel','ruined_city_arena','temporal_battlefield','time_factory','collapse_dimension','temporal_marauder','time_rift_gateway','hazard_drone','pickup'];

  await Promise.all(names.map(name=>new Promise((resolve,reject)=>{

   app.assets.loadFromUrl('./assets/'+name+'.glb?v=10','container',(err,asset)=>{

    if(err){reject(new Error(name+': '+String(err)));return;}res[name]=asset;resolve();

   });

  })));

  setupModels();

 }catch(e){fail('World graph/assets',e)}

}

try{

 app=new pc.Application(canvas,{graphicsDeviceOptions:{alpha:false,antialias:true,preserveDrawingBuffer:true}});

 app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);app.setCanvasResolution(pc.RESOLUTION_AUTO);

 app.graphicsDevice.maxPixelRatio=Math.min(window.devicePixelRatio||1,1.38);

 app.scene.ambientLight=new pc.Color(.32,.39,.34);app.scene.toneMapping=pc.TONEMAP_ACES;

 app.scene.gammaCorrection=pc.GAMMA_SRGB;app.scene.exposure=1.10;app.start();
 try{qa.webglVersion=(typeof WebGL2RenderingContext!=='undefined'&&app.graphicsDevice.gl instanceof WebGL2RenderingContext)?2:1}catch(e){qa.webglVersion=0}

}catch(e){fail('WebGL setup',e);throw e}

const camera=new pc.Entity('responsive over-the-shoulder camera');

camera.addComponent('camera',{fov:69,nearClip:.1,farClip:155,clearColor:new pc.Color(.012,.022,.028)});app.root.addChild(camera);

pos(camera,0,6.15,10.35);camera.lookAt(0,1.50,-11.8);

for(const l of [{color:[.88,.95,.85],intensity:2.65,angle:[38,12,0]},{color:[1,.72,.45],intensity:1.0,angle:[10,150,0]},{color:[.28,.57,1],intensity:.55,angle:[-35,200,0]}]){

 const e=new pc.Entity('time rift stage directional light');

 e.addComponent('light',{type:'directional',color:new pc.Color(...l.color),intensity:l.intensity,castShadows:l.intensity>2.5,shadowResolution:768,shadowDistance:34,normalOffsetBias:.06});

 e.setEulerAngles(...l.angle);app.root.addChild(e);

}

pointLight=new pc.Entity('player chrono aura light');pointLight.addComponent('light',{type:'point',color:new pc.Color(.18,.64,.52),intensity:1.75,range:12});app.root.addChild(pointLight);

const electric=new pc.StandardMaterial();electric.diffuse=new pc.Color(.01,.69,1);electric.emissive=new pc.Color(.02,.9,1);electric.emissiveIntensity=4;electric.useMetalness=false;electric.update();

const hitMat=new pc.StandardMaterial();hitMat.diffuse=new pc.Color(1,.34,.11);hitMat.emissive=new pc.Color(1,.23,.05);hitMat.emissiveIntensity=3;hitMat.update();

const chainGold=new pc.StandardMaterial();chainGold.diffuse=new pc.Color(.91,.64,.12);chainGold.metalness=.8;chainGold.useMetalness=true;chainGold.emissive=new pc.Color(.5,.27,.025);chainGold.emissiveIntensity=2.5;chainGold.update();
const chainBlue=new pc.StandardMaterial();chainBlue.diffuse=new pc.Color(.015,.72,1);chainBlue.emissive=new pc.Color(.02,.73,1);chainBlue.emissiveIntensity=5;chainBlue.update();
const laserHalo=new pc.StandardMaterial();laserHalo.diffuse=new pc.Color(.06,.8,1);laserHalo.emissive=new pc.Color(.02,.68,1);laserHalo.emissiveIntensity=4.0;laserHalo.opacity=.24;laserHalo.blendType=pc.BLEND_NORMAL;laserHalo.depthWrite=false;laserHalo.update();
const bubbleMat=new pc.StandardMaterial();bubbleMat.diffuse=new pc.Color(.15,.6,.95);bubbleMat.emissive=new pc.Color(.13,.57,1);bubbleMat.emissiveIntensity=1.5;bubbleMat.opacity=.2;bubbleMat.blendType=pc.BLEND_NORMAL;bubbleMat.depthWrite=false;bubbleMat.update();

fx=new pc.ShaderMaterial({

 uniqueName:'ORIGINAL_REDLINE_TEMPORAL_STREAKS',

 attributes:{aPosition:pc.SEMANTIC_POSITION,aUv0:pc.SEMANTIC_TEXCOORD0},

 vertexGLSL:'attribute vec3 aPosition;attribute vec2 aUv0;uniform mat4 matrix_model;uniform mat4 matrix_viewProjection;varying vec2 vUv;void main(){vUv=aUv0;gl_Position=matrix_viewProjection*matrix_model*vec4(aPosition,1.0);}',

 fragmentGLSL:'precision highp float;varying vec2 vUv;uniform float uTime;uniform float uWarp;void main(){float streak=pow(max(0.,sin(vUv.y*74.-uTime*13.)),16.);vec3 c=mix(vec3(.03,.65,.32),vec3(.07,.52,1.),uWarp);gl_FragColor=vec4(c*(.20+streak*.88),1.);}'

});

fx.setParameter('uTime',0);fx.setParameter('uWarp',0);

for(let s of [-1,1]){let e=new pc.Entity('RUNWAY SPEED GLSL');e.addComponent('render',{type:'plane',material:fx});pos(e,s*3.1,.18,-22);e.setLocalScale(.12,1,95);app.root.addChild(e)}

const newParticle=(x,y,z,mat,life=0.55,scale=.12,dir=null)=>{

 const e=new pc.Entity('physical chrono spark');e.addComponent('render',{type:'sphere',material:mat});app.root.addChild(e);pos(e,x,y,z);e.setLocalScale(scale,scale,scale);

 particles.push({entity:e,life,age:0,x,y,z,scale,dir:dir||{x:(rand()-.5)*8,y:(rand()-.28)*8,z:(rand()-.5)*8}});

};

function sparks(x,z,count=12,scale=1){

 for(let i=0;i<count;i++)newParticle(x,1.1+rand()*.7,z,i%3===0?electric:hitMat,.25+rand()*.52,.10+rand()*.11,{x:(rand()-.5)*9*scale,y:(rand()-.2)*5*scale,z:(rand()-.5)*9*scale});

 cameraShake=Math.max(cameraShake,.6);

}

function shockwave(x,z,radius=5){

 const e=new pc.Entity('EXPANDING TRUE 3D WARP SPHERE');e.addComponent('render',{type:'sphere',material:bubbleMat});app.root.addChild(e);pos(e,x,1.2,z);e.setLocalScale(.08,.08,.08);

 particles.push({entity:e,shock:true,age:0,life:.55,radius});

 for(let i=0;i<20;i++){const a=i/20*Math.PI*2;newParticle(x+Math.cos(a)*.3,1.1,z+Math.sin(a)*.3,electric,.35+rand()*.18,.11,{x:Math.cos(a)*12,y:rand()*2,z:Math.sin(a)*12})}

}


// 18 visible moving metallic links and crackling blue alternate links, dynamically
// articulated from the wrist to a forward aim point over one 0.5 second whip cycle.
function spawnElectroChain(targetX,targetZ){
 const links=[];
 for(let i=0;i<18;i++){
  const e=new pc.Entity(i%3===0?'ARCING BLUE TIME LINK':'REAL GOLD CHAIN LINK');
  e.addComponent('render',{type:'box',material:i%3===0?chainBlue:chainGold});
  app.root.addChild(e);e.setLocalScale(.09,.10,.37);links.push(e);
 }
 chainStrikes.push({links,x:targetX,z:targetZ,age:0,life:.55});
 qa.chainWhips++;
}
function chainStep(dt){
 for(let i=chainStrikes.length-1;i>=0;i--){
  const c=chainStrikes[i];c.age+=dt;
  if(c.age>=c.life){for(const l of c.links)l.destroy();chainStrikes.splice(i,1);continue}
  const t=c.age<c.life*.42?c.age/(c.life*.42):Math.max(0,(c.life-c.age)/(c.life*.58));
  const travel=clamp(t,0,1);
  // Keep chain attached to a wrist on the live character as it runs/moves.
  const start=new pc.Vec3(heroX()+.52,1.39,heroZ()-.18);
  const end=new pc.Vec3(start.x+(c.x-start.x)*travel,1.31,start.z+(c.z-start.z)*travel);
  let last=start;
  for(let k=0;k<c.links.length;k++){
   const f=(k+1)/c.links.length,arc=Math.sin(f*Math.PI)*(.38+.25*Math.sin(gameTime*33+f*9));
   const here=new pc.Vec3(start.x+(end.x-start.x)*f,1.39+(end.y-1.39)*f+arc,start.z+(end.z-start.z)*f);
   const midpoint=start.clone().lerp(last,here,.5);
   const link=c.links[k];link.setPosition(midpoint);link.lookAt(here);
   const length=Math.max(.08,here.clone().sub(last).length());
   link.setLocalScale(k%3===0?.13:.10,k%3===0?.13:.085,length*1.07);
   last=here;
  }
 }
}
function electroChainTarget(){
 const x=heroX(),z=heroZ();
 if(mode==='run-rift')return{x:0,z:-10};
 if(mode==='arena-portal')return{x:0,z:-12};
 if(inRun()){
  const best=drones.filter(e=>e.z> -12&&e.z<6).sort((a,b)=>Math.abs(a.x-x)-Math.abs(b.x-x))[0];
  return best?{x:best.x,z:best.z}:{x:x,z:z-8};
 }
 const forward={x:Math.sin(yaw),z:-Math.cos(yaw)};
 const best=enemies.map(e=>{
  const d=dist(x,z,e.x,e.z);
  const dot=((e.x-x)*forward.x+(e.z-z)*forward.z)/Math.max(.001,d);
  return{e,d,dot}
 }).filter(a=>a.d<10&&a.dot>-.4).sort((a,b)=>a.d-b.d)[0];
 return best?{x:best.e.x,z:best.e.z}:{x:x+forward.x*8,z:z+forward.z*8};
}

function particlesStep(dt){

 for(let i=particles.length-1;i>=0;i--){

  const p=particles[i];p.age+=dt;if(p.age>=p.life){p.entity.destroy();particles.splice(i,1);continue;}

  const f=1-p.age/p.life;

  if(p.beam){p.entity.setLocalScale(p.width*Math.max(.18,f),p.width*Math.max(.18,f),p.length)}
  else if(p.shock){const size=.08+p.radius*2*(p.age/p.life);p.entity.setLocalScale(size,size,size)}

  else{p.x+=p.dir.x*dt;p.y+=p.dir.y*dt;p.z+=p.dir.z*dt;pos(p.entity,p.x,p.y,p.z);const s=Math.max(.009,p.scale*f);p.entity.setLocalScale(s,s,s)}

 }

}

function animationStep(dt,runMotion=false){

 if(player.anim){
  player.anim.speed=mode==='run'?Math.max(.65,(speed+boost)/33):((actorMove>.08&&inArena())?1:0);
  return;
 }
 const legs=[player.findByName('LegPivot_L'),player.findByName('LegPivot_R')];

 const arms=[player.findByName('ArmPivot_L'),player.findByName('ArmPivot_R')];

 const moving=runMotion||actorMove>.06;
 if(moving)runPhase+=dt*(runMotion?Math.max(17,(speed+boost)*.68):12+actorMove*5);
 const stride=Math.sin(runPhase)*(moving?42:2);

 if(legs[0])legs[0].setLocalEulerAngles(stride,0,0);

 if(legs[1])legs[1].setLocalEulerAngles(-stride,0,0);

 if(arms[0])arms[0].setLocalEulerAngles(-stride*.8,0,0);

 if(arms[1])arms[1].setLocalEulerAngles(stride*.8,0,0);  // The electro-chain is a wrist-mounted power, not a carried weapon.
  // Whip animation drives the right shoulder while the actual chain links extend in 3D.
  if(arms[1]&&chainStrikes.length)arms[1].setLocalEulerAngles(-45,0,-20);

}

function spawnRunner(){

 const x=[-2.25,0,2.25][Math.floor(rand()*3)];

 const entity=instantiate('hazard_drone','ORIGINAL RUNNER DRONE',runnerWorld);entity.setLocalScale(.72,.72,.72);pos(entity,x,1.25,-48);

 drones.push({entity,x,base:x,z:-48,phase:rand()*6.28,passed:false});

 if(rand()<(stage.energyPickups||.7)){

  const px=clamp(x+(rand()<.5?-2.25:2.25),-2.25,2.25);

  const p=instantiate('pickup','COLLECT SPEED ENERGY DOT',runnerWorld);p.setLocalScale(.55,.55,.55);pos(p,px,1.3,-39);

  rings.push({entity:p,x:px,z:-39,phase:rand()*6.28});

 }

}

function removeAt(list,index){const o=list[index];if(o?.entity)o.entity.destroy();list.splice(index,1)}

function killDrone(i,method='BLAST'){

 const o=drones[i];if(!o)return;sparks(o.x,o.z,14);removeAt(drones,i);qa.kills++;combo++;

 energy=clamp(energy+12,0,100);boost=clamp(boost+2,0,25);message(method+' · DRONE DESTROYED · COMBO ×'+combo,1.1);

}

function runFire(){

 if(mode!=='run'||shotWait>0)return;

 shotWait=.21;qa.shots++;

 const candidates=drones.map((o,i)=>({...o,i})).filter(o=>o.z<2.3&&o.z>-43&&Math.abs(o.x-playerX)<1.50).sort((a,b)=>b.z-a.z);

 const target=candidates[0],endZ=target?target.z:-30; // Draw a sustained straight-world-space laser with a bright core and outer bloom.
 // The previous 'shock:true,radius:0' collapsed the beam into a tiny dot every frame.
 const z0=2.8,length=Math.abs(z0-endZ),mid=(endZ+z0)/2;
 for(const [material,width,lifetime] of [[laserHalo,.65,.35],[electric,.22,.32]]){
  const e=new pc.Entity('FULL LENGTH VISIBLE TIME LASER');
  e.addComponent('render',{type:'box',material});app.root.addChild(e);
  pos(e,playerX+.18,1.55,mid);e.setLocalScale(width,width,length);
  particles.push({entity:e,age:0,life:lifetime,beam:true,width,length});
 }
 qa.laserLength=length;qa.laserShots++;
 for(let i=0;i<5;i++)newParticle(playerX+.18,1.55,z0,electric,.21,.085);

 if(target)killDrone(target.i,'PLASMA');

}

function slash(){

 if(paused||slashWait>0)return;

 slashWait=.35;qa.slashes++;const x=heroX(),z=heroZ(); const aim=electroChainTarget();spawnElectroChain(aim.x,aim.z);
 sparks(x,z-1,7,.7);
 if(mode==='run-rift'){activateRift();return}

 if(mode==='arena-portal'&&dist(x,z,0,-12)<4){activateRift();return}

 if(mode==='run'){

  for(let i=drones.length-1;i>=0;i--)if(drones[i].z> -10&&drones[i].z<4&&Math.abs(drones[i].x-playerX)<2.3){killDrone(i,'ELECTRO-CHAIN');qa.chainHits++}

 }else if(mode==='arena'){

  let found=0;

  for(let i=enemies.length-1;i>=0;i--){

   const e=enemies[i],d=dist(x,z,e.x,e.z);

   const forward={x:Math.sin(yaw),z:-Math.cos(yaw)};

   const dot=((e.x-x)*forward.x+(e.z-z)*forward.z)/Math.max(.001,d);

   if(d<8.7&&dot>-.4){enemyHit(i,1,'ELECTRO-CHAIN');qa.chainHits++;found++}

  }

  if(found){combo+=found;energy=clamp(energy+found*8,0,100);message('ELECTRO-CHAIN ×'+combo)}

 }

}

function dash(){

 if(!inArena()||dashWait>0||energy<8)return;

 energy-=8;dashWait=.72;qa.dashes++;

 const dir=normalize(movement.x,movement.y);

 const forward={x:Math.sin(yaw),z:-Math.cos(yaw)},right={x:Math.cos(yaw),z:Math.sin(yaw)};
 const f=Math.hypot(dir.x,dir.y)>.01?{x:right.x*dir.x-forward.x*dir.y,z:right.z*dir.x-forward.z*dir.y}:forward;

 const x=clamp(heroX()+f.x*5,-17.6,17.6),z=clamp(heroZ()+f.z*5,-18,18);

 for(let i=0;i<7;i++)newParticle(heroX()+f.x*i*.5,1.25,heroZ()+f.z*i*.5,electric,.45,.12);

 pos(player,x,.12,z);sparks(x,z,5,.5);

 for(let i=enemies.length-1;i>=0;i--)if(dist(x,z,enemies[i].x,enemies[i].z)<3)enemyHit(i,1,'DASH');

}

function blink(){

 if(!inArena()||blinkWait>0||energy<20)return;

 const target=enemies.map((e,i)=>({...e,index:i,d:dist(heroX(),heroZ(),e.x,e.z)})).sort((a,b)=>a.d-b.d)[0];

 if(!target||target.d>12){message('NO ENEMY IN BLINK RANGE');return}

 blinkWait=2.4;energy-=20;qa.blinks++;

 const dx=target.x-heroX(),dz=target.z-heroZ(),d=Math.max(1,Math.hypot(dx,dz));

 const safeX=clamp(target.x+(dx/d)*1.5,-17.6,17.6),safeZ=clamp(target.z+(dz/d)*1.5,-18,18);

 sparks(heroX(),heroZ(),8,.7);pos(player,safeX,.12,safeZ);actorYaw=Math.atan2(target.x-safeX,-(target.z-safeZ));player.setLocalEulerAngles(0,actorYaw*180/Math.PI,0);sparks(safeX,safeZ,9);

 const hitIndex=enemies.findIndex(e=>e.entity===target.entity);if(hitIndex>=0)enemyHit(hitIndex,1,'BLINK STRIKE');

}

function normalize(x,y){

 const d=Math.hypot(x,y);return d>1?{x:x/d,y:y/d}:{x,y};

}

function bubble(){

 if(warpWait>0||energy<35||paused||!(mode==='run'||inArena()))return;

 energy-=35;warpWait=5.5;qa.bubbles++;shockwave(heroX(),heroZ(),7.2);message('TIME WARP BUBBLE!');

 if(mode==='run'){

  for(let i=drones.length-1;i>=0;i--)if(drones[i].z>-13&&drones[i].z<12)killDrone(i,'WARP BURST');

 }else{

  for(let i=enemies.length-1;i>=0;i--){

   const e=enemies[i],dx=e.x-heroX(),dz=e.z-heroZ(),d=Math.max(.3,Math.hypot(dx,dz));

   if(d<7.2){e.stun=1.9;e.x=clamp(e.x+dx/d*3.5,-17,17);e.z=clamp(e.z+dz/d*3.5,-17,17);enemyHit(i,1,'WARP BUBBLE')}

  }

 }

}

function enemyHit(i,damage,method){

 const e=enemies[i];if(!e)return;e.hp-=damage;e.stun=.9;e.flash=.16;sparks(e.x,e.z,9,.8);

 if(e.hp<=0){
   removeAt(enemies,i);qa.kills++;arenaKills++;energy=clamp(energy+16,0,100);boost=clamp(boost+3,0,25);health=clamp(health+7,0,100);
   if(enemies.length===0&&mode==='arena'){
    if(arenaWave+1<(stage.enemies?.waves?.length||1)){
     arenaNextWaveDelay=2.1;
     message('WAVE CLEARED · NEXT TEMPORAL ASSAULT INCOMING',2.3);
    }else unlockExitPortal();
   }

 }else{e.x=clamp(e.x+(e.x-heroX())*.25,-17,17);e.z=clamp(e.z+(e.z-heroZ())*.25,-18,18)}

}

function createEnemies(){
 const waves=stage.enemies?.waves;
 const entries=waves?waves[arenaWave]?.spawn||[]:stage.enemies?.spawn||[];
 if(!entries.length)throw Error('Arena '+stage.id+' wave '+arenaWave+' has no configured enemies');

 for(let i=0;i<entries.length;i++){

   const e=instantiate('temporal_marauder','ARENA TEMPORAL MARAUDER W'+arenaWave+' E'+i,arenaWorld);

  e.setLocalScale(stage.id==='collapse-arena'&&arenaWave===2?1.35:1,stage.id==='collapse-arena'&&arenaWave===2?1.35:1,stage.id==='collapse-arena'&&arenaWave===2?1.35:1);const [x,z]=entries[i];pos(e,x,0,z);

  enemies.push({entity:e,x,z,hp:stage.enemies.health||2,cooldown:.9+i*.35,stun:0,phase:rand()*6.28});

 }

}

function unlockExitPortal(){

 mode='arena-portal';pos(rift,0,1.85,-12);rift.enabled=true;rift.setLocalScale(1.4,1.4,1.4);

 message('OBJECTIVE COMPLETE · EXIT RIFT UNLOCKED!',3);

}

function spawnRunRift(){

 mode='run-rift';riftOpened=false;holdingTime=false;

 pos(rift,0,2.1,-10);rift.enabled=true;rift.setLocalScale(1.5,1.5,1.5);

 message('TIME RIFT! SWIPE UP TO SLASH!',2.6);

}

function activateRift(){

 if(!(mode==='run-rift'||mode==='arena-portal'))return;

 if(energy<(stage.portalEnergy||20)){message('COLLECT TIME ENERGY TO CUT THE RIFT');return}

 if(mode==='arena-portal'&&dist(heroX(),heroZ(),0,-12)>4){message('GET CLOSER TO THE EXIT RIFT');return}

 energy-=stage.portalEnergy||20;riftOpened=true;qa.portalOpenCount++;

 nextStage=stage.next;portalTimer=1.65;

 mode=stage.type==='runner'?'transition-from-run':'transition-from-arena';

 for(let i=0;i<27;i++){const a=i*2.4;newParticle(heroX()+Math.sin(a)*2,1.7+Math.cos(a)*2,stage.type==='runner'?-10:-12,electric,.48+rand()*.65,.17)}

 shockwave(heroX(),heroZ(),5);

 message('TIME SLASH · REALITY FRACTURED!',2);

}

function advanceTransition(dt){

 portalTimer-=dt;

 if(rift.enabled){rift.rotateLocal(0,dt*65,0);const p=1+(1.65-portalTimer)*.56;rift.setLocalScale(p,p,p)}

 if(portalTimer>0)return;

 if(nextStage){

  if(stage.type==='runner')qa.arenaEntered++;

  else qa.exitPortalsEntered++;

  setStage(worlds.findIndex(s=>s.id===nextStage));

  flash();message('ENTERED '+stage.world,2);

 }else{

  mode='complete';paused=true;setOverlay('THROUGH<br>TIME','REDLINE CHRONICLE COMPLETE · '+worlds.length+' STAGES CLEARED.<br>You ran through time and conquered four worlds.','PLAY CHRONICLE AGAIN');

  try{localStorage.setItem('timebreaker:redline:checkpoint:v4','neon-run')}catch(e){}

 }

}

function runnerStep(dt,real){

 const slowing=holdingTime&&energy>0;

 const hazardRate=slowing?.25:1;

 energy=clamp(energy+(slowing?-24:6.5)*real,0,100);if(energy<=0)holdingTime=false;

 speed=Math.min(stage.maxSpeed,stage.baseSpeed+progress/140*2.3);

 boost=Math.max(0,boost-.17*real);

 let velocity=(speed+boost)*(slowing?.98:1);

 progress+=velocity*dt;

 playerX+=(steeringX-playerX)*Math.min(1,dt*11);

 pos(player,playerX,.12+Math.abs(Math.sin(runPhase))*.085,3.2);actorMove=1;

 player.setLocalEulerAngles(0,0,clamp((steeringX-playerX)*-8,-13,13));

 for(const seg of segments){seg.translateLocal(0,0,velocity*dt);if(seg.getPosition().z>32)seg.translateLocal(0,0,-128)}

 clock-=dt*hazardRate;if(clock<=0){clock=stage.enemyFrequency*(.7+rand()*.35);spawnRunner()}

 for(let i=drones.length-1;i>=0;i--){

  const o=drones[i];o.z+=velocity*dt*hazardRate;o.x=clamp(o.base+Math.sin(gameTime*2+o.phase)*.24,-2.6,2.6);

  pos(o.entity,o.x,1.31+Math.sin(gameTime*5+o.phase)*.16,o.z);o.entity.rotateLocal(0,dt*110*hazardRate,0);

  if(!o.passed&&o.z>=3.2){o.passed=true;

   const d=Math.abs(o.x-playerX);

   if(d<.9&&invuln<=0){health-=28;invuln=1.3;sparks(o.x,o.z,13);message('DRONE IMPACT · SHIELD -28');combo=0;if(health<=0){gameOver();return}}

   else if(d<1.8){combo++;energy=clamp(energy+8,0,100);boost=clamp(boost+1.7,0,25)}

  }

  if(o.z>17)removeAt(drones,i);

 }

 for(let i=rings.length-1;i>=0;i--){

  const o=rings[i];o.z+=velocity*dt*hazardRate;pos(o.entity,o.x,1.2+Math.sin(gameTime*6+o.phase)*.18,o.z);o.entity.rotateLocal(0,0,dt*110);

  if(o.z>2.7&&o.z<4.9&&Math.abs(o.x-playerX)<1.1){energy=clamp(energy+30,0,100);boost=clamp(boost+6,0,25);qa.pickups++;combo++;message('REDLINE BOOST +6 · ENERGY +30');removeAt(rings,i);continue}

  if(o.z>17)removeAt(rings,i);

 }

 if(progress>=stage.distance)spawnRunRift();

 if(timeLeft<=0)gameOver();

}

function arenaStep(dt){

 const v=normalize(movement.x,movement.y),forward={x:Math.sin(yaw),z:-Math.cos(yaw)},right={x:Math.cos(yaw),z:Math.sin(yaw)};

 const deltaX=(right.x*v.x+forward.x*-v.y)*9.7*dt,deltaZ=(right.z*v.x+forward.z*-v.y)*9.7*dt;

 const px=clamp(heroX()+deltaX,-17.5,17.5),pz=clamp(heroZ()+deltaZ,-18,18);

 actorMove=Math.hypot(v.x,v.y);
 pos(player,px,.12+(actorMove>.06?Math.abs(Math.sin(runPhase))*.045:0),pz);

 if(actorMove>.1){
  const targetYaw=Math.atan2(deltaX,-deltaZ);
  const turn=Math.atan2(Math.sin(targetYaw-actorYaw),Math.cos(targetYaw-actorYaw));
  actorYaw+=turn*Math.min(1,dt*14);
  player.setLocalEulerAngles(0,actorYaw*180/Math.PI,0);
 }

 for(const e of enemies){

  e.stun=Math.max(0,e.stun-dt);

  e.cooldown=Math.max(0,e.cooldown-dt);

  if(e.stun>0){pos(e.entity,e.x,Math.abs(Math.sin(gameTime*6))*.08,e.z);continue}

  const dx=px-e.x,dz=pz-e.z,d=Math.max(.1,Math.hypot(dx,dz));

  if(d>1.38){e.x+=dx/d*dt*1.85;e.z+=dz/d*dt*1.85}

  else if(e.cooldown<=0&&invuln<=0){health-=12;invuln=.85;e.cooldown=1.35;combo=0;sparks(px,pz,5,.5);message('MARAUDER HIT · -12 HP');if(health<=0)gameOver()}

  pos(e.entity,e.x,Math.abs(Math.sin(gameTime*8+e.phase))*.055,e.z);e.entity.setLocalEulerAngles(0,Math.atan2(px-e.x,-(pz-e.z))*180/Math.PI,0);

 }

 if(mode==='arena'&&arenaNextWaveDelay>0){
  arenaNextWaveDelay-=dt;
  if(arenaNextWaveDelay<=0){arenaNextWaveDelay=0;arenaWave++;createEnemies();message('WAVE '+(arenaWave+1)+' / '+(stage.enemies.waves?.length||1)+' · SURVIVE THE RUSH',2)}
 }
 if(mode==='arena-portal'){rift.rotateLocal(0,dt*34,0);const p=1.45+Math.sin(gameTime*3)*.085;rift.setLocalScale(p,p,p)}

}

function gameOver(){

 mode='failed';paused=true;holdingTime=false;

 setOverlay('TIME<br>FRACTURED','Riftwalker lost the timeline in '+stage.world+'.<br>Your checkpoint is ready.','RETRY CHECKPOINT');

}

function startFromMenu(){

 $('overlay').classList.add('hidden');
 if(mode==='menu'){const i=worlds.findIndex(w=>w.id===qa.resumeStage);setStage(i>0?i:0);qa.resumeStage=null}
 else if(mode==='complete')setStage(0);
 else if(mode==='failed')setStage(stageIndex);
 paused=false;message('RUN THROUGH TIME!',1.5);

}

function togglePause(){

 if(mode==='menu'||mode==='complete'||mode==='failed'||mode==='loading')return;

 paused=!paused;holdingTime=false;

 if(paused)setOverlay('PAUSED','The timeline is holding still. Take control when ready.','RESUME GAME');

 else $('overlay').classList.add('hidden');

}

$('play').addEventListener('click',()=>{if(paused&&mode!=='menu'&&mode!=='failed'&&mode!=='complete'){paused=false;$('overlay').classList.add('hidden')}else startFromMenu()});

$('pause').addEventListener('click',togglePause);

function bindAction(id,fn){$(id).addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();fn()});$(id).addEventListener('click',e=>e.preventDefault())}

bindAction('slash',slash);bindAction('dash',dash);bindAction('blink',blink);bindAction('warp',bubble);bindAction('runWarp',bubble);bindAction('interact',slash);

const tb=$('timeBreak');

tb.addEventListener('pointerdown',e=>{if(!inRun()||paused)return;e.preventDefault();holdingTime=true;try{tb.setPointerCapture(e.pointerId)}catch{}});

for(const evt of ['pointerup','pointercancel','lostpointercapture'])tb.addEventListener(evt,()=>holdingTime=false);

const pointers=new Map();let steeringId=null,cameraId=null;

canvas.addEventListener('pointerdown',e=>{

 if(paused||mode==='menu'||mode==='complete'||mode==='loading'||mode==='failed')return;e.preventDefault();

 if(e.pointerType==='mouse'&&e.button!==0)return;

 const p={x:e.clientX,y:e.clientY,start:performance.now(),moved:false,base:steeringX,yawStart:yaw,fireOnRelease:false};

 if(inRun()){if(steeringId===null){steeringId=e.pointerId;p.fireOnRelease=true}else{runFire()}}

 else if(inArena()){if(e.clientX>innerWidth*.44&&cameraId===null){cameraId=e.pointerId}}

 else if(mode==='run-rift'||mode==='arena-portal')p.fireOnRelease=true;

 pointers.set(e.pointerId,p);try{canvas.setPointerCapture(e.pointerId)}catch{}

});

canvas.addEventListener('pointermove',e=>{

 const p=pointers.get(e.pointerId);if(!p)return;

 const dx=e.clientX-p.x,dy=e.clientY-p.y;

 if(Math.hypot(dx,dy)>14)p.moved=true;

 if(inRun()&&steeringId===e.pointerId){steeringX=clamp(p.base+dx*.018,-2.64,2.64)}

 if(inArena()&&cameraId===e.pointerId)yaw=p.yawStart-dx*.005;

});

canvas.addEventListener('pointerup',e=>{

 const p=pointers.get(e.pointerId);if(!p)return;

 const dy=e.clientY-p.y,dx=e.clientX-p.x;

 const elapsed=performance.now()-p.start;

 if(dy< -49&&Math.abs(dy)>Math.abs(dx)*1.1&&elapsed<600)slash();

 else if(p.fireOnRelease&&!p.moved&&elapsed<360){if(mode==='run')runFire();else if(mode==='run-rift'||mode==='arena-portal')slash()}

 pointers.delete(e.pointerId);if(steeringId===e.pointerId)steeringId=null;if(cameraId===e.pointerId)cameraId=null;

});

for(const ev of ['pointercancel','lostpointercapture'])canvas.addEventListener(ev,e=>{pointers.delete(e.pointerId);if(steeringId===e.pointerId)steeringId=null;if(cameraId===e.pointerId)cameraId=null});

const joy=$('joy'),nub=$('nub');let joyId=null;

function resetJoy(){movement.x=0;movement.y=0;nub.style.transform='translate(0px,0px)';joyId=null}

function joystick(e){

 const rect=joy.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2,dx=(e.clientX-cx)/48,dy=(e.clientY-cy)/48;

 movement=normalize(dx,dy);nub.style.transform='translate('+movement.x*37+'px,'+movement.y*37+'px)';

}

joy.addEventListener('pointerdown',e=>{if(!inArena()||paused)return;e.preventDefault();joyId=e.pointerId;try{joy.setPointerCapture(e.pointerId)}catch{}joystick(e)});

joy.addEventListener('pointermove',e=>{if(e.pointerId===joyId)joystick(e)});

for(const ev of ['pointerup','pointercancel','lostpointercapture'])joy.addEventListener(ev,e=>{if(e.pointerId===joyId)resetJoy()});

const keys={};

window.addEventListener('keydown',e=>{

 const key=e.key.toLowerCase();keys[key]=true;if(['arrowleft','arrowright',' '].includes(key))e.preventDefault();

 if(key==='escape')togglePause();

 if(key==='f')mode==='run'?runFire():slash();

 if(key==='j'||key==='k')slash();

 if(key==='shift')dash();

 if(key==='e')blink();

 if(key==='q')bubble();

 if(key===' ')holdingTime=true;

 if(key==='enter'&&(mode==='run-rift'||mode==='arena-portal'))slash();

});

window.addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;if(e.key===' ')holdingTime=false});

let lastStamp=performance.now(),uiElapsed=0,keyboardMovementLast=false;

app.on('update',dt=>{

 const now=performance.now(),real=Math.min(.15,Math.max(0,(now-lastStamp)/1000));lastStamp=now;

 const step=Math.min(.05,Math.max(0,dt));frame++;

 if(!player)return;

 if(toastTimer>0){toastTimer-=real;if(toastTimer<=0)$('toast').classList.remove('show')}

 if(paused||mode==='menu'||mode==='failed'||mode==='complete'||mode==='loading'){if(frame%30===0)state();return}

 gameTime+=step;shotWait=Math.max(0,shotWait-real);slashWait=Math.max(0,slashWait-real);dashWait=Math.max(0,dashWait-real);

 blinkWait=Math.max(0,blinkWait-real);warpWait=Math.max(0,warpWait-real);invuln=Math.max(0,invuln-real);cameraShake=Math.max(0,cameraShake-step*3);

 if(mode==='run'){

  if(keys.arrowleft||keys.a)steeringX-=step*5.5;

  if(keys.arrowright||keys.d)steeringX+=step*5.5;

  steeringX=clamp(steeringX,-2.64,2.64);timeLeft-=real;

  runnerStep(step,real);

 }else if(mode==='run-rift'){energy=clamp(energy+real*6,0,100);rift.rotateLocal(0,step*50,0)}

 else if(inArena()){

  const keyX=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0);

  const keyY=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);

  // Keep independent thumb-joystick input, without keyboard idle frames zeroing it.

  if(keyX||keyY){movement={x:keyX,y:keyY};keyboardMovementLast=true}

  else if(keyboardMovementLast){movement={x:0,y:0};keyboardMovementLast=false}

  if(mode==='arena'){timeLeft-=real;if(timeLeft<=0){gameOver();return}}
  arenaStep(step);

 }else if(mode.startsWith('transition'))advanceTransition(step);

 animationStep(step,mode==='run'); particlesStep(step);chainStep(step);
 cameraMode(step);

 pos(pointLight,heroX(),2.2,heroZ());

 fx.setParameter('uTime',gameTime);fx.setParameter('uWarp',holdingTime||riftOpened?1:0);

 uiElapsed+=real;if(uiElapsed>.11){updateUI();uiElapsed=0;state()}

});

bootstrap();



if(qaMode){

 qa.accelerateToRift=()=>{if(mode!=='run')return false;progress=stage.distance;return true};

 qa.teleportToNearestEnemy=()=>{if(mode!=='arena'||!enemies.length)return false;const e=enemies[0];pos(player,clamp(e.x,-17,17),.12,clamp(e.z+2,-18,18));yaw=0;return true};

 qa.teleportToExit=()=>{if(mode!=='arena-portal')return false;pos(player,0,.12,-9.2);return true};

 qa.slash=slash;qa.dash=dash;qa.blink=blink;qa.bubble=bubble;qa.fire=runFire;qa.setMove=(x,y)=>{movement={x,y}};

 qa.setSteering=x=>{steeringX=clamp(x,-2.64,2.64)};qa.setCameraYaw=r=>{yaw=r};qa.holdTime=x=>{holdingTime=Boolean(x)};

 qa.resolveCurrentWave=()=>{if(mode!=='arena')return false;let n=0;while(enemies.length&&n<30){enemyHit(0,100,'QA_PLAYABLE_COMBAT');n++}return n>0};
 qa.snapshot=state;qa.samplePerf=()=>({fps:app.stats.fps,frameMs:app.stats.frameTime,drawCalls:app.stats.drawCallCount,cpuUpdateMs:app.stats.cpuUpdateTime,cpuRenderMs:app.stats.cpuRenderTime,vramBytes:app.stats.vramTotalBytes,glVersion:qa.webglVersion});qa.setTimeLeft=seconds=>{timeLeft=seconds};

}

