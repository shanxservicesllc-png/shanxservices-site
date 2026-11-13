"use strict";
/**
 * ASK SHAN X: no-cost, deterministic refrigerator guide.
 * This is NOT a language model, diagnosis, or remote AI.
 * It must never invent appliance-specific information.
 */
(function attach(root) {
  const say = (text) => text;
  const txt = (v) => String(v || "").toLowerCase().trim();
  const mentions = (s, re) => re.test(s);
  function answer(message, history = []) {
    const q = txt(message);
    const prior = (Array.isArray(history) ? history : [])
      .filter(x => x && x.role === "assistant")
      .map(x => txt(x.content)).slice(-3).join(" ");
    if (!q) return say("Tell me what's happening with your refrigerator. I'll ask one question at a time.");
    if (mentions(q, /both sides (are |is )?war\b|both compartments? (are |is )?war\b/) && prior.includes("freezer"))
      return say("Did you mean both sides are warm? If so, how long has the refrigerator been plugged back in since cleaning: less than 24 hours or longer?");
    if (mentions(q, /model number|serial|model sticker|model tag/))
      return say("On many Whirlpool side-by-side refrigerators, the model-number label is inside the fresh-food compartment along a side wall or door frame. A photo of the label can help identify the exact manual. Don't share serial numbers publicly if you don't need to.");
    if (mentions(q, /smoke|sparks|burning smell|fire|shock|exposed wire|leaking refrigerant/))
      return say("Stop using the appliance and keep clear of the hazard. If safe, disconnect its power without touching damaged wiring. A qualified technician should inspect it. If there is smoke or fire, leave the area and contact emergency services.");
    if (mentions(q, /food|milk|meat|spoiled|perishable|safe to eat/))
      return say("If refrigerated perishable food has been above 40°F (4°C) for more than 2 hours, it generally should be discarded. Don't rely on smell alone. When in doubt, check USDA or FDA food-safety guidance.");
    if (mentions(q, /freezer (is |was |still |is still )?(freezing|frozen|cold)|freezer works|freezer fine|freezer is okay|freezer is cold|only fridge|fridge warm.*freezer cold/))
      return say("If the freezer is cold but the refrigerator isn't, check that food packages aren't blocking the vents between compartments, the doors seal, and the temperature settings are appropriate. Does air seem to circulate inside the freezer? You don't need to remove any covers.");
    if (mentions(q, /both (sides|compartments).*warm|neither.*cold|freezer.*(warm|not cold|not freezing|thawed)|nothing.*cold|both.*not cool/))
      return say("If neither compartment is cold, the hum alone doesn't prove the compressor is cooling. How long has it been plugged back in since the cleaning? Is it less than 24 hours, or at least 24 hours?");
    if (mentions(q, /less than (24|a day)|under 24|few hours|just plugged|couple hours|an hour|this morning/) && prior.includes("how long"))
      return say("After reconnecting power, a refrigerator can take many hours to cool completely. Keep doors closed as much as practical, check with a thermometer, and don't put perishable foods back until it's safely below 40°F (4°C). If it remains warm after 24 hours, consider professional service.");
    if (mentions(q, /24 hours|more than a day|over a day|two days|several days|yesterday|days|week/) && prior.includes("how long"))
      return say("If both sides stay warm after 24 hours, check only the temperature controls, that the doors close and seal, and whether the vents are clear. A fan, start component, defrost issue, or cooling-system fault may require a qualified appliance technician. Please don't remove electrical panels or attempt refrigerant repairs.");
    if (mentions(q, /yes|yeah|yep|it's cold|it is cold|still freezing/) && prior.includes("is the freezer"))
      return say("Good, that narrows it down to a possible airflow problem. Are the vents inside either side blocked by food or ice? Check without taking off any panels.");
    if (mentions(q, /no|nope|not at all|warm/) && prior.includes("is the freezer"))
      return say("If the freezer isn't cold either, how long has it been plugged back in since cleaning: less than 24 hours or longer?");
    if (mentions(q, /humming|hum|compressor|buzz|click/))
      return say("Hearing humming or clicking tells us that something is running or trying to start, but doesn't prove the compressor works. Is the freezer still freezing, or are both compartments warm?");
    if (mentions(q, /clean|unplug|washed|coils|dust/))
      return say("Thanks. If you cleaned the condenser coils, that's useful maintenance. Was it plugged back in recently, and is the freezer still freezing? Please leave electrical covers and refrigerant lines alone.");
    if (mentions(q, /whirlpool|refrigerator|fridge|freezer|not cooling|not cold|warm|broken|repair/))
      return say("I'm ASK SHAN X, X13's guided appliance helper. Let's narrow it down one question at a time. Is the freezer side still freezing, or are both sides warm?");
    if (mentions(q, /^(hi|hey|hello|help|start|yo)[!. ]*$/))
      return say("Hey! I'm ASK SHAN X, powered by X13 AI for ShanX Services. The live AI model isn't connected yet, but I can guide you through basic refrigerator checks. Is your freezer still getting cold?");
    return say("The free-form AI model isn't connected yet, so I won't pretend to know the answer. Right now I can walk you through refrigerator troubleshooting. Tell me whether the freezer still gets cold, or choose Refrigerator help above.");
  }
  root.AskShanXLocal = Object.freeze({answer, mode: "guided-rules", modelConnected: false});
})(globalThis);
