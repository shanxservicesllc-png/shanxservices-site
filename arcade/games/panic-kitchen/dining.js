import * as pc from './vendor/playcanvas.mjs';
// X13 ORIGINAL DINING LOOP. Uses the existing Blender restaurant & PlayCanvas.
// Customers appear only when food is ready. Dine-in needs seating, eating, cleanup.
const G=()=>window.__panic,T=()=>G()?.tycoon,R=()=>window.__panicRush?.state;
const D={tables:[
 {id:0,x:-8.65,y:1.22,z:1.9,status:'free',scrubs:0,guest:null},
 {id:1,x:-8.65,y:1.22,z:-1.1,status:'free',scrubs:0,guest:null},
 {id:2,x:-8.65,y:1.22,z:4.65,status:'free',scrubs:0,guest:null}
 ],jobs:[],queue:[],selectedTable:null,spongeSelected:false,initialized:false,elapsed:0,dispatches:0,cleaned:0,arrivals:0,tableDrops:0};
const view=document.getElementById('view'),layer=document.createElement('div');
layer.id='diningOverlay';view.appendChild(layer);
const dock=document.createElement('div');dock.id='diningDock';
dock.innerHTML='<button id="dineSponge" type="button">🧽 DRAG TO CLEAN</button><span id="diningHint">🪑 Seat diners at the patio</span>';
view.appendChild(dock);
const sponge=document.getElementById('dineSponge');
const spotButtons=[];
function enabled(i){return i===0||!!T()?.patio}
for(let i=0;i<D.tables.length;i++){
 const b=document.createElement('button');b.type='button';b.className='diningSpot';b.dataset.table=String(i);
 b.textContent='🪑 TABLE '+(i+1);layer.appendChild(b);spotButtons.push(b);
 b.addEventListener('click',()=>{const t=D.tables[i];if(t.status==='dirty'&&D.spongeSelected){wipe(i);return}if(t.status==='free')deliverToTable(i)});
}
function message(s){document.getElementById('diningHint').textContent=s;
 if(R()?.mode==='running')document.getElementById('rushLog').textContent=s;
}
function reset(){
 D.jobs.length=0;D.queue.length=0;D.selectedTable=null;D.spongeSelected=false;D.cleaned=0;D.arrivals=0;D.tableDrops=0;
 for(const t of D.tables){t.status='free';t.scrubs=0;t.guest=null}
 if(T()?.walkers){for(const e of T().walkers){if(e)e.enabled=false}}
 render();
}
function currentOrder(){
 const r=R();return r?.orders?.find(o=>o.id===r.active)||r?.orders?.[0]||null;
}
function allowTable(i){const t=D.tables[i];return enabled(i)&&t?.status==='free'}
function deliverToTable(i){
 const o=currentOrder();if(!o||o.source!=='DINE-IN'||o.phase!=='plate'||R()?.mode!=='running'){message('🥣 FINISH A DINE-IN ORDER FIRST');return false}
 if(!allowTable(i)){message('🧽 TABLE NOT READY. CLEAN IT OR CHOOSE ANOTHER.');return false}
 D.selectedTable=i;
 const before=R().served;
 window.__panicRush.serve();
 const worked=R().served>before;
 if(!worked)D.selectedTable=null;
 return worked;
}
function dropAt(x,y){
 const o=currentOrder();if(!o||o.source!=='DINE-IN'||o.phase!=='plate')return false;
 for(let i=0;i<spotButtons.length;i++){
  const r=spotButtons[i].getBoundingClientRect();
  if(x>=r.left-16&&x<=r.right+16&&y>=r.top-16&&y<=r.bottom+16) return deliverToTable(i);
 }
 return false;
}
function wipe(i,manager=false){
 const t=D.tables[i];if(!t||t.status!=='dirty')return false;
 t.scrubs++;
 if(t.scrubs>=Math.max(1,2-Math.floor(((T()?.levels?.patio||1)-1)/1))){
  t.scrubs=0;t.status='free';D.cleaned++;D.spongeSelected=false;
  message((manager?'👨‍💼 MANAGER CLEANED ':'✨ TABLE ')+(i+1)+' CLEAN! READY FOR ANOTHER DINER');
 }else message('🧽 WIPE AGAIN! 1 / 2');
 render();
 window.__panicRush?.checkCleanCompletion?.();
 return true;
}
function managerWipe(){const i=D.tables.findIndex((t,n)=>enabled(n)&&t.status==='dirty');return i>=0?wipe(i,true):false}
function spongeAt(x,y){
 for(let i=0;i<spotButtons.length;i++){
  const r=spotButtons[i].getBoundingClientRect();
  if(x>=r.left-18&&x<=r.right+18&&y>=r.top-18&&y<=r.bottom+18&&D.tables[i].status==='dirty')return wipe(i);
 }
 message('🧽 DRAG THE SPONGE TO A RED DIRTY TABLE');
 return false;
}
let spongePointer=null,ghost=null;
sponge.addEventListener('pointerdown',e=>{
 if(R()?.mode!=='running')return;
 spongePointer={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};
 try{sponge.setPointerCapture(e.pointerId)}catch(_){}
});
sponge.addEventListener('pointermove',e=>{
 if(!spongePointer||spongePointer.id!==e.pointerId)return;
 if(Math.hypot(e.clientX-spongePointer.x,e.clientY-spongePointer.y)>9){
  spongePointer.moved=true;
  if(!ghost){ghost=document.createElement('div');ghost.id='diningGhost';ghost.textContent='🧽 WIPE TABLE';document.body.appendChild(ghost)}
  ghost.style.left=(e.clientX+8)+'px';ghost.style.top=(e.clientY-10)+'px';
 }
});
sponge.addEventListener('pointerup',e=>{
 if(!spongePointer||spongePointer.id!==e.pointerId)return;
 const moved=spongePointer.moved;spongePointer=null;if(ghost){ghost.remove();ghost=null}
 if(moved)spongeAt(e.clientX,e.clientY);else{D.spongeSelected=true;message('🧽 TAP A DIRTY RED TABLE TO WIPE IT')}
});
sponge.addEventListener('pointercancel',()=>{spongePointer=null;if(ghost){ghost.remove();ghost=null}});
function addJob(detail){
 if(!T()?.walkers?.length){D.queue.push(detail);return}
 const used=new Set(D.jobs.map(j=>j.actor));
 const actor=T().walkers.findIndex((e,i)=>e&&!used.has(i));
 if(actor<0){D.queue.push(detail);return}
 const start={x:-10.9,z:6.3},ent=T().walkers[actor];
 const job={actor,ent,detail,phase:'enter',x:start.x,z:start.z,wait:0,routeIndex:0,face:0,waypoints:[[-10.9,6.45],[-6.15,6.45],[-5.0,5.65],[-4.75,4.6]]};
 ent.enabled=true;ent.setLocalPosition(start.x,0,start.z);D.jobs.push(job);
 D.arrivals++;
}
function poseGuest(job,walking,seated=false){
 if(!job.limbs){
  const n=job.ent.name,find=(part,side)=>job.ent.findByName(n+' '+part+' '+side);
  job.limbs={arm:[find('arm',-1),find('arm',1)],leg:[find('trouser',-1),find('trouser',1)],shoe:[find('shoe',-1),find('shoe',1)],hand:[find('palm',-1),find('palm',1)]};
 }
 const swing=walking?Math.sin(D.elapsed*8.4+job.actor*.5)*13:seated?Math.sin(D.elapsed*2.6+job.actor)*3:0;
 for(let i=0;i<2;i++){
  const sign=i===0?-1:1,a=sign*swing;
  job.limbs.arm[i]?.setLocalEulerAngles(a,0,0);
  job.limbs.leg[i]?.setLocalEulerAngles(-a*.65,0,0);
  job.limbs.shoe[i]?.setLocalPosition(sign*.17,.13,-.12+a*.004);
  job.limbs.hand[i]?.setLocalPosition(sign*.5,.98,.17-a*.005);
 }
}
function move(job,tx,tz,dt){
 const dx=tx-job.x,dz=tz-job.z,dist=Math.hypot(dx,dz);
 const speed=2.95,step=Math.min(dist,speed*dt);
 if(dist>.001){job.x+=dx/dist*step;job.z+=dz/dist*step}
 const target=Math.atan2(dx,-dz)*180/Math.PI;
 const diff=((target-job.face+540)%360)-180;
 job.face+=diff*Math.min(1,dt*8.5);
 job.ent.setLocalScale(1,1,1);
 job.ent.setLocalPosition(job.x,Math.abs(Math.sin(D.elapsed*8+job.actor))*.025,job.z);
 job.ent.setLocalEulerAngles(0,job.face,0);
 poseGuest(job,true);
 return dist<.10;
}
function route(job,points){job.waypoints=points.map(([x,z])=>[x,z]);job.routeIndex=0}
function follow(job,dt){
 if(!job.waypoints?.length)return true;
 const point=job.waypoints[job.routeIndex];
 if(!point)return true;
 if(move(job,point[0],point[1],dt))job.routeIndex++;
 return job.routeIndex>=job.waypoints.length;
}
function diningRoute(table){
 // Service aisle x=-6.1 stays clear of patio furniture; approach the chair from its outside.
 return [[-5.3,5.6],[-6.08,5.9],[-6.08,table.z+.25],[-7.38,table.z+.25]];
}
function exitRoute(job){
 const table=job.detail.source==='DINE-IN'?D.tables[job.detail.table]:null;
 if(table)return [[-6.08,table.z+.25],[-6.08,6.45],[-10.9,6.45]];
 return [[-5.3,5.65],[-6.15,6.45],[-10.9,6.45]];
}
function onServed(event){
 const detail=event.detail||{};
 if(detail.source==='DRIVE-THRU')return;
 if(detail.source==='DINE-IN'){
  const i=Number.isInteger(detail.table)?detail.table:D.selectedTable;
  const table=D.tables[i];
  if(!table){console.warn('PANIC_DINING_MISSING_TABLE');return}
  table.status='reserved';table.scrubs=0;
  D.selectedTable=null;D.tableDrops++;message('🍽️ TABLE '+(i+1)+' RESERVED. DINER COMING!');
 }
 addJob(detail);D.dispatches++;render();
}
function tickNPCs(dt){
 if(!D.initialized)return;
 if(R()?.paused||document.getElementById('shop')?.classList.contains('show'))return;
 D.elapsed+=dt;
 if(D.queue.length&&D.jobs.length<4){const queued=D.queue.shift();addJob(queued)}
 for(const job of [...D.jobs]){
  const table=Number.isInteger(job.detail.table)?D.tables[job.detail.table]:null;
  const dine=job.detail.source==='DINE-IN';
  if(job.phase==='enter'){
   if(follow(job,dt)){job.phase='pickup';job.wait=.7;job.ent.setLocalScale(1,1,1);poseGuest(job,false)}
  }else if(job.phase==='pickup'){
   job.wait-=dt;
   if(job.wait<=0){
    job.phase=dine?'table':'exit';
    route(job,dine&&table?diningRoute(table):exitRoute(job));
   }
  }else if(job.phase==='table'){
   if(!table){job.phase='exit';route(job,exitRoute(job));continue}
   if(follow(job,dt)){
    job.phase='eating';job.wait=Math.max(3.2,5.8-1.2*Math.max(0,(T()?.levels?.patio||1)-1));
    table.status='eating';table.guest=job.actor;render();
   }
  }else if(job.phase==='eating'){
   job.wait-=dt;
   // Seated guest stays beside the actual chair. Never sink into or walk through the table.
   job.ent.setLocalScale(1,.84,1);
   job.ent.setLocalPosition(job.x,.05,job.z);
   job.ent.setLocalEulerAngles(0,-90,0);
   poseGuest(job,false,true);
   if(job.wait<=0){
    if(table){table.status='dirty';table.guest=null;render();message('🧽 TABLE '+(job.detail.table+1)+' IS DIRTY. CLEAN IT!')}
    job.ent.setLocalScale(1,1,1);
    job.phase='exit';route(job,exitRoute(job));
   }
  }else if(job.phase==='exit'){
   if(follow(job,dt)){
    job.ent.setLocalScale(1,1,1);poseGuest(job,false);job.ent.enabled=false;
    D.jobs.splice(D.jobs.indexOf(job),1);
   }
  }
 }
 if(D.elapsed%0.16<dt)render();
}
function needsCleanup(){
 return D.tables.some((t,i)=>enabled(i)&&t.status!=='free')||D.jobs.some(j=>j.detail.source==='DINE-IN');
}
function render(){
 const g=G(),cam=g?.rendering?.camera,canvas=document.getElementById('world'),rect=canvas.getBoundingClientRect(),w=canvas.width,h=canvas.height;
 const o=currentOrder(),delivery=R()?.mode==='running'&&o?.source==='DINE-IN'&&o.phase==='plate';
 for(let i=0;i<D.tables.length;i++){
  const table=D.tables[i],btn=spotButtons[i];
  if(!cam||!enabled(i)){btn.style.display='none';continue}
  const px=cam.camera.worldToScreen(new pc.Vec3(table.x,table.y,table.z));
  const localX=px.x*rect.width/w,localY=px.y*rect.height/h;
  const show=(delivery&&table.status==='free')||table.status==='dirty'||table.status==='eating'||table.status==='reserved';
  const bounds=localX>=22&&localX<rect.width-22&&localY>=22&&localY<rect.height-22;
  btn.style.display=show&&bounds?'block':'none';
  btn.style.left=localX+'px';btn.style.top=localY+'px';
  btn.className='diningSpot '+(table.status==='free'?'available':table.status);
  btn.textContent=table.status==='dirty'?'🧽 DIRTY '+(i+1)+(table.scrubs?(' '+table.scrubs+'/2'):''):table.status==='eating'?'🍽️ EATING':table.status==='reserved'?'⏳ SEATING':'🍽️ TABLE '+(i+1);
 }
 sponge.disabled=R()?.mode!=='running';
 document.getElementById('diningDock').style.display=R()?.mode==='running'?'flex':'none';
}
window.addEventListener('panic:rush-start',reset);
window.addEventListener('panic:order-served',onServed);
function initialize(){
 if(!T()?.districtReady||!G()?.rendering)return requestAnimationFrame(initialize);
 D.initialized=true;reset();window.__panicDining={state:D,tickNPCs,dropAt,deliverToTable,wipe,managerWipe,needsCleanup,render,reset};
 // Markers also update on open/close of upgrades and camera changes even when idle.
 let last=performance.now();
 function raf(t){if(!D.initialized)return;const dt=Math.min(.12,(t-last)/1000);last=t;render();requestAnimationFrame(raf)}
 requestAnimationFrame(raf);
}
initialize();
