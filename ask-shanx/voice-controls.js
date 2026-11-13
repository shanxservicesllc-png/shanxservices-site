"use strict";
/* ASK SHAN X spoken-answer controls */
(function(root) {
  const synth = root.speechSynthesis;
  const supported = !!synth && typeof root.SpeechSynthesisUtterance === "function";
  const dock = document.querySelector("#speech-dock");
  const stopButton = document.querySelector("#stop-speech");
  const pauseButton = document.querySelector("#pause-speech");
  const previewButton = document.querySelector("#voice-preview");
  const previewStopButton = document.querySelector("#voice-stop-preview");
  let activeUtterance = null;

  function visible(on) {
    if(dock) dock.hidden = !on;
    if(stopButton) stopButton.hidden = !on;
    if(pauseButton) {
      pauseButton.hidden = !on;
      pauseButton.textContent = "⏸ Pause";
    }
  }
  function stopSpeech() {
    activeUtterance = null;
    try { if(supported) synth.cancel(); } catch {}
    visible(false);
  }
  function preferVoice() {
    if(!supported) return null;
    const list = synth.getVoices().filter(v=>/^en([-_]|$)/i.test(v.lang||""));
    const names = /\b(andrew|david|daniel|mark|guy|matthew|aaron|brian|james|george|arthur|alex|male)\b/i;
    return list.find(v=>names.test(v.name||"")&&/natural|enhanced|neural/i.test(v.name||""))
        || list.find(v=>names.test(v.name||""))
        || list.find(v=>v.default)
        || list[0] || null;
  }
  function read(value) {
    if(!supported) {
      const note=document.querySelector("#notice");
      if(note) {note.hidden=false;note.textContent="Spoken playback is unavailable in this browser.";}
      return false;
    }
    const text=String(value||"").trim();
    if(!text) return false;
    stopSpeech();
    const speech = new root.SpeechSynthesisUtterance(text.slice(0,3500));
    const voice = preferVoice();
    if(voice) {speech.voice=voice;speech.lang=voice.lang||"en-US";}
    else speech.lang="en-US";
    speech.rate=.97;
    speech.pitch=.9;
    activeUtterance=speech;
    speech.onend=()=>{if(activeUtterance===speech){activeUtterance=null;visible(false)}};
    speech.onerror=()=>{if(activeUtterance===speech){activeUtterance=null;visible(false)}};
    visible(true);
    try {synth.speak(speech);return true}
    catch {activeUtterance=null;visible(false);return false}
  }
  function pauseResume() {
    if(!supported||!activeUtterance) return;
    if(synth.paused) {
      synth.resume();
      if(pauseButton)pauseButton.textContent="⏸ Pause";
    } else if(synth.speaking) {
      synth.pause();
      if(pauseButton)pauseButton.textContent="▶ Resume";
    }
  }
  previewButton?.addEventListener("click",()=>read("Welcome to Ask Shan X. What can I help you with today?"));
  previewStopButton?.addEventListener("click",stopSpeech);
  pauseButton?.addEventListener("click",pauseResume);
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"&&!document.querySelector("#settings-dialog")?.open)stopSpeech();
  });
  root.addEventListener("pagehide",stopSpeech);
  if(previewButton&&!supported)previewButton.disabled=true;
  root.AskShanXSpeech=Object.freeze({read,stop:stopSpeech,pauseResume});
  visible(false);
})(window);
