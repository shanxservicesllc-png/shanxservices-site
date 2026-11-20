/* ShanX Commander / public checkout adapter.
 * No Stripe secret keys, personal accounts, or device access here.
 * Only an allowlisted Stripe-hosted Payment Link can start checkout.
 * This page cannot grant software entitlements or validate payments.
 */
(() => {
  'use strict';
  const button = document.getElementById('checkout-button');
  const status = document.getElementById('checkout-status');
  const modeText = document.getElementById('mode-text');
  const modeSub = document.getElementById('mode-subtext');
  const form = document.getElementById('test-form');
  const input = document.getElementById('test-link');
  const message = document.getElementById('test-message');
  if (!button || !form || !input || !status) return;
  function validLink(value, requestedMode) {
    if (typeof value !== 'string' || value.length > 500) return null;
    let uri;
    try { uri = new URL(value); } catch { return null; }
    if (uri.protocol !== 'https:' || uri.hostname !== 'buy.stripe.com' ||
        uri.username || uri.password || uri.port || uri.hash ||
        uri.search || uri.pathname.includes('//')) return null;
    const slug = uri.pathname.replace(/^\/|\/$/g, '');
    if (requestedMode === 'test' && !/^test_[A-Za-z0-9]{6,150}$/.test(slug)) return null;
    if (requestedMode === 'live' && !/^[A-Za-z0-9]{8,150}$/.test(slug)) return null;
    return uri.href;
  }
  function updateStatus(text, ready) {
    status.querySelector('span:last-child').textContent = text;
    status.classList.toggle('good', ready);
  }
  function activate(href, mode) {
    button.disabled = false;
    button.removeAttribute('aria-disabled');
    button.textContent = mode === 'test' ? 'Open Stripe test checkout ↗' : 'Proceed to Stripe checkout ↗';
    updateStatus(mode === 'test' ?
      'Configured for a Stripe test checkout. Test cards only; no real payments.' :
      'Hosted Stripe checkout is configured. Complete payments on Stripe.', true);
    modeText.textContent = mode === 'test' ? 'STRIPE TEST MODE' : 'STRIPE LIVE MODE';
    modeSub.textContent = mode === 'test' ? 'No real charges' : 'Payment link verified by site configuration';
    button.addEventListener('click', () => { window.location.assign(href); }, { once: false });
  }
  fetch('./config.json', { cache: 'no-store', credentials: 'omit' })
    .then(response => response.ok ? response.json() : Promise.reject(new Error('Missing Stripe config')))
    .then(config => {
      if (!config || config.enabled !== true || !['test', 'live'].includes(config.mode)) return;
      const url = validLink(config.paymentLink, config.mode);
      if (!url) { updateStatus('Stripe configuration was rejected. No checkout available.', false); return; }
      activate(url, config.mode);
    })
    .catch(() => updateStatus('Checkout configuration unavailable. No checkout enabled.', false));
  form.addEventListener('submit', event => {
    event.preventDefault();
    const url = validLink(input.value.trim(), 'test');
    if (!url) {
      message.textContent = 'Enter a full Stripe test Payment Link beginning with https://buy.stripe.com/test_.';
      message.style.color = '#ffd28a';
      return;
    }
    message.textContent = 'Opening your Stripe-hosted test checkout. No link is stored here.';
    message.style.color = '#86f5b5';
    window.location.assign(url);
  });
})();
