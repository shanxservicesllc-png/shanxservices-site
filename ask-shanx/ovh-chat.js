"use strict";
/* ASK SHAN X: public anonymous hosted language model, not MONSTER/Ollama. */
(function attach(root) {
  const MODEL = "Meta-Llama-3_3-70B-Instruct";
  const URL = "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions";
  const SYSTEM = [
    "You are ASK SHAN X, the general-purpose public AI assistant for ShanX Services.",
    "Answer helpful questions about any ordinary subject clearly and concisely. You are not a refrigerator-only assistant.",
    "For unclear speech or spelling, use conversation context. For example, after discussing a refrigerator, 'both sides are WAR' could mean 'both sides are warm'; confirm if uncertain.",
    "For appliances, give safe non-invasive checks, never electrical or refrigerant repair instructions. Ask one useful question at a time when diagnosing.",
    "Never pretend to have real-time web search, user files, tools, X13 system access, or measured appliance data.",
    "Be accurate, transparent about uncertainty, respectful and practical."
  ].join(" ");
  const available = () => typeof root.fetch === "function" && root.navigator?.onLine !== false;
  function extract(json) {
    const answer = json?.choices?.[0]?.message?.content;
    if(typeof answer === "string") return answer.trim();
    if(Array.isArray(answer)) return answer.map(x=>x?.text||"").join("\n").trim();
    return "";
  }
  async function answer(messages) {
    if(!available()) throw Error("You're offline. The hosted AI needs an internet connection.");
    const history=(Array.isArray(messages)?messages:[])
      .filter(m=>m && (m.role==="user"||m.role==="assistant") && typeof m.content==="string")
      .slice(-16)
      .map(m=>({role:m.role,content:m.content.slice(0,2800)}));
    if(!history.length || history[history.length-1].role!=="user")throw Error("Enter your question first.");
    const body={model:MODEL,messages:[{role:"system",content:SYSTEM},...history],max_tokens:650,temperature:0.35,stream:false};
    let res;
    try{
      res=await root.fetch(URL,{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify(body),
        signal:root.AbortSignal?.timeout?.(28000)
      });
    }catch{
      throw Error("Free cloud AI could not be reached. Check your connection and try again.");
    }
    if(res.status===429)throw Error("Free cloud AI limit reached: about 2 requests per minute per IP. Please try again shortly.");
    if(!res.ok)throw Error("Free cloud AI returned HTTP "+res.status+". Please try again later.");
    let data;
    try{data=await res.json()}catch{throw Error("Free cloud AI returned an unreadable response.");}
    const reply=extract(data);
    if(!reply)throw Error("Free cloud AI did not return an answer.");
    return reply.slice(0,8000);
  }
  root.AskShanXCloud=Object.freeze({
    provider:"OVHcloud AI Endpoints",
    model:MODEL,
    available,
    answer,
    mode:"anonymous-free-cloud",
    noOwnerGpu:true,
    noOwnerApiKey:true
  });
})(globalThis);
