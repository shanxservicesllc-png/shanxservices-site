"use strict";
(() => {
  const starter = Array.from(document.querySelectorAll("[data-suggestion]"))
    .find(b => b.dataset.suggestion?.startsWith("My Whirlpool"));
  const log = document.querySelector("#conversation");
  const welcome = document.querySelector("#welcome");
  const scroller = document.querySelector("#chat-scroll");
  if (!starter || !log || !welcome) return;

  function line(role, message) {
    const article = document.createElement("article");
    article.className = "message-row " + role + " fridge-guide";
    if (role === "assistant") {
      const avatar = document.createElement("div");
      avatar.className = "avatar";
      avatar.textContent = "S";
      article.append(avatar);
    }
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = message;
    article.append(bubble);
    log.append(article);
    scroller.scrollTop = scroller.scrollHeight;
  }
  function choose(items) {
    const bar = document.createElement("div");
    bar.className = "fridge-guide";
    bar.setAttribute("role","group");
    bar.setAttribute("aria-label","Refrigerator troubleshooting answers");
    bar.style.cssText = "display:flex;flex-wrap:wrap;gap:9px;margin:12px 0 22px 48px;";
    for(const item of items) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = item.label;
      b.style.cssText = "cursor:pointer;background:#15291f;color:#e3f5e8;border:1px solid #57976a;padding:11px 14px;border-radius:12px;font:inherit;";
      b.addEventListener("click", () => {
        bar.remove();
        line("user", item.label);
        item.action();
      });
      bar.append(b);
    }
    log.append(bar);
    scroller.scrollTop = scroller.scrollHeight;
  }
  function finish(message) {
    line("assistant", message + " This is a general guided check, not a confirmed diagnosis. Avoid removing panels or working on electrical or refrigerant components. If perishable food has been warm for several hours, follow food-safety guidance rather than keeping it.");
    choose([{label:"Start over",action:start},{label:"Where is the model number?",action:() => finish("Whirlpool model-number labels are commonly inside the refrigerator near a side wall or door frame. You can copy the model number and provide it when consulting a repair professional.")}]);
  }
  function airflow() {
    line("assistant", "If the freezer is freezing but the refrigerator is warm, cold-air circulation may be the issue. Are food packages blocking the vents inside either compartment?");
    choose([
      {label:"Yes, vents are blocked",action:()=>finish("Move items away from the vents and make sure the doors close completely. Give temperatures time to stabilize and check with a refrigerator thermometer.")},
      {label:"No, vents are clear",action:()=>finish("Check that the temperature settings are correct and that air is moving inside the freezer when it runs. If the refrigerator stays warm, a fan or defrost issue is possible and a technician may be needed.")},
      {label:"I'm not sure",action:()=>finish("Look for air openings on the inside walls, without disassembling anything. Keep groceries from resting against those openings and check whether the refrigerator begins cooling again.")}
    ]);
  }
  function warmBoth() {
    line("assistant", "If both compartments are warm, the humming alone doesn't prove the cooling system works. How long has the refrigerator been plugged in since it was cleaned?");
    choose([
      {label:"Less than 24 hours",action:()=>finish("After being unplugged, some refrigerators need up to 24 hours to reach the set temperature. Keep the doors closed as much as possible, check the settings, and monitor with a thermometer. Don't store perishables in it until it is safely cold.")},
      {label:"24 hours or longer",action:()=>finish("If neither side is cooling after a full day, check that the controls are set to cool and the doors seal properly. A technician should evaluate a continuing failure; don't open the electrical or sealed cooling system.")},
      {label:"Not sure",action:()=>finish("Check the current refrigerator and freezer temperatures with a thermometer and note when the unit was powered back on. If temperatures don't improve within 24 hours, a professional inspection is appropriate.")}
    ]);
  }
  function start() {
    log.querySelectorAll(".fridge-guide").forEach(n=>n.remove());
    welcome.hidden = true;
    line("assistant", "Hi! I'm ASK SHAN X, powered by X13 AI for ShanX Services. Our live AI chat is still being connected, but this guided refrigerator check works right now. First question: Is the freezer still freezing food, or are both sides warm?");
    choose([
      {label:"Freezer is still freezing",action:airflow},
      {label:"Both sides are warm",action:warmBoth},
      {label:"I don't know yet",action:()=>{
        line("assistant", "That's okay. You can check with a refrigerator thermometer or see if previously frozen items are still solid. Which best describes the freezer?");
        choose([
          {label:"It's freezing",action:airflow},
          {label:"It's warm",action:warmBoth},
          {label:"Still unsure",action:()=>finish("Check the temperature of each side when you can. The freezer status is the most useful next clue.")}
        ]);
      }}
    ]);
  }
  starter.addEventListener("click", e => {
    e.preventDefault();
    e.stopImmediatePropagation();
    start();
  }, true);
})();