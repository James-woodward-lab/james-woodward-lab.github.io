(function () {
  "use strict";

  const core = window.GasCore;
  const logic = window.GasRodeoLogic;
  if (!core || !logic) {
    throw new Error("gas-core and gasGameLogic must load before gasGenerator.js");
  }

  const MUST_CATCH_RATIO = 0.55;
  const MAX_RESAMPLE = 20;

  const ARCHETYPES = [
    { id: "resp_acid", primary: "Respiratory acidosis", weight: 18 },
    { id: "met_acid", primary: "Metabolic acidosis", weight: 18 },
    { id: "resp_alk", primary: "Respiratory alkalosis", weight: 14 },
    { id: "met_alk", primary: "Metabolic alkalosis", weight: 14 },
    { id: "mixed_acid", primary: "Mixed metabolic and respiratory acidosis", weight: 10 },
    { id: "mixed_alk", primary: "Mixed metabolic and respiratory alkalosis", weight: 10 },
    { id: "compensated", primary: "Possible compensated or mixed disorder", weight: 10 },
    { id: "normal", primary: "No clear primary acid-base disorder", weight: 22 },
  ];

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function pickWeighted(items) {
    const total = items.reduce((s, i) => s + i.weight, 0);
    let r = Math.random() * total;
    for (const item of items) {
      r -= item.weight;
      if (r <= 0) {
        return item;
      }
    }
    return items[items.length - 1];
  }

  function beFromHco3(hco3) {
    return core.round((hco3 - 24) * 0.9 + rand(-0.5, 0.5), 1);
  }

  function randomPo2() {
    const n = core.ARTERIAL_NORMS.po2Kpa;
    return core.round(rand(n.low, n.high), 1);
  }

  function buildForArchetype(arch, ageGroup) {
    const ageNorms = core.getAgeNorms(ageGroup);
    let pH;
    let pco2Kpa;
    let hco3;

    switch (arch.id) {
      case "resp_acid":
        pH = rand(ageNorms.pH.low - 0.12, ageNorms.pH.low - 0.01);
        pco2Kpa = rand(6.2, 9.5);
        hco3 = rand(22, 28);
        break;
      case "met_acid":
        pH = rand(ageNorms.pH.low - 0.15, ageNorms.pH.low - 0.02);
        hco3 = rand(10, 18);
        pco2Kpa = rand(3.2, 5.2);
        break;
      case "resp_alk":
        pH = rand(ageNorms.pH.high + 0.01, ageNorms.pH.high + 0.1);
        pco2Kpa = rand(2.8, 4.2);
        hco3 = rand(22, 26);
        break;
      case "met_alk":
        pH = rand(ageNorms.pH.high + 0.01, ageNorms.pH.high + 0.08);
        hco3 = rand(28, 34);
        pco2Kpa = rand(4.8, 6.2);
        break;
      case "mixed_acid":
        pH = rand(ageNorms.pH.low - 0.18, ageNorms.pH.low - 0.03);
        pco2Kpa = rand(6.5, 9.0);
        hco3 = rand(12, 19);
        break;
      case "mixed_alk":
        pH = rand(ageNorms.pH.high + 0.02, ageNorms.pH.high + 0.12);
        pco2Kpa = rand(2.5, 4.0);
        hco3 = rand(28, 32);
        break;
      case "compensated":
        pH = rand(ageNorms.pH.low + 0.02, ageNorms.pH.high - 0.02);
        if (Math.random() < 0.5) {
          pco2Kpa = rand(6.3, 7.8);
          hco3 = rand(26, 30);
        } else {
          pco2Kpa = rand(3.5, 4.5);
          hco3 = rand(18, 21);
        }
        break;
      case "normal":
      default: {
        pH = rand(ageNorms.pH.low + 0.03, ageNorms.pH.high - 0.03);
        pco2Kpa = rand(4.9, 5.8);
        hco3 = rand(23, 25);
        break;
      }
    }

    pH = core.round(Math.min(7.55, Math.max(6.95, pH)), 2);
    pco2Kpa = core.round(pco2Kpa, 2);
    hco3 = core.round(hco3, 1);
    const baseExcess = beFromHco3(hco3);
    const po2Kpa = randomPo2();

    return {
      pH,
      pco2Kpa,
      hco3,
      baseExcess,
      po2Kpa,
    };
  }

  function generateGas(ageGroup, forceMustCatch) {
    let archPool = ARCHETYPES;
    if (forceMustCatch === true) {
      archPool = ARCHETYPES.filter((a) => a.primary !== "No clear primary acid-base disorder");
    } else if (forceMustCatch === false) {
      archPool = ARCHETYPES.filter((a) => a.primary === "No clear primary acid-base disorder");
    } else if (Math.random() >= MUST_CATCH_RATIO) {
      archPool = ARCHETYPES.filter((a) => a.primary === "No clear primary acid-base disorder");
    } else {
      archPool = ARCHETYPES.filter((a) => a.primary !== "No clear primary acid-base disorder");
    }

    for (let attempt = 0; attempt < MAX_RESAMPLE; attempt += 1) {
      const arch = pickWeighted(archPool);
      const values = buildForArchetype(arch, ageGroup);
      const evalResult = logic.evaluateGas(values, ageGroup);
      if (evalResult.primary === arch.primary) {
        return {
          values,
          evaluation: evalResult,
          intendedPrimary: arch.primary,
        };
      }
    }

    const fallback = buildForArchetype(
      { id: "normal", primary: "No clear primary acid-base disorder" },
      ageGroup
    );
    return {
      values: fallback,
      evaluation: logic.evaluateGas(fallback, ageGroup),
      intendedPrimary: "No clear primary acid-base disorder",
    };
  }

  window.GasRodeoGenerator = {
    ARCHETYPES,
    generateGas,
    buildForArchetype,
  };
})();
