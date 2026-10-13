(function () {
  "use strict";

  function assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  function runGasRodeoGeneratorTestcases() {
    const generator = window.GasRodeoGenerator;
    const logic = window.GasRodeoLogic;
    if (!generator || !logic) {
      throw new Error("GasRodeoGenerator and GasRodeoLogic must be loaded.");
    }

    const ageGroup = "day0";

    generator.ARCHETYPES.forEach((arch) => {
      if (arch.primary === "No clear primary acid-base disorder") {
        return;
      }
      let matched = 0;
      for (let i = 0; i < 30; i += 1) {
        const built = generator.buildForArchetype(arch, ageGroup);
        const ev = logic.evaluateGas(built, ageGroup);
        if (ev.primary === arch.primary) {
          matched += 1;
        }
      }
      assert(matched >= 8, `${arch.primary} should match often (got ${matched}/30)`);
    });

    for (let i = 0; i < 40; i += 1) {
      const normal = generator.generateGas(ageGroup, false);
      assert(
        normal.evaluation.primary === "No clear primary acid-base disorder",
        "Forced normal should be no clear disorder"
      );
      assert(normal.evaluation.isMustCatch === false, "Normals must not be must-catch");
    }

    for (let i = 0; i < 40; i += 1) {
      const abn = generator.generateGas(ageGroup, true);
      assert(abn.evaluation.isMustCatch === true, "Forced abnormal must be must-catch");
    }

    return "All Gas Rodeo generator testcases passed.";
  }

  window.runGasRodeoGeneratorTestcases = runGasRodeoGeneratorTestcases;
})();
