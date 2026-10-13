(function () {
  "use strict";

  const core = window.GasCore;
  if (!core) {
    throw new Error("gas-core.js must load before gasGameLogic.js");
  }

  const SCORE = {
    catchAbnormal: 25,
    classifyCorrect: 75,
    falseLasso: -10,
    wrongClassify: -5,
    streakStep: 0.1,
    streakCap: 2,
  };

  const MAX_MISSES = 3;

  const TEACHING_HINTS = {
    "Respiratory acidosis": "High PaCO₂ drives acidaemia — think ventilation and airway.",
    "Metabolic acidosis": "Low HCO₃ with acidaemia — check perfusion, ketones, and losses.",
    "Respiratory alkalosis": "Low PaCO₂ with alkalaemia — pain, sepsis, or over-ventilation.",
    "Metabolic alkalosis": "High HCO₃ with alkalaemia — vomiting, diuretics, chloride loss.",
    "Mixed metabolic and respiratory acidosis": "Both PaCO₂ and HCO₃ worsen acidaemia.",
    "Mixed metabolic and respiratory alkalosis": "Both PaCO₂ and HCO₃ worsen alkalaemia.",
    "Possible compensated or mixed disorder": "Normal pH but off PaCO₂ or HCO₃ — compensation or mixed process.",
    "No clear primary acid-base disorder": "Values sit within expected ranges for age.",
  };

  const AGE_LABELS = {
    day0: "Day 0 (0–24h)",
    day1to2: "Day 1–2",
    child: ">2 days",
  };

  function evaluateGas(values, ageGroup) {
    return core.evaluateGas(values, ageGroup);
  }

  function formatGasValues(values) {
    return {
      pH: core.round(values.pH, 2),
      pco2: core.round(values.pco2Kpa, 1),
      po2: core.round(values.po2Kpa, 1),
      be: core.round(values.baseExcess, 1),
      hco3: core.round(values.hco3, 1),
    };
  }

  function bestScoreKey(ageGroup) {
    return `gasRodeoBest_${ageGroup}`;
  }

  function loadBestScore(ageGroup) {
    const raw = localStorage.getItem(bestScoreKey(ageGroup));
    const n = raw === null ? 0 : Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
  }

  function saveBestScore(ageGroup, score) {
    const prev = loadBestScore(ageGroup);
    if (score > prev) {
      localStorage.setItem(bestScoreKey(ageGroup), String(score));
      return score;
    }
    return prev;
  }

  function streakMultiplier(streak) {
    if (streak <= 1) {
      return 1;
    }
    const mult = 1 + (streak - 1) * SCORE.streakStep;
    return Math.min(SCORE.streakCap, mult);
  }

  window.GasRodeoLogic = {
    SCORE,
    MAX_MISSES,
    TEACHING_HINTS,
    AGE_LABELS,
    PRIMARY_DISORDERS: core.PRIMARY_DISORDERS,
    ARTERIAL_NORMS: core.ARTERIAL_NORMS,
    evaluateGas,
    formatGasValues,
    loadBestScore,
    saveBestScore,
    streakMultiplier,
  };
})();
