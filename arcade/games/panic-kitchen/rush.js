// SXS PANIC KITCHEN | RUSH SHIFT: drag, cook timing, customer queue, serve.
// This is a real skill-based game layer. PlayCanvas and Blender models remain live.
const $=id=>document.getElementById(id),P=()=>window.__panic;
const TYPES={
 burger:{name:'PANIC BURGER',icon:'🍔',needs:['bun','patty','cheese','lettuce'],zone:[46,65],station:'GRILL'},
 fries:{name:'CRISPY FRIES',icon:'🍟',needs:['potato','salt'],zone:[38,62],station:'FRYER'},
 soda:{name:'SODA SPLASH',icon:'🥤',needs:['cup','ice'],zone:[60,82],station:'DRINK FILLER'}
};
const ING={bun:['🍞','BRIOCHE'],patty:['🥩','BEEF'],cheese:['🧀','CHEESE'],lettuce:['🥬','LETTUCE'],potato:['🥔','POTATO'],salt:['🧂','SALT'],cup:['🥤','CUP'],ice:['🧊','ICE']};
const R={mode:'intro',time:125,orders:[],active:null,nextId:1,served:0,missed:0,score:0,combo:0,spawned:0,goal:4,needle:0,heading:1,selectedIngredient:null,selectedPlate:false,managerClock:0,paused:false,taskStatus:'',lastTick:performance.now(),renderCounter:0,dragging:false,cancelDrag:null,difficulty:'medium',cleanClock:0,managerHelpPrep:0,managerHelpClean:0};
const board=document.createElement('div');board.id='rushBoard';
board.innerHTML='<div id="rushStatus"><strong id="rushTitle">🍳 PICK AN ORDER</strong><span class="hint" id="rushGoal">0 / 4 SERVED</span></div>'
+'<div id="rushWork"><div id="rushIngredients"></div><div id="rushPrep" role="button" tabindex="0"><strong>🥣 PREP BOARD</strong><small>DRAG FOOD HERE</small></div></div>'
+'<div id="rushHeat"><div class="heatHead"><strong id="heatName">🔥 GRILL TIMING</strong><span>✅ STOP IN BRIGHT GREEN</span></div><div id="heatTrack"><div id="heatTarget"></div><div id="heatNeedle"></div></div><button type="button" id="cookAction">🔥 FLIP / STOP COOKING</button></div>'
+'<div id="rushPlate"><button type="button" id="readyPlate">🍔 DRAG PLATE</button><div id="serveDrop" tabindex="0" role="button">🍽️ DROP TO SERVE</div></div>'
+'<div id="rushLog" role="status">CHOOSE AN ORDER, THEN DRAG INGREDIENTS.</div>';
$('counter').insertBefore(board,$('counter').querySelector('.controlsFoot'));

const DIFFICULTY_KEY='sxs-panic-kitchen-difficulty-v1';
const DIFF_LEVELS={
 easy:{label:'EASY',subtitle:'Helpful manager · generous timers',shift:150,patience:16,misses:3},
 medium:{label:'MEDIUM',subtitle:'Some manager support · balanced rush',shift:125,patience:0,misses:2},
 hard:{label:'HARD',subtitle:'You run it · emergency manager backup',shift:115,patience:-7,misses:2}
};
try{const saved=localStorage.getItem(DIFFICULTY_KEY);if(DIFF_LEVELS[saved])R.difficulty=saved}catch(e){}
function managerPolicy(){
 const level=Math.max(1,P()?.tycoon?.levels?.manager||1);
 const difficulty=R.difficulty;
 const urgent=R.orders.filter(o=>o.left<20).length>=2||R.time<26||(R.served>=R.goal&&window.__panicDining?.needsCleanup());
 return {
  difficulty,level,urgent,
  prepInterval:difficulty==='easy'?Math.max(2.6,5.0-.65*(level-1)):
    difficulty==='medium'?Math.max(5.2,9.2-1.1*(level-1)):
    urgent?Math.max(16,20-.6*(level-1)):Infinity,
  cleanInterval:difficulty==='easy'?Math.max(3.2,6.5-.45*(level-1)):
    difficulty==='medium'?Math.max(7.8,12.5-.7*(level-1)):Math.max(5.6,8.0-.4*(level-1)),
  cleanAllowed:difficulty==='easy'||(difficulty==='medium'&&urgent)||(difficulty==='hard'&&urgent)
 };
}
const difficultyUI=document.createElement('section');
difficultyUI.id='difficultySelect';difficultyUI.setAttribute('aria-label','Kitchen difficulty');
difficultyUI.innerHTML='<strong>🎮 CHOOSE YOUR KITCHEN DIFFICULTY</strong><div class="difficultyOptions"><button data-difficulty="easy" type="button">🟢 EASY<small>Busy manager</small></button><button data-difficulty="medium" type="button">🔵 MEDIUM<small>Balanced help</small></button><button data-difficulty="hard" type="button">🔴 HARD<small>You run the kitchen</small></button></div><p id="difficultyDescription"></p>';
document.querySelector('#overlay .dialog').appendChild(difficultyUI);
const difficultyCSS=document.createElement('style');
difficultyCSS.textContent='#difficultySelect{margin:11px 0 4px;padding:9px;background:#163647;border-radius:13px;border:2px solid #80b7a7;color:#f3f7df;font-size:11px;text-align:center}#difficultySelect strong{font-size:11px;letter-spacing:.1px}.difficultyOptions{display:flex;gap:5px;margin:8px 0}.difficultyOptions button{flex:1;min-width:0;padding:8px 3px;border:2px solid #6e8a8d;border-radius:9px;background:#294957;color:#eff4e1;font-size:10px;font-weight:1000;touch-action:manipulation}.difficultyOptions button small{display:block;font-size:8px;margin-top:4px;opacity:.85}.difficultyOptions button.selected{background:#dfff88;border-color:#fff8c0;color:#203f37;box-shadow:0 3px 0 #67a775}#difficultyDescription{font-weight:850;font-size:10px;margin:7px 0 0}';
document.head.appendChild(difficultyCSS);
function renderDifficulty(){
 for(const b of difficultyUI.querySelectorAll('button[data-difficulty]')){const selected=b.dataset.difficulty===R.difficulty;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected))}
 document.getElementById('difficultyDescription').textContent=DIFF_LEVELS[R.difficulty].subtitle;
}
for(const b of difficultyUI.querySelectorAll('button[data-difficulty]'))b.addEventListener('click',()=>{
 if(R.mode==='running')return;R.difficulty=b.dataset.difficulty;try{localStorage.setItem(DIFFICULTY_KEY,R.difficulty)}catch(e){}renderDifficulty();
});
renderDifficulty();

