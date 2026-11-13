"use strict";
/* Browser speech controls only: no recordings uploaded or voice cloning. */
(function setupVoice(root) {
  const synth = root.speechSynthesis;
  const dock = document.querySelector("#speech-dock");
  const stop = document.querySelector("#stop-speech");
  const pause = document.querySelector("#pause-speech");
  const picker = document.querySelector("#voice-choice");
  const preview = document.querySelector("#voice-preview");
  const previewStop = document.querySelector("#voice-stop-preview");
  const help = document.querySelector("#voice-help");
  const KEY = "ask-shanx-spoken-voice-v1";
  let selected = "";
  let session = 0;
  try { selected = localStorage.getItem(KEY) || ""; } catch {}
  const supported = !!synth && typeof root.SpeechSynthesisUtterance === "function";

  function englishVoices() {
    if (!supported) return [];
    return synth.getVoices().filter(v => /^en([-_]|$)/i.test(v.lang||""));
  }
  function rank(v) {
    const name=v.name||"";
    let score = /^en[-_]us/i.test(v.lang) ? 15 : 0;
    if (/natural|neural|premium|enhanced/i.test(name)) score+=15;
    const maleNames=/andrew|guy|david|mark|daniel|alex|aaron|matthew|michael|james|brian|ryan|john|george|arthur|oliver|henry|thomas|tom|male/i;
    if (maleNames.test(name.toLowerCase())) score+=70;
    if (/robot|compact/i.test(name)) score-=12;
    return score;
  }
  const keyOf = v => v.voiceURI || v.name+" / "+v.lang;
  function bestVoice() {
    const voices=englishVoices();
    const chosen=selected && voices.find(v=>keyOf(v)===selected);
    if (chosen) return chosen;
    return voices.sort((a,b)=>rank(b)-rank(a))[0] || null;
  }
  function populate() {
    if (!picker) return;
    const voices=englishVoices().sort((a,b)=>rank(b)-rank(a)||a.name.localeCompare(b.name));
    const current=selected;
    picker.replaceChildren();
    const auto=document.createElement("option");
    auto.value=""; auto.textContent="Auto: prefer natural male-sounding voice";
    picker.append(auto);
    for (const voice of voices) {
      const option=document.createElement("option");
      option.value=keyOf(voice);
      option.textContent=voice.name+" ("+voice.lang+")";
      picker.append(option);
    }
    picker.value=voices.some(v=>keyOf(v)===current) ? current : "";
    if(help) help.textContent=voices.length
      ? "Voice names and quality depend on your phone or browser. Select one and tap Preview. Auto prefers male-named natural voices when available."
      : "No English voices reported yet. The browser default may still work; try Preview or check your device speech settings.";
  }
  function show(active) {
    if (dock) dock.hidden=!active;
    if (stop) stop.hidden=!active;
    if (pause) {pause.hidden=!active;pause.textContent="⏸ Pause";}
  }
  function stopSpeech() {
    session++;
    if (supported) {
      try{synth.cancel()}catch{}
    }
    show(false);
  }
  function read(text) {
    if (!supported) {
      const notice=document.querySelector("#notice");
      if(notice){notice.hidden=false;notice.textContent="This browser does not support spoken answers.";}
      return false;
    }
    if (!text || !String(text).trim()) return false;
    stopSpeech();
    const runId=++session;
    const u = new root.SpeechSynthesisUtterance(String(text).slice(0,3500));
    u.lang="en-US";
    const voice=bestVoice();
    if(voice){u.voice=voice;u.lang=voice.lang||"en-US";}
    u.rate=.96;
    u.pitch=.94;
    u.onend=()=>{if(runId===session)show(false)};
    u.onerror=()=>{if(runId===session)show(false)};
    show(true);
    try {synth.speak(u);return true}
    catch {show(false);return false}
  }
  function pauseResume() {
    if(!supported) return;
    if(synth.paused) {
      synth.resume();
      if(pause)pause.textContent="⏸ Pause";
    } else if(synth.speaking) {
      synth.pause();
      if(pause)pause.textContent="▶ Resume";
    }
  }
  picker?.addEventListener("change",()=>{
    selected=picker.value||"";
    try{localStorage.setItem(KEY,selected)}catch{}
    stopSpeech();
  });
  preview?.addEventListener("click",()=>read("Hey, I'm ASK SHAN X. Ask me anything. Let's figure it out together."));
  previewStop?.addEventListener("click",stopSpeech);
  pause?.addEventListener("click",pauseResume);
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape" && !document.querySelector("#settings-dialog")?.open)stopSpeech();
  });
  root.addEventListener("pagehide",stopSpeech);
  if(supported) {
    populate();
    synth.addEventListener?.("voiceschanged",populate);
  } else {
    if(picker)picker.disabled=true;
    if(preview)preview.disabled=true;
    if(help)help.textContent="Speech is unavailable in this browser.";
  }
  root.AskShanXSpeech=Object.freeze({read,stop:stopSpeech,pauseResume,voices:englishVoices});
  show(false);
})(window);
