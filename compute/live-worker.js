"use strict";
importScripts("./live-compute.js","./live-research.js");
let active=false,timer=null,offset=0,results=[],task=null,duty=5,epoch=0;
function stopped(){active=false;epoch++;if(timer!==null)clearTimeout(timer);timer=null;task=null;results=[];offset=0;}
function slice(){
 if(!active||!task)return;
 try{
   const chunk=task.vectors.slice(offset,offset+8);
   results.push(...X13Compute.compute({type:"dot-batch-v1",query:task.query,vectors:chunk}));
   offset+=chunk.length;
   if(offset>=task.vectors.length){
     const scores=results;stopped();postMessage({type:"complete",scores,engine:"cpu"});
   }else{timer=setTimeout(slice,Math.max(20,Math.round(600/Math.max(1,duty))));}
 }catch(err){stopped();postMessage({type:"error",message:String(err.message||err)});}
}
async function gpuDot(job){
 if(!self.navigator?.gpu)throw Error("WebGPU unsupported");
 const adapter=await navigator.gpu.requestAdapter({powerPreference:"low-power"});
 if(!adapter)throw Error("No WebGPU adapter");
 const device=await adapter.requestDevice();
 let srcA,srcB,out,read;
 try{
   const n=job.vectors.length,d=job.query.length;
   const q=new Float32Array(job.query),matrix=new Float32Array(n*d);
   job.vectors.forEach((row,i)=>matrix.set(row.values,i*d));
   const usage=GPUBufferUsage;
   srcA=device.createBuffer({size:q.byteLength,usage:usage.STORAGE|usage.COPY_DST});
   srcB=device.createBuffer({size:matrix.byteLength,usage:usage.STORAGE|usage.COPY_DST});
   out=device.createBuffer({size:n*4,usage:usage.STORAGE|usage.COPY_SRC});
   read=device.createBuffer({size:n*4,usage:usage.COPY_DST|usage.MAP_READ});
   device.queue.writeBuffer(srcA,0,q);
   device.queue.writeBuffer(srcB,0,matrix);
   const wgsl="struct Vector { data: array<f32>; };"+
     "@group(0) @binding(0) var<storage,read> query:Vector;"+
     "@group(0) @binding(1) var<storage,read> values:Vector;"+
     "@group(0) @binding(2) var<storage,read_write> result:Vector;"+
     "@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) id:vec3<u32>){"+
       "let r=id.x; if(r>="+n+"u){return;} var total:f32=0.0;"+
       "for(var i:u32=0u;i<"+d+"u;i=i+1u){total+=query.data[i]*values.data[r*"+d+"u+i];}"+
       "result.data[r]=total;}";
   const shader=device.createShaderModule({code:wgsl});
   const pipeline=device.createComputePipeline({layout:"auto",compute:{module:shader,entryPoint:"main"}});
   const bind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[
      {binding:0,resource:{buffer:srcA}},{binding:1,resource:{buffer:srcB}},{binding:2,resource:{buffer:out}}
   ]});
   const encoder=device.createCommandEncoder(),pass=encoder.beginComputePass();
   pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.dispatchWorkgroups(Math.ceil(n/64));pass.end();
   encoder.copyBufferToBuffer(out,0,read,0,n*4);
   device.queue.submit([encoder.finish()]);
   await read.mapAsync(GPUMapMode.READ);
   const floats=new Float32Array(read.getMappedRange().slice(0));
   read.unmap();
   return job.vectors.map((r,i)=>({id:r.id,score:Math.round(floats[i]*1000000)/1000000}));
 }finally{
   for(const b of [srcA,srcB,out,read])try{b?.destroy()}catch{}
   try{device.destroy()}catch{}
 }
}
onmessage=async(event)=>{
 const data=event.data||{};
 if(data.type==="stop"){stopped();return;}
 if(data.type!=="run"||active)return;
 const ticket=++epoch;
 try{
   duty=Math.min(30,Math.max(1,Math.floor(Number(data.duty)||1)));
   active=true;
   if(data.task?.type==="rabbitry-citation-audit-v1"){
     const report=X13ResearchAudit.compute(data.task);
     stopped();postMessage({type:"complete",report,engine:"cpu"});return;
   }
   X13Compute.validateJob(data.task);
   if(data.task.origin==="rabbitry-relevance-v1"){
     let scores,engine="cpu";
     try{scores=await gpuDot(data.task);engine="webgpu";}
     catch{scores=X13Compute.compute(data.task);}
     if(!active||ticket!==epoch)return;
     stopped();postMessage({type:"complete",scores,engine});return;
   }
   task=data.task;offset=0;results=[];slice();
 }catch(error){stopped();postMessage({type:"error",message:String(error.message||error)});}
};
