(function () {
  "use strict";

  /*
   * Orders adapt to the baby. A ventilated baby can have ventilator settings
   * changed; a baby in air cannot. Oxygen is "start" or "increase" depending
   * on whether they are already on it. The vignette only sets the scene
   * (support, how they look). The abnormal number lives on the panel.
   */
  const ACTIONS = [
    { id: "o2_start", label: "Start supplemental O₂" },
    { id: "fio2", label: "Increase FiO₂" },
    { id: "highflow", label: "Start high flow" },
    { id: "cpap", label: "Start CPAP" },
    { id: "intubate", label: "Intubate and ventilate" },
    { id: "vent", label: "Adjust ventilator settings" },
    { id: "fluid", label: "Give fluid / bolus" },
    { id: "glucose", label: "Correct glucose" },
    { id: "electrolyte", label: "Correct the electrolyte" },
    { id: "transfuse", label: "Transfuse red cells" },
    { id: "repeat_gas", label: "Repeat the gas" },
  ];

  const ACTION_LABELS = Object.fromEntries(ACTIONS.map((a) => [a.id, a.label]));

  const SCENARIOS = [
    {
      id: "hypoxia-in-air",
      ageGroup: "day0",
      vignette: "Term baby, three hours old. Quiet, a little dusky, not working hard. In air.",
      context: { support: "Air" },
      values: { pH: 7.34, pco2Kpa: 5.2, po2Kpa: 5.6, baseExcess: -1.0, hco3: 22.8 },
      actions: ["o2_start", "highflow", "cpap", "intubate", "fluid", "repeat_gas"],
      correctAction: "o2_start",
      hint: "PaO₂ is low and PaCO₂ is normal. They are in air, so start oxygen before escalating support.",
      wrongHints: {
        highflow: "Work of breathing is not the problem. Oxygen comes first.",
        cpap: "No recession or CO₂ problem to justify CPAP yet.",
        intubate: "This is hypoxaemia, not ventilatory failure.",
        fluid: "Perfusion is not the story on this panel.",
        repeat_gas: "The low PaO₂ fits a dusky baby in air. Act on oxygen.",
      },
    },
    {
      id: "cpap-needs-oxygen",
      ageGroup: "day1to2",
      vignette: "Preterm on nasal CPAP, FiO₂ 0.28. Settled, good chest rise, warm peripheries.",
      context: { support: "nCPAP", fio2: "0.28" },
      values: { pH: 7.32, pco2Kpa: 5.5, po2Kpa: 6.0, baseExcess: -1.5, hco3: 22.4 },
      actions: ["fio2", "intubate", "fluid", "glucose", "electrolyte", "repeat_gas"],
      correctAction: "fio2",
      hint: "Already on CPAP with a normal PaCO₂ and a low PaO₂. Raise FiO₂.",
      wrongHints: {
        intubate: "CO₂ and work of breathing do not say this CPAP has failed.",
        electrolyte: "Electrolytes are in range.",
        fluid: "No shock on the gas or the description.",
        glucose: "Glucose is normal.",
        repeat_gas: "A low PaO₂ on current oxygen is enough to act on.",
      },
    },
    {
      id: "bipap-still-hypoxic",
      ageGroup: "any",
      vignette: "On BiPAP at FiO₂ 35%. Pinker than earlier, comfortable, no recession.",
      context: { support: "BiPAP", fio2: "35%" },
      values: { pH: 7.37, pco2Kpa: 5.0, po2Kpa: 6.8, baseExcess: 0.4, hco3: 24.1 },
      actions: ["fio2", "highflow", "cpap", "intubate", "fluid", "repeat_gas"],
      correctAction: "fio2",
      hint: "Already on BiPAP at 35% and PaCO₂ is normal. The PaO₂ is still low, so increase FiO₂ rather than changing the mode.",
      wrongHints: {
        highflow: "No work-of-breathing problem. They are already on BiPAP, so raise the FiO₂.",
        cpap: "Acid–base and effort do not call for a step down to CPAP.",
        intubate: "Not ventilatory failure.",
        fluid: "Not a perfusion problem.",
        repeat_gas: "Do not delay oxygen for another sample.",
      },
    },
    {
      id: "vent-hypoxic-not-co2",
      ageGroup: "any",
      vignette: "Intubated on SIMV, FiO₂ 0.25. Chest rise is good and the tube mark is unchanged.",
      context: { support: "SIMV", fio2: "0.25" },
      values: { pH: 7.36, pco2Kpa: 5.1, po2Kpa: 6.4, baseExcess: -0.4, hco3: 23.6 },
      actions: ["fio2", "vent", "fluid", "glucose", "electrolyte", "repeat_gas"],
      correctAction: "fio2",
      hint: "PaCO₂ is fine, so the ventilator is clearing CO₂. PaO₂ is low on a modest FiO₂: increase oxygen, do not chase CO₂ settings.",
      wrongHints: {
        vent: "Minute ventilation is already producing a normal PaCO₂.",
        fluid: "No metabolic acidosis or shock.",
        glucose: "Glucose is normal.",
        electrolyte: "Electrolytes are in range.",
        repeat_gas: "The low PaO₂ is the finding. Raise FiO₂.",
      },
    },
    {
      id: "highflow-still-hypoxic",
      ageGroup: "day1to2",
      vignette: "On high-flow nasal cannula, FiO₂ 0.30. Quiet, no recession, feeding well.",
      context: { support: "High flow", fio2: "0.30" },
      values: { pH: 7.35, pco2Kpa: 5.3, po2Kpa: 6.1, baseExcess: -0.6, hco3: 23.4 },
      actions: ["fio2", "cpap", "intubate", "fluid", "glucose", "repeat_gas"],
      correctAction: "fio2",
      hint: "Already on high flow, PaCO₂ normal, PaO₂ low. Increase FiO₂ before changing the mode of support.",
      wrongHints: {
        cpap: "Nothing here says high flow is failing except oxygenation, which FiO₂ can fix.",
        intubate: "Not a ventilation problem.",
        fluid: "Perfusion is not the issue.",
        glucose: "Glucose is normal.",
        repeat_gas: "Act on the low PaO₂.",
      },
    },

    {
      id: "term-mild-co2",
      ageGroup: "day0",
      vignette: "Term baby in air. Grunting, nasal flaring, but still vigorous and pink.",
      context: { support: "Air" },
      values: { pH: 7.28, pco2Kpa: 7.0, po2Kpa: 9.2, baseExcess: -1.2, hco3: 24.0 },
      actions: ["highflow", "o2_start", "cpap", "intubate", "fluid", "repeat_gas"],
      correctAction: "highflow",
      hint: "PaO₂ is acceptable and PaCO₂ is up with work of breathing. In air, start high flow rather than oxygen alone or intubation.",
      wrongHints: {
        o2_start: "Oxygenation is adequate. The problem is CO₂ and effort.",
        cpap: "Reasonable in a preterm; this term baby is vigorous enough for high flow first.",
        intubate: "Not tiring or severely acidotic.",
        fluid: "The acidosis is respiratory, not metabolic.",
        repeat_gas: "The effort and the CO₂ already match. Support ventilation.",
      },
    },
    {
      id: "preterm-needs-cpap",
      ageGroup: "day0",
      vignette: "32-weeker, six hours old, in air. Grunting with subcostal recession. Still handling well.",
      context: { support: "Air" },
      values: { pH: 7.27, pco2Kpa: 7.2, po2Kpa: 8.4, baseExcess: -1.8, hco3: 23.2 },
      actions: ["cpap", "highflow", "o2_start", "intubate", "fluid", "glucose"],
      correctAction: "cpap",
      hint: "A preterm with recession and a rising PaCO₂, PaO₂ still acceptable. CPAP is the right first support, not oxygen alone.",
      wrongHints: {
        highflow: "High flow is a step, but this gestation with recession is a CPAP baby.",
        o2_start: "PaO₂ is not the driver.",
        intubate: "Not failing yet. Try CPAP.",
        fluid: "Base excess is near normal. This is respiratory.",
        glucose: "Glucose is normal.",
      },
    },
    {
      id: "cpap-failing",
      ageGroup: "day1to2",
      vignette: "Preterm on nCPAP, FiO₂ 0.30. Tiring, recession getting deeper, less responsive this hour.",
      context: { support: "nCPAP", fio2: "0.30" },
      values: { pH: 7.16, pco2Kpa: 8.8, po2Kpa: 9.0, baseExcess: -2.4, hco3: 22.6 },
      actions: ["intubate", "fio2", "fluid", "glucose", "electrolyte", "repeat_gas"],
      correctAction: "intubate",
      hint: "CPAP is already on and PaCO₂ is high with a low pH. Oxygen is not the gap. This is failing non-invasive support: intubate and ventilate.",
      wrongHints: {
        fio2: "PaO₂ is acceptable. CO₂ is the problem.",
        fluid: "Base excess is only mildly down. The acidosis is respiratory.",
        electrolyte: "Electrolytes are in range.",
        glucose: "Glucose is normal.",
        repeat_gas: "They are tiring now. Do not wait.",
      },
    },
    {
      id: "apnoeas-ward",
      ageGroup: "day1to2",
      vignette: "On the postnatal ward, in air. Colour poor, apnoeas clustering, nurse has been stimulating them.",
      context: { support: "Air" },
      values: { pH: 7.12, pco2Kpa: 8.6, po2Kpa: 6.2, baseExcess: -4.0, hco3: 19.5 },
      actions: ["intubate", "o2_start", "highflow", "cpap", "glucose", "fluid"],
      correctAction: "intubate",
      hint: "Clustering apnoeas with a high PaCO₂ and a low pH. Oxygen or high flow will not reliably ventilate this baby. Intubate.",
      wrongHints: {
        o2_start: "PaO₂ is low, but the CO₂ and apnoeas need a ventilator, not just oxygen.",
        highflow: "Not enough for a baby who is already having clustered apnoeas.",
        cpap: "CPAP can help single apnoeas. This gas says they are failing.",
        glucose: "Check it, but it is already normal on the panel.",
        fluid: "Not the first move for this respiratory picture.",
      },
    },
    {
      id: "gasping-collapse",
      ageGroup: "day0",
      vignette: "Sudden collapse in the cot. Heart rate 70, gasping, weak pulses. Was in air.",
      context: { support: "Air" },
      values: { pH: 6.96, pco2Kpa: 9.4, po2Kpa: 4.8, baseExcess: -14.0, hco3: 10.5 },
      actions: ["intubate", "o2_start", "highflow", "fluid", "glucose", "repeat_gas"],
      correctAction: "intubate",
      hint: "Gasping with a very high PaCO₂. Open the airway and ventilate. A fluid bolus and a glucose check come after breathing is supported.",
      wrongHints: {
        o2_start: "Oxygen without ventilation will not clear this CO₂.",
        highflow: "This baby is not breathing effectively.",
        fluid: "Circulation may need support next, but gasping is an airway problem first.",
        glucose: "Check it once ventilation has started. It is not the first order.",
        repeat_gas: "Do not delay for another sample.",
      },
    },
    {
      id: "vent-high-co2",
      ageGroup: "day0",
      vignette: "Intubated term baby on SIMV, FiO₂ 0.30. Tube secure, equal air entry. Working harder than an hour ago.",
      context: { support: "SIMV", fio2: "0.30" },
      values: { pH: 7.18, pco2Kpa: 8.5, po2Kpa: 11.0, baseExcess: -2.2, hco3: 23.4 },
      actions: ["vent", "fio2", "fluid", "glucose", "electrolyte", "repeat_gas"],
      correctAction: "vent",
      hint: "Already ventilated, PaO₂ fine, PaCO₂ high with a low pH. Change rate, PIP or tidal volume.",
      wrongHints: {
        fio2: "Oxygenation is adequate.",
        fluid: "Base excess is near normal. This is hypoventilation.",
        glucose: "Glucose is normal.",
        electrolyte: "Electrolytes are in range.",
        repeat_gas: "The pattern matches the extra work. Adjust the ventilator, then recheck.",
      },
    },
    {
      id: "vent-co2-creep",
      ageGroup: "day1to2",
      vignette: "Preterm on conventional ventilation, FiO₂ 0.28. Chest is quiet, tube at the same mark as this morning.",
      context: { support: "Ventilator", fio2: "0.28" },
      values: { pH: 7.22, pco2Kpa: 7.9, po2Kpa: 10.5, baseExcess: 0.8, hco3: 25.0 },
      actions: ["vent", "fio2", "fluid", "transfuse", "glucose", "repeat_gas"],
      correctAction: "vent",
      hint: "PaO₂ and base excess are fine. PaCO₂ has risen on a secure tube, so increase minute ventilation.",
      wrongHints: {
        fio2: "Not hypoxaemic.",
        fluid: "No metabolic acidosis.",
        transfuse: "Hb is not low.",
        glucose: "Glucose is normal.",
        repeat_gas: "A single consistent gas plus a secure tube is enough to adjust settings.",
      },
    },

    {
      id: "shock-cool",
      ageGroup: "day0",
      vignette: "Term baby, mottled and cool, heart racing, refill slow. In air, no recession.",
      context: { support: "Air" },
      values: { pH: 7.16, pco2Kpa: 3.9, po2Kpa: 10.8, baseExcess: -13.0, hco3: 12.2 },
      actions: ["fluid", "o2_start", "intubate", "glucose", "electrolyte", "repeat_gas"],
      correctAction: "fluid",
      hint: "Low pH, very negative base excess, and a low PaCO₂: a metabolic acidosis being compensated. With cool mottled peripheries that is a bolus, not oxygen.",
      wrongHints: {
        o2_start: "PaO₂ is acceptable.",
        intubate: "PaCO₂ is low, not high. They are hyperventilating to compensate.",
        glucose: "Glucose is normal.",
        electrolyte: "Electrolytes are not the outlier.",
        repeat_gas: "The clinical picture and the gas agree. Treat perfusion.",
      },
    },
    {
      id: "sepsis-warm",
      ageGroup: "day1to2",
      vignette: "Day-2 baby, mother had a fever in labour. Warm, tachycardic, refill 3–4 seconds. On low-flow oxygen.",
      context: { support: "Low-flow O₂", fio2: "0.25" },
      values: { pH: 7.21, pco2Kpa: 3.6, po2Kpa: 12.4, baseExcess: -11.0, hco3: 13.4 },
      actions: ["fluid", "fio2", "intubate", "cpap", "glucose", "repeat_gas"],
      correctAction: "fluid",
      hint: "Metabolic acidosis with a compensatory low PaCO₂, on a baby who looks poorly perfused. Fluid bolus with the sepsis pathway, not more oxygen.",
      wrongHints: {
        fio2: "PaO₂ is already high.",
        intubate: "They are blowing CO₂ off, not retaining it.",
        cpap: "No respiratory failure on this gas.",
        glucose: "Glucose is normal.",
        repeat_gas: "Do not wait to treat perfusion.",
      },
    },
    {
      id: "losses-volume",
      ageGroup: "any",
      vignette: "After abdominal surgery, drains have been busy. Cool, heart rate up, fewer wet nappies. On nasal oxygen.",
      context: { support: "Nasal O₂", fio2: "0.28" },
      values: { pH: 7.20, pco2Kpa: 4.1, po2Kpa: 11.2, baseExcess: -10.5, hco3: 13.6 },
      actions: ["fluid", "fio2", "highflow", "intubate", "glucose", "electrolyte"],
      correctAction: "fluid",
      hint: "Base excess is the abnormality; PaCO₂ is low and PaO₂ is fine. Replace volume.",
      wrongHints: {
        fio2: "Not hypoxic.",
        highflow: "No work-of-breathing problem.",
        intubate: "PaCO₂ is low, not high.",
        glucose: "Glucose is normal.",
        electrolyte: "Electrolytes are in range.",
      },
    },

    {
      id: "low-glucose",
      ageGroup: "day0",
      vignette: "Jittery term baby, poor feed, in air. Warm and well perfused.",
      context: { support: "Air" },
      values: { pH: 7.26, pco2Kpa: 4.6, po2Kpa: 11.5, baseExcess: -7.5, hco3: 16.4, glucose: 1.5 },
      actions: ["glucose", "electrolyte", "o2_start", "fluid", "highflow", "repeat_gas"],
      correctAction: "glucose",
      hint: "The mild metabolic acidosis is a companion, not the diagnosis. Glucose is 1.5 mmol/L. Correct it.",
      wrongHints: {
        electrolyte: "Sodium, potassium and calcium are normal. Read the glucose.",
        o2_start: "PaO₂ is fine.",
        fluid: "Not shocked. The emergency on the panel is glucose.",
        highflow: "PaCO₂ is not high.",
        repeat_gas: "You already have the glucose. Treat it.",
      },
    },
    {
      id: "idm-glucose",
      ageGroup: "day0",
      vignette: "Infant of a diabetic mother, four hours old. Floppy, in air, no recession.",
      context: { support: "Air" },
      values: { pH: 7.30, pco2Kpa: 4.9, po2Kpa: 12.0, baseExcess: -5.5, hco3: 18.2, glucose: 1.8 },
      actions: ["glucose", "electrolyte", "fluid", "o2_start", "cpap", "transfuse"],
      correctAction: "glucose",
      hint: "Gases are only mildly off. Glucose 1.8 mmol/L in a high-risk baby is the order.",
      wrongHints: {
        electrolyte: "Electrolytes are normal.",
        fluid: "No shock.",
        o2_start: "Not hypoxic.",
        cpap: "No respiratory problem.",
        transfuse: "Hb is normal.",
      },
    },
    {
      id: "fluids-stopped",
      ageGroup: "day1to2",
      vignette: "Preterm whose IV infusion was found disconnected. Now floppy. On nCPAP, FiO₂ 0.25, chest rise unchanged.",
      context: { support: "nCPAP", fio2: "0.25" },
      values: { pH: 7.25, pco2Kpa: 5.0, po2Kpa: 10.6, baseExcess: -7.0, hco3: 17.0, glucose: 1.3 },
      actions: ["glucose", "fio2", "intubate", "fluid", "electrolyte", "repeat_gas"],
      correctAction: "glucose",
      hint: "CPAP, PaCO₂ and PaO₂ are all acceptable. Glucose is 1.3 mmol/L after a lost infusion. Correct glucose and restart delivery.",
      wrongHints: {
        fio2: "Not hypoxic.",
        intubate: "Ventilation on CPAP is adequate.",
        fluid: "A bolus is not the treatment for this glucose.",
        electrolyte: "Electrolytes are normal.",
        repeat_gas: "The glucose is already on the panel. Treat it.",
      },
    },

    {
      id: "high-potassium",
      ageGroup: "day1to2",
      vignette: "Day-2 baby, the monitor alarmed. Warm, feeding, in air, no recession.",
      context: { support: "Air" },
      values: { pH: 7.35, pco2Kpa: 5.3, po2Kpa: 11.0, baseExcess: -0.8, hco3: 23.2, k: 7.4 },
      actions: ["electrolyte", "glucose", "fluid", "o2_start", "repeat_gas", "transfuse"],
      correctAction: "electrolyte",
      hint: "The acid–base is nearly normal. Potassium is 7.4 mmol/L. That is the order.",
      wrongHints: {
        glucose: "Glucose is normal.",
        fluid: "Not a volume problem.",
        o2_start: "PaO₂ is fine.",
        repeat_gas: "Do not wait on another gas when potassium is already this high.",
        transfuse: "Hb is normal.",
      },
    },
    {
      id: "low-sodium",
      ageGroup: "any",
      vignette: "Started fitting on the postnatal ward. Now post-ictal, in air, breathing comfortably.",
      context: { support: "Air" },
      values: { pH: 7.38, pco2Kpa: 5.0, po2Kpa: 11.6, baseExcess: 0.2, hco3: 24.0, na: 118 },
      actions: ["electrolyte", "glucose", "o2_start", "intubate", "fluid", "repeat_gas"],
      correctAction: "electrolyte",
      hint: "The gas is unremarkable and glucose is normal. Sodium is 118 mmol/L. Correct the electrolyte.",
      wrongHints: {
        glucose: "Glucose is not low. Look at the sodium.",
        o2_start: "Not hypoxic.",
        intubate: "Breathing and PaCO₂ are fine now.",
        fluid: "A plain bolus is not the treatment for this sodium.",
        repeat_gas: "The sodium is already the answer.",
      },
    },
    {
      id: "low-calcium",
      ageGroup: "day0",
      vignette: "Jittery day-0 baby, in air, well perfused, no recession.",
      context: { support: "Air" },
      values: { pH: 7.37, pco2Kpa: 5.2, po2Kpa: 11.2, baseExcess: -0.3, hco3: 23.8, ca: 0.78 },
      actions: ["electrolyte", "glucose", "o2_start", "fluid", "highflow", "transfuse"],
      correctAction: "electrolyte",
      hint: "Glucose and the acid–base are normal. Ionised calcium is 0.78 mmol/L.",
      wrongHints: {
        glucose: "Glucose is in range. The jitteriness matches the calcium.",
        o2_start: "PaO₂ is fine.",
        fluid: "Not shocked.",
        highflow: "PaCO₂ is normal.",
        transfuse: "Hb is normal.",
      },
    },
    {
      id: "anaemia-tachycardia",
      ageGroup: "day1to2",
      vignette: "Pale day-2 baby, heart rate 190, in air, no recession, warm.",
      context: { support: "Air" },
      values: { pH: 7.36, pco2Kpa: 4.9, po2Kpa: 11.4, baseExcess: -1.0, hco3: 23.5, hb: 64 },
      actions: ["transfuse", "o2_start", "fluid", "glucose", "electrolyte", "repeat_gas"],
      correctAction: "transfuse",
      hint: "Gases are normal, so oxygen and ventilation are not the gap. Hb is 64 g/L.",
      wrongHints: {
        o2_start: "PaO₂ is fine. The missing carrier is haemoglobin.",
        fluid: "This is anaemia, not hypovolaemia as the first order.",
        glucose: "Glucose is normal.",
        electrolyte: "Electrolytes are in range.",
        repeat_gas: "The Hb is already low enough to act on.",
      },
    },
    {
      id: "anaemia-tempting-ph",
      ageGroup: "any",
      vignette: "Preterm, a bit tachypnoeic, pale, on low-flow oxygen. Handling as usual.",
      context: { support: "Low-flow O₂", fio2: "0.25" },
      values: { pH: 7.30, pco2Kpa: 5.1, po2Kpa: 10.2, baseExcess: -2.8, hco3: 21.8, hb: 58 },
      actions: ["transfuse", "fio2", "cpap", "intubate", "fluid", "electrolyte"],
      correctAction: "transfuse",
      hint: "PaCO₂ and PaO₂ do not explain the tachypnoea. Hb is 58 g/L. The slightly low pH is not the order.",
      wrongHints: {
        fio2: "Already in oxygen and PaO₂ is adequate.",
        cpap: "PaCO₂ is normal.",
        intubate: "Not ventilatory failure.",
        fluid: "Not the first treatment for this Hb.",
        electrolyte: "Electrolytes are normal.",
      },
    },

    {
      id: "bubbles",
      ageGroup: "any",
      vignette: "Pink, feeding, in air. The heel prick was difficult and the syringe came back with bubbles.",
      context: { support: "Air" },
      values: { pH: 7.52, pco2Kpa: 2.2, po2Kpa: 18.5, baseExcess: 2.0, hco3: 20.0 },
      actions: ["repeat_gas", "o2_start", "intubate", "fluid", "glucose", "electrolyte"],
      correctAction: "repeat_gas",
      hint: "A well baby cannot have a PaO₂ of 18 kPa in air. Bubbles pulled the sample toward room air. Repeat it before acting.",
      wrongHints: {
        o2_start: "Clinically well, and the PaO₂ is impossibly high for air, not low.",
        intubate: "Do not ventilate a feeding baby on a spoiled sample.",
        fluid: "No shock.",
        glucose: "Glucose is normal.",
        electrolyte: "Electrolytes are normal.",
      },
    },
    {
      id: "venous-sample",
      ageGroup: "day0",
      vignette: "Comfortable and pink in air. The gas is labelled arterial but was taken from a slow, poorly filling stick.",
      context: { support: "Air" },
      values: { pH: 7.31, pco2Kpa: 6.6, po2Kpa: 4.2, baseExcess: -0.5, hco3: 24.2 },
      actions: ["repeat_gas", "o2_start", "highflow", "cpap", "intubate", "fluid"],
      correctAction: "repeat_gas",
      hint: "PaO₂ of 4.2 kPa would not look pink in air. The sample is venous or mixed. Repeat a proper gas before starting support.",
      wrongHints: {
        o2_start: "The baby is pink. Confirm the sample before treating a number that fights the baby.",
        highflow: "No work of breathing, and the sample is suspect.",
        cpap: "Not indicated on a dubious sample in a comfortable baby.",
        intubate: "Do not intubate a pink baby for a badly taken gas.",
        fluid: "Not shocked.",
      },
    },
    {
      id: "clot-flag",
      ageGroup: "day1to2",
      vignette: "On nCPAP, unchanged from an hour ago. The analyser flagged a clot in the sample.",
      context: { support: "nCPAP", fio2: "0.28" },
      values: { pH: 6.85, pco2Kpa: 11.5, po2Kpa: 3.2, baseExcess: -22.0, hco3: 6.0 },
      actions: ["repeat_gas", "fio2", "intubate", "fluid", "glucose", "electrolyte"],
      correctAction: "repeat_gas",
      hint: "A clot warning plus a baby who has not changed means the extreme numbers are the sample, not the patient. Repeat the gas.",
      wrongHints: {
        fio2: "Do not chase a flagged sample.",
        intubate: "They are stable on CPAP. Verify the gas first.",
        fluid: "Not first without a trustworthy gas.",
        electrolyte: "Do not treat a number from a clotted sample.",
        glucose: "Glucose on this sample cannot be trusted either. Repeat it.",
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

  /*
   * Buttons keep a familiar order (oxygen, then support, then labs), but the
   * correct order is lifted out and dropped into a random slot. Similar
   * orders stay near the same place; the right one does not.
   */
  function presentOrder(actionIds, correctId) {
    const rank = new Map(ACTIONS.map((action, index) => [action.id, index]));
    const ordered = actionIds.slice().sort((a, b) => (rank.get(a) ?? 99) - (rank.get(b) ?? 99));
    if (!correctId || ordered.indexOf(correctId) === -1) {
      return ordered;
    }
    const rest = ordered.filter((id) => id !== correctId);
    const slot = Math.floor(Math.random() * (rest.length + 1));
    rest.splice(slot, 0, correctId);
    return rest;
  }

  window.BicarbBanditScenarios = {
    ACTIONS,
    ACTION_LABELS,
    SCENARIOS,
    shuffle,
    scenariosForAge,
    presentOrder,
  };
})();
