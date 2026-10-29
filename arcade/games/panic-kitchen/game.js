import * as pc from './vendor/playcanvas.mjs';

/* PANIC KITCHEN #3: clean, self-contained one-order production-quality foundation.
   Model: original Blender GLB. Runtime: PlayCanvas 2.23.3. GPU: custom GLSL heat shader.
   No public services, analytics, external fonts, external code or remote assets. */
const $=id=>document.getElementById(id);
const STEPS=[
 {id:'bun',ico:'🍞',label:'BRIOCHE',tip:'Place the toasted brioche on the plate.',say:'🍞 FRESH BRIOCHE READY!'},
 {id:'patty',ico:'🥩',label:'PATTY',tip:'Grab the fresh beef patty.',say:'🥩 BIG JUICY PATTY!'},
 {id:'grill',ico:'🔥',label:'GRILL',tip:'Sear the patty with the sizzling grill.',say:'🔥 SIZZLE SIZZLE!'},
 {id:'cheese',ico:'🧀',label:'CHEESE',tip:'Melt the cheese over the hot patty.',say:'🧀 GOLDEN CHEESE, YES!'},
 {id:'lettuce',ico:'🥬',label:'LETTUCE',tip:'Finish with crunchy green lettuce.',say:'🥬 CRUNCH TIME!'},
 {id:'serve',ico:'🔔',label:'SERVE!',tip:'Ring the real brass bell! Serve the burger.',say:'🔔 ORDER OUT!'}
];
const S={mode:'intro',step:0,time:45,maxTime:45,combo:0,score:0,mistakes:0,busy:0,fx:0,seconds:0,muted:false,ready:false,modelReady:false,shaderReady:false,frames:[],fps:0};
let app,scene,hero={},camera,shader,gl,colors,heater,pulseLight,assetLoaded=false;
let last=performance.now(),ui=0,soundCtx=null,played=false;
const metrics={playCanvasVersion:pc.version,modelLoaded:false,shaderCompiled:false,webgl:false,actualFps:0,currentStep:0,scene:'none',assetBytes:3012860};
window.__panic={metrics,state:S,playStep:id=>action(id),getStep:()=>S.step};
const m3d=(x,y,z)=>new pc.Vec3(x,y,z);
const GLB='./assets/panic_hero_food_truck.glb';
const canvas=$('world');
const btn=$('start');
btn.disabled=true;btn.textContent='3D KITCHEN LOADING…';
function status(t){$('status').textContent=t}
function toast(ico){
 const e=document.createElement('div');e.className='pop';e.textContent=ico;
 e.style.setProperty('--x',((Math.random()-.5)*170)+'px');
 e.style.setProperty('--r',((Math.random()-.5)*90)+'deg');
 $('sparkles').appendChild(e);setTimeout(()=>e.remove(),900);
}
function note(t){status(t)}
function audioCue(kind){
 if(S.muted)return;
 try{soundCtx=soundCtx||new(window.AudioContext||window.webkitAudioContext)();
 const t=soundCtx.currentTime,osc=soundCtx.createOscillator(),vol=soundCtx.createGain();
 osc.type=kind==='bad'?'sawtooth':kind==='win'?'triangle':'sine';
 osc.frequency.setValueAtTime(kind==='bad'?174:kind==='win'?510:360,t);
 osc.frequency.exponentialRampToValueAtTime(kind==='bad'?104:kind==='win'?870:600,t+.18);
 vol.gain.setValueAtTime(.067,t);vol.gain.exponentialRampToValueAtTime(.001,t+.23);
 osc.connect(vol).connect(soundCtx.destination);osc.start(t);osc.stop(t+.24)}catch(e){}
}
function gameButton(step){
 const b=document.createElement('button');b.type='button';b.className='act';b.dataset.action=step.id;
 b.innerHTML='<b>'+step.ico+'</b>'+step.label;
 b.addEventListener('click',()=>action(step.id));$('actions').appendChild(b);
}
STEPS.forEach(gameButton);
function refresh(){
 $('clock').textContent=Math.ceil(Math.max(0,S.time))+'s';
 $('combo').textContent='x'+Math.max(1,S.combo);
 $('score').textContent=S.score.toLocaleString();
 $('patienceText').textContent=Math.ceil(Math.max(0,S.time))+'s LEFT';
 $('patienceText').classList.toggle('urgent',S.time<13);
 $('bar').style.width=Math.max(0,Math.round(S.time/S.maxTime*100))+'%';
 $('patience').classList.toggle('urgent',S.time<13);
 $('stepNumber').textContent=S.step+'/6 STEPS';
 $('goal').textContent=S.mode==='playing'?'COOK AGAINST THE CLOCK':'FOOD TRUCK • HERO TEST';
 const active=STEPS[S.step];
 $('stepTitle').textContent=S.mode!=='playing'?'Six steps. One happy customer.':S.busy>0?'SIZZLING!':active?active.tip:'ORDER COMPLETE';
 $('hint').textContent=S.mode==='playing'?'⚡ FAST ACCURATE TAPS BUILD COMBO!':'⚡ Original 3D models. Real cooking actions.';
 document.querySelectorAll('[data-action]').forEach(b=>{
  let active=S.mode==='playing'&&S.busy<=0&&b.dataset.action===(STEPS[S.step]?.id);
  b.disabled=S.mode!=='playing'||S.busy>0;
  b.classList.toggle('ready',active);
  b.classList.toggle('dim',S.mode==='playing'&&!active);
 });
 metrics.currentStep=S.step;
 positionHotspot();
}
function action(id){
 if(S.mode!=='playing'||S.busy>0)return;
 const step=STEPS[S.step];if(!step)return;
 if(id!==step.id){
  S.mistakes++;S.combo=0;S.time=Math.max(0,S.time-2);
  toast('❌');note('WRONG STATION! -2 SECONDS');audioCue('bad');
  refresh();return;
 }
 S.combo=Math.min(6,S.combo+1);S.fx=1.15;toast(step.ico);audioCue('good');note(step.say);
 if(id==='grill'){S.busy=S.combo>=4?.16:1.15;}
 else {S.step++;if(id==='serve'){win();return}}
 // Explicit animation cues in imported GLB character and environment objects.
 if(hero.armR)hero.armR.setLocalEulerAngles(0,0,-25);
 if(id==='serve')S.fx=2.3;
 syncDish();
 refresh();
}
function start(){
 if(!S.modelReady||!S.shaderReady){note('3D + GPU EFFECTS MUST PASS VERIFICATION');return}
 S.mode='playing';S.step=0;S.combo=0;S.score=0;S.time=45;S.mistakes=0;S.busy=0;S.fx=0;
 $('overlay').classList.add('hidden');
 syncDish();
 status('🍔 FIRST CUSTOMER! TAP BRIOCHE TO START!');
 if(hero.bell){hero.bell.setLocalPosition(.85,1.58,2.05)}
 refresh();audioCue('good');
}
function win(){
 S.mode='won';
 S.score=Math.max(100,Math.round(120+S.time*14+S.combo*20-S.mistakes*22));
 const stars=S.time>22&&S.mistakes===0?3:S.time>9?2:1;
 $('eyebrow').textContent='SPEED RUN • ORDER COMPLETE';
 $('title').innerHTML='ORDER<br><em>UP!</em>';
 $('message').textContent='A fresh burger made in '+Math.round(45-S.time)+' seconds. You earned '+S.score.toLocaleString()+' points!';
 $('how').classList.add('hiddenStuff');$('result').classList.remove('hiddenStuff');
 $('result').textContent='⭐'.repeat(stars)+'☆'.repeat(3-stars);
 $('start').textContent='⚡ PLAY THE RUSH AGAIN';
 $('overlay').classList.remove('hidden');
 note('🏆 CHEF, THAT WAS FAST!');toast('🏆');audioCue('win');refresh();
}
function lose(){
 S.mode='lost';S.time=0;
 $('eyebrow').textContent='FOOD TRUCK • SHIFT ENDED';
 $('title').innerHTML='TOO<br><em>SLOW!</em>';
 $('message').textContent='The hungry customer walked out. You completed '+S.step+' of 6 steps. Time to turn up the heat.';
 $('how').classList.add('hiddenStuff');$('result').classList.remove('hiddenStuff');$('result').textContent='🍔 💨';
 $('start').textContent='🔥 RETRY THE ORDER';$('overlay').classList.remove('hidden');
 note('😤 CUSTOMER LEFT THE KITCHEN!');audioCue('bad');refresh();
}
$('start').addEventListener('click',()=>start());
$('hotspot').addEventListener('click',()=>{const s=STEPS[S.step];if(s)action(s.id)});
canvas.addEventListener('pointerdown',event=>{if(!S.modelReady||S.mode!=='playing'||S.busy>0)return;const s=STEPS[S.step],world=s&&HOT_SPOTS[s.id];if(!world)return;const screen=camera.camera.worldToScreen(new pc.Vec3(...world));const rect=canvas.getBoundingClientRect();const x=screen.x*rect.width/app.graphicsDevice.width,y=screen.y*rect.height/app.graphicsDevice.height;const dx=event.clientX-rect.left-x,dy=event.clientY-rect.top-y;if(dx*dx+dy*dy<3600)action(s.id)});
$('pause').addEventListener('click',()=>{
 if(S.mode==='playing'){S.mode='paused';$('pause').textContent='▶ RESUME';note('⏸️ CHEF ON BREAK')}
 else if(S.mode==='paused'){S.mode='playing';$('pause').textContent='Ⅱ PAUSE';note('🔥 BACK ON THE GRILL')}
 refresh()
});
$('sound').addEventListener('click',()=>{S.muted=!S.muted;$('sound').textContent=S.muted?'🔇':'🔊'});
document.addEventListener('visibilitychange',()=>{
 if(document.hidden&&S.mode==='playing'){S.mode='paused';$('pause').textContent='▶ RESUME';refresh()}
});
function buildShader(){
 // GLSL hand-authored heat/flame material, updated each frame.
 const vertexGLSL=String.raw`
 attribute vec3 aPosition;
 attribute vec2 aUv0;
 uniform mat4 matrix_model;
 uniform mat4 matrix_viewProjection;
 varying vec2 vUV;
 void main(void){
   vUV=aUv0;
   gl_Position=matrix_viewProjection*matrix_model*vec4(aPosition,1.);
 }`;
 const fragmentGLSL=String.raw`
 precision highp float;
 precision highp int;
 varying vec2 vUV;
 uniform float uTime;
 uniform float uFire;
 float noise(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 void main(void){
  vec2 uv=vUV;
  float wave=sin((uv.x*9.0)+(uv.y*11.0)+(uTime*5.4))*.10;
  float n=noise(floor(vec2(uv.x*12.0+uTime*2.0,uv.y*16.0)));
  float flame=1.0-smoothstep(.05,.95,uv.y+wave+(n-.5)*.17);
  flame*=smoothstep(.02,.24,uv.x)*(1.0-smoothstep(.77,.99,uv.x));
  float heat=flame*uFire;
  vec3 col=mix(vec3(1.,.22,.06),vec3(1.,.94,.31),uv.y);
  gl_FragColor=vec4(col,heat*.74);
 }`;
 shader=new pc.ShaderMaterial({uniqueName:'x13-panic-hero-glsl-flame-v1',attributes:{aPosition:pc.SEMANTIC_POSITION,aUv0:pc.SEMANTIC_TEXCOORD0},vertexGLSL,fragmentGLSL});
 shader.blendType=pc.BLEND_NORMAL;
 shader.depthWrite=false;
 shader.cull=pc.CULLFACE_NONE;
 shader.setParameter('uTime',0);
 shader.setParameter('uFire',.0);
 shader.update();
 heater=new pc.Entity('GPU GLSL SIZZLE FLAME');
 heater.addComponent('render',{type:'plane',material:shader});
 heater.setPosition(-.59,2.33,1.9);
 heater.setLocalScale(1.2,.65,1.2);
 heater.setLocalEulerAngles(90,0,0);
 app.root.addChild(heater);
 metrics.shaderMaterialCreated=true;
}
function setupLights(){
 app.scene.ambientLight=new pc.Color(.62,.7,.72);
 app.scene.gammaCorrection=pc.GAMMA_SRGB;
 app.scene.toneMapping=pc.TONEMAP_ACES;
 app.scene.exposure=.84;
 const sun=new pc.Entity('KEY LIGHT - warm sun');
 sun.addComponent('light',{type:'directional',color:new pc.Color(1,.91,.76),intensity:1.3,castShadows:true,shadowResolution:1024,shadowDistance:24,shadowBias:.25});
 sun.setLocalEulerAngles(43,18,32);app.root.addChild(sun);
 const fill=new pc.Entity('front softbox');
 fill.addComponent('light',{type:'omni',color:new pc.Color(.75,.95,1),intensity:1.0,range:22,castShadows:false});
 fill.setPosition(-2.5,6.8,5.1);app.root.addChild(fill);
 pulseLight=new pc.Entity('sizzle amber light');
 pulseLight.addComponent('light',{type:'omni',color:new pc.Color(1,.34,.13),intensity:0,range:5,castShadows:false});
 pulseLight.setPosition(-.57,2.5,1.9);app.root.addChild(pulseLight);
}
const HOT_SPOTS={
 bun:[-3.35,2.15,2.03],patty:[-.6,2.1,1.9],grill:[-.6,2.1,1.9],
 cheese:[-3.35,2.15,2.03],lettuce:[-3.35,2.15,2.03],serve:[.85,1.7,2.05]
};
function positionHotspot(){
 const btn=$('hotspot');if(!btn)return;
 if(!app||!S.modelReady||!camera?.camera||S.mode!=='playing'||S.busy>0||S.step>=STEPS.length){btn.style.display='none';return}
 const step=STEPS[S.step],world=HOT_SPOTS[step.id];if(!world){btn.style.display='none';return}
 const pos=camera.camera.worldToScreen(new pc.Vec3(...world));
 const rect=canvas.getBoundingClientRect(),scaleX=rect.width/app.graphicsDevice.width,scaleY=rect.height/app.graphicsDevice.height;
 btn.style.left=Math.round(pos.x*scaleX)+'px';btn.style.top=Math.round(pos.y*scaleY)+'px';
 btn.textContent=step.ico+' TAP';btn.setAttribute('aria-label','Use '+step.label+' at the 3D station');
 btn.style.display='block';
}
function syncDish(){
 if(!hero.burger||!scene)return;
 const visible=S.mode==='playing'||S.mode==='won'?S.step:6;
 hero.burger.forEach(entity=>{
  if(entity===hero.burger)return;
  const n=entity.name.toLowerCase();
  let stage=1;
  if(n.includes('beef')||n.includes('patty'))stage=3;
  else if(n.includes('cheese'))stage=4;
  else if(n.includes('lettuce')||n.includes('tomato')||n.includes('upper')||n.includes('sesame'))stage=5;
  entity.enabled=visible>=stage;
 });
 const panPatty=scene.findByName('pan grilled patty');
 if(panPatty)panPatty.enabled=S.mode!=='playing'||(S.step>=2&&S.step<3);
}
function loadedGLB(){
 hero.chef=scene.findByName('ANIM_CHEF_ROOT');
 hero.head=scene.findByName('ANIM_CHEF_HEAD');
 hero.armL=scene.findByName('ANIM_CHEF_ARM_L');
 hero.armR=scene.findByName('ANIM_CHEF_ARM_R');
 hero.customer0=scene.findByName('ANIM_CUSTOMER_0');
 hero.customer1=scene.findByName('ANIM_CUSTOMER_1');
 hero.burger=scene.findByName('ANIM_BURGER');
 hero.fries=scene.findByName('ANIM_FRIES');
 hero.soda=scene.findByName('ANIM_SODA');
 hero.bell=scene.findByName('ANIM_SERVE_BELL');
 hero.pan=scene.findByName('ANIM_PAN');
 const missing=['chef','head','armL','armR','customer0','customer1','burger','bell','pan'].filter(k=>!hero[k]);
 if(missing.length){throw Error('Missing Blender animated hierarchy: '+missing.join(','))}
 S.modelReady=true;metrics.modelLoaded=true;metrics.scene='blender-glb';
}
async function initialize(){
 try{
  app=new pc.Application(canvas,{graphicsDeviceOptions:{alpha:false,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true}});
  app.graphicsDevice.maxPixelRatio=Math.min(window.devicePixelRatio||1,1.5);
  gl=app.graphicsDevice.gl;metrics.webgl=!!gl;metrics.graphicsAPI=app.graphicsDevice.isWebGL2?'WebGL2':'WebGL';
  if(!gl)throw Error('No supported WebGL graphics context');
  app.start();
  camera=new pc.Entity('CAMERA • staged food truck portrait');
  camera.addComponent('camera',{fov:48,nearClip:.1,farClip:100,clearColor:new pc.Color(.15,.33,.41),priority:0});
  camera.setPosition(0,6.15,10.8);camera.lookAt(0,2.40,-.40);
  app.root.addChild(camera);
  setupLights();
  buildShader();
  window.addEventListener('resize',resizeCanvas,{passive:true});
  resizeCanvas();
  app.assets.loadFromUrl(GLB,'container',(err,asset)=>{
    if(err||!asset||!asset.resource){fail('Original Blender GLB loading failed: '+String(err));return}
    try{scene=asset.resource.instantiateRenderEntity();scene.name='Blender Pantry Environment';app.root.addChild(scene);loadedGLB();window.__panic.rendering={app,camera,scene,hero};
      // Let PlayCanvas render actual material/shader before enabling game gate.
      let tested=0;const interval=setInterval(()=>{
        tested++;const error=gl.getError();
        if(error===gl.NO_ERROR&&tested>=4){
          S.shaderReady=true;metrics.shaderCompiled=true;S.ready=true;
          btn.disabled=false;btn.textContent='🔥 START THE FIRST SHIFT';
          status('🍔 REAL 3D KITCHEN READY!');clearInterval(interval);refresh();
        }else if(tested>30){clearInterval(interval);fail('Shader/WebGL runtime error: '+error)}
      },120);
    }catch(e){fail(e.message)}
  });
  app.on('update',dt=>{
   if(!S.modelReady)return;
   const tm=S.seconds;
   if(hero.head)hero.head.setLocalEulerAngles(Math.sin(tm*1.4)*2,Math.sin(tm*1.8)*7,0);
   if(hero.chef)hero.chef.setLocalEulerAngles(0,Math.sin(tm*.78)*3,Math.sin(tm*2.4)*(S.mode==='playing'?1.5:.8));
   if(hero.armL)hero.armL.setLocalEulerAngles(0,0,Math.sin(tm*4.4)*(S.mode==='playing'?13:4));
   if(hero.armR)hero.armR.setLocalEulerAngles(0,0,-Math.sin(tm*5.1+1)*(S.mode==='playing'?21:5));
   if(hero.customer0)hero.customer0.setLocalPosition(-3.3,.05*Math.sin(tm*3),-3.25);
   if(hero.customer1)hero.customer1.setLocalPosition(3.36,.04*Math.sin(tm*2.6+1),-3.25);
   if(hero.burger)hero.burger.setLocalPosition(-3.35,1.7+(S.step===6?.20:.02*Math.sin(tm*2)) ,2.03);
   if(hero.bell){const b=S.fx>0&&S.step===6?.16*Math.abs(Math.sin(tm*26)):0;hero.bell.setLocalPosition(.85,1.58+b,2.05);}
   if(hero.pan)hero.pan.setLocalPosition(0,S.busy>0?.06*Math.sin(tm*26):0,0);
   if(shader){shader.setParameter('uTime',tm);shader.setParameter('uFire',S.busy>0?.8:S.mode==='playing'?.11:.03);}
   if(pulseLight)pulseLight.light.intensity=S.busy>0?1.4+.28*Math.sin(tm*25):.03;
  });
 }catch(e){fail(e.message)}
}
function resizeCanvas(){if(!app)return;const w=Math.max(1,Math.round(canvas.clientWidth)),h=Math.max(1,Math.round(canvas.clientHeight));app.setCanvasResolution(pc.RESOLUTION_AUTO,w,h);if(camera?.camera){camera.camera.aspectRatio=w/h;}metrics.surface={cssWidth:w,cssHeight:h,frameWidth:app.graphicsDevice.width,frameHeight:app.graphicsDevice.height}}
function fail(message){console.error('PANIC_GATE_FAILED',message);S.modelReady=false;S.shaderReady=false;S.ready=false;metrics.failure=message;btn.disabled=true;btn.textContent='3D VERIFICATION FAILED';status('⚠️ 3D FAILED: '+message.slice(0,55))}
function tick(now){
 const delta=Math.min(.125,(now-last)/1000);last=now;S.seconds+=delta;
 if(S.mode==='playing'){
  S.time=Math.max(0,S.time-delta);
  if(S.time===0){lose()}
  if(S.busy>0){S.busy-=delta;if(S.busy<=0){S.busy=0;S.step++;syncDish();positionHotspot();note('🍳 PERFECT SEAR! KEEP IT MOVING.');toast('✨');audioCue('good')}}
  S.fx=Math.max(0,S.fx-delta);
 }
 S.frames.push(delta);if(S.frames.length>60)S.frames.shift();
 if(S.frames.length>=30){const mean=S.frames.reduce((a,b)=>a+b,0)/S.frames.length;S.fps=Math.round(1/mean);metrics.actualFps=S.fps}
 ui+=delta;if(ui>.12){ui=0;refresh()}
 requestAnimationFrame(tick);
}
initialize();refresh();requestAnimationFrame(tick);
