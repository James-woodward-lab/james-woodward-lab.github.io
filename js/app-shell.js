/*
 * James Woodward Lab — shared app shell.
 *
 * Injected on every page via theme-toggle.js (which every page already
 * loads). Responsibilities:
 *
 *   1. Install the PWA surface — manifest <link>, theme-color, apple-touch-
 *      icon and favicon references, registering the service worker.
 *   2. Command Palette (Ctrl/Cmd+K) — fuzzy-search across every tool, every
 *      external quick link, and a handful of global actions. Fully keyboard-
 *      driven with ARIA roles and a focus trap.
 *   3. Install prompt wiring (Chromium beforeinstallprompt) and an "offline
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
   * 1. Catalogue — canonical list of tools + actions for the palette.
   * ================================================================ */

  const TOOLS = [
    // Top tools
    { title: 'WETFLAG Resus Card',              href: '/wetflag-calculator/',              emoji: '🚨', tags: 'resus resuscitation apls paediatric arrest wetflag drugs dose emergency weight tube fluids lorazepam adrenaline glucose', group: 'Top' },
    { title: 'Paediatric Vitals & Ranges',      href: '/paediatric-vitals/',               emoji: '📈', tags: 'vitals obs observations pews rr hr bp sats oxygen temperature crt avpu normal ranges age ward round flag concerning shock', group: 'WIP' },
    { title: 'Examination Notes',               href: '/infant-exam-notes/',               emoji: '🧾', tags: 'exam examination notes infant baby', group: 'Top' },
    { title: 'Fluid Calculator',                href: '/fluid-calculator/',                emoji: '💧', tags: 'fluid maintenance iv hydration', group: 'Top' },
    { title: 'QTc Calculator',                  href: '/qtc-calculator/',                  emoji: '🫀', tags: 'qtc ecg cardiac rhythm bazett fridericia', group: 'Top' },
    { title: 'Simple Analgesia Dosing',         href: '/bnfc-dose-calculator/',            emoji: '💊', tags: 'paracetamol ibuprofen analgesia dose bnfc', group: 'Top' },

    // Works in progress
    { title: 'A-E Assessment Notes',            href: '/ae-assessment/',                   emoji: '🅰️', tags: 'abcde a-e assessment primary survey', group: 'WIP' },
    { title: 'CXR Systematic Review',           href: '/chest-xray-review/',               emoji: '🫁', tags: 'cxr chest xray radiology review', group: 'WIP' },
    { title: 'Developmental Milestones',        href: '/developmental-milestones/',        emoji: '👶', tags: 'development milestones paediatric age', group: 'WIP' },
    { title: 'Renal Fluid Calculator',          href: '/renal-fluid-calculator/',          emoji: '🧪', tags: 'renal fluid kidney aki', group: 'WIP' },
    { title: 'Safeguarding Calculator',         href: '/safeguarding-calculator/',         emoji: '🛡️', tags: 'safeguarding child protection risk', group: 'WIP' },
    { title: 'SBAR Generator',                  href: '/sbar-generator/',                  emoji: '📝', tags: 'sbar handover communication', group: 'WIP' },
    { title: 'Seizure Timer',                   href: '/seizure-timer/',                   emoji: '⏱️', tags: 'seizure timer convulsion epilepsy', group: 'WIP' },
    { title: 'Wound Closure Decision Aid',      href: '/wound-closure.html',               emoji: '🩹', tags: 'wound laceration closure glue sutures', group: 'WIP' },
    { title: 'Paediatric Poisoning Triage',     href: '/paediatric-poisoning-triage/',     emoji: '☠️', tags: 'poisoning overdose toxbase toxicology', group: 'WIP' },
    { title: 'Bronchiolitis Severity Grader',   href: '/bronchiolitis-severity-grader/',   emoji: '😮‍💨', tags: 'bronchiolitis rsv severity', group: 'WIP' },
    { title: 'Paediatric Blood Gas Interpreter',href: '/paediatric-blood-gas-interpreter/',emoji: '🩸', tags: 'abg vbg blood gas acid base ph pco2 bicarbonate', group: 'WIP' },
    { title: 'Paediatric Head Injury CT',       href: '/head-injury-ct-stratification/',   emoji: '🧠', tags: 'head injury ct nice pecarn trauma', group: 'WIP' },
    { title: 'Style Lab',                       href: '/style-lab/',                       emoji: '🧪', tags: 'style theme palette preview', group: 'WIP' },
  ];

  const QUICK_LINKS = [
    { title: 'BNFc',                                 href: 'https://bnfc.nice.org.uk/',                                                                             emoji: '💊', tags: 'medications dosing nice bnf', external: true },
    { title: 'BSAC',                                 href: 'https://bsac.org.uk/paediatricpathways/',                                                               emoji: '🧫', tags: 'antimicrobial pathways', external: true },
    { title: 'Burns',                                href: 'https://woundsinternational.com/wp-content/uploads/2023/02/5ebace6c70d4ea53a5d3e28ca65f1b74.pdf',       emoji: '🔥', tags: 'burns wounds', external: true },
    { title: 'MDCalc',                               href: 'https://www.mdcalc.com/',                                                                               emoji: '🧮', tags: 'scores calculators', external: true },
    { title: 'Healthier Together',                   href: 'https://www.healthiertogether.nhs.uk/professional',                                                     emoji: '🌿', tags: 'paediatric guidelines', external: true },
    { title: 'SORT',                                 href: 'https://www.sort.nhs.uk/home.aspx',                                                                     emoji: '📚', tags: 'sort southampton retrieval', external: true },
    { title: 'PIER',                                 href: 'https://www.piernetwork.org/',                                                                          emoji: '🧠', tags: 'pier guidelines paediatric', external: true },
    { title: 'Staffnet',                             href: 'https://staffnet.uhs.nhs.uk',                                                                           emoji: '🏢', tags: 'uhs intranet', external: true },
    { title: 'Southampton Hospital at Home',         href: 'https://forms.office.com/pages/responsepage.aspx?id=wRwyQbnsfEaw1YVGRNlOO96jJGeS21RFoF5oTRt3gkpUODdMM1JGV0tKU0pTTjI0R1VSUlhaWk5UTy4u&route=shorturl', emoji: '🏠', tags: 'h@h hospital at home southampton', external: true },
  ];

  const ACTIONS = [
    { id: 'home',     title: 'Go to homepage',      emoji: '🏠', tags: 'home start root' },
    { id: 'theme',    title: 'Toggle light / dark', emoji: '🌓', tags: 'theme dark light mode' },
    { id: 'install',  title: 'Install as app',      emoji: '📲', tags: 'install pwa add home screen', requires: 'installable' },
    { id: 'clear',    title: 'Clear offline cache', emoji: '🧹', tags: 'cache clear offline refresh' },
    { id: 'about',    title: 'About this site',     emoji: 'ℹ️',  tags: 'about info credits' },
  ];

  /* ================================================================
   * 2. Manifest / favicon / meta-tag injection.
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
   * 3. Service worker registration.
   * ================================================================ */

  let deferredInstallPrompt = null;

  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    // Only register on http(s); file:// would throw.
    if (!/^https?:$/.test(location.protocol)) return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Silent failure is fine — page still works.
      });
    });
  }

  function wireInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
    });
    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null;
      showToast('Installed — look for "JW Lab" on your home screen');
    });
  }

  /* ================================================================
   * 4. Toast.
   * ================================================================ */

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
   * 5. Command Palette — markup, styles, fuzzy search, keyboard nav.
   * ================================================================ */

  const STYLE_ID = 'jwl-cmdk-style';
  const STYLE = `
    #jwl-cmdk-launcher {
      position: fixed; right: 14px; bottom: 14px; z-index: 9998;
      width: 46px; height: 46px; border-radius: 50%;
      border: 1.5px solid var(--border, #176f85);
      background: var(--surface2, #0a3e58);
      color: var(--text, #e2edf9);
      font-size: 18px; font-weight: 700; letter-spacing: 0.5px;
      cursor: pointer; box-shadow: 0 6px 16px rgba(0,0,0,0.25);
      display: flex; align-items: center; justify-content: center;
      transition: transform .15s, background .15s, border-color .15s;
    }
    #jwl-cmdk-launcher:hover { transform: translateY(-2px); border-color: var(--accent, #24aacc); }
    #jwl-cmdk-launcher:focus-visible { outline: 2px solid var(--accent, #24aacc); outline-offset: 2px; }
    @media print { #jwl-cmdk-launcher, #jwl-cmdk-overlay, #jwl-toast { display: none !important; } }

    #jwl-cmdk-overlay {
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(4, 10, 20, 0.55);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      display: flex; align-items: flex-start; justify-content: center;
      padding: 10vh 16px 16px;
      opacity: 0; pointer-events: none;
      transition: opacity .15s ease;
    }
    #jwl-cmdk-overlay.open { opacity: 1; pointer-events: auto; }
    #jwl-cmdk-panel {
      width: 100%; max-width: 620px;
      background: var(--surface, #023047);
      border: 1px solid var(--border, #176f85);
      border-radius: 14px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.5);
      overflow: hidden;
      display: flex; flex-direction: column;
      max-height: 80vh;
      transform: translateY(-6px) scale(0.985);
      transition: transform .18s cubic-bezier(.2,.8,.2,1);
    }
    #jwl-cmdk-overlay.open #jwl-cmdk-panel { transform: translateY(0) scale(1); }
    .jwl-cmdk-input-wrap {
      display: flex; align-items: center; gap: 10px;
      padding: 14px 16px; border-bottom: 1px solid var(--border, #176f85);
    }
    .jwl-cmdk-input-wrap svg { width: 18px; height: 18px; flex: 0 0 18px; color: var(--muted, #9eb5c9); }
    #jwl-cmdk-input {
      flex: 1; background: transparent; border: 0; outline: none;
      color: var(--text, #e2edf9); font-size: 1rem; padding: 4px 0;
      font-family: inherit;
    }
    #jwl-cmdk-input::placeholder { color: var(--muted, #9eb5c9); }
    .jwl-cmdk-esc {
      font-size: 0.7rem; color: var(--muted, #9eb5c9);
      border: 1px solid var(--border, #176f85);
      padding: 2px 6px; border-radius: 6px; background: var(--surface2, #0a3e58);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }
    #jwl-cmdk-list {
      overflow-y: auto; padding: 6px; list-style: none; margin: 0;
      scrollbar-width: thin;
    }
    #jwl-cmdk-list li { list-style: none; }
    .jwl-cmdk-group {
      font-size: 0.68rem; text-transform: uppercase; letter-spacing: 1px;
      color: var(--muted, #9eb5c9); padding: 10px 12px 4px; font-weight: 700;
    }
    .jwl-cmdk-item {
      display: grid; grid-template-columns: 28px 1fr auto;
      align-items: center; gap: 10px;
      padding: 10px 12px; border-radius: 10px; cursor: pointer;
      color: var(--text, #e2edf9); font-size: 0.95rem;
      border: 1px solid transparent;
    }
    .jwl-cmdk-item[aria-selected="true"] {
      background: color-mix(in srgb, var(--accent, #24aacc) 14%, transparent);
      border-color: var(--accent, #24aacc);
    }
    .jwl-cmdk-emoji { font-size: 1.1rem; line-height: 1; text-align: center; }
    .jwl-cmdk-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .jwl-cmdk-title mark {
      background: color-mix(in srgb, var(--accent, #24aacc) 35%, transparent);
      color: inherit; border-radius: 3px; padding: 0 2px;
    }
    .jwl-cmdk-meta {
      display: flex; align-items: center; gap: 6px;
      font-size: 0.7rem; color: var(--muted, #9eb5c9);
    }
    .jwl-cmdk-meta .pill {
      border: 1px solid var(--border, #176f85);
      border-radius: 999px; padding: 2px 8px;
      background: var(--surface2, #0a3e58);
      letter-spacing: 0.4px; text-transform: uppercase; font-weight: 600;
    }
    .jwl-cmdk-empty {
      padding: 24px 16px; text-align: center;
      color: var(--muted, #9eb5c9); font-size: 0.9rem;
    }
    .jwl-cmdk-footer {
      border-top: 1px solid var(--border, #176f85);
      padding: 8px 14px; font-size: 0.72rem; color: var(--muted, #9eb5c9);
      display: flex; gap: 16px; flex-wrap: wrap; justify-content: space-between;
    }
    .jwl-cmdk-footer kbd {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.72rem; background: var(--surface2, #0a3e58);
      border: 1px solid var(--border, #176f85); border-radius: 5px;
      padding: 1px 5px; margin: 0 2px;
    }

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

    @media (max-width: 520px) {
      #jwl-cmdk-launcher { right: 12px; bottom: calc(12px + env(safe-area-inset-bottom, 0px)); }
      #jwl-cmdk-overlay { padding: 6vh 10px 10px; }
    }
    html.theme-light #jwl-cmdk-overlay { background: rgba(15, 23, 42, 0.35); }
    html.theme-light #jwl-toast { box-shadow: 0 8px 24px rgba(2, 6, 23, 0.18); }
  `;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  /* Simple, predictable subsequence fuzzy score. Returns a positive score
   * and the matched-character index list, or null if no match. */
  function fuzzyMatch(query, text) {
    if (!query) return { score: 0, indices: [] };
    const q = query.toLowerCase();
    const t = text.toLowerCase();
    let qi = 0, score = 0, lastMatch = -2;
    const idx = [];
    for (let i = 0; i < t.length && qi < q.length; i++) {
      if (t[i] === q[qi]) {
        // Reward contiguous and word-start matches.
        let bonus = 1;
        if (i === 0 || /\s|[-_/]/.test(t[i - 1])) bonus += 3;
        if (i === lastMatch + 1) bonus += 2;
        score += bonus;
        idx.push(i);
        lastMatch = i;
        qi++;
      }
    }
    if (qi < q.length) return null;
    // Prefer shorter strings.
    score += Math.max(0, 40 - t.length) * 0.1;
    return { score, indices: idx };
  }

  function highlight(text, indices) {
    if (!indices || !indices.length) return escapeHTML(text);
    let out = '';
    let cursor = 0;
    indices.forEach((i) => {
      if (i > cursor) out += escapeHTML(text.slice(cursor, i));
      out += '<mark>' + escapeHTML(text[i]) + '</mark>';
      cursor = i + 1;
    });
    if (cursor < text.length) out += escapeHTML(text.slice(cursor));
    return out;
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function availableActions() {
    return ACTIONS.filter((a) => {
      if (a.requires === 'installable') return !!deferredInstallPrompt;
      return true;
    });
  }

  function buildCatalogue() {
    const tools = TOOLS.map((t) => Object.assign({ kind: 'tool' }, t));
    const links = QUICK_LINKS.map((l) => Object.assign({ kind: 'link' }, l));
    const actions = availableActions().map((a) => Object.assign({ kind: 'action' }, a));
    return { tools, links, actions };
  }

  function searchCatalogue(query) {
    const { tools, links, actions } = buildCatalogue();
    const pool = tools.concat(links).concat(actions);

    if (!query) {
      // Default ordering: actions first (quickest wins), then tools, then links.
      return [
        { group: 'Actions',     items: actions.map((a) => ({ item: a, indices: [] })) },
        { group: 'Tools',       items: tools.map((t) => ({ item: t, indices: [] })) },
        { group: 'Quick links', items: links.map((l) => ({ item: l, indices: [] })) },
      ].filter((g) => g.items.length);
    }

    const scored = pool.map((item) => {
      const haystack = item.title + ' ' + (item.tags || '');
      const m = fuzzyMatch(query, haystack);
      if (!m) return null;
      const titleMatch = fuzzyMatch(query, item.title);
      // Boost title matches over tag-only matches.
      const score = m.score + (titleMatch ? titleMatch.score * 2 : 0);
      return { item, score, indices: titleMatch ? titleMatch.indices : [] };
    }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 40);

    const groups = { action: [], tool: [], link: [] };
    scored.forEach((r) => groups[r.item.kind].push(r));
    const out = [];
    if (groups.action.length) out.push({ group: 'Actions', items: groups.action });
    if (groups.tool.length)   out.push({ group: 'Tools', items: groups.tool });
    if (groups.link.length)   out.push({ group: 'Quick links', items: groups.link });
    return out;
  }

  /* ---------------- palette DOM + behaviour ---------------- */

  const state = {
    open: false,
    index: 0,
    flat: []       // Flat list of items in current render order for arrow nav.
  };

  function ensurePaletteDOM() {
    if (document.getElementById('jwl-cmdk-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'jwl-cmdk-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Command palette');
    overlay.innerHTML = `
      <div id="jwl-cmdk-panel">
        <div class="jwl-cmdk-input-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>
          </svg>
          <input id="jwl-cmdk-input" type="text" autocomplete="off" spellcheck="false"
                 placeholder="Search tools, links, actions…" aria-label="Search">
          <span class="jwl-cmdk-esc">esc</span>
        </div>
        <ul id="jwl-cmdk-list" role="listbox" aria-label="Results"></ul>
        <div class="jwl-cmdk-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate · <kbd>↵</kbd> open · <kbd>esc</kbd> close</span>
          <span><kbd>Ctrl</kbd>+<kbd>K</kbd></span>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closePalette();
    });

    const input = overlay.querySelector('#jwl-cmdk-input');
    input.addEventListener('input', () => { state.index = 0; render(); });
    input.addEventListener('keydown', onKey);

    overlay.querySelector('#jwl-cmdk-list').addEventListener('click', (e) => {
      const li = e.target.closest('.jwl-cmdk-item');
      if (!li) return;
      const idx = Number(li.dataset.flatIdx);
      if (!Number.isNaN(idx)) activate(idx);
    });
    overlay.querySelector('#jwl-cmdk-list').addEventListener('mousemove', (e) => {
      const li = e.target.closest('.jwl-cmdk-item');
      if (!li) return;
      const idx = Number(li.dataset.flatIdx);
      if (!Number.isNaN(idx) && idx !== state.index) {
        state.index = idx;
        updateSelection();
      }
    });
  }

  function ensureLauncher() {
    if (document.getElementById('jwl-cmdk-launcher')) return;
    const btn = document.createElement('button');
    btn.id = 'jwl-cmdk-launcher';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Open command palette (Ctrl+K)');
    btn.setAttribute('title', 'Search (Ctrl+K)');
    btn.textContent = '⌘K';
    btn.addEventListener('click', openPalette);
    document.body.appendChild(btn);
  }

  function render() {
    const input = document.getElementById('jwl-cmdk-input');
    const list = document.getElementById('jwl-cmdk-list');
    const q = (input.value || '').trim();
    const groups = searchCatalogue(q);

    state.flat = [];
    let html = '';
    groups.forEach((g) => {
      html += '<li class="jwl-cmdk-group" role="presentation">' + escapeHTML(g.group) + '</li>';
      g.items.forEach((res) => {
        const item = res.item;
        const flatIdx = state.flat.length;
        state.flat.push(item);
        const titleHTML = res.indices && res.indices.length
          ? highlight(item.title, res.indices)
          : escapeHTML(item.title);
        const pill = item.kind === 'link' ? 'External'
                   : item.kind === 'action' ? 'Action'
                   : (item.group || 'Tool');
        const external = item.external ? '↗' : '';
        html += `<li class="jwl-cmdk-item" role="option" aria-selected="false"
                     data-flat-idx="${flatIdx}" id="jwl-cmdk-opt-${flatIdx}">
          <span class="jwl-cmdk-emoji" aria-hidden="true">${escapeHTML(item.emoji || '🔗')}</span>
          <span class="jwl-cmdk-title">${titleHTML}</span>
          <span class="jwl-cmdk-meta"><span class="pill">${escapeHTML(pill)}</span>${external ? '<span>' + external + '</span>' : ''}</span>
        </li>`;
      });
    });

    if (!state.flat.length) {
      html = '<li class="jwl-cmdk-empty">No matches for "' + escapeHTML(q) + '"</li>';
    }

    list.innerHTML = html;
    if (state.index >= state.flat.length) state.index = 0;
    updateSelection();
  }

  function updateSelection() {
    const list = document.getElementById('jwl-cmdk-list');
    const items = list.querySelectorAll('.jwl-cmdk-item');
    items.forEach((el, i) => {
      const selected = i === state.index;
      el.setAttribute('aria-selected', String(selected));
      if (selected) {
        document.getElementById('jwl-cmdk-input').setAttribute('aria-activedescendant', el.id);
        scrollIntoViewIfNeeded(el, list);
      }
    });
  }

  function scrollIntoViewIfNeeded(el, parent) {
    const er = el.getBoundingClientRect();
    const pr = parent.getBoundingClientRect();
    if (er.top < pr.top) el.scrollIntoView({ block: 'nearest' });
    else if (er.bottom > pr.bottom) el.scrollIntoView({ block: 'nearest' });
  }

  function onKey(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      state.index = Math.min(state.index + 1, Math.max(0, state.flat.length - 1));
      updateSelection();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      state.index = Math.max(0, state.index - 1);
      updateSelection();
    } else if (e.key === 'Home') {
      e.preventDefault(); state.index = 0; updateSelection();
    } else if (e.key === 'End') {
      e.preventDefault(); state.index = Math.max(0, state.flat.length - 1); updateSelection();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      activate(state.index);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closePalette();
    }
  }

  function activate(flatIdx) {
    const item = state.flat[flatIdx];
    if (!item) return;
    closePalette();

    if (item.kind === 'tool') {
      window.location.href = item.href;
    } else if (item.kind === 'link') {
      window.open(item.href, '_blank', 'noopener,noreferrer');
    } else if (item.kind === 'action') {
      handleAction(item.id);
    }
  }

  function handleAction(id) {
    switch (id) {
      case 'home':
        window.location.href = '/';
        break;
      case 'theme': {
        const btn = document.getElementById('theme-toggle');
        if (btn) btn.click();
        break;
      }
      case 'install':
        if (deferredInstallPrompt) {
          deferredInstallPrompt.prompt();
          deferredInstallPrompt.userChoice.finally(() => { deferredInstallPrompt = null; });
        } else {
          showToast('Already installed, or browser prompt not available');
        }
        break;
      case 'clear':
        clearCaches().then(() => showToast('Offline cache cleared — reload to refetch'));
        break;
      case 'about':
        showToast('James Woodward Lab · paediatric clinical tools · github.com/James-woodward-lab');
        break;
    }
  }

  async function clearCaches() {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if (navigator.serviceWorker) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch (_) { /* ignore */ }
  }

  let lastFocus = null;
  function openPalette() {
    ensurePaletteDOM();
    const overlay = document.getElementById('jwl-cmdk-overlay');
    lastFocus = document.activeElement;
    state.index = 0;
    const input = document.getElementById('jwl-cmdk-input');
    input.value = '';
    render();
    overlay.classList.add('open');
    state.open = true;
    // Allow the transition to start before focusing (avoids jank on mobile).
    setTimeout(() => input.focus(), 30);
  }

  function closePalette() {
    const overlay = document.getElementById('jwl-cmdk-overlay');
    if (!overlay) return;
    overlay.classList.remove('open');
    state.open = false;
    if (lastFocus && typeof lastFocus.focus === 'function') {
      try { lastFocus.focus(); } catch (_) {}
    }
  }

  function bindGlobalShortcut() {
    window.addEventListener('keydown', (e) => {
      const isK = (e.key === 'k' || e.key === 'K');
      const mod = e.metaKey || e.ctrlKey;
      if (mod && isK) {
        // Don't hijack shortcut if the user is inside an iframe editor etc.
        e.preventDefault();
        if (state.open) closePalette(); else openPalette();
        return;
      }
      if (e.key === '/' && !state.open) {
        const t = e.target;
        const tag = (t && t.tagName) || '';
        const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
          || (t && t.isContentEditable);
        if (isEditable) return;
        e.preventDefault();
        openPalette();
      }
    });
  }

  /* ================================================================
   * 6. First-run offline-ready toast.
   * ================================================================ */

  function maybeAnnounceOffline() {
    if (!('serviceWorker' in navigator)) return;
    const KEY = 'jwl-offline-announced';
    try { if (localStorage.getItem(KEY)) return; } catch (_) { return; }
    navigator.serviceWorker.ready.then(() => {
      try { localStorage.setItem(KEY, '1'); } catch (_) {}
      setTimeout(() => showToast('Ready to use offline · press Ctrl+K to search'), 1200);
    });
  }

  /* ================================================================
   * 7. Bootstrap.
   * ================================================================ */

  function init() {
    injectHeadMeta();
    injectStyles();
    registerSW();
    wireInstallPrompt();
    ensurePaletteDOM();
    ensureLauncher();
    bindGlobalShortcut();
    maybeAnnounceOffline();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
