// SXS Interactive browser walking gate. Movement and collision intentionally separate
// from the building rendering and animated character loader.
export function createGameplay(map,ml,originLngLat,avatar,onStats=()=>{}) {
 const origin=ml.MercatorCoordinate.fromLngLat(originLngLat), unit=origin.meterInMercatorCoordinateUnits();
 const ll=(x,y)=>new ml.MercatorCoordinate(origin.x+x*unit,origin.y-y*unit).toLngLat();
 const $=x=>document.getElementById(x);
 let active=false,last=performance.now(),cameraYaw=Math.PI,viewPitch=69,drag=null,clipPolys=[],collisionsReady=false;
 let ox=0,oy=0,x=0,y=0,face=Math.PI,running=false,navCount=0,clashes=0,moving=false,viewChanged=false;
 const keys=new Set();
 const distSq=(a,b,c,d)=>{let vx=c-a,vy=d-b;const t=Math.max(0,Math.min(1,((x-a)*vx+(y-b)*vy)/(vx*vx+vy*vy||1)));return (x-(a+t*vx))**2+(y-(b+t*vy))**2};
 function inside(pt,poly) {
   let inner=false;const px=pt[0],py=pt[1];
   for(let i=0,j=poly.length-1;i<poly.length;j=i++){
     const a=poly[i],b=poly[j];if((a[1]>py)!==(b[1]>py)&&px<(b[0]-a[0])*(py-a[1])/(b[1]-a[1])+a[0])inner=!inner;
   }return inner;
 }
 function blocked(px,py,rad=.3) {
   if(!collisionsReady)return false;
   for(const p of clipPolys){
     if(px<p.minX-rad||px>p.maxX+rad||py<p.minY-rad||py>p.maxY+rad)continue;
     if(inside([px,py],p.points))return true;
     if(rad>0){for(let i=0;i<p.points.length;i++){
       const a=p.points[i],b=p.points[(i+1)%p.points.length],dx=b[0]-a[0],dy=b[1]-a[1];
       const t=Math.max(0,Math.min(1,((px-a[0])*dx+(py-a[1])*dy)/(dx*dx+dy*dy||1)));
       const qx=a[0]+t*dx,qy=a[1]+t*dy;
       if((px-qx)**2+(py-qy)**2<rad*rad)return true;
     }}
   }return false;
 }
 function toLocal(coord){const m=ml.MercatorCoordinate.fromLngLat(coord);return [(m.x-origin.x)/unit,(origin.y-m.y)/unit];}
 function refreshCollision() {
   const source=map.getSource('openmaptiles')?'openmaptiles':map.getSource('sxs-vector')?'sxs-vector':null;
   if(!source)return;
   let features;try{features=map.querySourceFeatures(source,{sourceLayer:'building'});}catch(e){return;}
   if(!features?.length)return;
   const seen=new Set(),polys=[];
   for(const f of features){
     const polygons=f.geometry?.type==='Polygon'?[f.geometry.coordinates]:
       f.geometry?.type==='MultiPolygon'?f.geometry.coordinates:[];
     for(const group of polygons){
       if(!group?.[0]||group[0].length>180)continue;
       const pts=group[0].map(toLocal), key=(f.id||'')+'|'+pts[0]?.[0].toFixed(1)+':'+pts[0]?.[1].toFixed(1);
       if(seen.has(key))continue;seen.add(key);
       const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
       if(minX>250||maxX< -250||minY>250||maxY< -250)continue;
       polys.push({points:pts,minX,maxX,minY,maxY});
     }
   }
   if(!polys.length)return;
   clipPolys=polys;collisionsReady=true;
   if(blocked(x,y,.7)&&!moving){
     let found=false;
     for(let r=2;r<=30&&!found;r+=2)for(let i=0;i<24&&!found;i++){
       const px=x+r*Math.cos(i*Math.PI/12),py=y+r*Math.sin(i*Math.PI/12);
       if(!blocked(px,py,.8)){x=px;y=py;ox=x;oy=y;found=true;}
     }
   }
 }
 function camera(force=false) {
   if(!active)return;
   const cx=x+Math.cos(cameraYaw)*3,cy=y+Math.sin(cameraYaw)*3;
   map.jumpTo({center:ll(cx,cy),zoom:19.2,pitch:viewPitch,bearing:90-cameraYaw*180/Math.PI});
   if(force)onStats({position:ll(x,y),collisionData:collisionsReady,buildings:clipPolys.length,avatarReady:avatar.ready,clashes});
 }
 function enable(){active=true;viewChanged=true;keys.clear();avatar.setVisible(true);refreshCollision();camera(true);}
 function disable(){active=false;keys.clear();running=false;avatar.setVisible(false);}
 function reset(){x=ox;y=oy;face=Math.PI;cameraYaw=Math.PI;viewPitch=69;keys.clear();running=false;viewChanged=true;if(active)camera(true);}
 function turnBy(dx,dy){cameraYaw-=dx*.005;viewPitch=Math.max(48,Math.min(79,viewPitch-dy*.09));viewChanged=true;}
 const look=$('look');
 look.addEventListener('pointerdown',e=>{if(!active)return;e.preventDefault();look.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY}});
 look.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;turnBy(e.clientX-drag.x,e.clientY-drag.y);drag={id:e.pointerId,x:e.clientX,y:e.clientY}});
 for(const type of ['pointercancel','pointerup','lostpointercapture'])look.addEventListener(type,()=>{drag=null;});
 for(const b of document.querySelectorAll('#dpad [data-k]')){
   const key=b.dataset.k;
   b.addEventListener('pointerdown',e=>{if(!active)return;e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(key);b.classList.add('down')});
   for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,()=>{keys.delete(key);b.classList.remove('down')});
 }
 const run=$('run');run.addEventListener('pointerdown',e=>{if(!active)return;e.preventDefault();run.setPointerCapture(e.pointerId);running=true});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])run.addEventListener(type,()=>running=false);
 const controlKeys=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight']);
 window.addEventListener('keydown',e=>{if(active&&controlKeys.has(e.code)){e.preventDefault();keys.add(e.code)}});
 window.addEventListener('keyup',e=>keys.delete(e.code));
 window.addEventListener('blur',()=>{keys.clear();running=false});
 let counter=0,elapsed=0,frames=0,lastStats=0;
 function tick(now){
   let dt=Math.max(0,Math.min((now-last)/1000,.05));last=now;
   if(active){
     let forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0);
     let sideways=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
     const len=Math.hypot(forward,sideways);
     moving=len>.01;
     const sprint=(running||keys.has('ShiftLeft')||keys.has('ShiftRight'))&&moving;
     if(moving){
       const f=forward/len,s=sideways/len;
       let vx=f*Math.cos(cameraYaw)+s*Math.sin(cameraYaw);
       let vy=f*Math.sin(cameraYaw)-s*Math.cos(cameraYaw);
       let speed=sprint?5.0:2.75;
       let nx=x+vx*speed*dt,ny=y+vy*speed*dt;
       // Axis-sliding collision; mapped footprints are the walls (not rigid-body physics).
       if(!blocked(nx,y,.38))x=nx;else clashes++;
       if(!blocked(x,ny,.38))y=ny;else clashes++;
       const target=Math.atan2(vy,vx);
       face+=Math.atan2(Math.sin(target-face),Math.cos(target-face))*Math.min(1,dt*13);
     }
     avatar.step({x,y,angle:face,run:sprint,moving},dt);
     if(moving||viewChanged){camera();viewChanged=false;}
     elapsed+=dt;frames++;
     if(now-lastStats>1000){lastStats=now;const p=ll(x,y);
       $('coords').textContent=p.lat.toFixed(5)+', '+p.lng.toFixed(5)+' · '+Math.round(frames/Math.max(.001,elapsed))+'fps JS';
       frames=0;elapsed=0;
       onStats({position:p,collisionData:collisionsReady,buildings:clipPolys.length,avatarReady:avatar.ready,clashes});
     }
   }
   requestAnimationFrame(tick);
 }
 requestAnimationFrame(tick);
 // Boundary refresh happens on map idle but never changes files/remote data.
 map.on('idle',()=>{if(active||clipPolys.length===0)refreshCollision()});
 return {enable,disable,reset,refreshCollision,blocked,get active(){return active},get position(){return ll(x,y)},get collisionData(){return collisionsReady}};
}
