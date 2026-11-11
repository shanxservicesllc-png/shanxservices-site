(function(scope){
"use strict";
function norm(s){
  return String(s||"").normalize("NFKD").toLowerCase()
    .replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
}
function doi(s){
  return String(s||"").trim().toLowerCase()
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//,"").replace(/^doi:\s*/,"").trim();
}
function tokens(s){return new Set(norm(s).split(" ").filter(w=>w.length>2));}
function similar(a,b){
  const x=tokens(a),y=tokens(b);
  if(!x.size||!y.size)return 0;
  let intersection=0;for(const w of x)if(y.has(w))intersection++;
  return intersection/(x.size+y.size-intersection);
}
function validate(job){
  if(!job||job.type!=="rabbitry-citation-audit-v1"||!Array.isArray(job.records)||
    !job.records.length||job.records.length>160||typeof job.sourceSha256!=="string"||
    !/^[a-f0-9]{64}$/.test(job.sourceSha256))throw Error("Invalid RABBITRY audit job");
  const ids=new Set();
  for(const r of job.records){
    if(!r||typeof r.id!=="string"||!/^[\w.:-]{1,70}$/.test(r.id)||
      ids.has(r.id)||typeof r.title!=="string"||r.title.length>350||
      typeof r.doi!=="string"||r.doi.length>150||typeof r.source!=="string"||
      !/^[\w.:-]{1,70}$/.test(r.source))throw Error("Invalid citation record");
    ids.add(r.id);
  }
  return true;
}
function compute(job){
  validate(job);
  const data=job.records;
  const pairs=[];
  let missingDoi=0,missingTitle=0;
  const uniqueDoi=new Set(),sources=new Set(),seenDoi=new Set();
  const distinctKeys=new Set();
  for(const r of data){
    sources.add(r.source);
    const key=doi(r.doi), title=norm(r.title);
    if(!key)missingDoi++;else uniqueDoi.add(key);
    if(!title)missingTitle++;
    distinctKeys.add(key?"doi:"+key:"title:"+title);
  }
  for(let i=0;i<data.length;i++){
    const a=data[i],ad=doi(a.doi),at=norm(a.title);
    for(let j=i+1;j<data.length;j++){
      const b=data[j],bd=doi(b.doi),bt=norm(b.title);
      let reason=null;
      if(ad&&bd&&ad===bd)reason="same-doi";
      else if(at&&bt&&at===bt)reason="same-title";
      else if(at&&bt&&similar(a.title,b.title)>=0.85)reason="similar-title-review";
      if(reason)pairs.push({a:a.id,b:b.id,reason});
    }
  }
  return {
    type:"rabbitry-citation-audit-v1",
    sourceSha256:job.sourceSha256,
    records:data.length,
    sourceGroups:sources.size,
    distinctDoi:uniqueDoi.size,
    missingDoi,missingTitle,
    uniqueKeys:distinctKeys.size,
    possibleDuplicatePairs:pairs
  };
}
const api=Object.freeze({norm,doi,validate,compute});
scope.X13ResearchAudit=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof self!=="undefined"?self:globalThis);
