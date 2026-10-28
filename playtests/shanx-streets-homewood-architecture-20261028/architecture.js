// SXS Interactive | architecture research layer.
// Source: vector-tile mapped building footprints; geometry/details authored procedurally.
// NOT surveyed facades or individual address-accurate houses.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.171.0/build/three.module.js';

export function attachArchitecture(map, maplibre, anchor) {
  const origin=maplibre.MercatorCoordinate.fromLngLat(anchor);
  const meters=origin.meterInMercatorCoordinateUnits();
  const root=new THREE.Group();
  const scene=new THREE.Scene(); scene.add(root);
  scene.add(new THREE.AmbientLight(0xfff1d5,2.1));
  const light=new THREE.DirectionalLight(0xfff9e2,2.6);light.position.set(-110,90,180);scene.add(light);
  const camera=new THREE.Camera();
  const palette=[
    {wall:0x995e4b,trim:0xe8ddd1,roof:0x373942,door:0x183b35},
    {wall:0xb9ad95,trim:0xfff2e0,roof:0x554848,door:0x34485b},
    {wall:0x696b61,trim:0xe7e0d8,roof:0x454954,door:0x284451},
    {wall:0xc4b69e,trim:0xf0e7d7,roof:0x514a4c,door:0x6e382e},
    {wall:0x8a473c,trim:0xf4e8d1,roof:0x33383b,door:0x293b38}
  ];
  const materials=palette.map(p=>({
    wall:new THREE.MeshStandardMaterial({color:p.wall,roughness:.95}),
    trim:new THREE.MeshStandardMaterial({color:p.trim,roughness:.8}),
    roof:new THREE.MeshStandardMaterial({color:p.roof,roughness:1,side:THREE.DoubleSide}),
    door:new THREE.MeshStandardMaterial({color:p.door,roughness:.75}),
    glass:new THREE.MeshStandardMaterial({color:0x6c9198,metalness:.1,roughness:.3}),
    porch:new THREE.MeshStandardMaterial({color:0x85847d,roughness:1}),
    shadow:new THREE.MeshStandardMaterial({color:0x222a27,roughness:1})
  }));
  const allMats=materials.flatMap(Object.values);
  let renderer=null,visible=true,num=0,lastKey='',warn='';
  const make=(geo,mat,parent,x=0,y=0,z=0)=>{
    const mesh=new THREE.Mesh(geo,mat);
    mesh.position.set(x,y,z);
    parent.add(mesh);return mesh;
  };
  const box=(parent,mat,w,d,h,x,y,z)=>make(new THREE.BoxGeometry(w,d,h),mat,parent,x,y,z);
  const toMeter=(p)=>{
    const q=maplibre.MercatorCoordinate.fromLngLat(p);
    return [(q.x-origin.x)/meters, (origin.y-q.y)/meters];
  };
  // A building's main front is approximate. Buildings are placed on genuine
  // mapped footprints but roof type and facade elements are interpretive.
  function home(feature,index) {
    if(feature.geometry?.type!=='Polygon'||!feature.geometry.coordinates?.[0])return null;
    const ring=feature.geometry.coordinates[0].slice(0,-1).map(toMeter);
    if(ring.length<3||ring.length>32)return null;
    const mean=ring.reduce((r,p)=>[r[0]+p[0],r[1]+p[1]],[0,0]).map(v=>v/ring.length);
    const dist=Math.hypot(...mean);
    if(dist>185)return null;
    let main=[1,0],longest=0;
    for(let i=0;i<ring.length;i++){
      const a=ring[i],b=ring[(i+1)%ring.length],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);
      if(len>longest){longest=len;main=[dx/len,dy/len]}
    }
    if(longest<2.5)return null;
    const perp=[-main[1],main[0]], angle=Math.atan2(main[1],main[0]);
    const pts=ring.map(([x,y])=>{
      x-=mean[0];y-=mean[1];
      return [x*main[0]+y*main[1],x*perp[0]+y*perp[1]];
    });
    const us=pts.map(x=>x[0]),vs=pts.map(x=>x[1]);
    const u0=Math.min(...us),u1=Math.max(...us),v0=Math.min(...vs),v1=Math.max(...vs);
    const w=u1-u0,d=v1-v0;
    if(w<3||d<3||w>70||d>65||w*d>1600)return null;
    const centerU=(u0+u1)/2,centerV=(v0+v1)/2;
    const rng=(Math.abs(Math.trunc(mean[0]*1000)+Math.trunc(mean[1]*1000)*23)||1)%997;
    const m=materials[rng%materials.length];
    const isShop=w*d>300||Math.max(w,d)>25;
    const floors=isShop?1+(rng%2):1+(rng%3===0?2:1);
    const h=isShop?4.4*floors:3.2*floors;
    const group=new THREE.Group();group.position.set(mean[0],mean[1],0);group.rotation.z=angle;
    // Footprint polygon body; no claim of actual recorded wall or porch height.
    const shape=new THREE.Shape();pts.forEach((p,i)=>i?shape.lineTo(p[0],p[1]):shape.moveTo(p[0],p[1]));shape.closePath();
    make(new THREE.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false,curveSegments:1}),m.wall,group);
    // The footprint may be L-shaped; rectangular roof only for roughly rectangular plots.
    const area=Math.abs(pts.reduce((acc,p,i)=>{const q=pts[(i+1)%pts.length];return acc+p[0]*q[1]-q[0]*p[1]},0)/2);
    if(area/(w*d)<.74){
      // Irregular commercial and multi-part footprint: simple parapet roof instead of invented gable.
      const roof=new THREE.Shape();pts.forEach((p,i)=>i?roof.lineTo(p[0],p[1]):roof.moveTo(p[0],p[1]));roof.closePath();
      make(new THREE.ShapeGeometry(roof),m.roof,group,0,0,h+.12);
      for(let i=0;i<pts.length;i++){
        const p=pts[i],q=pts[(i+1)%pts.length],len=Math.hypot(q[0]-p[0],q[1]-p[1]),rim=box(group,m.trim,len,.13,.38,(q[0]+p[0])/2,(q[1]+p[1])/2,h+.12);
        rim.rotation.z=Math.atan2(q[1]-p[1],q[0]-p[0]);
      }
    }else{
      const eave=.27,halfW=w/2+eave,halfD=d/2+eave,peak=isShop?.8:Math.min(2.5,Math.max(.8,d*.23));
      const midX=centerU,midY=centerV,he=h+.18;
      const roofmesh=(verts)=>{
        const geometry=new THREE.BufferGeometry();
        geometry.setAttribute('position',new THREE.Float32BufferAttribute(verts.flat(),3));
        geometry.computeVertexNormals();
        make(geometry,m.roof,group);
      };
      const A=[midX-halfW,midY-halfD,he], B=[midX+halfW,midY-halfD,he], C=[midX+halfW,midY,he+peak], D=[midX-halfW,midY,he+peak],
        E=[midX-halfW,midY+halfD,he],F=[midX+halfW,midY+halfD,he];
      roofmesh([A,B,C,A,C,D,D,C,F,D,F,E]); // two sloping shingle planes
      // Front triangular gable and back triangle where the roof is seen from the street.
      const walltri=(a,b,c)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([...a,...b,...c],3));g.computeVertexNormals();make(g,m.wall,group)};
      walltri(A,[midX,midY-halfD,he+peak],B);
      walltri(E,F,[midX,midY+halfD,he+peak]);
      // Shingles ridgeline.
      box(group,m.trim,w+.42,.08,.1,midX,midY,he+peak);
    }
    // Doors, window glass, contrasting frames, stoop/porch and post geometry.
    // These are original reusable generalized art, never extracted photo textures.
    const frontage=Math.max(0,Math.min(4,w-2));
    const front=centerV-d/2-.075;
    const addWin=(x,side,level,wide=1)=>{
      const z=level*3.15+1.6;
      const y=centerV+side*(d/2+.08);
      box(group,m.trim,1.21*wide,.11,1.48,x,y,z);
      box(group,m.glass,.91*wide,.14,1.16,x,y+side*.06,z);
      box(group,m.trim,1.13*wide,.16,.12,x,y+side*.16,z);
      box(group,m.trim,.065,.17,1.2,x,y+side*.16,z);
    };
    for(let fl=0;fl<floors;fl++){
      const step=(w-1.3)/(Math.max(2,Math.floor(w/2.4)));
      const n=Math.max(2,Math.min(5,Math.floor(w/2.4)));
      for(let j=0;j<n;j++){
        const x=centerU-w/2+.7+j*(w-1.4)/(Math.max(1,n-1));
        if(fl===0&&Math.abs(x-centerU)<1.1)continue;
        addWin(x,-1,fl); if(j%2===0)addWin(x,1,fl,.9);
      }
    }
    const doorY=centerV-d/2-.12;
    box(group,m.trim,1.2,.12,2.45,centerU,doorY,1.3);
    box(group,m.door,.98,.14,2.26,centerU,doorY-.06,1.23);
    box(group,m.trim,.085,.12,.1,centerU+.36,doorY-.17,1.05); // door handle
    if(!isShop&&w>4&&d>4){
      const porchW=Math.min(w-1,Math.max(2.3,frontage+.8)),porchD=Math.min(2.2,1.5+d*.04);
      box(group,m.porch,porchW,porchD,.25,centerU,doorY-porchD/2,.28);
      // three physical steps from sidewalk to porch entrance
      for(let k=0;k<3;k++)box(group,m.porch,Math.max(1.3,porchW-1.0),.34,.16,centerU,doorY-porchD-k*.32-.1,.19-k*.06);
      for(const x of [centerU-porchW/2+.15,centerU+porchW/2-.15])box(group,m.trim,.11,.11,2.85,x,doorY-porchD+.17,1.53);
      box(group,m.roof,porchW+.3,porchD+.12,.16,centerU,doorY-porchD/2,3.05);
      for(const x of [centerU-porchW/2,centerU+porchW/2])box(group,m.trim,.09,porchD,.62,x,doorY-porchD/2,1.02);
    }
    if(isShop){
      // Large-window storefronts with sign fascia, not claims about actual businesses.
      for(const x of [centerU-w*.25,centerU+w*.25]){
        box(group,m.trim,Math.max(1.6,w*.36),.12,2.4,x,front,.98+1);
        box(group,m.glass,Math.max(1.3,w*.32),.14,2.05,x,front-.08,2);
      }
      box(group,m.door,Math.min(w*.8,8),.18,.85,centerU,front-.10,3.72);
    }
    return {group,dist};
  }
  function clear(){
    for(const obj of [...root.children]){root.remove(obj);obj.traverse(x=>{if(x.geometry)x.geometry.dispose()});}
  }
  function update(){
    if(!map.isStyleLoaded()||map.getZoom()<16){num=0;clear();return;}
    const source=map.getSource('openmaptiles')?'openmaptiles':map.getSource('openfreemap')?'openfreemap':null;
    if(!source){warn='No building tile source';return;}
    const center=map.getCenter(),key=center.lng.toFixed(3)+':'+center.lat.toFixed(3);
    if(key===lastKey&&num>0)return;
    let features=[];
    try{features=map.querySourceFeatures(source,{sourceLayer:'building'})||[];}catch(e){warn=String(e);return}
    const seen=new Set(),choices=[];
    for(const f of features){
      const pts=f.geometry?.coordinates?.[0];
      if(!Array.isArray(pts)||pts.length<4)continue;
      const k=(f.id??'')+':'+pts[0][0].toFixed(5)+':'+pts[0][1].toFixed(5);
      if(seen.has(k))continue;seen.add(k);
      const h=home(f,choices.length);
      if(h)choices.push(h);
    }
    choices.sort((a,b)=>a.dist-b.dist);
    clear(); for(const item of choices.slice(0,65))root.add(item.group);
    // Dispose geometry for objects excluded under mobile performance budget.
    for(const item of choices.slice(65))item.group.traverse(x=>{if(x.geometry)x.geometry.dispose()});
    num=root.children.length;lastKey=key;
  }
  const layer={
    id:'sxs-architecture-houses',type:'custom',renderingMode:'3d',
    onAdd(mp,gl){
      renderer=new THREE.WebGLRenderer({canvas:mp.getCanvas(),context:gl,antialias:true});
      renderer.autoClear=false;renderer.outputColorSpace=THREE.SRGBColorSpace;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
    },
    render(gl,args){
      if(!visible||num===0)return;
      const mat=new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix);
      const transform=new THREE.Matrix4().makeTranslation(origin.x,origin.y,0)
      .scale(new THREE.Vector3(meters,-meters,meters));
      camera.projectionMatrix.copy(mat.multiply(transform));
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
      renderer.resetState();renderer.render(scene,camera);
    },
    onRemove(){renderer?.dispose();renderer=null;}
  };
  map.addLayer(layer);
  map.on('idle',update);
  setTimeout(update,800);
  return {setVisible(v){visible=v;map.triggerRepaint()},get count(){return num},get error(){return warn},refresh:update};
}
