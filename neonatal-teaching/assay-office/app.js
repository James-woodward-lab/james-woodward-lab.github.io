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
      title: "Syringe and inlet",
      drop: [60, 150],
      body: [
        "The sample arrives in a syringe lined with dry, balanced heparin. Bubbles are expelled and the syringe is capped, because air pulls PaO₂ toward 20 kPa and drags PaCO₂ down.",
        "The analyser aspirates 65–100 microlitres into a measuring chamber held at 37 °C. Everything downstream is measured at that temperature, whatever the patient's temperature.",
      ],
      out: [["Volume", "about 0.1 mL"], ["Temperature", "37 °C in the chamber"], ["Check", "no bubbles, no clots, mixed, analysed within minutes"]],
    },
    {
      title: "pH glass electrode",
      drop: [110, 110],
      body: [
        "A thin bulb of special glass lets hydrogen ions interact with its surface. The potential difference across the glass, compared with a stable reference electrode, changes by about 61 millivolts for every pH unit at 37 °C.",
        "The machine reads the millivolts, compares them with two calibration buffers, and reports pH. This is the first of the two numbers everything else is built on. Sørensen defined pH in 1909; the glass electrode made it a bedside measurement.",
      ],
      out: [["Measures", "pH (hydrogen ion activity)"], ["Signal", "voltage, Nernst slope about 61 mV per pH unit"], ["Reported as", "pH, and H⁺ in nmol/L on some printouts"]],
    },
    {
      title: "Severinghaus CO₂ electrode",
      drop: [170, 190],
      body: [
        "This is a pH electrode in disguise. The blood never touches it: CO₂ diffuses through a thin gas-permeable membrane into a film of bicarbonate solution. There it forms carbonic acid, the film's pH falls, and a second glass electrode reads that change.",
        "Because only gas crosses the membrane, the reading is the partial pressure of CO₂, not the bicarbonate. This is the second measured number. Together with pH it lets the machine calculate bicarbonate.",
      ],
      out: [["Measures", "PaCO₂ in kPa"], ["Signal", "pH change in a bicarbonate film behind a membrane"], ["Normal", "4.7–6.0 kPa (35–45 mmHg)"]],
    },
    {
      title: "Clark O₂ electrode",
      drop: [230, 110],
      body: [
        "Oxygen diffuses through another membrane to a platinum cathode held at about −0.6 volts. Each oxygen molecule that arrives is reduced, and the tiny current that flows is proportional to the oxygen tension.",
        "Clark's design dates from 1954 and is still used, although many modern analysers measure oxygen optically instead, using a dye whose fluorescence is quenched by oxygen.",
      ],
      out: [["Measures", "PaO₂ in kPa"], ["Signal", "current at a platinum cathode (or fluorescence quenching)"], ["Note", "PaO₂ is dissolved oxygen only: about 2% of the oxygen in blood"]],
    },
    {
      title: "Co-oximeter",
      drop: [290, 150],
      body: [
        "The sample is haemolysed and light of many wavelengths is shone through it. Each form of haemoglobin absorbs a different pattern: oxyhaemoglobin, deoxyhaemoglobin, carboxyhaemoglobin, methaemoglobin and, on neonatal settings, fetal haemoglobin.",
        "From the pattern the machine reports total haemoglobin and the true saturation. A pulse oximeter uses only two wavelengths and cannot separate COHb or MetHb. The haemoglobin value also feeds the actual base excess calculation.",
      ],
      out: [["Measures", "tHb, sO₂, O₂Hb, COHb, MetHb, HbF"], ["Signal", "light absorbance at several wavelengths"], ["Feeds", "actual base excess (Hb is a buffer) and oxygen content"]],
    },
    {
      title: "Ion-selective and enzyme electrodes",
      drop: [350, 150],
      body: [
        "A row of small electrodes, each with a membrane that lets through mostly one ion: sodium, potassium, ionised calcium, chloride. Like the pH electrode they produce a voltage that depends on the ion's activity.",
        "Glucose and lactate use enzyme electrodes: glucose oxidase or lactate oxidase on a membrane turns the substrate into hydrogen peroxide, which is measured as a current. From sodium, chloride and the calculated bicarbonate the machine also works out the anion gap.",
      ],
      out: [["Measures", "Na⁺, K⁺, Ca²⁺, Cl⁻, glucose, lactate"], ["Signal", "voltage (ions) or current (enzyme reactions)"], ["Calculated from these", "anion gap"]],
    },
    {
      title: "Calculator and printout",
      drop: [358, 196],
      body: [
        "Now the arithmetic. With pH and PaCO₂ measured, the machine solves Henderson–Hasselbalch for bicarbonate: HCO₃⁻ = 0.225 × PaCO₂ × 10^(pH − 6.1). Then it puts bicarbonate, pH and haemoglobin into a Van Slyke-type equation for base excess, and a fixed-haemoglobin version for standard base excess.",
        "None of these numbers was measured. If the pH electrode drifts, bicarbonate and base excess drift with it. Calibration every few hours and quality-control samples keep the measured pair honest so the calculated ones can be trusted.",
      ],
      out: [["Calculates", "HCO₃⁻, actual BE, standard BE, standard HCO₃⁻, anion gap, P/F"], ["From", "pH and PaCO₂ (plus Hb for actual BE)"], ["Rule", "measured pair first, calculated values second"]],
    },
  ];

  const PRESETS = {
    normal: { pH: 7.4, paco2Kpa: 5.3, hbGl: 150, label: "Normal" },
    "acute-resp": { pH: 7.2, paco2Kpa: 9.3, hbGl: 150, label: "Acute respiratory acidosis" },
    "met-acid": { pH: 7.18, paco2Kpa: 4.1, hbGl: 150, label: "Metabolic acidosis" },
    chronic: { pH: 7.36, paco2Kpa: 8.0, hbGl: 170, label: "Chronic hypercapnia" },
    "met-alk": { pH: 7.52, paco2Kpa: 6.0, hbGl: 150, label: "Metabolic alkalosis" },
  };

  const state = { step: 1, input: { ...PRESETS.normal }, preset: "normal" };
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
    els.stationBody.innerHTML = s.body.map((p) => `<p>${p}</p>`).join("");
    els.stationOut.innerHTML = s.out.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");

    document.querySelectorAll(".machine .station").forEach((g) => {
      g.classList.toggle("is-active", Number(g.getAttribute("data-step")) === state.step);
    });
    document.querySelectorAll(".station-dots button").forEach((b) => {
      const active = Number(b.getAttribute("data-step")) === state.step;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-current", active ? "step" : "false");
    });
    /* CSS transform (user units) so the drop slides between stations */
    els.sampleDrop.style.transform = `translate(${s.drop[0]}px, ${s.drop[1]}px)`;

    els.btnPrev.disabled = state.step === 1;
    els.btnNext.disabled = state.step === total;
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
      "step-num", "step-total", "btn-prev", "btn-next", "sample-drop",
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
