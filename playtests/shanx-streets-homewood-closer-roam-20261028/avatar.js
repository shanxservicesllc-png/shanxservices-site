// SXS Interactive | Grounded animated third-person character review, NOT production character art.
// Three.js Soldier.glb reference character: https://threejs.org/examples/models/gltf/Soldier.glb
// Source model is distributed with the three.js examples. Replace with original/cleared
// civilian model after this movement/animation acceptance gate.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function attachAvatar(map,maplibre,originLngLat,onState=()=>{}) {
 const origin=maplibre.MercatorCoordinate.fromLngLat(originLngLat);
 const meters=origin.meterInMercatorCoordinateUnits();
 const scene=new THREE.Scene(), camera=new THREE.Camera();
 const sun=new THREE.DirectionalLight(0xfff6e7,3.0);sun.position.set(30,55,100);scene.add(sun);
 scene.add(new THREE.HemisphereLight(0xe6f9ff,0x565045,2.2));
 let renderer=null,mixer=null,actions={},playing=null,actor=null,visible=false,loaded=false,error='',skinned=0;
 const shadowMat=new THREE.MeshBasicMaterial({color:0x152822,transparent:true,opacity:.31,depthWrite:false});
 const shadow=new THREE.Mesh(new THREE.CircleGeometry(.47,32),shadowMat);
 shadow.position.z=.018;shadow.visible=false;scene.add(shadow);
 const group=new THREE.Group();scene.add(group);
 const state={x:0,y:0,angle:Math.PI,run:false,moving:false};
 const say=(status)=>{try{onState(status)}catch(e){console.warn(e)}};
 function play(name) {
   const action=actions[name]||actions.Idle;
   if(!action||action===playing)return;
   action.enabled=true;action.reset();action.setEffectiveTimeScale(1);action.setEffectiveWeight(1);
   action.play();
   if(playing)playing.crossFadeTo(action,.22,false);
   playing=action;
 }
 const loader=new GLTFLoader();
 loader.load('https://threejs.org/examples/models/gltf/Soldier.glb',gltf=>{
   const object=gltf.scene;
   object.updateMatrixWorld(true);
   const b=new THREE.Box3().setFromObject(object),size=new THREE.Vector3();b.getSize(size);
   const height=size.y||1.8,uniform=THREE.MathUtils.clamp(1.78/height,.01,100);
   object.scale.setScalar(uniform);
   object.position.set(-((b.min.x+b.max.x)/2)*uniform,-b.min.y*uniform,-((b.min.z+b.max.z)/2)*uniform);
   const upright=new THREE.Group();upright.rotation.x=Math.PI/2;upright.add(object);group.add(upright);
   object.traverse(o=>{if(o.isSkinnedMesh){skinned++;o.frustumCulled=false;}});
   mixer=new THREE.AnimationMixer(object);
   for(const clip of gltf.animations||[])actions[clip.name]=mixer.clipAction(clip);
   if(!actions.Idle||!actions.Walk||!actions.Run){
     error='Required Idle / Walk / Run clips missing';
     say({ready:false,error,clips:Object.keys(actions)});
     return;
   }
   loaded=true;play('Idle');say({ready:true,skinned,clips:Object.keys(actions),heightMeters:1.78});map.triggerRepaint();
 },undefined,e=>{
   error='Could not fetch animated Soldier.glb: '+String(e);
   say({ready:false,error});
 });
 function step(st,dt) {
   Object.assign(state,st);
   group.position.set(state.x,state.y,.045);
   group.rotation.z=state.angle+Math.PI/2;
   shadow.position.set(state.x,state.y,.025);
   shadow.visible=visible&&loaded;
   group.visible=visible&&loaded;
   play(state.moving?(state.run?'Run':'Walk'):'Idle');
   mixer?.update(Math.min(.06,dt));
   if(visible)map.triggerRepaint();
 }
 const layer={id:'sxs-rigged-character',type:'custom',renderingMode:'3d',
   onAdd(mp,gl){renderer=new THREE.WebGLRenderer({canvas:mp.getCanvas(),context:gl,antialias:true});
     renderer.autoClear=false;renderer.outputColorSpace=THREE.SRGBColorSpace;},
   render(gl,args){
     if(!visible||!loaded||!renderer)return;
     const cameraMat=new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix);
     const world=new THREE.Matrix4().makeTranslation(origin.x,origin.y,0)
       .scale(new THREE.Vector3(meters,-meters,meters));
     camera.projectionMatrix.copy(cameraMat.multiply(world));
     camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
     renderer.resetState();
     renderer.render(scene,camera);
   },
   onRemove(){renderer?.dispose();renderer=null;scene.traverse(obj=>{if(obj.geometry)obj.geometry.dispose()});}
 };
 map.addLayer(layer);
 say({ready:false,loading:true});
 return {step,setVisible(v){visible=v;group.visible=v;shadow.visible=v&&loaded;map.triggerRepaint()},
   get ready(){return loaded},get error(){return error},get clips(){return Object.keys(actions)},get skinned(){return skinned}};
}
