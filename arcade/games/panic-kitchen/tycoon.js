import * as pc from './vendor/playcanvas.mjs';
// SXS PANIC KITCHEN. Independent original tycoon slice on existing PlayCanvas world.
const G=()=>window.__panic;
const T={money:100,patio:false,drive:false,manager:false,view:'town',districtReady:false,visitorCount:0,carsServed:0,walkers:[],cars:[],scene:null,managerNode:null,patioNode:null,anim:0,lastMode:'intro',nextAuto:0};
const prices={patio:220,drive:350,manager:520};
const names={patio:'DINING EXPANSION',drive:'DRIVE-THRU',manager:'HIRE MANAGER'};
const captions={patio:'Adds two modeled dining tables; +60 coins per completed order.',drive:'Make drive-through cars paying customers; +120 coins per order.',manager:'Your manager automatically handles the burger steps during the rush.'};
const DB='sxs-panic-kitchen-tycoon-v1';
try{const saved=JSON.parse(localStorage.getItem(DB)||'{}');for(const n of ['money','patio','drive','manager','carsServed'])if(Object.hasOwn(saved,n))T[n]=saved[n]}catch(e){}
function save(){try{localStorage.setItem(DB,JSON.stringify({money:T.money,patio:T.patio,drive:T.drive,manager:T.manager,carsServed:T.carsServed}))}catch(e){}}
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
 for(const kind of ['patio','drive','manager']){
  const row=document.createElement('div');row.className='shopCard';
  const body=document.createElement('div');body.className='meta';
  const title=document.createElement('strong');title.textContent=(kind==='patio'?'🪑 ':kind==='drive'?'🚗 ':'👨‍💼 ')+names[kind];
  const p=document.createElement('p');p.textContent=captions[kind];body.append(title,p);
  const b=document.createElement('button');b.textContent=T[kind]?'✓ OWNED':'🪙 '+prices[kind];b.disabled=T[kind]||T.money<prices[kind];
  b.addEventListener('click',()=>buy(kind));row.append(body,b);root.appendChild(row)
 }
}
function buy(kind){
 if(T[kind]||T.money<prices[kind])return;
 T.money-=prices[kind];T[kind]=true;save();applyUpgrades();
 renderShop();document.getElementById('shopToast').textContent='✅ '+names[kind]+' NOW ACTIVE'
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
  T.cars.forEach((car,i)=>{const p=(T.anim*.045+i*.5)%1;const phase=T.drive?(p>.64?(p<.78?.64:p-.14):p):p;car.setLocalPosition(10.45,0,11.7-phase*20)});
 if(T.managerNode&&T.manager)T.managerNode.setLocalEulerAngles(0,Math.sin(T.anim*2)*14,0);
 const st=G()?.state;
 if(st&&st.mode==='won'&&T.lastMode!=='won'){
  const earned=Math.max(75,Math.round(st.score*.36))+(T.patio?60:0)+(T.drive?120:0);
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
   T.districtReady=true;T.walkers.forEach(e=>e.enabled=false);T.visitorCount=0;document.getElementById('location').textContent='🏙️ SXS PANIC KITCHEN • RESTAURANT DISTRICT';applyUpgrades();renderHUD();
   G().tycoon=T;G().metrics.tycoonDistrictLoaded=true;
   app.on('update',dt=>animate(Math.min(dt,.1)))
  }catch(e){console.error('PANIC_DISTRICT_SCENE_ERROR',e);document.getElementById('tycoonInfo').textContent='⚠️ TYCOON SCENE ERROR'}
 })
}
function poll(){init();if(!started)requestAnimationFrame(poll)}
renderHUD();requestAnimationFrame(poll);
