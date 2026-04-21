/**
 * Shared site chrome:
 *   - Light/dark theme toggle (persisted in localStorage, respects OS default)
 *   - Skip-to-content link injection (a11y)
 *   - Main landmark tagging on the .container wrapper
 *   - "Back to home" link injection on sub-pages
 *
 * Applied before DOMContentLoaded where possible to prevent a flash of the
 * wrong theme.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'jwl-theme';
  var LIGHT = 'light';
  var DARK = 'dark';

  /* ---------- storage helpers (defensive: private browsing, disabled cookies) ---------- */

  function getStored() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  function setStored(value) {
    try { localStorage.setItem(STORAGE_KEY, value); } catch (e) { /* ignore */ }
  }

  /* ---------- theme application ---------- */

  function getSystemPrefersLight() {
    if (typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-color-scheme: light)').matches;
  }

  function updateMetaColor() {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    // Use the computed --bg token so it tracks whichever palette is active.
    var bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    if (bg) meta.content = bg;
  }

  function updateToggleIcon() {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    var isLight = document.documentElement.classList.contains('theme-light');
    btn.textContent = isLight ? '🌙' : '☀️';
    btn.setAttribute('aria-pressed', String(isLight));
  }

  function setTheme(mode) {
    var html = document.documentElement;
    if (mode === LIGHT) html.classList.add('theme-light');
    else html.classList.remove('theme-light');
    updateMetaColor();
    updateToggleIcon();
  }

  function toggleTheme() {
    var isLight = document.documentElement.classList.contains('theme-light');
    var next = isLight ? DARK : LIGHT;
    setStored(next);
    setTheme(next);
  }

  function applyInitialTheme() {
    var stored = getStored();
    var mode = (stored === LIGHT || stored === DARK)
      ? stored
      : (getSystemPrefersLight() ? LIGHT : DARK);
    setTheme(mode);
  }

  /* ---------- DOM injections: skip link, main landmark, back-home ---------- */

  /**
   * The homepage has a unique #quick-links-grid element; every sub-tool lives
   * in /<tool>/index.html under the repo root. We use both signals to decide.
   */
  function isHomePage() {
    if (document.getElementById('quick-links-grid')) return true;
    var path = (window.location && window.location.pathname) || '';
    if (!path || path === '/') return true;
    var normalised = path.replace(/\\/g, '/');
    // Home page is either "/" or "/index.html" directly under root.
    var segments = normalised.split('/').filter(Boolean);
    return segments.length <= 1 && /\/index\.html?$/i.test(normalised);
  }

  function homeHref() {
    var path = (window.location && window.location.pathname) || '';
    if (!path || path === '/') return './index.html';
    var segments = path.replace(/\\/g, '/').split('/').filter(Boolean);
    return segments.length <= 1 ? './index.html' : '../index.html';
  }

  /**
   * Ensure a main landmark exists with id="main" so the skip-link has a target.
   * Each tool uses a different wrapper class; we probe the common ones in
   * order. If nothing is found we fall back to <body> so keyboard users at
   * least reach the first focusable element on the page.
   */
  function ensureMainLandmark() {
    var existing = document.querySelector('main, [role="main"]');
    if (existing) {
      if (!existing.id) existing.id = 'main';
      return existing;
    }
    var CANDIDATE_SELECTORS = [
      '.container',
      '.main-wrap',
      '.main-area',
      '.exam-container',
      '.ae-container',
      '.sbar-container',
      '.fluid-app',
      '.safeguarding-app main',
      '.safeguarding-app',
      '#app',
      '#root'
    ];
    for (var i = 0; i < CANDIDATE_SELECTORS.length; i++) {
      var el = document.querySelector(CANDIDATE_SELECTORS[i]);
      if (el) {
        el.setAttribute('role', 'main');
        if (!el.id) el.id = 'main';
        return el;
      }
    }
    if (document.body && !document.body.id) document.body.id = 'main';
    return document.body;
  }

  function injectSkipLink() {
    if (document.querySelector('.skip-link')) return;
    var link = document.createElement('a');
    link.className = 'skip-link';
    link.href = '#main';
    link.textContent = 'Skip to main content';
    var body = document.body;
    if (body && body.firstChild) body.insertBefore(link, body.firstChild);
    else if (body) body.appendChild(link);
  }

  function injectBackHomeLink() {
    if (isHomePage()) return;
    if (document.getElementById('back-home-link')) return;
    var link = document.createElement('a');
    link.id = 'back-home-link';
    link.className = 'back-home-link';
    link.href = homeHref();
    link.textContent = 'Home';
    link.setAttribute('aria-label', 'Back to homepage');
    link.setAttribute('title', 'Back to homepage');
    if (document.body) document.body.appendChild(link);
  }

  function initToggleButton() {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.setAttribute('aria-label', 'Toggle dark/light mode');
    btn.setAttribute('title', 'Toggle dark/light mode');
    btn.addEventListener('click', toggleTheme);
    updateToggleIcon();
  }

  function onReady() {
    ensureMainLandmark();
    injectSkipLink();
    initToggleButton();
    injectBackHomeLink();
  }

  /* ---------- bootstrap ---------- */

  applyInitialTheme();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }

  // Cross-tab sync: if the user toggles theme in another tab, mirror it here.
  window.addEventListener('storage', function (e) {
    if (e.key === STORAGE_KEY && (e.newValue === LIGHT || e.newValue === DARK)) {
      setTheme(e.newValue);
    }
  });

  /* ---------- auto-load the shared app shell (PWA + command palette) ----------
   * Historically each page was responsible for explicitly loading additional
   * shared scripts. To roll out the PWA / command-palette upgrade without
   * editing 20+ tool templates we load it here on demand. Absolute path
   * resolves cleanly from both the homepage and any /<tool>/ sub-page.
   */
  (function loadAppShell() {
    if (window.__jwlAppShellLoaded) return;
    if (document.querySelector('script[data-jwl-app-shell]')) return;
    var s = document.createElement('script');
    s.src = '/js/app-shell.js';
    s.defer = true;
    s.setAttribute('data-jwl-app-shell', '');
    (document.head || document.documentElement).appendChild(s);
  })();
})();
