// X13 ORB | AI STREETS district prototype | owner-authorized local dev build
// Distinct from the submitted AI Game Jam release. Buildings are exterior-only for now.
export function buildDistrict(pc, app, api) {
  const {mesh, group, M, world, addCollider} = api;
  const bounds = 232, roads = [-140, 0, 140], extent = 464;
  const catalog = [
    'suburban/building-type-a.glb',
    'suburban/building-type-f.glb',
    'suburban/building-type-h.glb',
    'commercial/building-a.glb',
    'commercial/building-h.glb',
    'commercial/building-n.glb'
  ];
  const modelStatus = {requested:0, loaded:0, failed:0, installed:0};
  const cache = new Map();
  function getModel(file, callback) {
    if (cache.has(file)) { cache.get(file).then(callback); return; }
    const promise = new Promise(resolve => app.assets.loadFromUrl('./district_assets/'+file,'container',
      (err,asset)=>resolve(err?null:asset)));
    cache.set(file,promise);
    promise.then(callback);
  }
  mesh('AI STREETS base landscape','box',M.dark,[0,-.34,0],[extent,.65,extent]);
  for (const road of roads) {
    mesh('CITY north south roadway '+road,'box',M.floor,[road,.015,0],[16,.09,extent]);
    mesh('CITY east west roadway '+road,'box',M.floor,[0,.02,road],[extent,.09,16]);
    for (const side of [-1,1]) {
      const off=side*10.5;
      mesh('CITY sidewalk NS '+road+off,'box',M.cap,[road+off,.065,0],[4.3,.15,extent]);
      mesh('CITY sidewalk EW '+road+off,'box',M.cap,[0,.067,road+off],[extent,.15,4.3]);
    }
    for(let k=-216;k<=216;k+=24) {
      if(roads.some(x=>Math.abs(x-k)<13))continue;
      mesh('lane line NS','box',M.gold,[road,.11,k],[.20,.025,8]);
      mesh('lane line EW','box',M.gold,[k,.115,road],[8,.025,.20]);
    }
  }
  for(const x of roads)for(const z of roads) {
    for(const d of [-1,1])for(let k=-2;k<=2;k++){
      mesh('crosswalk stripe','box',M.white,[x+k*2.6,.12,z+d*11],[1.2,.018,4]);
      mesh('crosswalk stripe','box',M.white,[x+d*11,.12,z+k*2.6],[4,.018,1.2]);
    }
    mesh('city junction beacon','cylinder',M.cyan,[x+12,2.6,z+12],[.25,5,.25]);
    mesh('city beacon lens','sphere',M.gold,[x+12,5.3,z+12],[.60,.60,.60]);
  }
  const axis=[-207,-180,-102,-75,-48,48,75,102,180,207];
  let buildingCount=0, storefronts=0;
  const shops=[];
  for(let zi=0;zi<axis.length;zi++)for(let xi=0;xi<axis.length;xi++) {
    if((xi+zi)%4===1 || (xi===2&&zi===2))continue;
    const x=axis[xi],z=axis[zi],commercial=(xi+zi)%5===0;
    const special=x===48&&z===48;
    const w=commercial?19:17,depth=commercial?19:17,height=commercial?16:10+((xi*3+zi)%4)*2;
    const root=group('AI STREETS building plot '+xi+' '+zi);
    root.setPosition(x,0,z);
    mesh('architectural brick facade','box',commercial?M.wall:M.cap,[0,height/2,0],[w,height,depth],root);
    mesh('layered roofline','box',M.dark,[0,height+.12,0],[w+.6,.36,depth+.6],root);
    mesh('metal cornice','box',M.gold,[0,height-.65,-depth/2-.15],[w+.3,.18,.23],root);
    for(const yy of [3.3,6.3,9.3,12.3]) {
      if(yy>height-1)continue;
      for(const xx of [-w*.29,0,w*.29]){
        mesh('recessed window','box',M.dark,[xx,yy,-depth/2-.115],[2,1.6,.11],root);
        mesh('illuminated window pane','box',(xi+zi)%3===0?M.gold:M.teal,[xx,yy,-depth/2-.19],[1.68,1.29,.065],root);
        mesh('window lintel','box',M.cap,[xx,yy+.88,-depth/2-.14],[2.25,.15,.28],root);
      }
    }
    mesh('door frame','box',M.gold,[0,1.4,-depth/2-.17],[2.2,2.8,.18],root);
    mesh('future accessible doorway','box',M.dark,[0,1.36,-depth/2-.32],[1.85,2.55,.13],root);
    if(commercial||special){
      mesh('commercial fascia','box',M.teal,[0,4.05,-depth/2-.32],[w-1,1.0,.20],root);
      mesh('illuminated awning','box',M.cyan,[0,3.5,-depth/2-1],[w-1,.19,2.1],root);
      storefronts++;
    }
    addCollider({x,z,sx:w,sz:depth,sy:height});
    buildingCount++;
    const file = catalog[(xi*7+zi*3)%catalog.length];
    if((xi+zi)%3!==0) {
      modelStatus.requested++;
      getModel(file, asset => {
        if(!asset || !world.parent) { if(!asset) modelStatus.failed++; return; }
        try {
          const art=asset.resource.instantiateRenderEntity({castShadows:false});
          art.name='ShanX Streets licensed authored building '+file;
          art.setPosition(x,0,z);
          art.setLocalScale(commercial?14.1:12.4,commercial?14.1:12.4,commercial?14.1:12.4);
          world.addChild(art);
          root.enabled=false;
          modelStatus.loaded++;
          modelStatus.installed++;
        } catch(e){modelStatus.failed++;console.warn('District GLB fallback',file,e);}
      });
    }
    if(special)shops.push({x,z:z-depth/2-4,name:'ORB GARAGE / UPGRADE SHOP',price:500});
  }
  // Denser street life without expensive shadow-casting, large textures or thousands of actors.
  let streetProps=0;
  for(const road of roads)for(let n=-208;n<=208;n+=32){
    if(roads.some(v=>Math.abs(n-v)<18))continue;
    for(const side of [-1,1]){
      const x=road+side*15,z=n;
      mesh('City lamp pole','cylinder',M.cap,[x,2.8,z],[.17,5.6,.17]);
      mesh('City lamp mast','box',M.dark,[x-side*.85,5.45,z],[1.8,.14,.22]);
      mesh('City lamp head','sphere',M.gold,[x-side*1.75,5.4,z],[.42,.19,.35]);
      mesh('Street planter','cylinder',M.dark,[x+side*2,.4,z+9],[1.1,.8,1.1]);
      mesh('Street greenery','sphere',M.green,[x+side*2,1.8,z+9],[1.45,2.0,1.45]);
      streetProps+=5;
      if((Math.abs(n)+road+side)%3===0){
        mesh('Transit kiosk / neighborhood activity','box',M.wall,[x+side*1.8,1.8,z-9],[2.2,3.4,1.8]);
        mesh('Transit display','box',M.teal,[x+side*1.8,2.3,z-9-side*.98],[1.65,1.3,.12]);
        streetProps+=2;
      }
    }
    for(const side of [-1,1]){
      const z=road+side*15,x=n;
      mesh('Cross-street lamp pole','cylinder',M.cap,[x,2.8,z],[.17,5.6,.17]);
      mesh('Cross-street lamp head','sphere',M.cyan,[x,5.4,z-side*.62],[.42,.24,.42]);
      streetProps+=2;
    }
  }
  // Parked hovercraft props can become driveable vehicles in the future.
  for(let i=0;i<22;i++){
    const road=roads[i%roads.length],line=-206+((i*37)%412);
    if(roads.some(v=>Math.abs(line-v)<20))continue;
    const x=i%2?road+18:line,z=i%2?line:road+18;
    mesh('AI Streets parked skimmer','box',i%3?M.cap:M.blue,[x,.77,z],[2.2,.75,4.1]);
    mesh('AI Streets skimmer canopy','box',M.glass,[x,1.27,z-.15],[1.7,.35,2.3]);
    mesh('AI Streets skimmer lights','box',M.cyan,[x,.73,z-2.12],[1.5,.16,.16]);
    streetProps+=3;
  }
  const contracts=[];
  const contractSpots=[
    [0,-64],[0,74],[-140,60],[140,-55],[-58,0],[79,0],
    [-140,-192],[140,188],[-196,140],[188,-140],[0,198],[-195,0]
  ];
  const contractTypes=['RECOVER LOST DATA','DISABLE DRONE NEST','REPAIR NETWORK RELAY','RESCUE FRIENDLY SIGNAL','HACK STREET TERMINAL','COLLECT POWER CELLS'];
  contractSpots.forEach(([x,z],i)=>{
    const root=group('AI Streets side mission '+(i+1));
    root.setPosition(x,0,z);
    mesh('side mission pad','cylinder',M.gold,[0,.16,0],[2.6,.16,2.6],root);
    mesh('side mission hologram','box',M.teal,[0,2.0,0],[1.1,2.4,.12],root);
    mesh('side mission icon','sphere',M.magenta,[0,3.25,0],[.42,.42,.42],root);
    contracts.push({x,z,name:contractTypes[i%contractTypes.length],reward:120+15*i,done:false,entity:root});
  });
  // Deliberate shop marker and entrance, suitable for later indoor scenes.
  const shop=shops[0]||{x:48,z:35.5,name:'ORB GARAGE',price:500};
  mesh('ORB GARAGE glowing entry zone','cylinder',M.magenta,[shop.x,.17,shop.z],[4.5,.15,4.5]);
  mesh('ORB GARAGE mission beacon','sphere',M.gold,[shop.x,2.5,shop.z],[.50,.5,.50]);
  const spawn=[];
  for(let n=-216;n<=216;n+=18)for(const street of roads){
    spawn.push({x:street,z:n},{x:n,z:street});
  }
  const loot=[];
  for(let i=0;i<18;i++){
    const k=spawn[(i*19+17)%spawn.length];
    loot.push({x:k.x,z:k.z});
  }
  return {
    trace:[{x:-140,z:0},{x:140,z:140},{x:0,z:-140}],
    hides:[{x:140,z:-140},{x:-140,z:140},{x:0,z:194},{x:-194,z:0}],
    loot, spawn, shops, contracts, streetProps, bounds, buildingCount, storefronts, modelStatus
  };
}
