// Shared by every page. Loaded in <head>, so the saved theme is set before the page draws.
(() => {
  /* Theme: remembered per browser, like the app's moon button */
  const root = document.documentElement;
  const prefersDark = matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : prefersDark.matches;
  // Reading or saving can fail when storage is blocked (some private windows, strict settings).
  // Then the choice simply isn't remembered, and the page follows the system theme.
  try { const saved = localStorage.getItem('ws-site-theme'); if (saved) root.dataset.theme = saved; } catch (e) { /* not remembered: see above */ }

  // Signed in to the app? The app (app.cronelo.co.uk) sets a 'cronelo_signed_in' cookie for
  // all of cronelo.co.uk while someone is signed in, and removes it on sign out. It holds only
  // "1", never the sign-in itself. Signed in: hide "Log in" (CSS, so it never flashes) and turn
  // every "Create free account" into "Open Cronelo". On any other address (a pages.dev preview,
  // a local copy) there's no cookie, and the buttons stay as for someone signed out.
  let signedIn = false;
  try {
    signedIn = /(?:^|;\s*)cronelo_signed_in=1(?:;|$)/.test(document.cookie);
  } catch (e) { /* cookies blocked: treat as signed out */ }
  if (signedIn) root.classList.add('signed-in');

  // Never show the site inside another site's frame, where it could be overlaid to trick
  // clicks. The frame-ancestors header does this properly; this covers hosts that can't
  // send headers (see README.md).
  if (window.top !== window.self) root.classList.add('framed');

  document.addEventListener('DOMContentLoaded', () => {
    if (signedIn) document.querySelectorAll('[data-app="signup"]').forEach(a => {
      a.textContent = 'Open Cronelo';
      a.href = a.href.replace(/#signup$/, '');
    });

    const themeBtn = document.getElementById('theme-btn');
    const syncBtn = () => themeBtn.setAttribute('aria-label', isDark() ? 'Switch to light mode' : 'Switch to dark mode');
    syncBtn();
    themeBtn.addEventListener('click', () => {
      root.dataset.theme = isDark() ? 'light' : 'dark';
      try { localStorage.setItem('ws-site-theme', root.dataset.theme); } catch (e) { /* works for this visit only: see above */ }
      syncBtn();
    });

    /* The header's height changes with the screen (the nav moves to a second row on narrow
       screens), so keep it measured: links to a section then land just below the header. */
    const topbar = document.querySelector('.topbar');
    new ResizeObserver(() => root.style.setProperty('--topbar-h', topbar.offsetHeight + 'px')).observe(topbar);

    /* Tooltips, as in the app (js/app/start.js there): hovering or tabbing to anything with
       data-tip or a description (aria-describedby), or to a button that shows no words of its
       own, shows its text in a small label after a moment. Once one has shown, the next shows
       straight away. Escape closes it, and the pointer can move onto it without it closing
       (WCAG 1.4.13). */
    const tip = document.createElement('div');
    tip.className = 'tip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true;
    document.body.append(tip);
    let tipFor = null, timer = 0, warm = 0, leaving = 0;
    const describedText = el => {
      const desc = el.hasAttribute('aria-describedby') && document.getElementById(el.getAttribute('aria-describedby'));
      return desc ? desc.textContent : '';
    };
    const textOf = el => el.dataset.tip || describedText(el) || (!/[a-z]{3}/i.test(el.textContent) && el.getAttribute('aria-label')) || '';
    const target = el => {
      el = el && el.closest ? el.closest('[data-tip], [aria-describedby], button[aria-label]') : null;
      return el && textOf(el) ? el : null;
    };
    const place = () => {
      if (!tipFor || !document.contains(tipFor)) return hide();
      tip.textContent = textOf(tipFor);
      tip.hidden = false;
      const r = tipFor.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
      const below = r.bottom + 8 + h < innerHeight - 4;
      tip.style.left = Math.max(4, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 4)) + 'px';
      tip.style.top = (below ? r.bottom + 8 : r.top - 8 - h) + 'px';
    };
    const hide = () => {
      clearTimeout(timer); clearTimeout(leaving);
      if (!tip.hidden) warm = Date.now() + 500;
      tip.hidden = true; tipFor = null;
    };
    const show = el => {
      clearTimeout(leaving);
      if (el === tipFor) return;
      hide(); tipFor = el;
      if (Date.now() < warm) place(); else timer = setTimeout(place, 350);
    };
    document.addEventListener('pointerover', e => {
      if (e.pointerType !== 'mouse') return;
      if (tip.contains(e.target)) { clearTimeout(leaving); return; }   // moving onto the tip keeps it open
      const el = e.buttons ? null : target(e.target);
      if (el) show(el);
      else if (tipFor) { clearTimeout(leaving); leaving = setTimeout(hide, 200); }   // time to cross the gap onto the tip
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && tipFor) hide(); });
    document.addEventListener('focusin', e => { const el = target(e.target); if (el && e.target.matches(':focus-visible')) show(el); });
    document.addEventListener('focusout', e => { if (tipFor && tipFor.contains(e.target)) hide(); });
    document.addEventListener('pointerdown', () => { if (tipFor) hide(); });
    addEventListener('scroll', () => { if (tipFor) hide(); }, { passive: true });
  });
})();
