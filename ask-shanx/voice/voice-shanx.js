let d = null, u = /* @__PURE__ */ new Map(), b = /* @__PURE__ */ new Set(), x = /* @__PURE__ */ new Set(), v = !1;
function j() {
  return d || (v && (v = !1, x.forEach((e) => e())), d = new Worker(new URL("./tts-worker.js", import.meta.url), { type: "module" }), d.addEventListener("message", (e) => {
    const { type: t, data: r } = e.data;
    if (t === "load:progress") {
      b.forEach((o) => o(r));
      return;
    }
    if (t === "error") {
      u.forEach((o) => {
        o.reject(new Error(r.message));
      }), u.clear();
      return;
    }
    const n = u.get(t);
    n && (n.resolve(r), u.delete(t));
  }), d.addEventListener("error", (e) => {
    const t = e.message || "Worker crashed";
    u.forEach((r) => {
      r.reject(new Error(t));
    }), u.clear();
  })), d;
}
function E(e, t, r = []) {
  const n = `${e}:complete`;
  return new Promise((o, a) => {
    u.set(n, { resolve: o, reject: a }), j().postMessage({ type: e, data: t }, r);
  });
}
const m = {
  get isModelLoaded() {
    return v;
  },
  checkWebGPU() {
    return E("check_webgpu");
  },
  async load(e = {}) {
    const t = await E("load", e);
    return v = !0, t;
  },
  encodeSpeaker(e, t) {
    const r = t instanceof Float32Array ? t.buffer : t;
    return E("encode_speaker", {
      id: e,
      audioData: r
    });
  },
  generate(e, t, r = 0.5) {
    return E("generate", { text: e, speakerId: t, exaggeration: r });
  },
  onProgress(e) {
    return b.add(e), () => b.delete(e);
  },
  onReset(e) {
    return x.add(e), () => x.delete(e);
  },
  terminate() {
    d && (d.terminate(), d = null, v = !1, u.forEach((e) => e.reject(new Error("Speech stopped"))), u.clear(), b.clear());
  }
}, C = 24e3, R = "shanx-public-narration", q = new URL("./shanx-reference.wav", import.meta.url), P = document.querySelector("#speech-dock"), M = P?.querySelector(".speech-now"), c = document.querySelector("#pause-speech"), L = document.querySelector("#stop-speech"), F = document.querySelector("#voice-preview"), I = document.querySelector("#voice-stop-preview");
let i = null, f = null, h = null, B = !1, p = !1, s = 0, S = !1, X = !1, A = !1;
function g(e) {
  M && (M.textContent = e);
}
function w(e) {
  P && (P.hidden = !e), L && (L.hidden = !e), c && (c.hidden = !e, c.disabled = !f, c.textContent = "⏸ Pause");
}
function O(e) {
  const t = document.querySelector("#notice");
  t && (t.hidden = !1, t.textContent = e, t.classList.add("info"));
}
function U() {
  try {
    f?.stop();
  } catch {
  }
  try {
    f?.disconnect();
  } catch {
  }
  f = null, A = !1, i?.state === "suspended" && i.resume().catch(() => {
  });
}
function y() {
  s++, U(), (h || S) && (m.terminate(), B = !1, h = null), S = !1, p = !1, w(!1);
}
async function T(e) {
  const t = Math.ceil(e.duration * C), r = new OfflineAudioContext(1, t, C), n = r.createBuffer(1, e.length, e.sampleRate);
  n.copyToChannel(e.getChannelData(0), 0);
  const o = r.createBufferSource();
  return o.buffer = n, o.connect(r.destination), o.start(), (await r.startRendering()).getChannelData(0).slice();
}
async function _(e) {
  if (!B) {
    if (h) return h;
    h = (async () => {
      if (g("Checking your voice player…"), !(await m.checkWebGPU()).available) throw Error("This device doesn't support the ShanX voice player yet.");
      g("Preparing ShanX voice…");
      const r = m.onProgress((n) => {
        if (s === e && n.status === "progress" && n.total && n.loaded) {
          const o = Math.min(99, Math.round(100 * n.loaded / n.total));
          g("Preparing ShanX voice… " + o + "%");
        }
      });
      try {
        if (await m.load({ device: "webgpu" }), e !== s) throw Error("Stopped");
        g("Tuning ShanX voice…");
        const n = await fetch(q, { cache: "force-cache" });
        if (!n.ok) throw Error("Voice reference could not load.");
        const o = await n.arrayBuffer(), a = new (window.AudioContext || window.webkitAudioContext)();
        let l;
        try {
          l = await a.decodeAudioData(o);
        } finally {
          await a.close();
        }
        const k = await T(l);
        if (e !== s || (await m.encodeSpeaker(R, k), e !== s)) throw Error("Stopped");
        B = !0;
      } finally {
        r();
      }
    })();
    try {
      await h;
    } finally {
      h = null;
    }
  }
}
function D(e) {
  const t = String(e || "").replace(/[*#_`]/g, "").replace(/https?:\/\/\S+/g, "website link").replace(/\s+/g, " ").trim();
  if (!t) return [];
  const r = t.slice(0, 1600), n = [];
  let o = r;
  for (; o.length; ) {
    if (o.length <= 130) {
      n.push(o);
      break;
    }
    const a = o.slice(0, 130);
    let l = Math.max(a.lastIndexOf(". "), a.lastIndexOf("? "), a.lastIndexOf("! "));
    l < 45 && (l = a.lastIndexOf(" ")), l < 25 && (l = 130);
    const k = Math.min(o.length, l + 1);
    n.push(o.slice(0, k).trim()), o = o.slice(k).trim();
  }
  return n.filter(Boolean);
}
function V(e, t) {
  return new Promise((r, n) => {
    if (t !== s) {
      r();
      return;
    }
    const o = i.createBuffer(1, e.length, C);
    o.copyToChannel(e, 0);
    const a = i.createBufferSource();
    a.buffer = o, a.connect(i.destination), f = a, c && (c.disabled = !1), a.onended = () => {
      f === a && (f = null, c && (c.disabled = !0));
      try {
        a.disconnect();
      } catch {
      }
      r();
    };
    try {
      a.start(0);
    } catch (l) {
      n(l);
    }
  });
}
async function K(e) {
  const t = D(e);
  if (!t.length) return !1;
  if (!X) {
    if (typeof window.confirm == "function" && !window.confirm("To hear ShanX's actual voice, this device needs a one-time large voice download. Wi-Fi is recommended. Continue?")) return !1;
    X = !0;
  }
  y();
  const r = s;
  p = !0, w(!0), g("Preparing ShanX voice…");
  try {
    if (!i) {
      const n = window.AudioContext || window.webkitAudioContext;
      if (!n) throw Error("Audio playback is unavailable on this device.");
      i = new n();
    }
    await i.resume(), await _(r);
    for (let n = 0; n < t.length && r === s; n++) {
      g("ASK SHAN X speaking" + (t.length > 1 ? " · " + (n + 1) + "/" + t.length : "")), S = !0;
      const o = await m.generate(t[n], R, 0.45);
      if (S = !1, r !== s) break;
      const a = new Float32Array(o.waveform);
      if (!a.length) throw Error("Voice generation returned no audio.");
      await i.resume(), await V(a, r);
    }
    return r === s && (p = !1, w(!1)), !0;
  } catch (n) {
    return r === s && (p = !1, w(!1), O("ShanX voice couldn't play on this device. " + (n.message || "Please try again."))), !1;
  } finally {
    S = !1;
  }
}
function W() {
  !p || !f || !i || (A ? (i.resume().catch(() => {
  }), A = !1, c && (c.textContent = "⏸ Pause")) : (i.suspend().catch(() => {
  }), A = !0, c && (c.textContent = "▶ Resume")));
}
L?.addEventListener("click", y);
c?.addEventListener("click", W);
async function G() {
  y();
  const e = s;
  p = !0, w(!0), g("ASK SHAN X speaking");
  try {
    if (!i) {
      const o = window.AudioContext || window.webkitAudioContext;
      if (!o) throw Error("Audio playback is unavailable.");
      i = new o();
    }
    await i.resume();
    const t = await fetch(q);
    if (!t.ok) throw Error("Voice preview unavailable.");
    const r = await i.decodeAudioData(await t.arrayBuffer()), n = await T(r);
    e === s && await V(n, e), e === s && (p = !1, w(!1));
  } catch {
    e === s && (p = !1, w(!1), O("Voice preview couldn't play. Please try again."));
  }
}
F?.addEventListener("click", () => {
  G();
});
I?.addEventListener("click", y);
window.addEventListener("pagehide", y);
window.AskShanXSpeech = Object.freeze({ read: K, stop: y, pauseResume: W, engine: "Chatterbox", usingOwnerVoice: !0 });
w(!1);
