/*
 * The Assay Office - stepper through the analyser and the live calculator.
 */
(function () {
  "use strict";

  const C = window.AssayCalc;
  const $ = (id) => document.getElementById(id);

  /* ---------- stations ---------- */
  const STATIONS = [
    {
      title: "Capillary tube and inlet",
      drop: [60, 150],
      origin: ["14%", "52%"],
      body: [
        "The sample is in a thin glass capillary with dry heparin, filled to the end and sealed. A bubble pulls oxygen up toward room air, and lets carbon dioxide leak out.",
        "The machine takes the blood from the tube and holds it at 37 °C. Every number after this is at that temperature, not the baby's.",
      ],
      lead: "Fill the capillary tube, keep the air out, then warm it to 37 °C.",
      out: [["Takes", "about 0.1 mL"], ["Holds it at", "37 °C"], ["Watch for", "bubbles, clots, delay"]],
    },
    {
      title: "pH glass electrode",
      drop: [110, 110],
      origin: ["26%", "32%"],
      body: [
        "Hydrogen ions bind the outer surface of a thin glass membrane. They do not cross. The inside is a fixed pH, so the voltage shifts by about 61 mV for each pH unit.",
        "A reference electrode stays steady. It meets the blood through a KCl junction, and the meter reads the difference. Bicarbonate and base excess are both built on this pH.",
      ],
      lead: "pH is a voltage across glass. The hydrogen ions stay outside.",
      out: [["Measures", "pH"], ["How", "about 61 mV per pH unit"], ["Why it matters", "the first number everything else uses"]],
    },
    {
      title: "Severinghaus CO₂ electrode",
      drop: [170, 190],
      origin: ["40%", "68%"],
      body: [
        "Blood never touches the electrode. Carbon dioxide slips through a membrane, acidifies a thin bicarbonate film, and the pH of that film falls.",
        "Only gas gets through, so the reading is PaCO₂, not bicarbonate. Pair it with pH and the machine can calculate bicarbonate.",
      ],
      lead: "The CO₂ electrode is a pH electrode behind a gas membrane.",
      out: [["Measures", "PaCO₂"], ["How", "pH change in a bicarbonate film"], ["Usual range", "4.7–6.0 kPa"]],
    },
    {
      title: "Clark O₂ electrode",
      drop: [230, 110],
      origin: ["55%", "32%"],
      body: [
        "Oxygen crosses a membrane onto platinum held at about −0.6 V. Each molecule that arrives is used up, and the current that flows goes up with the oxygen tension.",
        "That current is dissolved PaO₂ only, about 2% of the oxygen in blood. Some machines skip the cathode and use a dye whose glow oxygen dims.",
      ],
      lead: "Oxygen that reaches the cathode makes a tiny current.",
      out: [["Measures", "PaO₂"], ["How", "current, or a dye whose glow fades"], ["Remember", "dissolved oxygen only, not the haemoglobin"]],
    },
    {
      title: "Co-oximeter",
      drop: [290, 150],
      origin: ["70%", "70%"],
      body: [
        "The blood is lysed and several colours of light shine through it. Oxyhaemoglobin, deoxyhaemoglobin, carboxyhaemoglobin and methaemoglobin each swallow a different pattern.",
        "From that pattern you get total haemoglobin and a true saturation. A pulse oximeter uses only two colours, so it cannot see COHb or MetHb. Haemoglobin also feeds actual base excess, because it buffers.",
      ],
      lead: "Light tells the forms of haemoglobin apart.",
      out: [["Measures", "Hb and the saturations"], ["How", "which colours get absorbed"], ["Also used for", "actual base excess"]],
    },
    {
      title: "Ion-selective and enzyme electrodes",
      drop: [350, 150],
      origin: ["83%", "32%"],
      body: [
        "Sodium, potassium, calcium and chloride each have a membrane that mostly lets that one ion through. Like pH, the ion makes a voltage.",
        "Glucose and lactate are different: an enzyme on the membrane turns them into a current. Sodium, chloride and the bicarbonate just calculated then give the anion gap.",
      ],
      lead: "Each ion has its own door. Glucose and lactate use an enzyme.",
      out: [["Measures", "Na⁺, K⁺, Ca²⁺, Cl⁻, glucose, lactate"], ["How", "voltage for ions, current for enzymes"], ["Then calculated", "the anion gap"]],
    },
    {
      title: "Calculator and printout",
      drop: [358, 196],
      origin: ["85%", "72%"],
      body: [
        "Bicarbonate is 0.225 × PaCO₂ × 10^(pH − 6.1). Base excess then asks how much acid or base would bring the pH back to 7.40 if PaCO₂ were 5.3 kPa.",
        "Haemoglobin joins only the actual base excess, because haemoglobin buffers. None of these numbers was measured. If the pH electrode drifts, they drift with it.",
      ],
      lead: "pH and PaCO₂ go in. Bicarbonate and base excess come out.",
      out: [["Works out", "HCO₃⁻, base excess, anion gap"], ["From", "pH and PaCO₂, plus Hb for actual BE"], ["Rule", "trust the measured pair first"]],
    },
  ];

  const PRESETS = {
    normal: { pH: 7.4, paco2Kpa: 5.3, hbGl: 150, label: "Normal" },
    "acute-resp": { pH: 7.2, paco2Kpa: 9.3, hbGl: 150, label: "Acute respiratory acidosis" },
    "met-acid": { pH: 7.18, paco2Kpa: 4.1, hbGl: 150, label: "Metabolic acidosis" },
    chronic: { pH: 7.36, paco2Kpa: 8.0, hbGl: 170, label: "Chronic hypercapnia" },
    "met-alk": { pH: 7.52, paco2Kpa: 6.0, hbGl: 150, label: "Metabolic alkalosis" },
  };

  const state = { step: 1, zoomToken: 0, input: { ...PRESETS.normal }, preset: "normal" };
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const els = {};

  function fmt(v, dp) {
    return Number(v).toFixed(dp);
  }
  function signed(v, dp) {
    const n = Number(v);
    return (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n).toFixed(dp);
  }
  function bracket(v, dp) {
    /* a signed number inside a formula, e.g. (−0.22) */
    const n = Number(v);
    return n < 0 ? `(−${Math.abs(n).toFixed(dp)})` : n.toFixed(dp);
  }

  /* ---------- stepper ---------- */
  function showStep(n) {
    const total = STATIONS.length;
    state.step = Math.min(total, Math.max(1, n));
    const s = STATIONS[state.step - 1];

    els.stepNum.textContent = String(state.step);
    els.stationKicker.textContent = `Station ${state.step} of ${total}`;
    els.stationTitle.textContent = s.title;
    els.stationBody.innerHTML = `<p class="station-lead">${s.lead}</p>` + s.body.map((p) => `<p>${p}</p>`).join("");
    els.stationOut.innerHTML = s.out.map(([k, v]) => `<div class="fact"><span>${k}</span><b>${v}</b></div>`).join("");

    document.querySelectorAll(".machine .station").forEach((g) => {
      g.classList.toggle("is-active", Number(g.getAttribute("data-step")) === state.step);
    });
    document.querySelectorAll(".station-dots button").forEach((b) => {
      const active = Number(b.getAttribute("data-step")) === state.step;
      b.classList.toggle("is-active", active);
      if (active) b.setAttribute("aria-current", "step");
      else b.removeAttribute("aria-current");
    });
    /* CSS transform (user units) so the drop slides between stations */
    els.sampleDrop.style.transform = `translate(${s.drop[0]}px, ${s.drop[1]}px)`;
    playZoom(s);

    els.btnPrev.disabled = state.step === 1;
    els.btnNext.disabled = state.step === total;
  }

  function playZoom(station) {
    const stage = els.assayStage;
    stage.style.setProperty("--ox", station.origin[0]);
    stage.style.setProperty("--oy", station.origin[1]);
    document.querySelectorAll(".zoom-scene").forEach((svg) => {
      const on = Number(svg.getAttribute("data-step")) === state.step;
      svg.classList.toggle("is-on", on);
      svg.removeAttribute("hidden");
      if (!on) {
        svg.pauseAnimations();
        return;
      }
      if (reduceMotion) {
        svg.pauseAnimations();
        return;
      }
      svg.unpauseAnimations();
      try {
        svg.setCurrentTime(0);
      } catch (err) {
        /* older browsers without SVG time control */
      }
    });
    if (reduceMotion) {
      stage.classList.add("is-zoomed");
      return;
    }
    stage.classList.remove("is-zoomed");
    state.zoomToken += 1;
    const token = state.zoomToken;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (token !== state.zoomToken) return;
        stage.classList.add("is-zoomed");
      });
    });
  }

  /* ---------- live calculator ---------- */
  function readOf(r) {
    const acid = r.pH < 7.35;
    const alk = r.pH > 7.45;
    const hiCo2 = r.paco2Kpa > 6.0;
    const loCo2 = r.paco2Kpa < 4.7;
    const loBe = r.sbe < -2;
    const hiBe = r.sbe > 2;
    if (acid) {
      if (hiCo2 && loBe) return "Mixed respiratory and metabolic acidosis: high PaCO₂ and a base deficit.";
      if (hiCo2) return "Respiratory acidosis: the measured PaCO₂ is high; calculated bicarbonate is near normal, so base excess stays near zero.";
      if (loBe) return "Metabolic acidosis: calculated bicarbonate is low and base excess is negative with a normal or low PaCO₂.";
      return "Acidaemia without a clear single driver.";
    }
    if (alk) {
      if (loCo2 && hiBe) return "Mixed respiratory and metabolic alkalosis.";
      if (loCo2) return "Respiratory alkalosis: low PaCO₂, bicarbonate calculated slightly low, base excess near zero.";
      if (hiBe) return "Metabolic alkalosis: calculated bicarbonate and base excess are both high.";
      return "Alkalaemia without a clear single driver.";
    }
    if (hiCo2 && hiBe) return "Normal pH with a high PaCO₂ and positive base excess: compensated respiratory acidosis (chronic hypercapnia).";
    if (loCo2 && loBe) return "Normal pH with a low PaCO₂ and a base deficit: compensated metabolic acidosis or respiratory alkalosis.";
    if (hiCo2 || loCo2 || hiBe || loBe) return "Normal pH but one component is off: look for compensation or a mixed picture.";
    return "Normal acid–base.";
  }

  function beClass(v) {
    if (v < -2) return "calc-value is-low";
    if (v > 2) return "calc-value is-high";
    return "calc-value is-ok";
  }

  function renderLive() {
    const r = C.compute(state.input);

    els.outPh.textContent = fmt(r.pH, 2);
    els.outCo2.textContent = `${fmt(r.paco2Kpa, 1)} kPa`;
    els.outHb.textContent = `${fmt(r.hbGl, 0)} g/L`;
    els.outH.textContent = fmt(r.hPlus, 0);
    els.outCo2Mmhg.textContent = fmt(r.paco2MmHg, 0);
    els.outDiss.textContent = fmt(r.dissolvedCo2, 2);

    const exp = r.pH - C.PK;
    els.rHco3.textContent = fmt(r.hco3, 1);
    els.sHco3.innerHTML = `0.225 × ${fmt(r.paco2Kpa, 1)} × 10<sup>(${fmt(r.pH, 2)} − 6.1)</sup> = ${fmt(r.dissolvedCo2, 2)} × ${fmt(Math.pow(10, exp), 1)} <small>(mmHg: 0.03 × ${fmt(r.paco2MmHg, 0)} × 10<sup>${fmt(exp, 2)}</sup>)</small>`;

    const dph = r.pH - 7.4;
    els.rBeSimple.textContent = signed(r.beSimple, 1);
    els.rBeSimple.parentElement.className = beClass(r.beSimple);
    els.sBeSimple.innerHTML = `0.9287 × (${fmt(r.hco3, 1)} − 24.4 + 14.83 × ${bracket(dph, 2)}) = 0.9287 × ${bracket(r.hco3 - 24.4 + 14.83 * dph, 2)}`;

    els.rBeDirect.textContent = signed(r.beDirect, 1);
    els.rBeDirect.parentElement.className = beClass(r.beDirect);
    els.sBeDirect.innerHTML = `0.209 × ${fmt(r.paco2Kpa, 1)} × 10<sup>${fmt(exp, 2)}</sup> + 13.77 × ${fmt(r.pH, 2)} − 124.58`;

    const hb = r.hbGdl;
    els.rBeVs.textContent = signed(r.beVanSlyke, 1);
    els.rBeVs.parentElement.className = beClass(r.beVanSlyke);
    els.sBeVs.innerHTML = `(1 − 0.014 × ${fmt(hb, 1)}) × (${fmt(r.hco3, 1)} − 24.8 + (1.43 × ${fmt(hb, 1)} + 7.7) × ${bracket(dph, 2)}) <small>Hb ${fmt(r.hbGl, 0)} g/L = ${fmt(hb, 1)} g/dL</small>`;

    els.rSbe.textContent = signed(r.sbe, 1);
    els.rSbe.parentElement.className = beClass(r.sbe);
    els.sSbe.innerHTML = `${fmt(r.hco3, 1)} − 24.8 + 16.2 × ${bracket(dph, 2)}`;

    els.liveRead.textContent = readOf(r);

    els.inPh.value = String(r.pH);
    els.inCo2.value = String(r.paco2Kpa);
    els.inHb.value = String(r.hbGl);

    document.querySelectorAll("[data-preset]").forEach((b) => {
      b.classList.toggle("is-active", b.getAttribute("data-preset") === state.preset);
    });
  }

  function setInput(patch) {
    Object.assign(state.input, patch);
    state.preset = "";
    renderLive();
  }

  function applyPreset(key) {
    const p = PRESETS[key];
    if (!p) return;
    state.input = { pH: p.pH, paco2Kpa: p.paco2Kpa, hbGl: p.hbGl };
    state.preset = key;
    renderLive();
  }

  /* ---------- wiring ---------- */
  function cache() {
    const ids = [
      "step-num", "step-total", "btn-prev", "btn-next", "sample-drop", "assay-stage",
      "station-kicker", "station-title", "station-body", "station-out",
      "in-ph", "in-co2", "in-hb", "out-ph", "out-co2", "out-hb", "out-h", "out-co2-mmhg", "out-diss",
      "r-hco3", "s-hco3", "r-be-simple", "s-be-simple", "r-be-direct", "s-be-direct",
      "r-be-vs", "s-be-vs", "r-sbe", "s-sbe", "live-read",
    ];
    ids.forEach((id) => {
      els[id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())] = $(id);
    });
  }

  function bind() {
    els.btnPrev.addEventListener("click", () => showStep(state.step - 1));
    els.btnNext.addEventListener("click", () => showStep(state.step + 1));
    document.querySelectorAll(".station-dots button").forEach((b) => {
      b.addEventListener("click", () => showStep(Number(b.getAttribute("data-step"))));
    });
    document.querySelectorAll(".machine .station").forEach((g) => {
      g.addEventListener("click", () => showStep(Number(g.getAttribute("data-step"))));
    });

    els.inPh.addEventListener("input", () => setInput({ pH: Number(els.inPh.value) }));
    els.inCo2.addEventListener("input", () => setInput({ paco2Kpa: Number(els.inCo2.value) }));
    els.inHb.addEventListener("input", () => setInput({ hbGl: Number(els.inHb.value) }));
    document.querySelectorAll("[data-preset]").forEach((b) => {
      b.addEventListener("click", () => applyPreset(b.getAttribute("data-preset")));
    });

    document.addEventListener("keydown", (e) => {
      if (e.target && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target.tagName)) return;
      if (e.key === "ArrowRight") { e.preventDefault(); showStep(state.step + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); showStep(state.step - 1); }
    });
  }

  function init() {
    cache();
    els.stepTotal.textContent = String(STATIONS.length);
    bind();
    showStep(1);
    applyPreset("normal");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
