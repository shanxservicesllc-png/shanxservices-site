// SXS Interactive: isolated, original, Three.js perspective world (NOT raster zoom).
// MapLibre serves as a geographic data collector and separate aerial overview.
// Roads + footprint locations from OSM/OpenFreeMap tiles; visual facade art is approximate.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import * as ml from 'https://unpkg.com/maplibre-gl@6.16.0/dist/maplibre-gl.mjs';

const $=id=>document.getElementById(id);
const ORIGIN=[-79.8929402,40.4568844];
const origin=ml.MercatorCoordinate.fromLngLat(ORIGIN),unit=origin.meterInMercatorCoordinateUnits();
const toLocal=coords=>{
  const m=ml.MercatorCoordinate.fromLngLat(coords);
  return [(m.x-origin.x)/unit,(origin.y-m.y)/unit]; // east, north in meters
};
const toGeo=(x,n)=>{
  const a=new ml.MercatorCoordinate(origin.x+x*unit,origin.y-n*unit).toLngLat();
  return [a.lng,a.lat];
};
const toP=(p)=>new THREE.Vector3(p[0],0,-p[1]);
const typeSize=()=>Math.max(1,Math.min(1.5,devicePixelRatio||1));
const canvas=$('viewport');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.45;
renderer.setPixelRatio(typeSize());
const scene=new THREE.Scene();scene.background=new THREE.Color(0x9fc5da);scene.fog=new THREE.FogExp2(0xabc6d1,.0021);
scene.add(new THREE.HemisphereLight(0xf1faff,0x60685d,2.1));
const sun=new THREE.DirectionalLight(0xfff0d8,3.0);sun.position.set(-80,120,70);scene.add(sun);
const camera=new THREE.PerspectiveCamera(64,1,.08,1100);
const world=new THREE.Group();scene.add(world);
const personRoot=new THREE.Group();scene.add(personRoot);
const shadow=new THREE.Mesh(new THREE.CircleGeometry(.48,24),new THREE.MeshBasicMaterial({color:0x112e22,transparent:true,opacity:.3,depthWrite:false}));
shadow.rotation.x=-Math.PI/2;shadow.position.y=.035;scene.add(shadow);
let modelReady=false,modelError='',clips={},mixer=null,playing=null,spawned=false,roadsLoaded=false,buildingsLoaded=false,worldTiles=0,worldUpdated=0,mapDataError='',lastTileMove=0;
let changed=false,buildings=[],roadSegments=[],seenBuilding=new Set(),seenRoad=new Set(),placeLabel='Homewood',lastTileCenter=[0,0];
const player={x:0,n:0,heading:0,distance:0,angle:0,walkSpeed:3,runSpeed:6.2,active:true};
let cameraHeading=.25,cameraDist=4.2,cameraHeight=2.5,verticalLook=.15;
let lastTime=performance.now(),timeAccumulator=0,frameCount=0,fps=0,wallHits=0;
const input={x:0,y:0,running:false};
let thumbId=null,touchLook=null;

