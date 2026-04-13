(function () {
  "use strict";

  function assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  function runGasInterpreterTestcases() {
    const engine = window.GasInterpreter;
    if (!engine) {
      throw new Error("GasInterpreter module not loaded.");
    }

    const cases = [];

    cases.push(function providedExampleCase() {
      const out = engine.runInterpreter({
        ageGroup: "child",
        sampleType: "arterial",
        units: "kpa",
        pH: 7.18,
        pco2: 2.8,
        hco3: 8,
        na: 138,
        cl: 101,
        albumin: 4.0,
        lactate: 6.2,
      });
      assert(out.errors.length === 0, "Provided case should parse without errors");
      assert(out.ph.status === "Acidaemia", "Provided case should be acidaemia");
      assert(out.primary.primary === "Metabolic acidosis", "Provided case primary should be metabolic acidosis");
      assert(out.compensation.status === "Compensation appropriate", "Provided case should have appropriate Winter compensation");
      assert(Math.round(out.anionGap.ag) === 29, "Provided case AG should be 29");
      assert(out.anionGap.highGap === true, "Provided case should be high AG");
      assert(out.deltaDelta && out.deltaDelta.ratio > 1 && out.deltaDelta.ratio < 1.2, "Provided case delta-delta should be about 1.06");
      assert(out.lactate && out.lactate.tier === "Significantly elevated", "Provided case lactate should be significantly elevated");
    });

    cases.push(function venousCorrectionCase() {
      const out = engine.runInterpreter({
        ageGroup: "child",
        sampleType: "venous",
        units: "kpa",
        pH: 7.30,
        pco2: 6.5,
        hco3: 20,
      });
      assert(out.sampleNotes.some((n) => n.includes("Venous correction applied")), "Venous correction note expected");
      assert(out.parsed.pH === 7.34, "Venous corrected pH expected 7.34");
      assert(Math.abs(out.parsed.pco2Kpa - 5.7) < 0.001, "Venous corrected PaCO2 expected 5.7 kPa");
    });

    cases.push(function wintersInadequateCase() {
      const out = engine.runInterpreter({
        ageGroup: "child",
        sampleType: "arterial",
        units: "kpa",
        pH: 7.1,
        pco2: 5.5,
        hco3: 10,
        na: 136,
        cl: 100,
      });
      assert(out.primary.primary.includes("Metabolic acidosis"), "Should be metabolic acidosis");
      assert(out.compensation.status === "Compensation inadequate", "Should flag inadequate compensation");
    });

    cases.push(function correctedAnionGapCrossesThreshold() {
      const out = engine.runInterpreter({
        ageGroup: "child",
        sampleType: "arterial",
        units: "kpa",
        pH: 7.2,
        pco2: 3.8,
        hco3: 12,
        na: 136,
        cl: 112,
        albumin: 2.0,
      });
      assert(out.anionGap.ag === 12, "Raw AG expected 12");
      assert(out.anionGap.correctedAg === 17, "Corrected AG expected 17");
      assert(out.anionGap.maskedByAlbumin === true, "Should flag albumin masking");
    });

    cases.push(function oxygenationAndLactateThresholds() {
      const out = engine.runInterpreter({
        ageGroup: "child",
        sampleType: "arterial",
        units: "kpa",
        pH: 7.39,
        pco2: 5.1,
        hco3: 24,
        po2: 8.0,
        fio2: 0.4,
        lactate: 3.0,
      });
      assert(out.oxygenation && out.oxygenation.hypoxaemia === "Mild hypoxaemia", "Should flag mild hypoxaemia");
      assert(out.oxygenation && out.oxygenation.pfClass.includes("threshold"), "Should classify PF threshold");
      assert(out.lactate && out.lactate.tier === "Elevated", "Lactate should be elevated");
    });

    cases.push(function deltaDeltaBoundaryCase() {
      const out = engine.runInterpreter({
        ageGroup: "child",
        sampleType: "arterial",
        units: "kpa",
        pH: 7.2,
        pco2: 3.5,
        hco3: 14,
        na: 140,
        cl: 100,
      });
      assert(out.deltaDelta && out.deltaDelta.ratio > 1.5 && out.deltaDelta.ratio < 1.9, "Delta-delta boundary should be in pure high AG band");
    });

    cases.forEach(function (testFn, idx) {
      testFn();
      console.log(`Case ${idx + 1} passed: ${testFn.name}`);
    });

    console.log("All gas interpreter testcases passed.");
    return true;
  }

  window.runGasInterpreterTestcases = runGasInterpreterTestcases;
})();
