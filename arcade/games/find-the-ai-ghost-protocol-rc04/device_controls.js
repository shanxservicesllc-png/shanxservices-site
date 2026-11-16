// X13 ORB | ShanX standard controller selection and live button mapping.
// Uses browser Gamepad "standard" layout when exposed; unknown HID mappings are flagged.
export function createDeviceControls({onAction,onLook,onStart,onCamera,onCameraSet,onNavigate,onGuide}) {
  const device=document.getElementById('deviceMode');
  const profile=document.getElementById('controllerProfile');
  const status=document.getElementById('controllerStatus');
  const modes=new Set(['phone','tablet','computer','controller']);
  const mappings={
    xbox:{use:0,phase:1,scan:2,guide:3,fly:4,pulse:5,boost:6,bolt:7,help:8,pause:9,sprint:10,recenter:11,map:12,fps:13,prevView:14,nextView:15},
    playstation:{use:0,phase:1,scan:2,guide:3,fly:4,pulse:5,boost:6,bolt:7,help:8,pause:9,sprint:10,recenter:11,map:12,fps:13,prevView:14,nextView:15},
    switch:{use:1,phase:0,scan:3,guide:2,fly:4,pulse:5,boost:6,bolt:7,help:8,pause:9,sprint:10,recenter:11,map:12,fps:13,prevView:14,nextView:15},
    generic:{use:0,phase:1,scan:2,guide:3,fly:4,pulse:5,boost:6,bolt:7,help:8,pause:9,sprint:10,recenter:11,map:12,fps:13,prevView:14,nextView:15}
  };
  let mode='computer',connectedName='',prev={},sprint=false,aiming=false,hyper=false,climb=false,descend=false;
  let lastMapCheck='';
  const gamepadMove={x:0,z:0,active:false};
  const safeStorage={
    get(k){try{return localStorage.getItem(k)}catch(_){return null}},
    set(k,v){try{localStorage.setItem(k,v)}catch(_){}}
  };
  function defaultMode(){return window.matchMedia('(pointer:coarse)').matches?(window.innerWidth<=600?'phone':'tablet'):'computer'}
  function setMode(value){
    mode=modes.has(value)?value:'computer';device.value=mode;
    document.body.dataset.deviceMode=mode;
    gamepadMove.x=0;gamepadMove.z=0;gamepadMove.active=false;
    sprint=false;aiming=false;hyper=false;climb=false;descend=false;prev={};connectedName='';lastMapCheck='';
    safeStorage.set('ghost-protocol-rc03-device',mode);
    status.textContent=mode==='controller'?'Controller mode: press any button to activate':'Input: '+mode.toUpperCase();
  }
  device.addEventListener('change',()=>setMode(device.value));
  profile.addEventListener('change',()=>safeStorage.set('x13-orb-pad-profile',profile.value));
  const p=safeStorage.get('x13-orb-pad-profile');if(p&&mappings[p])profile.value=p;
  const remembered=safeStorage.get('ghost-protocol-rc03-device');
  setMode(remembered&&modes.has(remembered)?remembered:defaultMode());
  const deadzone=v=>Math.abs(v)<.16?0:Math.sign(v)*(Math.abs(v)-.16)/.84;
  const pressed=b=>!!(b&&(b.pressed||b.value>.58));
  function poll(dt){
    gamepadMove.x=0;gamepadMove.z=0;gamepadMove.active=false;
    if(mode!=='controller')return;
    const pads=navigator.getGamepads?Array.from(navigator.getGamepads()||[]):[];
    const pad=pads.find(p=>p&&p.connected);
    if(!pad){if(connectedName){connectedName='';status.textContent='Controller disconnected. Reconnect or select Computer.'}aiming=false;hyper=false;climb=false;descend=false;prev={};return}
    const type=pad.mapping||'nonstandard';
    if(pad.id!==connectedName||lastMapCheck!==type){
      connectedName=pad.id;lastMapCheck=type;
      status.textContent=(type==='standard'?'Connected: ':'HID/nonstandard mapping: ')+pad.id.slice(0,72)+(type==='standard'?'':' • Buttons may require calibration');
    }
    const axes=pad.axes||[];
    gamepadMove.x=deadzone(axes[0]||0);gamepadMove.z=deadzone(axes[1]||0);
    gamepadMove.active=Math.hypot(gamepadMove.x,gamepadMove.z)>.02;
    const rx=deadzone(axes[2]||0),ry=deadzone(axes[3]||0);
    if(rx||ry)onLook(rx*Math.min(dt,.05)*2.6,ry*Math.min(dt,.05)*2.0);
    const mapping=mappings[profile.value]||mappings.xbox;
    hyper=pressed(pad.buttons?.[mapping.boost]);
    aiming=false;
    climb=pressed(pad.buttons?.[mapping.pulse]);
    descend=pressed(pad.buttons?.[mapping.phase]);
    const next={};
    // Dispatch only on rising edges to avoid repeating actions while a button is held.
    for(const [name,i] of Object.entries(mapping)){
      if(name==='boost')continue;
      const down=pressed(pad.buttons?.[i]);next[name]=down;
      if(!down||prev[name])continue;
      if(name==='sprint'){sprint=!sprint;onAction('sprint',sprint);continue;}
      if(name==='nextView'){onCamera(1);continue;}
      if(name==='prevView'){onCamera(-1);continue;}
      if(name==='map'||name==='fps'){onCameraSet(name);continue;}
      if(name==='help'||name==='guide'){onGuide();continue;}
      if(name==='use'&&!document.getElementById('controllerGuide').classList.contains('hidden')){onAction('use');continue;}
      if(name==='use'&&document.getElementById('menu')&&!document.getElementById('menu').classList.contains('hidden')){onStart();continue;}
      onAction(name);
    }
    prev=next;
  }
  return {
    poll,move:gamepadMove,get mode(){return mode},setMode,
    get profile(){return profile.value},get sprinting(){return sprint},
    get aiming(){return aiming},get hyper(){return hyper},get climbing(){return climb},get descending(){return descend},get connectedName(){return connectedName},
    get mappingKind(){return lastMapCheck}
  };
}
