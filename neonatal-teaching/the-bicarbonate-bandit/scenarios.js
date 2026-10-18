(function () {
  "use strict";

  const ACTIONS = [
    { id: "fio2", label: "Increase FiO₂" },
    { id: "vent", label: "Adjust ventilator settings" },
    { id: "fluid", label: "Give fluid / bolus" },
    { id: "glucose", label: "Correct glucose" },
    { id: "electrolyte", label: "Correct the electrolyte" },
    { id: "transfuse", label: "Transfuse red cells" },
    { id: "escalate", label: "Escalate to senior / neonatal team" },
    { id: "repeat_gas", label: "Repeat the gas" },
  ];

  const ACTION_LABELS = Object.fromEntries(ACTIONS.map((a) => [a.id, a.label]));

  const SCENARIOS = [
    // --- Increase FiO₂ (3) ---
    {
      id: "hypoxia-on-air",
      ageGroup: "day0",
      vignette: "Term baby, day 0. Mild work of breathing. Sats 85% in air.",
      context: { fio2: 0.21, sats: "85%", glucose: 3.8, bp: "stable" },
      values: { pH: 7.32, pco2Kpa: 5.4, po2Kpa: 5.8, baseExcess: -1.2, hco3: 22.5 },
      correctAction: "fio2",
      hint: "Low PaO₂ with desaturation in air — improve oxygen delivery first.",
      wrongHints: {
        vent: "Ventilation targets CO₂/work of breathing; hypoxaemia here needs oxygen first.",
        fluid: "Perfusion looks stable — hypoxia is the immediate problem.",
        glucose: "Glucose is normal; this is an oxygenation issue.",
        escalate: "Escalate if no response, but start by increasing FiO₂ now.",
        repeat_gas: "The picture fits clinical desaturation — act on oxygenation.",
      },
    },
    {
      id: "preterm-low-po2",
      ageGroup: "day1to2",
      vignette: "Preterm infant on nasal CPAP, FiO₂ 0.30. Sats falling to 88%. Quiet chest, good chest rise.",
      context: { fio2: 0.3, support: "nCPAP", sats: "88%" },
      values: { pH: 7.30, pco2Kpa: 5.6, po2Kpa: 6.2, baseExcess: -2.0, hco3: 21.8 },
      correctAction: "fio2",
      hint: "Hypoxaemia with acceptable CO₂ — titrate FiO₂ upward before changing ventilation.",
      wrongHints: {
        vent: "PaCO₂ is not the driver; oxygen first.",
        fluid: "No shock features described.",
        glucose: "No hypoglycaemia signalled.",
        escalate: "Reasonable if refractory, but increase FiO₂ immediately.",
        repeat_gas: "Clinical desats match the gas — treat oxygen first.",
      },
    },
    {
      id: "oxyhood-failure",
      ageGroup: "any",
      vignette: "Baby in oxygen hood FiO₂ 0.40. Pinkish but sats 89%. No increased work of breathing.",
      context: { fio2: 0.4, sats: "89%", wpb: "mild" },
      values: { pH: 7.36, pco2Kpa: 5.1, po2Kpa: 7.0, baseExcess: 0.5, hco3: 24.0 },
      correctAction: "fio2",
      hint: "Persistent hypoxaemia — increase oxygen concentration / escalate oxygen delivery.",
      wrongHints: {
        vent: "Acid–base is near normal; priority is PaO₂/sats.",
        fluid: "Not a perfusion problem on this vignette.",
        glucose: "Glucose not implicated.",
        escalate: "May need senior help soon, but raise FiO₂ now.",
        repeat_gas: "Consistent with hypoxaemia — do not delay oxygen.",
      },
    },

    // --- Adjust ventilator (3) ---
    {
      id: "rising-co2-on-vent",
      ageGroup: "day0",
      vignette: "Intubated term baby on SIMV. Rising CO₂, increasing work and tachycardia. Sats 96% on FiO₂ 0.30.",
      context: { fio2: 0.3, support: "SIMV", sats: "96%" },
      values: { pH: 7.18, pco2Kpa: 8.4, po2Kpa: 11.2, baseExcess: -2.5, hco3: 23.0 },
      correctAction: "vent",
      hint: "Respiratory acidosis / high PaCO₂ on a ventilator — adjust ventilation (rate/PIP/TV).",
      wrongHints: {
        fio2: "Oxygenation is adequate; the problem is CO₂ clearance.",
        fluid: "Primary issue is hypoventilation, not volume.",
        glucose: "No hypoglycaemia cue.",
        escalate: "Escalate if you cannot improve ventilation, but change settings now.",
        repeat_gas: "Pattern matches hypoventilation — treat, then recheck.",
      },
    },
    {
      id: "chronic-co2-creep",
      ageGroup: "day1to2",
      vignette: "Preterm on conventional ventilation. Gradual CO₂ rise over hours. Equal air entry, tube secure.",
      context: { support: "CMV", tube: "secure", sats: "94%" },
      values: { pH: 7.22, pco2Kpa: 7.8, po2Kpa: 10.8, baseExcess: 1.0, hco3: 24.5 },
      correctAction: "vent",
      hint: "Rising PaCO₂ with acidaemia — increase minute ventilation.",
      wrongHints: {
        fio2: "PaO₂/sats are acceptable.",
        fluid: "No shock narrative.",
        glucose: "Glucose not the issue.",
        escalate: "Call for help if stuck, but try ventilator adjustment first.",
        repeat_gas: "Trend is consistent — act on ventilation.",
      },
    },
    {
      id: "overvent-then-under",
      ageGroup: "any",
      vignette: "Baby recently reintubated. Now drowsy with high CO₂ and low pH. Chest rise inadequate.",
      context: { support: "ventilator", chestRise: "poor", sats: "93%" },
      values: { pH: 7.12, pco2Kpa: 9.1, po2Kpa: 10.0, baseExcess: -3.0, hco3: 22.0 },
      correctAction: "vent",
      hint: "Inadequate ventilation driving respiratory acidosis — improve ventilator settings / tube check as ventilation strategy.",
      wrongHints: {
        fio2: "Oxygenation is secondary here; CO₂ is critically high.",
        fluid: "Not the first move for pure hypoventilation.",
        glucose: "No glucose clue.",
        escalate: "Escalate in parallel if collapse risk, but ventilation is the order.",
        repeat_gas: "Clinical hypoventilation matches the gas.",
      },
    },

    // --- Fluid / bolus (3) ---
    {
      id: "shock-metabolic",
      ageGroup: "day0",
      vignette: "Pale mottled term baby. Capillary refill 4s, cool peripheries, tachycardia. Lactate rising.",
      context: { crt: "4s", bp: "low–normal", lactate: "5.5", glucose: 3.6 },
      values: { pH: 7.15, pco2Kpa: 4.2, po2Kpa: 11.0, baseExcess: -12.0, hco3: 12.5 },
      correctAction: "fluid",
      hint: "Metabolic acidosis with shock features — give fluid / bolus while investigating cause.",
      wrongHints: {
        fio2: "Oxygenation is not the main problem.",
        vent: "Lowish CO₂ suggests compensation, not hypoventilation.",
        glucose: "Glucose is acceptable; treat perfusion.",
        escalate: "Escalate as well, but fluid resuscitation is the immediate order.",
        repeat_gas: "Clinical shock fits the gas — treat perfusion now.",
      },
    },
    {
      id: "sepsis-poor-fill",
      ageGroup: "day1to2",
      vignette: "Day-2 baby, maternal chorioamnionitis. Poor feeding, tachycardia, CRT 3–4s. Warm shock picture evolving.",
      context: { crt: "3–4s", risk: "sepsis", glucose: 4.1 },
      values: { pH: 7.20, pco2Kpa: 3.8, po2Kpa: 12.0, baseExcess: -10.5, hco3: 13.8 },
      correctAction: "fluid",
      hint: "Metabolic acidosis with poor perfusion / sepsis pathway — fluid bolus with sepsis management.",
      wrongHints: {
        fio2: "PaO₂ is fine.",
        vent: "CO₂ is low (compensation), not retention.",
        glucose: "Glucose OK.",
        escalate: "Call senior early in sepsis, but fluid is the concrete next order here.",
        repeat_gas: "Do not delay treatment to re-sample.",
      },
    },
    {
      id: "volume-loss-acidosis",
      ageGroup: "any",
      vignette: "Post-operative neonate with ongoing losses. Cool, tachycardic, urine output down. ABG shows metabolic acidosis.",
      context: { urine: "low", crt: "3s", glucose: 4.0 },
      values: { pH: 7.19, pco2Kpa: 4.0, po2Kpa: 11.5, baseExcess: -11.0, hco3: 13.0 },
      correctAction: "fluid",
      hint: "Volume depletion with metabolic acidosis — restore circulating volume.",
      wrongHints: {
        fio2: "Not a primary oxygenation problem.",
        vent: "PaCO₂ is not high.",
        glucose: "Glucose normal.",
        escalate: "Escalate if refractory shock, but bolus first.",
        repeat_gas: "Clinical hypovolaemia matches — treat.",
      },
    },

    // --- Correct glucose (3) ---
    {
      id: "hypoglycaemia-acidosis",
      ageGroup: "day0",
      vignette: "Jittery day-0 baby. Poor feed. Bedside glucose 1.6 mmol/L. Mild tachypnoea.",
      context: { glucose: 1.6, sats: "95%", crt: "2s" },
      values: { pH: 7.25, pco2Kpa: 4.5, po2Kpa: 11.8, baseExcess: -8.0, hco3: 16.0 },
      correctAction: "glucose",
      hint: "Documented hypoglycaemia with metabolic derangement — correct glucose urgently.",
      wrongHints: {
        fio2: "Sats/PaO₂ are adequate.",
        vent: "Not a CO₂ retention story.",
        fluid: "Unless shocked, glucose correction is the priority named here.",
        escalate: "Escalate if severe/refractory, but give glucose now.",
        repeat_gas: "Hypoglycaemia is already confirmed at the bedside.",
      },
    },
    {
      id: "idm-low-sugar",
      ageGroup: "day0",
      vignette: "Infant of diabetic mother, 4 hours old. Lethargic. Glucose 1.9 mmol/L on two readings.",
      context: { glucose: 1.9, risk: "IDM", crt: "2s" },
      values: { pH: 7.28, pco2Kpa: 5.0, po2Kpa: 12.2, baseExcess: -6.5, hco3: 17.5 },
      correctAction: "glucose",
      hint: "Confirmed hypoglycaemia in a high-risk neonate — treat glucose first.",
      wrongHints: {
        fio2: "Oxygenation fine.",
        vent: "Ventilation not the issue.",
        fluid: "No clear shock; hypoglycaemia is explicit.",
        escalate: "Involve senior if hard to correct, but treat glucose now.",
        repeat_gas: "Do not wait for another gas to treat 1.9 mmol/L.",
      },
    },
    {
      id: "preterm-hypoglycaemia",
      ageGroup: "day1to2",
      vignette: "Preterm on IV fluids with infusion interruption overnight. Now floppy. Glucose 1.4 mmol/L.",
      context: { glucose: 1.4, fluids: "interrupted", sats: "96%" },
      values: { pH: 7.24, pco2Kpa: 4.8, po2Kpa: 11.0, baseExcess: -7.5, hco3: 16.8 },
      correctAction: "glucose",
      hint: "Severe hypoglycaemia — correct glucose immediately and restore glucose delivery.",
      wrongHints: {
        fio2: "Not hypoxaemia.",
        vent: "CO₂ acceptable.",
        fluid: "Volume not the named emergency — glucose is.",
        escalate: "Escalate if refractory hypoglycaemia after treatment started.",
        repeat_gas: "Treat the glucose first.",
      },
    },

    // --- Escalate (3) ---
    {
      id: "near-arrest",
      ageGroup: "day0",
      vignette: "Sudden collapse. Heart rate 70, weak pulses, gasping. Profound acidosis on gas.",
      context: { hr: 70, status: "collapse", sats: "unreliable" },
      values: { pH: 6.95, pco2Kpa: 9.5, po2Kpa: 4.5, baseExcess: -20.0, hco3: 8.0 },
      correctAction: "escalate",
      hint: "Life-threatening derangement / collapse — escalate to senior / neonatal emergency team now (ABC and help).",
      wrongHints: {
        fio2: "Alone is not enough in collapse — get help and resuscitate.",
        vent: "Ventilation is part of ABC, but the order here is escalate for emergency support.",
        fluid: "May be needed, but first get the team.",
        glucose: "Check glucose as part of A–E, but this is a crash call scenario.",
        repeat_gas: "Do not delay for another sample.",
      },
    },
    {
      id: "mixed-severe",
      ageGroup: "any",
      vignette: "Deteriorating baby with mixed severe acidosis, rising lactate, and you are unsure of the driver. Local policy: early senior review.",
      context: { lactate: "8.0", crt: "3s", sats: "90%" },
      values: { pH: 7.05, pco2Kpa: 7.5, po2Kpa: 8.0, baseExcess: -15.0, hco3: 14.0 },
      correctAction: "escalate",
      hint: "Severe mixed picture with uncertainty — escalate to senior / neonatal team while supporting ABC.",
      wrongHints: {
        fio2: "May help oxygenation but does not address the whole emergency.",
        vent: "May be part of care; senior escalation is the priority order asked.",
        fluid: "Possible, but get senior help for this severity.",
        glucose: "Check glucose, but escalate for this derangement.",
        repeat_gas: "Do not wait — escalate and treat.",
      },
    },
    {
      id: "out-of-scope-ward",
      ageGroup: "day1to2",
      vignette: "Ward nurse calls: baby grey, apnoeas clustering, gas worsening. You are the only doctor on the floor.",
      context: { apnoeas: "clustering", colour: "grey", sats: "80s" },
      values: { pH: 7.10, pco2Kpa: 8.8, po2Kpa: 6.5, baseExcess: -9.0, hco3: 18.0 },
      correctAction: "escalate",
      hint: "Deteriorating neonate beyond single-handed management — escalate / crash call while supporting airway.",
      wrongHints: {
        fio2: "Support oxygen, but get help.",
        vent: "May need ventilatory support with the team.",
        fluid: "Not the first named priority vs escalation.",
        glucose: "Check as part of A–E after help is coming.",
        repeat_gas: "Clinical deterioration is clear — escalate.",
      },
    },

    // --- Repeat the gas (3) ---
    {
      id: "impossible-combo",
      ageGroup: "any",
      vignette: "Baby looks well, pink, feeding. Capillary gas returns with extreme values that do not match the baby. Sample taken with difficulty; air bubbles noted.",
      context: { clinical: "well", sample: "bubbles", sats: "98%" },
      values: { pH: 7.55, pco2Kpa: 2.0, po2Kpa: 18.0, baseExcess: 8.0, hco3: 18.0 },
      correctAction: "repeat_gas",
      hint: "Clinical–gas mismatch and poor sample — repeat the gas before acting on unlikely results.",
      wrongHints: {
        fio2: "Baby is well saturated — do not chase a spurious high PaO₂/low CO₂ blindly.",
        vent: "Do not change ventilation on a dubious sample.",
        fluid: "No shock.",
        glucose: "No hypoglycaemia cue.",
        escalate: "Escalate if still worried after a valid repeat, not first.",
      },
    },
    {
      id: "venous-labelled-arterial",
      ageGroup: "day0",
      vignette: "Reported as 'arterial' but drawn from a poorly filling stick. Baby comfortable, sats 97% in air. PaO₂ surprisingly low for the label.",
      context: { sats: "97%", fio2: 0.21, sample: "uncertain source" },
      values: { pH: 7.30, pco2Kpa: 6.8, po2Kpa: 4.5, baseExcess: -1.0, hco3: 24.0 },
      correctAction: "repeat_gas",
      hint: "Suspect venous/mislabelled sample when PaO₂ conflicts with clinical sats — repeat a proper gas.",
      wrongHints: {
        fio2: "Clinical sats are reassuring; confirm sample first.",
        vent: "Do not escalate ventilation on uncertain sampling.",
        fluid: "Not indicated.",
        glucose: "Not the issue.",
        escalate: "Not first-line when the baby looks well and sample quality is doubtful.",
      },
    },
    {
      id: "machine-flag",
      ageGroup: "day1to2",
      vignette: "Analyser flags 'sample error / clot'. Numbers look extreme. Baby unchanged from last hour.",
      context: { analyser: "error flag", clinical: "unchanged" },
      values: { pH: 6.80, pco2Kpa: 12.0, po2Kpa: 3.0, baseExcess: -25.0, hco3: 5.0 },
      correctAction: "repeat_gas",
      hint: "Analyser error with clinical stability — repeat the gas before major interventions.",
      wrongHints: {
        fio2: "Confirm the result first if the baby is stable.",
        vent: "Do not dramatically change settings on a flagged sample.",
        fluid: "Not first without confirmation.",
        glucose: "Not signalled.",
        escalate: "Escalate if the baby deteriorates; otherwise verify the gas.",
      },
    },

    // --- Electrolyte red herrings: gas looks acceptable ---
    {
      id: "hyperk-decoy-gas",
      ageGroup: "day1to2",
      vignette: "Day-2 baby, peaked T waves on the monitor. The acid–base looks nearly normal. You asked for a full panel.",
      context: { ecg: "peaked T waves", perfusion: "ok" },
      values: { pH: 7.34, pco2Kpa: 5.4, po2Kpa: 10.8, baseExcess: -1.0, hco3: 23.0, k: 7.6 },
      correctAction: "electrolyte",
      hint: "The gas is a decoy. Potassium 7.6 mmol/L with ECG changes needs urgent electrolyte treatment.",
      wrongHints: {
        fio2: "Oxygenation is fine. The danger is the potassium.",
        vent: "PaCO₂ is not the problem.",
        fluid: "Volume is not the first move for this ECG and K⁺.",
        glucose: "Glucose is normal. Treat the potassium.",
        transfuse: "Hb is not low.",
        escalate: "Call for help if you are stuck, but the order that matches the number is electrolyte correction.",
        repeat_gas: "The panel already explains the ECG. Do not wait on a repeat gas.",
      },
    },
    {
      id: "hyponatraemia-decoy",
      ageGroup: "any",
      vignette: "Seizing neonate. Acid–base is unremarkable. Sodium comes back very low.",
      context: { event: "seizure", gas: "near normal" },
      values: { pH: 7.38, pco2Kpa: 5.1, po2Kpa: 11.4, baseExcess: 0.4, hco3: 24.2, na: 121 },
      correctAction: "electrolyte",
      hint: "Ignore the tidy pH. Sodium 121 mmol/L with a seizure is the emergency.",
      wrongHints: {
        fio2: "Not hypoxaemia.",
        vent: "Ventilation is adequate.",
        fluid: "A bolus is not the treatment for this sodium.",
        glucose: "Glucose is normal.",
        transfuse: "Hb is normal.",
        escalate: "Get help for the seizure, but the specific order is electrolyte correction.",
        repeat_gas: "The sodium is already the answer. Do not delay for another gas.",
      },
    },
    {
      id: "hypocalcaemia-decoy",
      ageGroup: "day0",
      vignette: "Jittery day-0 baby, normal glucose on the bedside meter. Gas looks ordinary. Ionised calcium is low.",
      context: { glucoseStick: "3.9", tone: "jittery" },
      values: { pH: 7.36, pco2Kpa: 5.3, po2Kpa: 11.0, baseExcess: -0.5, hco3: 23.5, ca: 0.82 },
      correctAction: "electrolyte",
      hint: "The acid–base is a red herring. Ionised calcium 0.82 mmol/L explains the jitteriness.",
      wrongHints: {
        fio2: "PaO₂ is fine.",
        vent: "CO₂ is fine.",
        fluid: "Not a perfusion problem.",
        glucose: "Bedside glucose is already normal.",
        transfuse: "Hb is not the issue.",
        escalate: "Escalate if seizures start, but correct the calcium now.",
        repeat_gas: "Calcium is already low. Treat it.",
      },
    },

    // --- Hb red herrings: gas looks acceptable ---
    {
      id: "anaemia-pale",
      ageGroup: "day1to2",
      vignette: "Pale, tachycardic day-2 baby. Sats 96% in air. The acid–base is almost normal. Hb is the outlier.",
      context: { colour: "pale", hr: "190", sats: "96%" },
      values: { pH: 7.37, pco2Kpa: 5.0, po2Kpa: 11.2, baseExcess: -0.8, hco3: 23.8, hb: 68 },
      correctAction: "transfuse",
      hint: "Do not chase a normal gas. Hb 68 g/L with pallor and tachycardia needs red cells.",
      wrongHints: {
        fio2: "Sats and PaO₂ are acceptable. The missing oxygen carrier is haemoglobin.",
        vent: "Ventilation is not the problem.",
        fluid: "This is anaemia, not hypovolaemia as the first order.",
        glucose: "Glucose is normal.",
        electrolyte: "Electrolytes are in range.",
        escalate: "Tell a senior, but the matching order is transfusion.",
        repeat_gas: "The Hb is already low enough to act on.",
      },
    },
    {
      id: "anaemia-mild-acidosis-decoy",
      ageGroup: "any",
      vignette: "Preterm with a slightly low pH that looks tempting. Clinically pale and tachypnoeic, but PaCO₂ and PaO₂ are fine. Hb is 62 g/L.",
      context: { colour: "pale", support: "air" },
      values: { pH: 7.29, pco2Kpa: 5.2, po2Kpa: 10.6, baseExcess: -3.0, hco3: 21.5, hb: 62 },
      correctAction: "transfuse",
      hint: "The mild acidosis is a decoy. Hb 62 g/L is the finding that changes management.",
      wrongHints: {
        fio2: "PaO₂ is adequate. Anaemia is why oxygen delivery is poor.",
        vent: "PaCO₂ is not high.",
        fluid: "Not the first treatment for this Hb.",
        glucose: "Glucose is normal.",
        electrolyte: "Electrolytes are not the outlier.",
        escalate: "A senior should know, but transfuse is the order.",
        repeat_gas: "You already have the Hb. Do not wait on another gas.",
      },
    },
  ];

  const LAB_DEFAULTS = { na: 139, k: 4.4, ca: 1.22, cl: 105, hb: 168, glucose: 4.1 };
  SCENARIOS.forEach((scenario) => {
    scenario.values = Object.assign({}, LAB_DEFAULTS, scenario.values);
  });

  function shuffle(arr) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = out[i];
      out[i] = out[j];
      out[j] = t;
    }
    return out;
  }

  function scenariosForAge(ageGroup) {
    const preferred = SCENARIOS.filter((s) => s.ageGroup === ageGroup || s.ageGroup === "any");
    return shuffle(preferred.length ? preferred : SCENARIOS.slice());
  }

  window.BicarbBanditScenarios = {
    ACTIONS,
    ACTION_LABELS,
    SCENARIOS,
    shuffle,
    scenariosForAge,
  };
})();
