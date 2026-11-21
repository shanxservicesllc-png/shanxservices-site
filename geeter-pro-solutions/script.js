(() => {
  'use strict';
  const config = window.GEETER_SITE_CONFIG || {};
  const setText = (selector, value) => {
    if (typeof value !== 'string') return;
    document.querySelectorAll(selector).forEach(el => { el.textContent = value; });
  };
  setText('[data-site="name"]', config.name);
  setText('[data-site="tagline"]', config.tagline);
  setText('[data-site="about"]', config.about);
  if (Array.isArray(config.services)) {
    config.services.slice(0, 3).forEach((service, index) => {
      setText(`[data-service="${index}-title"]`, service.title);
      setText(`[data-service="${index}-description"]`, service.description);
    });
  }
  document.title = `${config.name || 'Geeter Pro Solutions'} | Commercial Cleaning`;
  document.querySelector('#year').textContent = String(new Date().getFullYear());
  const toggle = document.querySelector('.mobile-toggle');
  const nav = document.querySelector('#mobile-nav');
  const closeMenu = () => { nav.hidden = true; toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-label', 'Open menu'); };
  toggle.addEventListener('click', () => {
    const opening = !nav.hidden;
    nav.hidden = opening;
    toggle.setAttribute('aria-expanded', String(!opening));
    toggle.setAttribute('aria-label', opening ? 'Open menu' : 'Close menu');
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !nav.hidden) closeMenu(); });
  const media = window.matchMedia('(min-width: 801px)');
  media.addEventListener('change', event => { if (event.matches) closeMenu(); });
  // Activate the intake integration only after a separate verified web-intake application is available.
  // No unverified URL or placeholder form is presented as operational.
})();