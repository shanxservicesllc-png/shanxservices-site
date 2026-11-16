#!/usr/bin/env node
// X13 ShanX Streets actual browser QA, isolated from the live player's data.
// Extend the repo's existing Chrome QA approach; do not modify the published HTML.
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
const input=process.env.SHANX_QA_FILE?path.resolve(process.cwd(),process.env.SHANX_QA_FILE):path.resolve(__dirname,'../arcade/games/shanx-streets/index.html');
const html=fs.readFileSync(input,'utf8');
const hook=String.raw`
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
    const prop=streetProps.find(p=>p.kind==='hotdog');
    if(prop){
      const original={active:prop.active,broken:prop.broken,
        z:prop.root.rotation.z,y:prop.root.position.y};
      try{
        const collapsed=collapseStreetProp(prop,22);
        add('food-cart-breaks',collapsed&&prop.broken&&!prop.active,
          'Cart can collapse after speed-dependent impact');
      }finally{
        prop.active=original.active;prop.broken=original.broken;
        prop.root.rotation.z=original.z;prop.root.position.y=original.y;
      }
    }else add('food-cart-breaks',false,'No registered food cart');
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
      const savedPosition={x:officer.x,z:officer.z,
        cool:officer.vehicleHitCooldown};
      try{
        officer.x=10005;officer.z=10000;officer.vehicleHitCooldown=0;
        officer.rig.root.visible=true;
        const car={x:10009,z:10000,h:Math.PI/2,speed:20,mode:'player',
          health:100,hover:false,hoverLanding:false,hoverHeight:0,
          type:'car',disabled:false};
        const collision=checkCarPedestrianSweep(car,10000,10000);
        add('downed-officer-contact',collision&&car.speed<20,
          'Swept car stops or slows on downed officer');
      }finally{
        officer.x=savedPosition.x;officer.z=savedPosition.z;
        officer.vehicleHitCooldown=savedPosition.cool;
      }
    }finally{
      wanted=prevWanted;officer.hp=old.hp;officer.down=old.down;officer.active=old.active;
      officer.rig.root.rotation.x=old.rootX;officer.rig.figure.rotation.z=old.figZ;
      officer.rig.root.visible=old.visible;
    }

    /* v34: test real garage access, equipment toggles, and damage ownership. */
    if(typeof window.__X13_V34_GARAGE==='function'){
      const sig=signatureDriveCar(),other=vehicles.find(v=>v!==sig&&v.type==='car'&&v.health>40);
      const snapshot={mode,pv,gamePaused,garageOpened,garageWasPaused,gameMoney,
        sx:sig.x,sz:sig.z,sv:sig.speed,sh:sig.health,sd:sig.disabled,sMode:sig.mode,
        hover:sig.hover,landing:sig.hoverLanding,shieldCharge,orbWanted,laserPulseCooldown,
        mods:{...signatureModes},upgrades:{...signatureUpgrades},store:localStorage.getItem('shanx-signature-upgrades-v34'),
        otherHealth:other?.health};
      try{
        mode='car';pv=sig;sig.mode='player';gamePaused=false;
        sig.x=GARAGE_BAY.x;sig.z=GARAGE_BAY.z;sig.speed=0;sig.hover=false;sig.hoverLanding=false;
        const shopOk=openGarage();
        add('garage-drive-in',shopOk&&garageOpened&&!$('garageOverlay').hidden,'Park signature car inside bay to open shop');
        const moneyBefore=gameMoney;
        const purchased=purchaseGarageUpgrade('wheels');
        add('garage-purchase-saved',purchased&&signatureUpgrades.wheels&&gameMoney===moneyBefore-GARAGE_UPGRADES.wheels.price
          &&JSON.parse(localStorage.getItem('shanx-signature-upgrades-v34')||'{}').wheels===true,'Wheel upgrade updates money and browser save');
        closeGarage();
        sig.health=45;signatureModes.invincible=true;
        const immune=!hurtVehicle(sig,250,true)&&sig.health===100;
        add('signature-invincibility-toggle',immune,'Invincible ON protects only signature car');
        signatureModes.invincible=false;
        sig.health=79;signatureUpgrades.shield=true;signatureModes.shieldOn=true;shieldCharge=100;
        const absorbed=!hurtVehicle(sig,45,false)&&sig.health===79&&shieldCharge<100;
        add('signature-energy-shield',absorbed,'Installed shield absorbs car damage');
        signatureModes.shieldOn=false;signatureUpgrades.sensor=true;
        sig.health=80;hurtVehicle(sig,100,false);
        add('signature-protection-sensor',sig.health<80&&sig.health>70,
          'Passive sensor allows small damage without invincibility');
        if(other){
          const beforeOther=other.health;
          hurtVehicle(other,15,false);
          add('other-cars-damageable',other.health===beforeOther-15,'Regular traffic retains damage');
        }else add('other-cars-damageable',false,'No other drivable car found');
        signatureUpgrades.orb=true;
        const orbCall=callOrb();
        add('orb-companion-recall',orbCall&&orbWanted&&!!orbCompanion,'ORB companion summoned in game');
        signatureUpgrades.laser=true;laserPulseCooldown=0;
        const pulsesBefore=energyPulses.length;
        const fired=fireCarLaser();
        add('signature-energy-emitter',fired&&energyPulses.length>pulsesBefore,'Sci-fi pulse created');
        const oldMode=mode,oldPv=pv;
        pv=other;mode='car';
        const rejected=!toggleInvincible();
        add('other-cars-cannot-invincible',rejected&&!signatureModes.invincible,'Protection restricted to Mac’s original car');
        mode=oldMode;pv=oldPv;
      }finally{
        if(garageOpened)closeGarage();
        mode=snapshot.mode;pv=snapshot.pv;gamePaused=snapshot.gamePaused;
        garageOpened=snapshot.garageOpened;garageWasPaused=snapshot.garageWasPaused;
        gameMoney=snapshot.gameMoney;sig.x=snapshot.sx;sig.z=snapshot.sz;sig.speed=snapshot.sv;
        sig.health=snapshot.sh;sig.disabled=snapshot.sd;sig.mode=snapshot.sMode;
        sig.hover=snapshot.hover;sig.hoverLanding=snapshot.landing;
        shieldCharge=snapshot.shieldCharge;orbWanted=snapshot.orbWanted;laserPulseCooldown=snapshot.laserPulseCooldown;
        Object.assign(signatureModes,snapshot.mods);Object.assign(signatureUpgrades,snapshot.upgrades);
        if(other&&snapshot.otherHealth!==undefined)other.health=snapshot.otherHealth;
        applySignatureCosmetics();syncProtectionUi();
        if(snapshot.store===null)localStorage.removeItem('shanx-signature-upgrades-v34');
        else localStorage.setItem('shanx-signature-upgrades-v34',snapshot.store);
      }
    }

    if(typeof window.__X13_V35_DISTRICTS==='function'){
      const count=outerSites.length;
      add('outer-district-facades',count>250&&!!outerFacades.material.map,
        count+' outer buildings with shared façade texture');
      add('instanced-roof-caps',outerRoofs.count===count,
        outerRoofs.count+' roof caps for '+count+' outer buildings');
      const sample=outerColliderList.find(b=>b.x< -670&&b.x> -1400&&Math.abs(b.z)<400);
      const point=sample?{x:sample.x,z:sample.z}:null;
      add('outer-building-physics',!!(point&&pushFromBuildings(point,1.1)),
        sample?'Tested physical outer building at '+sample.x+','+sample.z:'No sample');
      add('project-housing-courtyards',projectCenters.length>=4,
        projectCenters.length+' distributed project-style residential developments');
      const projectActions=worldActions.filter(a=>a.kind==='projectMission');
      add('housing-mission-boards',projectActions.length===projectCenters.length&&projectActions.length>=4,
        projectActions.length+' actual interactable mission stations');
      add('outer-city-population',npcList.length>300,npcList.length+' pedestrian actors');
      const regions=[...new Set(MS.filter(m=>m.region).map(m=>m.region))];
      add('regional-mission-expansion',regions.length>=6&&MS.length>=19,
        MS.length+' missions covering '+regions.join(','));
      const originalMission=missionIndex;
      try{
        const i=MS.findIndex(m=>m.region==='west');
        if(i>=0)missionIndex=i;
        const p=missionPoint();
        add('regional-waypoint-generation',i>=0&&p.x< -2200&&p.x>EXT_WEST&&
          p.z>EXT_SOUTH&&p.z<EXT_NORTH&&!riverObstacle(p.x,p.z),
          'Generated a West End in-world mission waypoint');
      }finally{missionIndex=originalMission}
      const bay={x:GARAGE_BAY.x,z:GARAGE_BAY.z};
      const blocked=pushFromBuildings(bay,1.2);
      add('garage-bay-world-clear',!blocked,
        blocked?'Garage bay conflicts with building collisions':'Garage lane clear after expanded physics');
    }
    return report;
  }
};
`;
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
    report.preStart=await page.evaluate(()=>({title:document.title,
      bodyLength:document.body?.innerHTML?.length||0,
      startExists:!!document.getElementById('startGame'),
      btnIds:[...document.querySelectorAll('button')].slice(0,14).map(b=>b.id),
      nodeCount:document.querySelectorAll('*').length}));
    console.log('X13_SHANX_PRESTART '+JSON.stringify(report.preStart));
    if(!report.preStart.startExists)throw Error('Start-game element missing from runtime DOM');
    await page.evaluate(()=>document.querySelector('#startGame').click());
    await page.waitForFunction(()=>window.__X13_QA?.status().started,{timeout:18000});
    await page.waitForTimeout(800);
    const st=await page.evaluate(()=>window.__X13_QA.status());
    report.desktop=true;report.render=st.webgl&&st.persons>0&&st.vehicleCount>0;
    report.state=st;
    try{await page.screenshot({path:'/tmp/shanx-streets-desktop.png',timeout:6000,animations:'disabled'});}catch(e){report.desktopScreenshot='unavailable: '+String(e).slice(0,130)}
    report.tests=await page.evaluate(()=>window.__X13_QA.checks());
    await page.setViewportSize({width:390,height:844});
    await page.waitForTimeout(500);
    report.mobile=await page.evaluate(()=>!!window.__X13_QA.status().webgl);
    try{await page.screenshot({path:'/tmp/shanx-streets-mobile.png',timeout:6000,animations:'disabled'});}catch(e){report.mobileScreenshot='unavailable: '+String(e).slice(0,130)}
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
