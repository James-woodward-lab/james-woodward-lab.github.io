/*
 * James Woodward Lab - shared app shell.
 *
 * Injected on every page via theme-toggle.js (which every page already
 * loads). Responsibilities:
 *
 *   1. Install the PWA surface - manifest <link>, theme-color, apple-touch-
 *      icon and favicon references, registering the service worker.
 *   2. Install prompt wiring (Chromium beforeinstallprompt) and an "offline
 *      ready" toast on first install.
 *
 * The module is completely self-contained: it injects its own <style>,
 * markup and event handlers so no page template edits are required.
 */
(function () {
  'use strict';

  if (window.__jwlAppShellLoaded) return;
  window.__jwlAppShellLoaded = true;

  /* ================================================================
   * 1. Manifest / favicon / meta-tag injection.
   * ================================================================ */

  function ensureLink(rel, href, attrs) {
    const sel = 'link[rel="' + rel + '"]' + (attrs && attrs.sizes ? '[sizes="' + attrs.sizes + '"]' : '');
    if (document.head.querySelector(sel)) return;
    const el = document.createElement('link');
    el.rel = rel;
    el.href = href;
    if (attrs) Object.keys(attrs).forEach((k) => el.setAttribute(k, attrs[k]));
    document.head.appendChild(el);
  }

  function ensureMeta(name, content) {
    if (document.head.querySelector('meta[name="' + name + '"]')) return;
    const m = document.createElement('meta');
    m.name = name;
    m.content = content;
    document.head.appendChild(m);
  }

  function injectHeadMeta() {
    ensureLink('manifest', '/manifest.webmanifest');
    ensureLink('icon', '/icons/icon.svg', { type: 'image/svg+xml' });
    ensureLink('apple-touch-icon', '/icons/icon.svg');
    ensureMeta('apple-mobile-web-app-capable', 'yes');
    ensureMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');
    ensureMeta('apple-mobile-web-app-title', 'JW Lab');
    ensureMeta('application-name', 'JW Lab');
    ensureMeta('mobile-web-app-capable', 'yes');
  }

  /* ================================================================
   * 2. Service worker registration.
   * ================================================================ */

  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    // Only register on http(s); file:// would throw.
    if (!/^https?:$/.test(location.protocol)) return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Silent failure is fine - page still works.
      });
    });
  }

  function wireInstallPrompt() {
    window.addEventListener('appinstalled', () => {
      showToast('Installed - look for "JW Lab" on your home screen');
    });
  }

  /* ================================================================
   * 3. Toast.
   * ================================================================ */

  const STYLE_ID = 'jwl-shell-style';
  const STYLE = `
    #jwl-toast {
      position: fixed; left: 50%; bottom: 24px; transform: translate(-50%, 20px);
      background: var(--surface, #023047); color: var(--text, #e2edf9);
      border: 1px solid var(--accent, #24aacc);
      border-radius: 999px; padding: 10px 18px;
      font-size: 0.88rem; box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      opacity: 0; pointer-events: none;
      transition: opacity .2s, transform .2s;
      z-index: 10000; max-width: calc(100vw - 32px);
    }
    #jwl-toast.show { opacity: 1; transform: translate(-50%, 0); pointer-events: auto; }
    @media print { #jwl-toast { display: none !important; } }
    html.theme-light #jwl-toast { box-shadow: 0 8px 24px rgba(2, 6, 23, 0.18); }
  `;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  let toastTimer = null;
  function showToast(msg) {
    let t = document.getElementById('jwl-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'jwl-toast';
      t.setAttribute('role', 'status');
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
  }

  /* ================================================================
   * 4. First-run offline-ready toast.
   * ================================================================ */

  function maybeAnnounceOffline() {
    if (!('serviceWorker' in navigator)) return;
    const KEY = 'jwl-offline-announced';
    try { if (localStorage.getItem(KEY)) return; } catch (_) { return; }
    navigator.serviceWorker.ready.then(() => {
      try { localStorage.setItem(KEY, '1'); } catch (_) {}
      setTimeout(() => showToast('Ready to use offline'), 1200);
    });
  }

  /* ================================================================
   * 5. Bootstrap.
   * ================================================================ */

  function init() {
    injectHeadMeta();
    injectStyles();
    registerSW();
    wireInstallPrompt();
    maybeAnnounceOffline();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
