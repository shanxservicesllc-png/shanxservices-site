// SHANX INTERACTIVE | FIND THE AI | procedural metal shader surfaces
// Original browser-rendered textures. No network requests or external media.
export function installSurfaces(pc,app,M){
  const colors={
    floor:'#334d66',
    tile:'#385875',
    wall:'#17293f',
    cap:'#3b5068'
  };
  const palette={
    floor:{seam:'#1e344b',light:'#42c0ca',gold:'#b89c65',frame:'#6c849e'},
    tile:{seam:'#1d3854',light:'#54bcdc',gold:'#cab174',frame:'#668ca0'},
    wall:{seam:'#0e1e31',light:'#52c4ee',gold:'#ca9e69',frame:'#435d79'},
    cap:{seam:'#233a56',light:'#4ee8db',gold:'#c8a365',frame:'#788ca4'}
  };
  const make=(kind)=>{
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
    const c=canvas.getContext('2d',{alpha:false}),p=palette[kind];
    c.fillStyle=colors[kind];c.fillRect(0,0,256,256);
    let seed=21931+kind.length*914;
    const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
    // Brushed-metal grain; deterministic and seamless at edge.
    for(let i=0;i<1250;i++){
      c.fillStyle=rnd()>.53?'#c1d6ef':'#020c18';c.globalAlpha=.025+rnd()*.065;
      const y=Math.floor(rnd()*256),x=Math.floor(rnd()*256);
      c.fillRect(x,y,3+rnd()*25,1);
    }
    c.globalAlpha=1;
    if(kind==='wall'){
      c.fillStyle='#112438';
      for(let k=0;k<6;k++){
        const x=k*43+7;
        c.fillRect(x,14,28,99);c.fillRect(x,142,28,101);
        c.fillStyle='#0c192b';for(let j=0;j<9;j++){c.fillRect(x+3,22+j*9,22,3);c.fillRect(x+3,147+j*9,22,3)}
        c.fillStyle='#112438';
      }
      c.strokeStyle=p.frame;c.lineWidth=3;c.strokeRect(3,3,250,250);
      c.fillStyle=p.light;c.globalAlpha=.85;
      for(let k=0;k<6;k++)c.fillRect(11+k*43,119,16,3);
      c.globalAlpha=1;
      c.fillStyle=p.gold;for(let i=0;i<5;i++)c.fillRect(8+i*50,246,27,4);
    }else{
      c.strokeStyle=p.seam;c.lineWidth=3;
      c.strokeRect(4,4,248,248);
      c.beginPath();c.moveTo(128,0);c.lineTo(128,256);c.moveTo(0,128);c.lineTo(256,128);c.stroke();
      c.strokeStyle=p.frame;c.lineWidth=1;c.strokeRect(11,11,234,234);
      for(const x of [20,147])for(const y of [20,147]){
        c.fillStyle='rgba(5,18,35,.30)';c.fillRect(x,y,87,87);
        c.strokeStyle=p.frame;c.strokeRect(x,y,87,87);
        c.fillStyle=p.light;c.globalAlpha=.65;
        c.fillRect(x+5,y+5,31,2);c.fillRect(x+5,y+9,2,23);
        c.globalAlpha=1;
        c.fillStyle='#9caec1';
        for(const dx of [5,79])for(const dy of [5,79]){c.beginPath();c.arc(x+dx,y+dy,1.8,0,Math.PI*2);c.fill()}
      }
      c.fillStyle=p.gold;
      for(let k=0;k<12;k++){const offset=k*21;c.fillRect(offset+2,123,10,2)}
      if(kind==='cap'){
        c.fillStyle=p.light;c.globalAlpha=.52;c.fillRect(0,125,256,6);c.fillRect(125,0,6,256);c.globalAlpha=1;
      }
    }
    const t=new pc.Texture(app.graphicsDevice,{
      width:256,height:256,format:pc.PIXELFORMAT_R8_G8_B8_A8,
      mipmaps:true,addressU:pc.ADDRESS_REPEAT,addressV:pc.ADDRESS_REPEAT
    });t.name='SHANX '+kind.toUpperCase()+' CIRCUIT PANEL';t.setSource(canvas);return t;
  };
  for(const kind of ['floor','tile','wall','cap']){
    const m=M[kind];const tex=make(kind);
    m.diffuse=new pc.Color(.92,.98,1);
    m.diffuseMap=tex;
    m.emissive=new pc.Color(kind==='wall'?.16:.22,kind==='wall'?.27:.33,kind==='wall'?.38:.46);
    m.emissiveMap=tex;
    m.metalness=.13;
    m.gloss=.45;
    m.update();
  }
  return{kind:'generated textures',names:['floor','tile','wall','cap'],source:'ShanX original procedural canvas'};
}
