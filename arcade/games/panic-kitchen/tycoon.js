import * as pc from './vendor/playcanvas.mjs';
// SXS PANIC KITCHEN. Independent original tycoon slice on existing PlayCanvas world.
const G=()=>window.__panic;
const T={money:100,patio:false,drive:false,manager:false,view:'town',districtReady:false,visitorCount:0,carsServed:0,levels:{patio:0,drive:0,manager:0,kitchen:0,hospitality:0},walkers:[],cars:[],scene:null,managerNode:null,patioNode:null,anim:0,lastMode:'intro',nextAuto:0};
const prices={patio:220,drive:350,manager:520,kitchen:180,hospitality:240};
const maxLevels={patio:4,drive:4,manager:4,kitchen:5,hospitality:5};
function upgradeCost(kind){return Math.round(prices[kind]*Math.pow(1.65,T.levels[kind]))}
const names={patio:'DINING EXPANSION',drive:'DRIVE-THRU',manager:'MANAGER TRAINING',kitchen:'KITCHEN EQUIPMENT',hospitality:'CUSTOMER COMFORT'};
const captions={patio:'Level 1 unlocks two more tables. Higher levels improve tips, eating speed and cleanup.',drive:'Higher levels boost earnings and speed cars through the restaurant lane.',manager:'Higher levels train the manager to prep ingredients more frequently.',kitchen:'Better equipment slows the timing needle, giving you more control.',hospitality:'Better customer service grants longer patience per order and shift.'};
const DB='sxs-panic-kitchen-tycoon-v1';
try{const saved=JSON.parse(localStorage.getItem(DB)||'{}');
 for(const n of ['money','carsServed'])if(Number.isFinite(saved[n]))T[n]=Math.max(0,Math.round(saved[n]));
 for(const kind of Object.keys(maxLevels)){
  const fromLevels=Number(saved.levels?.[kind]);const migrated=Number.isInteger(fromLevels)&&fromLevels>=0?fromLevels:(saved[kind]?1:0);
  T.levels[kind]=Math.min(maxLevels[kind],migrated);
 }
 T.patio=T.levels.patio>0;T.drive=T.levels.drive>0;T.manager=T.levels.manager>0;
}catch(e){}
function save(){try{localStorage.setItem(DB,JSON.stringify({money:T.money,patio:T.patio,drive:T.drive,manager:T.manager,carsServed:T.carsServed,levels:T.levels}))}catch(e){}}
T.awardMilestone=(score)=>{const amount=120+Math.round(Math.min(450,score*.06))+T.levels.patio*25+T.levels.drive*45;T.money+=amount;save();renderHUD();document.getElementById('shopToast').textContent='🏆 Shift bonus +'+amount+' coins';return amount};
const css=document.createElement('style');
css.textContent='#tycoonHud{position:absolute;top:12px;right:10px;z-index:6;display:flex;align-items:center;gap:5px;flex-wrap:wrap;justify-content:flex-end;max-width:58%}'
+' .tycoonBtn{background:#103542ef;color:#e4ffd2;border:1px solid #c5eeb0a0;border-radius:10px;font-size:10px;font-weight:1000;padding:8px;box-shadow:0 3px 0 #062333;touch-action:manipulation}'
+' #moneyDisplay{background:#f6c767;color:#233544;border:2px solid #fff0bf;border-radius:11px;padding:7px 9px;font-size:12px;font-weight:1000}'
+' #tycoonInfo{position:absolute;top:53px;right:10px;z-index:5;pointer-events:none;font-size:9px;font-weight:1000;color:#fff;background:#102a40cd;border-radius:8px;padding:5px 8px}'
+' #shop{display:none;position:absolute;inset:0;z-index:28;background:#071e2beb;backdrop-filter:blur(5px);padding:20px;align-items:center;justify-content:center;overflow:auto}'
+' #shop.show{display:flex}#shopPanel{width:100%;max-width:430px;max-height:93%;overflow:auto;background:#fff2d7;color:#193645;border:3px solid #ecc580;border-radius:18px;padding:17px;box-shadow:0 9px 0 #081c2c}'
+' .shopHead{display:flex;justify-content:space-between;gap:10px}.shopHead h2{font-size:23px;line-height:1.06;letter-spacing:-.8px;margin:0;color:#1c4c54}.shopHead button{background:#183746;color:#fff5e3;border:0;border-radius:9px;padding:7px 12px;font-weight:1000}'
+' .shopSummary{color:#6d745e;font-size:12px;font-weight:850;margin:10px 0 13px}.shopCard{display:flex;gap:10px;align-items:center;margin:9px 0;padding:11px;background:#e3eddf;border:2px solid #b0cbb5;border-radius:12px}'
+' .shopCard .meta{flex:1;min-width:0}.shopCard strong{display:block;font-size:13px}.shopCard p{font-size:11px;line-height:1.35;margin:4px 0;color:#60716b}'
+' .shopCard button{border:0;border-radius:9px;background:#dfff88;color:#1b3c40;min-width:88px;font-weight:1000;padding:10px 7px}.shopCard button:disabled{background:#cbd1c5;color:#6c786e}'
+' #shopToast{text-align:center;margin-top:9px;min-height:20px;font-weight:1000;font-size:12px;color:#9c573b}'
+' @media(max-width:440px){#tycoonHud{max-width:71%}.tycoonBtn{font-size:9px;padding:6px}#moneyDisplay{font-size:10px;padding:6px}#tycoonInfo{font-size:8px;top:46px}.shopCard{padding:8px;gap:7px}}';
document.head.appendChild(css);
const hud=document.createElement('div');hud.id='tycoonHud';
hud.innerHTML='<span id="moneyDisplay">🪙 100</span><button class="tycoonBtn" id="cameraToggle">↗ TOWN VIEW</button><button class="tycoonBtn" id="tycoonShop">🛠 UPGRADES</button>';
document.getElementById('view').appendChild(hud);
const info=document.createElement('div');info.id='tycoonInfo';info.textContent='🚶 GUESTS ARRIVING  🚗 DRIVE-THRU';
document.getElementById('view').appendChild(info);
const shop=document.createElement('section');shop.id='shop';shop.setAttribute('aria-label','SXS Panic Kitchen upgrades');
shop.innerHTML='<div id="shopPanel"><div class="shopHead"><h2>🍔 PANIC KITCHEN<br>TYCOON UPGRADES</h2><button id="closeShop">✕ CLOSE</button></div><div class="shopSummary">Cook fast. Earn coins. Grow the restaurant. <b id="shopMoney">🪙 100</b></div><div id="shopItems"></div><div id="shopToast" role="status"></div></div>';
document.getElementById('app').appendChild(shop);
document.getElementById('cameraToggle').addEventListener('click',()=>{T.view=T.view==='town'?'kitchen':'town';renderHUD()});
const upgradeShortcut=document.createElement('button');
upgradeShortcut.id='upgradeShortcut';upgradeShortcut.className='primary';upgradeShortcut.textContent='🛠 SHOP & EXPAND RESTAURANT';
upgradeShortcut.style.marginTop='10px';
document.querySelector('#overlay .dialog').appendChild(upgradeShortcut);
upgradeShortcut.addEventListener('click',()=>document.getElementById('tycoonShop').click());
let autoPaused=false;
document.getElementById('tycoonShop').addEventListener('click',()=>{
 autoPaused=G()?.state?.mode==='playing';if(autoPaused)document.getElementById('pause').click();
 shop.classList.add('show');renderShop()
});
document.getElementById('closeShop').addEventListener('click',()=>{
 shop.classList.remove('show');if(autoPaused&&G()?.state?.mode==='paused')document.getElementById('pause').click();autoPaused=false
});
function renderHUD(){
 document.getElementById('moneyDisplay').textContent='🪙 '+T.money;
 document.getElementById('cameraToggle').textContent=T.view==='town'?'🎥 COOK VIEW':'↗ TOWN VIEW';
 document.getElementById('tycoonInfo').textContent='🚶 '+T.visitorCount+' GUESTS  •  🚗 '+(T.drive?'DRIVE-THRU OPEN':'ROAD / DRIVE-THRU LOCKED');
}
function renderShop(){
 renderHUD();document.getElementById('shopMoney').textContent='🪙 '+T.money;
 const root=document.getElementById('shopItems');root.replaceChildren();
 for(const kind of ['patio','drive','manager','kitchen','hospitality']){
  const row=document.createElement('div');row.className='shopCard';
  const body=document.createElement('div');body.className='meta';
  const title=document.createElement('strong');title.textContent=(kind==='patio'?'🪑 ':kind==='drive'?'🚗 ':kind==='manager'?'👨‍💼 ':kind==='kitchen'?'🔥 ':'💖 ')+names[kind]+' · LV '+T.levels[kind]+'/'+maxLevels[kind];
  const p=document.createElement('p');p.textContent=captions[kind];body.append(title,p);
  const b=document.createElement('button');const finished=T.levels[kind]>=maxLevels[kind],cost=upgradeCost(kind);
  b.textContent=finished?'✓ MAXED':'⬆ 🪙 '+cost;b.disabled=finished||T.money<cost;
  b.addEventListener('click',()=>buy(kind));row.append(body,b);root.appendChild(row)
 }
}
function buy(kind){
 if(!Object.hasOwn(maxLevels,kind)||T.levels[kind]>=maxLevels[kind])return;
 const cost=upgradeCost(kind);if(T.money<cost)return;
 T.money-=cost;T.levels[kind]++;
 if(kind==='patio'||kind==='drive'||kind==='manager')T[kind]=true;
 save();applyUpgrades();
 renderShop();document.getElementById('shopToast').textContent='✅ '+names[kind]+' LEVEL '+T.levels[kind]+' UNLOCKED'
}
function applyUpgrades(){
 if(T.patioNode)T.patioNode.enabled=!!T.patio;
 if(T.managerNode)T.managerNode.enabled=!!T.manager;
 renderHUD()
}
function animate(dt){
 if(!T.districtReady||!G()?.rendering)return;
 T.anim+=dt;
 const cam=G().rendering.camera;
 const x=T.view==='town'?5.1:0,y=T.view==='town'?21.4:9.4,z=T.view==='town'?18.1:12.1;
 const tx=T.view==='town'?.0:0,ty=T.view==='town'?.20:2.2,tz=T.view==='town'?1.7:-.4;
 const pos=cam.getPosition(),q=Math.min(1,dt*4);
 cam.setPosition(pos.x+(x-pos.x)*q,pos.y+(y-pos.y)*q,pos.z+(z-pos.z)*q);
 cam.lookAt(tx,ty,tz);cam.camera.fov=T.view==='town'?51:48;
 window.__panicDining?.tickNPCs(dt);
 T.visitorCount=window.__panicDining?.state?.jobs?.length||0;
  window.__panicDrive?.tick(dt);
 if(T.managerNode&&T.manager)T.managerNode.setLocalEulerAngles(0,Math.sin(T.anim*2)*14,0);
 const st=G()?.state;
 if(st&&st.mode==='won'&&T.lastMode!=='won'){
  const earned=Math.max(75,Math.round(st.score*.36))+(60*T.levels.patio)+(120*T.levels.drive);
  T.money+=earned;if(T.drive)T.carsServed++;
  save();document.getElementById('shopToast').textContent='🪙 Shift payout +'+earned;renderHUD();
 }
 T.lastMode=st?.mode||'intro';
 if(T.manager&&st?.mode==='playing'&&!st.busy){
  T.nextAuto+=dt;
  if(T.nextAuto>=1.75){
   T.nextAuto=0;const steps=['bun','patty','grill','cheese','lettuce','serve'];
   if(st.step<steps.length)G()?.playStep(steps[st.step])
  }
 }else if(st?.mode!=='playing')T.nextAuto=0
}
let started=false;
function init(){
 if(started||!G()?.state?.ready||!G()?.rendering?.app)return;
 started=true;const app=G().rendering.app;
 app.assets.loadFromUrl('./assets/panic_district.glb','container',(err,asset)=>{
  if(err||!asset?.resource){
   document.getElementById('tycoonInfo').textContent='⚠️ DISTRICT 3D FAILED';
   console.error('PANIC_DISTRICT_LOAD_FAIL',err);return
  }
  try{
   const district=asset.resource.instantiateRenderEntity();district.name='PANIC KITCHEN Original District';app.root.addChild(district);
   T.scene=district;T.patioNode=district.findByName('ANIM_PATIO_UPGRADE');T.managerNode=district.findByName('ANIM_MANAGER');
   for(let i=0;i<4;i++)T.walkers.push(district.findByName('ANIM_WALKER_'+i));
   for(let i=0;i<2;i++)T.cars.push(district.findByName('ANIM_CAR_'+i));
   if(!T.patioNode||!T.managerNode||T.walkers.some(x=>!x)||T.cars.some(x=>!x))throw Error('Blender district missing required animated actor hierarchy');
   T.districtReady=true;T.upgradeCost=upgradeCost;T.maxLevels=maxLevels;T.walkers.forEach(e=>e.enabled=false);T.visitorCount=0;document.getElementById('location').textContent='🏙️ SXS PANIC KITCHEN • RESTAURANT DISTRICT';applyUpgrades();renderHUD();
   G().tycoon=T;G().metrics.tycoonDistrictLoaded=true;
   app.on('update',dt=>animate(Math.min(dt,.1)))
  }catch(e){console.error('PANIC_DISTRICT_SCENE_ERROR',e);document.getElementById('tycoonInfo').textContent='⚠️ TYCOON SCENE ERROR'}
 })
}
function poll(){init();if(!started)requestAnimationFrame(poll)}
renderHUD();requestAnimationFrame(poll);

