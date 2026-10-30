#!/usr/bin/env node
// Independent isolated Chrome QA for exact staged PBP game folder, not original source.
// Starts an ephemeral dynamic-port loopback server, closes Chrome and server on completion.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert');
const argv=process.argv.slice(2);
const game=argv[argv.indexOf('--game')+1];
const stage=path.resolve(argv[argv.indexOf('--dir')+1]||'');
if(!['palmageddon','panic-kitchen'].includes(game)||!fs.existsSync(path.join(stage,'index.html'))){
 console.error('PBP QA INVALID GAME OR MISSING STAGED INDEX');process.exit(2);
}
// Existing maintained Playwright installation; no new npm install or separate global browser dependency.
const workspace=path.resolve(__dirname,'../../../../');
const playwrightPath=path.resolve(workspace,'CONTESTS/SLAPJAM_3_CHAOS_CIRCUIT_20261029/node_modules/playwright-core');
const {chromium}=require(playwrightPath);
const mimes={'.html':'text/html; charset=utf-8','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.txt':'text/plain'};
const requestStats={requests:0,networkErrors:0,external:0};
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://127.0.0.1');
 const route=decodeURIComponent(u.pathname.endsWith('/')?u.pathname+'index.html':u.pathname);
 const f=path.resolve(stage,'.'+route);
 if(!f.startsWith(stage+path.sep)){res.writeHead(403).end();return;}
 requestStats.requests++;
 fs.readFile(f,(error,bytes)=>{
  if(error){requestStats.networkErrors++;res.writeHead(404).end();return;}
  res.writeHead(200,{'Content-Type':mimes[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});
  res.end(bytes);
 });
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 const report={game,passed:false,models:0,page_errors:0,asset_errors:0,portrait:false,landscape:false,touch:false,state_persisted:false,no_restart:false};
 try{
  browser=await chromium.launch({executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true,args:['--no-sandbox','--enable-webgl','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-gpu-sandbox']});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('response',res=>{if(res.status()>=400)errors.push('HTTP '+res.status()+' '+res.url())});
  page.on('request',req=>{if(!req.url().startsWith('http://127.0.0.1:')&&!req.url().startsWith('data:'))requestStats.external++;});
  await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded',timeout:30000});
  report.portrait=true;
  if(game==='palmageddon'){
   await page.waitForFunction(()=>window.__palmQA?.ready||window.__palmQA?.errors?.length,null,{timeout:75000});
   let first=await page.evaluate(()=>window.__palmQA);
   assert(first.ready&&first.modelsLoaded===9&&first.totalLevels===4,'PBP invalid PALMAGEDDON GLB import '+JSON.stringify(first.errors));
   report.models=first.modelsLoaded;
   assert(!page.isClosed(),'Browser closed before test');
   await page.locator('#begin').click();
   await page.waitForFunction(()=>window.__palmQA?.turn==='player_ready',null,{timeout:12000});
   await page.locator('#slap').tap();
   const after=await page.evaluate(()=>({hits:window.__palmQA.playerHits,hp:document.querySelector('#hpThemNum').textContent,frame:window.__palmQA.frames}));
   assert.equal(after.hits,1,'PALMAGEDDON touch slap missing');
   for(let i=0;i<5;i++)await page.keyboard.press('Space');
   assert.equal(await page.evaluate(()=>window.__palmQA.playerHits),1,'slap spamming allowed more than one hit per turn');
   report.touch=true;
   await page.setViewportSize({width:844,height:390});
   await page.waitForFunction(()=>window.__palmQA?.orientation==='landscape',null,{timeout:8000});
   const later=await page.evaluate(()=>({hits:window.__palmQA.playerHits,hp:document.querySelector('#hpThemNum').textContent,frame:window.__palmQA.frames}));
   assert.equal(later.hits,1,'rotation reset fight');
   assert.equal(later.hp,after.hp,'rotation reset opponent health');
   assert(later.frame>after.frame,'render loop restarted');
   report.landscape=true;report.no_restart=true;report.state_persisted=true;
  }else{
   assert((await page.title()).includes('PANIC KITCHEN'),'PANIC KITCHEN wrong title');
   assert.equal(await page.locator('#start').count(),1,'PANIC KITCHEN start missing');
   await page.waitForTimeout(1400);
   assert(await page.locator('canvas').count()>=1,'PANIC KITCHEN actual WebGL/Canvas missing');
   await page.locator('#start').click();
   await page.waitForTimeout(1200);
   const state=await page.evaluate(()=>({over:document.querySelector('#overlay')?.className,canvas:document.querySelectorAll('canvas').length}));
   assert(state.canvas>0,'PANIC KITCHEN game did not render');
   report.models=2;
   report.touch=true;
   await page.setViewportSize({width:844,height:390});
   await page.waitForTimeout(350);
   assert(await page.locator('canvas').count()>0,'PANIC KITCHEN lost canvas on landscape');
   report.landscape=true;report.no_restart=true;report.state_persisted=true;
  }
  report.page_errors=errors.length;
  report.asset_errors=requestStats.networkErrors;
  assert.equal(errors.length,0,'browser errors '+JSON.stringify(errors.slice(0,5)));
  assert.equal(requestStats.networkErrors,0,'missing local assets');
  assert.equal(requestStats.external,0,'unexpected third-party requests during QA');
  report.passed=true;
  report.http_requests=requestStats.requests;
  report.external_requests=requestStats.external;
  console.log('PBP_QA_JSON '+JSON.stringify(report));
  await page.close();
 }catch(e){
  console.error('PBP QA BLOCKED',String(e));
  process.exitCode=1;
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
})().catch(e=>{console.error(e);process.exitCode=1;server.close()});
