const ageYearsInput = document.getElementById("age-years");
const ageMonthsInput = document.getElementById("age-months");
const ageStatus = document.getElementById("age-status");

const niceRecommendation = document.getElementById("nice-recommendation");
const pecarnRecommendation = document.getElementById("pecarn-recommendation");
const niceTriggerList = document.getElementById("nice-trigger-list");
const pecarnTriggerList = document.getElementById("pecarn-trigger-list");

const pecarnUnder2Section = document.getElementById("pecarn-under2");
const pecarnOver2Section = document.getElementById("pecarn-over2");

const under1OnlyEls = Array.from(document.querySelectorAll(".nice-under1-only"));
const ge1OnlyEls = Array.from(document.querySelectorAll(".nice-ge1-only"));

const NICE_IMMEDIATE_BASE = [
  { id: "nice-nai", label: "Suspicion of non-accidental injury" },
  { id: "nice-seizure", label: "Post-traumatic seizure (no epilepsy history)" },
  { id: "nice-gcs-lt15-2h", label: "GCS <15 at 2 hours after injury" },
  { id: "nice-skull-open", label: "Suspected open/depressed skull fracture or tense fontanelle" },
  { id: "nice-basal", label: "Any sign of basal skull fracture" },
  { id: "nice-focal", label: "Focal neurological deficit" }
];

const NICE_IMMEDIATE_AGE_GE1 = { id: "nice-gcs-lt14", label: "Initial GCS <14" };
const NICE_IMMEDIATE_AGE_UNDER1 = [
  { id: "nice-gcs-lt15-under1", label: "Age <1 year: initial GCS <15" },
  { id: "nice-scalp-over5", label: "Age <1 year: scalp bruise/swelling/laceration >5 cm" }
];

const NICE_SECONDARY = [
  { id: "nice-loc-gt5", label: "Loss of consciousness >5 minutes" },
  { id: "nice-drowsy", label: "Abnormal drowsiness" },
  { id: "nice-vomit-3", label: "Three or more discrete vomiting episodes" },
  { id: "nice-dangerous", label: "Dangerous mechanism of injury" },
  { id: "nice-amnesia-gt5", label: "Amnesia >5 minutes" },
  { id: "nice-bleeding", label: "Known bleeding/clotting disorder" }
];

const PECARN_UNDER2 = {
  high: [
    { id: "p2-ams-gcs", label: "GCS <=14 or altered mental status" },
    { id: "p2-palpable-fracture", label: "Palpable skull fracture" }
  ],
  intermediate: [
    { id: "p2-scalp-hematoma", label: "Occipital/parietal/temporal scalp hematoma" },
    { id: "p2-loc-5s", label: "Loss of consciousness >=5 seconds" },
    { id: "p2-not-normal", label: "Not acting normally per parent" },
    { id: "p2-severe-mech", label: "Severe mechanism of injury" }
  ]
};

const PECARN_OVER2 = {
  high: [
    { id: "p3-ams-gcs", label: "GCS <=14 or altered mental status" },
    { id: "p3-basilar", label: "Signs of basilar skull fracture" }
  ],
  intermediate: [
    { id: "p3-loc-any", label: "Any history of loss of consciousness" },
    { id: "p3-vomit", label: "History of vomiting" },
    { id: "p3-headache", label: "Severe headache" },
    { id: "p3-severe-mech", label: "Severe mechanism of injury" }
  ]
};

function getChecked(items) {
  return items.filter((item) => {
    const input = document.getElementById(item.id);
    return input && input.checked;
  });
}

function listToHtml(items) {
  if (!items.length) return "";
  return items.map((item) => `<li>${item.label}</li>`).join("");
}

function parseAgeMonths() {
  const yearsValue = ageYearsInput.value.trim();
  const monthsValue = ageMonthsInput.value.trim();

  if (!yearsValue && !monthsValue) return null;

  const years = Number(yearsValue || 0);
  const months = Number(monthsValue || 0);

  if (Number.isNaN(years) || Number.isNaN(months) || years < 0 || months < 0 || months > 11) {
    return Number.NaN;
  }

  return years * 12 + months;
}