const map=new ml.Map({
  container:'map',style:'https://tiles.openfreemap.org/styles/liberty',
  center:ORIGIN,zoom:17.4,pitch:0,bearing:0,
  interactive:true,attributionControl:true
});
function mapError(msg){mapDataError=String(msg).slice(0,120);}
map.on('error',e=>{if(!buildingsLoaded&&!roadsLoaded)mapError(e?.error?.message||e?.error||'Map tiles unavailable')});
map.on('load',()=>{
  try {
    if(!map.getSource('openmaptiles')&&!map.getSource('sxs-vector'))
      map.addSource('sxs-vector',{type:'vector',url:'https://tiles.openfreemap.org/planet'});
    map.addSource('sxs-true-aerial',{type:'raster',
      tiles:['https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize:256,maxzoom:19,attribution:'Aerial imagery © Esri, Maxar, Earthstar Geographics, GIS User Community'});
    const firstLabel=map.getStyle().layers.find(l=>l.type==='symbol')?.id;
    map.addLayer({id:'sxs-true-aerial-layer',type:'raster',source:'sxs-true-aerial',paint:{'raster-opacity':1}},firstLabel);
    for(const layer of map.getStyle().layers.filter(l=>l.type==='fill-extrusion')){
      if(map.getLayer(layer.id))map.setLayoutProperty(layer.id,'visibility','none');
    }
  }catch(e){console.warn('Aerial reference layer unavailable',e)}
  collectFeatures();
});
map.on('idle',collectFeatures);
map.on('sourcedata',e=>{if(e.isSourceLoaded&&e.sourceId!=='sxs-true-aerial')collectFeatures()});

function hexTexture(kind){
  const c=document.createElement('canvas');c.width=128;c.height=128;
  const ctx=c.getContext('2d');let rng=73591;
  function rand(){rng=(Math.imul(rng,1664525)+1013904223)|0;return (rng>>>0)/4294967296}
  if(kind==='brick'){
    ctx.fillStyle='#b27d66';ctx.fillRect(0,0,128,128);
    for(let row=0;row<8;row++)for(let col=-1;col<6;col++){
      const x=col*27-(row%2)*13.5,y=row*16;
      const t=150+Math.floor(rand()*35);ctx.fillStyle='rgb('+t+','+(83+Math.floor(rand()*28))+','+(64+Math.floor(rand()*21))+')';
      ctx.fillRect(x+1,y+1,25,14);
    }
  }else if(kind==='asphalt'){
    ctx.fillStyle='#454b4d';ctx.fillRect(0,0,128,128);
    for(let i=0;i<3900;i++){const t=55+Math.floor(rand()*60);ctx.fillStyle='rgba('+t+','+t+','+t+',.16)';ctx.fillRect(rand()*128,rand()*128,1.3,1.3)}
  }else{
    ctx.fillStyle='#6b8556';ctx.fillRect(0,0,128,128);
    for(let i=0;i<2200;i++){ctx.fillStyle=rand()>.6?'#8aa46a':'#4e7046';ctx.fillRect(rand()*128,rand()*128,1,4)}
  }
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
  tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  return tex;
}
const grassTex=hexTexture('grass');grassTex.repeat.set(65,65);
const asphaltTex=hexTexture('asphalt');asphaltTex.repeat.set(4,4);
const brickTex=hexTexture('brick');brickTex.repeat.set(2.7,2.1);
const M={
  ground:new THREE.MeshStandardMaterial({map:grassTex,roughness:1}),
  asphalt:new THREE.MeshStandardMaterial({map:asphaltTex,roughness:1}),
  sidewalk:new THREE.MeshStandardMaterial({color:0xb3b1a7,roughness:1}),
  yellow:new THREE.MeshStandardMaterial({color:0xcaba71,roughness:.9}),
  white:new THREE.MeshStandardMaterial({color:0xe9e3c8,roughness:.9}),
  brick:new THREE.MeshStandardMaterial({map:brickTex,roughness:1}),
  roof:new THREE.MeshStandardMaterial({color:0x45494e,roughness:.96,side:THREE.DoubleSide}),
  roofTan:new THREE.MeshStandardMaterial({color:0x645c51,roughness:.97,side:THREE.DoubleSide}),
  trim:new THREE.MeshStandardMaterial({color:0xdbd2c2,roughness:.86}),
  glass:new THREE.MeshStandardMaterial({color:0x5a8090,metalness:.12,roughness:.28}),
  doors:new THREE.MeshStandardMaterial({color:0x265344,roughness:.72}),
  dark:new THREE.MeshStandardMaterial({color:0x292e2d,roughness:1}),
  wood:new THREE.MeshStandardMaterial({color:0x9a8b77,roughness:1}),
  tree:new THREE.MeshStandardMaterial({color:0x3d6541,roughness:1}),
  trunk:new THREE.MeshStandardMaterial({color:0x5d5140,roughness:1})
};
const wallPalette=[M.brick,new THREE.MeshStandardMaterial({color:0xaab2a6,roughness:1}),new THREE.MeshStandardMaterial({color:0xbdb398,roughness:1}),new THREE.MeshStandardMaterial({color:0x997c6a,roughness:1})];
const terrain=new THREE.Mesh(new THREE.PlaneGeometry(1800,1800),M.ground);
terrain.rotation.x=-Math.PI/2;terrain.position.y=-.12;world.add(terrain);
const roadsRoot=new THREE.Group(),houseRoot=new THREE.Group(),decorRoot=new THREE.Group();
world.add(roadsRoot,houseRoot,decorRoot);

function planeQuad(points,material,parent){
  const geo=new THREE.BufferGeometry(),verts=points.flat();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));
  // East/north geographic coordinates map to Three.js X/-Z: flip winding so streets face up.
  geo.setIndex([0,2,1,0,3,2]);geo.computeVertexNormals();
  const mesh=new THREE.Mesh(geo,material);parent.add(mesh);return mesh;
}
function box(parent,material,w,h,d,x,y,z,angle=0){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
 mesh.position.set(x,y,z);mesh.rotation.y=angle;parent.add(mesh);return mesh;
}
function lineStrip(a,b,width,material,parent,height=.013){
 const dx=b[0]-a[0],dn=b[1]-a[1],len=Math.hypot(dx,dn);
 if(len<.7||len>250)return;
 const angle=Math.atan2(dn,dx),nx=-(dn/len)*width/2,ny=(dx/len)*width/2;
 planeQuad([[a[0]+nx,height,-(a[1]+ny)],[b[0]+nx,height,-(b[1]+ny)],[b[0]-nx,height,-(b[1]-ny)],[a[0]-nx,height,-(a[1]-ny)]],material,parent);
}
function seed(k){let a=0;for(let i=0;i<k.length;i++)a=(Math.imul(a,31)+k.charCodeAt(i))|0;return Math.abs(a)}
function distPointSeg(px,pn,a,b){
 const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((px-a[0])*dx+(pn-a[1])*dy)/(dx*dx+dy*dy||1)));
 const x=a[0]+t*dx,n=a[1]+t*dy;return Math.hypot(px-x,pn-n);
}
function insidePolygon(px,pn,pts){
 let inside=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){
 const a=pts[i],b=pts[j];if((a[1]>pn)!==(b[1]>pn)&&px<(b[0]-a[0])*(pn-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }return inside;
}
function wallCollision(px,pn,r=.37){
 for(const b of buildings){
  if(px<b.minX-r||px>b.maxX+r||pn<b.minN-r||pn>b.maxN+r)continue;
  if(insidePolygon(px,pn,b.ring))return true;
  for(let i=0;i<b.ring.length-1;i++)if(distPointSeg(px,pn,b.ring[i],b.ring[i+1])<r)return true;
 }
 return false;
}
function drawRoad(item){
 const pts=item.points,width=item.width,decor=new THREE.Group();
 roadsRoot.add(decor);
 for(let j=0;j<pts.length-1;j++){
 const a=pts[j],b=pts[j+1];const d=Math.hypot(a[0]-b[0],a[1]-b[1]);
 if(d<.8||d>230)continue;
 lineStrip(a,b,width+2.7,M.sidewalk,decor,-.033);
 lineStrip(a,b,width,M.asphalt,decor,.017);
 if(width>=6.5){
  const segs=Math.max(1,Math.floor(d/8));
  for(let k=0;k<segs;k++){
   const t0=(k+.18)/segs,t1=(k+.56)/segs;
   lineStrip([a[0]+(b[0]-a[0])*t0,a[1]+(b[1]-a[1])*t0],
   [a[0]+(b[0]-a[0])*t1,a[1]+(b[1]-a[1])*t1],.11,item.main?M.yellow:M.white,decor,.032);
  }
 }
 }
 return decor;
}
function lineFeatures(features){
 for(const f of features){
  if(!f.geometry)continue;
  const geom=f.geometry;
  const lines=geom.type==='LineString'?[geom.coordinates]:geom.type==='MultiLineString'?geom.coordinates:[];
  const cls=String(f.properties?.class||f.properties?.type||'');
  if(/rail|track|ferry|path|steps|footway|pedestrian|cycleway|service_minor/i.test(cls))continue;
  const width=/primary|trunk/i.test(cls)?11:/secondary|tertiary/i.test(cls)?9:/service/i.test(cls)?5.1:7;
  for(const arr of lines){
   if(arr.length<2||arr.length>600)continue;
   const points=arr.map(toLocal);
   for(let k=0;k<points.length-1;k++){
    const p=points[k],q=points[k+1];
    if(Math.hypot(p[0]-player.x,p[1]-player.n)>430&&Math.hypot(q[0]-player.x,q[1]-player.n)>430)continue;
    const id=[p[0].toFixed(1),p[1].toFixed(1),q[0].toFixed(1),q[1].toFixed(1),width].join(':');
    if(seenRoad.has(id))continue;seenRoad.add(id);
    roadSegments.push({points:[p,q],width,main:width>=9,id});
   }
  }
 }
}
function buildingFeatures(features){
 for(const f of features){
  const g=f.geometry;if(!g)continue;
  const rings=g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[];
  for(const polygon of rings){
   if(!polygon[0]||polygon[0].length<4||polygon[0].length>55)continue;
   const ring=polygon[0].map(toLocal);
   const cx=ring.reduce((x,p)=>x+p[0],0)/ring.length,cn=ring.reduce((x,p)=>x+p[1],0)/ring.length;
   if(Math.hypot(cx-player.x,cn-player.n)>420)continue;
   const minX=Math.min(...ring.map(p=>p[0])),maxX=Math.max(...ring.map(p=>p[0]));
   const minN=Math.min(...ring.map(p=>p[1])),maxN=Math.max(...ring.map(p=>p[1]));
   if(maxX-minX<3||maxN-minN<3||(maxX-minX)*(maxN-minN)>1800)continue;
   const key=[cx.toFixed(1),cn.toFixed(1),Math.round(maxX-minX),Math.round(maxN-minN)].join(':');
   if(seenBuilding.has(key))continue;seenBuilding.add(key);
   buildings.push({ring,minX,maxX,minN,maxN,cx,cn,key,height:Number(f.properties?.render_height)||0});
  }
 }
}
function collectFeatures(){
 const source=map.getSource('openmaptiles')?'openmaptiles':map.getSource('sxs-vector')?'sxs-vector':null;
 if(!source)return;
 let br=[],rr=[];
 try{br=map.querySourceFeatures(source,{sourceLayer:'building'});rr=map.querySourceFeatures(source,{sourceLayer:'transportation'});}catch(e){mapError('Vector tile query: '+e.message);return}
 let oldB=buildings.length,oldR=roadSegments.length;
 if(br.length)buildingFeatures(br);if(rr.length)lineFeatures(rr);
 if(buildings.length!==oldB||roadSegments.length!==oldR){
  worldTiles++;worldUpdated=performance.now();buildingsLoaded=buildings.length>0;roadsLoaded=roadSegments.length>0;
  rebuildNearby(true);
 }
 if(!roadsLoaded&&rr.length===0)mapDataError='Road tile data has not arrived; 3D street geometry is incomplete.';
 if(!buildingsLoaded&&br.length===0)mapDataError='Building tile data has not arrived; 3D facades are incomplete.';
}
function nearestRoad(b){
 let pick=null,dist=Infinity;
 for(const seg of roadSegments){
  const d=distPointSeg(b.cx,b.cn,seg.points[0],seg.points[1]);
  if(d<dist){dist=d;pick=seg}
 }return {seg:pick,dist};
}
function drawHouse(b){
 const w=b.maxX-b.minX,d=b.maxN-b.minN,area=w*d,hash=seed(b.key),isShop=area>280||w>23||d>24;
 const floors=isShop?Math.min(3,Math.max(1,Math.ceil((b.height||5)/3.5))):hash%5===0?3:2;
 const height=b.height>3?Math.min(16,b.height):floors*3.05;
 const material=wallPalette[hash%wallPalette.length],roofMat=(hash%2?M.roof:M.roofTan);
 const root=new THREE.Group();houseRoot.add(root);
 // Each wall follows the true OSM footprint, not a guessed rectilinear map.
 for(let i=0;i<b.ring.length-1;i++){
  const a=b.ring[i],c=b.ring[i+1],dx=c[0]-a[0],dn=c[1]-a[1],len=Math.hypot(dx,dn);
  if(len<.25)continue;
  box(root,material,len,height,.18,(a[0]+c[0])/2,height/2,-(a[1]+c[1])/2,Math.atan2(dn,dx));
 }
 // Pitched roof: actual footprint extents, assumed roof style.
 // For irregular large businesses use a parapet slab.
 if(isShop){
  box(root,roofMat,w+.4,.25,d+.4,b.cx,height+.2,-b.cn);
  for(let i=0;i<4;i++){
   const x=i%2?b.maxX:b.minX,z=i<2?-b.minN:-b.maxN;
   box(root,M.trim,.12,.4,.12,x,height+.38,z);
  }
 }else{
  const e=.23,peak=Math.min(2.3,Math.max(.9,d*.28)),x1=b.minX-e,x2=b.maxX+e,z1=-b.minN+e,z2=-b.maxN-e,zc=(z1+z2)/2,hh=height+.12;
  planeQuad([[x1,hh,z1],[x2,hh,z1],[x2,hh+peak,zc],[x1,hh+peak,zc]],roofMat,root);
  planeQuad([[x1,hh+peak,zc],[x2,hh+peak,zc],[x2,hh,z2],[x1,hh,z2]],roofMat,root);
  // Decorative fascia and ridge.
  box(root,M.trim,w+.42,.08,.11,b.cx,hh+peak,zc);
 }
 // Frontage chosen from nearest known road; this is NOT address-level facade survey.
 let front=b.ring[0],end=b.ring[1],best=Infinity;
 const rd=nearestRoad(b);
 for(let i=0;i<b.ring.length-1;i++){
  const a=b.ring[i],c=b.ring[i+1],len=Math.hypot(a[0]-c[0],a[1]-c[1]);if(len<3.2)continue;
  const dist=rd.seg?Math.min(distPointSeg((a[0]+c[0])/2,(a[1]+c[1])/2,...rd.seg.points)):1;
  if(dist<best){best=dist;front=a;end=c}
 }
 const dx=end[0]-front[0],dn=end[1]-front[1],len=Math.hypot(dx,dn);
 if(len>=3.1){
  const ux=dx/len,un=dn/len,edgeX=(front[0]+end[0])/2,edgeN=(front[1]+end[1])/2;
  const ang=Math.atan2(dn,dx),nx=-un,nN=ux;
  // Non-address-specific ornament at front wall plane.
  const porchWidth=isShop?0:Math.min(4.5,len-.4),depth=1.5;
  const outwardX=edgeX-b.cx,outwardN=edgeN-b.cn;
  const sign=(outwardX*nx+outwardN*nN)>=0?1:-1;
  const outX=nx*sign,outN=nN*sign;
  const facade=(along,depthOut)=>
    [edgeX+ux*along+outX*depthOut, -(edgeN+un*along+outN*depthOut)];
  const [doorX,doorZ]=facade(0,.12);
  const door=box(root,M.doors,1.0,2.28,.16,doorX,1.14,doorZ,ang);
  for(let fl=0;fl<floors;fl++){
   const yy=fl*3.03+1.67;
   for(const t of [-.31,.31]){
    const [wx,wz]=facade(t*len,.16);
    box(root,M.trim,1.23,1.5,.17,wx,yy,wz,ang);
    box(root,M.glass,1.0,1.22,.20,wx,yy,wz-.003,ang);
    box(root,M.trim,.065,1.25,.22,wx,yy,wz,ang);
    box(root,M.trim,1.1,.07,.24,wx,yy,wz,ang);
   }
  }
  if(!isShop&&porchWidth>=2.1){
   const [sx,sz]=facade(0,depth*.54);
   box(root,M.sidewalk,porchWidth,.19,depth,sx,.22,sz,ang);
   const [roofX,roofZ]=facade(0,depth*.48);
   box(root,roofMat,porchWidth+.3,.14,depth+.3,roofX,3.02,roofZ,ang);
   for(const t of [-.43,.43]){
    const [px,pz]=facade(t*porchWidth,depth*.90);
    box(root,M.trim,.12,2.65,.12,px,1.59,pz);
   }
   for(let k=0;k<3;k++){
    const [px,pz]=facade(0,depth+.15+k*.29);
    box(root,M.sidewalk,Math.min(2.0,porchWidth),.18,.34,px,.17-k*.047,pz,ang);
   }
  }else{
   const [sx,sz]=facade(0,.19);box(root,M.wood,Math.min(6,len-.5),.8,.18,sx,height-.64,sz,ang);
  }
 }
 return root;
}
function tree(x,n,scale=1) {
 const g=new THREE.Group();g.position.set(x,0,-n);
 const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.14*scale,.21*scale,3.2*scale,6),M.trunk);trunk.position.y=1.6*scale;g.add(trunk);
 for(const [y,r] of [[3.35,1.35],[4.05,1.2],[4.65,.9]]){
  const c=new THREE.Mesh(new THREE.IcosahedronGeometry(r*scale,1),M.tree);c.position.set(0,y*scale,0);g.add(c);
 }
 decorRoot.add(g);
}
function disposeChildren(group){
 for(const obj of [...group.children]){
  group.remove(obj);obj.traverse(child=>{if(child.geometry)child.geometry.dispose()});
 }
}
let builtCenter=[Infinity,Infinity],drawnBuildings=0,drawnRoads=0;
function rebuildNearby(force=false){
 if(!force&&Math.hypot(player.x-builtCenter[0],player.n-builtCenter[1])<40)return;
 builtCenter=[player.x,player.n];
 disposeChildren(houseRoot);disposeChildren(roadsRoot);disposeChildren(decorRoot);
 terrain.position.set(player.x,-.12,-player.n);
 const nearRoads=roadSegments.filter(s=>s.points.some(p=>Math.hypot(p[0]-player.x,p[1]-player.n)<230));
 for(const item of nearRoads.slice(0,260))drawRoad(item);drawnRoads=Math.min(260,nearRoads.length);
 const near=buildings.map(b=>({b,d:Math.hypot(b.cx-player.x,b.cn-player.n)})).filter(x=>x.d<160).sort((a,b)=>a.d-b.d);
 for(const {b} of near.slice(0,55))drawHouse(b);
 drawnBuildings=Math.min(55,near.length);
 const candidates=near.slice(0,45);
 for(let i=0;i<candidates.length;i++){
  if(i%3!==0)continue;const b=candidates[i].b;
  const nearRoad=nearestRoad(b);if(!nearRoad.seg)continue;
  const seg=nearRoad.seg,dx=b.cx-seg.points[0][0],dn=b.cn-seg.points[0][1],vx=seg.points[1][0]-seg.points[0][0],vn=seg.points[1][1]-seg.points[0][1];
  const len=Math.hypot(vx,vn);if(len<2)continue;
  const nx=-vn/len,nn=vx/len,sign=dx*nx+dn*nn>=0?1:-1;
  const nearest=seg.points[0],t=Math.max(0,Math.min(1,(dx*vx+dn*vn)/(len*len)));
  const tx=nearest[0]+t*vx+nx*sign*(seg.width*.5+2.8),tn=nearest[1]+t*vn+nn*sign*(seg.width*.5+2.8);
  if(!wallCollision(tx,tn,1.5))tree(tx,tn,.75+(i%4)*.12);
 }
}
function chooseRoadSpawn(){
 if(spawned||!roadSegments.length)return;
 const sorted=roadSegments.slice().sort((a,b)=>{
  const da=distPointSeg(0,0,...a.points),db=distPointSeg(0,0,...b.points);return da-db;
 });
 let chosen=null,nearest=Infinity;
 for(const seg of sorted.slice(0,35)){
  const [a,b]=seg.points,vx=b[0]-a[0],vn=b[1]-a[1],len2=vx*vx+vn*vn;
  const t=Math.max(0,Math.min(1,(-a[0]*vx-a[1]*vn)/(len2||1)));
  const x=a[0]+t*vx,n=a[1]+t*vn;
  const vlen=Math.sqrt(len2)||1,nx=-vn/vlen,nn=vx/vlen;
  for(const sign of [-1,1]){
   const px=x+sign*nx*(seg.width/2+1.6),pn=n+sign*nn*(seg.width/2+1.6);
   const d=Math.hypot(px,pn);
   if(!wallCollision(px,pn,.65)&&d<nearest){nearest=d;chosen=[px,pn]}
  }
 }
 if(chosen){player.x=chosen[0];player.n=chosen[1];player.angle=0;}
 spawned=true;rebuildNearby(true);
}
function importTilesTick(){
 if(!roadsLoaded||!buildingsLoaded){collectFeatures();return}
 const now=performance.now();
 if(now-lastTileMove>2400&&Math.hypot(player.x-lastTileCenter[0],player.n-lastTileCenter[1])>65){
  lastTileMove=now;lastTileCenter=[player.x,player.n];
  map.jumpTo({center:toGeo(player.x,player.n),zoom:17.4,pitch:0,bearing:0});
 }
 if(now-worldUpdated>1800)collectFeatures();
}
// Character with skinned rig + animation, based on established example.
let lastAnim='';
function animateClip(name){
 if(!modelReady||!clips[name]||name===lastAnim)return;
 const next=clips[name];next.reset().play().setEffectiveWeight(1).setEffectiveTimeScale(1);
 if(lastAnim&&clips[lastAnim])clips[lastAnim].crossFadeTo(next,.20,false);
 lastAnim=name;
}
new GLTFLoader().load('https://threejs.org/examples/models/gltf/Soldier.glb',
 gltf=>{
  const object=gltf.scene;
  object.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(object),size=new THREE.Vector3();b.getSize(size);
  let ratio=1.8/(size.y||1.8);ratio=THREE.MathUtils.clamp(ratio,.01,100);
  object.scale.setScalar(ratio);
  object.position.set(-(b.min.x+b.max.x)*ratio/2,-b.min.y*ratio,-(b.min.z+b.max.z)*ratio/2);
  object.traverse(o=>{if(o.isSkinnedMesh)o.frustumCulled=false;});
  personRoot.add(object);mixer=new THREE.AnimationMixer(object);
  for(const clip of gltf.animations||[])clips[clip.name]=mixer.clipAction(clip);
  modelReady=Object.keys(clips).includes('Idle')&&Object.keys(clips).includes('Walk')&&Object.keys(clips).includes('Run');
  if(!modelReady)modelError='Required animation clips missing: '+Object.keys(clips).join(',');
  else animateClip('Idle');
  $('intro').hidden=true;
 },undefined,err=>{modelError='3D character failed to load: '+String(err);$('intro').hidden=true;});
