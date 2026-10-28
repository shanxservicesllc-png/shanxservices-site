import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

/* ShanX Streets · original browser game systems; no earlier Streets game code reused.
   Detailed model assets are loaded, NEVER synthesized from cartoon primitives. */
const $ = id => document.getElementById(id);
const canvas=$('world'),button=$('play'),loading=$('loading');
const isMobile=/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
const renderer=new THREE.WebGLRenderer({canvas,antialias:!isMobile,powerPreference:'default',alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,isMobile?1:1.45));
renderer.setSize(innerWidth,innerHeight,false);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.25;
renderer.shadowMap.enabled=!isMobile;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();scene.background=new THREE.Color('#899aaa');scene.fog=new THREE.Fog('#889cae',74,220);
const camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.25,400);
scene.add(new THREE.HemisphereLight('#e4edf7','#60685d',1.85));
const sun=new THREE.DirectionalLight('#ffe3ba',2.2);
sun.position.set(-55,85,40);sun.castShadow=true;
sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-90;sun.shadow.camera.right=90;sun.shadow.camera.top=90;sun.shadow.camera.bottom=-90;sun.shadow.camera.far=200;sun.shadow.bias=-.0006;scene.add(sun);
const clock=new THREE.Clock();
const loader=new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
// Ferrari glTF meshes use KHR_draco_mesh_compression; configure before loadAsync.
const dracoLoader=new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
dracoLoader.setDecoderConfig({type:'js'});
loader.setDRACOLoader(dracoLoader);
const materials=new Map(),geometry=new THREE.BoxGeometry(1,1,1);
function material(color,roughness=.86,metalness=0){const key=color+':'+roughness+':'+metalness;if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness,metalness}));return materials.get(key);}
function cube(parent,mat,x,y,z,sx,sy,sz,shadows=false){const mesh=new THREE.Mesh(geometry,typeof mat==='string'?material(mat):mat);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.receiveShadow=true;mesh.castShadow=shadows;parent.add(mesh);return mesh;}
function texture(kind){const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');
 g.fillStyle=kind==='brick'?'#cab7ab':kind==='street'?'#454c53':kind==='stone'?'#9b9a93':'#575756';g.fillRect(0,0,512,512);
 const rng=(x,y)=>(Math.sin(x*127.1+y*311.7)*43758.5453)%1;
 if(kind==='brick'){for(let row=0;row<26;row++){let y=row*20;for(let col=-1;col<9;col++){
 const x=col*70+(row%2?35:0),v=Math.abs(rng(col,row))*.27;
 g.fillStyle='rgb('+Math.floor(125+v*125)+','+Math.floor(76+v*105)+','+Math.floor(66+v*80)+')';g.fillRect(x+2,y+2,67,17);
 }g.fillStyle='#bfc0b1';g.fillRect(0,y,512,2);}}
 else {for(let i=0;i<13000;i++){const x=Math.random()*512,y=Math.random()*512,alpha=kind==='street'?.055:.09;g.fillStyle='rgba(12,19,21,'+alpha+')';g.fillRect(x,y,Math.random()*3+1,Math.random()*3+1);}}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
const brick=new THREE.MeshStandardMaterial({map:texture('brick'),roughness:.94});
const asphalt=new THREE.MeshStandardMaterial({map:texture('street'),roughness:1});
const concrete=new THREE.MeshStandardMaterial({map:texture('stone'),roughness:.99});
const metal=material('#48545b',.52,.38),glass=material('#526d7b',.18,.15),wood=material('#604a3b');
function signTexture(label,color){const c=document.createElement('canvas');c.width=1024;c.height=220;const g=c.getContext('2d');
g.fillStyle=color;g.fillRect(0,0,1024,220);g.strokeStyle='#dbd4bb';g.lineWidth=9;g.strokeRect(15,15,994,190);
g.fillStyle='#efe8d6';g.textAlign='center';g.font='bold 79px Arial';g.fillText(label,512,139,930);
const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
// Ground / road meshes. Street names are artistic labels, not a surveyed or digitized map.
const turf=new THREE.Mesh(new THREE.PlaneGeometry(310,310),material('#596b5d'));turf.rotation.x=-Math.PI/2;turf.position.y=-.07;turf.receiveShadow=true;scene.add(turf);
// V1.1: no coplanar overlapping asphalt at intersections, or sidewalks across driving lanes.
const streetCenterX=[{x:0,width:15},{x:54,width:12}];
const crossZ=[-49,61],crossWidth=13;
function streetStrip(x0,x1,z,depth,walk=false){
 if(x1<=x0)return;
 cube(scene,walk?concrete:asphalt,(x0+x1)/2,walk?.13:.018,z,x1-x0,walk?.24:.13,depth);
}
function northStrip(z0,z1,x,width,walk=false){
 if(z1<=z0)return;
 cube(scene,walk?concrete:asphalt,x,walk?.13:.018,(z0+z1)/2,walk?4:width,walk?.24:.13,z1-z0);
}
for(const road of streetCenterX)northStrip(-122.5,122.5,road.x,road.width);
const across=[[-92.5,-7.5],[7.5,48],[60,92.5]];
for(const z of crossZ)for(const [left,right] of across)streetStrip(left,right,z,crossWidth,false);
// Long sidewalks must stop at intersections instead of building invisible barriers.
const nSegments=[[-122.5,-55.5],[-42.5,54.5],[67.5,122.5]];
for(const road of streetCenterX)for(const side of [-1,1]){
 const x=road.x+side*(road.width/2+2.1);
 for(const [z0,z1] of nSegments)northStrip(z0,z1,x,road.width,true);
}
// East/west sidewalks must also leave north/south crossings open.
const eSegments=[[-92.5,-7.5],[7.5,48],[60,92.5]];
for(const z of crossZ)for(const side of [-1,1])for(const [left,right] of eSegments){
 streetStrip(left,right,z+side*(crossWidth/2+2.1),4,true);
}
for(let z=-114;z<=113;z+=10){cube(scene,'#d1bc86',0,.099,z,.17,.018,4.4);cube(scene,'#d1bc86',54,.099,z,.17,.018,4.4);}
for(let x=-87;x<=88;x+=10)for(const z of [-49,61])cube(scene,'#d4bf8c',x,.102,z,4,.018,.16);
for(const z of [-49,61])for(let x=-5;x<=5;x+=1.35){cube(scene,'#e9e5d9',x,.11,z+5.6,.74,.016,1.65);cube(scene,'#e9e5d9',x,.11,z-5.6,.74,.016,1.65);}
const houses=[];
function roof(parent,width,depth,base,height){const shape=new THREE.Shape();shape.moveTo(-width/2,0);shape.lineTo(0,height);shape.lineTo(width/2,0);shape.closePath();
const ext=new THREE.ExtrudeGeometry(shape,{depth:depth+1,bevelEnabled:false});ext.computeVertexNormals();
const r=new THREE.Mesh(ext,material('#43494f'));r.position.set(0,base,-depth/2-.5);r.castShadow=true;r.receiveShadow=true;parent.add(r);}
function house(x,z,w=10,d=13,h=8,style='home',palette=0){
 const root=new THREE.Group();root.position.set(x,0,z);root.rotation.y=x>0?Math.PI/2:-Math.PI/2;scene.add(root);
 const facade=['#aa9b88','#8c938f','#b0a38d','#b5a48b'][palette%4],isShop=style==='shop';
 cube(root,isShop?material(facade):brick,0,h/2,0,w,h,d,true);
 cube(root,material('#454a50'),0,h+.18,0,w+.9,.35,d+.9,true);
 if(!isShop&&palette%2===1)roof(root,w,d,h,h*.22);
 // Continuous cornice, sills, authentic front entrance and window recesses
 for(const y of [1.4,h-1.0])cube(root,material('#cec9b8'),0,y,-d/2-.10,w,.25,.35);
 for(const level of [0,1])for(const side of [-1,1]){
  const wx=side*w*.28,wy=3.5+level*2.85;if(wy>h-1)continue;
  cube(root,material('#d9d7ca'),wx,wy,-d/2-.13,1.75,2.15,.24);
  cube(root,glass,wx,wy,-d/2-.29,1.48,1.86,.09);
  cube(root,material('#d7d7cf'),wx,wy,-d/2-.36,.10,1.85,.09);
  cube(root,material('#d7d7cf'),wx,wy,-d/2-.36,1.48,.08,.09);
  cube(root,material('#8a7f71'),wx,wy-1.12,-d/2-.43,2,.20,.55);
 }
 if(isShop){
  const pane=material('#304855',.2,.18);
  cube(root,pane,0,1.6,-d/2-.21,w*.91,2.95,.20);
  for(let k=-2;k<=2;k++)cube(root,material('#d4c8b5'),k*w*.18,1.65,-d/2-.34,.13,3,.17);
  cube(root,material(palette%2===0?'#3a5f65':'#835a4b'),0,3.4,-d/2-1,w*1.01,.23,2.1,true);
  const lab=palette%2===0?'HOMEWOOD MARKET':'CORNER BARBER';
  const board=new THREE.Mesh(new THREE.PlaneGeometry(w*.95,1.5),new THREE.MeshBasicMaterial({map:signTexture(lab,palette%2===0?'#27464e':'#6d463d'),side:THREE.DoubleSide}));
  board.position.set(0,4.62,-d/2-.38);root.add(board);
  cube(root,wood,0,1.4,-d/2-.43,1.4,2.74,.13);
 }else{
  // Recessed doorway, stoop, porch pillars, railing and short steps.
  cube(root,wood,0,1.42,-d/2-.3,1.55,2.65,.18);
  cube(root,material('#e0d9cb'),0,.37,-d/2-1.35,w*.91,.25,2.3,true);
  for(const sx of [-1,1]){
   cube(root,material('#d8cdbb'),sx*w*.43,1.32,-d/2-2.4,.20,2.5,.21,true);
   cube(root,material('#8d8176'),sx*w*.42,.78,-d/2-1.48,.11,1.05,1.9);
  }
  cube(root,material('#cfc7b8'),0,2.62,-d/2-1.30,w*.96,.18,2.5,true);
  for(let step=0;step<3;step++)cube(root,concrete,0,.08+step*.15,-d/2-2.7+step*.4,2.6,.16,.44);
 }
 cube(root,concrete,0,.14,-d/2-3.9,w*.70,.13,1.8);
 houses.push({x,z,w,d,halfX:d/2+.20,halfZ:w/2+.25,mesh:root});
 return root;
}
for(const side of [-1,1]){
 for(let k=-7;k<=7;k++){const z=k*14.25;
  if(Math.abs(z+49)<11||Math.abs(z-61)<11)continue;
  const type=(k===-2||k===4)?'shop':'home';
  house(side*21,z,10.9,13.7,type==='shop'?6.5:8.1+(k%3)*.9,type,k+8);
 }
}
function tree(x,z){const root=new THREE.Group();root.position.set(x,0,z);scene.add(root);
 const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.14,.24,4.0,8),wood);trunk.position.y=2;root.add(trunk);
 for(let j=0;j<4;j++){const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(1.22,1),material(j%2?'#51684a':'#69794b'));crown.scale.set(1.13,.93,1.1);crown.position.set((j%2?-.6:.6),4.6+(j%2)*.45,(j-1.5)*.35);root.add(crown);}
}
function lamp(x,z){const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
 const pole=new THREE.Mesh(new THREE.CylinderGeometry(.08,.12,6,10),metal);pole.position.y=3;g.add(pole);
 cube(g,metal,.6,5.84,0,1.28,.15,.12);
 cube(g,material('#fff3c6'),1.16,5.69,0,.43,.20,.39);}
