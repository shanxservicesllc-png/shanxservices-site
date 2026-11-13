"use strict";
/* ASK SHANX browser-only downloads, explicitly initiated by user. */
(function(root) {
  const extensions=Object.freeze({
    js:"js",javascript:"js",jsx:"jsx",ts:"ts",typescript:"ts",tsx:"tsx",
    html:"html",css:"css",python:"py",py:"py",json:"json",md:"md",
    markdown:"md",xml:"xml",svg:"svg",sql:"sql",bash:"sh",shell:"sh",
    sh:"sh",powershell:"ps1",ps1:"ps1",java:"java",c:"c",cpp:"cpp",
    "c++":"cpp",cs:"cs",csharp:"cs",go:"go",rust:"rs",rs:"rs",php:"php",
    ruby:"rb",rb:"rb",swift:"swift",kotlin:"kt",kt:"kt",yaml:"yaml",
    yml:"yml",text:"txt",txt:"txt"
  });
  function firstCode(answer) {
    if(typeof answer!=="string")return null;
    const match=answer.match(/(?:^|\n)\s*\x60{3,}([^\n\x60]*)\n([\s\S]*?)\n\s*\x60{3,}(?=\s|$)/);
    if(!match||!match[2]?.trim())return null;
    const tag=(match[1]||"").trim().split(/\s+/)[0].toLowerCase();
    return {content:match[2].trim()+"\n",extension:extensions[tag]||"txt",language:tag||"plain text"};
  }
  function filename(type,extension) {
    const stamp=new Date().toISOString().slice(0,19).replace(/[T:]/g,"-");
    return "ask-shanx-"+type+"-"+stamp+"."+extension;
  }
  function download(name,content,mime="text/plain") {
    if(typeof content!=="string"||!content.length)return false;
    const url=root.URL.createObjectURL(new Blob([content],{type:mime+";charset=utf-8"}));
    const a=document.createElement("a");
    a.href=url;
    a.download=name.replace(/[^a-z0-9._-]/gi,"_");
    a.hidden=true;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(()=>root.URL.revokeObjectURL(url),1200);
    return true;
  }
  function answer(content) {
    return download(filename("answer","txt"),String(content||""));
  }
  function code(content) {
    const found=firstCode(content);
    if(!found)return false;
    return download(filename("code",found.extension),found.content);
  }
  function normalized(messages) {
    return (Array.isArray(messages)?messages:[])
      .filter(m=>m&&(m.role==="user"||m.role==="assistant")&&typeof m.content==="string")
      .map(m=>({role:m.role,content:m.content.slice(0,16000),
        ...(m.mediaKind?{attachment:m.mediaKind==="video"?"Video frame":"Photo"}:{})}));
  }
  function conversation(messages,format="md") {
    const rows=normalized(messages);
    if(!rows.length)return false;
    if(format==="json"){
      return download(filename("conversation","json"),
        JSON.stringify({application:"ASK SHANX",exportedAt:new Date().toISOString(),messages:rows},null,2)+"\n",
        "application/json");
    }
    const lines=["# ASK SHANX Conversation","","Exported from this browser.",""];
    for(const m of rows) {
      lines.push("## "+(m.role==="assistant"?"ASK SHANX":"You"),"");
      if(m.attachment)lines.push("*Attachment: "+m.attachment+" (media file not included)*","");
      lines.push(m.content,"");
    }
    return download(filename("conversation","md"),lines.join("\n"),"text/markdown");
  }
  root.AskShanXExport=Object.freeze({firstCode,answer,code,conversation});
})(window);