let lastFootprintCheck=0;
function move(dt){
 const a=Math.hypot(input.x,input.y);let pace=0;
 if(a>.08){
  const strafe=input.x/a,forward=-input.y/a;
  const fx=Math.sin(cameraHeading),fn=Math.cos(cameraHeading),rightX=Math.cos(cameraHeading),rightN=-Math.sin(cameraHeading);
  const vx=rightX*strafe+fx*forward,vn=rightN*strafe+fn*forward;
  const speed=(input.running?player.runSpeed:player.walkSpeed)*Math.min(1,a);
  let px=player.x, pn=player.n,nx=px+vx*speed*dt,nn=pn+vn*speed*dt;
  if(!wallCollision(nx,pn,.35))player.x=nx;else wallHits++;
  if(!wallCollision(player.x,nn,.35))player.n=nn;else wallHits++;
  pace=Math.hypot(player.x-px,player.n-pn);
  player.distance+=pace;
  const desired=Math.atan2(vx,vn);
  player.angle+=Math.atan2(Math.sin(desired-player.angle),Math.cos(desired-player.angle))*Math.min(1,dt*10);
  if(pace>0.002)animateClip(input.running?'Run':'Walk');else animateClip('Idle');
 }else animateClip('Idle');
 personRoot.position.set(player.x,.015,-player.n);
 personRoot.rotation.y=player.angle;
 shadow.position.x=player.x;shadow.position.z=-player.n;
 if(mixer)mixer.update(dt);
 if(Math.hypot(player.x-builtCenter[0],player.n-builtCenter[1])>42)rebuildNearby();
}
function updateCamera(dt){
 const fx=Math.sin(cameraHeading),fn=Math.cos(cameraHeading);
 const look=new THREE.Vector3(player.x+fx*.45,1.46,-player.n-fn*.45);
 const camX=player.x-fx*cameraDist,camN=player.n-fn*cameraDist;
 const camY=cameraHeight+verticalLook;
 const desired=new THREE.Vector3(camX,camY,-camN);
 // Camera collision with house footprints: pull forward from a wall if necessary.
 for(let s=1;s>=0;s-=.15){
   const tx=player.x+(camX-player.x)*s,tn=player.n+(camN-player.n)*s;
   if(!wallCollision(tx,tn,.25)){desired.x=tx;desired.z=-tn;break}
 }
 camera.position.lerp(desired,Math.min(1,dt*12));camera.lookAt(look);
}
function updateUI(){
 const loc=toGeo(player.x,player.n);
 $('status').innerHTML='TRUE 3D CAMERA<br>'+drawnBuildings+' houses · '+drawnRoads+' street segments';
 $('hud').textContent= (modelReady?'ANIMATED AVATAR':'MODEL NOT READY')+
   ' · '+Math.round(player.distance)+'m walked · '+(fps||0)+' FPS · '+loc[1].toFixed(5)+', '+loc[0].toFixed(5);
 if(!modelReady&&modelError)fault(modelError);
 else if(!buildingsLoaded||!roadsLoaded)fault('3D game geometry incomplete: OSM map tiles not yet loaded. '+mapDataError);
 else fault('');
}
function fault(v){$('fault').textContent=v;$('fault').classList.toggle('show',!!v);}

