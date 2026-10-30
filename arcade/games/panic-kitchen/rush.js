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
 R.mode=won?'won':'lost';R.paused=false;
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
$('pause').addEventListener('click',e=>{if(R.mode==='running'){e.stopImmediatePropagation();R.paused=!R.paused;$('pause').textContent=R.paused?'▶ RESUME':'Ⅱ PAUSE';pausedCurtain.classList.toggle('show',R.paused);say(R.paused?'Ⅱ PAUSED':'🔥 BACK TO WORK')}},true);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&R.mode==='running'){R.paused=true;pausedCurtain.classList.add('show')}});
window.__panicRush={state:R,TYPES,DIFF_LEVELS,managerPolicy,spawn,deposit,cook,serve,select:id=>{R.active=id;drawTickets();drawWork()},start:begin,update,checkCleanCompletion:()=>{if(R.mode==='running'&&R.served>=R.goal&&!window.__panicDining?.needsCleanup())finish(true)}};
requestAnimationFrame(loop);
