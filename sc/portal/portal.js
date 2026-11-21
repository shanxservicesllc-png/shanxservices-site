/* SC public portal preview. No credentials, API calls, device commands or stored usage. */
(() => {
 'use strict';
 const panels=Array.from(document.querySelectorAll('[data-page]'));
 const navs=Array.from(document.querySelectorAll('[data-view]'));
 const current=document.getElementById('current-page');
 const sidebar=document.getElementById('sidebar');
 const menu=document.getElementById('menu');
 const ids=new Set(panels.map(x=>x.dataset.page));
 function navigate(){
  const requested=decodeURIComponent(location.hash.slice(1));
  const name=ids.has(requested)?requested:'overview';
  for(const panel of panels){const active=panel.dataset.page===name;panel.hidden=!active;panel.classList.toggle('active',active);}
  for(const a of navs){const active=a.dataset.view===name;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');}
  if(current)current.textContent=name.toUpperCase();
  if(sidebar)sidebar.classList.remove('open');
  if(menu)menu.setAttribute('aria-expanded','false');
 }
 window.addEventListener('hashchange',navigate);
 navigate();
 if(menu&&sidebar)menu.addEventListener('click',()=>{
  const showing=sidebar.classList.toggle('open');
  menu.setAttribute('aria-expanded',String(showing));
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&sidebar){sidebar.classList.remove('open');menu?.setAttribute('aria-expanded','false');}});
 const sample=document.getElementById('sample-toggle');
 if(sample){
  sample.addEventListener('click',()=>{
   const active=sample.getAttribute('aria-pressed')!=='true';
   sample.setAttribute('aria-pressed',String(active));
   sample.textContent=active?'Hide sample display':'Show sample display';
   document.getElementById('usage-count').innerHTML=active?'2,400 <span>/ 10,000 sample calls</span>':'— <span>/ — calls</span>';
   document.getElementById('remaining').textContent=active?'7,600 (example)':'—';
   document.getElementById('reset').textContent=active?'Example period only':'Not configured';
   document.getElementById('throttle').textContent=active?'Not enforced (example)':'Not enforced';
   document.getElementById('sample-account').textContent=active?'2,400 (example)':'No data';
   document.getElementById('usage-fill').style.width=active?'24%':'0%';
  });
 }
})();