const stick=$('stick'),knob=$('knob');
function thumb(e){
 const r=stick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,limit=r.width*.32;
 let x=(e.clientX-cx)/limit,y=(e.clientY-cy)/limit;
 const len=Math.max(1,Math.hypot(x,y));x/=len;y/=len;
 input.x=x;input.y=y;
 knob.style.transform='translate(calc(-50% + '+Math.round(x*limit)+'px),calc(-50% + '+Math.round(y*limit)+'px))';
}
stick.addEventListener('pointerdown',e=>{e.preventDefault();thumbId=e.pointerId;stick.setPointerCapture(e.pointerId);thumb(e)});
stick.addEventListener('pointermove',e=>{if(e.pointerId===thumbId){e.preventDefault();thumb(e)}});
function releaseThumb(){thumbId=null;input.x=input.y=0;knob.style.transform='translate(-50%,-50%)';}
for(const k of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(k,releaseThumb);
const run=$('run');
run.addEventListener('pointerdown',e=>{e.preventDefault();run.setPointerCapture(e.pointerId);input.running=true;run.classList.add('down')});
for(const k of ['pointerup','pointercancel','lostpointercapture'])run.addEventListener(k,()=>{input.running=false;run.classList.remove('down')});
canvas.addEventListener('pointerdown',e=>{if(e.clientX<innerWidth*.43)return;canvas.setPointerCapture(e.pointerId);touchLook={id:e.pointerId,x:e.clientX,y:e.clientY}});
canvas.addEventListener('pointermove',e=>{if(!touchLook||touchLook.id!==e.pointerId)return;cameraHeading-=(e.clientX-touchLook.x)*.005;verticalLook=THREE.MathUtils.clamp(verticalLook+(e.clientY-touchLook.y)*.009,-.7,1.35);touchLook={id:e.pointerId,x:e.clientX,y:e.clientY};});
for(const k of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(k,()=>touchLook=null);
$('closer').onclick=()=>cameraDist=Math.max(2.25,cameraDist-.55);
$('farther').onclick=()=>cameraDist=Math.min(7,cameraDist+.55);
$('recenter').onclick=()=>{player.x=player.n=player.distance=player.angle=0;cameraHeading=.25;cameraDist=4.2;spawned=false;chooseRoadSpawn();rebuildNearby(true);};
$('proofButton').onclick=()=>$('proof').classList.toggle('show');
$('streetPhoto').onclick=()=>{
 const coords=toGeo(player.x,player.n);
 window.open('https://www.google.com/maps/@?api=1&map_action=pano&viewpoint='+coords[1].toFixed(7)+','+coords[0].toFixed(7),'_blank','noopener,noreferrer');
};
function setView(mode){
 const isMap=mode==='aerial';document.body.classList.toggle('aerial',isMap);
 $('play').classList.toggle('current',!isMap);$('aerial').classList.toggle('current',isMap);
 if(isMap){const c=toGeo(player.x,player.n);map.resize();map.jumpTo({center:c,zoom:18,pitch:0,bearing:0});}
 else{map.resize();importTilesTick();}
}
$('play').onclick=()=>setView('game');
$('aerial').onclick=()=>setView('aerial');
window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();map.resize()});
renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
camera.position.set(1,3.5,5);camera.lookAt(0,1,0);
setTimeout(()=>{$('intro').hidden=true;if(!buildingsLoaded||!roadsLoaded)updateUI()},6500);
function loop(now){
 const dt=Math.min(.055,Math.max(0,(now-lastTime)/1000));lastTime=now;
 if(!document.body.classList.contains('aerial')){
  move(dt);updateCamera(dt);
  renderer.render(scene,camera);
  frameCount++;timeAccumulator+=dt;
  if(timeAccumulator>=1){fps=Math.round(frameCount/timeAccumulator);frameCount=0;timeAccumulator=0;updateUI();}
  if(roadsLoaded&&buildingsLoaded&&!spawned)chooseRoadSpawn();
  if(now-lastFootprintCheck>2400){lastFootprintCheck=now;importTilesTick();}
 }
 requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
window.__sxsReview={get isThreeD(){return true},get modelReady(){return modelReady},get modelError(){return modelError},get roads(){return roadSegments.length},get buildings(){return buildings.length},get position(){return toGeo(player.x,player.n)},get traveledMeters(){return player.distance},get fps(){return fps},get wallHits(){return wallHits},get input(){return {...input}}};
