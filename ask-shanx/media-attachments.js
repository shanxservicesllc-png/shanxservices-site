"use strict";
/* ASK SHANX media attachment: local preview; explicit cloud transfer only on Send. */
(function(root) {
  const input = document.querySelector("#media-input");
  const takePhoto = document.querySelector("#take-photo-input");
  const choosePhoto = document.querySelector("#choose-photo-input");
  const recordVideo = document.querySelector("#record-video-input");
  const menu = document.querySelector("#attachment-menu");
  const inputs = [input,takePhoto,choosePhoto,recordVideo];
  function resetInputs(){for(const field of inputs)if(field)field.value="";}
  function closeMenu(){
    if(menu)menu.hidden=true;
    add?.setAttribute?.("aria-expanded","false");
  }
  function toggleMenu(){
    if(!menu){input?.click();return;}
    menu.hidden=!menu.hidden;
    add?.setAttribute?.("aria-expanded",String(!menu.hidden));
  }
  const add = document.querySelector("#add-media");
  const remove = document.querySelector("#remove-media");
  const tray = document.querySelector("#attachment-tray");
  const preview = document.querySelector("#attachment-preview");
  const info = document.querySelector("#attachment-info");
  let selected = null;
  const limits = {image: 15 * 1024 * 1024, video: 80 * 1024 * 1024};

  function changed() {
    root.dispatchEvent(new Event("ask-shanx-media-change"));
  }
  function clear() {
    if (selected) root.URL.revokeObjectURL(selected.url);
    selected = null;
    resetInputs();
    preview.replaceChildren();
    tray.hidden = true;
    changed();
  }
  function pick(file) {
    if (!file) return;
    const kind = file.type.startsWith("image/") ? "image"
      : file.type.startsWith("video/") ? "video" : "";
    if (!kind || file.size > limits[kind] || !file.size) {
      info.textContent = !kind ? "Choose an image or video."
        : "File is too large or empty. Photos: 15 MB; videos: 80 MB.";
      tray.hidden = false;
      preview.replaceChildren();
      if (selected) root.URL.revokeObjectURL(selected.url);
      selected = null;
      resetInputs();
      changed();
      return;
    }
    if (selected) root.URL.revokeObjectURL(selected.url);
    selected = {file, kind, url: root.URL.createObjectURL(file)};
    preview.replaceChildren();
    const view = document.createElement(kind === "image" ? "img" : "video");
    view.src = selected.url;
    if (kind === "image") view.alt = "Attached photo preview";
    else { view.controls = true; view.muted = true; view.preload = "metadata"; }
    preview.append(view);
    info.textContent = kind === "image"
      ? "Photo ready. Press Ask ShanX to send it for visual analysis."
      : "Video ready. Press Ask ShanX to analyze one still frame, not the whole video.";
    tray.hidden = false;
    changed();
  }
  function waitFor(element, name, timeoutMs=15000) {
    return new Promise((resolve,reject)=>{
      const timeout = setTimeout(()=>done(new Error("The selected media could not be decoded in time.")),timeoutMs);
      const onOk=()=>done();
      const onBad=()=>done(new Error("This media format cannot be read by the browser."));
      function done(error) {
        clearTimeout(timeout);
        element.removeEventListener(name,onOk);
        element.removeEventListener("error",onBad);
        if(error) reject(error); else resolve();
      }
      element.addEventListener(name,onOk,{once:true});
      element.addEventListener("error",onBad,{once:true});
    });
  }
  async function prepare() {
    const item=selected;
    if (!item) throw Error("Attach a photo or video first.");
    let media,cleanup=()=>{};
    try {
      if (item.kind === "image") {
        media = new Image();
        const ready = waitFor(media,"load");
        media.src=item.url;
        await ready;
      } else {
        media=document.createElement("video");
        media.muted=true;
        media.playsInline=true;
        media.preload="auto";
        let ready=waitFor(media,"loadedmetadata");
        media.src=item.url;
        media.load();
        await ready;
        if (!media.videoWidth || !media.videoHeight) throw Error("This video cannot be decoded.");
        const target=Number.isFinite(media.duration) && media.duration>0
          ? Math.min(1,media.duration/3):0;
        if(target>0.01) {
          ready=waitFor(media,"seeked");
          media.currentTime=target;
          await ready;
        } else if(media.readyState<2) await waitFor(media,"loadeddata");
        media.pause();
        cleanup=()=>{media.removeAttribute("src");media.load();};
      }
      const width=item.kind==="image"?media.naturalWidth:media.videoWidth;
      const height=item.kind==="image"?media.naturalHeight:media.videoHeight;
      if(!(width>0&&height>0)) throw Error("The browser could not read this image or video frame.");
      const scale=Math.min(1,1024/Math.max(width,height));
      const canvas=document.createElement("canvas");
      canvas.width=Math.max(1,Math.round(width*scale));
      canvas.height=Math.max(1,Math.round(height*scale));
      const context=canvas.getContext("2d");
      if(!context) throw Error("This browser cannot prepare the selected media.");
      context.drawImage(media,0,0,canvas.width,canvas.height);
      const dataUrl=canvas.toDataURL("image/jpeg",.76);
      if(dataUrl.length>4*1024*1024) throw Error("Image still too large for visual analysis.");
      if(selected!==item) throw Error("Attachment changed while preparing; send again.");
      // Small, persistent visual receipt in local chat history; never store the full attachment.
      const thumb=document.createElement("canvas");
      const factor=Math.min(1,280/Math.max(canvas.width,canvas.height));
      thumb.width=Math.max(1,Math.round(canvas.width*factor));
      thumb.height=Math.max(1,Math.round(canvas.height*factor));
      const thumbCtx=thumb.getContext("2d");
      if(!thumbCtx) throw Error("Could not prepare local chat thumbnail.");
      thumbCtx.drawImage(canvas,0,0,thumb.width,thumb.height);
      const localThumbnail=thumb.toDataURL("image/jpeg",.58);
      const thumbnail=localThumbnail.length<=160000?localThumbnail:null;
      return {dataUrl,thumbnail,kind:item.kind,frameOnly:item.kind==="video"};
    } finally {
      cleanup();
    }
  }
  add?.addEventListener("click",toggleMenu);
  for(const [selector,field] of [
    ["#take-photo",takePhoto],
    ["#choose-photo",choosePhoto],
    ["#record-video",recordVideo],
    ["#browse-files",input]
  ])document.querySelector(selector)?.addEventListener("click",()=>{
    closeMenu();
    field?.click();
  });
  for(const field of inputs)field?.addEventListener("change",()=>{
    const file=field.files?.[0];
    if(file)pick(file);
    resetInputs();
  });
  document.addEventListener?.("pointerdown",e=>{
    if(menu&&!menu.hidden&&!menu.contains(e.target)&&e.target!==add&&!add?.contains?.(e.target))closeMenu();
  });
  document.addEventListener?.("keydown",e=>{
    if(e.key==="Escape"&&menu&&!menu.hidden){closeMenu();add?.focus?.();}
  });
  remove?.addEventListener("click",clear);
  root.AskShanXMedia=Object.freeze({
    has:()=>!!selected,
    kind:()=>selected?.kind||null,
    prepare,
    clear
  });
})(window);
