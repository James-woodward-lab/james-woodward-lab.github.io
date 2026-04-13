(function () {
  "use strict";

  const KPA_PER_MMHG = 1 / 7.5;
  const MMHG_PER_KPA = 7.5;

  const AGE_NORMS = {
    day0: { pH: { low: 7.26, high: 7.49 } },
    day1to2: { pH: { low: 7.29, high: 7.45 } },
    child: { pH: { low: 7.35, high: 7.45 } },
  };

  const ARTERIAL_NORMS = {
    pco2Kpa: { low: 4.7, high: 6.0 },
    hco3: { low: 22, high: 26 },
    baseExcess: { low: -2, high: 2 },
    po2Kpa: { low: 10.6, high: 13.3 },
    lactate: { low: 0, high: 2.0 },
  };

  function numOrNull(value) {
    if (value === "" || value === null || value === undefined) {
      return null;
    }
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function toKpa(value, units) {
    return units === "mmhg" ? value * KPA_PER_MMHG : value;
  }

  function toMmhg(valueKpa) {
    return valueKpa * MMHG_PER_KPA;
  }

  function round(value, dp) {
    const factor = 10 ** dp;
    return Math.round(value * factor) / factor;
  }

  function getAgeNorms(ageGroup) {
    return AGE_NORMS[ageGroup] || AGE_NORMS.child;
  }

  function parseInputs(raw) {
    const errors = [];
    const warnings = [];

    const parsed = {
      ageGroup: raw.ageGroup || "child",
      sampleType: raw.sampleType || "arterial",
      units: raw.units || "kpa",
      fio2: numOrNull(raw.fio2),
      pH: numOrNull(raw.pH),
      pco2Raw: numOrNull(raw.pco2),
      hco3: numOrNull(raw.hco3),
      baseExcess: numOrNull(raw.baseExcess),
      po2Raw: numOrNull(raw.po2),
      na: numOrNull(raw.na),
      cl: numOrNull(raw.cl),
      albumin: numOrNull(raw.albumin),
      lactate: numOrNull(raw.lactate),
    };

    if (parsed.pH === null || parsed.pco2Raw === null || parsed.hco3 === null) {
      errors.push("pH, PaCO2, and HCO3 are required.");
    }

    if (parsed.pH !== null && (parsed.pH < 6.5 || parsed.pH > 7.9)) {
      errors.push("pH outside expected range (6.5-7.9). Check value.");
    }

    if (parsed.pco2Raw !== null) {
      const low = parsed.units === "mmhg" ? 7.5 : 1.0;
      const high = parsed.units === "mmhg" ? 112 : 15.0;
      if (parsed.pco2Raw < low || parsed.pco2Raw > high) {
        errors.push("PaCO2 outside expected range. Check value.");
      }
    }

    if (parsed.hco3 !== null && (parsed.hco3 < 2 || parsed.hco3 > 45)) {
      errors.push("HCO3 outside expected range (2-45). Check value.");
    }

    if (parsed.fio2 !== null && (parsed.fio2 < 0.21 || parsed.fio2 > 1.0)) {
      errors.push("FiO2 must be between 0.21 and 1.0.");
    }

    if (parsed.baseExcess !== null && parsed.hco3 !== null) {
      if (parsed.baseExcess > 2 && parsed.hco3 < 22) {
        warnings.push("Base excess suggests alkalosis while HCO3 suggests acidosis.");
      }
      if (parsed.baseExcess < -2 && parsed.hco3 > 26) {
        warnings.push("Base excess suggests acidosis while HCO3 suggests alkalosis.");
      }
    }

    parsed.pco2Kpa = parsed.pco2Raw === null ? null : toKpa(parsed.pco2Raw, parsed.units);
    parsed.po2Kpa = parsed.po2Raw === null ? null : toKpa(parsed.po2Raw, parsed.units);

    return { parsed, errors, warnings };
  }

  function applyVenousCorrection(parsed) {
    const notes = [];
    const adjusted = { ...parsed };
    if (parsed.sampleType === "venous") {
      if (adjusted.pH !== null) {
        adjusted.pH = round(adjusted.pH + 0.04, 3);
      }
      if (adjusted.pco2Kpa !== null) {
        adjusted.pco2Kpa = round(adjusted.pco2Kpa - 0.8, 3);
      }
      notes.push("Venous correction applied: pH +0.04, PaCO2 -0.8 kPa.");
    } else if (parsed.sampleType === "capillary") {
      notes.push("Capillary sample interpreted as near-arterial; clinical context still required.");
    }
    return { adjusted, notes };
  }

  function classifyRelative(value, range) {
    if (value < range.low) {
      return "low";
    }
    if (value > range.high) {
      return "high";
    }
    return "normal";
  }

  function interpretPH(pH, ageNorms) {
    let status = "Normal pH";
    if (pH < ageNorms.pH.low) {
      status = "Acidaemia";
    } else if (pH > ageNorms.pH.high) {
      status = "Alkalaemia";
    }
    return {
      status,
      withinRange: status === "Normal pH",
      range: ageNorms.pH,
    };
  }

  function identifyPrimaryDisorder(data, phInterpretation) {
    const pco2Direction = classifyRelative(data.pco2Kpa, ARTERIAL_NORMS.pco2Kpa);
    const hco3Direction = classifyRelative(data.hco3, ARTERIAL_NORMS.hco3);
    const phStatus = phInterpretation.status;
    const mixedFlags = [];
    let primary = "Undetermined";

    if (phStatus === "Acidaemia") {
      if (pco2Direction === "high" && hco3Direction !== "low") {
        primary = "Respiratory acidosis";
      } else if (hco3Direction === "low" && pco2Direction !== "high") {
        primary = "Metabolic acidosis";
      } else if (hco3Direction === "low" && pco2Direction === "high") {
        primary = "Mixed metabolic and respiratory acidosis";
        mixedFlags.push("Both PaCO2 and HCO3 changes worsen acidaemia.");
      }
    } else if (phStatus === "Alkalaemia") {
      if (pco2Direction === "low" && hco3Direction !== "high") {
        primary = "Respiratory alkalosis";
      } else if (hco3Direction === "high" && pco2Direction !== "low") {
        primary = "Metabolic alkalosis";
      } else if (hco3Direction === "high" && pco2Direction === "low") {
        primary = "Mixed metabolic and respiratory alkalosis";
        mixedFlags.push("Both PaCO2 and HCO3 changes worsen alkalaemia.");
      }
    } else {
      if (pco2Direction !== "normal" || hco3Direction !== "normal") {
        primary = "Possible compensated or mixed disorder";
        if (pco2Direction !== "normal" && hco3Direction !== "normal") {
          mixedFlags.push("Normal pH with dual derangements may represent mixed disease.");
        }
      } else {
        primary = "No clear primary acid-base disorder";
      }
    }

    if (
      pco2Direction !== "normal" &&
      hco3Direction !== "normal" &&
      ((pco2Direction === "low" && hco3Direction === "high") ||
        (pco2Direction === "high" && hco3Direction === "low"))
    ) {
      mixedFlags.push("Opposite-direction PaCO2 and HCO3 derangement suggests mixed process.");
    }

    return {
      primary,
      pco2Direction,
      hco3Direction,
      mixedFlags,
    };
  }

  function inRange(value, low, high) {
    return value >= low && value <= high;
  }

  function checkCompensation(primary, data) {
    const pco2Mmhg = toMmhg(data.pco2Kpa);
    const hco3 = data.hco3;
    const result = {
      status: "Not assessable",
      detail: "No applicable compensation formula for this pattern.",
      expected: null,
      mismatchFlag: null,
    };

    if (primary.includes("Metabolic acidosis")) {
      const expectedMmhg = 1.5 * hco3 + 8;
      const low = expectedMmhg - 2;
      const high = expectedMmhg + 2;
      const lowKpa = low * KPA_PER_MMHG;
      const highKpa = high * KPA_PER_MMHG;
      result.expected = { parameter: "PaCO2", lowKpa, highKpa, lowMmhg: low, highMmhg: high };
      if (inRange(pco2Mmhg, low, high)) {
        result.status = "Compensation appropriate";
      } else if (pco2Mmhg < low) {
        result.status = "Compensation excessive";
        result.mismatchFlag = "Additional respiratory alkalosis likely.";
      } else {
        result.status = "Compensation inadequate";
        result.mismatchFlag = "Additional respiratory acidosis likely.";
      }
      result.detail = `Winter's expected PaCO2 ${round(low, 1)}-${round(high, 1)} mmHg (${round(lowKpa, 2)}-${round(highKpa, 2)} kPa).`;
      return result;
    }

    if (primary.includes("Metabolic alkalosis")) {
      const expectedMmhg = 0.7 * hco3 + 21;
      const low = expectedMmhg - 2;
      const high = expectedMmhg + 2;
      const lowKpa = low * KPA_PER_MMHG;
      const highKpa = high * KPA_PER_MMHG;
      result.expected = { parameter: "PaCO2", lowKpa, highKpa, lowMmhg: low, highMmhg: high };
      if (inRange(pco2Mmhg, low, high)) {
        result.status = "Compensation appropriate";
      } else if (pco2Mmhg < low) {
        result.status = "Compensation inadequate";
        result.mismatchFlag = "Additional respiratory alkalosis likely.";
      } else {
        result.status = "Compensation excessive";
        result.mismatchFlag = "Additional respiratory acidosis likely.";
      }
      result.detail = `Expected PaCO2 ${round(low, 1)}-${round(high, 1)} mmHg (${round(lowKpa, 2)}-${round(highKpa, 2)} kPa).`;
      return result;
    }

    if (primary.includes("Respiratory acidosis")) {
      const delta = Math.max(0, pco2Mmhg - 40);
      const acuteExpected = 24 + 0.1 * delta;
      const chronicExpected = 24 + 0.35 * delta;
      const acuteLow = acuteExpected - 2;
      const acuteHigh = acuteExpected + 2;
      const chronicLow = chronicExpected - 2;
      const chronicHigh = chronicExpected + 2;
      const inAcute = inRange(hco3, acuteLow, acuteHigh);
      const inChronic = inRange(hco3, chronicLow, chronicHigh);

      result.expected = {
        parameter: "HCO3",
        acute: [acuteLow, acuteHigh],
        chronic: [chronicLow, chronicHigh],
      };
      if (inAcute || inChronic) {
        result.status = "Compensation appropriate";
      } else if (hco3 < acuteLow) {
        result.status = "Compensation inadequate";
        result.mismatchFlag = "Additional metabolic acidosis likely.";
      } else if (hco3 > chronicHigh) {
        result.status = "Compensation excessive";
        result.mismatchFlag = "Additional metabolic alkalosis likely.";
      } else {
        result.status = "Compensation indeterminate";
      }
      result.detail = `Expected HCO3 acute ${round(acuteLow, 1)}-${round(acuteHigh, 1)} and chronic ${round(chronicLow, 1)}-${round(chronicHigh, 1)} mmol/L.`;
      return result;
    }

    if (primary.includes("Respiratory alkalosis")) {
      const delta = Math.max(0, 40 - pco2Mmhg);
      const expected = 24 - 0.2 * delta;
      const low = expected - 2;
      const high = expected + 2;
      result.expected = { parameter: "HCO3", low, high };
      if (inRange(hco3, low, high)) {
        result.status = "Compensation appropriate";
      } else if (hco3 < low) {
        result.status = "Compensation excessive";
        result.mismatchFlag = "Additional metabolic acidosis likely.";
      } else {
        result.status = "Compensation inadequate";
        result.mismatchFlag = "Additional metabolic alkalosis likely.";
      }
      result.detail = `Expected HCO3 ${round(low, 1)}-${round(high, 1)} mmol/L for acute respiratory alkalosis.`;
      return result;
    }

    return result;
  }

  function calcAnionGap(data, primary) {
    if (!primary.includes("Metabolic acidosis")) {
      return null;
    }
    if (data.na === null || data.cl === null) {
      return null;
    }
    const ag = data.na - (data.cl + data.hco3);
    const highGap = ag > 16;
    let correctedAg = null;
    let maskedByAlbumin = false;
    if (data.albumin !== null) {
      correctedAg = ag + 2.5 * (4 - data.albumin);
      if (!highGap && correctedAg > 16) {
        maskedByAlbumin = true;
      }
    }
    return {
      ag,
      interpretation: highGap ? "High anion gap" : "Normal anion gap",
      highGap,
      correctedAg,
      maskedByAlbumin,
    };
  }

  function calcDeltaDelta(anionGap, hco3) {
    if (!anionGap || !anionGap.highGap) {
      return null;
    }
    const denominator = 24 - hco3;
    if (denominator <= 0) {
      return null;
    }
    const ratio = (anionGap.ag - 12) / denominator;
    let interpretation = "Indeterminate";
    if (ratio < 0.4) {
      interpretation = "Pure normal anion gap acidosis pattern";
    } else if (ratio < 0.8) {
      interpretation = "Mixed high and normal anion gap acidosis";
    } else if (ratio <= 2) {
      interpretation = "Pure high anion gap acidosis pattern";
    } else {
      interpretation = "High anion gap acidosis with concurrent metabolic alkalosis";
    }
    return { ratio, interpretation };
  }

  function assessOxygenation(data) {
    if (data.sampleType !== "arterial" || data.po2Kpa === null || data.fio2 === null) {
      return null;
    }
    let hypoxaemia = "No hypoxaemia";
    if (data.po2Kpa < 6) {
      hypoxaemia = "Severe hypoxaemia";
    } else if (data.po2Kpa < 8) {
      hypoxaemia = "Moderate hypoxaemia";
    } else if (data.po2Kpa < 10.6) {
      hypoxaemia = "Mild hypoxaemia";
    }

    const pOverFmmHg = toMmhg(data.po2Kpa) / data.fio2;
    let pfClass = "No acute oxygenation threshold crossed";
    if (pOverFmmHg < 200) {
      pfClass = "ARDS threshold crossed (<200 mmHg)";
    } else if (pOverFmmHg < 300) {
      pfClass = "Lung injury threshold crossed (<300 mmHg)";
    }
    return {
      hypoxaemia,
      pOverFmmHg,
      pOverFkPa: data.po2Kpa / data.fio2,
      pfClass,
    };
  }

  function assessLactate(lactate) {
    if (lactate === null) {
      return null;
    }
    if (lactate > 4) {
      return { tier: "Significantly elevated", note: "Urgent concern for shock or severe hypoperfusion." };
    }
    if (lactate >= 2) {
      return { tier: "Elevated", note: "Possible tissue hypoperfusion; reassess clinically." };
    }
    return { tier: "Normal", note: "No lactate elevation." };
  }

  function severityFromPH(pH) {
    if (pH < 7.2 || pH > 7.6) {
      return "severe";
    }
    if ((pH >= 7.2 && pH < 7.3) || (pH > 7.5 && pH <= 7.6)) {
      return "moderate";
    }
    if ((pH >= 7.3 && pH < 7.35) || (pH > 7.45 && pH <= 7.5)) {
      return "mild";
    }
    return "normal";
  }

  function buildDifferentials(primary, anionGap) {
    let title = "General acid-base differential";
    let items = [
      "Interpret in full clinical context and trend with repeat gases.",
      "Review ventilation status, perfusion, and medication exposures.",
    ];
    let prompt = "Recheck blood gas after intervention and correlate with bedside examination.";

    if (primary.includes("Metabolic acidosis")) {
      if (anionGap && anionGap.highGap) {
        title = "High anion gap metabolic acidosis";
        items = [
          "Methanol",
          "Uraemia",
          "DKA or starvation ketosis",
          "Paracetamol-related acidosis",
          "Iron or isoniazid",
          "Lactic acidosis",
          "Ethylene glycol",
          "Salicylates",
        ];
        prompt = "Check glucose, ketones, renal function, and toxicology screen urgently.";
      } else {
        title = "Normal anion gap metabolic acidosis";
        items = [
          "Diarrhoea",
          "Ureteric diversion",
          "Renal tubular acidosis",
          "Hyperchloraemia from saline",
          "Addison's disease",
          "TPN-related causes",
        ];
        prompt = "Review fluid composition, stool losses, and renal tubular function.";
      }
    } else if (primary.includes("Respiratory acidosis")) {
      title = "Respiratory acidosis differential";
      items = [
        "Obstructive airway disease (asthma, croup, bronchiolitis)",
        "Hypoventilation (sedation, neuromuscular weakness)",
        "Parenchymal lung disease (pneumonia, oedema)",
      ];
      prompt = "Assess airway patency and ventilation immediately; escalate respiratory support early.";
    } else if (primary.includes("Respiratory alkalosis")) {
      title = "Respiratory alkalosis differential";
      items = [
        "Anxiety or pain",
        "Fever or sepsis",
        "Early salicylate toxicity",
        "Iatrogenic over-ventilation",
      ];
      prompt = "Treat the precipitant and monitor for evolving mixed disorders.";
    } else if (primary.includes("Metabolic alkalosis")) {
      title = "Metabolic alkalosis differential";
      items = [
        "Vomiting or gastric losses",
        "Diuretic effect",
        "Chloride depletion",
        "Mineralocorticoid excess",
      ];
      prompt = "Review chloride status and volume state; correct potassium when indicated.";
    }

    return { title, items, prompt };
  }

  function makeStep(title, value, normalRange, conclusion) {
    return { title, value, normalRange, conclusion };
  }

  function buildHeadline(result) {
    const parts = [];
    if (result.ph.status === "Acidaemia") {
      parts.push("acidaemia");
    } else if (result.ph.status === "Alkalaemia") {
      parts.push("alkalaemia");
    }

    if (result.primary.primary !== "Undetermined" && result.primary.primary !== "No clear primary acid-base disorder") {
      parts.push(result.primary.primary.toLowerCase());
    }

    if (result.compensation.status !== "Not assessable") {
      parts.push(result.compensation.status.toLowerCase());
    }

    if (result.anionGap && result.anionGap.highGap) {
      parts.push("high anion gap");
    }

    if (result.lactate && result.lactate.tier !== "Normal") {
      parts.push(`${result.lactate.tier.toLowerCase()} lactate`);
    }

    const sentence = parts.length
      ? parts.join(" with ")
      : "No clear acid-base disturbance identified";
    return sentence.charAt(0).toUpperCase() + sentence.slice(1);
  }

  function runInterpreter(raw) {
    const { parsed, errors, warnings } = parseInputs(raw);
    if (errors.length) {
      return { errors, warnings };
    }

    const ageNorms = getAgeNorms(parsed.ageGroup);
    const correction = applyVenousCorrection(parsed);
    const adjusted = correction.adjusted;
    const ph = interpretPH(adjusted.pH, ageNorms);
    const primary = identifyPrimaryDisorder(adjusted, ph);
    const compensation = checkCompensation(primary.primary, adjusted);
    const anionGap = calcAnionGap(adjusted, primary.primary);
    const deltaDelta = calcDeltaDelta(anionGap, adjusted.hco3);
    const oxygenation = assessOxygenation(adjusted);
    const lactate = assessLactate(adjusted.lactate);
    const differential = buildDifferentials(primary.primary, anionGap);
    const severity = severityFromPH(adjusted.pH);
    const headline = buildHeadline({
      ph,
      primary,
      compensation,
      anionGap,
      lactate,
    });

    const steps = [
      makeStep(
        "Step 1: pH status",
        `pH ${round(adjusted.pH, 3)}`,
        `${ageNorms.pH.low}-${ageNorms.pH.high}`,
        ph.status
      ),
      makeStep(
        "Step 2: Primary driver",
        `PaCO2 ${round(adjusted.pco2Kpa, 2)} kPa; HCO3 ${round(adjusted.hco3, 1)} mmol/L`,
        `PaCO2 ${ARTERIAL_NORMS.pco2Kpa.low}-${ARTERIAL_NORMS.pco2Kpa.high} kPa; HCO3 ${ARTERIAL_NORMS.hco3.low}-${ARTERIAL_NORMS.hco3.high}`,
        [primary.primary].concat(primary.mixedFlags).join(" ")
      ),
      makeStep(
        "Step 3: Compensation",
        compensation.expected ? compensation.detail : "Not enough data",
        "Formula-based expected range",
        compensation.mismatchFlag ? `${compensation.status}. ${compensation.mismatchFlag}` : compensation.status
      ),
      makeStep(
        "Step 4: Anion gap",
        anionGap ? `AG ${round(anionGap.ag, 1)}` : "Not calculated",
        "Normal 8-16 mEq/L",
        anionGap
          ? `${anionGap.interpretation}${anionGap.correctedAg !== null ? `; corrected AG ${round(anionGap.correctedAg, 1)}` : ""}${anionGap.maskedByAlbumin ? " (hypoalbuminaemia may mask high AG)" : ""}`
          : "Requires metabolic acidosis with Na and Cl"
      ),
      makeStep(
        "Step 5: Delta-delta",
        deltaDelta ? `Delta-delta ${round(deltaDelta.ratio, 2)}` : "Not calculated",
        "Only for high AG metabolic acidosis",
        deltaDelta ? deltaDelta.interpretation : "Criteria not met"
      ),
      makeStep(
        "Step 6: Oxygenation",
        oxygenation
          ? `PaO2 ${round(adjusted.po2Kpa, 2)} kPa; P:F ${round(oxygenation.pOverFmmHg, 0)} mmHg`
          : "Not calculated",
        "Arterial PaO2 with FiO2 required",
        oxygenation ? `${oxygenation.hypoxaemia}. ${oxygenation.pfClass}.` : "Criteria not met"
      ),
      makeStep(
        "Step 7: Lactate",
        lactate ? `${round(adjusted.lactate, 1)} mmol/L` : "Not entered",
        "<2.0 mmol/L",
        lactate ? `${lactate.tier}. ${lactate.note}` : "No lactate provided"
      ),
    ];

    return {
      errors,
      warnings,
      parsed: adjusted,
      ph,
      primary,
      compensation,
      anionGap,
      deltaDelta,
      oxygenation,
      lactate,
      differential,
      steps,
      severity,
      headline,
      sampleNotes: correction.notes,
    };
  }

  function renderResults(result) {
    const errorEl = document.getElementById("validationErrors");
    const warningEl = document.getElementById("softWarnings");
    const badgeEl = document.getElementById("headlineBadge");
    const headlineEl = document.getElementById("headlineText");
    const notesEl = document.getElementById("sampleNotes");
    const stepsEl = document.getElementById("stepsContainer");
    const diffEl = document.getElementById("differentials");
    const promptEl = document.getElementById("clinicalPrompt");

    if (result.errors.length) {
      errorEl.classList.remove("hidden");
      errorEl.textContent = result.errors.join(" ");
      warningEl.classList.add("hidden");
      return;
    }

    errorEl.classList.add("hidden");

    if (result.warnings.length) {
      warningEl.classList.remove("hidden");
      warningEl.textContent = result.warnings.join(" ");
    } else {
      warningEl.classList.add("hidden");
    }

    badgeEl.className = `headline-badge ${result.severity}`;
    badgeEl.textContent = result.severity.toUpperCase();
    headlineEl.textContent = result.headline;
    notesEl.innerHTML = result.sampleNotes.map((note) => `<div>${note}</div>`).join("");

    stepsEl.innerHTML = result.steps
      .map(
        (step, idx) => `
          <details class="step-card" ${idx === 0 ? "open" : ""}>
            <summary>${step.title}</summary>
            <div class="step-body">
              <p><strong>Value:</strong> ${step.value}</p>
              <p><strong>Range used:</strong> ${step.normalRange}</p>
              <p><strong>Conclusion:</strong> ${step.conclusion}</p>
            </div>
          </details>
        `
      )
      .join("");

    diffEl.innerHTML = `
      <strong>${result.differential.title}</strong>
      <ul>${result.differential.items.map((item) => `<li>${item}</li>`).join("")}</ul>
    `;
    promptEl.textContent = `Don't forget: ${result.differential.prompt}`;
  }

  function clearAll() {
    const fields = [
      "fio2",
      "ph",
      "pco2",
      "hco3",
      "baseExcess",
      "po2",
      "na",
      "cl",
      "albumin",
      "lactate",
    ];
    fields.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.value = "";
      }
    });
    document.getElementById("validationErrors").classList.add("hidden");
    document.getElementById("softWarnings").classList.add("hidden");
    document.getElementById("headlineBadge").className = "headline-badge neutral";
    document.getElementById("headlineBadge").textContent = "Awaiting interpretation";
    document.getElementById("headlineText").textContent = "Enter required values and run interpretation.";
    document.getElementById("sampleNotes").textContent = "";
    document.getElementById("stepsContainer").innerHTML = "";
    document.getElementById("differentials").textContent = "No differential generated yet.";
    document.getElementById("clinicalPrompt").textContent = "";
  }

  function collectRawInputs() {
    return {
      ageGroup: document.getElementById("ageGroup").value,
      sampleType: document.getElementById("sampleType").value,
      units: document.getElementById("units").value,
      fio2: document.getElementById("fio2").value,
      pH: document.getElementById("ph").value,
      pco2: document.getElementById("pco2").value,
      hco3: document.getElementById("hco3").value,
      baseExcess: document.getElementById("baseExcess").value,
      po2: document.getElementById("po2").value,
      na: document.getElementById("na").value,
      cl: document.getElementById("cl").value,
      albumin: document.getElementById("albumin").value,
      lactate: document.getElementById("lactate").value,
    };
  }

  function init() {
    const interpretBtn = document.getElementById("interpretBtn");
    const clearBtn = document.getElementById("clearBtn");
    interpretBtn.addEventListener("click", function () {
      const result = runInterpreter(collectRawInputs());
      renderResults(result);
    });
    clearBtn.addEventListener("click", clearAll);
  }

  window.GasInterpreter = {
    parseInputs,
    getAgeNorms,
    applyVenousCorrection,
    interpretPH,
    identifyPrimaryDisorder,
    checkCompensation,
    calcAnionGap,
    calcDeltaDelta,
    assessOxygenation,
    assessLactate,
    buildDifferentials,
    runInterpreter,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