const tickets=document.createElement('div');tickets.id='rushTickets';$('ticketArea').appendChild(tickets);
const pausedCurtain=document.createElement('div');pausedCurtain.id='rushPaused';pausedCurtain.textContent='Ⅱ KITCHEN PAUSED';$('view').appendChild(pausedCurtain);
function say(t){R.taskStatus=t;$('rushLog').textContent=t;$('status').textContent=t}
function chosen(){return R.orders.find(o=>o.id===R.active)||R.orders[0]||null}
function spawn(dish,source=null){
 if(R.spawned>=R.goal+2)return;
 const src=source||['WALK-IN','PICKUP','DINE-IN','PICKUP'][R.spawned%4];
 const total=(dish==='burger'?82:68)+(P()?.tycoon?.levels?.hospitality||0)*9+DIFF_LEVELS[R.difficulty].patience;
 const o={id:R.nextId++,dish,source:src,left:total,total,phase:'prep',collected:[],quality:0,burns:0};
 R.orders.push(o);R.spawned++;if(R.active===null)R.active=o.id;drawTickets();drawWork();return o;
}
function begin(){
 if(R.cancelDrag)R.cancelDrag();R.mode='running';R.time=DIFF_LEVELS[R.difficulty].shift+(P()?.tycoon?.levels?.hospitality||0)*7;R.orders=[];R.active=null;R.nextId=1;R.served=0;R.missed=0;R.score=0;R.combo=0;R.spawned=0;R.needle=0;R.heading=1;R.managerClock=0;R.cleanClock=0;R.managerHelpPrep=0;R.managerHelpClean=0;R.paused=false;R.selectedIngredient=null;R.selectedPlate=false;R.lastTick=performance.now();
 $('ticketArea').classList.add('rushLive');$('counter').classList.add('rushOn');pausedCurtain.classList.remove('show');
 P().state.mode='rush';P().state.time=R.time;P().state.score=0;P().state.combo=0;
 spawn('burger','WALK-IN');spawn('fries','PICKUP');spawn('soda','DINE-IN');window.dispatchEvent(new Event('panic:rush-start'));say('🥣 DRAG THE FOOD FOR YOUR FIRST ORDER TO PREP');
 update();drawWork();
}
function drawTickets(){
 tickets.replaceChildren();
 for(const o of R.orders){
  const rec=TYPES[o.dish],b=document.createElement('button');b.type='button';b.className='rushOrder'+(o.id===R.active?' selected':'')+(o.left<16?' urgent':'');b.dataset.order=String(o.id);
  b.innerHTML='<div class="otype"><b>'+rec.icon+'</b><span>'+o.source+'</span><span class="orderTimer" data-timer="'+o.id+'">'+Math.ceil(o.left)+'s</span></div>'
  +'<div class="dishName">'+rec.name+'</div><div class="bar"><i data-bar="'+o.id+'"></i></div><div class="phase">'+(o.phase==='prep'?'PREP '+o.collected.length+'/'+rec.needs.length:o.phase==='heat'?'COOKING':'READY TO SERVE')+'</div>';
  b.addEventListener('click',()=>{R.active=o.id;R.selectedIngredient=null;R.selectedPlate=false;drawTickets();drawWork();say('📋 WORKING ORDER #'+o.id)});
  tickets.appendChild(b);
 }
}
function timeLabels(){
 for(const o of R.orders){
  const n=tickets.querySelector('[data-timer="'+o.id+'"]'),bar=tickets.querySelector('[data-bar="'+o.id+'"]'),card=tickets.querySelector('[data-order="'+o.id+'"]');
  if(n)n.textContent=Math.ceil(o.left)+'s';if(bar)bar.style.width=Math.max(0,o.left/o.total*100)+'%';if(card)card.classList.toggle('urgent',o.left<16);
 }
}
function drawWork(){
 const o=chosen(),root=$('rushIngredients');if(R.cancelDrag)R.cancelDrag();root.replaceChildren();
 if(!o){$('rushTitle').textContent=R.served>=R.goal?'🧽 CLEAN DINING AREA':'⏳ NO ACTIVE ORDER';$('rushPrep').innerHTML='<strong>🥣 PREP BOARD</strong><small>WAITING FOR CUSTOMERS</small>';$('rushHeat').classList.remove('active');$('rushPlate').classList.remove('active');return}
 const rec=TYPES[o.dish];$('rushTitle').textContent=rec.icon+' ORDER #'+o.id+' '+rec.name;
 for(const item of Object.keys(ING)){
  const used=o.collected.includes(item),b=document.createElement('button');b.className='rushItem'+(used?' used':'')+(R.selectedIngredient===item?' picked':'');
  b.type='button';b.dataset.ingredient=item;b.disabled=o.phase!=='prep'||used;
  b.innerHTML='<span>'+ING[item][0]+'</span>'+ING[item][1];dragSource(b,'ingredient',item);root.appendChild(b);
 }
 const progress=o.collected.map(x=>ING[x][0]).join(' ');
 $('rushPrep').innerHTML='<strong>🥣 PREP BOARD</strong><small>'+(progress||'DRAG INGREDIENTS HERE')+'</small>';
 $('rushHeat').classList.toggle('active',o.phase==='heat');$('rushPlate').classList.toggle('active',o.phase==='plate');
 if(o.phase==='heat'){
  $('heatName').textContent=rec.icon+' '+rec.station+' • TIMING';
  const [lo,hi]=rec.zone;$('heatTarget').style.left=lo+'%';$('heatTarget').style.width=(hi-lo)+'%';
  $('cookAction').textContent=o.dish==='burger'?'🔥 FLIP THE PATTY!':o.dish==='fries'?'🍟 LIFT THE FRIES!':'🥤 STOP FILLING!';
 }
 if(o.phase==='plate'){$('readyPlate').textContent=rec.icon+' DRAG PLATE';$('serveDrop').textContent=o.source==='DINE-IN'?'🪑 DRAG TO A DINING TABLE':o.source==='DRIVE-THRU'?'🚗 DRAG TO DRIVE WINDOW':'🍽️ DROP TO SERVE';}
 $('rushGoal').textContent=DIFF_LEVELS[R.difficulty].label+' · '+R.served+'/'+R.goal+' SERVED · '+R.missed+' LOST';
 update3D();
}
function update3D(){
 const h=P()?.rendering?.hero,o=chosen();if(!h)return;
 if(h.burger){
  const state=o?.dish==='burger'?o:null,col=state?.collected||[];
  h.burger.forEach(e=>{
   if(e===h.burger)return;
   const n=e.name.toLowerCase();let on=!state;
   if(state){
    if(n.includes('bottom'))on=col.includes('bun');
    else if(n.includes('patty')||n.includes('beef'))on=state.phase!=='prep';
    else if(n.includes('cheese'))on=col.includes('cheese');
    else if(n.includes('lettuce')||n.includes('tomato'))on=col.includes('lettuce');
    else if(n.includes('upper')||n.includes('sesame'))on=state.phase!=='prep';
    else on=col.includes('bun');
   }
   e.enabled=on;
  });
 }
 if(h.fries)h.fries.enabled=!!(o?.dish==='fries'&&o.phase==='plate');
 if(h.soda)h.soda.enabled=!!(o?.dish==='soda'&&o.phase==='plate');
}
function wrong(message){
 const o=chosen();R.combo=0;if(o)o.left=Math.max(1,o.left-4);R.time=Math.max(0,R.time-1.5);
 say('❌ '+message+' • TIME PENALTY');navigator.vibrate?.(25);
}
function deposit(item){
 if(R.mode!=='running'||R.paused)return;
 const o=chosen();if(!o||o.phase!=='prep')return;
 if(!TYPES[o.dish].needs.includes(item)){wrong('WRONG INGREDIENT');return}
 if(o.collected.includes(item))return;
 o.collected.push(item);R.selectedIngredient=null;R.combo++;R.score+=12;
 say(ING[item][0]+' '+ING[item][1]+' ADDED • '+o.collected.length+'/'+TYPES[o.dish].needs.length);
 if(o.collected.length===TYPES[o.dish].needs.length){o.phase='heat';R.needle=0;R.heading=1;say('🔥 COOK NOW • STOP THE NEEDLE IN GREEN')}
 drawTickets();drawWork();update();navigator.vibrate?.(12);
}
function cook(){
 const o=chosen();if(!o||o.phase!=='heat'||R.mode!=='running'||R.paused)return;
 const [a,b]=TYPES[o.dish].zone,hit=R.needle>=a&&R.needle<=b;
 if(hit){
  o.phase='plate';o.quality=Math.max(0,1-Math.abs(R.needle-(a+b)/2)/((b-a)/2));
  R.score+=Math.round(65+35*o.quality);R.combo++;
  say('✨ PERFECT '+TYPES[o.dish].station+'! DRAG FINISHED PLATE TO SERVE');
 }else{
  o.burns++;R.combo=0;o.left=Math.max(1,o.left-6);R.time=Math.max(0,R.time-2);
  say(R.needle<a?'🧊 TOO EARLY! WATCH THE GREEN':'💥 OVERCOOKED! TRY AGAIN');
  R.needle=0;R.heading=1;navigator.vibrate?.([40,30,40]);
 }
 drawTickets();drawWork();update();
}
function serve(){
 if(R.mode!=='running'||R.paused)return;
 const o=chosen(); if(!o||o.phase!=='plate'){wrong('FOOD NOT READY');return}
 if(o.source==='DINE-IN'&&window.__panicDining?.state?.selectedTable==null){say('🍽️ DRAG THIS PLATE TO A GREEN DINING TABLE!');return}
 if(o.source==='DRIVE-THRU'&&window.__panicDrive?.state?.selectedOrder!==o.id){say('🚗 WAIT FOR THE CAR, THEN DRAG ITS FOOD TO THE PICKUP WINDOW!');return}
 const table=window.__panicDining?.state?.selectedTable??null;
 const bonus=Math.round(90+o.left*2+R.combo*12+o.quality*70);
 R.score+=bonus;R.served++;R.combo++;
 R.orders=R.orders.filter(a=>a!==o);R.active=R.orders[0]?.id||null;R.selectedPlate=false;R.selectedIngredient=null;
 window.dispatchEvent(new CustomEvent('panic:order-served',{detail:{id:o.id,dish:o.dish,source:o.source,table}}));
 say('🔔 '+TYPES[o.dish].icon+' DELIVERED! +'+bonus+' · '+R.served+'/'+R.goal);
 navigator.vibrate?.(20);
 if(R.spawned<R.goal&&!P()?.tycoon?.drive)spawn('burger','PICKUP');
 if(R.served>=R.goal){if(!window.__panicDining?.needsCleanup()){finish(true);return}say('🧽 ALL ORDERS SERVED. CLEAN AND RESET DINING TABLES TO WIN!')}
 drawTickets();drawWork();update();
}
function finish(won){
 R.mode=won?'won':'lost';R.paused=false;window.dispatchEvent(new Event('panic:rush-finished'));
 const p=P();if(p?.state){p.state.mode=won?'won':'lost';p.state.score=R.score;p.state.combo=R.combo;p.state.time=R.time}
 $('overlay').classList.remove('hidden');$('eyebrow').textContent=won?'SXS TYCOON • RUSH CONQUERED':'SXS TYCOON • KITCHEN CLOSED';
 $('title').innerHTML=won?'RUSH<br><em>CRUSHED!</em>':'PANIC<br><em>OVERTIME!</em>';
 $('message').textContent=R.served+' delivered, '+R.missed+' missed. Score '+R.score+'. '+(won?'You ran the whole restaurant!':'Try a faster strategy next shift.');
 $('how').classList.add('hiddenStuff');$('result').classList.remove('hiddenStuff');$('result').textContent=won?'🏆 ⚡ 🪙':'💔 ⏰';
 $('start').textContent=won?'⚡ NEXT RUSH SHIFT':'🔥 RETRY THE RUSH';
 drawWork();update();
}
function update(){
 const p=P();if(p?.state){p.state.time=R.time;p.state.score=R.score;p.state.combo=R.combo}
 $('rushGoal').textContent=DIFF_LEVELS[R.difficulty].label+' · '+R.served+'/'+R.goal+' SERVED · '+R.missed+' LOST';
 $('rushLog').textContent=R.taskStatus;$('heatNeedle').style.left=R.needle+'%';timeLabels();
}
function loop(t){
 const dt=Math.min(.08,Math.max(0,(t-R.lastTick)/1000||0));R.lastTick=t;
 if(R.mode==='running'&&!R.paused&&!$('shop').classList.contains('show')){
  R.time=Math.max(0,R.time-dt);
  for(const o of [...R.orders]){
   o.left-=dt;
   if(o.left<=0){
    R.orders=R.orders.filter(a=>a!==o);R.missed++;R.combo=0;
    window.dispatchEvent(new CustomEvent('panic:order-expired',{detail:{id:o.id,source:o.source,dish:o.dish}}));
    if(o.id===R.active)R.active=R.orders[0]?.id||null;
    say('💔 ORDER #'+o.id+' WALKED OUT!');
    if(R.spawned<R.goal+2)spawn('soda','PICKUP');
    drawTickets();drawWork();
   }
  }
  R.needle+=dt*(102/(1+.13*(P()?.tycoon?.levels?.kitchen||0)))*R.heading;
  if(R.needle>=100){R.needle=100;R.heading=-1}if(R.needle<=0){R.needle=0;R.heading=1}
  if(R.served>=R.goal&&!window.__panicDining?.needsCleanup())finish(true);
  else if(R.missed>=DIFF_LEVELS[R.difficulty].misses||R.time<=0||(!R.orders.length&&R.spawned>=R.goal&&R.served<R.goal))finish(false);
  // Manager assist is earned, difficulty-gated and never interrupts a player's drag.
  if(P()?.tycoon?.manager&&R.mode==='running'){
   const policy=managerPolicy();
   R.managerClock+=dt;R.cleanClock+=dt;
   if(policy.cleanAllowed&&R.cleanClock>=policy.cleanInterval&&!R.dragging){
    R.cleanClock=0;
    if(window.__panicDining?.managerWipe?.()){R.managerHelpClean++;say('🧽 MANAGER HELPED CLEAN THE DINING AREA')}
   }
   if(R.managerClock>=policy.prepInterval&&!R.dragging){
    R.managerClock=0;
    const active=chosen();
    if(active?.phase==='prep'){
     const next=TYPES[active.dish].needs.find(x=>!active.collected.includes(x));
     if(next){deposit(next);R.managerHelpPrep++;say('👨‍💼 MANAGER PREPPED '+ING[next][1]+' • YOU HANDLE COOKING')}
    }
   }
  }
  if(++R.renderCounter%8===0)update();
 }
 requestAnimationFrame(loop);
}
function dragSource(el,kind,item){
 let pointer=null,ghost=null;
 const dropId=kind==='ingredient'?'rushPrep':'serveDrop';
 function clearDrag(){
  if(ghost){ghost.remove();ghost=null}
  pointer=null;R.dragging=false;
  if(R.cancelDrag===clearDrag)R.cancelDrag=null;
  window.removeEventListener('pointerup',onUp,true);
  window.removeEventListener('pointercancel',onCancel,true);
  $(dropId)?.classList.remove('over');
 }
 function end(e,cancelled){
  if(!pointer||pointer.id!==e.pointerId)return;
  const drop=$(dropId),rect=drop.getBoundingClientRect();
  const hit=e.clientX>=rect.left&&e.clientX<=rect.right&&e.clientY>=rect.top&&e.clientY<=rect.bottom;
  const moved=pointer.moved;
  clearDrag();
  if(cancelled)return;
  if(moved){
   if(kind==='plate'&&window.__panicDining?.dropAt(e.clientX,e.clientY))return;
   if(kind==='plate'&&window.__panicDrive?.dropAt(e.clientX,e.clientY))return;
   if(hit){if(kind==='ingredient')deposit(item);else serve()}
   else say('↪ DRAG '+(kind==='ingredient'?'FOOD ON PREP':'PLATE ON SERVE'));
  }else if(kind==='ingredient'){
   R.selectedIngredient=item;drawWork();say('🥣 TAP PREP BOARD TO ADD '+ING[item][1]);
  }else{
   R.selectedPlate=true;say('🍽️ TAP SERVE WINDOW TO DELIVER');
  }
 }
 const onUp=e=>end(e,false),onCancel=e=>end(e,true);
 el.addEventListener('pointerdown',e=>{
  if(R.mode!=='running'||R.paused||el.disabled)return;
  if(R.cancelDrag)R.cancelDrag();
  pointer={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};
  R.dragging=true;R.cancelDrag=clearDrag;
  window.addEventListener('pointerup',onUp,true);
  window.addEventListener('pointercancel',onCancel,true);
  try{el.setPointerCapture(e.pointerId)}catch(_){}
 });
 el.addEventListener('pointermove',e=>{
  if(!pointer||pointer.id!==e.pointerId)return;
  if(Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>10){
   pointer.moved=true;
   if(!ghost){ghost=document.createElement('div');ghost.className='rushGhost';ghost.textContent=kind==='ingredient'?ING[item][0]+' '+ING[item][1]:'🍽️ FINISHED PLATE';document.body.appendChild(ghost)}
   ghost.style.left=(e.clientX+12)+'px';ghost.style.top=(e.clientY-16)+'px';
  }
  const drop=$(dropId),r=drop.getBoundingClientRect();
  drop.classList.toggle('over',!!ghost&&e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom);
 });
 el.addEventListener('pointerup',onUp);
 el.addEventListener('pointercancel',onCancel);
 el.addEventListener('lostpointercapture',()=>{if(pointer&&!el.isConnected)clearDrag()});
}
dragSource($('readyPlate'),'plate','ready');
$('rushPrep').addEventListener('click',()=>{if(R.selectedIngredient)deposit(R.selectedIngredient)});
$('rushPrep').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&R.selectedIngredient){e.preventDefault();deposit(R.selectedIngredient)}});
$('serveDrop').addEventListener('click',()=>{if(R.selectedPlate)serve()});
$('serveDrop').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();serve()}});
$('cookAction').addEventListener('click',cook);
// The existing engine initializes/hides the intro, then the new real RUSH shift takes over.
document.addEventListener('click',e=>{if(e.target.closest('#start')&&P()?.state?.modelReady)queueMicrotask(begin)});
$('pause').addEventListener('click',e=>{if(R.mode==='running'){e.stopImmediatePropagation();R.paused=!R.paused;$('pause').textContent=R.paused?'▶ RESUME':'Ⅱ PAUSE';pausedCurtain.classList.toggle('show',R.paused);say(R.paused?'Ⅱ PAUSED':'🔥 BACK TO WORK');window.dispatchEvent(new CustomEvent('panic:pause-changed',{detail:{paused:R.paused}}))}},true);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&R.mode==='running'){R.paused=true;pausedCurtain.classList.add('show');window.dispatchEvent(new CustomEvent('panic:pause-changed',{detail:{paused:true}}))}});
window.__panicRush={state:R,TYPES,DIFF_LEVELS,managerPolicy,spawn,deposit,cook,serve,select:id=>{R.active=id;drawTickets();drawWork()},start:begin,update,checkCleanCompletion:()=>{if(R.mode==='running'&&R.served>=R.goal&&!window.__panicDining?.needsCleanup())finish(true)}};
requestAnimationFrame(loop);

