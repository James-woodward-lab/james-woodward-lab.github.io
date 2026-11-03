(function () {
  "use strict";

  const TOPICS = [
    { id: "all", label: "All" },
    { id: "rules", label: "Rules" },
    { id: "compensation", label: "Compensation" },
    { id: "anion_gap", label: "Anion gap" },
    { id: "oxygen", label: "Oxygen" },
    { id: "causes", label: "Causes" },
    { id: "history", label: "History & machines" },
    { id: "fun", label: "Fun facts" },
  ];

  /*
   * Short facts shown as a "campfire fact" card every few questions and on the
   * round-over screen. Keep each to one or two sentences.
   */
  const FACTS = [
    "The pH scale was invented in 1909 by Søren Sørensen at the Carlsberg Laboratory in Copenhagen, a brewery lab that wanted better control of beer fermentation.",
    "Lawrence Henderson (American, 1908) wrote the bicarbonate equation; Karl Hasselbalch (Danish, 1917) rewrote it in logarithms. Hence Henderson–Hasselbalch.",
    "At pH 7.40 the hydrogen ion concentration is 40 nanomoles per litre. Sodium sits at 140 millimoles per litre, about three and a half million times more.",
    "Oxygen was named by Lavoisier in 1777 from the Greek for ‘acid-former’. He was wrong: it is hydrogen ions, not oxygen, that make acids.",
    "Leland Clark, inventor of the oxygen electrode (1954), is also known as the father of biosensors: his glucose electrode idea led to today’s glucose meters.",
    "The Copenhagen polio epidemic of 1952 forced doctors to measure CO₂ in blood urgently. Poul Astrup’s equilibration method, built for that crisis, launched the clinical blood gas laboratory.",
    "During the 1952 polio epidemic about 1,500 medical and dental students hand-ventilated patients in shifts around the clock. Mortality fell from roughly 87% to about 25%.",
    "Base excess was introduced by Ole Siggaard-Andersen and Poul Astrup in 1960 as a way to separate the metabolic part of a disturbance from the respiratory part.",
    "Carbonic anhydrase, the red-cell enzyme that turns CO₂ into bicarbonate, is one of the fastest enzymes known: up to a million reactions per second per molecule.",
    "Around 70% of the CO₂ in blood travels as bicarbonate, roughly 20–25% bound to haemoglobin, and only about 5–10% dissolved in plasma.",
    "The Bohr effect (1904) was described by Christian Bohr, father of the physicist Niels Bohr: CO₂ and acid make haemoglobin let go of oxygen.",
    "The Haldane effect (1914) is the mirror image of the Bohr effect: deoxygenated haemoglobin carries more CO₂, which helps unload CO₂ in the lungs.",
    "UK gases report pressures in kilopascals, the SI unit named after Blaise Pascal. The older unit mmHg, or torr, honours Torricelli’s 1643 mercury barometer; 1 kPa is 7.5 mmHg.",
    "Blood gas machines measure at 37 °C whatever the patient’s temperature. Whether to correct results to the real temperature (pH-stat) or not (alpha-stat) is still debated.",
    "An air bubble left in the syringe pulls the sample toward room air: PaO₂ drifts toward 20 kPa and PaCO₂ drifts down. Expel bubbles and cap the syringe.",
    "Liquid heparin dilutes the sample and falsely lowers PaCO₂ and bicarbonate. Modern syringes use dry, balanced heparin for that reason.",
    "A very high white cell count can consume oxygen inside the syringe while it waits. Laboratories call this ‘leucocyte larceny’.",
    "Fetal haemoglobin holds oxygen more tightly than adult haemoglobin: fetal P50 is about 2.5 kPa versus 3.6 kPa in adults, which helps the fetus pull oxygen across the placenta.",
    "A normal umbilical artery pH at birth is around 7.25, well below the adult 7.40. Newborn reference ranges are deliberately wider.",
    "Pulse oximetry was invented by Takuo Aoyagi in 1974 at Nihon Kohden. It estimates saturation, not PaO₂, which is why a gas is still needed.",
    "Co-oximetry uses several wavelengths of light to measure carboxyhaemoglobin and methaemoglobin, which an ordinary pulse oximeter cannot tell from oxyhaemoglobin.",
    "The Severinghaus CO₂ electrode is really a pH electrode in disguise: CO₂ diffuses through a membrane into a bicarbonate film and the pH change is read off.",
    "Capillary heel-prick gases in neonates come from the sides of the heel, warmed first to ‘arterialise’ the blood. The centre of the heel hides the calcaneus.",
    "The anion gap was popularised in the 1970s as hospital labs began reporting electrolytes together. It is a bookkeeping trick: the ions you did not measure.",
    "Virginia Apgar’s team in the late 1950s measured acid–base status in newborns at birth and showed how birth asphyxia drove cord pH down.",
  ];

  const QUESTIONS = [
    {
      id: "ph-low",
      topic: "rules",
      stem: "pH is below the age-normal range. What is that called?",
      choices: ["Acidaemia", "Alkalaemia", "A normal gas", "A high anion gap by itself"],
      answer: 0,
      why: "A low pH is acidaemia. The primary process (respiratory or metabolic) is a separate step.",
      fact: "‘-aemia’ describes the blood, ‘-osis’ describes the process. You can have a metabolic acidosis with a normal pH if the lungs have compensated.",
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
      stem: "Winter’s formula (expected PaCO₂ in kPa ≈ (1.5 × HCO₃ + 8) ÷ 7.5) is used for which disorder?",
      choices: [
        "Metabolic acidosis",
        "Respiratory alkalosis",
        "Isolated hypoxaemia",
        "A normal gas",
      ],
      answer: 0,
      why: "Winter’s formula predicts the PaCO₂ you should see if a metabolic acidosis is being compensated. (The original is in mmHg: 1.5 × HCO₃ + 8; divide by 7.5 for kPa.)",
      fact: "It is named after Robert Winters, a paediatric nephrologist, and was published in 1967 from data on children with metabolic acidosis.",
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
      fact: "Blood is always electrically neutral. The ‘gap’ only exists because the lab does not measure albumin, phosphate, lactate and the other anions.",
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
      fact: "Only about 2% of the oxygen in arterial blood is dissolved and measured as PaO₂; the other 98% rides on haemoglobin.",
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
      why: "P/F is PaO₂ (kPa) / FiO₂ (as a fraction). A lower ratio means worse oxygenation for the oxygen given. In kPa a normal P/F is above about 40.",
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
      fact: "An air bubble pulls PaO₂ toward room air (about 20 kPa) and lowers PaCO₂, so a bubbly sample can look both better and worse than the patient.",
    },

    /* ---------- history & machines ---------- */
    {
      id: "hist-ph-inventor",
      topic: "history",
      stem: "Who invented the pH scale, and where?",
      choices: [
        "Søren Sørensen, at the Carlsberg brewery laboratory in Copenhagen, 1909",
        "Louis Pasteur, at the Sorbonne in Paris, 1865",
        "Marie Curie, at the Radium Institute, 1911",
        "Alexander Fleming, at St Mary’s Hospital, 1928",
      ],
      answer: 0,
      why: "Sørensen introduced pH in 1909 while working on enzyme chemistry for brewing. The ‘p’ is usually read as ‘power’ or ‘potenz’ of hydrogen.",
      fact: "Carlsberg funded the lab to brew more consistent beer. Blood gas interpretation owes a debt to lager.",
    },
    {
      id: "hist-hh-names",
      topic: "history",
      stem: "The Henderson–Hasselbalch equation is named after scientists from which two countries?",
      choices: [
        "The United States and Denmark",
        "Germany and France",
        "The United Kingdom and Sweden",
        "Canada and the Netherlands",
      ],
      answer: 0,
      why: "Lawrence Henderson (Harvard, 1908) derived the mass-action form; Karl Hasselbalch (Copenhagen, 1917) wrote it with logarithms so it used pH.",
      fact: "Hasselbalch was also one of the first to measure the pH of blood and to link it to breathing.",
    },
    {
      id: "hist-clark",
      topic: "history",
      stem: "Leland Clark’s 1954 invention, still inside many analysers today, measures what?",
      choices: [
        "Oxygen tension (the Clark polarographic O₂ electrode)",
        "Haemoglobin by colour",
        "Blood glucose by test strip",
        "Sodium by flame photometry",
      ],
      answer: 0,
      why: "The Clark electrode reduces oxygen at a platinum cathode behind a gas-permeable membrane; the current is proportional to PO₂.",
      fact: "Clark also built an early bubble oxygenator for heart surgery and proposed the enzyme electrode that became the glucose meter.",
    },
    {
      id: "hist-polio",
      topic: "history",
      stem: "Which 1952 event pushed Copenhagen doctors to measure blood CO₂ urgently and effectively created the blood gas laboratory?",
      choices: [
        "A polio epidemic with hundreds of patients in respiratory failure",
        "The first heart transplant",
        "The discovery of surfactant",
        "The opening of the first MRI scanner",
      ],
      answer: 0,
      why: "Bjørn Ibsen realised ‘alkalosis’ in polio patients was really CO₂ retention. Poul Astrup devised a rapid equilibration method to measure PaCO₂.",
      fact: "Medical students hand-squeezed bags for weeks in shifts. The crisis is usually counted as the birth of intensive care.",
    },
    {
      id: "hist-be",
      topic: "history",
      stem: "Base excess was introduced in 1960 by which pair?",
      choices: [
        "Ole Siggaard-Andersen and Poul Astrup",
        "Henderson and Hasselbalch",
        "Bohr and Haldane",
        "Apgar and James",
      ],
      answer: 0,
      why: "They defined base excess as the acid or base needed to titrate blood back to pH 7.40 at a PaCO₂ of 5.3 kPa, isolating the metabolic component.",
      fact: "The Siggaard-Andersen nomogram let clinicians read base excess off a chart years before machines calculated it.",
    },
    {
      id: "hist-torr",
      topic: "history",
      stem: "The unit mmHg is also called the torr. Who is it named after?",
      choices: [
        "Evangelista Torricelli, who built the first mercury barometer in 1643",
        "Alessandro Volta, inventor of the battery",
        "Anders Celsius, who devised the centigrade scale",
        "Blaise Pascal, after whom the kPa is named",
      ],
      answer: 0,
      why: "The kilopascal is the SI unit used on UK gases: 5.3 kPa is 40 mmHg, and 1 kPa is about 7.5 mmHg. Torricelli showed air has weight by supporting a column of mercury.",
      fact: "The kilopascal is named after Pascal, who had the barometer carried up a mountain to prove pressure falls with altitude.",
    },
    {
      id: "hist-oximeter",
      topic: "history",
      stem: "Pulse oximetry was invented in 1974 by Takuo Aoyagi. What does it measure that a blood gas does not?",
      choices: [
        "Pulsatile arterial saturation continuously and non-invasively",
        "PaCO₂ through the skin",
        "Bicarbonate from the fingertip",
        "Lactate from the ear lobe",
      ],
      answer: 0,
      why: "Oximetry estimates saturation from the ratio of red to infrared light absorbed by pulsing blood. It cannot give PaO₂, PaCO₂ or pH.",
      fact: "Aoyagi was trying to measure cardiac output with dye when he noticed the pulsing signal carried saturation information.",
    },

    /* ---------- fun facts ---------- */
    {
      id: "fun-h-vs-na",
      topic: "fun",
      stem: "At pH 7.40 the hydrogen ion concentration is 40 nmol/L. Roughly how many times more concentrated is sodium (140 mmol/L)?",
      choices: ["About 3.5 million times", "About 35 times", "About 3,500 times", "They are about equal"],
      answer: 0,
      why: "140 mmol/L ÷ 40 nmol/L = 3,500,000. The body regulates H⁺ incredibly tightly despite producing acid constantly.",
      fact: "That is why pH is logarithmic: writing out the H⁺ concentration in mol/L would be 0.00000004.",
    },
    {
      id: "fun-oxygen-name",
      topic: "fun",
      stem: "Lavoisier named oxygen in 1777 from the Greek for ‘acid-former’. Why is the name a mistake?",
      choices: [
        "Acidity comes from hydrogen ions, not oxygen",
        "Oxygen was actually discovered in the 20th century",
        "Oxygen does not exist as a gas",
        "Acids never contain oxygen",
      ],
      answer: 0,
      why: "Lavoisier thought all acids contained oxygen. Hydrochloric acid proved him wrong: it is hydrogen that acids share.",
      fact: "Oxygen was isolated earlier by Scheele (1771–72) and Priestley (1774); Lavoisier explained what it did.",
    },
    {
      id: "fun-ca-speed",
      topic: "fun",
      stem: "Carbonic anhydrase in red cells converts CO₂ to bicarbonate. How fast can one molecule work?",
      choices: [
        "Up to about a million reactions per second",
        "About one reaction per second",
        "About one reaction per minute",
        "It is not an enzyme, the reaction is spontaneous only",
      ],
      answer: 0,
      why: "It is among the fastest enzymes known, which is why CO₂ loaded in tissue is already bicarbonate before the blood leaves the capillary.",
      fact: "Carbonic anhydrase was discovered in 1932 by Meldrum and Roughton, who were puzzled that CO₂ left blood far faster than chemistry predicted.",
    },
    {
      id: "fun-co2-carriage",
      topic: "fun",
      stem: "In what form is most CO₂ carried in blood?",
      choices: [
        "As bicarbonate, about 70%",
        "Dissolved in plasma, about 70%",
        "Bound to albumin, about 70%",
        "As carbon monoxide",
      ],
      answer: 0,
      why: "Roughly 70% is bicarbonate, 20–25% is carbamino-haemoglobin and only 5–10% is dissolved. The dissolved part is what PaCO₂ measures.",
      fact: "The Haldane effect means deoxygenated haemoglobin carries extra CO₂, so venous blood is a better CO₂ carrier than arterial.",
    },
    {
      id: "fun-bohr",
      topic: "fun",
      stem: "The Bohr effect (acid and CO₂ make haemoglobin release oxygen) was described in 1904 by Christian Bohr. Who was his famous son?",
      choices: [
        "Niels Bohr, the quantum physicist",
        "Niels Finsen, the light-therapy Nobel laureate",
        "August Krogh, the capillary physiologist",
        "Hans Christian Andersen, the author",
      ],
      answer: 0,
      why: "Christian Bohr was a Copenhagen physiologist; his son Niels won the 1922 Nobel Prize in Physics for the atomic model.",
      fact: "August Krogh, who was Christian Bohr’s student, won the 1920 Nobel Prize for showing how capillaries open and close.",
    },
    {
      id: "fun-fetal-hb",
      topic: "fun",
      stem: "Fetal haemoglobin has a P50 of about 2.5 kPa versus 3.6 kPa in adults. What does that mean?",
      choices: [
        "Fetal blood holds oxygen more tightly, pulling it across the placenta",
        "Fetal blood releases oxygen more easily than adult blood",
        "Fetal blood carries no CO₂",
        "Fetal blood has a higher pH than maternal blood",
      ],
      answer: 0,
      why: "A lower P50 means half-saturation at a lower PO₂: a left-shifted curve. HbF binds 2,3-DPG poorly, which is why it grips oxygen harder.",
      fact: "The same left shift means a newborn’s saturation of 90% sits at a lower PaO₂ than an adult’s 90%, so sats can flatter the gas.",
    },
    {
      id: "fun-cord-ph",
      topic: "fun",
      stem: "A healthy baby’s umbilical artery pH at birth is typically around…",
      choices: ["7.25", "7.40", "7.55", "6.90"],
      answer: 0,
      why: "Normal labour produces mild mixed acidosis; mean cord arterial pH is about 7.24–7.27. Below 7.00 is pathological acidaemia.",
      fact: "The umbilical vein carries blood from the placenta to the baby, so the vein is the ‘cleaner’ sample and the artery shows the baby’s own state.",
    },
    {
      id: "fun-temp",
      topic: "fun",
      stem: "A cooled baby on therapeutic hypothermia has a core temperature of 33.5 °C. At what temperature does the analyser measure the gas?",
      choices: [
        "37 °C, unless you enter the patient temperature for correction",
        "Room temperature",
        "The patient’s temperature automatically",
        "0 °C, to preserve the sample",
      ],
      answer: 0,
      why: "All analysers measure at 37 °C. Gas solubility rises in cold blood, so the ‘true’ PaCO₂ and PaO₂ at 33.5 °C are lower than the 37 °C readout.",
      fact: "Whether to correct (pH-stat) or not (alpha-stat) is an old argument from cardiac bypass; most neonatal units interpret uncorrected values consistently.",
    },
    {
      id: "fun-heparin",
      topic: "fun",
      stem: "Why do modern blood gas syringes contain dry, balanced heparin instead of liquid heparin?",
      choices: [
        "Liquid heparin dilutes the sample and falsely lowers PaCO₂ and bicarbonate",
        "Dry heparin raises the PaO₂ to a safe level",
        "Liquid heparin cannot stop clotting",
        "Dry heparin is cheaper to colour blue",
      ],
      answer: 0,
      why: "Even 0.1 mL of liquid heparin in a small sample dilutes CO₂ and bicarbonate. ‘Balanced’ heparin also stops it binding ionised calcium.",
      fact: "Heparin was discovered in 1916 by a medical student, Jay McLean, who was looking for a clotting agent and found the opposite.",
    },
    {
      id: "fun-leucocyte",
      topic: "fun",
      stem: "A sample from a baby with a white cell count of 90 × 10⁹/L sat in the syringe for 20 minutes. What may have happened to the PaO₂?",
      choices: [
        "Fallen, because the white cells consumed oxygen (‘leucocyte larceny’)",
        "Risen, because white cells release oxygen",
        "Nothing, cells stop metabolising outside the body",
        "Doubled, because of heparin",
      ],
      answer: 0,
      why: "Metabolically active cells keep using oxygen in the syringe. Analyse within minutes, or put the sample on ice if there is a delay.",
      fact: "The same effect falsely lowers glucose in a delayed sample, which is why fluoride tubes exist for lab glucose.",
    },
    {
      id: "fun-blood-volume",
      topic: "fun",
      stem: "A 600 g preterm baby has roughly how much blood in total?",
      choices: ["About 50 mL", "About 500 mL", "About 5 mL", "About 5 L"],
      answer: 0,
      why: "Blood volume is about 80–90 mL/kg in the preterm, so 600 g gives roughly 50 mL. Every 0.5 mL gas is 1% of the circulation.",
      fact: "Iatrogenic blood loss from sampling is one of the main reasons extremely preterm babies need transfusion.",
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

  /** A shuffled deck of campfire facts; call next() to draw without repeats. */
  function factDeck() {
    let deck = shuffle(FACTS);
    return {
      next() {
        if (!deck.length) deck = shuffle(FACTS);
        return deck.pop();
      },
    };
  }

  window.TumbleweedTrivia = {
    TOPICS,
    QUESTIONS,
    FACTS,
    shuffle,
    questionsForTopic,
    topicLabel,
    factDeck,
  };
})();