function updateAgeDrivenUI(ageMonths) {
  const validAge = typeof ageMonths === "number" && !Number.isNaN(ageMonths);
  const isUnder1 = validAge && ageMonths < 12;
  const isUnder2 = validAge && ageMonths < 24;

  under1OnlyEls.forEach((el) => {
    el.hidden = !isUnder1;
  });

  ge1OnlyEls.forEach((el) => {
    el.hidden = isUnder1;
  });

  pecarnUnder2Section.hidden = !validAge || !isUnder2;
  pecarnOver2Section.hidden = !validAge || isUnder2;

  if (!validAge) {
    ageStatus.textContent = "Enter a valid age to activate age-specific criteria.";
    return;
  }

  const years = Math.floor(ageMonths / 12);
  const months = ageMonths % 12;
  const ageText = `${years} year${years === 1 ? "" : "s"} ${months} month${months === 1 ? "" : "s"}`;
  const pecarnRule = isUnder2 ? "PECARN <2 years" : "PECARN >=2 years";
  const niceAgeText = isUnder1 ? "NICE <1 year criteria active" : "NICE >=1 year criteria active";

  ageStatus.textContent = `Age: ${ageText}. ${niceAgeText}. ${pecarnRule} branch active.`;
}

function evaluateNice(ageMonths) {
  const isUnder1 = ageMonths < 12;
  const immediateItems = [...NICE_IMMEDIATE_BASE];

  if (isUnder1) {
    immediateItems.push(...NICE_IMMEDIATE_AGE_UNDER1);
  } else {
    immediateItems.push(NICE_IMMEDIATE_AGE_GE1);
  }

  const immediateTriggers = getChecked(immediateItems);
  const secondaryTriggers = getChecked(NICE_SECONDARY);

  if (immediateTriggers.length) {
    return {
      line: "NICE NG232: CT head is recommended within 1 hour because immediate-risk criteria are present.",
      triggers: immediateTriggers
    };
  }

  if (secondaryTriggers.length) {
    return {
      line: "NICE NG232: Immediate CT is not triggered by the 1-hour criteria, but secondary risk factors are present. Observe for at least 4 hours from injury with reassessment; proceed to CT if deterioration or further criteria emerge.",
      triggers: secondaryTriggers
    };
  }

  return {
    line: "NICE NG232: No listed immediate or secondary risk factors selected. CT is not indicated by this checklist alone; continue routine clinical assessment and safety-netting.",
    triggers: []
  };
}

function evaluatePecarn(ageMonths) {
  const useUnder2 = ageMonths < 24;
  const ruleSet = useUnder2 ? PECARN_UNDER2 : PECARN_OVER2;
  const highTriggers = getChecked(ruleSet.high);
  const intermediateTriggers = getChecked(ruleSet.intermediate);

  if (highTriggers.length) {
    return {
      line: `PECARN (${useUnder2 ? "<2 years" : ">=2 years"}): High-risk features are present. Child is not very low risk for clinically important TBI; CT should be strongly considered.`,
      triggers: highTriggers,
      level: "high"
    };
  }

  if (intermediateTriggers.length) {
    return {
      line: `PECARN (${useUnder2 ? "<2 years" : ">=2 years"}): Intermediate factors are present. Child is not very low risk; use observation and shared decision-making when deciding on CT.`,
      triggers: intermediateTriggers,
      level: "intermediate"
    };
  }

  return {
    line: `PECARN (${useUnder2 ? "<2 years" : ">=2 years"}): No high-risk or intermediate factors selected. Child is very low risk by PECARN criteria and CT is usually not required by the rule.`,
    triggers: [],
    level: "low"
  };
}

function render() {
  const ageMonths = parseAgeMonths();

  if (ageMonths === null) {
    updateAgeDrivenUI(Number.NaN);
    niceRecommendation.textContent = "Enter age and tick factors to generate an output.";
    pecarnRecommendation.textContent = "Enter age and tick factors to generate an output.";
    niceTriggerList.innerHTML = "";
    pecarnTriggerList.innerHTML = "";
    return;
  }

  if (Number.isNaN(ageMonths)) {
    updateAgeDrivenUI(Number.NaN);
    niceRecommendation.textContent = "Enter a valid age (months 0-11) to generate NICE output.";
    pecarnRecommendation.textContent = "Enter a valid age (months 0-11) to generate PECARN output.";
    niceTriggerList.innerHTML = "";
    pecarnTriggerList.innerHTML = "";
    return;
  }

  updateAgeDrivenUI(ageMonths);
  const nice = evaluateNice(ageMonths);
  const pecarn = evaluatePecarn(ageMonths);

  niceRecommendation.textContent = nice.line;
  pecarnRecommendation.textContent = pecarn.line;
  niceTriggerList.innerHTML = listToHtml(nice.triggers);
  pecarnTriggerList.innerHTML = listToHtml(pecarn.triggers);
}

const allInputs = Array.from(document.querySelectorAll("input[type='number'], input[type='checkbox']"));
allInputs.forEach((input) => {
  input.addEventListener("input", render);
  input.addEventListener("change", render);
});

render();