for(const x of [-11.1,11.1,42.8,65.6])for(let z=-105;z<108;z+=24){if(Math.abs(z+49)<10||Math.abs(z-61)<10)continue;tree(x,z+8);if((z/24|0)%2)lamp(x,z-5);}
function hydrant(x,z){const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);const red=material('#b35e4a',.42,.23);
 let stem=new THREE.Mesh(new THREE.CylinderGeometry(.24,.29,.84,12),red);stem.position.y=.43;g.add(stem);
 let cap=new THREE.Mesh(new THREE.SphereGeometry(.31,12,10),red);cap.position.y=.86;g.add(cap);
 const arm=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.65,10),red);arm.rotation.z=Math.PI/2;arm.position.y=.65;g.add(arm);}
hydrant(-11,-31);hydrant(11,42);
const dumpsters=[];
for(const [x,z] of [[-12,-16],[12,23],[43,78]]){const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
 cube(g,material('#51655c'),0,.72,0,1.9,1.3,1.1,true);
 cube(g,material('#313e39'),0,1.42,0,2.08,.16,1.24);dumpsters.push(g);}
function intersects(x,z,r=0){if(Math.abs(x)>116||Math.abs(z)>116)return true;
 for(const h of houses)if(Math.abs(x-h.x)<h.halfX+r&&Math.abs(z-h.z)<h.halfZ+r)return true;return false;}