/* Timed Blender 3D Kitchen / warmer / pause controls. Bundled to stay PBP allowlisted. */
(()=>{
// SXS PANIC KITCHEN | Timed 3D production tab, warming rack, pause/restart/quit.
// Integrates with ORIGINAL Blender kitchen, PlayCanvas scene, queue and tycoon.
// No second renderer, server, public workspace, or externally loaded assets.
const P=()=>window.__panic;
const R=()=>window.__panicRush?.state;
const T=()=>P()?.tycoon;
const $=id=>document.getElementById(id);
const O={tab:'restaurant',remaining:0,cooldown:0,entryDuration:24,cooldownDuration:11,active:null,needle:0,heading:1,elapsed:0,
 stock:{patty:[],fries:[],soda:[]},capacity:{patty:6,fries:4,soda:4},crafts:0,made:{patty:0,fries:0,soda:0},wasted:0,selected:null,last:performance.now()};
const names={patty:'🥩 COOK PATTIES',fries:'🍟 BATCH FRIES',soda:'🥤 FILL DRINKS'};
const key={burger:'patty',fries:'fries',soda:'soda'};
const div=document.createElement('div');div.id='opsTabs';
div.innerHTML='<button id="opsRestaurant" type="button" class="selected">🏪 RESTAURANT</button><button id="opsKitchenTab" type="button">🍳 3D KITCHEN • 24s</button>';
$('view').appendChild(div);
const stockEl=document.createElement('div');stockEl.id='opsStock';$('view').appendChild(stockEl);
const kitchen=document.createElement('section');kitchen.id='opsKitchen';
kitchen.innerHTML='<strong>🍳 REAL 3D PRODUCTION SPRINT • <span id="opsTime">24s</span></strong><p>Batch-cook now. Return to the restaurant and assemble orders from stock. The customer clocks keep running!</p><div id="opsProduction"><button type="button" data-batch="patty">🥩 PATTIES x2</button><button type="button" data-batch="fries">🍟 FRIES x2</button><button type="button" data-batch="soda">🥤 DRINKS x2</button></div><div id="opsTiming"><strong id="opsJobName">COOK</strong><div id="opsGauge"><span id="opsGreen"></span><span id="opsNeedle"></span></div><button id="opsStop" type="button">✅ STOP IN GREEN TO STOCK FOOD</button></div><small id="opsKitchenMessage">Select a batch, time the cook, then get back to serving.</small>';
$('view').appendChild(kitchen);
const quick=document.createElement('div');quick.id='opsQuick';quick.innerHTML='<button type="button" id="opsUseStock">🧺 USE WARMER</button><span id="opsQuickHint">Prepared food available</span>';
$('rushBoard').appendChild(quick);
const menu=document.createElement('section');menu.id='opsPause';menu.setAttribute('role','dialog');menu.setAttribute('aria-modal','true');menu.setAttribute('aria-label','Pause menu');
menu.innerHTML='<div class="opsDialog"><h2>⏸️ PAUSED</h2><p>Customer timers, cars, and cooking are frozen. Upgrades and saved coins are safe.</p><button id="opsResume" type="button">▶ RESUME SHIFT</button><button id="opsRestart" class="secondary" type="button">🔁 RESTART SAME DIFFICULTY</button><button id="opsQuit" class="quit" type="button">↩ QUIT TO DIFFICULTY SELECT</button></div>';
$('app').appendChild(menu);
function freeze(){return R()?.mode!=='running'||R()?.paused||$('shop')?.classList.contains('show')}
function count(kind){return O.stock[kind].length}
function purge(){
 for(const k of Object.keys(O.stock)){
  const before=count(k);O.stock[k]=O.stock[k].filter(exp=>exp>O.elapsed);
  O.wasted+=before-count(k);
 }
}
function refresh(){
 const running=R()?.mode==='running';
 div.classList.toggle('active',running);stockEl.classList.toggle('active',running);
 $('cameraToggle').style.display=running?'none':'';
 const active=O.tab==='kitchen'&&running;
 $('opsRestaurant').classList.toggle('selected',!active);
 $('opsKitchenTab').classList.toggle('selected',active);
 $('opsKitchenTab').disabled=!running||O.cooldown>0||active;
 $('opsKitchenTab').textContent=active?'🍳 3D KITCHEN '+Math.ceil(O.remaining)+'s':O.cooldown>0?'⏳ REOPEN IN '+Math.ceil(O.cooldown)+'s':'🍳 3D KITCHEN • 24s';
 kitchen.classList.toggle('active',active);
 stockEl.textContent='🧺 WARMER • 🥩 '+count('patty')+'/'+O.capacity.patty+' · 🍟 '+count('fries')+'/'+O.capacity.fries+' · 🥤 '+count('soda')+'/'+O.capacity.soda;
 $('opsTime').textContent=Math.ceil(O.remaining)+'s';
 for(const btn of kitchen.querySelectorAll('[data-batch]')){
  const kind=btn.dataset.batch;btn.disabled=!!O.active||O.stock[kind].length>=O.capacity[kind];
 }
 $('opsTiming').classList.toggle('active',!!O.active);
 $('opsNeedle').style.left=O.needle+'%';
 if(O.active)$('opsJobName').textContent=names[O.active]+' • GREEN = +2 STOCK';
 const order=R()?.orders?.find(o=>o.id===R()?.active)||R()?.orders?.[0];
 let show=false,description='';
 if(order?.phase==='prep'&&count(key[order.dish])>0&&!R().paused){
  show=true;
  description=order.dish==='burger'?'Assemble bun + cheese + lettuce, then add cooked patty':'Grab a prepared '+order.dish+' for immediate plating';
 }
 quick.classList.toggle('active',show);
 $('opsQuickHint').textContent=description;
 $('opsUseStock').textContent=order?.dish==='burger'?'🥩 ADD COOKED PATTY':'🧺 PLATE READY '+(order?.dish||'FOOD').toUpperCase();
 $('opsUseStock').disabled=!!(order?.dish==='burger'&&!['bun','cheese','lettuce'].every(x=>order.collected.includes(x)));
}
function reset(){
 O.tab='restaurant';O.remaining=0;O.cooldown=0;O.active=null;O.needle=0;O.heading=1;O.elapsed=0;O.stock={patty:[],fries:[],soda:[]};O.crafts=0;O.wasted=0;O.made={patty:0,fries:0,soda:0};O.selected=null;
 if(T())T().view='town';
 $('opsKitchenMessage').textContent='Select a batch, time the cook, then get back to serving.';
 menu.classList.remove('show');
 refresh();
}
function exitKitchen(byClock=false){
 if(O.tab!=='kitchen')return;
 O.tab='restaurant';O.active=null;O.remaining=0;O.cooldown=O.cooldownDuration;
 if(T())T().view='town';
 $('opsKitchenMessage').textContent=byClock?'⏰ PRODUCTION WINDOW CLOSED. SERVE YOUR CUSTOMERS!':'📦 FOOD STORED. SERVE THE QUEUE!';
 refresh();
}
function enterKitchen(){
 if(freeze()||O.tab==='kitchen'||O.cooldown>0)return false;
 O.tab='kitchen';O.remaining=O.entryDuration;O.needle=0;O.heading=1;O.active=null;
 if(T())T().view='kitchen';
 $('opsKitchenMessage').textContent='👨‍🍳 YOU HAVE 24 SECONDS. CHOOSE WHAT TO PRODUCE!';
 refresh();return true;
}
function startBatch(kind){
 if(freeze()||O.tab!=='kitchen'||!O.stock[kind]||O.active||count(kind)>=O.capacity[kind])return false;
 O.active=kind;O.needle=0;O.heading=1;
 $('opsKitchenMessage').textContent='🔥 '+names[kind]+': HIT GREEN TO PREP TWO UNITS';
 refresh();return true;
}
function stopBatch(){
 if(freeze()||O.tab!=='kitchen'||!O.active)return false;
 const kind=O.active,success=O.needle>=43&&O.needle<=67;
 O.active=null;
 if(success){
  const add=Math.min(2,O.capacity[kind]-count(kind));
  for(let i=0;i<add;i++)O.stock[kind].push(O.elapsed+90);
  O.made[kind]+=add;O.crafts++;
  $('opsKitchenMessage').textContent='✨ +'+add+' '+kind.toUpperCase()+' INTO WARMER! '+count(kind)+' READY';
  navigator.vibrate?.(12);
 }else{
  O.remaining=Math.max(0,O.remaining-2);
  $('opsKitchenMessage').textContent='💥 WRONG TEMPERATURE. -2 SECONDS!';
 }
 refresh();return success;
}
function consumeStock(dish){
 if(freeze()||O.tab!=='restaurant')return false;
 const type=key[dish];if(!type)return false;
 purge();if(!count(type))return false;
 O.stock[type].shift();refresh();return true;
}
function useStock(){
 if(freeze()||O.tab!=='restaurant')return false;
 const rush=window.__panicRush,o=R()?.orders?.find(x=>x.id===R()?.active)||R()?.orders?.[0];
 if(!o||o.phase!=='prep'||!count(key[o.dish]))return false;
 if(o.dish==='burger'){
  if(!['bun','cheese','lettuce'].every(x=>o.collected.includes(x)))return false;
  if(!consumeStock('burger'))return false;
  o.collected.push('patty');
 }else if(!consumeStock(o.dish))return false;
 o.phase='plate';o.quality=.85;R().score+=35;R().combo++;
 rush.select(o.id);rush.update();
 $('opsKitchenMessage').textContent='🧺 READY STOCK USED FOR ORDER #'+o.id;
 refresh();return true;
}
function showPause(paused){
 menu.classList.toggle('show',!!paused&&R()?.mode==='running');
 if(paused&&O.tab==='kitchen')$('opsKitchenMessage').textContent='⏸️ 3D PRODUCTION PAUSED';
}
function resume(){
 if(R()?.paused)$('pause').click();
 menu.classList.remove('show');
}
function restart(){
 if(R()?.mode!=='running')return;
 if(R().cancelDrag)R().cancelDrag();
 R().paused=false;
 $('pause').textContent='Ⅱ PAUSE';
 if(P()?.state)P().state.mode='rush';
 reset();
 window.__panicRush.start();
 menu.classList.remove('show');
}
function quit(){
 const r=R();if(!r||r.mode!=='running')return;
 if(r.cancelDrag)r.cancelDrag();
 r.mode='intro';r.paused=false;r.orders=[];r.active=null;r.selectedIngredient=null;r.selectedPlate=false;
 if(P()?.state)P().state.mode='intro';
 $('pause').textContent='Ⅱ PAUSE';$('rushPaused').classList.remove('show');
 $('ticketArea').classList.remove('rushLive');$('counter').classList.remove('rushOn');
 $('rushTickets').replaceChildren();$('overlay').classList.remove('hidden');
 $('eyebrow').textContent='SXS PANIC KITCHEN • CHOOSE YOUR CHALLENGE';
 $('title').innerHTML='PANIC<br><em>KITCHEN!</em>';
 $('message').textContent='Choose a new difficulty, then start a fresh shift. Earned coins and purchased upgrades stay saved.';
 $('how').classList.remove('hiddenStuff');$('result').classList.add('hiddenStuff');
 $('start').textContent='🔥 START NEW KITCHEN SHIFT';
 window.__panicDining?.reset?.();window.__panicDrive?.reset?.();
 reset();
}
$('opsKitchenTab').addEventListener('click',enterKitchen);
$('opsRestaurant').addEventListener('click',()=>exitKitchen(false));
$('opsProduction').addEventListener('click',e=>{const b=e.target.closest('[data-batch]');if(b)startBatch(b.dataset.batch)});
$('opsStop').addEventListener('click',stopBatch);
$('opsUseStock').addEventListener('click',useStock);
$('opsResume').addEventListener('click',resume);
$('opsRestart').addEventListener('click',restart);
$('opsQuit').addEventListener('click',quit);
$('cameraToggle').addEventListener('click',e=>{if(R()?.mode==='running'){e.stopImmediatePropagation();e.preventDefault();O.tab==='kitchen'?exitKitchen(false):enterKitchen()}},true);
window.addEventListener('panic:rush-start',reset);
window.addEventListener('panic:pause-changed',e=>showPause(!!e.detail?.paused));
window.addEventListener('panic:rush-finished',()=>{O.tab='restaurant';O.active=null;if(T())T().view='town';menu.classList.remove('show');refresh()});
function tick(t){
 const dt=Math.min(.09,Math.max(0,(t-O.last)/1000||0));O.last=t;
 if(R()?.mode==='running'&&!R()?.paused&&!$('shop')?.classList.contains('show')){
  O.elapsed+=dt;purge();
  O.cooldown=Math.max(0,O.cooldown-dt);
  if(O.tab==='kitchen'){
   O.remaining=Math.max(0,O.remaining-dt);
   if(O.active){O.needle+=dt*104*O.heading;if(O.needle>=100){O.needle=100;O.heading=-1}else if(O.needle<=0){O.needle=0;O.heading=1}}
   if(O.remaining<=0)exitKitchen(true);
  }
 }
 if(R()?.mode==='running')refresh();
 requestAnimationFrame(tick);
}
window.__panicOps={state:O,enterKitchen,exitKitchen,startBatch,stopBatch,consumeStock,useStock,refresh,reset,quit,restart,resume};
requestAnimationFrame(tick);

})();

