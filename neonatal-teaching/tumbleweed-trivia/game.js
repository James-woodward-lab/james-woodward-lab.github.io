(function () {
  "use strict";

  const bank = window.TumbleweedTrivia;
  if (!bank) {
    throw new Error("questions.js must load before game.js");
  }

  const PACES = { gentle: 18, standard: 12, hard: 8 };
  const MAX_MISSES = 3;
  const FEEDBACK_MS = 1200;
  const SETTINGS_KEY = "tumbleweedSettings";
  const BEST_KEY = "tumbleweedBest";

  const state = {
    phase: "attract",
    topic: "all",
    pace: "standard",
    score: 0,
    streak: 0,
    misses: 0,
    correct: 0,
    asked: 0,
    queue: [],
    queueIndex: 0,
    card: null,
    rafId: 0,
    lastTs: 0,
    frozen: false,
    feedbackTimer: 0,
    mistakes: [],
  };

  const els = {};
  const $ = (id) => document.getElementById(id);

  const sfx = (function () {
    let ctx = null;
    let enabled = true;
    function ensure() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) ctx = new AC();
      }
      if (ctx && ctx.state === "suspended") ctx.resume();
      return ctx;
    }
    function tone(freq, start, dur, type, vol) {
      if (!enabled) return;
      const c = ensure();
      if (!c) return;
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
      setEnabled(on) { enabled = on; if (on) ensure(); },
      isEnabled: () => enabled,
      start: () => seq([330, 392, 523], "square", 0.08),
      correct: () => seq([523, 659, 784], "square", 0.07),
      wrong: () => seq([220, 165], "sawtooth", 0.14, 0.04),
      escape: () => seq([392, 262, 196], "triangle", 0.12, 0.06),
      over: () => seq([392, 330, 262, 196], "triangle", 0.16, 0.07),
    };
  })();

  function loadSettings() {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; }
    catch (_e) { return {}; }
  }
  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        topic: state.topic,
        pace: state.pace,
        sound: sfx.isEnabled(),
      }));
    } catch (_e) { /* ignore */ }
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
    const topic = document.querySelector('input[name="topic"]:checked');
    const pace = document.querySelector('input[name="pace"]:checked');
    state.topic = topic ? topic.value : "all";
    state.pace = pace ? pace.value : "standard";
    sfx.setEnabled(els.soundToggle.checked);
  }

  function applyForm(saved) {
    const setRadio = (name, value) => {
      const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
      if (el) el.checked = true;
    };
    if (saved.topic) setRadio("topic", saved.topic);
    if (saved.pace) setRadio("pace", saved.pace);
    els.soundToggle.checked = saved.sound !== false;
    readForm();
  }

  function pad6(n) {
    return String(Math.max(0, Math.round(n))).padStart(6, "0");
  }

  function streakMultiplier() {
    if (state.streak <= 1) return 1;
    return Math.min(2, 1 + (state.streak - 1) * 0.1);
  }

  function renderLives() {
    const left = Math.max(0, MAX_MISSES - state.misses);
    let html = "";
    for (let i = 0; i < MAX_MISSES; i += 1) {
      html += `<span class="life${i >= left ? " is-lost" : ""}" aria-hidden="true">\u2605</span>`;
    }
    els.lives.innerHTML = html;
    els.lives.setAttribute("aria-label", `${left} miss${left === 1 ? "" : "es"} left`);
  }

  function updateHud() {
    els.score.textContent = pad6(state.score);
    els.streak.textContent = `x${streakMultiplier().toFixed(1)}`;
    els.topic.textContent = bank.topicLabel(state.topic);
    renderLives();
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

  function setPhase(next) {
    state.phase = next;
    els.screenAttract.hidden = next !== "attract";
    els.screenGame.hidden = next !== "rolling" && next !== "feedback" && next !== "paused";
    els.screenEnd.hidden = next !== "gameover";
    els.pauseOverlay.hidden = next !== "paused";
    els.stage.classList.toggle("is-frozen", next !== "rolling");
    if (next === "rolling") startLoop();
    else stopLoop();
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
    const travel = els.playfield.clientWidth + (state.card ? state.card.w : 400);
    const seconds = PACES[state.pace] || 12;
    return travel / seconds;
  }

  function placeCard() {
    if (!state.card || !state.card.el) return;
    const y = els.playfield.clientHeight / 2;
    state.card.el.style.transform = `translate(${state.card.x.toFixed(1)}px, -50%)`;
    state.card.el.style.top = `${y}px`;
  }

  function nextQuestion() {
    if (state.queueIndex >= state.queue.length) {
      state.queue = bank.questionsForTopic(state.topic);
      state.queueIndex = 0;
    }
    const q = state.queue[state.queueIndex];
    state.queueIndex += 1;
    spawnCard(q);
  }

  function spawnCard(q) {
    const el = document.createElement("article");
    el.className = "weed";
    const choices = q.choices.map((text, i) =>
      `<button type="button" class="choice" data-index="${i}"><span class="choice-key">${i + 1}</span><span>${text}</span></button>`
    ).join("");
    el.innerHTML = `
      <div class="weed-ring" aria-hidden="true"></div>
      <div class="plaque">
        <p class="plaque-topic">${bank.topicLabel(q.topic)}</p>
        <p class="plaque-stem">${q.stem}</p>
        <div class="choices">${choices}</div>
        <p class="plaque-why" hidden></p>
      </div>`;
    els.screenAttract.hidden = true;
    els.screenGame.hidden = false;
    els.cardLayer.appendChild(el);
    el.querySelectorAll(".choice").forEach((btn) => {
      btn.addEventListener("click", () => answer(Number(btn.dataset.index)));
    });
    const w = el.offsetWidth || 480;
    state.card = {
      q,
      el,
      x: -w - 8,
      w,
      answered: false,
      born: performance.now(),
    };
    placeCard();
    state.frozen = false;
    setPhase("rolling");
  }

  function clearCard() {
    if (state.card && state.card.el) state.card.el.remove();
    state.card = null;
  }

  function secondsLeft() {
    if (!state.card) return 0;
    const travel = els.playfield.clientWidth + state.card.w;
    const remainPx = els.playfield.clientWidth - state.card.x;
    const speed = pxPerSecond();
    return Math.max(0, remainPx / speed);
  }

  function answer(index) {
    if (state.phase !== "rolling" || !state.card || state.card.answered) return;
    state.card.answered = true;
    state.frozen = true;
    state.asked += 1;
    const q = state.card.q;
    const right = index === q.answer;
    const buttons = state.card.el.querySelectorAll(".choice");
    buttons.forEach((btn) => {
      btn.disabled = true;
      const i = Number(btn.dataset.index);
      if (i === q.answer) btn.classList.add("is-correct");
      else if (i === index) btn.classList.add("is-wrong");
    });
    const why = state.card.el.querySelector(".plaque-why");
    why.hidden = false;
    why.textContent = q.why;

    if (right) {
      state.streak += 1;
      state.correct += 1;
      const points = Math.round((100 + secondsLeft() * 5) * streakMultiplier());
      state.score += points;
      state.card.el.classList.add("is-burst");
      showBanner(`+${points}`, "good");
      sfx.correct();
    } else {
      state.streak = 0;
      state.misses += 1;
      state.score = Math.max(0, state.score - 10);
      state.mistakes.push({ q, kind: "wrong", chosen: index });
      shake();
      showBanner("Wrong weed!", "bad");
      sfx.wrong();
    }
    updateHud();
    setPhase("feedback");
    state.feedbackTimer = setTimeout(afterFeedback, FEEDBACK_MS);
  }

  function escapeCard() {
    if (!state.card || state.card.answered) return;
    state.card.answered = true;
    state.frozen = true;
    state.asked += 1;
    state.streak = 0;
    state.misses += 1;
    state.mistakes.push({ q: state.card.q, kind: "escaped" });
    state.card.el.classList.add("is-miss");
    const buttons = state.card.el.querySelectorAll(".choice");
    buttons.forEach((btn) => {
      btn.disabled = true;
      if (Number(btn.dataset.index) === state.card.q.answer) btn.classList.add("is-correct");
    });
    const why = state.card.el.querySelector(".plaque-why");
    why.hidden = false;
    why.textContent = state.card.q.why;
    showBanner("It rolled on by!", "bad");
    sfx.escape();
    shake();
    updateHud();
    setPhase("feedback");
    state.feedbackTimer = setTimeout(afterFeedback, FEEDBACK_MS);
  }

  function afterFeedback() {
    if (state.phase !== "feedback") return;
    clearCard();
    if (state.misses >= MAX_MISSES) {
      endGame();
      return;
    }
    nextQuestion();
  }

  function tick(ts) {
    state.rafId = 0;
    if (state.phase !== "rolling") return;
    if (!state.lastTs) state.lastTs = ts;
    const dt = Math.min(0.05, (ts - state.lastTs) / 1000);
    state.lastTs = ts;
    if (state.card && !state.frozen) {
      state.card.x += pxPerSecond() * dt;
      if (state.card.x > els.playfield.clientWidth) {
        escapeCard();
        return;
      }
      placeCard();
    }
    if (state.phase === "rolling") state.rafId = requestAnimationFrame(tick);
  }

  function endGame() {
    clearTimeout(state.feedbackTimer);
    clearCard();
    const prev = loadBest();
    const best = saveBest(state.score);
    els.endScore.textContent = pad6(state.score);
    els.endBest.textContent = pad6(best);
    els.endCorrect.textContent = String(state.correct);
    els.endAsked.textContent = String(state.asked);
    els.endRecord.hidden = !(state.score > prev && state.score > 0);
    const recent = state.mistakes.slice(-8).reverse();
    els.endReview.innerHTML = recent.length
      ? recent.map((m) => {
          const tag = m.kind === "escaped"
            ? '<span class="review-tag">Rolled by</span>'
            : '<span class="review-tag">Wrong</span>';
          const said = m.kind === "wrong"
            ? `<div>You picked: ${m.q.choices[m.chosen]}</div>`
            : "";
          return `<li class="review-item">
            <div>${m.q.stem}</div>
            <div>${tag} Answer: <strong>${m.q.choices[m.q.answer]}</strong></div>
            ${said}
            <div class="review-why">${m.q.why}</div>
          </li>`;
        }).join("")
      : '<li class="review-empty">A clean roll.</li>';
    sfx.over();
    setPhase("gameover");
    window.scrollTo(0, 0);
    $("btn-again").focus({ preventScroll: true });
  }

  function resetRound() {
    clearTimeout(state.feedbackTimer);
    clearCard();
    Object.assign(state, {
      score: 0,
      streak: 0,
      misses: 0,
      correct: 0,
      asked: 0,
      queue: bank.questionsForTopic(state.topic),
      queueIndex: 0,
      frozen: false,
      mistakes: [],
    });
  }

  function startGame() {
    readForm();
    saveSettings();
    resetRound();
    updateHud();
    sfx.start();
    showBanner("Here they come!");
    nextQuestion();
    els.playfield.focus({ preventScroll: true });
  }

  function quitToTitle() {
    clearTimeout(state.feedbackTimer);
    clearCard();
    setPhase("attract");
    readForm();
    els.attractBest.textContent = pad6(loadBest());
  }

  function togglePause() {
    if (state.phase === "rolling") {
      setPhase("paused");
      $("btn-resume").focus({ preventScroll: true });
    } else if (state.phase === "paused") {
      setPhase("rolling");
      els.playfield.focus({ preventScroll: true });
    }
  }

  function onKeyDown(e) {
    if (state.phase === "rolling" && /^[1-4]$/.test(e.key)) {
      e.preventDefault();
      answer(Number(e.key) - 1);
      return;
    }
    if (e.key === "p" || e.key === "P" || e.key === "Escape") {
      if (state.phase === "rolling" || state.phase === "paused") {
        e.preventDefault();
        togglePause();
      }
    }
  }

  function init() {
    els.screenAttract = $("screen-attract");
    els.screenGame = $("screen-game");
    els.screenEnd = $("screen-end");
    els.stage = $("stage");
    els.playfield = $("playfield");
    els.cardLayer = $("card-layer");
    els.banner = $("banner");
    els.pauseOverlay = $("pause-overlay");
    els.score = $("hud-score");
    els.streak = $("hud-streak");
    els.topic = $("hud-topic");
    els.lives = $("hud-lives");
    els.soundToggle = $("sound-toggle");
    els.attractBest = $("attract-best");
    els.endScore = $("end-score");
    els.endBest = $("end-best");
    els.endCorrect = $("end-correct");
    els.endAsked = $("end-asked");
    els.endRecord = $("end-record");
    els.endReview = $("end-review");

    applyForm(loadSettings());
    els.attractBest.textContent = pad6(loadBest());
    $("btn-mute").style.opacity = sfx.isEnabled() ? "1" : "0.5";

    document.querySelectorAll('input[name="topic"], input[name="pace"], #sound-toggle').forEach((input) => {
      input.addEventListener("change", () => {
        readForm();
        saveSettings();
        els.attractBest.textContent = pad6(loadBest());
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
      if (document.hidden && state.phase === "rolling") togglePause();
    });
    window.addEventListener("resize", () => {
      if (state.card) placeCard();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
