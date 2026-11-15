#!/usr/bin/env node
// X13 ShanX Streets actual browser QA, isolated from the live player's data.
// Extend the repo's existing Chrome QA approach; do not modify the published HTML.
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
const input=path.resolve(__dirname,'../arcade/games/shanx-streets/index.html');
const html=fs.readFileSync(input,'utf8');
const hook=String.raw\`
window.__X13_QA={
  status:()=>({started:hasStarted,paused:gamePaused,persons:npcList.length,
    vehicleCount:vehicles.length,webgl:!!renderer.getContext(),
    build:document.title}),
  checks:()=>{
    const report=[];
    const add=(name,pass,detail)=>report.push({name,passed:!!pass,detail:String(detail||'')});
    const cart=worldActions.find(a=>a.kind==='hotdog');
    const cartProbe=cart?{x:cart.x,z:cart.z}:null;
    add('food-cart-solid',!!(cartProbe&&pushFromBuildings(cartProbe,1.0)),
      cart?'Scene cart position '+cart.x+','+cart.z:'No cart action');
    const p=npcList.find(p=>p.hp>0);
    if(!p){add('living-citizen-contact',false,'No NPC available');
      add('downed-citizen-contact',false,'No NPC available');
    }else{
      const saved={x:p.x,z:p.z,hp:p.hp,down:p.down,visible:p.rig.root.visible,
        airborne:p.vehicleKnockback,cooldown:p.vehicleHitCooldown};
      const makeCar=()=>({x:10009,z:10000,h:Math.PI/2,speed:27,mode:'player',health:100,
        hover:false,hoverLanding:false,hoverHeight:0,type:'car',disabled:false});
      try{
        p.x=10005;p.z=10000;p.hp=12;p.down=0;p.vehicleKnockback=null;
        p.vehicleHitCooldown=0;p.rig.root.visible=true;
        const liveHit=checkCarPedestrianSweep(makeCar(),10000,10000);
        add('living-citizen-contact',liveHit,'Swept contact in actual game runtime');
        p.x=10005;p.z=10000;p.hp=0;p.down=3;p.vehicleKnockback=null;
        p.vehicleHitCooldown=0;p.rig.root.visible=true;
        const downedHit=checkCarPedestrianSweep(makeCar(),10000,10000);
        add('downed-citizen-contact',downedHit,
          'Downed characters should not be completely non-collidable');
      }finally{
        p.x=saved.x;p.z=saved.z;p.hp=saved.hp;p.down=saved.down;
        p.rig.root.visible=saved.visible;p.vehicleKnockback=saved.airborne;
        p.vehicleHitCooldown=saved.cooldown;
      }
    }
    const prevWanted=wanted,officer=footOfficers[0]||makeFootOfficer();
    const old={hp:officer.hp,down:officer.down,active:officer.active,
      rootX:officer.rig.root.rotation.x,figZ:officer.rig.figure.rotation.z,
      visible:officer.rig.root.visible};
    try{
      wanted=3;officer.active=true;officer.hp=0;officer.down=4;
      officer.rig.root.rotation.x=0;officer.rig.figure.rotation.z=0;
      updateFootPolice(.016);
      add('downed-officer-prone',Math.abs(officer.rig.root.rotation.x)>0.4,
        'Root X rotation = '+officer.rig.root.rotation.x.toFixed(3));
    }finally{
      wanted=prevWanted;officer.hp=old.hp;officer.down=old.down;officer.active=old.active;
      officer.rig.root.rotation.x=old.rootX;officer.rig.figure.rotation.z=old.figZ;
      officer.rig.root.visible=old.visible;
    }
    return report;
  }
};
\`;
let count=0;
const fixture=html.replace(/(<script\b[^>]*type="module"[^>]*>)([\s\S]*?)(<\/script>)/i,
  (_,start,body,end)=>{count++;return start+body+'\n'+hook+end});
if(count!==1)throw Error('Expected exactly one game module to instrument');
const server=http.createServer((req,res)=>{
  if(req.url==='/'||req.url==='/index.html'){
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
    res.end(fixture);
  }else{res.writeHead(404);res.end('Not Found')}
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;const errors=[];const report={page:input,smoke:false,render:false,
    desktop:false,mobile:false,tests:[],pageErrors:[]};
  try{
    browser=await chromium.launch({headless:true,args:[
      '--no-sandbox','--enable-webgl','--enable-unsafe-swiftshader',
      '--use-gl=angle','--use-angle=swiftshader','--disable-gpu-sandbox'
    ]});
    const page=await browser.newPage({viewport:{width:1140,height:800}});
    page.on('pageerror',err=>errors.push(String(err)));
    page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});
    const url='http://127.0.0.1:'+server.address().port+'/';
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:35000});
    await page.waitForFunction(()=>!!window.__X13_QA,{timeout:65000});
    report.smoke=true;
    await page.locator('#startGame').click({timeout:12000});
    await page.waitForFunction(()=>window.__X13_QA?.status().started,{timeout:18000});
    await page.waitForTimeout(800);
    const st=await page.evaluate(()=>window.__X13_QA.status());
    report.desktop=true;report.render=st.webgl&&st.persons>0&&st.vehicleCount>0;
    report.state=st;
    await page.screenshot({path:'/tmp/shanx-streets-desktop.png'});
    report.tests=await page.evaluate(()=>window.__X13_QA.checks());
    await page.setViewportSize({width:390,height:844});
    await page.waitForTimeout(500);
    report.mobile=await page.evaluate(()=>!!window.__X13_QA.status().webgl);
    await page.screenshot({path:'/tmp/shanx-streets-mobile.png'});
    report.pageErrors=errors;
    console.log('X13_SHANX_BROWSER_QA '+JSON.stringify(report));
    if(!report.render||!report.mobile||report.tests.some(t=>!t.passed)||errors.length){
      process.exitCode=1;
    }
  }catch(err){
    report.pageErrors=errors;report.blocker=String(err);
    console.error('X13_SHANX_BROWSER_QA_BLOCKED '+JSON.stringify(report));
    process.exitCode=1;
  }finally{
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(err=>{console.error(err);process.exitCode=1;server.close()});
