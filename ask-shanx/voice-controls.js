"use strict";
/* ASK SHANX: device-installed Web Speech voices only. No model downloads. */
(function(root) {
  const synth = root.speechSynthesis;
  const supported = !!synth && typeof root.SpeechSynthesisUtterance === "function";
  const dock = document.querySelector("#speech-dock");
  const stopButton = document.querySelector("#stop-speech");
  const pauseButton = document.querySelector("#pause-speech");
  const previewButton = document.querySelector("#voice-preview");
  const previewStopButton = document.querySelector("#voice-stop-preview");
  const picker = document.querySelector("#device-voice-select");
  const status = document.querySelector("#device-voice-status");
  const STORAGE_KEY = "ask-shanx-installed-voice-v1";
  let active = null;
  let installed = [];
  let savedVoice = "";
  try { savedVoice = root.localStorage?.getItem(STORAGE_KEY) || ""; } catch {}

  function showNotice(text) {
    const n = document.querySelector("#notice");
    if (n) { n.hidden = false; n.textContent = text; }
  }
  function showDock(enabled) {
    if (dock) dock.hidden = !enabled;
    if (stopButton) stopButton.hidden = !enabled;
    if (pauseButton) {
      pauseButton.hidden = !enabled;
      pauseButton.textContent = "⏸ Pause";
    }
  }
  function stop() {
    active = null;
    try { if (supported) synth.cancel(); } catch {}
    showDock(false);
  }
  function key(v) {
    return String(v.voiceURI || v.name || "") + "|" + String(v.lang || "");
  }
  function voicesOnDevice() {
    if (!supported) return [];
    try {
      return synth.getVoices().filter(v => v && v.localService === true);
    } catch { return []; }
  }
  function refreshVoices() {
    installed = voicesOnDevice();
    const current = savedVoice || picker?.value;
    if (picker) {
      picker.replaceChildren();
      for (const v of installed) {
        const option = document.createElement("option");
        option.value = key(v);
        option.textContent = (v.name || "Device voice") + " (" + (v.lang || "language unknown") + ")";
        picker.append(option);
      }
      const preferred = installed.find(v => key(v) === current)
        || installed.find(v => /^en([-_]|$)/i.test(v.lang || "") && v.default)
        || installed.find(v => /^en([-_]|$)/i.test(v.lang || ""))
        || installed[0];
      picker.value = preferred ? key(preferred) : "";
      picker.disabled = installed.length === 0;
    }
    if (previewButton) previewButton.disabled = installed.length === 0;
    if (status) status.textContent = installed.length
      ? "Selected: " + (selectedVoice()?.name || "Device voice") + ". " + installed.length + " installed device voice(s), no model download."
      : "No installed voices reported by this browser. Text answers still work.";
  }
  function selectedVoice() {
    const chosen = picker?.value || savedVoice;
    return installed.find(v => key(v) === chosen) || installed[0] || null;
  }
  function read(value) {
    if (!supported) {
      showNotice("Spoken answers are not supported in this browser.");
      return false;
    }
    if (!installed.length) refreshVoices();
    const voice = selectedVoice();
    if (!voice) {
      showNotice("No on-device voice is available. You can still read the answer.");
      return false;
    }
    const text = String(value || "").trim();
    if (!text) return false;
    stop();
    const utterance = new root.SpeechSynthesisUtterance(text.slice(0,3500));
    utterance.voice = voice;
    utterance.lang = voice.lang || "en-US";
    utterance.rate = 1;
    utterance.pitch = 1;
    active = utterance;
    utterance.onend = () => {
      if (active === utterance) { active = null; showDock(false); }
    };
    utterance.onerror = () => {
      if (active === utterance) {
        active = null; showDock(false);
        showNotice("This installed voice could not play. Try another device voice.");
      }
    };
    showDock(true);
    try { synth.speak(utterance); return true; }
    catch {
      active = null; showDock(false);
      showNotice("Spoken playback is unavailable. Text answers still work.");
      return false;
    }
  }
  function pauseResume() {
    if (!supported || !active) return;
    if (synth.paused) {
      synth.resume();
      if (pauseButton) pauseButton.textContent = "⏸ Pause";
    } else if (synth.speaking) {
      synth.pause();
      if (pauseButton) pauseButton.textContent = "▶ Resume";
    }
  }
  picker?.addEventListener("change", () => {
    savedVoice = picker.value;
    try { root.localStorage?.setItem(STORAGE_KEY, savedVoice); } catch {}
    stop();
    if(status) status.textContent="Selected: "+(selectedVoice()?.name||"Device voice");
    // Preview immediately so the owner can hear whether Android honors this voice.
    read("This is your selected ASK SHANX voice.");
  });
  previewButton?.addEventListener("click", () => read("Welcome to Ask ShanX. What can I help you with today?"));
  previewStopButton?.addEventListener("click", stop);
  stopButton?.addEventListener("click", stop);
  pauseButton?.addEventListener("click", pauseResume);
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !document.querySelector("#settings-dialog")?.open) stop();
  });
  root.addEventListener("pagehide", stop);
  if (supported) {
    if (typeof synth.addEventListener === "function") synth.addEventListener("voiceschanged", refreshVoices);
    else synth.onvoiceschanged = refreshVoices;
    root.addEventListener("load", refreshVoices);
  }
  refreshVoices();
  root.AskShanXSpeech = Object.freeze({read, stop, pauseResume, refreshVoices, engine:"installed-device-voice"});
  showDock(false);
})(window);