const player={x:1.4,z:31.5,yaw:0,driving:false,run:false},car={x:8.7,z:34,yaw:0,speed:0},
 cameraRig={yaw:0,pitch:.18,dist:6.5,first:false,pointer:null,cx:0,cy:0};
let playerModel=null,playerMixer=null,animations={},carVisual=null,modelHeight=1.8,modelFrontOffset=0;
const traffic=[],walkers=[],allCars=[];
function normalizeModel(model,targetHeight,axis='y'){
 const bbox=new THREE.Box3().setFromObject(model);const size=bbox.getSize(new THREE.Vector3()),min=bbox.min;
 const extent=axis==='z'?size.z:size.y;
 if(!Number.isFinite(extent)||extent<.001)throw new Error('Asset has invalid dimensions');
 const scale=targetHeight/extent;const wrap=new THREE.Group();model.scale.setScalar(scale);
 model.position.set(-(bbox.min.x+bbox.max.x)*.5*scale,-min.y*scale,-(bbox.min.z+bbox.max.z)*.5*scale);wrap.add(model);return wrap;
}
function findClip(clips,names){return clips.find(c=>names.some(n=>c.name.toLowerCase().includes(n)))||null;}
function makeCharacter(gltf,x,z,kind='npc'){
 const root=new THREE.Group();scene.add(root);
 const model=cloneSkinned(gltf.scene);
 const wrap=normalizeModel(model,1.78);
 root.add(wrap);root.position.set(x,0,z);
 root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}});
 const mixer=new THREE.AnimationMixer(model),clips=gltf.animations||[];
 // Support animated characters with 1-3 clips, or static rigged meshes while
 // alternate animation downloads are unavailable. Animation is never an entry gate.
 const idleSource=findClip(clips,['idle'])||clips[0]||null;
 const walkSource=findClip(clips,['walk'])||clips[0]||null;
 const runSource=findClip(clips,['run'])||walkSource;
 const acts={};
 for(const [label,source] of Object.entries({idle:idleSource,walk:walkSource,run:runSource})){
  if(!source)continue;
  const clip=source.clone();clip.name='SXS_'+label+'_'+kind+'_'+Math.round(x*100)+'_'+Math.round(z*100);
  const action=mixer.clipAction(clip);
  action.enabled=true;action.play();action.setEffectiveWeight(label==='idle'?1:0);
  action.timeScale=(label==='idle'&&source===walkSource&&source===runSource)?0.001:label==='walk'&&source===runSource?.5:1;
  acts[label]=action;
 }
 const state={root,model,mixer,acts,x,z,speed:kind==='player'?0:1.15,dir:1,home:z,kind};
 return state;
}
function animationState(state,motion){
 if(!state)return;
 for(const [name,a] of Object.entries(state.acts)){const active=name===motion||(!state.acts[motion]&&name==='idle');a.setEffectiveWeight(active?1:0);}
}
function vehicle(gltf,x,z,paint='#385e77'){
 const root=new THREE.Group();scene.add(root);root.position.set(x,0,z);
 const model=gltf.scene.clone(true);const wrap=normalizeModel(model,4.6,'z');root.add(wrap);
 wrap.rotation.y=0; // Later calibrated using the actual front/rear wheel positions.
 model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;
  if(o.name.toLowerCase().includes('body')&&o.material){o.material=o.material.clone();o.material.color.set(paint);}
 }});
 const wheels=[];model.traverse(o=>{if(/wheel/i.test(o.name))wheels.push(o);});
 // Calibrate the model's nose from physical wheel axles, not assumed glTF orientation.
 const front=model.getObjectByName('wheel_fl')||model.getObjectByName('rim_fl');
 const rear=model.getObjectByName('wheel_rl')||model.getObjectByName('rim_rl');
 let modelForward=-1;
 if(front&&rear){
  root.updateMatrixWorld(true);
  const fz=front.getWorldPosition(new THREE.Vector3()).z;
  const rz=rear.getWorldPosition(new THREE.Vector3()).z;
  if(Math.abs(fz-rz)>.02)modelForward=Math.sign(fz-rz);
 }
 wrap.rotation.y=modelForward>0?Math.PI:0;
 const v={root,wrap,wheels,x,z,yaw:0,speed:0,active:true,modelForward,measuredFront:!!(front&&rear)};
 allCars.push(v);return v;
}
const avatarRoot=new THREE.Group();scene.add(avatarRoot);
let driven=null;
function worldCarPosition(c,dt=1/60){c.root.position.set(c.x,0,c.z);c.root.rotation.y=c.yaw;for(const w of c.wheels)w.rotation.x+=c.speed*dt*1.9;}
function carCollision(x,z,omit=null,range=3.5){return allCars.some(v=>v!==omit&&Math.hypot(v.x-x,v.z-z)<range);}
function pedestrianCollision(x,z){if(!player.driving&&Math.hypot(player.x-x,player.z-z)<1.7)return true;return walkers.some(w=>Math.hypot(w.x-x,w.z-z)<1.7);}
// Overlapping a vehicle never traps a pedestrian: moving away remains possible.
function footCarSafe(nextX,nextZ,oldX,oldZ){
 for(const c of allCars){
  const before=Math.hypot(oldX-c.x,oldZ-c.z),after=Math.hypot(nextX-c.x,nextZ-c.z);
  if(after<2.1&&after<before-.005)return false;
 }return true;
}
function vehicleBlocked(v,x,z){const dx=x-v.x,dz=z-v.z,steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.6));for(let i=1;i<=steps;i++){const xx=v.x+dx*i/steps,zz=v.z+dz*i/steps;if(intersects(xx,zz,1.5)||carCollision(xx,zz,v,4.3)||pedestrianCollision(xx,zz))return true;}return false;}
function mark(msg){$('toast').textContent=msg;$('toast').classList.add('visible');clearTimeout(mark.handle);mark.handle=setTimeout(()=>$('toast').classList.remove('visible'),2300);}
const joy={id:null,x:0,z:0};
function joyReset(){joy.id=null;joy.x=joy.z=0;$('stick').style.setProperty('--x','0px');$('stick').style.setProperty('--y','0px');}
function joyMove(e){const r=$('thumb').getBoundingClientRect();let x=(e.clientX-r.left-r.width*.5)/(r.width*.32),z=(e.clientY-r.top-r.height*.5)/(r.height*.32);const len=Math.max(1,Math.hypot(x,z));joy.x=x/len;joy.z=z/len;$('stick').style.setProperty('--x',(joy.x*r.width*.32)+'px');$('stick').style.setProperty('--y',(joy.z*r.height*.32)+'px');}
$('thumb').addEventListener('pointerdown',e=>{if(joy.id!==null)return;joy.id=e.pointerId;$('thumb').setPointerCapture(e.pointerId);joyMove(e);e.preventDefault();});
$('thumb').addEventListener('pointermove',e=>{if(e.pointerId===joy.id)joyMove(e);});
for(const typ of ['pointerup','pointercancel','lostpointercapture'])$('thumb').addEventListener(typ,e=>{if(joy.id===e.pointerId)joyReset();});
const keys={};const controlMap={KeyW:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right'};
document.addEventListener('keydown',e=>{
 if(['TEXTAREA','INPUT','SELECT'].includes(document.activeElement.tagName))return;
 const k=controlMap[e.code];if(k){keys[k]=true;e.preventDefault();}
 if(e.code==='ShiftLeft'||e.code==='ShiftRight')keys.run=true;
 if(e.code==='KeyE'&&!e.repeat)toggleCar();
 if(e.code==='KeyR'&&!e.repeat)recenter();
 if(e.code==='KeyV'&&!e.repeat)changeCamera();
});
document.addEventListener('keyup',e=>{const k=controlMap[e.code];if(k)keys[k]=false;if(e.code==='ShiftLeft'||e.code==='ShiftRight')keys.run=false;});
canvas.addEventListener('pointerdown',e=>{if(!ready||!playing||cameraRig.pointer!==null||(e.pointerType==='mouse'&&e.button!==0))return;
 cameraRig.pointer=e.pointerId;cameraRig.cx=e.clientX;cameraRig.cy=e.clientY;canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(cameraRig.pointer!==e.pointerId)return;
 cameraRig.yaw-=(e.clientX-cameraRig.cx)*.007;cameraRig.pitch=THREE.MathUtils.clamp(cameraRig.pitch-(e.clientY-cameraRig.cy)*.004,.14,.95);
 cameraRig.cx=e.clientX;cameraRig.cy=e.clientY;});
for(const t of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(t,e=>{if(cameraRig.pointer===e.pointerId)cameraRig.pointer=null;});
function changeCamera(){cameraRig.first=!cameraRig.first;$('view').textContent=cameraRig.first?'◉ SWITCH TO CHASE':'◉ SWITCH TO CLOSE';mark(cameraRig.first?'CLOSE VIEW':'THIRD-PERSON CHASE VIEW');}
function recenter(){cameraRig.yaw=player.yaw;cameraRig.pitch=.18;mark('CAMERA RECENTERED');}
$('center').onclick=recenter;$('view').onclick=changeCamera;
$('run').addEventListener('pointerdown',e=>{keys.run=true;e.preventDefault();});
for(const event of ['pointerup','pointercancel','lostpointercapture'])$('run').addEventListener(event,()=>keys.run=false);
function toggleCar(){
 if(!ready||!playing||!driven)return;
 if(player.driving){const sides=[3.2,-3.2],loc=sides.map(d=>({x:driven.x+d,z:driven.z})).find(a=>!intersects(a.x,a.z,.6)&&!carCollision(a.x,a.z,driven,1.6));
  if(!loc){mark('MOVE THE CAR TO A CLEAR SPACE TO EXIT');return;}
  player.x=loc.x;player.z=loc.z;player.driving=false;car.speed=0;driven.speed=0;mark('ON FOOT');
 }else if(Math.hypot(player.x-driven.x,player.z-driven.z)<7.2){
  player.driving=true;driven.speed=0;cameraRig.yaw=driven.yaw;mark('DRIVE · LEFT STICK STEERS · RUN BRAKES');
 }else {mark('GET CLOSER TO THE CAR');return;}
 $('useText').textContent=player.driving?'EXIT CAR':'ENTER CAR';
}
$('use').onclick=toggleCar;
function move(dt){
 const ix=THREE.MathUtils.clamp(joy.x+(keys.right?1:0)-(keys.left?1:0),-1,1);
 const iz=THREE.MathUtils.clamp(joy.z+(keys.down?1:0)-(keys.up?1:0),-1,1);
 if(player.driving&&driven){
  driven.speed+=(-iz)*20*dt;driven.speed*=Math.exp(-(keys.run?4.2:.72)*dt);
  driven.speed=THREE.MathUtils.clamp(driven.speed,-9,32);
  driven.yaw-=ix*dt*(.35+1.15*Math.min(1,Math.abs(driven.speed)/13))*(driven.speed<0?-1:1);
  const x=driven.x-Math.sin(driven.yaw)*driven.speed*dt,z=driven.z-Math.cos(driven.yaw)*driven.speed*dt;
  if(!vehicleBlocked(driven,x,z)){driven.x=x;driven.z=z;}else driven.speed=0;
  worldCarPosition(driven);player.x=driven.x;player.z=driven.z;player.yaw=driven.yaw;
  // Camera can be rotated independently while the driver steers.
  if(playerModel)playerModel.root.visible=false;
 }else{
  const mag=Math.max(1,Math.hypot(ix,iz)),dx=(Math.cos(cameraRig.yaw)*ix+Math.sin(cameraRig.yaw)*iz)/mag,dz=(-Math.sin(cameraRig.yaw)*ix+Math.cos(cameraRig.yaw)*iz)/mag;
  const vel=keys.run?7.4:3.5;const nx=player.x+dx*vel*dt,nz=player.z+dz*vel*dt;
  if(!intersects(nx,player.z,.45)&&footCarSafe(nx,player.z,player.x,player.z))player.x=nx;
  if(!intersects(player.x,nz,.45)&&footCarSafe(player.x,nz,player.x,player.z))player.z=nz;
  const moving=Math.abs(dx)+Math.abs(dz)>.09;
  if(moving)player.yaw=Math.atan2(-dx,-dz);
  if(playerModel){playerModel.root.visible=true;playerModel.root.position.set(player.x,0,player.z);playerModel.root.rotation.y=player.yaw;
   animationState(playerModel,moving?(keys.run?'run':'walk'):'idle');}
 }
}
function animateWorld(dt,sec){
 for(const c of traffic){
  // Direction is independent of collision state; NPC cars never reverse to escape traffic.
  c.speed=c.cruise;
  const next=c.z+c.cruise*dt,wrap=next>111||next< -111;
  const nz=wrap?(next>111?-111:111):next;
  const clear=wrap?(!carCollision(c.x,nz,c,4.3)&&!pedestrianCollision(c.x,nz)):
                   !vehicleBlocked(c,c.x,nz);
  if(clear){c.z=nz;c.waitTime=0;c.waiting=false;}
  else{
   c.waitTime+=dt;c.waiting=true;
   // Traffic must yield, but should never teleport through a visible obstacle.
   if(c.waitTime>6)c.stuckCount++;
  }
  c.yaw=c.cruise>0?Math.PI:0;
  worldCarPosition(c);
 }
 for(let i=0;i<walkers.length;i++){
  const w=walkers[i],next=w.z+w.dir*w.speed*dt;
  if(Math.abs(next-w.home)>19)w.dir*=-1;
  else if(!carCollision(w.x,next,null,3.5)){w.z=next;w.root.position.z=w.z;w.root.rotation.y=w.dir>0?Math.PI:0;animationState(w,'walk');}
  else animationState(w,'idle');
 }
 for(const a of walkers)a.mixer.update(dt);
 if(playerMixer)playerMixer.update(dt);
}
function cameraStep(dt){
 const pivot=new THREE.Vector3(player.x,player.driving?1.40:1.24,player.z);
 const dist=cameraRig.first?1.4:player.driving?8.8:6.5;
 const up=cameraRig.first?.5:player.driving?2.25:1.25;
 const desired=pivot.clone().add(new THREE.Vector3(
  Math.sin(cameraRig.yaw)*dist*Math.cos(cameraRig.pitch),
  Math.sin(cameraRig.pitch)*dist+up,
  Math.cos(cameraRig.yaw)*dist*Math.cos(cameraRig.pitch)));
 // V1.1 camera: intersect the character-to-camera segment with building volumes,
 // rather than relying on front-face raycasts (which miss inside/back-face collisions).
 const displacement=desired.clone().sub(pivot);
 const steps=Math.max(5,Math.ceil(displacement.length()/.40));let fraction=1;
 for(let i=1;i<=steps;i++){
  const t=i/steps,q=pivot.clone().addScaledVector(displacement,t);
  if(houses.some(h=>Math.abs(q.x-h.x)<h.halfX+.40&&
    Math.abs(q.z-h.z)<h.halfZ+.40&&q.y>=-.3&&q.y<12.9)){
   fraction=Math.max(.17,(i-2)/steps);break;
  }
 }
 if(fraction<1)desired.copy(pivot).addScaledVector(displacement,fraction);
 // Imported vehicles are opaque meshes: don't let the camera enter their cabin/body.
 const carOccludes=q=>allCars.some(c=>Math.abs(q.x-c.x)<1.5&&Math.abs(q.z-c.z)<2.65&&q.y<2.6&&q.y>-.1);
 const span=desired.clone().sub(pivot),num=Math.max(4,Math.ceil(span.length()/.28));
 for(let i=1;i<=num;i++){
  const q=pivot.clone().addScaledVector(span,i/num);
  if(carOccludes(q)){desired.copy(pivot).addScaledVector(span,Math.max(.14,(i-2)/num));break;}
 }
 const blended=camera.position.clone().lerp(desired,Math.min(1,dt*8));
 const inside=houses.some(h=>Math.abs(blended.x-h.x)<h.halfX+.4&&
    Math.abs(blended.z-h.z)<h.halfZ+.4&&blended.y>=-.3&&blended.y<12.9);
 camera.position.copy((inside||carOccludes(blended))?desired:blended);
 camera.lookAt(pivot);
}
const map=$('mini'),ctx=map.getContext('2d');
function drawMap(){
 ctx.clearRect(0,0,220,220);ctx.fillStyle='#13252c';ctx.fillRect(0,0,220,220);ctx.fillStyle='#6b797f';
 for(const x of [0,54])ctx.fillRect(110+x*.7-5,0,10,220);
 for(const z of [-49,61])ctx.fillRect(0,110+z*.7-5,220,10);
 ctx.fillStyle='#f5d99d';for(const c of traffic)ctx.fillRect(108+c.x*.7,108+c.z*.7,5,7);
 if(driven){ctx.fillStyle='#7bbede';ctx.fillRect(107+driven.x*.7,107+driven.z*.7,7,10);}
 ctx.save();ctx.translate(110+player.x*.7,110+player.z*.7);ctx.rotate(-player.yaw);
 ctx.fillStyle='#e9fff6';ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(-5,5);ctx.lineTo(5,5);ctx.fill();ctx.restore();
}
let ready=false,playing=false,frames=0,stamp=performance.now(),statusFrame=0;
function loop(){
 requestAnimationFrame(loop);const dt=Math.min(.045,clock.getDelta());
 if(ready&&playing){move(dt);animateWorld(dt,performance.now()/1000);}
 cameraStep(dt);renderer.render(scene,camera);
 const now=performance.now();frames++;
 if(now-stamp>1100){
  $('fps').textContent=Math.round(frames*1000/(now-stamp))+' FPS';
  frames=0;stamp=now;
  if(ready&&playing){$('stats').childNodes[0].textContent=player.driving?'PLAYER · DRIVING · ':'PLAYER · ON FOOT · ';
   const name=player.z< -37?'HAMILTON AVENUE':player.z>49?'FRANKSTOWN AVENUE':'N HOMEWOOD AVENUE';
   $('location').firstChild.textContent=name;
  }
 }
 drawMap();
}
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
addEventListener('resize',resize);
window.addEventListener('blur',()=>{joyReset();keys.run=false;for(const k of Object.keys(controlMap))keys[controlMap[k]]=false;});
function openFeedback(){ $('dim').hidden=false;$('feedback').hidden=false;$('message').focus();}
function shutFeedback(){ $('dim').hidden=true;$('feedback').hidden=true;}
$('commentOpen').onclick=openFeedback;$('close').onclick=shutFeedback;$('dim').onclick=shutFeedback;
$('feedback').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape')shutFeedback();});
function mail(){ $('send').href='mailto:henry.shannon@shanxservices.com?subject='+encodeURIComponent('ShanX Streets new game feedback')+'&body='+encodeURIComponent('Game: ShanX Streets Homewood Rebuild 2026-10-28\nTester: '+($('person').value.trim()||'Not provided')+'\nCategory: '+$('subject').value+'\n\nFeedback:\n'+$('message').value.trim());}
for(const id of ['person','subject','message'])for(const event of ['input','change'])$(id).addEventListener(event,mail);
$('send').onclick=e=>{if(!$('message').value.trim()){e.preventDefault();$('formStatus').textContent='Write a comment before opening your email.';return;}mail();$('formStatus').textContent='Your email draft should open; press Send in your email app to deliver.';};mail();
button.onclick=()=>{if(!ready)return;playing=true;$('overlay').hidden=true;mark('WELCOME TO THE BLOCK · WALK OR DRIVE');};
// Separate assets: the detailed car scene is the playable minimum.
// Civilian GLBs and animation URLs are optional enhancement, not launch blockers.
const assetProof={vehicle:'loading',civilian:'loading',animation:'pending',errors:[],urlSources:[],recovery:'cars-first'};
function recordAssetError(label,error){const str=label+': '+String(error?.message||error);assetProof.errors.push(str);console.warn('[Streets assets]',str);}
async function loadCivilianNonBlocking(){
 const urlList=[
  'https://models.codelove.in/models/business-male-01.glb',
  'https://models.codelove.in/models/business-male-02.glb',
  'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CesiumMan/glTF-Binary/CesiumMan.glb'
 ];
 let character=null;
 for(const url of urlList){
  try{character=await loader.loadAsync(url);assetProof.urlSources.push(url);break;}
  catch(error){recordAssetError('Civilian download '+url,error);}
 }
 if(!character){
  assetProof.civilian='failed';
  loading.textContent='Detailed cars and driving ready. Civilian model did not load; scene remains playable. See diagnostics.';
  return;
 }
 // Animations for CodeLove compatible Biped rigs; Cesium Man has its own clips.
 if(assetProof.urlSources[assetProof.urlSources.length-1].includes('codelove')){
  const motions=[
   ['idle','https://models.codelove.in/animations/m_idle_neutral_01.glb'],
   ['walk','https://models.codelove.in/animations/m_walk_neutral_01.glb'],
   ['run','https://models.codelove.in/animations/m_run_neutral_01.glb']
  ];
  const results=await Promise.allSettled(motions.map(async ([name,url])=>{
   const data=await loader.loadAsync(url);
   if(!data.animations?.length)throw Error('No animation in '+url);
   const clip=data.animations[0].clone();clip.name=name;return clip;
  }));
  const valid=results.filter(r=>r.status==='fulfilled').map(r=>r.value);
  for(let i=0;i<results.length;i++)if(results[i].status==='rejected')recordAssetError(motions[i][0]+' animation',results[i].reason);
  if(valid.length)character.animations=valid;
  assetProof.animation=valid.length+'/3 clips';
 }else assetProof.animation=(character.animations?.length||0)+' sample clips';
 try{
  playerModel=makeCharacter(character,player.x,player.z,'player');
  playerMixer=playerModel.mixer;animationState(playerModel,'idle');
  // NPCs are optional; skipping unverified clone counts keeps tablet memory bounded.
  assetProof.civilian='ready';
  loading.textContent='Detailed cars ready · civilian 3D character loaded · ENTER THE STREETS';
 }catch(error){assetProof.civilian='failed';recordAssetError('Civilian mesh or rig',error);
  loading.textContent='Cars and driving ready; civilian rig is incompatible, but gameplay remains available.';
 }
}
async function assets(){
 const status=s=>loading.textContent=s;
 status('Loading detailed 3D cars and roads…');
 const carURL='https://threejs.org/examples/models/gltf/ferrari.glb';
 const backupURL='https://cdn.jsdelivr.net/gh/mrdoob/three.js@r170/examples/models/gltf/ferrari.glb';
 let vehicleAsset=null;
 for(const url of [carURL,backupURL]){
  try{vehicleAsset=await loader.loadAsync(url);assetProof.urlSources.push(url);break;}
  catch(error){recordAssetError('Detailed vehicle download',error);}
 }
 if(!vehicleAsset){
  assetProof.vehicle='failed';
  status('3D VEHICLE UNAVAILABLE. Check connection, then retry. '+assetProof.errors.join(' | '));
  button.disabled=false;button.textContent='↻ RETRY LOADING';button.onclick=()=>location.reload();return;
 }
 driven=vehicle(vehicleAsset,car.x,car.z,'#346f89');worldCarPosition(driven);
 for(let i=0;i<3;i++){
  const c=vehicle(vehicleAsset,i%2?3:-3,-91+i*44,['#7b7772','#634a45','#7a8a8e'][i]);
  c.cruise=i%2?-6:7;c.speed=c.cruise;c.yaw=c.speed>0?Math.PI:0;
  c.waitTime=0;c.stuckCount=0;traffic.push(c);worldCarPosition(c);
 }
 assetProof.vehicle='ready';
 ready=true;
 status('Detailed cars, roads, joystick and drive/exit controls ready. Civilian loading separately…');
 button.disabled=false;button.textContent='▶ ENTER THE STREETS';
 // Independent non-blocking asset lane.
 void loadCivilianNonBlocking().catch(error=>{
  assetProof.civilian='failed';recordAssetError('Civilian async phase',error);
 });
}

camera.position.set(0,9,15);clock.getDelta();loop();
assets().catch(err=>{loading.textContent='GAME INITIALIZATION ERROR: '+String(err.message||err);console.error(err);});
window.__SHANX_STREETS_REBUILD_QA__={state:()=>({version:'cars-first-load-2.0',get assetProof(){return assetProof},carsSource:'Three.js detailed Ferrari glTF',vehicleForward:driven?{sign:driven.modelForward,measured:driven.measuredFront}:null,ready,playing,driving:player.driving,characters:walkers.length+(playerModel?1:0),playerVisible:!!(playerModel&&playerModel.root.visible),vehicles:allCars.length,traffic:traffic.map(c=>({x:c.x,z:c.z,velocity:c.cruise,waiting:c.waiting,waitTime:c.waitTime})),houses:houses.length,fps:$('fps').textContent,animated:!!playerMixer}),stop:()=>playing=false};
