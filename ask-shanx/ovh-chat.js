"use strict";
/* ASK SHAN X: public anonymous hosted language model, not MONSTER/Ollama. */
(function attach(root) {
  const MODEL = "Meta-Llama-3_3-70B-Instruct";
  const VISION_MODEL = "Mistral-Small-3.2-24B-Instruct-2506";
  const URL = "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions";
  const SYSTEM = [
    "You are ASK SHAN X, the general-purpose AI assistant for ShanX Services.",
    "Help with a wide range of questions. Give the useful plain-English answer first.",
    "Distinguish uncertainty from known facts. Never invent sources, citations, or verification.",
    "Use conversational context when useful, and follow topic changes without bringing up previous subjects unnecessarily.",
    "Interpret common speech recognition or typing errors from context, and briefly clarify ambiguous details.",
    "For safety-sensitive matters, give cautious, non-invasive guidance and encourage appropriate professional help.",
    "Do not claim live browsing, personal account access, private files or physical observations you cannot perform."
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
  async function visionAnswer(messages,dataUrl,mediaKind="image") {
    if (!available()) throw Error("You're offline. The visual AI needs an internet connection.");
    if (typeof dataUrl !== "string" || dataUrl.length > 4 * 1024 * 1024
        || !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(dataUrl)) {
      throw Error("The selected picture is not ready for visual analysis.");
    }
    const history=(Array.isArray(messages)?messages:[])
      .filter(m=>m && (m.role==="user" || m.role==="assistant") && typeof m.content==="string")
      .slice(-10)
      .map(m=>({role:m.role,content:m.content.slice(0,2300)}));
    if (!history.length || history.at(-1).role!=="user") throw Error("Enter a question for this attachment.");
    const last=history.at(-1);
    const statement = mediaKind==="video"
      ? "You are given ONE still frame extracted locally from an attached video, not the whole video. Do not claim to analyze motion, sound, or unseen frames. "
      : "You are given a photo supplied by the user. ";
    last.content=[
      {type:"text",text:statement + last.content},
      {type:"image_url",image_url:{url:dataUrl}}
    ];
    const body={model:VISION_MODEL,messages:[
      {role:"system",content:"You are ASK SHANX, a helpful visual assistant. Describe only what the provided image actually supports. Say when uncertain. Avoid inventing details, locations or identities."},
      ...history],max_tokens:500,temperature:0.3,stream:false};
    let res;
    try {res=await root.fetch(URL,{
      method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body),
      signal:root.AbortSignal?.timeout?.(35000)
    });}catch{throw Error("Visual AI could not be reached. Your photo or video is still attached locally; retry when connected.");}
    if(res.status===429)throw Error("Visual AI rate limit reached. Please try again shortly.");
    if(!res.ok)throw Error("Visual AI returned HTTP "+res.status+". Your attachment was not analyzed.");
    let parsed;
    try{parsed=await res.json();}catch{throw Error("Visual AI returned an unreadable response.");}
    const text=extract(parsed);
    if(!text)throw Error("Visual AI returned no visible answer. Your attachment can be retried.");
    return text.slice(0,8000);
  }
  root.AskShanXCloud=Object.freeze({
    provider:"OVHcloud AI Endpoints",
    model:MODEL,
    available,
    answer,
    visionAnswer,
    visionModel:VISION_MODEL,
    mode:"anonymous-free-cloud",
    noOwnerGpu:true,
    noOwnerApiKey:true
  });
})(globalThis);