// Bundled into the approved web distributor allowlist; same PlayCanvas engine, no new runtime files.
(()=>{
// SXS PANIC KITCHEN: orders must be placed by an actual approaching car.
// This module does not run its own renderer or server. Only the existing PlayCanvas actors.
const G=()=>window.__panic, R=()=>window.__panicRush?.state, T=()=>G()?.tycoon;
const S={ready:false,phase:'idle',index:0,z:11.8,orderId:null,ordered:0,delivered:0,missed:0,selectedOrder:null,wait:0,carReady:false,done:false,last:'DRIVE-THRU CLOSED'};
const view=document.getElementById('view'),button=document.createElement('button'),info=document.createElement('span');
button.id='driveWindow';button.type='button';button.textContent='🚗 DELIVER TO CAR';button.setAttribute('aria-label','Deliver the selected drive through meal at the window');
button.style.display='none';view.appendChild(button);
info.id='driveState';info.textContent='🚗 DRIVE-THRU CLOSED';view.appendChild(info);
const present=()=>T()?.drive&&S.ready;
function current(){return R()?.orders?.find(o=>o.id===S.orderId)||null}
function chosen(){return R()?.orders?.find(o=>o.id===R()?.active)||null}
function reset(){
 S.phase='idle';S.index=0;S.z=11.8;S.orderId=null;S.ordered=0;S.delivered=0;S.missed=0;S.selectedOrder=null;S.wait=0;S.done=false;
 for(const car of T()?.cars||[])car.enabled=false;
 info.textContent=T()?.drive?'🚗 DRIVE-THRU OPENS WITH THE RUSH':'🚗 UPGRADE TO OPEN DRIVE-THRU';
 button.style.display='none';
 if(present()&&R()?.mode==='running')startCar();
}
function showCar(i,z){
 const actors=T()?.cars||[];
 actors.forEach((car,j)=>{const here=j===i%actors.length;car.enabled=here;if(here)car.setLocalPosition(10.45,0,z)});
}
function startCar(){
 if(!present()||R()?.mode!=='running'){S.phase='idle';button.style.display='none';return}
 S.z=11.8;S.wait=0;S.orderId=null;S.selectedOrder=null;S.phase='approach';
 showCar(S.index,S.z);update();
}
function order(){
 if(S.phase!=='approach')return;
 const rush=window.__panicRush;
 if(!rush||R()?.mode!=='running'){S.phase='idle';return}
 if(R().orders.length>=3){S.wait=.4;return}
 // Actual order is made NOW at the car-side menu, not when the rush begins.
 const dish=rush.careerDish?rush.careerDish(R().day,R().attempt,R().spawned,'DRIVE-THRU'):(S.index===0?'fries':'burger');
 const ticket=rush.spawn(dish,'DRIVE-THRU');
 if(!ticket){return}
 S.orderId=ticket.id;S.ordered++;S.wait=.8;S.phase='ordering';
 info.textContent='📢 CAR #'+(S.index+1)+' ORDERED '+dish.toUpperCase()+' • TICKET #'+ticket.id;
 update();
}
function release(){
 const cars=T()?.cars||[];const car=cars.length?cars[S.index%cars.length]:null;
 if(car)car.enabled=false;
 S.index++;
 if(R()?.mode==='running'){startCar()}
 else{S.phase='idle';S.orderId=null;button.style.display='none';update()}
}
function update(){
 if(!S.ready)return;
 const active=current(),food=chosen();
 const atWindow=S.phase==='pickup'&&active?.id===food?.id&&food?.phase==='plate';
 const cam=G()?.rendering?.camera,canvas=document.getElementById('world');
 let visible=false;
 if(atWindow&&cam?.camera&&canvas){
  const point=cam.camera.worldToScreen(new pc.Vec3(8.0,1.8,-1.55));
  const bounds=canvas.getBoundingClientRect();
  const x=point.x*bounds.width/canvas.width,y=point.y*bounds.height/canvas.height;
  visible=x>=45&&x<=bounds.width-45&&y>=30&&y<=bounds.height-30;
  if(visible){button.style.left=x+'px';button.style.top=y+'px'}
 }
 button.style.display=visible?'block':'none';
 const states={idle:'🚗 DRIVE-THRU READY',approach:'🚗 CAR APPROACHING MENU',ordering:'📢 CAR PLACING ORDER',toWindow:'🚗 CAR HEADING TO PICKUP',pickup:'🚗 CAR WAITING FOR TICKET #'+S.orderId,depart:'🚗 CAR LEAVING'};
 info.textContent=present()?states[S.phase]||states.idle:'🚗 DRIVE-THRU LOCKED';
 if(food?.source==='DRIVE-THRU'&&food.phase==='plate'&&S.phase==='pickup')info.textContent='🍟 DRAG PLATE TO THE DRIVE WINDOW';
}
function tick(dt){
 if(!S.ready)return;
 const rush=R();
 if(!present()){for(const car of T()?.cars||[])car.enabled=false;button.style.display='none';return}
 if(rush?.paused||document.getElementById('shop')?.classList.contains('show'))return;
 if(rush?.mode!=='running'){update();return}
 if(S.phase==='idle'&&R()?.mode==='running')startCar();
 const cars=T()?.cars||[];const car=cars.length?cars[S.index%cars.length]:null;if(!car)return;
 const rate=1+(T()?.levels?.drive||0)*.10;
 if(S.phase==='approach'){
  S.z=Math.max(3.8,S.z-dt*3.3*rate);
  car.setLocalPosition(10.45,0,S.z);
  if(S.z<=3.81)order();
 }else if(S.phase==='ordering'){
  S.wait-=dt;
  if(S.wait<=0){S.phase='toWindow';S.wait=0}
 }else if(S.phase==='toWindow'){
  S.z=Math.max(-1.5,S.z-dt*2.8*rate);
  car.setLocalPosition(10.45,0,S.z);
  if(S.z<=-1.49)S.phase='pickup';
 }else if(S.phase==='pickup'){
  // The actual car holds position. It cannot leave merely because an animation loop reached the edge.
  car.setLocalPosition(10.45,0,-1.5);
 }else if(S.phase==='depart'){
  S.z-=dt*4.5*rate;
  car.setLocalPosition(10.45,0,S.z);
  if(S.z<-10.2)release();
 }
 if(!S.done)update();
}
function canServe(id){
 return present()&&S.phase==='pickup'&&S.orderId===id;
}
function deliver(){
 const meal=chosen();
 if(!meal||meal.source!=='DRIVE-THRU'||meal.phase!=='plate')return false;
 if(!canServe(meal.id)){info.textContent='🚗 WAIT FOR CAR #'+(S.index+1)+' AT PICKUP';return false}
 S.selectedOrder=meal.id;
 const previous=R().served;window.__panicRush.serve();
 if(R().served<=previous){S.selectedOrder=null;return false}
 return true;
}
function dropAt(x,y){
 const rect=button.getBoundingClientRect();
 if(button.style.display==='none')return false;
 if(x<rect.left-18||x>rect.right+18||y<rect.top-18||y>rect.bottom+18)return false;
 return deliver();
}
button.addEventListener('click',deliver);
window.addEventListener('panic:rush-start',reset);
window.addEventListener('panic:order-served',event=>{
 const detail=event.detail||{};
 if(detail.source!=='DRIVE-THRU'||detail.id!==S.orderId)return;
 S.delivered++;S.selectedOrder=null;S.phase='depart';update();
});
window.addEventListener('panic:order-expired',event=>{
 const detail=event.detail||{};
 if(detail.source!=='DRIVE-THRU'||detail.id!==S.orderId)return;
 S.missed++;S.selectedOrder=null;S.phase='depart';update();
});
function init(){
 if(!T()?.districtReady||!G()?.rendering?.camera)return requestAnimationFrame(init);
 S.ready=true;T().cars.forEach(car=>car.enabled=false);
 window.__panicDrive={state:S,reset,tick,canServe,dropAt,deliver,update,startCar};
 reset();
}
init();

})();

