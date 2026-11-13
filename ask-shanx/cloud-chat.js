"use strict";
/**
 * ASK SHAN X cloud chat adapter.
 * Puter.js is keyless for app operators; the visitor authenticates
 * and consumes their own free allowance, with optional visitor-paid usage.
 * No MONSTER, Ollama or SXS billing key is used.
 */
(function attach(root) {
  const MODEL = "openai/gpt-5.4-nano";
  const SYSTEM = [
    "You are ASK SHAN X, the general-purpose public AI assistant for ShanX Services.",
    "Built from the ASK AI (Alexander's Information) app and powered by cloud AI, not the owner's personal GPU.",
    "Answer questions across all ordinary subjects clearly, kindly and concisely. You may help with refrigerators but are not a refrigerator-only bot.",
    "Interpret obvious voice transcription errors using context. For example, when a refrigerator is being discussed, 'both sides are WAR' probably means 'both sides are warm'. Ask to confirm if uncertain.",
    "For appliance checks, ask one useful question at a time and prioritize non-invasive safe steps. Do not provide electrical or refrigerant repair instructions.",
    "Never pretend to have live web data, access to X13 systems, private user files or actual appliance measurements.",
    "State uncertainty when appropriate. If users ask about real-world risks or safety, suggest qualified professional help."
  ].join(" ");
  function available() {
    return typeof root.puter?.ai?.chat === "function";
  }
  function cleanText(content) {
    if (typeof content === "string") return content.trim();
    if (Array.isArray(content)) return content.map(x => typeof x?.text === "string" ? x.text : "").join("\n").trim();
    return "";
  }
  async function answer(messages) {
    if (!available()) throw Error("The external AI provider could not load. The guided refrigerator helper is still available.");
    const history = (Array.isArray(messages) ? messages : [])
      .filter(m=>m && (m.role==="assistant"||m.role==="user") && typeof m.content==="string")
      .slice(-16).map(m=>({role:m.role,content:m.content.slice(0,2800)}));
    if(!history.length || history[history.length - 1].role !== "user")throw Error("Enter a question first.");
    // User initiated this action. Provider may show an authentication prompt.
    const response = await root.puter.ai.chat(
      [{role:"system",content:SYSTEM}, ...history],
      {model:MODEL,max_tokens:750,normalize:true}
    );
    const text = cleanText(response?.message?.content);
    if(!text)throw Error("The cloud AI returned an empty answer.");
    return text.slice(0,8000);
  }
  root.AskShanXCloud = Object.freeze({
    available,
    answer,
    model:MODEL,
    mode:"visitor-pays-with-free-allowance",
    noOwnerGpu:true,
    noOwnerApiKey:true
  });
})(globalThis);
