// RIFTBOUND adapter for the ORIGINAL X13 ORB controller and ShanX touch joystick.
// Original device_controls.js and joystick.js are copied byte-for-byte from Ghost Protocol RC07.
// This adapter translates named game actions only. It never changes physical mappings.
import { createDeviceControls } from './device_controls.js';
import { createAnalogJoystick } from './joystick.js';
const $ = id => document.getElementById(id);
if ('ontouchstart' in window || matchMedia('(pointer:coarse)').matches) document.documentElement.classList.add('x13-touch');
const game = () => window.__riftbound;
const inputSettings = $('inputSettings');
const controllerGuide = $('controllerGuide');
function showSettings(show) { inputSettings.classList.toggle('hidden', !show); }
function showGuide(show) { controllerGuide.classList.toggle('hidden', !show); }
function toggleGuide() { showSettings(false); showGuide(controllerGuide.classList.contains('hidden')); }
$('inputToggle').addEventListener('click', () => showSettings(true));
$('closeInputSettings').addEventListener('click', () => showSettings(false));
$('openControllerGuide').addEventListener('click', () => {showSettings(false);showGuide(true);});
$('closeControllerGuide').addEventListener('click', () => showGuide(false));
const analog = createAnalogJoystick($('mobilePad'), $('padKnob'));
const controls = createDeviceControls({
  onAction(name) {
    const g=game(); if (!g) return;
    if (name==='use' && !controllerGuide.classList.contains('hidden')) { showGuide(false); return; }
    if (name==='use' && !g.getState().started) { g.start(); return; }
    if (name==='use') g.interact();
    else if (name==='fly') g.toggleFly();
    else if (name==='pulse') { if (!g.getState().hero.flight) g.nova(); }
    else if (name==='phase') { if (!g.getState().hero.flight) g.dash(); }
    else if (name==='scan') g.scan();
    else if (name==='bolt') g.cast();
    else if (name==='pause') g.togglePause();
    else if (name==='recenter') g.recenter();
    // 'sprint' is toggled in canonical X13 ORB controller; read it in the game update.
  },
  onLook(dx,dy) { if (controllerGuide.classList.contains('hidden') && inputSettings.classList.contains('hidden')) game()?.look(dx,dy); },
  onStart() { game()?.start(); },
  onCamera(direction) { game()?.cycleCamera(direction); },
  onCameraSet(mode) { game()?.setCamera(mode); },
  onGuide: toggleGuide
});
window.__x13RiftInput = { controls, analog, source:'X13 ORB / Ghost Protocol RC07', version:'riftbound-bridge-1' };
