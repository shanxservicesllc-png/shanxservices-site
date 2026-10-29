import * as pc from 'https://cdn.jsdelivr.net/npm/playcanvas@2.23.3/build/playcanvas.mjs';
// ShanX Streets / SXS Interactive. Independent PlayCanvas engine prototype.
// Source history and all Three.js builds remain intact.
const $=id=>document.getElementById(id);
const panel=$('overlay'),enter=$('enter'),status=$('status'),errNode=$('error'),boot=$('bootState');
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v)),valid=Number.isFinite;
const state={engine:'PlayCanvas 2.23.3',ready:false,entered:false,frames:0,frameRate:0,car:'loading',avatar:'loading',mode:'CHASE',distance:0,driving:false,errors:[],meshes:0};
window.__SXS_PLAYCANVAS_QA__=state;
function report(msg){status.textContent=msg;}
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1700);}
function fail(reason){const msg=String(reason?.stack||reason?.message||reason);state.errors.push(msg);boot.textContent='PlayCanvas could not start this test. See the error below.';errNode.textContent=msg;errNode.hidden=false;$('retry').hidden=false;enter.disabled=true;panel.hidden=false;console.error(reason);}
$('retry').onclick=()=>location.reload();
window.addEventListener('error',e=>{if(!state.ready)fail(e.error||e.message);});
window.addEventListener('unhandledrejection',e=>{if(!state.ready)fail(e.reason);});
let app,camera,world,car=null,human=null,played=false,lastFrame=0,frameCount=0;
let px=0,pz=27,heading=0,walked=0,carYaw=Math.PI,carSpeed=0,driving=false;
let camYaw=0,camPitch=.28,camZoom=1,camMode=0,camPos=new pc.Vec3(0,6,38);
const modes=['CHASE','WIDE','AERIAL'];
let obstacles=[];
function color(hex){const n=parseInt(hex.slice(1),16);return new pc.Color(((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255);}
const materials=new Map();
function mat(hex,gloss=.24){const key=hex+':'+gloss;if(materials.has(key))return materials.get(key);const m=new pc.StandardMaterial();m.diffuse=color(hex);m.gloss=gloss;m.update();materials.set(key,m);return m;}
let meshCount=0;
function box(parent,n,x,y,z,sx,sy,sz,hex,ry=0){const e=new pc.Entity(n);e.addComponent('render',{type:'box',material:mat(hex)});e.setLocalScale(sx,sy,sz);e.setLocalPosition(x,y,z);if(ry)e.setLocalEulerAngles(0,ry,0);parent.addChild(e);meshCount++;return e;}
function ball(parent,n,x,y,z,sx,sy,sz,hex){const e=new pc.Entity(n);e.addComponent('render',{type:'sphere',material:mat(hex)});e.setLocalScale(sx,sy,sz);e.setLocalPosition(x,y,z);parent.addChild(e);meshCount++;return e;}
function house(x,z,rot,seed){
 const g=new pc.Entity('Homewood-inspired residential facade');
 g.setPosition(x,0,z);g.setEulerAngles(0,rot,0);world.addChild(g);
 const n=seed%5,w=8.5+(n%2),h=n===4?7.4:5.7,depth=10.8;
 const brick=['#a56e59','#bd9c87','#987366','#b9a48b','#915d53'][n];
 box(g,'Brick walls',0,h/2,0,w,h,depth,brick);
 box(g,'Sloped roof ridge',0,h+1,0,w+.7,2.0,depth+.6,'#3f4146'); // temporary roof, architectural assets are the next milestone
 const front=depth/2+.06;
 for(let f=0;f<(h>7?3:2);f++){
  for(const side of [-1,1]){
   const xx=side*w*.28,yy=1.7+f*2.45;
   box(g,'Window frame',xx,yy,front,1.65,1.63,.15,'#e5dcd0');
   box(g,'Glass pane',xx,yy,front+.1,1.38,1.42,.07,'#60818f');
   box(g,'Window muntin',xx,yy,front+.16,.055,1.4,.04,'#d7dedf');
  }
 }
 box(g,'Front door',0,1.24,front+.12,1.35,2.30,.11,'#406d5c');
 box(g,'Porch slab',0,.22,front+1.4,w*.72,.28,2.6,'#b8b6ac');
 box(g,'Porch roof',0,2.95,front+1.35,w*.76,.16,2.8,'#3c4145');
 for(const side of [-1,1])box(g,'Porch column',side*w*.29,1.62,front+2,.18,2.7,.18,'#d8c6ae');
 const hx=rot===90||rot===270?depth/2:w/2,hz=rot===90||rot===270?w/2:depth/2;
 obstacles.push({x0:x-hx,x1:x+hx,z0:z-hz,z1:z+hz});
}
function tree(x,z,n){
 box(world,'Street tree trunk',x,2.1,z,.34,4.2,.34,'#594b37');
 ball(world,'Tree canopy',x,5,z,3.65,3.7,3.65,n%2?'#477042':'#557f4a');
}
function makeWorld(){
 world=new pc.Entity('ShanX Streets independent PlayCanvas neighborhood');app.root.addChild(world);
 box(world,'Grass ground',0,-.32,0,480,.52,480,'#68835c');
 const roads=[-75,0,75];
 for(const z of roads){
  box(world,'Asphalt east west',0,.01,z,460,.08,15,'#475055');
  for(const d of [-1,1])box(world,'Pavement',0,.11,z+d*10,460,.20,4.2,'#b3aea5');
  for(let x=-220;x<=220;x+=15)box(world,'East west center line',x,.066,z,5,.012,.12,'#eedb91');
 }
 for(const x of roads){
  box(world,'Asphalt north south',x,.065,0,15,.11,460,'#475055');
  for(const d of [-1,1])box(world,'Pavement',x+d*10,.135,0,4.2,.20,460,'#b3aea5');
  for(let z=-220;z<=220;z+=15)box(world,'North south center line',x,.128,z,.12,.013,5,'#eedb91');
 }
 for(const x of roads)for(const z of roads){
  box(world,'Intersection surface',x,.145,z,16,.06,16,'#475055');
  for(let k=-2;k<=2;k++)box(world,'Crosswalk stripe',x+k*2,.192,z-9,1.12,.012,3.8,'#eee7d8');
 }
 let k=0;
 for(const z of roads)for(const side of [-1,1])for(let x=-192;x<=198;x+=15){
  if(roads.some(r=>Math.abs(r-x)<23))continue;
  house(x,z+side*25,side>0?180:0,++k);
  if(k%3===0)tree(x+6.8,z+side*32,k);
 }
 state.meshes=meshCount;
}
function safeWalk(x,z){
 if(!valid(x)||!valid(z)||Math.abs(x)>215||Math.abs(z)>215)return false;
 for(const a of obstacles)if(x>a.x0-.6&&x<a.x1+.6&&z>a.z0-.6&&z<a.z1+.6)return false;
 return true;
}
function glbAsset(url){return new Promise((resolve,reject)=>app.assets.loadFromUrlAndFilename(url,url.split('/').pop(),'container',(err,a)=>err?reject(Error(String(err))):resolve(a)))}
function measure(entity){
 entity.syncHierarchy();const comps=entity.findComponents('render');const mn=new pc.Vec3(Infinity,Infinity,Infinity),mx=new pc.Vec3(-Infinity,-Infinity,-Infinity);
 let count=0;
 for(const c of comps)for(const mi of c.meshInstances||[]){
  const b=mi.aabb;if(!b)continue;const lo=b.getMin(),hi=b.getMax();
  mn.x=Math.min(mn.x,lo.x);mn.y=Math.min(mn.y,lo.y);mn.z=Math.min(mn.z,lo.z);
  mx.x=Math.max(mx.x,hi.x);mx.y=Math.max(mx.y,hi.y);mx.z=Math.max(mx.z,hi.z);count++;
 }
 if(count===0)throw Error('GLB contains no render mesh');
 return {min:mn,max:mx,size:new pc.Vec3(mx.x-mn.x,mx.y-mn.y,mx.z-mn.z),center:new pc.Vec3((mx.x+mn.x)/2,(mx.y+mn.y)/2,(mx.z+mn.z)/2),count};
}
function placeGlb(asset,name,target,axis){
 const root=new pc.Entity(name);
 const visual=asset.resource.instantiateRenderEntity({castShadows:false});
 app.root.addChild(root);root.addChild(visual);
 const b=measure(visual),length=axis==='y'?b.size.y:Math.max(b.size.z,b.size.x);
 if(!valid(length)||length<.01){root.destroy();throw Error('Invalid GLB dimensions for '+name);}
 const scale=target/length;
 visual.setLocalScale(scale,scale,scale);
 visual.setLocalPosition(-b.center.x*scale,-b.min.y*scale,-b.center.z*scale);
 state[name+'Height']=b.size.y*scale;
 return {root,visual,asset,scale,original:b};
}
const joy={x:0,y:0,id:null};const joyNode=$('joy'),knob=$('knob');
function joyMove(e){
 const r=joyNode.getBoundingClientRect(),radius=r.width*.34;
 let dx=e.clientX-r.left-r.width*.5,dy=e.clientY-r.top-r.height*.5;
 if(!valid(dx)||!valid(dy)||radius<10)return;
 const mag=Math.hypot(dx,dy);if(mag>radius){dx*=radius/mag;dy*=radius/mag;}
 joy.x=clamp(dx/radius,-1,1);joy.y=clamp(-dy/radius,-1,1);
 knob.style.transform='translate('+dx+'px,'+dy+'px)';
}
function joyRelease(e){if(e&&joy.id!==e.pointerId)return;joy.id=null;joy.x=joy.y=0;knob.style.transform='translate(0,0)';}
joyNode.addEventListener('pointerdown',e=>{if(joy.id!==null)return;e.preventDefault();joy.id=e.pointerId;try{joyNode.setPointerCapture(e.pointerId)}catch{}joyMove(e)});
joyNode.addEventListener('pointermove',e=>{if(joy.id===e.pointerId){e.preventDefault();joyMove(e)}});
for(const ev of ['pointerup','pointercancel','lostpointercapture'])joyNode.addEventListener(ev,joyRelease);
let running=false;
$('run').addEventListener('pointerdown',e=>{running=true;e.preventDefault();});
for(const ev of ['pointerup','pointercancel','lostpointercapture'])$('run').addEventListener(ev,()=>running=false);
const keys=new Set();
window.addEventListener('keydown',e=>{if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','KeyE','KeyV'].includes(e.code)){keys.add(e.code);e.preventDefault();}if(e.code==='KeyE'&&!e.repeat)toggleCar();if(e.code==='KeyV'&&!e.repeat)setMode(camMode+1)});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{joyRelease();running=false;keys.clear()});
let drag=null;const canvas=$('app');
canvas.addEventListener('pointerdown',e=>{drag={id:e.pointerId,x:e.clientX,y:e.clientY};try{canvas.setPointerCapture(e.pointerId)}catch{}});
canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;camYaw-=(e.clientX-drag.x)*.006;camPitch=clamp(camPitch+(e.clientY-drag.y)*.004,-.02,.8);drag.x=e.clientX;drag.y=e.clientY;});
for(const ev of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,e=>{if(drag?.id===e.pointerId)drag=null});
function setMode(next){camMode=(next+3)%3;state.mode=modes[camMode];$('view').textContent='◉ '+state.mode+' · CHANGE';toast(state.mode+' CAMERA');}
$('view').onclick=()=>setMode(camMode+1);
$('plus').onclick=()=>{camZoom=clamp(camZoom*.72,.45,2.5);toast('Zoom '+Math.round(camZoom*100)+'%');};
$('minus').onclick=()=>{camZoom=clamp(camZoom*1.38,.45,2.5);toast('Zoom '+Math.round(camZoom*100)+'%');};
$('recenter').onclick=()=>{camYaw=driving?carYaw:heading;camPitch=.28;toast('Camera centered');};
setMode(0);
function toggleCar(){
 if(!state.entered)return;
 if(!car){toast('Detailed vehicle has not loaded');return;}
 const pos=car.root.getPosition();
 if(driving){
  const exits=[{x:pos.x+3.2,z:pos.z},{x:pos.x-3.2,z:pos.z},{x:pos.x,z:pos.z+3.2}].find(p=>safeWalk(p.x,p.z));
  if(!exits){toast('Park in a clear spot to exit');return;}
  px=exits.x;pz=exits.z;driving=false;carSpeed=0;toast('Exited car');
 }else{
  if(Math.hypot(px-pos.x,pz-pos.z)>8){toast('Walk closer to parked car');return;}
  driving=true;carSpeed=0;camYaw=carYaw;toast('Driving. Joystick steers, RUN brakes');
 }
 state.driving=driving;if(human)human.root.enabled=!driving;
 $('useText').textContent=driving?'EXIT CAR':'ENTER CAR';
}
$('use').onclick=toggleCar;
function move(dt){
 const x=clamp(joy.x+(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),-1,1);
 const y=clamp(joy.y+(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0),-1,1);
 const len=Math.hypot(x,y),mag=len>.1?Math.min(1,len):0,sx=mag?x/len:0,sy=mag?y/len:0;
 if(driving&&car){
  carSpeed+=sy*21*dt;carSpeed*=Math.exp(-(running?4.3:.75)*dt);carSpeed=clamp(carSpeed,-8,27);
  carYaw-=sx*dt*(.4+1.2*Math.min(1,Math.abs(carSpeed)/12))*(carSpeed<0?-1:1);
  const pos=car.root.getPosition(),nx=pos.x-Math.sin(carYaw)*carSpeed*dt,nz=pos.z-Math.cos(carYaw)*carSpeed*dt;
  if(valid(nx)&&valid(nz)&&Math.abs(nx)<215&&Math.abs(nz)<215){
    walked+=Math.hypot(nx-pos.x,nz-pos.z);car.root.setPosition(nx,0,nz);car.root.setEulerAngles(0,carYaw*180/Math.PI,0);
    px=nx;pz=nz;
  }else carSpeed=0;
  return;
 }
 const speed=(running||keys.has('ShiftLeft')?6.1:3.4)*mag;
 const dx=(-Math.sin(camYaw)*sy+Math.cos(camYaw)*sx)*speed*dt,dz=(-Math.cos(camYaw)*sy-Math.sin(camYaw)*sx)*speed*dt;
 const beforeX=px,beforeZ=pz;
 if(safeWalk(px+dx,pz))px+=dx;if(safeWalk(px,pz+dz))pz+=dz;
 walked+=Math.hypot(px-beforeX,pz-beforeZ);
 if(Math.hypot(dx,dz)>.0001)heading=Math.atan2(-dx,-dz);
 if(human){human.root.setPosition(px,0,pz);human.root.setEulerAngles(0,heading*180/Math.PI,0);}
}
function cameraUpdate(dt){
 const pos=driving&&car?car.root.getPosition():new pc.Vec3(px,0,pz);
 const dist=[8,30,110][camMode]*camZoom,tilt=camMode===2?1.16:camMode===1?.60:camPitch;
 const goal=new pc.Vec3(pos.x+Math.sin(camYaw)*dist*Math.cos(tilt),1.55+Math.sin(tilt)*dist+[1.6,4,8][camMode],pos.z+Math.cos(camYaw)*dist*Math.cos(tilt));
 camPos.lerp(camPos,goal,clamp(dt*5,0,1));
 camera.setPosition(camPos);camera.lookAt(pos.x,1.5,pos.z);
}
function diagnostics(dt){
 lastFrame+=dt;frameCount++;
 if(lastFrame>=1){state.frameRate=Math.round(frameCount/lastFrame);lastFrame=0;frameCount=0;
 state.distance=Math.round(walked);$('telemetry').textContent=state.engine+' · '+state.frameRate+' FPS · '+(driving?'DRIVING':'ON FOOT')+' · '+state.distance+'m · '+state.mode+' · car:'+state.car+' · character:'+state.avatar;}
}
async function loadCar(){
 const list=['https://developer.playcanvas.com/assets/porsche-911-carrera-4s.glb','https://threejs.org/examples/models/gltf/ferrari.glb','https://cdn.jsdelivr.net/gh/mrdoob/three.js@r170/examples/models/gltf/ferrari.glb'];
 for(const url of list)try{
   report('Loading the detailed imported vehicle…');
   const asset=await glbAsset(url);car=placeGlb(asset,'Detailed 3D imported car',4.65,'z');
   car.root.setPosition(4,0,25);carYaw=Math.PI;car.root.setEulerAngles(0,180,0);
   state.car='ready';state.carSource=url;report('Detailed vehicle loaded. Approach it and use ENTER CAR.');return;
 }catch(e){state.errors.push('Vehicle asset '+url+': '+e.message);}
 state.car='unavailable';report('Detailed vehicle could not load. Walking and camera modes remain usable.');
}
async function loadHuman(){
 const list=['https://models.codelove.in/models/business-male-01.glb','https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CesiumMan/glTF-Binary/CesiumMan.glb'];
 for(const url of list)try{
  const asset=await glbAsset(url);human=placeGlb(asset,'Real-sized imported civilian',1.79,'y');
  human.root.setPosition(px,0,pz);human.root.enabled=!driving;
  state.avatar='ready';state.avatarSource=url;return;
 }catch(e){state.errors.push('Civilian asset '+url+': '+e.message);}
 state.avatar='unavailable';
}
async function start(){
 try{
  boot.textContent='Initializing PlayCanvas WebGL2 engine...';
  const device=await pc.createGraphicsDevice(canvas,{deviceTypes:[pc.DEVICETYPE_WEBGL2]});
  device.maxPixelRatio=Math.min(devicePixelRatio||1,1.2);
  const options=new pc.AppOptions();options.graphicsDevice=device;
  options.componentSystems=[pc.RenderComponentSystem,pc.CameraComponentSystem,pc.LightComponentSystem];
  options.resourceHandlers=[pc.TextureHandler,pc.ContainerHandler];
  app=new pc.AppBase(canvas);app.init(options);
  app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);app.setCanvasResolution(pc.RESOLUTION_AUTO);
  app.scene.ambientLight=new pc.Color(.52,.55,.58);
  camera=new pc.Entity('Third person wide aerial camera');
  camera.addComponent('camera',{clearColor:new pc.Color(.62,.73,.79),nearClip:.04,farClip:800,fov:68});
  app.root.addChild(camera);camera.setPosition(0,7,39);camera.lookAt(0,1.5,27);
  const light=new pc.Entity('Sun');light.addComponent('light',{type:'directional',intensity:2.1,color:new pc.Color(1,.96,.87)});
  light.setEulerAngles(50,30,0);app.root.addChild(light);
  makeWorld();
  if(meshCount<90)throw Error('Scene lacks neighborhood geometry: '+meshCount+' meshes');
  pc.dracoInitialize({jsUrl:'https://developer.playcanvas.com/assets/modules/draco/draco.wasm.js',wasmUrl:'https://developer.playcanvas.com/assets/modules/draco/draco.wasm.wasm',lazyInit:true});
  app.on('update',dt=>{const step=clamp(valid(dt)?dt:0,0,.045);if(state.entered)move(step);cameraUpdate(step);diagnostics(step);state.frames++;
    if(state.frames>=5&&!state.ready){state.ready=true;enter.disabled=false;enter.textContent='ENTER THE STREETS';boot.textContent='PlayCanvas is running; neighborhood geometry present ('+meshCount+' meshes). Imported assets load independently.';}
  });
  app.start();
  window.addEventListener('resize',()=>app.resizeCanvas());
  void loadCar();void loadHuman();
 }catch(e){fail(e);}
}
enter.onclick=()=>{if(!state.ready)return;state.entered=true;panel.hidden=true;report('PlayCanvas streets loaded. CHASE/WIDE/AERIAL camera and analog movement are ready.');};
start();
