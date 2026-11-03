/*
 * The Wagon Depot - controls, readouts and guided scenarios.
 */
(function () {
  "use strict";

  const M = window.WagonDepotModel;
  const Town = window.WagonDepotTown;
  const GasCore = window.GasCore;

  const $ = (id) => document.getElementById(id);

  const DEFAULT = { paco2Kpa: 5.3, days: 0, metabolicOffset: 0 };

  const SCENARIOS = {
    normal: {
      label: "Quiet town",
      input: { paco2Kpa: 5.3, days: 0, metabolicOffset: 0 },
      title: "A quiet town",
      text:
        "CO₂ wagons bring both outlaws and sheriffs. Outlaws are hydrogen ions. Sheriffs are bicarbonate. " +
        "With about 20 sheriffs for every unit of wagon pressure the outlaws are rounded up quickly and " +
        "pH reports the number of outlaws roaming free: around 40 nmol/L, pH 7.40.",
      steps: [
        "Watch one wagon: it unloads one outlaw and one sheriff.",
        "The sheriff chases for a random time, catches the outlaw, and both ride back to a wagon.",
        "The Sheriff-to-Wagon Ratio Dial sits near 20:1. That ratio is what sets pH.",
      ],
    },
    "acute-surge": {
      label: "Acute wagon surge",
      input: { paco2Kpa: 8.0, days: 0, metabolicOffset: 0 },
      title: "Acute respiratory acidosis",
      text:
        "The Marshal's Posse removes CO₂ wagons, and today it has stopped working. Wagons pile up in the depot. " +
        "Every extra wagon unloads an outlaw and a sheriff, but the extra sheriffs are swamped by the extra wagons, " +
        "so the ratio falls. More free outlaws means lower pH. Bunkhouse deputies temporarily contain outlaws during an " +
        "acute wagon surge, which is why bicarbonate rises by only about 1 mmol/L for every 10 mmHg (1.3 kPa) of CO₂.",
      steps: [
        "Count the wagons: there are many more than usual.",
        "The sheriff count barely moves. The ratio dial drops well below 20:1.",
        "The Town Order Meter falls into the acidaemia zone. Base excess stays near zero because, if you parked the wagons back at 5.3 kPa, the sheriff count would be about normal.",
      ],
    },
    chronic: {
      label: "Chronic wagon surge",
      input: { paco2Kpa: 8.0, days: 5, metabolicOffset: 0 },
      title: "Chronic respiratory acidosis with renal compensation",
      text:
        "Same wagon surge, five days later. The Sheriff Recruitment Office adds sheriffs over time: the kidneys reabsorb " +
        "bicarbonate and excrete acid. The sheriff count climbs by about 3.5 mmol/L per 10 mmHg, restoring the ratio toward 20:1. " +
        "The wagons are still there, but the outlaws are caught quickly, so pH is much closer to normal.",
      steps: [
        "Wagons unchanged compared with the acute scenario.",
        "The Sheriff office is full. The ratio dial climbs back toward 20:1.",
        "Base excess is now positive: park the wagons at 5.3 kPa and you have more sheriffs than a normal town. That surplus is the kidneys' work, not a posse.",
      ],
    },
    posse: {
      label: "Outlaw posse",
      input: { paco2Kpa: 5.3, days: 0, metabolicOffset: -10 },
      title: "Metabolic acidosis, before the lungs respond",
      text:
        "A posse rides in with extra outlaws: lactate, ketones, or lost bicarbonate from the gut or kidneys. " +
        "Sheriffs are used up catching them, so the sheriff count falls while the wagons are unchanged. " +
        "The ratio drops, more outlaws roam free, and pH falls. Because the wagons are normal, all of the sheriff deficit " +
        "shows up as a negative base excess.",
      steps: [
        "Wagons: normal. Sheriffs: well down. Ratio: low.",
        "Base excess is strongly negative: parked at 5.3 kPa this town is short of sheriffs.",
        "Press 'Posse' again to add more outlaws, or let the Marshal respond with the next scenario.",
      ],
      effect: "posse",
    },
    "posse-lungs": {
      label: "Posse + Marshal responds",
      input: { paco2Kpa: 3.9, days: 0, metabolicOffset: -10 },
      title: "Metabolic acidosis with respiratory compensation",
      text:
        "The Marshal's Posse removes CO₂ wagons: the patient breathes faster and deeper. Fewer wagons means fewer outlaws " +
        "delivered, so the ratio partly recovers even though the sheriff count is still low. Winter's formula predicts the " +
        "PaCO₂ the Marshal should reach: 1.5 × HCO₃⁻ + 8 mmHg.",
      steps: [
        "Compare with the plain posse scenario: wagons have left the depot and pH has improved.",
        "The sheriff count is the same, so base excess is unchanged. Compensation changes the ratio, not the deficit.",
        "If the measured PaCO₂ is higher than Winter's predicts, the Marshal is failing too: a mixed picture.",
      ],
    },
    hyperventilation: {
      label: "Hyperventilation",
      input: { paco2Kpa: 3.3, days: 0, metabolicOffset: 0 },
      title: "Acute respiratory alkalosis",
      text:
        "The Marshal's Posse is overzealous and clears wagons out of the depot. Fewer wagons unload fewer outlaws, " +
        "so the sheriffs on hand catch them almost at once. Hardly any outlaws roam free and pH rises. " +
        "Bunkhouse deputies release a few held outlaws, which is why bicarbonate drops slightly (about 2 mmol/L per 10 mmHg).",
      steps: [
        "The depot is nearly empty. The ratio dial reads well above 20:1.",
        "The Town Order Meter is in the alkalaemia zone.",
        "Slide 'Days since change' to 5 to watch the Recruitment Office stand sheriffs down over days.",
      ],
    },
    "sheriff-train": {
      label: "Sheriff train",
      input: { paco2Kpa: 5.3, days: 0, metabolicOffset: 8 },
      title: "Metabolic alkalosis",
      text:
        "A train brings extra sheriffs: bicarbonate given as a drug, or acid lost from vomiting or diuretics. " +
        "The wagons are normal, so the surplus sheriffs mop up the outlaws immediately. Very few roam free, pH rises, " +
        "and base excess is positive.",
      steps: [
        "Wagons: normal. Sheriffs: high. Ratio: above 20:1.",
        "Base excess is positive: parked at 5.3 kPa this town has spare sheriffs.",
        "This is why giving bicarbonate to a patient who cannot clear CO₂ wagons is risky: the sheriffs come with their own wagons.",
      ],
      effect: "train",
    },
  };

  const state = {
    input: { ...DEFAULT },
    paused: false,
    scenario: "normal",
    result: null,
  };

  const els = {};
  let town = null;

  function fmt(value, dp) {
    return Number(value).toFixed(dp);
  }

  function signed(value, dp) {
    const v = Number(value);
    const s = v > 0 ? "+" : v < 0 ? "−" : "";
    return s + Math.abs(v).toFixed(dp);
  }

  function classify(result) {
    if (!GasCore || typeof GasCore.evaluateGas !== "function") return "";
    try {
      const r = GasCore.evaluateGas(
        { pH: result.pH, pco2Kpa: result.paco2Kpa, hco3: result.hco3, baseExcess: result.baseExcess },
        "child"
      );
      if (!r || !r.primary || r.primary === "Undetermined") return "";
      if (r.primary === "No clear primary acid-base disorder") return "Normal acid–base";
      if (r.primary === "Possible compensated or mixed disorder") {
        if (result.paco2Kpa > 6.0 && result.baseExcess > 2) return "Compensated respiratory acidosis";
        if (result.paco2Kpa < 4.7 && result.baseExcess < -2) return "Compensated respiratory alkalosis or metabolic acidosis";
      }
      return r.primary;
    } catch (e) {
      return "";
    }
  }

  function plainInterpretation(result) {
    const fromCore = classify(result);
    if (fromCore) return fromCore;
    const acid = result.pH < 7.35;
    const alk = result.pH > 7.45;
    const highCo2 = result.paco2Kpa > 6.0;
    const lowCo2 = result.paco2Kpa < 4.7;
    const lowBe = result.baseExcess < -2;
    const highBe = result.baseExcess > 2;
    if (!acid && !alk) {
      if (highCo2 && highBe) return "Compensated respiratory acidosis";
      if (lowCo2 && lowBe) return "Compensated respiratory alkalosis or metabolic acidosis";
      return "Normal acid–base";
    }
    if (acid) {
      if (highCo2 && lowBe) return "Mixed respiratory and metabolic acidosis";
      if (highCo2) return "Respiratory acidosis";
      if (lowBe) return "Metabolic acidosis";
      return "Acidaemia";
    }
    if (lowCo2 && highBe) return "Mixed respiratory and metabolic alkalosis";
    if (lowCo2) return "Respiratory alkalosis";
    if (highBe) return "Metabolic alkalosis";
    return "Alkalaemia";
  }

  function orderZone(pH) {
    if (pH < 7.2) return { label: "Lawless", cls: "zone-bad" };
    if (pH < 7.35) return { label: "Rowdy", cls: "zone-warn" };
    if (pH <= 7.45) return { label: "Orderly", cls: "zone-good" };
    if (pH <= 7.6) return { label: "Over-policed", cls: "zone-warn" };
    return { label: "Locked down", cls: "zone-bad" };
  }

  /* ---------- readouts ---------- */
  function renderReadouts(result) {
    const zone = orderZone(result.pH);

    els.phValue.textContent = fmt(result.pH, 2);
    els.phZone.textContent = zone.label;
    els.phZone.className = `meter-zone ${zone.cls}`;
    const phPct = M.clamp(((result.pH - 6.8) / (7.8 - 6.8)) * 100, 0, 100);
    els.phNeedle.style.left = `${phPct}%`;
    els.phMeter.className = `order-meter ${zone.cls}`;

    els.hValue.textContent = fmt(result.hPlus, 0);

    const ratioPct = M.clamp((result.ratio / 40) * 100, 0, 100);
    els.ratioValue.textContent = `${fmt(result.ratio, 1)} : 1`;
    els.ratioFill.style.width = `${ratioPct}%`;
    els.ratioBar.className = `ratio-bar ${zone.cls}`;
    els.ratioNote.textContent =
      result.ratio > 22
        ? "More sheriffs per wagon than usual. Outlaws are caught almost at once."
        : result.ratio < 18
          ? "Fewer sheriffs per wagon than usual. Outlaws roam longer before capture."
          : "About 20 sheriffs per unit of wagon pressure. Normal.";

    els.co2Value.textContent = fmt(result.paco2Kpa, 1);
    els.co2Mmhg.textContent = `${fmt(result.paco2MmHg, 0)} mmHg`;
    els.hco3Value.textContent = fmt(result.hco3, 1);
    els.beValue.textContent = signed(result.baseExcess, 1);
    els.beValue.className = `stat-value ${result.baseExcess < -2 ? "is-low" : result.baseExcess > 2 ? "is-high" : ""}`;

    /* live equation in kPa form with mmHg alongside */
    els.eqHco3.textContent = fmt(result.hco3, 1);
    els.eqCo2.textContent = fmt(result.paco2Kpa, 1);
    els.eqDissolved.textContent = fmt(result.dissolvedCo2, 2);
    els.eqRatio.textContent = fmt(result.ratio, 1);
    els.eqLog.textContent = fmt(Math.log10(result.ratio), 2);
    els.eqPh.textContent = fmt(result.pH, 2);
    els.eqCo2Mmhg.textContent = fmt(result.paco2MmHg, 0);
    els.eqDissolvedMmhg.textContent = fmt(0.03 * result.paco2MmHg, 2);

    /* base excess panel: park the wagons at 5.3 kPa */
    const std = result.standard;
    els.beStdHco3.textContent = fmt(std.hco3, 1);
    els.beStdPh.textContent = fmt(std.pH, 2);
    els.beStdH.textContent = fmt(std.hPlus, 0);
    els.beStdSheriffs.textContent = signed(std.hco3 - 24, 1);
    const beWord =
      result.baseExcess < -2
        ? "Short of sheriffs even with the wagons parked normally: a posse has been through (metabolic acidosis)."
        : result.baseExcess > 2
          ? "Spare sheriffs even with the wagons parked normally: a sheriff train or the Recruitment Office has been busy (metabolic alkalosis or renal compensation)."
          : "With the wagons parked normally the sheriff count is about right. Any disorder on the meter is coming from the wagons themselves.";
    els.beWord.textContent = beWord;

    /* compensation hints */
    const wint = M.wintersPaco2Kpa(result.hco3);
    if (result.baseExcess < -2) {
      els.compHint.hidden = false;
      els.compHint.textContent =
        `Winter's formula: the Marshal should bring PaCO₂ to about ${fmt(wint, 1)} kPa (${fmt(M.kpaToMmHg(wint), 0)} mmHg) ` +
        `for this sheriff count. Current PaCO₂ is ${fmt(result.paco2Kpa, 1)} kPa.`;
    } else if (result.kidneyShift !== 0 && Math.abs(result.kidneyShift) > 0.3) {
      els.compHint.hidden = false;
      els.compHint.textContent =
        `The Sheriff Recruitment Office has ${result.kidneyShift > 0 ? "added" : "stood down"} ${fmt(Math.abs(result.kidneyShift), 1)} mmol/L ` +
        `of sheriffs so far (${fmt(result.kidneyFraction * 100, 0)}% of the full renal response).`;
    } else if (Math.abs(result.acuteBuffer) > 0.3) {
      els.compHint.hidden = false;
      els.compHint.textContent =
        result.acuteBuffer > 0
          ? `Bunkhouse deputies are holding the equivalent of ${fmt(result.acuteBuffer, 1)} mmol/L of outlaws. This is acute buffering by haemoglobin and proteins, not kidney work.`
          : `Bunkhouse deputies have released the equivalent of ${fmt(Math.abs(result.acuteBuffer), 1)} mmol/L of outlaws to keep the ratio from rising too far.`;
    } else {
      els.compHint.hidden = true;
    }

    els.interp.textContent = plainInterpretation(result);

    /* sprite legend */
    els.legendWagons.textContent = String(result.sprites.wagons);
    els.legendSheriffs.textContent = String(result.sprites.sheriffs);
    els.legendOutlaws.textContent = String(result.sprites.outlaws);
    els.legendHeld.textContent = String(result.sprites.held);
  }

  function renderControls() {
    els.co2Slider.value = String(state.input.paco2Kpa);
    els.co2SliderOut.textContent = `${fmt(state.input.paco2Kpa, 1)} kPa`;
    els.daysSlider.value = String(state.input.days);
    els.daysSliderOut.textContent =
      state.input.days === 0 ? "just now (acute)" : state.input.days >= 3 ? `${fmt(state.input.days, 1)} days (chronic)` : `${fmt(state.input.days, 1)} days`;
    els.offsetOut.textContent = `${signed(state.input.metabolicOffset, 0)} mmol/L`;
    els.btnPause.textContent = state.paused ? "Resume town" : "Pause town";
    els.btnPause.setAttribute("aria-pressed", state.paused ? "true" : "false");
    document.querySelectorAll("[data-scenario]").forEach((b) => {
      b.classList.toggle("is-active", b.getAttribute("data-scenario") === state.scenario);
    });
  }

  function renderScenario() {
    const s = SCENARIOS[state.scenario];
    if (!s) {
      els.scenarioTitle.textContent = "Free play";
      els.scenarioText.textContent = "You have moved the dials yourself. Read the town, then press a scenario to compare.";
      els.scenarioSteps.innerHTML = "";
      return;
    }
    els.scenarioTitle.textContent = s.title;
    els.scenarioText.textContent = s.text;
    els.scenarioSteps.innerHTML = s.steps.map((t) => `<li>${t}</li>`).join("");
  }

  /* ---------- update ---------- */
  function update() {
    const result = M.compute(state.input);
    state.result = result;
    renderReadouts(result);
    renderControls();
    if (town) town.setTargets(result.sprites);
  }

  function setInput(patch, options) {
    Object.assign(state.input, patch);
    if (!(options && options.keepScenario)) state.scenario = "";
    update();
    renderScenario();
  }

  function applyScenario(key, options) {
    const s = SCENARIOS[key];
    if (!s) return;
    const prevOffset = state.input.metabolicOffset;
    state.scenario = key;
    state.input = { ...s.input };
    update();
    renderScenario();
    if (town) {
      if (s.effect === "posse" && s.input.metabolicOffset < prevOffset) town.posse(6);
      if (s.effect === "train" && s.input.metabolicOffset > prevOffset) town.sheriffTrain(5);
    }
    if (options && options.scroll) {
      els.scenarioPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  /* ---------- events ---------- */
  function bind() {
    els.co2Slider.addEventListener("input", () => {
      setInput({ paco2Kpa: Number(els.co2Slider.value) });
    });
    els.daysSlider.addEventListener("input", () => {
      setInput({ days: Number(els.daysSlider.value) });
    });
    els.btnPosse.addEventListener("click", () => {
      setInput({ metabolicOffset: Math.max(M.LIMITS.metabolicOffset.min, state.input.metabolicOffset - 4) });
      if (town) town.posse(4);
    });
    els.btnTrain.addEventListener("click", () => {
      setInput({ metabolicOffset: Math.min(M.LIMITS.metabolicOffset.max, state.input.metabolicOffset + 4) });
      if (town) town.sheriffTrain(4);
    });
    els.btnOffsetReset.addEventListener("click", () => {
      setInput({ metabolicOffset: 0 });
    });
    els.btnReset.addEventListener("click", () => {
      applyScenario("normal");
    });
    els.btnPause.addEventListener("click", () => {
      state.paused = !state.paused;
      if (town) town.setPaused(state.paused);
      renderControls();
    });
    document.querySelectorAll("[data-scenario]").forEach((b) => {
      b.addEventListener("click", () => applyScenario(b.getAttribute("data-scenario"), { scroll: true }));
    });

    document.addEventListener("visibilitychange", () => {
      if (!town) return;
      if (document.hidden) town.stop();
      else town.start();
    });

    let resizeTimer = 0;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => town && town.resize(), 120);
    });

    document.addEventListener("keydown", (e) => {
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.key === " " && !e.repeat) {
        e.preventDefault();
        els.btnPause.click();
      } else if (e.key.toLowerCase() === "p") {
        els.btnPosse.click();
      } else if (e.key.toLowerCase() === "t") {
        els.btnTrain.click();
      } else if (e.key.toLowerCase() === "r") {
        els.btnReset.click();
      }
    });
  }

  function cache() {
    const ids = [
      "ph-value", "ph-zone", "ph-needle", "ph-meter", "h-value",
      "ratio-value", "ratio-fill", "ratio-bar", "ratio-note",
      "co2-value", "co2-mmhg", "hco3-value", "be-value",
      "eq-hco3", "eq-co2", "eq-dissolved", "eq-ratio", "eq-log", "eq-ph", "eq-co2-mmhg", "eq-dissolved-mmhg",
      "be-std-hco3", "be-std-ph", "be-std-h", "be-std-sheriffs", "be-word", "comp-hint", "interp",
      "legend-wagons", "legend-sheriffs", "legend-outlaws", "legend-held",
      "co2-slider", "co2-slider-out", "days-slider", "days-slider-out", "offset-out",
      "btn-posse", "btn-train", "btn-offset-reset", "btn-reset", "btn-pause",
      "scenario-panel", "scenario-title", "scenario-text", "scenario-steps",
      "town-depot", "town-street", "wagon-layer", "actor-layer", "bunkhouse", "sheriff-office", "recruit-office",
      "office-grid", "office-count", "bunkhouse-count", "town-banner",
      "live-wagons", "live-outlaws", "live-sheriffs",
    ];
    ids.forEach((id) => {
      const key = id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
      els[key] = $(id);
    });
  }

  function init() {
    cache();
    const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    town = new Town(
      {
        depot: els.townDepot,
        street: els.townStreet,
        wagonLayer: els.wagonLayer,
        actorLayer: els.actorLayer,
        bunkhouse: els.bunkhouse,
        office: els.sheriffOffice,
        recruit: els.recruitOffice,
        officeGrid: els.officeGrid,
        officeCount: els.officeCount,
        bunkhouseCount: els.bunkhouseCount,
        banner: els.townBanner,
      },
      { reducedMotion }
    );
    town.onCounts = (c) => {
      els.liveWagons.textContent = String(c.wagons);
      els.liveOutlaws.textContent = String(c.freeOutlaws);
      els.liveSheriffs.textContent = String(c.sheriffs);
    };
    bind();
    applyScenario("normal");
    town.resize();
    town.start();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
