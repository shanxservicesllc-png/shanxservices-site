// FIND THE AI RC02 | original proportional touchscreen thumbstick
// Rendered once on the UI. All assets and controls are local to this game.
export function createAnalogJoystick(base, knob) {
  const state = { x: 0, z: 0, active: false, pointerId: null };
  function reset() {
    state.x = 0; state.z = 0; state.active = false; state.pointerId = null;
    base.classList.remove('is-active');
    knob.style.transform = 'translate(-50%,-50%)';
  }
  function update(e) {
    const r = base.getBoundingClientRect();
    const reach = Math.max(25, r.width * .28);
    const dx = (e.clientX - r.left - r.width / 2) / reach;
    const dz = (e.clientY - r.top - r.height / 2) / reach;
    const magnitude = Math.hypot(dx, dz);
    const scale = magnitude > 1 ? 1 / magnitude : 1;
    const x = dx * scale, z = dz * scale;
    state.x = magnitude < .13 ? 0 : x;
    state.z = magnitude < .13 ? 0 : z;
    knob.style.transform = 'translate(-50%,-50%) translate(' +
      (x * reach).toFixed(1) + 'px,' + (z * reach).toFixed(1) + 'px)';
  }
  base.addEventListener('pointerdown', e => {
    if (state.active) return;
    e.preventDefault(); state.active = true; state.pointerId = e.pointerId;
    base.classList.add('is-active');
    try { base.setPointerCapture(e.pointerId) } catch (_) {}
    update(e);
  });
  base.addEventListener('pointermove', e => {
    if (state.pointerId !== e.pointerId) return;
    e.preventDefault(); update(e);
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    base.addEventListener(event, e => {
      if (e.pointerId === state.pointerId) reset();
    });
  }
  window.addEventListener('blur', reset);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) reset();
  });
  state.reset = reset;
  return state;
}
