(function () {
  "use strict";

  const TOPICS = [
    { id: "all", label: "All" },
    { id: "rules", label: "Rules" },
    { id: "compensation", label: "Compensation" },
    { id: "anion_gap", label: "Anion gap" },
    { id: "oxygen", label: "Oxygen" },
    { id: "causes", label: "Causes" },
  ];

  const QUESTIONS = [
    {
      id: "ph-low",
      topic: "rules",
      stem: "pH is below the age-normal range. What is that called?",
      choices: ["Acidaemia", "Alkalaemia", "A normal gas", "A high anion gap by itself"],
      answer: 0,
      why: "A low pH is acidaemia. The primary process (respiratory or metabolic) is a separate step.",
    },
    {
      id: "resp-acid",
      topic: "rules",
      stem: "Low pH, high PaCO₂, HCO₃ still in the normal band. Primary process?",
      choices: ["Respiratory acidosis", "Metabolic acidosis", "Metabolic alkalosis", "Pure hypoxaemia"],
      answer: 0,
      why: "Acidaemia with a high PaCO₂ and HCO₃ that is not low is respiratory acidosis.",
    },
    {
      id: "met-acid",
      topic: "rules",
      stem: "Low pH, low HCO₃, PaCO₂ not high. Primary process?",
      choices: ["Metabolic acidosis", "Respiratory acidosis", "Respiratory alkalosis", "Normal acid–base"],
      answer: 0,
      why: "Acidaemia driven by a low HCO₃, without a high PaCO₂, is metabolic acidosis.",
    },
    {
      id: "mixed-acid",
      topic: "rules",
      stem: "Low pH, high PaCO₂ and low HCO₃ together. What pattern is that?",
      choices: [
        "Mixed metabolic and respiratory acidosis",
        "Simple respiratory alkalosis",
        "Fully compensated metabolic alkalosis",
        "A normal anion gap only",
      ],
      answer: 0,
      why: "Both a high PaCO₂ and a low HCO₃ worsen acidaemia, so the process is mixed.",
    },

    {
      id: "winters-direction",
      topic: "compensation",
      stem: "Metabolic acidosis with a low HCO₃. If compensation is appropriate, what should PaCO₂ do?",
      choices: ["Fall", "Rise", "Stay fixed at 5.3 kPa", "Become unmeasurable"],
      answer: 0,
      why: "Respiratory compensation blows off CO₂, so PaCO₂ falls. Winter’s formula estimates the expected PaCO₂.",
    },
    {
      id: "resp-acid-hco3",
      topic: "compensation",
      stem: "Respiratory acidosis (high PaCO₂, low pH). What does renal compensation do to HCO₃?",
      choices: ["Raises it", "Lowers it further", "Sets it to zero", "Changes only PaO₂"],
      answer: 0,
      why: "The kidneys retain bicarbonate, so HCO₃ rises and pH moves back toward normal.",
    },
    {
      id: "winters-which",
      topic: "compensation",
      stem: "Winter’s formula (expected PaCO₂ ≈ 1.5 × HCO₃ + 8) is used for which disorder?",
      choices: [
        "Metabolic acidosis",
        "Respiratory alkalosis",
        "Isolated hypoxaemia",
        "A normal gas",
      ],
      answer: 0,
      why: "Winter’s formula predicts the PaCO₂ you should see if a metabolic acidosis is being compensated.",
    },
    {
      id: "normal-ph-both-off",
      topic: "compensation",
      stem: "pH is normal, but both PaCO₂ and HCO₃ are abnormal. What should you think?",
      choices: [
        "Possible compensation or a mixed disorder",
        "The gas can be ignored",
        "It must be pure hypoxaemia",
        "Anion gap is always high",
      ],
      answer: 0,
      why: "A normal pH with two deranged components can be compensation or a mixed process. Do not stop at the pH.",
    },

    {
      id: "ag-formula",
      topic: "anion_gap",
      stem: "Which formula is the anion gap?",
      choices: [
        "Na⁺ − (Cl⁻ + HCO₃⁻)",
        "PaCO₂ − PaO₂",
        "pH × HCO₃",
        "Na⁺ + K⁺ + Cl⁻",
      ],
      answer: 0,
      why: "Anion gap is sodium minus chloride plus bicarbonate. Unmeasured anions raise the gap.",
    },
    {
      id: "high-ag",
      topic: "anion_gap",
      stem: "A high anion gap metabolic acidosis in a neonate makes you think first of which group?",
      choices: [
        "Lactate or other organic acids",
        "Simple respiratory alkalosis",
        "Isolated high PaO₂",
        "A normal HCO₃",
      ],
      answer: 0,
      why: "Lactate (shock, hypoxia) and inborn errors of metabolism add unmeasured anions and widen the gap.",
    },
    {
      id: "normal-ag",
      topic: "anion_gap",
      stem: "Metabolic acidosis with a normal anion gap is often called what?",
      choices: [
        "Hyperchloraemic acidosis",
        "Respiratory acidosis",
        "Metabolic alkalosis",
        "A high P/F ratio",
      ],
      answer: 0,
      why: "Bicarbonate loss from gut or kidney is replaced by chloride, so the gap stays normal.",
    },
    {
      id: "albumin-mask",
      topic: "anion_gap",
      stem: "Why can a low albumin hide a high anion gap?",
      choices: [
        "Albumin is a major unmeasured anion, so a low level shrinks the gap",
        "Albumin raises PaCO₂",
        "Albumin is the same as HCO₃",
        "Albumin only changes the pulse oximeter",
      ],
      answer: 0,
      why: "Albumin normally contributes to the gap. Hypoalbuminaemia lowers the measured gap and can mask extra acids.",
    },

    {
      id: "pao2-meaning",
      topic: "oxygen",
      stem: "A low PaO₂ on an arterial gas means what?",
      choices: [
        "Hypoxaemia",
        "A high anion gap by definition",
        "Metabolic alkalosis",
        "That sats must be 100%",
      ],
      answer: 0,
      why: "PaO₂ is the arterial oxygen tension. A low value is hypoxaemia. Sats are related but are not the same number.",
    },
    {
      id: "aa-wide",
      topic: "oxygen",
      stem: "A widened alveolar–arterial (A–a) oxygen gradient suggests what?",
      choices: [
        "A lung problem such as V/Q mismatch or shunt",
        "Pure metabolic alkalosis",
        "A low sodium only",
        "That FiO₂ is always 0.21",
      ],
      answer: 0,
      why: "If alveolar oxygen is adequate but arterial PaO₂ is not, oxygen is not crossing the lung normally.",
    },
    {
      id: "pf-ratio",
      topic: "oxygen",
      stem: "The P/F ratio used as an oxygenation index is which ratio?",
      choices: [
        "PaO₂ divided by FiO₂",
        "pH divided by HCO₃",
        "Na⁺ divided by Cl⁻",
        "PaCO₂ divided by respiratory rate",
      ],
      answer: 0,
      why: "P/F is PaO₂ (mmHg) / FiO₂ (as a fraction). A lower ratio means worse oxygenation for the oxygen given.",
    },
    {
      id: "fio2-no-rise",
      topic: "oxygen",
      stem: "PaO₂ stays very low even after FiO₂ is increased. Which mechanism fits best?",
      choices: [
        "Shunt (blood bypassing ventilated lung)",
        "A normal anion gap",
        "Isolated respiratory alkalosis",
        "A high HCO₃ only",
      ],
      answer: 0,
      why: "Shunted blood does not see alveolar oxygen, so raising FiO₂ helps less than in simple V/Q mismatch.",
    },

    {
      id: "rds-co2",
      topic: "causes",
      stem: "Preterm baby, stiff lungs, high work of breathing, rising PaCO₂ and a low pH. Likely driver?",
      choices: [
        "Hypoventilation, as in RDS",
        "Isolated metabolic alkalosis",
        "A normal sample",
        "High anion gap from albumin",
      ],
      answer: 0,
      why: "Poor ventilation retains CO₂. Respiratory distress syndrome is a classic neonatal cause.",
    },
    {
      id: "sepsis-shock",
      topic: "causes",
      stem: "Mottled baby, slow capillary refill, tachycardia, low HCO₃ and a low pH. First picture?",
      choices: [
        "Poor perfusion / sepsis or shock",
        "Simple over-ventilation",
        "A spurious high PaO₂ only",
        "Chronic metabolic alkalosis",
      ],
      answer: 0,
      why: "Shock and sepsis produce lactate and a metabolic acidosis. Treat perfusion and escalate.",
    },
    {
      id: "low-glucose",
      topic: "causes",
      stem: "Jittery day-0 baby. Bedside glucose 1.6 mmol/L and a mild metabolic acidosis. Next focus?",
      choices: [
        "Correct the hypoglycaemia",
        "Ignore glucose and only repeat the gas",
        "Treat as pure respiratory alkalosis",
        "Give bicarbonate before checking glucose",
      ],
      answer: 0,
      why: "Confirmed hypoglycaemia is an emergency in its own right and can accompany acidosis.",
    },
    {
      id: "sample-error",
      topic: "causes",
      stem: "Baby looks well, sats 98% in air, but the ‘arterial’ gas has bubbles and a very low PaO₂. Best next step?",
      choices: [
        "Repeat a proper sample before big changes",
        "Immediately start high-frequency ventilation",
        "Diagnose metabolic alkalosis",
        "Calculate Winter’s formula only",
      ],
      answer: 0,
      why: "Air bubbles and a result that fights the clinical picture often mean a bad or venous sample.",
    },
  ];

  function shuffle(arr) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  function questionsForTopic(topic) {
    const pool = topic === "all" ? QUESTIONS : QUESTIONS.filter((q) => q.topic === topic);
    return shuffle(pool.length ? pool : QUESTIONS);
  }

  function topicLabel(id) {
    const found = TOPICS.find((t) => t.id === id);
    return found ? found.label : id;
  }

  window.TumbleweedTrivia = {
    TOPICS,
    QUESTIONS,
    shuffle,
    questionsForTopic,
    topicLabel,
  };
})();
