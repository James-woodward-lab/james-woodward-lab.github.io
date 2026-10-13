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

  const PRIMARY_DISORDERS = [
    "Respiratory acidosis",
    "Metabolic acidosis",
    "Respiratory alkalosis",
    "Metabolic alkalosis",
    "Mixed metabolic and respiratory acidosis",
    "Mixed metabolic and respiratory alkalosis",
    "Possible compensated or mixed disorder",
    "No clear primary acid-base disorder",
  ];

  function round(value, dp) {
    const factor = 10 ** dp;
    return Math.round(value * factor) / factor;
  }

  function getAgeNorms(ageGroup) {
    return AGE_NORMS[ageGroup] || AGE_NORMS.child;
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

  function paramHighlights(values, ageGroup) {
    const ageNorms = getAgeNorms(ageGroup);
    const out = {};
    out.pH = classifyRelative(values.pH, ageNorms.pH);
    out.pco2Kpa = classifyRelative(values.pco2Kpa, ARTERIAL_NORMS.pco2Kpa);
    out.hco3 = classifyRelative(values.hco3, ARTERIAL_NORMS.hco3);
    if (values.baseExcess != null) {
      out.baseExcess = classifyRelative(values.baseExcess, ARTERIAL_NORMS.baseExcess);
    }
    if (values.po2Kpa != null) {
      out.po2Kpa = classifyRelative(values.po2Kpa, ARTERIAL_NORMS.po2Kpa);
    }
    return out;
  }

  function evaluateGas(values, ageGroup) {
    const ageNorms = getAgeNorms(ageGroup);
    const data = {
      pH: values.pH,
      pco2Kpa: values.pco2Kpa,
      hco3: values.hco3,
    };
    const ph = interpretPH(data.pH, ageNorms);
    const disorder = identifyPrimaryDisorder(data, ph);
    const isMustCatch = disorder.primary !== "No clear primary acid-base disorder";
    return {
      ph,
      primary: disorder.primary,
      isMustCatch,
      pco2Direction: disorder.pco2Direction,
      hco3Direction: disorder.hco3Direction,
      mixedFlags: disorder.mixedFlags,
      highlights: paramHighlights(values, ageGroup),
    };
  }

  window.GasCore = {
    KPA_PER_MMHG,
    MMHG_PER_KPA,
    AGE_NORMS,
    ARTERIAL_NORMS,
    PRIMARY_DISORDERS,
    round,
    getAgeNorms,
    classifyRelative,
    interpretPH,
    identifyPrimaryDisorder,
    paramHighlights,
    evaluateGas,
  };
})();
