(function () {
  "use strict";

  const core = window.GasCore;
  const logic = window.GasRodeoLogic;
  const gen = window.GasRodeoGenerator;
  const lassoMod = window.GasRodeoLasso;

  // crossS = seconds for a gas to cross the whole trail, independent of screen width.
  const PACES = {
    gentle: { crossS: 20, spawnS: 4.4 },
    standard: { crossS: 15, spawnS: 3.4 },
    hard: { crossS: 10.5, spawnS: 2.5 },
  };
  const RAMP_EVERY_S = 30;
  const RAMP_FACTOR = 0.93;
  const MIN_DIFFICULTY = 0.6;
  const MAX_ACTIVE = 7;
  const MAX_LANES = 4;
  const TARGET_LANES = 3;
  const LANE_SPACING = 0.9;
  const MIN_CARD_W = 140;
  const LANE_PAD = 10;
  const ROPE_DELAY_MS = 420;
  const AUTO_CONTINUE_MS = 1600;
  const MAX_REVIEW = 8;
  const SETTINGS_KEY = "gasRodeoSettings";

  const FIELDS = [
    { key: "pH", label: "pH", fmtKey: "pH", unit: "" },
    { key: "pco2Kpa", label: "PaCO\u2082", fmtKey: "pco2", unit: "kPa" },
    { key: "po2Kpa", label: "PaO\u2082", fmtKey: "po2", unit: "kPa" },
    { key: "baseExcess", label: "BE", fmtKey: "be", unit: "" },
    { key: "hco3", label: "HCO\u2083\u207B", fmtKey: "hco3", unit: "mmol/L" },
  ];

  const AGE_SHORT = { day0: "Day 0", day1to2: "Day 1-2", child: ">2 d" };

  const state = {
    phase: "attract",
    ageGroup: "day0",
    pace: "standard",
    hints: false,
    score: 0,
    misses: 0,
    streak: 0,
    caught: 0,
    correct: 0,
    entities: [],
    nextId: 1,
    spawnTimer: 0,
    rampTimer: 0,
    difficulty: 1,
    lastTs: 0,
    rafId: 0,
    captured: null,
    answered: false,
    mistakes: [],
    lanes: [],
    cardW: 190,
    cardH: 200,
    autoTimer: 0,
    ropeTimer: 0,
  };

  const els = {};
  const $ = (id) => document.getElementById(id);

  /* ---------------- Sound (tiny square-wave synth) ---------------- */

  const sfx = (function () {
    let ctx = null;
    let enabled = true;

    function ensure() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) {
          ctx = new AC();
        }
      }
      if (ctx && ctx.state === "suspended") {
        ctx.resume();
      }
      return ctx;
    }

    function tone(freq, start, dur, type, vol) {
      if (!enabled) {
        return;
      }
      const c = ensure();
      if (!c) {
        return;
      }
      const t0 = c.currentTime + start;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    }

    function seq(notes, type, step, vol) {
      notes.forEach((f, i) => tone(f, i * step, step * 1.1, type, vol || 0.05));
    }

    return {
      setEnabled(on) {
        enabled = on;
        if (on) {
          ensure();
        }
      },
      isEnabled: () => enabled,
      start: () => seq([392, 523, 659, 784], "square", 0.09),
      rope: () => seq([300, 450, 600], "square", 0.05),
      correct: () => seq([523, 659, 784, 1047], "square", 0.07),
      wrong: () => seq([220, 165], "sawtooth", 0.16, 0.04),
      escape: () => seq([440, 330, 247, 165], "triangle", 0.1, 0.08),
      innocent: () => seq([330, 262], "square", 0.1),
      faster: () => seq([523, 784], "square", 0.06),
      gameover: () => seq([392, 330, 262, 196, 131], "triangle", 0.18, 0.08),
    };
  })();

  /* ---------------- Settings ---------------- */

  function loadSettings() {
    try {
      return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
    } catch (_err) {
      return {};
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({
          ageGroup: state.ageGroup,
          pace: state.pace,
          hints: state.hints,
          sound: sfx.isEnabled(),
        })
      );
    } catch (_err) {
      /* storage unavailable */
    }
  }

  function readSettingsFromForm() {
    const age = document.querySelector('input[name="age"]:checked');
    const pace = document.querySelector('input[name="pace"]:checked');
    state.ageGroup = age ? age.value : "day0";
    state.pace = pace ? pace.value : "standard";
    state.hints = els.hintsToggle.checked;
    sfx.setEnabled(els.soundToggle.checked);
  }

  function applySettingsToForm(s) {
    const setRadio = (name, value) => {
      const input = document.querySelector(`input[name="${name}"][value="${value}"]`);
      if (input) {
        input.checked = true;
      }
    };
    if (s.ageGroup) {
      setRadio("age", s.ageGroup);
    }
    if (s.pace) {
      setRadio("pace", s.pace);
    }
    els.hintsToggle.checked = Boolean(s.hints);
    els.soundToggle.checked = s.sound !== false;
    readSettingsFromForm();
  }

  /* ---------------- Formatting ---------------- */

  function pad6(n) {
    return String(Math.max(0, n)).padStart(6, "0");
  }

  function fmt(values) {
    const be = values.baseExcess;
    const sign = be > 0 ? "+" : be < 0 ? "\u2212" : "";
    return {
      pH: values.pH.toFixed(2),
      pco2: values.pco2Kpa.toFixed(1),
      po2: values.po2Kpa.toFixed(1),
      be: sign + Math.abs(be).toFixed(1),
      hco3: values.hco3.toFixed(1),
    };
  }

  function normalRange(key) {
    if (key === "pH") {
      const r = core.getAgeNorms(state.ageGroup).pH;
      return `${r.low.toFixed(2)}\u2013${r.high.toFixed(2)}`;
    }
    if (key === "baseExcess") {
      return "\u22122 to +2";
    }
    const r = core.ARTERIAL_NORMS[key];
    const dp = key === "hco3" ? 0 : 1;
    return `${r.low.toFixed(dp)}\u2013${r.high.toFixed(dp)}`;
  }

  function trailCardHtml(ent) {
    const f = fmt(ent.values);
    const h = ent.evaluation.highlights || {};
    const rows = FIELDS.map((fd) => {
      const dir = h[fd.key] || "normal";
      const cls = state.hints && dir !== "normal" ? ` is-${dir}` : "";
      return `<div class="pv${cls}"><span class="pv-label">${fd.label}</span><span class="pv-val">${f[fd.fmtKey]}</span></div>`;
    }).join("");
    return `<div class="poster"><div class="poster-head">WANTED</div>${rows}</div>`;
  }

  function bigPosterHtml(ent, revealed) {
    const f = fmt(ent.values);
    const h = ent.evaluation.highlights || {};
    const rows = FIELDS.map((fd) => {
      const dir = h[fd.key] || "normal";
      let arrow = "";
      let label = "";
      if (revealed) {
        arrow = dir === "high" ? "\u25B2" : dir === "low" ? "\u25BC" : "\u2713";
        label = dir === "normal" ? "normal" : dir;
      }
      const cls = revealed && dir !== "normal" ? `is-${dir}` : "";
      return `<tr class="${cls}">
          <th scope="row">${fd.label}</th>
          <td class="big-val">${f[fd.fmtKey]}<span class="unit">${fd.unit}</span></td>
          <td class="big-range">${normalRange(fd.key)}</td>
          <td class="big-dir"${label ? ` aria-label="${label}"` : ""}>${arrow}</td>
        </tr>`;
    }).join("");
    return `
      <div class="poster-head">WANTED</div>
      <p class="poster-sub">for crimes against acid-base balance</p>
      <table class="big-table">
        <thead><tr><th></th><th>Value</th><th>Normal</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="poster-foot">Outlaw No. ${String(ent.id).padStart(3, "0")} &middot; ${logic.AGE_LABELS[state.ageGroup]}</p>`;
  }

  /* ---------------- HUD + feedback ---------------- */

  function renderLives(flashIndex) {
    const total = logic.MAX_MISSES;
    const left = Math.max(0, total - state.misses);
    let html = "";
    for (let i = 0; i < total; i += 1) {
      const lost = i >= left;
      const flash = i === flashIndex ? " is-flash" : "";
      html += `<span class="life${lost ? " is-lost" : ""}${flash}" aria-hidden="true">\u2605</span>`;
    }
    els.lives.innerHTML = html;
    els.lives.setAttribute("aria-label", `${left} strike${left === 1 ? "" : "s"} left`);
  }

  function updateHud() {
    els.score.textContent = pad6(state.score);
    els.streak.textContent = `x${logic.streakMultiplier(state.streak).toFixed(1)}`;
    els.best.textContent = pad6(Math.max(logic.loadBestScore(state.ageGroup), state.score));
    els.age.textContent = AGE_SHORT[state.ageGroup] || state.ageGroup;
  }

  function showBanner(text, kind) {
    els.banner.textContent = text;
    els.banner.className = "banner";
    void els.banner.offsetWidth;
    els.banner.className = `banner show ${kind || ""}`;
  }

  function floatText(x, y, text, kind) {
    const el = document.createElement("div");
    el.className = `float-text ${kind || ""}`;
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    els.playfield.appendChild(el);
    setTimeout(() => el.remove(), 950);
  }

  function shake() {
    els.stage.classList.remove("shake");
    void els.stage.offsetWidth;
    els.stage.classList.add("shake");
  }

  /* ---------------- Lanes + layout ---------------- */

  function measureCard() {
    const probe = document.createElement("div");
    probe.className = "gas-card";
    probe.style.visibility = "hidden";
    probe.innerHTML = trailCardHtml({
      values: { pH: 7.35, pco2Kpa: 5.5, po2Kpa: 11.5, baseExcess: -10.5, hco3: 24.5 },
      evaluation: { highlights: {} },
    });
    els.cards.appendChild(probe);
    state.cardW = probe.offsetWidth || state.cardW;
    state.cardH = probe.offsetHeight || state.cardH;
    probe.remove();
  }

  // Shrink cards (down to MIN_CARD_W) until TARGET_LANES fit the trail height.
  function fitCards() {
    els.playfield.style.removeProperty("--card-w");
    measureCard();
    const maxH = (els.playfield.clientHeight - LANE_PAD * 2) / (1 + (TARGET_LANES - 1) * LANE_SPACING);
    for (let i = 0; i < 3 && state.cardH > maxH && state.cardW > MIN_CARD_W; i += 1) {
      const w = Math.max(MIN_CARD_W, Math.floor(state.cardW * (maxH / state.cardH)) - 2);
      els.playfield.style.setProperty("--card-w", `${w}px`);
      measureCard();
    }
    computeLanes();
  }

  function computeLanes() {
    const h = els.playfield.clientHeight;
    const range = Math.max(0, h - LANE_PAD * 2 - state.cardH);
    const count = Math.max(1, Math.min(MAX_LANES, Math.floor(range / (state.cardH * LANE_SPACING)) + 1));
    state.lanes = [];
    for (let i = 0; i < count; i += 1) {
      const centre = count === 1 ? h / 2 : LANE_PAD + state.cardH / 2 + (range * i) / (count - 1);
      state.lanes.push(centre);
    }
    els.ruts.innerHTML = state.lanes
      .map((y) => `<div class="rut" style="top:${Math.round(y + state.cardH / 2 - 12)}px"></div>`)
      .join("");
    state.entities.forEach((ent) => {
      if (ent.lane >= count) {
        ent.lane = count - 1;
      }
      positionCard(ent);
    });
  }

  function laneTop(lane) {
    return (state.lanes[lane] || state.cardH / 2) - state.cardH / 2;
  }

  function positionCard(ent) {
    if (!ent.el) {
      return;
    }
    ent.el.style.transform = `translate3d(${ent.x.toFixed(1)}px, ${laneTop(ent.lane).toFixed(1)}px, 0)`;
    if (state.hints && ent.evaluation.isMustCatch && ent.x > els.playfield.clientWidth * 0.6) {
      ent.el.classList.add("hint-pulse");
    }
  }

  function cardCentre(ent) {
    return { x: ent.x + state.cardW / 2, y: laneTop(ent.lane) + state.cardH / 2 };
  }

  /* ---------------- Phases ---------------- */

  function setPhase(next) {
    state.phase = next;
    const inGame = next === "running" || next === "paused" || next === "roping" || next === "classify";
    els.screenAttract.hidden = next !== "attract";
    els.screenGameOver.hidden = next !== "gameover";
    els.screenGame.hidden = !inGame;
    els.showdown.hidden = next !== "classify";
    els.pauseOverlay.hidden = next !== "paused";
    els.stage.classList.toggle("is-frozen", next !== "running");
    if (next === "running") {
      startLoop();
    } else {
      stopLoop();
    }
  }

  function startLoop() {
    if (!state.rafId) {
      state.lastTs = 0;
      state.rafId = requestAnimationFrame(tick);
    }
  }

  function stopLoop() {
    if (state.rafId) {
      cancelAnimationFrame(state.rafId);
      state.rafId = 0;
    }
  }

  function pxPerSecond() {
    const travel = els.playfield.clientWidth + state.cardW;
    return travel / (PACES[state.pace].crossS * state.difficulty);
  }

  function nextSpawnDelay() {
    return PACES[state.pace].spawnS * state.difficulty * (0.8 + Math.random() * 0.4);
  }

  function tick(ts) {
    state.rafId = 0;
    if (state.phase !== "running") {
      return;
    }
    if (!state.lastTs) {
      state.lastTs = ts;
    }
    const dt = Math.min(0.05, (ts - state.lastTs) / 1000);
    state.lastTs = ts;

    state.rampTimer += dt;
    if (state.rampTimer >= RAMP_EVERY_S && state.difficulty > MIN_DIFFICULTY) {
      state.rampTimer = 0;
      state.difficulty = Math.max(MIN_DIFFICULTY, state.difficulty * RAMP_FACTOR);
      showBanner("Faster, partner!");
      sfx.faster();
    }

    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      state.spawnTimer = spawnEntity() ? nextSpawnDelay() : 0.35;
    }

    const fieldW = els.playfield.clientWidth;
    const step = pxPerSecond() * dt;
    for (const ent of state.entities) {
      if (ent.state !== "active") {
        continue;
      }
      ent.x += step;
      if (ent.x > fieldW) {
        escapeEntity(ent);
        if (state.phase !== "running") {
          break;
        }
      } else {
        positionCard(ent);
      }
    }
    state.entities = state.entities.filter((e) => e.state !== "removed");

    if (state.phase === "running") {
      state.rafId = requestAnimationFrame(tick);
    }
  }

  /* ---------------- Entities ---------------- */

  function spawnEntity() {
    const active = state.entities.filter((e) => e.state === "active" || e.state === "captured");
    if (active.length >= MAX_ACTIVE) {
      return false;
    }
    const busy = new Set(active.filter((e) => e.x < state.cardW * 0.5).map((e) => e.lane));
    const free = state.lanes.map((_, i) => i).filter((i) => !busy.has(i));
    if (!free.length) {
      return false;
    }
    const lane = free[Math.floor(Math.random() * free.length)];
    const packed = gen.generateGas(state.ageGroup);
    const ent = {
      id: state.nextId++,
      lane,
      x: -state.cardW,
      values: packed.values,
      evaluation: packed.evaluation,
      state: "active",
      el: null,
    };
    const el = document.createElement("div");
    el.className = "gas-card";
    el.dataset.entityId = String(ent.id);
    el.style.zIndex = String(ent.id);
    el.innerHTML = trailCardHtml(ent);
    els.cards.appendChild(el);
    ent.el = el;
    positionCard(ent);
    state.entities.push(ent);
    return true;
  }

  function removeEntity(ent) {
    ent.state = "removed";
    if (ent.el) {
      ent.el.remove();
      ent.el = null;
    }
  }

  function escapeEntity(ent) {
    removeEntity(ent);
    if (!ent.evaluation.isMustCatch) {
      return;
    }
    state.misses += 1;
    state.streak = 0;
    state.mistakes.push({ values: ent.values, evaluation: ent.evaluation, kind: "escaped" });
    renderLives(logic.MAX_MISSES - state.misses);
    updateHud();
    shake();
    sfx.escape();
    showBanner("One got away!", "bad");
    if (state.misses >= logic.MAX_MISSES) {
      gameOver();
    }
  }

  /* ---------------- Lasso + roping ---------------- */

  function handleLasso(poly) {
    if (state.phase !== "running") {
      return;
    }
    const activeEls = state.entities.filter((e) => e.state === "active" && e.el).map((e) => e.el);
    const hit = state.lassoApi.hitTestCards(poly, activeEls);
    if (!hit) {
      const cx = poly.reduce((s, p) => s + p.x, 0) / poly.length;
      const cy = poly.reduce((s, p) => s + p.y, 0) / poly.length;
      floatText(cx, cy, "Missed!", "bad");
      return;
    }
    const ent = state.entities.find((e) => e.id === Number(hit.id) && e.state === "active");
    if (!ent) {
      return;
    }
    if (ent.evaluation.isMustCatch) {
      ropeEntity(ent);
    } else {
      arrestInnocent(ent);
    }
  }

  function ropeEntity(ent) {
    ent.state = "captured";
    state.captured = ent;
    state.caught += 1;
    state.score += logic.SCORE.catchAbnormal;
    const c = cardCentre(ent);
    floatText(c.x, c.y - state.cardH / 2 - 10, `+${logic.SCORE.catchAbnormal}`, "good");
    ent.el.classList.add("is-roped");
    sfx.rope();
    updateHud();
    setPhase("roping");
    state.ropeTimer = setTimeout(() => {
      if (state.phase === "roping") {
        openShowdown();
      }
    }, ROPE_DELAY_MS);
  }

  function arrestInnocent(ent) {
    ent.state = "removed";
    state.streak = 0;
    state.score = Math.max(0, state.score + logic.SCORE.falseLasso);
    const c = cardCentre(ent);
    floatText(c.x, c.y - state.cardH / 2 - 10, `${logic.SCORE.falseLasso} Innocent!`, "bad");
    const el = ent.el;
    ent.el = null;
    if (el) {
      el.classList.add("is-innocent");
      setTimeout(() => el.remove(), 750);
    }
    sfx.innocent();
    updateHud();
  }

  function ropeMostUrgent() {
    if (state.phase !== "running") {
      return;
    }
    const target = state.entities
      .filter((e) => e.state === "active" && e.evaluation.isMustCatch)
      .sort((a, b) => b.x - a.x)[0];
    if (target) {
      ropeEntity(target);
    }
  }

  /* ---------------- Showdown (classification) ---------------- */

  function buildChargeButtons() {
    els.chargeButtons.innerHTML = "";
    logic.PRIMARY_DISORDERS.forEach((label, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "charge-btn";
      btn.dataset.charge = label;
      btn.innerHTML = `<span class="charge-key">${i + 1}</span><span>${label}</span>`;
      btn.addEventListener("click", () => submitCharge(label));
      els.chargeButtons.appendChild(btn);
    });
  }

  function chargeButtons() {
    return Array.from(els.chargeButtons.querySelectorAll(".charge-btn"));
  }

  function openShowdown() {
    const ent = state.captured;
    state.answered = false;
    if (ent.el) {
      ent.el.classList.add("is-captured");
    }
    els.suspect.innerHTML = bigPosterHtml(ent, false);
    els.verdict.hidden = true;
    els.verdict.innerHTML = "";
    chargeButtons().forEach((btn) => {
      btn.disabled = false;
      btn.classList.remove("is-correct", "is-wrong");
    });
    setPhase("classify");
    els.showdown.scrollTop = 0;
    const first = chargeButtons()[0];
    if (first) {
      first.focus({ preventScroll: true });
    }
  }

  function submitCharge(choice) {
    if (state.phase !== "classify" || state.answered) {
      return;
    }
    state.answered = true;
    const ent = state.captured;
    const correct = ent.evaluation.primary;
    const isRight = choice === correct;

    chargeButtons().forEach((btn) => {
      btn.disabled = true;
      if (btn.dataset.charge === correct) {
        btn.classList.add("is-correct");
      } else if (btn.dataset.charge === choice) {
        btn.classList.add("is-wrong");
      }
    });

    let title;
    let body;
    if (isRight) {
      state.streak += 1;
      state.correct += 1;
      const bonus = Math.round(logic.SCORE.classifyCorrect * logic.streakMultiplier(state.streak));
      state.score += bonus;
      title = `Bullseye! +${bonus}`;
      body = `<p>Charge: <strong>${correct}</strong></p>`;
      sfx.correct();
    } else {
      state.streak = 0;
      state.score = Math.max(0, state.score + logic.SCORE.wrongClassify);
      state.mistakes.push({ values: ent.values, evaluation: ent.evaluation, kind: "wrong", chosen: choice });
      title = `Wrong outlaw! ${logic.SCORE.wrongClassify}`;
      body = `<p>You said: ${choice}</p><p>Real charge: <strong>${correct}</strong></p>`;
      sfx.wrong();
    }

    els.suspect.innerHTML = bigPosterHtml(ent, true);
    els.verdict.className = `verdict ${isRight ? "good" : "bad"}`;
    els.verdict.innerHTML = `
      <p class="verdict-title">${title}</p>
      ${body}
      <p class="verdict-hint">${logic.TEACHING_HINTS[correct] || ""}</p>
      <button type="button" class="px-btn" id="btn-ride-on">Ride on &#9654;</button>`;
    els.verdict.hidden = false;
    const rideBtn = $("btn-ride-on");
    rideBtn.addEventListener("click", rideOn);
    rideBtn.focus({ preventScroll: true });
    updateHud();

    if (isRight) {
      state.autoTimer = setTimeout(rideOn, AUTO_CONTINUE_MS);
    }
  }

  function rideOn() {
    if (state.phase !== "classify") {
      return;
    }
    clearTimeout(state.autoTimer);
    if (state.captured) {
      removeEntity(state.captured);
      state.captured = null;
    }
    state.entities = state.entities.filter((e) => e.state !== "removed");
    setPhase("running");
    els.playfield.focus({ preventScroll: true });
  }

  /* ---------------- Round lifecycle ---------------- */

  function clearTimers() {
    clearTimeout(state.autoTimer);
    clearTimeout(state.ropeTimer);
  }

  function resetRound() {
    clearTimers();
    state.entities.forEach(removeEntity);
    state.entities = [];
    els.cards.innerHTML = "";
    els.playfield.querySelectorAll(".float-text").forEach((el) => el.remove());
    Object.assign(state, {
      score: 0,
      misses: 0,
      streak: 0,
      caught: 0,
      correct: 0,
      spawnTimer: 0.6,
      rampTimer: 0,
      difficulty: 1,
      captured: null,
      answered: false,
      mistakes: [],
    });
  }

  function startGame() {
    readSettingsFromForm();
    saveSettings();
    resetRound();
    setPhase("running");
    fitCards();
    renderLives();
    updateHud();
    sfx.start();
    showBanner("Round 'em up!");
    els.playfield.focus({ preventScroll: true });
  }

  function togglePause() {
    if (state.phase === "running") {
      setPhase("paused");
      $("btn-resume").focus({ preventScroll: true });
    } else if (state.phase === "paused") {
      setPhase("running");
      els.playfield.focus({ preventScroll: true });
    }
  }

  function quitToTitle() {
    resetRound();
    setPhase("attract");
    refreshAttractBest();
  }

  function reviewItemHtml(m) {
    const f = fmt(m.values);
    const correct = m.evaluation.primary;
    const tag =
      m.kind === "escaped"
        ? `<span class="review-tag">Escaped</span>`
        : `<span class="review-tag">Wrong charge</span>`;
    const said = m.kind === "wrong" ? `<div>You said: ${m.chosen}</div>` : "";
    return `<li class="review-item">
        <div class="review-vals">pH ${f.pH} &middot; PaCO\u2082 ${f.pco2} &middot; HCO\u2083\u207B ${f.hco3} &middot; BE ${f.be}</div>
        <div class="review-ans">${tag}Charge: <strong>${correct}</strong></div>
        ${said}
        <div class="review-hint">${logic.TEACHING_HINTS[correct] || ""}</div>
      </li>`;
  }

  function gameOver() {
    clearTimers();
    const prevBest = logic.loadBestScore(state.ageGroup);
    const best = logic.saveBestScore(state.ageGroup, state.score);
    els.goScore.textContent = pad6(state.score);
    els.goBest.textContent = pad6(best);
    els.goCaught.textContent = String(state.caught);
    els.goAccuracy.textContent = state.caught
      ? `${state.correct}/${state.caught}`
      : "-";
    els.goRecord.hidden = !(state.score > prevBest && state.score > 0);
    const recent = state.mistakes.slice(-MAX_REVIEW).reverse();
    els.goReview.innerHTML = recent.length
      ? recent.map(reviewItemHtml).join("")
      : `<li class="review-empty">A clean ride - no mistakes to review.</li>`;
    sfx.gameover();
    setTimeout(() => {
      setPhase("gameover");
      window.scrollTo(0, 0);
      $("btn-again").focus({ preventScroll: true });
    }, 650);
    state.phase = "ending";
    stopLoop();
  }

  function refreshAttractBest() {
    readSettingsFromForm();
    els.attractBest.textContent = pad6(logic.loadBestScore(state.ageGroup));
  }

  /* ---------------- Input ---------------- */

  function onKeyDown(e) {
    if (state.phase === "classify") {
      if (!state.answered && /^[1-8]$/.test(e.key)) {
        const label = logic.PRIMARY_DISORDERS[Number(e.key) - 1];
        if (label) {
          e.preventDefault();
          submitCharge(label);
        }
      } else if (state.answered && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        rideOn();
      }
      return;
    }
    if (e.key === "p" || e.key === "P" || e.key === "Escape") {
      if (state.phase === "running" || state.phase === "paused") {
        e.preventDefault();
        togglePause();
      }
      return;
    }
    if (state.phase === "running" && e.code === "Space") {
      e.preventDefault();
      ropeMostUrgent();
    }
  }

  function init() {
    els.screenAttract = $("screen-attract");
    els.screenGame = $("screen-game");
    els.screenGameOver = $("screen-gameover");
    els.stage = $("stage");
    els.playfield = $("playfield");
    els.cards = $("cards-layer");
    els.ruts = $("ruts");
    els.lassoSvg = $("lasso-svg");
    els.banner = $("banner");
    els.showdown = $("showdown");
    els.chargeButtons = $("charge-buttons");
    els.suspect = $("suspect");
    els.verdict = $("verdict");
    els.pauseOverlay = $("pause-overlay");
    els.score = $("hud-score");
    els.streak = $("hud-streak");
    els.best = $("hud-best");
    els.age = $("hud-age");
    els.lives = $("hud-lives");
    els.hintsToggle = $("hints-toggle");
    els.soundToggle = $("sound-toggle");
    els.attractBest = $("attract-best");
    els.goScore = $("go-score");
    els.goBest = $("go-best");
    els.goCaught = $("go-caught");
    els.goAccuracy = $("go-accuracy");
    els.goRecord = $("go-record");
    els.goReview = $("go-review");

    applySettingsToForm(loadSettings());
    refreshAttractBest();
    $("btn-mute").style.opacity = sfx.isEnabled() ? "1" : "0.5";
    buildChargeButtons();

    state.lassoApi = lassoMod.createLasso(els.playfield, els.lassoSvg, handleLasso);

    document.querySelectorAll('input[name="age"], input[name="pace"], #hints-toggle, #sound-toggle').forEach((input) => {
      input.addEventListener("change", () => {
        refreshAttractBest();
        saveSettings();
      });
    });

    $("btn-start").addEventListener("click", startGame);
    $("btn-again").addEventListener("click", startGame);
    $("btn-title").addEventListener("click", quitToTitle);
    $("btn-pause").addEventListener("click", togglePause);
    $("btn-resume").addEventListener("click", togglePause);
    $("btn-quit").addEventListener("click", quitToTitle);
    $("btn-mute").addEventListener("click", () => {
      const on = !sfx.isEnabled();
      sfx.setEnabled(on);
      els.soundToggle.checked = on;
      $("btn-mute").style.opacity = on ? "1" : "0.5";
      saveSettings();
    });

    document.addEventListener("keydown", onKeyDown);

    window.addEventListener("resize", () => {
      if (!els.screenGame.hidden) {
        fitCards();
      }
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden && state.phase === "running") {
        togglePause();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
