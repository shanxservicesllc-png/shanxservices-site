"use strict";
/* ASK SHANX file delivery: turn named code fences into clickable local downloads.
   File bytes are generated in-browser, never executed or uploaded. */
(function(root) {
  const map={python:"py",py:"py",javascript:"js",js:"js",typescript:"ts",ts:"ts",jsx:"jsx",tsx:"tsx",html:"html",css:"css",json:"json",xml:"xml",svg:"svg",markdown:"md",md:"md",text:"txt",txt:"txt",yaml:"yaml",yml:"yml",sql:"sql",bash:"sh",sh:"sh",powershell:"ps1",ps1:"ps1",java:"java",c:"c",cpp:"cpp",csharp:"cs",cs:"cs",go:"go",rust:"rs",ruby:"rb",php:"php",swift:"swift",kotlin:"kt"};
  function safeName(input,fallback) {
    const raw=String(input||"").replace(/^["']|["']$/g,"").replace(/\\/g,"/");
    if(raw.startsWith("/")||/^[A-Za-z]:/.test(raw))return fallback;
    const segments=raw.split("/");
    if(segments.some(x=>x===".."||x==="."))return fallback;
    const parts=segments.filter(Boolean).slice(0,5).map(x=>x.replace(/[^A-Za-z0-9._-]/g,"_").slice(0,90));
    const result=parts.join("/");
    return result && result.length<180 && !result.startsWith(".") ? result : fallback;
  }
  function filesFromAnswer(answer){
    const text=typeof answer==="string"?answer:"";
    const results=[];
    const rx=/(?:^|\n)[ \t]*\x60{3,}([^\r\n\x60]*)\r?\n([\s\S]*?)\r?\n[ \t]*\x60{3,}[ \t]*(?=\r?\n|$)/g;
    let match;
    while((match=rx.exec(text))&&results.length<20){
      let content=match[2].replace(/\r\n/g,"\n");
      if(!content.trim())continue;
      const info=match[1].trim();
      const lang=(info.split(/\s+/)[0]||"text").toLowerCase();
      const ext=map[lang]||"txt";
      const nameMatch=info.match(/(?:^|\s)(?:filename|file|path)\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s]+))/i);
      let candidate=nameMatch?(nameMatch[1]||nameMatch[2]||nameMatch[3]):"";
      // Some models put filename metadata on the first line of code.
      // Strip it only when it is an unquoted, standalone filename declaration.
      if(!candidate){
        const inline=content.match(/^(?:filename|file|path)\s*[:=]\s*([A-Za-z0-9_./-]+\.[A-Za-z0-9]+)[ \t]*\n/i);
        if(inline){ candidate=inline[1]; content=content.slice(inline[0].length); }
      }
      if(!content.trim())continue;
      const fallback="file-"+(results.length+1)+"."+ext;
      const name=safeName(candidate,fallback);
      const file={name,content:content.endsWith("\n")?content:content+"\n",language:lang};
      const existing=results.findIndex(f=>f.name===name);
      if(existing>=0)results[existing]=file; // Keep the newest revision, avoid duplicate ZIP paths.
      else results.push(file);
    }
    return results;
  }
  function saveBlob(name,blob){
    const url=root.URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download=String(name).split("/").pop().replace(/[^A-Za-z0-9._-]/g,"_");
    a.style.display="none";
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(()=>root.URL.revokeObjectURL(url),1800);
    return true;
  }
  function saveFile(file) {
    return saveBlob(file.name,new Blob([file.content],{type:"text/plain;charset=utf-8"}));
  }
  function crc32(data){
    let c=0xFFFFFFFF;
    for(const b of data){
      c^=b;
      for(let i=0;i<8;i++)c=(c>>>1) ^ ((c&1)?0xEDB88320:0);
    }
    return (c^0xFFFFFFFF)>>>0;
  }
  function zip(files) {
    const encoder=new TextEncoder();
    const parts=[],directory=[];
    let position=0;
    for(const file of files.slice(0,20)){
      const name=safeName(file.name,"file.txt");
      const nameBytes=encoder.encode(name);
      const data=encoder.encode(String(file.content));
      const hash=crc32(data);
      const local=new Uint8Array(30+nameBytes.length);
      const l=new DataView(local.buffer);
      l.setUint32(0,0x04034b50,true);l.setUint16(4,20,true);
      l.setUint16(6,0x0800,true);l.setUint16(8,0,true);
      l.setUint32(14,hash,true);l.setUint32(18,data.length,true);
      l.setUint32(22,data.length,true);l.setUint16(26,nameBytes.length,true);
      local.set(nameBytes,30);
      const central=new Uint8Array(46+nameBytes.length);
      const d=new DataView(central.buffer);
      d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);
      d.setUint16(6,20,true);d.setUint16(8,0x0800,true);
      d.setUint16(10,0,true);d.setUint32(16,hash,true);
      d.setUint32(20,data.length,true);d.setUint32(24,data.length,true);
      d.setUint16(28,nameBytes.length,true);d.setUint32(42,position,true);
      central.set(nameBytes,46);
      parts.push(local,data);directory.push(central);
      position+=local.length+data.length;
    }
    const directorySize=directory.reduce((a,b)=>a+b.length,0);
    const footer=new Uint8Array(22),v=new DataView(footer.buffer);
    v.setUint32(0,0x06054b50,true);
    v.setUint16(8,directory.length,true);v.setUint16(10,directory.length,true);
    v.setUint32(12,directorySize,true);v.setUint32(16,position,true);
    return new Blob([...parts,...directory,footer],{type:"application/zip"});
  }
  function saveZip(files){return files.length>0 && saveBlob("ask-shanx-project.zip",zip(files));}
  function card(answer){
    const files=filesFromAnswer(answer);
    if(!files.length)return null;
    const wrap=document.createElement("section");
    wrap.className="generated-files";
    wrap.setAttribute("aria-label","Files ready to download");
    const heading=document.createElement("strong");
    heading.textContent="Files ready to download";
    wrap.append(heading);
    for(const file of files){
      const link=document.createElement("a");
      link.href="#";
      link.className="generated-file-link";
      link.textContent="⬇ "+file.name;
      link.title="Download "+file.name+" to this device";
      link.addEventListener("click",e=>{e.preventDefault();saveFile(file);});
      wrap.append(link);
    }
    if(files.length>1){
      const bundle=document.createElement("a");
      bundle.href="#";
      bundle.className="generated-file-link generated-zip";
      bundle.textContent="⬇ Download all "+files.length+" files (.zip)";
      bundle.addEventListener("click",e=>{e.preventDefault();saveZip(files);});
      wrap.append(bundle);
    }
    return wrap;
  }
  root.AskShanXFiles=Object.freeze({filesFromAnswer,card,saveFile,zip,saveZip});
})(window);
