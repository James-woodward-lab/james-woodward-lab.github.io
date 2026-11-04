/*
 * Postnatal daily review — documentation content only.
 *
 * This module lists clinician-facing labels and phrase snippets for a
 * documentation aid. It must not encode clinical decision support: no risk
 * scores, thresholds, management rules, or automatic inference from values.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PostnatalDailyReviewContent = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function opt(value, label, extra) {
    var o = { value: value, label: label };
    if (extra) Object.keys(extra).forEach(function (k) { o[k] = extra[k]; });
    return o;
  }

  var STEPS = [
    { id: 'context', label: 'Baby' },
    { id: 'today', label: 'Today' },
    { id: 'checks', label: 'Checks' },
    { id: 'plan', label: 'Plan' }
  ];

  var PLACES = [
    { value: 'postnatal', label: 'Postnatal ward' },
    { value: 'tc', label: 'Transitional care' },
    { value: 'other', label: 'Other' }
  ];

  var PATHWAYS = [
    { id: 'sepsis', label: 'Suspected sepsis' },
    { id: 'late-preterm', label: 'Late preterm pathway' },
    { id: 'temperature', label: 'Temperature management' },
    { id: 'hypoglycaemia', label: 'Hypoglycaemia' },
    { id: 'jaundice', label: 'Jaundice' }
  ];

  /* Problems beyond the four pathways. Clinician picks each one; nothing is
   * added from gestation, results, or any other entered value. */
  var EXTRA_PROBLEMS = [
    { id: 'feeding', label: 'Feeding difficulty' },
    { id: 'weight-loss', label: 'Weight loss' },
    { id: 'idm', label: 'Infant of diabetic mother' },
    { id: 'sga', label: 'Small for gestational age' },
    { id: 'lga', label: 'Large for gestational age' },
    { id: 'resp', label: 'Respiratory symptoms' },
    { id: 'murmur', label: 'Murmur' },
    { id: 'antenatal', label: 'Antenatal finding' },
    { id: 'hdn', label: 'Risk of haemolytic disease' },
    { id: 'psychotropic', label: 'Maternal antidepressant or antipsychotic' },
    { id: 'thyro', label: 'Maternal thyrotoxicosis' },
    { id: 'maternal-meds', label: 'Other maternal medication' },
    { id: 'hips', label: 'Hip risk factors' },
    { id: 'other', label: 'Other' }
  ];

  var PROBLEM_STATUSES = [
    { value: 'new', label: 'New' },
    { value: 'ongoing', label: 'Ongoing' },
    { value: 'resolved', label: 'Resolved' }
  ];

  /* Items the clinician marks as still awaited at the next review. */
  var PENDING_ITEMS = [
    { value: 'culture', label: 'Blood culture' },
    { value: 'crp', label: 'CRP' },
    { value: 'bilirubin', label: 'Bilirubin' },
    { value: 'glucose', label: 'Blood glucose' },
    { value: 'gas', label: 'Blood gas' },
    { value: 'weight', label: 'Weight' },
    { value: 'senior', label: 'Senior review' },
    { value: 'nipe', label: 'NIPE' },
    { value: 'hearing', label: 'Hearing screen' },
    { value: 'hepb', label: 'Hep B vaccine' },
    { value: 'other', label: 'Other' }
  ];

  /*
   * Problem templates: an aide-memoire of what to check and document for each
   * problem. Prompts only. They carry no thresholds, targets, or management
   * rules, and nothing is filled in by the app from numbers.
   *
   * kind 'source'  - shows what was already entered in another panel.
   * kind 'text'    - free text, shared by every problem that lists the item.
   * kind 'confirm' - Done / Not yet / N/A, shared the same way.
   */
  var CHECK_SOURCES = {
    gestation: { step: 'context', where: 'Baby' },
    feeding: { step: 'today', where: 'Today' },
    obs: { step: 'today', where: 'Today' },
    glucose: { step: 'today', where: 'Today' },
    temps: { step: 'today', where: 'Today' },
    jaundice: { step: 'today', where: 'Today' },
    weight: { step: 'today', where: 'Today' }
  };

  var CHECK_ITEMS = {
    gestation: { kind: 'source', source: 'gestation', label: 'Gestation at birth' },
    feeding: { kind: 'source', source: 'feeding', label: 'Feeding' },
    obs: { kind: 'source', source: 'obs', label: 'Observations' },
    glucose: { kind: 'source', source: 'glucose', label: 'Blood glucose' },
    temps: { kind: 'source', source: 'temps', label: 'Temperature and thermal care' },
    jaundice: { kind: 'source', source: 'jaundice', label: 'Jaundice and bilirubin' },
    weight: { kind: 'source', source: 'weight', label: 'Weight' },

    birthWeight: { kind: 'text', label: 'Birth weight and centile', placeholder: '2.24 kg, 9th centile' },
    lpRiskFactors: { kind: 'text', label: 'Additional risk factors', placeholder: 'For example, SGA, maternal diabetes, beta-blocker, resuscitation, condition affecting feeding' },
    sepsisRiskFactors: { kind: 'text', label: 'Infection risk factors and red flags', placeholder: 'As documented' },
    infectionSigns: { kind: 'text', label: 'Clinical indicators of infection checked', placeholder: 'Behaviour, tone, breathing, heart rate, temperature, feeding, glucose' },
    sepsisRedFlags: { kind: 'text', label: 'Red flags in the baby', placeholder: 'As documented, or none' },
    abxStart: { kind: 'text', label: 'Antibiotics started (date and time)' },
    satsChecked: { kind: 'confirm', label: 'Oxygen saturations checked at review', yes: 'Oxygen saturations checked at review.', no: 'Oxygen saturations not yet checked at review.' },
    cxr: { kind: 'text', label: 'Chest X-ray, if respiratory signs' },
    lpConsidered: { kind: 'text', label: 'Lumbar puncture considered', placeholder: 'Decision and who it was discussed with' },
    repeatCrp: { kind: 'text', label: 'Repeat CRP', placeholder: 'When sent and result' },
    seniorDiscussed: { kind: 'confirm', label: 'Discussed with registrar or consultant', yes: 'Discussed with registrar or consultant.', no: 'Not yet discussed with registrar or consultant.' },
    jaundiceRiskFactors: { kind: 'text', label: 'Risk factors for significant jaundice', placeholder: 'For example, gestation, sibling needed phototherapy, exclusive breastfeeding, jaundice in first 24 hours' },
    jaundiceExam: { kind: 'confirm', label: 'Examined undressed in good light (sclerae, gums, blanched skin)', yes: 'Examined undressed in good light, including sclerae, gums and blanched skin.', no: 'Not yet examined undressed in good light.' },
    bilirubinMethod: { kind: 'confirm', label: 'Serum or transcutaneous choice checked for gestation and age', yes: 'Bilirubin method checked for gestation and age.', no: 'Bilirubin method not yet checked for gestation and age.' },
    haemolysisBloods: { kind: 'text', label: 'Other bloods, if sent', placeholder: 'For example, FBC, film, PCV, G6PD, cultures' },
    encephalopathySigns: { kind: 'confirm', label: 'Signs of bilirubin encephalopathy checked', yes: 'Signs of bilirubin encephalopathy checked.', no: 'Signs of bilirubin encephalopathy not yet checked.' },
    phototherapyCare: { kind: 'confirm', label: 'Eye protection, temperature and hydration checked during phototherapy', yes: 'Eye protection, temperature and hydration checked during phototherapy.', no: 'Phototherapy care checks not yet done.' },
    reboundPlan: { kind: 'text', label: 'Rebound bilirubin after phototherapy', placeholder: 'As planned' },
    jaundiceInfo: { kind: 'confirm', label: 'Jaundice and phototherapy information given', yes: 'Jaundice and phototherapy information given to parents.', no: 'Jaundice and phototherapy information not yet given.' },
    obsPlan: { kind: 'text', label: 'Observation frequency and duration', placeholder: 'As planned' },
    feedPlan: { kind: 'text', label: 'Individual feeding plan', placeholder: 'Volumes, frequency, top-ups, expressing' },
    nappies: { kind: 'text', label: 'Wet nappies and stools', placeholder: 'Including dark urine or pale stools' },
    hypoTreatment: { kind: 'text', label: 'Treatment given', placeholder: 'For example, top-ups, gel, other' },
    glucosePlan: { kind: 'text', label: 'Glucose monitoring plan', placeholder: 'As agreed' },
    tempReversible: { kind: 'confirm', label: 'Hat, wrapping and draughts checked', yes: 'Hat, wrapping and draughts checked.', no: 'Hat, wrapping and draughts not yet checked.' },
    tempStable: { kind: 'text', label: 'Time with stable temperatures in a cot' },
    sepsisDuration: { kind: 'text', label: 'Antibiotic review point and planned duration' },
    jaundiceOnset: { kind: 'text', label: 'When jaundice was first noticed' },
    chartGestation: { kind: 'confirm', label: 'Plotted on the chart for birth gestation', yes: 'Plotted on the chart for birth gestation.', no: 'Not yet plotted on the chart for birth gestation.' },
    bloodGroupDat: { kind: 'text', label: 'Baby blood group and DAT', placeholder: 'With maternal group' },
    bilirubinPlan: { kind: 'text', label: 'Next bilirubin', placeholder: 'As planned' },
    maternalAntibodies: { kind: 'text', label: 'Maternal group, antibodies and anti-D history' },
    haemPlan: { kind: 'confirm', label: 'Antenatal haematology and obstetric plan checked', yes: 'Antenatal haematology and obstetric plan checked.', no: 'Antenatal haematology and obstetric plan not yet checked.' },
    fbcSbr: { kind: 'text', label: 'FBC and SBR results' },
    hdnFollowUp: { kind: 'text', label: 'Follow-up bloods and medicines', placeholder: 'As planned' },
    datLeaflet: { kind: 'confirm', label: 'DAT-positive parent leaflet, if applicable', yes: 'DAT-positive parent leaflet given.', no: 'DAT-positive parent leaflet not yet given.' },
    medsDetail: { kind: 'text', label: 'Medication and timing of last dose' },
    adaptationSigns: { kind: 'text', label: 'Signs of poor adaptation checked', placeholder: 'Feeding, tone, irritability, jitteriness, breathing' },
    pulseOx: { kind: 'confirm', label: 'Pulse oximetry screening', yes: 'Pulse oximetry screening completed.', no: 'Pulse oximetry screening not yet completed.' },
    bfMedsAdvice: { kind: 'text', label: 'Breastfeeding advice for this medication' },
    adaptationLeaflet: { kind: 'confirm', label: 'Poor adaptation parent leaflet', yes: 'Poor adaptation parent leaflet given.', no: 'Poor adaptation parent leaflet not yet given.' },
    trab: { kind: 'text', label: 'Maternal TrAB and thyroid history' },
    neonatalTrab: { kind: 'text', label: 'Neonatal TrAB sent and result' },
    thyroSigns: { kind: 'text', label: 'Signs of thyrotoxicosis checked', placeholder: 'Heart rate, breathing, temperature, irritability, goitre' },
    tftPlan: { kind: 'text', label: 'Thyroid function follow-up booked' },
    thyroLetters: { kind: 'confirm', label: 'GP and parent thyroid letters', yes: 'GP and parent thyroid letters given.', no: 'GP and parent thyroid letters not yet given.' },
    respFindings: { kind: 'text', label: 'Work of breathing and oxygen need' },
    murmurDetail: { kind: 'text', label: 'Murmur findings' },
    femorals: { kind: 'text', label: 'Femoral pulses' },
    satsPrePost: { kind: 'text', label: 'Pre- and post-ductal saturations' },
    cardiacPlan: { kind: 'text', label: 'Echo or cardiology follow-up', placeholder: 'As planned' },
    birthInjury: { kind: 'text', label: 'Birth injury checked', placeholder: 'For example, clavicles, arm movements' },
    antenatalDetail: { kind: 'text', label: 'Antenatal finding' },
    postnatalTests: { kind: 'text', label: 'Postnatal tests and referrals', placeholder: 'As planned' },
    hipRisk: { kind: 'text', label: 'Hip risk factor', placeholder: 'For example, breech, family history' },
    hipExam: { kind: 'text', label: 'Hip examination' },
    hipScan: { kind: 'confirm', label: 'Hip ultrasound requested', yes: 'Hip ultrasound requested.', no: 'Hip ultrasound not yet requested.' },
    weightChange: { kind: 'text', label: 'Change from birth weight', placeholder: 'As you have calculated it' },
    weightPlan: { kind: 'text', label: 'Next weight', placeholder: 'As planned' },
    bfAssessment: { kind: 'confirm', label: 'Breastfeeding assessment', yes: 'Breastfeeding assessment completed.', no: 'Breastfeeding assessment not yet completed.' },
    feedSupport: { kind: 'confirm', label: 'Infant feeding team involved', yes: 'Infant feeding team involved.', no: 'Infant feeding team not yet involved.' },
    lpLeaflet: { kind: 'confirm', label: 'Late preterm parent leaflet', yes: 'Late preterm parent leaflet given.', no: 'Late preterm parent leaflet not yet given.' },
    hypoLeaflet: { kind: 'confirm', label: 'Hypoglycaemia parent leaflet', yes: 'Hypoglycaemia parent leaflet given.', no: 'Hypoglycaemia parent leaflet not yet given.' },
    nipe: { kind: 'confirm', label: 'NIPE', yes: 'NIPE completed.', no: 'NIPE not yet completed.' },
    carSeat: { kind: 'confirm', label: 'Car seat challenge, if applicable', yes: 'Car seat challenge done.', no: 'Car seat challenge not yet done.' },
    dischargeMeds: { kind: 'confirm', label: 'Discharge vitamins and iron', yes: 'Discharge vitamins and iron prescribed.', no: 'Discharge vitamins and iron not yet prescribed.' },
    communityFollowUp: { kind: 'text', label: 'Community follow-up', placeholder: 'For example, weight and bilirubin checks' },
    safetyNet: { kind: 'confirm', label: 'Safety-net advice', yes: 'Safety-net advice given.', no: 'Safety-net advice not yet given.' }
  };

  var TEMPLATES = {
    sepsis: ['sepsisRiskFactors', 'sepsisRedFlags', 'infectionSigns', 'obs', 'obsPlan', 'satsChecked', 'temps', 'feeding', 'abxStart', 'cxr', 'lpConsidered', 'repeatCrp', 'sepsisDuration', 'seniorDiscussed', 'safetyNet'],
    'late-preterm': ['gestation', 'birthWeight', 'lpRiskFactors', 'obs', 'obsPlan', 'temps', 'feeding', 'feedPlan', 'glucose', 'jaundice', 'weight', 'infectionSigns', 'lpLeaflet', 'nipe', 'carSeat', 'dischargeMeds', 'communityFollowUp', 'safetyNet'],
    temperature: ['temps', 'tempReversible', 'infectionSigns', 'glucose', 'tempStable'],
    hypoglycaemia: ['glucose', 'feeding', 'feedPlan', 'bfAssessment', 'temps', 'hypoTreatment', 'glucosePlan', 'hypoLeaflet'],
    jaundice: ['jaundiceOnset', 'jaundiceRiskFactors', 'jaundiceExam', 'jaundice', 'bilirubinMethod', 'chartGestation', 'bloodGroupDat', 'haemolysisBloods', 'infectionSigns', 'encephalopathySigns', 'phototherapyCare', 'feeding', 'feedSupport', 'nappies', 'weight', 'bilirubinPlan', 'reboundPlan', 'jaundiceInfo', 'safetyNet'],
    feeding: ['feeding', 'feedPlan', 'bfAssessment', 'feedSupport', 'nappies', 'weight'],
    'weight-loss': ['birthWeight', 'weight', 'weightChange', 'feeding', 'feedPlan', 'nappies', 'jaundice', 'weightPlan', 'communityFollowUp'],
    idm: ['glucose', 'feeding', 'obs', 'respFindings', 'glucosePlan', 'nipe'],
    sga: ['birthWeight', 'glucose', 'temps', 'feeding', 'feedPlan', 'weight', 'nipe'],
    lga: ['birthWeight', 'glucose', 'feeding', 'birthInjury'],
    resp: ['obs', 'respFindings', 'infectionSigns', 'feeding'],
    murmur: ['murmurDetail', 'femorals', 'satsPrePost', 'cardiacPlan', 'safetyNet'],
    antenatal: ['antenatalDetail', 'postnatalTests'],
    hdn: ['maternalAntibodies', 'haemPlan', 'bloodGroupDat', 'fbcSbr', 'jaundice', 'bilirubinPlan', 'hdnFollowUp', 'datLeaflet', 'safetyNet'],
    psychotropic: ['medsDetail', 'obs', 'obsPlan', 'adaptationSigns', 'pulseOx', 'feeding', 'bfMedsAdvice', 'nipe', 'adaptationLeaflet', 'safetyNet'],
    thyro: ['trab', 'neonatalTrab', 'thyroSigns', 'obs', 'feeding', 'tftPlan', 'thyroLetters', 'safetyNet'],
    'maternal-meds': ['medsDetail', 'obs', 'feeding', 'safetyNet'],
    hips: ['hipRisk', 'hipExam', 'hipScan']
  };

  var CHECK_STATUSES = [
    { value: 'yes', label: 'Done' },
    { value: 'no', label: 'Not yet' },
    { value: 'na', label: 'N/A' }
  ];

  var THERMAL_CARE = [
    { value: 'cot', label: 'Cot', prose: 'Cared for in a cot.' },
    { value: 'skin', label: 'Skin-to-skin', prose: 'Skin-to-skin documented.' },
    { value: 'incubator', label: 'Incubator', prose: 'In incubator.' }
  ];

  var HYPO_REASONS = [
    { value: 'idm', label: 'Maternal diabetes', prose: 'Maternal diabetes documented.' },
    { value: 'beta-blocker', label: 'Maternal beta-blocker', prose: 'Maternal beta-blocker documented.' },
    { value: 'sga', label: 'Birth weight on or under the 2nd centile', prose: 'Birth weight on or under the 2nd centile documented.' },
    { value: 'wasted', label: 'Clinical wasting', prose: 'Clinical wasting documented.' },
    { value: 'other', label: 'Other' }
  ];

  var HYPO_SYMPTOMS = [
    { value: 'none', label: 'None documented' },
    { value: 'jitteriness', label: 'Jitteriness' },
    { value: 'poor-feeding', label: 'Poor feeding' },
    { value: 'lethargy', label: 'Lethargy' },
    { value: 'other', label: 'Other' }
  ];

  var CULTURE_STATUS = [
    { value: 'pending', label: 'Pending', prose: 'Blood culture pending.' },
    { value: 'no-growth', label: 'No growth to date', prose: 'Blood culture no growth to date.' },
    { value: 'growth', label: 'Growth' }
  ];

  var PHOTOTHERAPY = [
    { value: 'none', label: 'Not on phototherapy', prose: 'Not on phototherapy.' },
    { value: 'single', label: 'Single', prose: 'On single phototherapy.' },
    { value: 'multiple', label: 'Multiple', prose: 'On multiple phototherapy.' },
    { value: 'stopped', label: 'Stopped', prose: 'Phototherapy stopped.' }
  ];

  var JAUNDICE = [
    { value: 'none', label: 'None documented', prose: 'No clinical jaundice.' },
    { value: 'clinical', label: 'Clinical jaundice', prose: 'Clinical jaundice documented.' },
    { value: 'tcb', label: 'Transcutaneous' },
    { value: 'tsb', label: 'Serum' }
  ];

  var PLAN_PHRASES = [
    { id: 'abx-continue', label: 'Continue antibiotics', text: 'Continue current antibiotics.', pathways: ['sepsis'] },
    { id: 'culture-pending', label: 'Culture pending', text: 'Blood culture still pending.', pathways: ['sepsis'] },
    { id: 'repeat-crp', label: 'Repeat CRP as planned', text: 'Repeat CRP as planned.', pathways: ['sepsis'] },
    { id: 'review-culture', label: 'Review with culture', text: 'Review with the culture result.', pathways: ['sepsis'] },
    { id: 'abx-review', label: 'Review antibiotics as planned', text: 'Review antibiotics at the planned review point.', pathways: ['sepsis'] },
    { id: 'bili-repeat', label: 'Repeat bilirubin as planned', text: 'Repeat bilirubin as planned.', pathways: ['jaundice'] },
    { id: 'photo-continue', label: 'Continue phototherapy', text: 'Continue phototherapy.', pathways: ['jaundice'] },
    { id: 'rebound', label: 'Rebound bilirubin as planned', text: 'Rebound bilirubin as planned.', pathways: ['jaundice'] },
    { id: 'jaundice-feeds', label: 'Frequent feeds', text: 'Encourage frequent feeds with feeding support.', pathways: ['jaundice'] },
    { id: 'feed-continue', label: 'Continue feeding plan', text: 'Continue current feeding plan.', pathways: ['late-preterm', 'hypoglycaemia'] },
    { id: 'obs-continue', label: 'Continue observations', text: 'Continue observations.', pathways: ['late-preterm', 'sepsis', 'temperature'] },
    { id: 'feed-support', label: 'Feeding support', text: 'Continue feeding support.', pathways: ['late-preterm'] },
    { id: 'parent-info', label: 'Parent information given', text: 'Parent information given as discussed.', pathways: ['late-preterm'] },
    { id: 'thermal-continue', label: 'Continue thermal care', text: 'Continue current thermal care.', pathways: ['temperature', 'late-preterm'] },
    { id: 'temp-recheck', label: 'Recheck temperature as charted', text: 'Recheck temperature as charted.', pathways: ['temperature'] },
    { id: 'incubator-wean', label: 'Wean incubator as planned', text: 'Wean incubator as planned.', pathways: ['temperature'] },
    { id: 'glucose-continue', label: 'Continue glucose checks', text: 'Continue blood glucose monitoring.', pathways: ['hypoglycaemia', 'late-preterm'] },
    { id: 'glucose-recheck', label: 'Recheck glucose as planned', text: 'Recheck glucose as planned.', pathways: ['hypoglycaemia'] },
    { id: 'review-tomorrow', label: 'Review tomorrow', text: 'Review tomorrow.' },
    { id: 'review-later', label: 'Review later today', text: 'Review later today.' },
    { id: 'safety', label: 'Safety-net advice', text: 'Safety-net advice given as discussed with the parents.' }
  ];

  var EXAM_SYSTEMS = [
    {
      id: 'general',
      label: 'General',
      shortLabel: 'General appearance',
      nad: 'Appears well.',
      controls: [
        {
          id: 'wellbeing',
          label: 'Appearance',
          type: 'single',
          options: [
            opt('well', 'Well', { prose: 'Appears well.' }),
            opt('mild', 'Mildly unwell', { abnormal: true, prose: 'Appears mildly unwell.' }),
            opt('unwell', 'Unwell', { abnormal: true, prose: 'Appears unwell.' })
          ]
        },
        {
          id: 'cry',
          label: 'Cry',
          type: 'single',
          options: [
            opt('settled', 'Settled', { prose: 'Settled.' }),
            opt('usual', 'Usual cry', { prose: 'Cry usual.' }),
            opt('unusual', 'Unusual pitch', { abnormal: true, prose: 'Cry unusual in pitch.' })
          ]
        }
      ]
    },
    {
      id: 'breathing',
      label: 'Breathing',
      shortLabel: 'Breathing',
      nad: 'Comfortable, no increased work of breathing documented.',
      controls: [
        {
          id: 'effort',
          label: 'Work of breathing',
          type: 'single',
          options: [
            opt('comfortable', 'Comfortable', { prose: 'Comfortable.' }),
            opt('increased', 'Increased', { abnormal: true, prose: 'Increased work of breathing.' })
          ]
        },
        {
          id: 'grunting',
          label: 'Grunting',
          type: 'yn',
          options: [
            opt('yes', 'Yes', { abnormal: true, prose: 'Grunting.' }),
            opt('no', 'No', { prose: 'No grunting.' })
          ]
        }
      ]
    },
    {
      id: 'colour',
      label: 'Colour',
      shortLabel: 'Colour',
      nad: 'No colour concern documented.',
      controls: [
        {
          id: 'colour',
          label: 'Colour',
          type: 'single',
          options: [
            opt('pink', 'Pink', { prose: 'Pink.' }),
            opt('pale', 'Pale', { abnormal: true, prose: 'Pale.' }),
            opt('jaundiced', 'Jaundiced', { abnormal: true, prose: 'Jaundiced.' }),
            opt('mottled', 'Mottled', { abnormal: true, prose: 'Mottled.' })
          ]
        }
      ]
    },
    {
      id: 'abdomen',
      label: 'Abdomen',
      shortLabel: 'Abdomen',
      nad: 'Soft abdomen.',
      controls: [
        {
          id: 'feel',
          label: 'Feel',
          type: 'single',
          options: [
            opt('soft', 'Soft', { prose: 'Soft abdomen.' }),
            opt('distended', 'Distended', { abnormal: true, prose: 'Distended abdomen.' })
          ]
        }
      ]
    },
    {
      id: 'tone',
      label: 'Tone',
      shortLabel: 'Tone',
      nad: 'Tone as previously documented.',
      controls: [
        {
          id: 'tone',
          label: 'Tone',
          type: 'single',
          options: [
            opt('usual', 'As previously', { prose: 'Tone as previously documented.' }),
            opt('reduced', 'Reduced', { abnormal: true, prose: 'Reduced tone.' })
          ]
        }
      ]
    }
  ];

  return {
    STEPS: STEPS,
    PLACES: PLACES,
    PATHWAYS: PATHWAYS,
    EXTRA_PROBLEMS: EXTRA_PROBLEMS,
    PROBLEM_STATUSES: PROBLEM_STATUSES,
    PENDING_ITEMS: PENDING_ITEMS,
    CHECK_SOURCES: CHECK_SOURCES,
    CHECK_ITEMS: CHECK_ITEMS,
    CHECK_STATUSES: CHECK_STATUSES,
    TEMPLATES: TEMPLATES,
    THERMAL_CARE: THERMAL_CARE,
    HYPO_REASONS: HYPO_REASONS,
    HYPO_SYMPTOMS: HYPO_SYMPTOMS,
    CULTURE_STATUS: CULTURE_STATUS,
    JAUNDICE: JAUNDICE,
    PHOTOTHERAPY: PHOTOTHERAPY,
    PLAN_PHRASES: PLAN_PHRASES,
    EXAM_SYSTEMS: EXAM_SYSTEMS
  };
});