/* Original GLB queue actors, no overlay canvas */
/* SXS PANIC KITCHEN | Physical queued customers in the existing PlayCanvas GLB.
 * Clones licensed/original guest entities, not meshes drawn on a second canvas.
 * Player queue ordering lives in rush.js; actors display that canonical state.
 */
(function(){
 const G=()=>window.__panic,T=()=>G()?.tycoon,R=()=>window.__panicRush?.state;
 const Q={actors:[],positions:[],ready:false,maxVisible:4,frame:0};
 const queueLabel=document.createElement('div');
 queueLabel.id='sxsPhysicalQueueLabel';queueLabel.setAttribute('role','status');
 queueLabel.style.cssText='position:absolute;top:77px;left:9px;z-index:8;color:#e7ffd9;background:#113e4bcf;border:1px solid #b6de9b;border-radius:8px;padding:5px 8px;font-size:10px;font-weight:900;pointer-events:none;max-width:60%';
 const scene=document.getElementById('view');
 if(scene)scene.appendChild(queueLabel);
 function initialize(){
  const t=T();
  if(Q.ready||!t?.districtReady||!t.scene||!t.walkers?.length)return;
  for(let i=0;i<Q.maxVisible;i++){
   const template=t.walkers[i%t.walkers.length];
   const actor=template.clone();
   actor.name='SXS_LINE_GUEST_'+i;
   t.scene.addChild(actor);
   actor.setLocalPosition(-10.7,0,7.4);
   actor.setLocalEulerAngles(0,90,0);
   actor.enabled=false;
   Q.actors.push(actor);Q.positions.push({x:-10.7,z:7.4});
  }
  Q.ready=true;
 }
 function tick(dt){
  initialize();
  const r=R(),t=T(),n=r?.mode==='running'?(r.line?.length||0):0;
  queueLabel.style.display=r?.mode==='running'?'block':'none';
  if(!r||r.mode!=='running') {for(const actor of Q.actors)actor.enabled=false;return}
  queueLabel.textContent='🚶 '+n+' IN LINE · 📋 '+r.orders.length+' ORDERS · '+Math.max(0,Math.ceil(r.spawnClock))+'s TO NEXT';
  if(!Q.ready)return;
  if(r.paused||document.getElementById('shop')?.classList.contains('show'))return;
  Q.frame+=dt;
  for(let i=0;i<Q.actors.length;i++){
   const node=Q.actors[i],active=i<n;
   node.enabled=active;
   if(!active)continue;
   const targetX=-5.75-i*1.05,targetZ=5.75+i*.46;
   const pos=Q.positions[i],gain=Math.min(1,dt*1.9);
   pos.x+=(targetX-pos.x)*gain;pos.z+=(targetZ-pos.z)*gain;
   node.setLocalPosition(pos.x,Math.max(0,.012*Math.sin(Q.frame*3+i)),pos.z);
   node.setLocalEulerAngles(0,-30+8*Math.sin(Q.frame*1.6+i),0);
  }
  t.visitorCount=(window.__panicDining?.state?.jobs?.length||0)+n;
 }
 window.__panicLineVisual={state:Q,tick};
 const loop=()=>{
  const t=T();
  if(t?.districtReady&&!Q.ready)initialize();
  requestAnimationFrame(loop);
 };
 requestAnimationFrame(loop);
 window.addEventListener('panic:rush-start',()=>{
  for(let i=0;i<Q.positions.length;i++){Q.positions[i].x=-10.7;Q.positions[i].z=7.4;}
 });
 const wait=()=>{const app=G()?.rendering?.app;if(!app){requestAnimationFrame(wait);return}
  app.on('update',dt=>tick(Math.min(.1,dt)));
 };
 wait();
})();

