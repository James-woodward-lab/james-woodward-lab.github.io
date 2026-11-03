/*
 * The Assay Office - what the analyser calculates.
 *
 * Pure functions, no DOM. The analyser MEASURES pH and PaCO2 (and PaO2, Hb,
 * electrolytes). Bicarbonate and base excess are CALCULATED from them.
 *
 * Units: PaCO2 in kPa throughout (mmHg helpers provided). Hb in g/dL inside
 * the Van Slyke form (UK g/L is converted by the caller or via hbGdl()).
 *
 * The constants are the commonly quoted Siggaard-Andersen / Van Slyke
 * approximations. Manufacturers' algorithms differ slightly.
 */
(function () {
  "use strict";

  const MMHG_PER_KPA = 7.50062;
  const PK = 6.1;
  const SOLUBILITY_MMHG = 0.03;                       // mmol/L per mmHg
  const SOLUBILITY_KPA = SOLUBILITY_MMHG * MMHG_PER_KPA; // ~0.225 per kPa

  function kpaToMmHg(kpa) {
    return kpa * MMHG_PER_KPA;
  }

  function mmHgToKpa(mmHg) {
    return mmHg / MMHG_PER_KPA;
  }

  /** g/L (UK) -> g/dL (used in the Van Slyke formula). */
  function hbGdl(hbGl) {
    return hbGl / 10;
  }

  /** Dissolved CO2 in mmol/L. */
  function dissolvedCo2(paco2Kpa) {
    return SOLUBILITY_KPA * paco2Kpa;
  }

  /**
   * Calculated bicarbonate (mmol/L) from measured pH and PaCO2.
   *   [HCO3-] = 0.225 x PaCO2(kPa) x 10^(pH - 6.1)
   *           = 0.03  x PaCO2(mmHg) x 10^(pH - 6.1)
   */
  function hco3(pH, paco2Kpa) {
    return dissolvedCo2(paco2Kpa) * Math.pow(10, pH - PK);
  }

  /** H+ in nmol/L. */
  function hPlus(pH) {
    return Math.pow(10, 9 - pH);
  }

  /**
   * Simplified (Hb-free) base excess, mmol/L.
   *   BE = 0.9287 x ([HCO3-] - 24.4 + 14.83 x (pH - 7.40))
   */
  function beSimple(hco3Value, pH) {
    return 0.9287 * (hco3Value - 24.4 + 14.83 * (pH - 7.4));
  }

  /**
   * Same quantity written straight from pH and PaCO2.
   *   BE = 0.02786 x PaCO2(mmHg) x 10^(pH - 6.1) + 13.77 x pH - 124.58
   *      = 0.209   x PaCO2(kPa)  x 10^(pH - 6.1) + 13.77 x pH - 124.58
   */
  function beDirect(pH, paco2Kpa) {
    return 0.02786 * kpaToMmHg(paco2Kpa) * Math.pow(10, pH - PK) + 13.77 * pH - 124.58;
  }

  /**
   * Hb-aware Van Slyke actual base excess of blood, mmol/L. Hb in g/dL.
   *   BE = (1 - 0.014 x Hb) x ([HCO3-] - 24.8 + (1.43 x Hb + 7.7) x (pH - 7.40))
   */
  function beVanSlyke(hco3Value, pH, hbGdlValue) {
    return (1 - 0.014 * hbGdlValue) * (hco3Value - 24.8 + (1.43 * hbGdlValue + 7.7) * (pH - 7.4));
  }

  /**
   * Standard base excess (extracellular fluid, Hb taken as ~5 g/dL), mmol/L.
   *   SBE = [HCO3-] - 24.8 + 16.2 x (pH - 7.40)
   */
  function sbe(hco3Value, pH) {
    return hco3Value - 24.8 + 16.2 * (pH - 7.4);
  }

  /** Everything the printout shows, from the three measured inputs. */
  function compute(input) {
    const pH = Number(input.pH);
    const paco2Kpa = Number(input.paco2Kpa);
    const hbGl = Number(input.hbGl);
    const gdl = hbGdl(hbGl);
    const h = hco3(pH, paco2Kpa);
    return {
      pH,
      paco2Kpa,
      paco2MmHg: kpaToMmHg(paco2Kpa),
      hbGl,
      hbGdl: gdl,
      dissolvedCo2: dissolvedCo2(paco2Kpa),
      hPlus: hPlus(pH),
      hco3: h,
      beSimple: beSimple(h, pH),
      beDirect: beDirect(pH, paco2Kpa),
      beVanSlyke: beVanSlyke(h, pH, gdl),
      sbe: sbe(h, pH),
    };
  }

  window.AssayCalc = {
    MMHG_PER_KPA,
    PK,
    SOLUBILITY_MMHG,
    SOLUBILITY_KPA,
    kpaToMmHg,
    mmHgToKpa,
    hbGdl,
    dissolvedCo2,
    hco3,
    hPlus,
    beSimple,
    beDirect,
    beVanSlyke,
    sbe,
    compute,
  };
})();