/* Explicit, integrated SXS first-play tutorial */
// SXS PANIC KITCHEN | Built-in first-run tutorial, stage guidance, accessible help.
// Standalone authoring source, bundled into existing allowlisted rush.js for publishing.
(function(){
const R=()=>window.__panicRush?.state;
const O=()=>window.__panicOps?.state;
const $=id=>document.getElementById(id);
const HELP_KEY='sxs-panic-kitchen-help-v1';
const ingredientNames={bun:'BRIOCHE',patty:'BEEF',cheese:'CHEESE',lettuce:'LETTUCE',potato:'POTATO',salt:'SALT',cup:'CUP',ice:'ICE'};
const slides=[
 {icon:'🎟️',title:'1. PICK A CUSTOMER ORDER',body:'Tap one of the order cards above the ingredients. Each customer has a countdown. You can switch between orders whenever you need.'},
 {icon:'🥣',title:'2. PUT INGREDIENTS ON PREP',body:'Drag the correct ingredients onto the green PREP BOARD. Or tap an ingredient, then tap PREP BOARD. Keep adding ingredients until the cooking meter appears. Just selecting an ingredient does not cook it.'},
 {icon:'🔥',title:'3. COOK IN THE GREEN',body:'When all required ingredients are on the board, a cooking meter appears. Watch the moving white marker and tap the big cooking button WHEN IT IS INSIDE THE BRIGHT GREEN BAND. Too early or too late costs time.'},
 {icon:'🍽️',title:'4. DELIVER THE FINISHED FOOD',body:'After cooking, a DRAG PLATE button appears. Drag the plate to SERVE for walk-in/pickup, to a highlighted GREEN TABLE for dine-in, or to the DRIVE-THRU WINDOW when the car is waiting. It is not served until you deliver it.'},
 {icon:'🧽',title:'5. KEEP THE RESTAURANT RUNNING',body:'Diners eat at tables and leave them dirty. Drag the sponge to a RED dirty table twice to clean it. Your manager can assist depending on difficulty. Earn coins to upgrade the restaurant.'},
 {icon:'⏱️',title:'6. TRY THE TIMED 3D KITCHEN',body:'In the newest version, tap 3D KITCHEN for a 24-second production sprint. Batch-cook patties, fries, or drinks for the warmer, then return to RESTAURANT and use stored food to assemble orders faster. Customer timers keep ticking.'}
];
const button=document.createElement('button');
button.id='sxsHelpButton';button.type='button';button.textContent='❓ HELP';
button.setAttribute('aria-label','How to play PANIC KITCHEN');
$('pause').parentElement.insertBefore(button,$('pause'));
const introButton=document.createElement('button');
introButton.id='sxsIntroHelp';introButton.type='button';introButton.textContent='❓ HOW TO PLAY';
const start=$('start');
start.parentElement.insertBefore(introButton,start);
const pausedHelp=document.createElement('button');pausedHelp.id='sxsPauseHelp';pausedHelp.type='button';pausedHelp.className='secondary';pausedHelp.textContent='❓ HOW TO PLAY';
$('opsQuit').parentElement.insertBefore(pausedHelp,$('opsQuit'));
const badge=document.createElement('div');badge.id='sxsStepCue';badge.setAttribute('role','status');
$('rushStatus').insertAdjacentElement('afterend',badge);
const modal=document.createElement('section');modal.id='sxsHelpModal';
modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
modal.setAttribute('aria-label','How to play PANIC KITCHEN');
modal.hidden=true;
modal.innerHTML='<div class="sxsHelpPanel"><div class="sxsHelpHeader"><strong>🍔 HOW TO PLAY PANIC KITCHEN</strong><button type="button" id="sxsHelpClose" aria-label="Close instructions">✕</button></div><div class="sxsHelpGraphic" id="sxsHelpGraphic"></div><h2 id="sxsHelpTitle"></h2><p id="sxsHelpText"></p><div class="sxsHelpFooter"><span id="sxsHelpCount"></span><div><button type="button" id="sxsHelpBack">BACK</button><button type="button" id="sxsHelpNext">NEXT</button></div></div></div>';
$('app').appendChild(modal);
let slide=0,autoPaused=false,wasOpen=false,lastCue='';
function renderSlide(){
 const s=slides[slide];
 $('sxsHelpGraphic').textContent=s.icon;
 $('sxsHelpTitle').textContent=s.title;
 $('sxsHelpText').textContent=s.body;
 $('sxsHelpCount').textContent=(slide+1)+' OF '+slides.length;
 $('sxsHelpBack').disabled=slide===0;
 $('sxsHelpNext').textContent=slide===slides.length-1?'GOT IT ✓':'NEXT →';
}
function openHelp(firstRun=false){
 if(wasOpen)return;
 wasOpen=true;slide=0;renderSlide();
 autoPaused=false;
 if(R()?.mode==='running'&&!R()?.paused){
  $('pause').click();
  autoPaused=!!R()?.paused;
 }
 modal.hidden=false;
 if(firstRun)$('sxsHelpNext').focus();else $('sxsHelpClose').focus();
}
function closeHelp(){
 if(!wasOpen)return;
 wasOpen=false;modal.hidden=true;
 try{localStorage.setItem(HELP_KEY,'seen')}catch(e){}
 if(autoPaused&&R()?.paused){
  // Use the existing pause system; do not resume an already-paused game.
  if($('opsResume')&&$('opsPause')?.classList.contains('show'))$('opsResume').click();
  else $('pause').click();
 }
 autoPaused=false;
}
$('sxsHelpClose').addEventListener('click',closeHelp);
$('sxsHelpBack').addEventListener('click',()=>{slide=Math.max(0,slide-1);renderSlide()});
$('sxsHelpNext').addEventListener('click',()=>{if(slide===slides.length-1)closeHelp();else{slide++;renderSlide()}});
button.addEventListener('click',()=>openHelp(false));
introButton.addEventListener('click',()=>openHelp(false));
pausedHelp.addEventListener('click',()=>openHelp(false));
modal.addEventListener('click',e=>{if(e.target===modal)closeHelp()});
document.addEventListener('keydown',e=>{if(!wasOpen)return;if(e.key==='Escape'){e.preventDefault();closeHelp()}});
window.addEventListener('panic:rush-start',()=>{
 let seen=false;try{seen=localStorage.getItem(HELP_KEY)==='seen'}catch(e){}
 if(!seen)requestAnimationFrame(()=>{if(R()?.mode==='running')openHelp(true)});
});
function stageCue(){
 const r=R();
 if(!r||r.mode!=='running'){badge.style.display='none';lastCue='';return}
 badge.style.display='block';
 const o=r.orders.find(x=>x.id===r.active)||r.orders[0],ops=O();
 let text='';
 if(ops?.tab==='kitchen')text='⏱️ 3D KITCHEN: Choose a batch, then STOP the cooking gauge INSIDE GREEN. You return automatically when time runs out.';
 else if(!o)text='🧽 NO ORDERS LEFT: Drag the sponge to RED dirty tables twice to finish cleaning.';
 else if(o.phase==='prep'){
  const recipe=window.__panicRush.TYPES[o.dish],missing=recipe.needs.filter(k=>!o.collected.includes(k));
  text='🥣 NEXT: Drag '+missing.map(k=>ingredientNames[k]||k.toUpperCase()).join(' + ')+' onto PREP BOARD. Tap ingredient then PREP also works.';
 }else if(o.phase==='heat')text='🔥 NEXT: Tap the '+(o.dish==='burger'?'GRILL':o.dish==='fries'?'FRYER':'FILLER')+' button when the WHITE marker is inside BRIGHT GREEN.';
 else if(o.phase==='plate'){
  text=o.source==='DINE-IN'?'🍽️ NEXT: Drag the PLATE to a highlighted GREEN dining TABLE.':
  o.source==='DRIVE-THRU'?'🚗 NEXT: Wait for the car, then drag PLATE to the DRIVE-THRU WINDOW.':
  '🔔 NEXT: Drag the finished PLATE onto SERVE to deliver this order.';
 }
 if(text!==lastCue){badge.textContent=text;lastCue=text;badge.dataset.phase=o?.phase||'none'}
}
let last=0;
function loop(t){if(t-last>170){last=t;stageCue()}requestAnimationFrame(loop)}
requestAnimationFrame(loop);
window.__panicHelp={open:openHelp,close:closeHelp,slides,stageCue};
})();

