/*
 * The Wagon Depot - acid-base model.
 *
 * Everything on screen derives from the Henderson-Hasselbalch equation:
 *
 *   pH = 6.1 + log10( [HCO3-] / (0.03 x PaCO2 mmHg) )
 *      = 6.1 + log10( [HCO3-] / (0.225 x PaCO2 kPa) )
 *
 * Saloon reading: pH depends on the ratio of sheriffs (HCO3-) to wagon
 * pressure (dissolved CO2), not on the raw number of sheriffs in town.
 *
 * Teaching aid only. Rules of thumb (acute/chronic respiratory shifts,
 * Winter's formula, Van Slyke base excess) are the textbook approximations.
 */
(function () {
  "use strict";

  const MMHG_PER_KPA = 7.50062;
  const SOLUBILITY_MMHG = 0.03; // mmol/L dissolved CO2 per mmHg
  const SOLUBILITY_KPA = SOLUBILITY_MMHG * MMHG_PER_KPA; // ~0.225 per kPa
  const PK = 6.1;

  const NORMAL = { paco2Kpa: 5.33, paco2MmHg: 40, hco3: 24, pH: 7.4, hPlus: 40 };

  const LIMITS = {
    paco2Kpa: { min: 2.0, max: 12.0 },
    days: { min: 0, max: 5 },
    metabolicOffset: { min: -20, max: 16 },
    hco3: { min: 4, max: 60 },
    pH: { min: 6.6, max: 7.9 },
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function round(value, dp) {
    const f = 10 ** dp;
    return Math.round(value * f) / f;
  }

  function kpaToMmHg(kpa) {
    return kpa * MMHG_PER_KPA;
  }

  function mmHgToKpa(mmHg) {
    return mmHg / MMHG_PER_KPA;
  }

  /** Dissolved CO2 in mmol/L - the "wagon pressure" term. */
  function dissolvedCo2(paco2Kpa) {
    return SOLUBILITY_KPA * paco2Kpa;
  }

  /** Sheriffs per unit of wagon pressure. Normal is about 20:1. */
  function ratio(hco3, paco2Kpa) {
    return hco3 / dissolvedCo2(paco2Kpa);
  }

  function pHFrom(hco3, paco2Kpa) {
    return PK + Math.log10(ratio(hco3, paco2Kpa));
  }

  /** Free hydrogen ions in nmol/L. pH 7.40 is 40 nmol/L. */
  function hPlusFrom(pH) {
    return Math.pow(10, 9 - pH);
  }

  /** Van Slyke style standard base excess (mmol/L). */
  function baseExcessFrom(hco3, pH) {
    return 0.93 * (hco3 - 24.4 + 14.8 * (pH - 7.4));
  }

  /**
   * How much HCO3 moves for a respiratory change.
   * Acute (buffering by haemoglobin and tissues, minutes):
   *   +1 mmol/L per 10 mmHg rise, -2 per 10 mmHg fall.
   * Chronic (kidneys, 3-5 days):
   *   +3.5 per 10 mmHg rise, -5 per 10 mmHg fall.
   * Returns the acute buffer shift and the extra kidney shift separately so the
   * town can draw bunkhouse deputies and recruitment separately.
   */
  function respiratoryShift(paco2Kpa, kidneyFraction) {
    const dMmHg = kpaToMmHg(paco2Kpa) - NORMAL.paco2MmHg;
    const acute = dMmHg >= 0 ? 0.1 * dMmHg : 0.2 * dMmHg;
    const chronic = dMmHg >= 0 ? 0.35 * dMmHg : 0.5 * dMmHg;
    return { acute, kidney: (chronic - acute) * kidneyFraction };
  }

  /** 0 at time zero, about 0.5 by day 1, 0.96 by day 5. */
  function kidneyFraction(days) {
    return 1 - Math.exp(-days / 1.5);
  }

  /** Winter's formula: expected PaCO2 (kPa) when lungs compensate a metabolic acidosis. */
  function wintersPaco2Kpa(hco3) {
    return mmHgToKpa(1.5 * hco3 + 8);
  }

  /**
   * "Park the wagons at 40": the state this blood would have at normal PaCO2
   * with the same base excess. Solved by fixed-point iteration of the Van Slyke
   * relation at PaCO2 = 40 mmHg.
   */
  function standardState(baseExcess) {
    let pH = NORMAL.pH;
    let hco3 = 24.4;
    for (let i = 0; i < 40; i += 1) {
      hco3 = clamp(24.4 + baseExcess / 0.93 - 14.8 * (pH - 7.4), LIMITS.hco3.min, LIMITS.hco3.max);
      pH = clamp(pHFrom(hco3, NORMAL.paco2Kpa), LIMITS.pH.min, LIMITS.pH.max);
    }
    return { pH, hco3, hPlus: hPlusFrom(pH) };
  }

  /**
   * Sprite counts for the town. These are scaled so the picture stays readable;
   * the readouts always show the real numbers.
   */
  function spriteCounts(result) {
    return {
      wagons: clamp(Math.round(result.paco2MmHg / 5), 2, 24),
      sheriffs: clamp(Math.round(result.hco3 / 2), 2, 30),
      outlaws: clamp(Math.round(result.hPlus / 5), 2, 40),
      held: clamp(Math.round(Math.max(0, result.acuteBuffer) * 2), 0, 12),
    };
  }

  /**
   * Main entry. input = { paco2Kpa, days, metabolicOffset }
   *   paco2Kpa        wagon pressure set by the Marshal's patrol
   *   days            time since the wagon traffic changed (0 = acute)
   *   metabolicOffset mmol/L of sheriffs removed by outlaw posses (negative)
   *                   or added by sheriff trains (positive)
   */
  function compute(input) {
    const paco2Kpa = clamp(Number(input.paco2Kpa) || NORMAL.paco2Kpa, LIMITS.paco2Kpa.min, LIMITS.paco2Kpa.max);
    const days = clamp(Number(input.days) || 0, LIMITS.days.min, LIMITS.days.max);
    const metabolicOffset = clamp(Number(input.metabolicOffset) || 0, LIMITS.metabolicOffset.min, LIMITS.metabolicOffset.max);

    const shift = respiratoryShift(paco2Kpa, kidneyFraction(days));
    const hco3 = clamp(NORMAL.hco3 + metabolicOffset + shift.acute + shift.kidney, LIMITS.hco3.min, LIMITS.hco3.max);
    const pH = clamp(pHFrom(hco3, paco2Kpa), LIMITS.pH.min, LIMITS.pH.max);
    const hPlus = hPlusFrom(pH);
    const baseExcess = baseExcessFrom(hco3, pH);

    const result = {
      paco2Kpa,
      paco2MmHg: kpaToMmHg(paco2Kpa),
      dissolvedCo2: dissolvedCo2(paco2Kpa),
      hco3,
      pH,
      hPlus,
      ratio: ratio(hco3, paco2Kpa),
      baseExcess,
      acuteBuffer: shift.acute,
      kidneyShift: shift.kidney,
      kidneyFraction: kidneyFraction(days),
      metabolicOffset,
      days,
      standard: standardState(baseExcess),
    };
    result.sprites = spriteCounts(result);
    return result;
  }

  window.WagonDepotModel = {
    MMHG_PER_KPA,
    SOLUBILITY_MMHG,
    SOLUBILITY_KPA,
    PK,
    NORMAL,
    LIMITS,
    clamp,
    round,
    kpaToMmHg,
    mmHgToKpa,
    dissolvedCo2,
    ratio,
    pHFrom,
    hPlusFrom,
    baseExcessFrom,
    respiratoryShift,
    kidneyFraction,
    wintersPaco2Kpa,
    standardState,
    spriteCounts,
    compute,
  };
})();
