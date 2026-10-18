(function () {
  "use strict";

  const core = window.GasCore;
  const bank = window.BicarbBanditScenarios;
  if (!core || !bank) {
    throw new Error("gas-core.js and scenarios.js must load before game.js");
  }

  const MAX_GAP = 10;
  const START_GAP = 5;
  const MAX_STRIKES = 3;
  const MAX_REVIEW = 8;
  const SETTINGS_KEY = "bicarbBanditSettings";
  const BEST_KEY = "bicarbBanditBest";

  const PACES = {
    gentle: 20,
    standard: 14,
    hard: 9,
  };

  const AGE_SHORT = { day0: "Day 0", day1to2: "Day 1-2", child: ">2 d" };
  const AGE_LABELS = {
    day0: "Day 0 (0–24h)",
    day1to2: "Day 1–2",
    child: ">2 days",
  };

  const GAS_FIELDS = [
    { key: "pH", label: "pH", dp: 2 },
    { key: "pco2Kpa", label: "PaCO₂", dp: 1, unit: "kPa" },
    { key: "po2Kpa", label: "PaO₂", dp: 1, unit: "kPa" },
    { key: "baseExcess", label: "BE", dp: 1 },
    { key: "hco3", label: "HCO₃⁻", dp: 1, unit: "mmol/L" },
  ];

  const LAB_FIELDS = [
    { key: "na", label: "Na⁺", dp: 0, unit: "mmol/L" },
    { key: "k", label: "K⁺", dp: 1, unit: "mmol/L" },
    { key: "ca", label: "Ca²⁺", dp: 2, unit: "mmol/L" },
    { key: "cl", label: "Cl⁻", dp: 0, unit: "mmol/L" },
    { key: "hb", label: "Hb", dp: 0, unit: "g/L" },
    { key: "glucose", label: "Glucose", dp: 1, unit: "mmol/L" },
  ];

  const LAB_RANGES = {
    na: { low: 135, high: 145 },
    k: { low: 3.5, high: 6.0 },
    ca: { low: 1.1, high: 1.35 },
    cl: { low: 98, high: 110 },
    hb: { low: 120, high: 220 },
    glucose: { low: 2.6, high: 7.0 },
  };

  const state = {
    phase: "attract",
    ageGroup: "day0",
    pace: "standard",
    score: 0,
    streak: 0,
    gap: START_GAP,
    strikes: 0,
    correct: 0,
    answered: 0,
    queue: [],
    queueIndex: 0,
    scenario: null,
    orderIds: [],
    timerLeft: 14,
    timerId: 0,
    feedbackOpen: false,
    mistakes: [],
    autoTimer: 0,
  };

  const els = {};
  const $ = (id) => document.getElementById(id);

  /* ---------- SFX ---------- */
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
      correct: () => seq([523, 659, 784, 1047], "square", 0.07),
      wrong: () => seq([220, 165], "sawtooth", 0.16, 0.04),
      timeout: () => seq([330, 247, 196], "triangle", 0.12, 0.06),
      catch: () => seq([523, 659, 784, 988, 1175], "square", 0.08),
      escape: () => seq([392, 330, 262, 196, 131], "triangle", 0.18, 0.08),
      tick: () => tone(880, 0, 0.04, "square", 0.03),
    };
  })();

  /* ---------- Settings / best ---------- */
  function loadSettings() {
    try {
      return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
    } catch (_e) {
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
          sound: sfx.isEnabled(),
        })
      );
    } catch (_e) {
      /* ignore */
    }
  }

  function loadBest() {
    const n = Number.parseInt(localStorage.getItem(BEST_KEY) || "0", 10);
    return Number.isFinite(n) ? n : 0;
  }

  function saveBest(score) {
    const prev = loadBest();
    if (score > prev) {
      localStorage.setItem(BEST_KEY, String(score));
      return score;
    }
    return prev;
  }

  function readForm() {
    const age = document.querySelector('input[name="age"]:checked');
    const pace = document.querySelector('input[name="pace"]:checked');
    state.ageGroup = age ? age.value : "day0";
    state.pace = pace ? pace.value : "standard";
    sfx.setEnabled(els.soundToggle.checked);
  }

  function applyForm(s) {
    const setRadio = (name, value) => {
      const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
      if (el) {
        el.checked = true;
      }
    };
    if (s.ageGroup) {
      setRadio("age", s.ageGroup);
    }
    if (s.pace) {
      setRadio("pace", s.pace);
    }
    els.soundToggle.checked = s.sound !== false;
    readForm();
  }

  /* ---------- Format ---------- */
  function pad6(n) {
    return String(Math.max(0, Math.round(n))).padStart(6, "0");
  }

  function fmtVal(values, field) {
    let v = values[field.key];
    if (field.key === "baseExcess") {
      const sign = v > 0 ? "+" : v < 0 ? "\u2212" : "";
      return sign + Math.abs(v).toFixed(field.dp);
    }
    return Number(v).toFixed(field.dp);
  }

  function fieldDir(values, key, highlights) {
    if (highlights[key]) return highlights[key];
    const range = LAB_RANGES[key];
    const value = values[key];
    if (!range || value == null) return "normal";
    if (value < range.low) return "low";
    if (value > range.high) return "high";
    return "normal";
  }

  function fieldRows(values, fields, highlights) {
    return fields.map((fd) => {
      const dir = fieldDir(values, fd.key, highlights);
      const cls = dir === "high" || dir === "low" ? ` is-${dir}` : "";
      const unit = fd.unit ? ` <span class="unit">${fd.unit}</span>` : "";
      return `<div class="gas-row"><span class="gas-label">${fd.label}</span><span class="gas-val${cls}">${fmtVal(values, fd)}${unit}</span></div>`;
    }).join("");
  }

  function posterHtml(values) {
    const h = core.paramHighlights(values, state.ageGroup);
    return `
      <div class="poster-head">WANTED</div>
      <p class="poster-sub">stolen panel · Bicarbonate Bandit</p>
      <div class="gas-cols">
        <div>
          <p class="gas-col-title">Acid–base</p>
          ${fieldRows(values, GAS_FIELDS, h)}
        </div>
        <div>
          <p class="gas-col-title">Labs</p>
          ${fieldRows(values, LAB_FIELDS, h)}
        </div>
      </div>
      <p class="poster-sub" style="margin-top:8px">${AGE_LABELS[state.ageGroup]}</p>`;
  }

  function contextChips(ctx) {
    if (!ctx) {
      return "";
    }
    return Object.entries(ctx)
      .map(([k, v]) => `<span class="chip">${k}: ${v}</span>`)
      .join("");
  }

  /* ---------- HUD / chase ---------- */
  function renderLives() {
    const left = Math.max(0, MAX_STRIKES - state.strikes);
    let html = "";
    for (let i = 0; i < MAX_STRIKES; i += 1) {
      html += `<span class="life${i >= left ? " is-lost" : ""}" aria-hidden="true">\u2605</span>`;
    }
    els.lives.innerHTML = html;
    els.lives.setAttribute("aria-label", `${left} strike${left === 1 ? "" : "s"} left`);
  }

  function updateHud() {
    els.score.textContent = pad6(state.score);
    els.streak.textContent = `x${state.streak}`;
    els.gap.textContent = String(state.gap);
    els.timer.textContent = String(Math.max(0, Math.ceil(state.timerLeft)));
    els.timerBadge.classList.toggle("timer-urgent", state.timerLeft <= 5 && state.phase === "chasing");
    els.age.textContent = AGE_SHORT[state.ageGroup] || state.ageGroup;
    renderLives();
    updateChaseSprites();
  }

  function updateChaseSprites() {
    // gap 0 = caught (bandit left of posse-ish / overlapping), gap MAX = at canyon
    const track = 78; // percent usable width before canyon
    const banditPct = 8 + (state.gap / MAX_GAP) * track;
    const possePct = Math.max(2, banditPct - 14 - (MAX_GAP - state.gap) * 0.4);
    els.bandit.style.left = `${banditPct}%`;
    els.posse.style.left = `${possePct}%`;
  }

  function showBanner(text, kind) {
    els.banner.textContent = text;
    els.banner.className = "banner";
    void els.banner.offsetWidth;
    els.banner.className = `banner show ${kind || ""}`;
  }

  function shake() {
    els.stage.classList.remove("shake");
    void els.stage.offsetWidth;
    els.stage.classList.add("shake");
  }

  /* ---------- Phases ---------- */
  function setPhase(next) {
    state.phase = next;
    els.screenAttract.hidden = next !== "attract";
    els.screenGame.hidden = next !== "chasing" && next !== "feedback" && next !== "paused";
    els.screenEnd.hidden = next !== "caught" && next !== "escaped";
    els.pauseOverlay.hidden = next !== "paused";
    if (next !== "chasing") {
      stopTimer();
    }
  }

  function refreshAttractBest() {
    readForm();
    els.attractBest.textContent = pad6(loadBest());
  }

  /* ---------- Timer ---------- */
  function stopTimer() {
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = 0;
    }
  }

  function startTimer() {
    stopTimer();
    state.timerLeft = PACES[state.pace] || 14;
    updateHud();
    state.timerId = setInterval(() => {
      if (state.phase !== "chasing") {
        return;
      }
      state.timerLeft -= 1;
      if (state.timerLeft <= 5 && state.timerLeft > 0) {
        sfx.tick();
      }
      updateHud();
      if (state.timerLeft <= 0) {
        stopTimer();
        resolveAnswer(null, true);
      }
    }, 1000);
  }

  /* ---------- Scenario ---------- */
  function nextScenario() {
    if (state.queueIndex >= state.queue.length) {
      state.queue = bank.scenariosForAge(state.ageGroup);
      state.queueIndex = 0;
    }
    state.scenario = state.queue[state.queueIndex];
    state.queueIndex += 1;
    state.feedbackOpen = false;
    state.orderIds = bank.shuffle(bank.ACTIONS.map((a) => a.id));

    els.vignette.textContent = state.scenario.vignette;
    els.chips.innerHTML = contextChips(state.scenario.context);
    els.poster.innerHTML = posterHtml(state.scenario.values);
    els.feedback.hidden = true;
    els.feedback.innerHTML = "";

    buildOrderButtons();
    setPhase("chasing");
    startTimer();
    updateHud();
    const first = els.orderButtons.querySelector(".order-btn");
    if (first) {
      first.focus({ preventScroll: true });
    }
  }

  function buildOrderButtons() {
    els.orderButtons.innerHTML = "";
    state.orderIds.forEach((id, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "order-btn";
      btn.dataset.action = id;
      btn.innerHTML = `<span class="order-key">${i + 1}</span><span>${bank.ACTION_LABELS[id]}</span>`;
      btn.addEventListener("click", () => resolveAnswer(id, false));
      els.orderButtons.appendChild(btn);
    });
  }

  function orderButtons() {
    return Array.from(els.orderButtons.querySelectorAll(".order-btn"));
  }

  /* ---------- Resolve ---------- */
  function resolveAnswer(chosen, timedOut) {
    if (state.phase !== "chasing" || state.feedbackOpen) {
      return;
    }
    state.feedbackOpen = true;
    stopTimer();
    state.answered += 1;

    const scenario = state.scenario;
    const correctId = scenario.correctAction;
    const correctLabel = bank.ACTION_LABELS[correctId];
    const isRight = !timedOut && chosen === correctId;
    const remaining = Math.max(0, state.timerLeft);

    orderButtons().forEach((btn) => {
      btn.disabled = true;
      if (btn.dataset.action === correctId) {
        btn.classList.add("is-correct");
      } else if (chosen && btn.dataset.action === chosen) {
        btn.classList.add("is-wrong");
      }
    });

    let flavour;
    let clinical;
    if (isRight) {
      state.streak += 1;
      state.correct += 1;
      state.strikes = 0;
      const closeBy = state.gap <= 2 ? 1 : 2;
      state.gap = Math.max(0, state.gap - closeBy);
      const bonus = Math.round(remaining * 5);
      const points = 100 + bonus;
      state.score += points;
      flavour = `Got 'em! +${points}`;
      clinical = scenario.hint;
      showBanner("Got 'em!", "good");
      sfx.correct();
    } else {
      state.streak = 0;
      state.strikes += 1;
      state.score = Math.max(0, state.score - 10);
      if (timedOut) {
        state.gap = Math.min(MAX_GAP, state.gap + 1);
        flavour = "Too slow, partner!";
        showBanner("Too slow, partner!", "bad");
        sfx.timeout();
      } else {
        state.gap = Math.min(MAX_GAP, state.gap + 2);
        flavour = "Bandit slipped away!";
        showBanner("Bandit slipped away!", "bad");
        sfx.wrong();
      }
      shake();
      const wrongHint =
        chosen && scenario.wrongHints && scenario.wrongHints[chosen]
          ? scenario.wrongHints[chosen]
          : "";
      clinical = `${scenario.hint}${wrongHint ? " " + wrongHint : ""}`;
      state.mistakes.push({
        vignette: scenario.vignette,
        correctAction: correctId,
        chosen: timedOut ? null : chosen,
        timedOut,
      });
    }

    els.feedback.className = `feedback ${isRight ? "good" : "bad"}`;
    els.feedback.innerHTML = `
      <p class="fb-title">${flavour}</p>
      <p>Right order: <strong>${correctLabel}</strong></p>
      ${
        !isRight && chosen
          ? `<p>You sent: ${bank.ACTION_LABELS[chosen] || chosen}</p>`
          : timedOut
            ? "<p>Timer ran out — no order sent.</p>"
            : ""
      }
      <p class="fb-hint">${clinical}</p>
      <button type="button" class="px-btn" id="btn-ride-on">Ride on &#9654;</button>`;
    els.feedback.hidden = false;
    setPhase("feedback");
    updateHud();

    const ride = $("btn-ride-on");
    ride.addEventListener("click", afterFeedback);
    ride.focus({ preventScroll: true });

    if (isRight) {
      state.autoTimer = setTimeout(afterFeedback, 1600);
    }
  }

  function afterFeedback() {
    if (state.phase !== "feedback") {
      return;
    }
    clearTimeout(state.autoTimer);
    if (state.gap <= 0) {
      endGame(true);
      return;
    }
    if (state.gap >= MAX_GAP || state.strikes >= MAX_STRIKES) {
      endGame(false);
      return;
    }
    nextScenario();
  }

  /* ---------- Round lifecycle ---------- */
  function resetRound() {
    clearTimeout(state.autoTimer);
    stopTimer();
    Object.assign(state, {
      score: 0,
      streak: 0,
      gap: START_GAP,
      strikes: 0,
      correct: 0,
      answered: 0,
      queue: bank.scenariosForAge(state.ageGroup),
      queueIndex: 0,
      scenario: null,
      feedbackOpen: false,
      mistakes: [],
    });
  }

  function startGame() {
    readForm();
    saveSettings();
    resetRound();
    sfx.start();
    showBanner("Form the posse!");
    nextScenario();
  }

  function endGame(caught) {
    stopTimer();
    clearTimeout(state.autoTimer);
    const prevBest = loadBest();
    const best = saveBest(state.score);
    els.endKicker.textContent = caught ? "Bandit in custody" : "The Bicarbonate Bandit got away";
    els.endKicker.classList.toggle("is-lose", !caught);
    els.endTitle.textContent = caught ? "Posse wins" : "Escaped over the canyon";
    els.endScore.textContent = pad6(state.score);
    els.endBest.textContent = pad6(best);
    els.endCorrect.textContent = String(state.correct);
    els.endAccuracy.textContent = state.answered
      ? `${state.correct}/${state.answered}`
      : "-";
    els.endRecord.hidden = !(state.score > prevBest && state.score > 0);

    const recent = state.mistakes.slice(-MAX_REVIEW).reverse();
    els.endReview.innerHTML = recent.length
      ? recent
          .map((m) => {
            const tag = m.timedOut
              ? '<span class="review-tag">Timeout</span>'
              : '<span class="review-tag">Wrong order</span>';
            const said = m.chosen
              ? `<div>You sent: ${bank.ACTION_LABELS[m.chosen]}</div>`
              : "";
            return `<li class="review-item">
              <div>${m.vignette}</div>
              <div class="review-ans">${tag}Order: <strong>${bank.ACTION_LABELS[m.correctAction]}</strong></div>
              ${said}
            </li>`;
          })
          .join("")
      : '<li class="review-empty">Clean chase — no missed warrants to review.</li>';

    if (caught) {
      sfx.catch();
    } else {
      sfx.escape();
    }
    setPhase(caught ? "caught" : "escaped");
    window.scrollTo(0, 0);
    $("btn-again").focus({ preventScroll: true });
  }

  function quitToTitle() {
    clearTimeout(state.autoTimer);
    stopTimer();
    setPhase("attract");
    refreshAttractBest();
  }

  function togglePause() {
    if (state.phase === "chasing") {
      stopTimer();
      setPhase("paused");
      $("btn-resume").focus({ preventScroll: true });
    } else if (state.phase === "paused") {
      setPhase("chasing");
      // resume with remaining time
      state.timerId = setInterval(() => {
        if (state.phase !== "chasing") {
          return;
        }
        state.timerLeft -= 1;
        if (state.timerLeft <= 5 && state.timerLeft > 0) {
          sfx.tick();
        }
        updateHud();
        if (state.timerLeft <= 0) {
          stopTimer();
          resolveAnswer(null, true);
        }
      }, 1000);
      updateHud();
    }
  }

  /* ---------- Input ---------- */
  function onKeyDown(e) {
    if (state.phase === "feedback") {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        afterFeedback();
      }
      return;
    }
    if (e.key === "p" || e.key === "P" || e.key === "Escape") {
      if (state.phase === "chasing" || state.phase === "paused") {
        e.preventDefault();
        togglePause();
      }
      return;
    }
    if (state.phase === "chasing" && /^[1-8]$/.test(e.key)) {
      const idx = Number(e.key) - 1;
      const id = state.orderIds[idx];
      if (id) {
        e.preventDefault();
        resolveAnswer(id, false);
      }
    }
  }

  function init() {
    els.screenAttract = $("screen-attract");
    els.screenGame = $("screen-game");
    els.screenEnd = $("screen-end");
    els.stage = $("stage");
    els.chaseStrip = $("chase-strip");
    els.posse = $("sprite-posse");
    els.bandit = $("sprite-bandit");
    els.vignette = $("vignette-text");
    els.chips = $("context-chips");
    els.poster = $("gas-poster");
    els.orderButtons = $("order-buttons");
    els.banner = $("banner");
    els.feedback = $("feedback");
    els.pauseOverlay = $("pause-overlay");
    els.score = $("hud-score");
    els.streak = $("hud-streak");
    els.gap = $("hud-gap");
    els.timer = $("hud-timer");
    els.timerBadge = $("timer-badge");
    els.age = $("hud-age");
    els.lives = $("hud-lives");
    els.soundToggle = $("sound-toggle");
    els.attractBest = $("attract-best");
    els.endKicker = $("end-kicker");
    els.endTitle = $("end-title");
    els.endScore = $("end-score");
    els.endBest = $("end-best");
    els.endCorrect = $("end-correct");
    els.endAccuracy = $("end-accuracy");
    els.endRecord = $("end-record");
    els.endReview = $("end-review");

    applyForm(loadSettings());
    refreshAttractBest();
    $("btn-mute").style.opacity = sfx.isEnabled() ? "1" : "0.5";
    updateChaseSprites();

    document
      .querySelectorAll('input[name="age"], input[name="pace"], #sound-toggle')
      .forEach((input) => {
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
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && state.phase === "chasing") {
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
