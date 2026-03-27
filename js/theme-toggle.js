/**
 * Dark/light theme toggle — persists to localStorage, syncs meta theme-color.
 * Applies theme immediately to prevent flash of wrong theme.
 */
(function() {
  var STORAGE_KEY = 'jwl-theme';
  var LIGHT = 'light';
  var DARK = 'dark';

  function getStored() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function getSystemPrefersLight() {
    if (typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-color-scheme: light)').matches;
  }

  function setTheme(mode) {
    var html = document.documentElement;
    if (mode === LIGHT) {
      html.classList.add('theme-light');
      updateMetaColor('#0d9488');
    } else {
      html.classList.remove('theme-light');
      updateMetaColor('#13293d');
    }
    updateToggleIcon();
  }

  function updateToggleIcon() {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    var isLight = document.documentElement.classList.contains('theme-light');
    btn.textContent = isLight ? '🌙' : '☀️';
  }

  function updateMetaColor(color) {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = color;
  }

  function applyTheme() {
    var stored = getStored();
    var mode = stored === LIGHT || stored === DARK ? stored : (getSystemPrefersLight() ? LIGHT : DARK);
    setTheme(mode);
  }

  function toggleTheme() {
    var html = document.documentElement;
    var isLight = html.classList.contains('theme-light');
    var next = isLight ? DARK : LIGHT;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (e) {}
    setTheme(next);
  }

  function initToggleButton() {
    var btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.setAttribute('aria-label', 'Toggle dark/light mode');
      btn.setAttribute('title', 'Toggle dark/light mode');
      btn.addEventListener('click', toggleTheme);
    }
  }

  function isHomePage() {
    // Homepage has unique quick-links container; this is the most reliable signal.
    if (document.getElementById('quick-links-grid')) return true;

    var path = (window.location && window.location.pathname) || '';
    if (!path || path === '/') return true;
    var normalized = path.replace(/\\/g, '/');
    return /\/index\.html?$/i.test(normalized);
  }

  function createHomeHref() {
    var path = (window.location && window.location.pathname) || '';
    if (!path || path === '/') return './index.html';
    var normalized = path.replace(/\\/g, '/');
    var segments = normalized.split('/').filter(Boolean);
    if (segments.length <= 1) return './index.html';
    return '../index.html';
  }

  function initBackHomeControl() {
    if (isHomePage()) return;
    if (document.getElementById('back-home-link')) return;

    var link = document.createElement('a');
    link.id = 'back-home-link';
    link.className = 'back-home-link';
    link.href = createHomeHref();
    link.textContent = 'Home';
    link.setAttribute('aria-label', 'Back to homepage');
    link.setAttribute('title', 'Back to homepage');

    var body = document.body;
    if (body) {
      body.appendChild(link);
    }
  }

  applyTheme();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initToggleButton();
      initBackHomeControl();
    });
  } else {
    initToggleButton();
    initBackHomeControl();
  }

  window.addEventListener('storage', function(e) {
    if (e.key === STORAGE_KEY && e.newValue) {
      setTheme(e.newValue);
    }
  });
})();
