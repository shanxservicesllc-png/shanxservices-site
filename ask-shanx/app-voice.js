"use strict";
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const STORAGE = "ask-shanx-v1-conversation";
const cloudReady = () => globalThis.AskShanXCloud?.available() === true;
const MODE = "ask-shanx-v1-mode";
const app = $("#app");
const convo = $("#conversation");
const welcome = $("#welcome");
const scroll = $("#chat-scroll");
const input = $("#question");
const send = $("#send");
const notice = $("#notice");
const mic = $("#mic");
const stopSpeech = $("#stop-speech");
const dialog = $("#settings-dialog");
let messages = [];
let busy = false;
let listening = false;
let speechRecognition = null;
let installPrompt = null;
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE) || "[]");
  if (Array.isArray(saved)) messages = saved.filter(m => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.length <= 6000).slice(-70);
} catch {}
function save() {
  try { localStorage.setItem(STORAGE, JSON.stringify(messages.slice(-70))); } catch {}
}
function notify(message, type="error") {
  notice.hidden = !message;
  notice.textContent = message || "";
  notice.style.background = type === "info" ? "#193328" : "#40261f";
  notice.style.borderColor = type === "info" ? "#406e4e" : "#9a5f4b";
}
function setMode(mode) {
  if (!["go","home","mini"].includes(mode)) mode = "go";
  app.dataset.mode = mode;
  $$("[data-switch]").forEach(b => {
    const active = b.dataset.switch === mode;
    b.classList.toggle("active",active);
    b.setAttribute("aria-pressed", String(active));
  });
  try { localStorage.setItem(MODE, mode); } catch {}
}
function render() {
  $$(".message-row").forEach(e => e.remove());
  welcome.hidden = messages.length > 0;
  messages.forEach((m,idx) => {
    const row = document.createElement("article");
    row.className = "message-row " + m.role;
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = m.content;
    if (m.role === "assistant") {
      const avatar = document.createElement("div");
      avatar.className = "avatar"; avatar.textContent = "A";
      avatar.setAttribute("aria-label","ASK SHAN X");
      row.append(avatar);
    }
    const wrap = document.createElement("div");
    wrap.style.maxWidth = "100%";
    wrap.append(bubble);
    if (m.role === "assistant") {
      const actions = document.createElement("div");
      actions.className = "message-actions";
      const speak = document.createElement("button");
      speak.type="button"; speak.textContent="◖)) Read aloud";
      speak.setAttribute("aria-label", "Read answer aloud");
      speak.addEventListener("click",()=>speakText(m.content));
      const copy = document.createElement("button");
      copy.type="button"; copy.textContent="Copy";
      copy.addEventListener("click", async () => {
        try {await navigator.clipboard.writeText(m.content); copy.textContent="Copied";} catch {notify("Could not copy this answer.");}
      });
      actions.append(speak,copy);wrap.append(actions);
    }
    row.append(wrap);
    convo.append(row);
  });
  scroll.scrollTop=scroll.scrollHeight;
}
function setBusy(v) {
  busy=v;
  send.disabled = v || !cloudReady() || !input.value.trim();
  send.querySelector("span").textContent = v ? "Thinking…" : "Ask Shan X";
  input.disabled=v;
}
function updateSend() {send.disabled = busy || !cloudReady() || !input.value.trim();}
function resizeInput() {
  input.style.height = "auto";
  input.style.height = Math.min(135,input.scrollHeight)+"px";
}
function checkStatus() {
  const ready=cloudReady();
  $("#status-text").textContent=ready?"Ready to help":"Connection unavailable";
  $("#status-detail").textContent=ready?"Ask whatever is on your mind.":"Check your connection and try again.";
  $("#footer-context").textContent="ASK SHAN X";
  $("#header-status").textContent="";
  const indicator=document.createElement("span");
  indicator.className="status-dot "+(ready?"online":"offline");
  $("#header-status").append(indicator,document.createTextNode(ready?"Ready":"Offline"));
  $("#status-dot").className=indicator.className;
  if(ready&&!busy)notify("");
  updateSend();
}
async function ask(retry=false) {
  if(!cloudReady()||busy)return;
  const q=input.value.trim();
  if(!retry && !q)return;
  notify("");
  if(!retry) {
    messages.push({role:"user",content:q});
    input.value="";
    resizeInput();
    save();render();
  }
  setBusy(true);
  const pending = document.createElement("article");
  pending.className="message-row";
  const avatar=document.createElement("div");avatar.className="avatar";avatar.textContent="A";
  const bubble=document.createElement("div");bubble.className="bubble pending";bubble.textContent="Thinking…";
  pending.append(avatar,bubble);
  convo.append(pending);scroll.scrollTop=scroll.scrollHeight;
  try {
    let answer;
    answer=await globalThis.AskShanXCloud.answer(messages.slice(-16));
    messages.push({role:"assistant",content:answer});
    save();render();
  } catch(e) {
    notify("Answer unavailable: "+(e?.message||"Unknown error")+". Your question remains in this conversation.");
    const retryButton=document.createElement("button");
    retryButton.type="button";retryButton.className="secondary-btn";retryButton.textContent="Retry last question";
    retryButton.style.margin="12px 0";
    retryButton.addEventListener("click",()=>{ retryButton.remove();ask(true); });
    convo.append(retryButton);
  } finally {
    pending.remove();
    setBusy(false);
    input.focus({preventScroll:true});
    scroll.scrollTop=scroll.scrollHeight;
  }
}
function speakText(s) {
  if (window.AskShanXSpeech?.read) return window.AskShanXSpeech.read(s);
  notify("Speech settings are loading. Please try again.", "info");
}
function startListening() {
  window.AskShanXSpeech?.stop();
  const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Speech)return notify("Voice dictation isn't available in this browser. Type your question instead.");
  if(listening && speechRecognition) {speechRecognition.stop();return;}
  speechRecognition=new Speech();
  speechRecognition.lang=navigator.language||"en-US";
  speechRecognition.interimResults=false;
  speechRecognition.continuous=false;
  speechRecognition.onstart=()=>{listening=true;mic.classList.add("listening");mic.textContent="● Listening";notify("Listening. Speech is processed by your browser's speech service.","info")};
  speechRecognition.onresult=(e)=>{
    const words=Array.from(e.results).map(x=>x[0]?.transcript||"").join(" ").trim();
    if(words){input.value = (input.value.trim()+" "+words).trim();resizeInput();updateSend();input.focus();}
  };
  speechRecognition.onerror=(e)=>notify("Voice input: "+String(e.error||"unavailable")+". You can type your question.");
  speechRecognition.onend=()=>{listening=false;mic.classList.remove("listening");mic.innerHTML="🎙 <span>Voice</span>";if(cloudReady())notify("")};
  try{speechRecognition.start()}catch{notify("Unable to start voice input in this browser.")}
}
$$("[data-switch]").forEach(btn=>btn.addEventListener("click",()=>setMode(btn.dataset.switch)));
$("#question-form").addEventListener("submit",(e)=>{e.preventDefault();ask()});
input.addEventListener("input",()=>{resizeInput();updateSend()});
input.addEventListener("keydown",(e)=>{
  if(e.key==="Enter" && !e.shiftKey && !e.isComposing){e.preventDefault();ask();}
});
mic.addEventListener("click",startListening);
stopSpeech.addEventListener("click",()=>window.AskShanXSpeech?.stop());
$("#new-chat").addEventListener("click",()=>{
  window.AskShanXSpeech?.stop();
  if(messages.length && !confirm("Start a new conversation? This removes the current local conversation."))return;
  messages=[];save();render();notify("");input.focus();
});
$("#settings-button").addEventListener("click",()=>dialog.showModal());
$("#mobile-settings").addEventListener("click",()=>dialog.showModal());
$("#close-settings").addEventListener("click",()=>dialog.close());
$("#clear-history").addEventListener("click",()=>{
  if(messages.length && !confirm("Clear saved chat history on this device?"))return;
  messages=[];save();render();dialog.close();notify("History cleared on this device.","info");
});
window.addEventListener("beforeinstallprompt", e=>{e.preventDefault();installPrompt=e;});
$("#install-button").addEventListener("click",async()=>{
  if(installPrompt){installPrompt.prompt();try{await installPrompt.userChoice}catch{}installPrompt=null;return;}
  notify("For Android Chrome, open browser menu → Add to Home screen. For iPhone Safari, tap Share → Add to Home Screen.","info");
  dialog.close();
});
window.addEventListener("online",checkStatus);
window.addEventListener("focus",checkStatus);
window.addEventListener("offline",()=>{updateSend();notify("You are offline. Your conversations are saved.","info")});
try {setMode(localStorage.getItem(MODE)|| (window.innerWidth>=960?"home":"go"))}catch{setMode("go")}
render();resizeInput();checkStatus();
if("serviceWorker" in navigator && location.protocol!=="file:"){
  window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
}
