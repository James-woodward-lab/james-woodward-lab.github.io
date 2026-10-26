/*
 * Postnatal review — documentation content only.
 *
 * This module lists clinician-facing labels and phrase snippets for a
 * documentation aid. It must not encode clinical decision support: no risk
 * scores, thresholds, management rules, or automatic inference from values.
 *
 * Optional NICE reference labels are attached only when the clinician
 * explicitly selects the matching predefined finding button. They are
 * transcriptional captions, not assessments.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PostnatalReviewContent = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* Counts documented selections only. Do not infer factors from observation
   * values, gestation free text, gas numbers, or glucose numbers. */
  var FACTORS = [
    { id: 'sibling-infection', kind: 'ng195-red', box: 'risk', summary: 'infection in another baby of a multiple pregnancy' },
    { id: 'gbs', kind: 'ng195-other', box: 'risk', summary: 'group B streptococcus' },
    { id: 'spontaneous-preterm', kind: 'ng195-other', box: 'risk', summary: 'preterm birth after spontaneous labour' },
    { id: 'rom-preterm-18', kind: 'ng195-other', box: 'risk', summary: 'prolonged rupture of membranes' },
    { id: 'rom-term-24', kind: 'ng195-other', box: 'risk', summary: 'prolonged rupture of membranes' },
    { id: 'maternal-sepsis', kind: 'ng195-other', box: 'risk', summary: 'maternal sepsis' },
    { id: 'chorio', kind: 'ng195-other', box: 'risk', summary: 'chorioamnionitis' },
    { id: 'cpr', kind: 'ng195-red', box: 'indicator', summary: 'cardiopulmonary resuscitation' },
    { id: 'ventilation', kind: 'ng195-red', box: 'indicator', summary: 'mechanical ventilation' },
    { id: 'apnoea', kind: 'ng195-red', box: 'indicator', summary: 'apnoea' },
    { id: 'seizures', kind: 'ng195-red', box: 'indicator', summary: 'seizures' },
    { id: 'shock', kind: 'ng195-red', box: 'indicator', summary: 'signs of shock' },
    { id: 'altered-behaviour', kind: 'ng195-other', box: 'indicator', summary: 'altered behaviour or responsiveness' },
    { id: 'altered-tone', kind: 'ng195-other', box: 'indicator', summary: 'altered muscle tone' },
    { id: 'feed-refusal', kind: 'ng195-other', box: 'indicator', summary: 'feeding difficulties' },
    { id: 'feed-intolerance', kind: 'ng195-other', box: 'indicator', summary: 'feed intolerance' },
    { id: 'resp-distress', kind: 'ng195-other', box: 'indicator', summary: 'respiratory distress' },
    { id: 'hypoxia', kind: 'ng195-other', box: 'indicator', summary: 'hypoxia' },
    { id: 'bleeding-coag', kind: 'ng195-other', box: 'indicator', summary: 'bleeding, thrombocytopenia, or coagulopathy' },
    { id: 'altered-glucose', kind: 'ng195-other', box: 'indicator', summary: 'altered glucose' },
    { id: 'idm', kind: 'bapm', box: 'hypo', summary: 'maternal diabetes' },
    { id: 'beta-blocker', kind: 'bapm', box: 'hypo', summary: 'maternal beta-blocker' },
    { id: 'sga', kind: 'bapm', box: 'hypo', summary: 'birth weight on or under the 2nd centile' },
    { id: 'wasted', kind: 'bapm', box: 'hypo', summary: 'clinical wasting' }
  ];

  /* UI captions for documented NICE categories. */
  var GUIDE = {
    red: 'NICE red flag',
    ng195: 'NICE risk factor',
    indicator: 'NICE clinical indicator',
    bapm: 'BAPM hypoglycaemia framework item',
    local: 'Often relevant locally. Confirm against your guideline.'
  };

  var NICE_DOC = {
    'gbs-maternal': {
      kind: 'ng195',
      fact: 'Maternal group B streptococcal colonisation, bacteriuria, or infection in this pregnancy documented.',
      label: 'NICE early-onset neonatal infection risk factor documented: maternal GBS colonisation.'
    },
    'gbs-previous': {
      kind: 'ng195',
      fact: 'Invasive group B streptococcal infection in a previous baby documented.',
      label: 'NICE early-onset neonatal infection risk factor documented: invasive GBS in a previous baby.'
    },
    'spontaneous-preterm': {
      kind: 'ng195',
      fact: 'Preterm birth after spontaneous labour, before 37 weeks, documented.',
      label: 'NICE early-onset neonatal infection risk factor documented: preterm birth after spontaneous labour.'
    },
    'rom-preterm-18': {
      kind: 'ng195',
      fact: 'Rupture of membranes for more than 18 hours before a preterm birth documented.',
      label: 'NICE early-onset neonatal infection risk factor documented: prolonged rupture of membranes before preterm birth.'
    },
    'rom-term-24': {
      kind: 'ng195',
      fact: 'Rupture of membranes for more than 24 hours before a term birth documented.',
      label: 'NICE early-onset neonatal infection risk factor documented: prolonged rupture of membranes before term birth.'
    },
    'maternal-sepsis': {
      kind: 'ng195',
      fact: 'Maternal sepsis in the intrapartum or early postpartum period documented.',
      label: 'NICE early-onset neonatal infection risk factor documented: maternal sepsis.'
    },
    chorio: {
      kind: 'ng195',
      fact: 'Suspected or confirmed chorioamnionitis documented.',
      label: 'NICE early-onset neonatal infection risk factor documented: chorioamnionitis.'
    },
    'sibling-infection': {
      kind: 'red',
      fact: 'Suspected or confirmed infection in another baby of this multiple pregnancy documented.',
      label: 'NICE early-onset neonatal infection red flag documented: infection in another baby of a multiple pregnancy.'
    },
    cpr: {
      kind: 'red',
      fact: 'Cardiopulmonary resuscitation was needed.',
      label: 'NICE early-onset neonatal infection red flag documented: cardiopulmonary resuscitation.'
    },
    ventilation: {
      kind: 'red',
      fact: 'Mechanical ventilation was needed.',
      label: 'NICE early-onset neonatal infection red flag documented: mechanical ventilation.'
    },
    thrombocytopenia: {
      kind: 'indicator',
      fact: 'Thrombocytopenia documented.',
      label: 'NICE early-onset neonatal infection clinical indicator documented: thrombocytopenia.'
    },
    coagulation: {
      kind: 'indicator',
      fact: 'Abnormal coagulation documented.',
      label: 'NICE early-onset neonatal infection clinical indicator documented: abnormal coagulation.'
    }
  };

  var STEPS = [
    { id: 'context', label: 'Context' },
    { id: 'background', label: 'Background' },
    { id: 'history', label: 'History' },
    { id: 'examination', label: 'Examination' },
    { id: 'results', label: 'Results' },
    { id: 'impression', label: 'Impression' }
  ];

  var REASONS = [
    { id: 'sepsis', label: 'Infection history', step: 'background' },
    { id: 'hypoglycaemia', label: 'Hypoglycaemia history', step: 'background' },
    { id: 'jaundice', label: 'Jaundice', step: 'results' },
    { id: 'feeding', label: 'Feeding', step: 'history' },
    { id: 'breathing', label: 'Breathing', step: 'examination' },
    { id: 'temperature', label: 'Temperature', step: 'examination' },
    { id: 'vomiting', label: 'Vomiting', step: 'history' },
    { id: 'weight', label: 'Weight', step: 'context' },
    { id: 'colour', label: 'Colour', step: 'examination' },
    { id: 'concern', label: 'Parental or midwife concern', step: 'history' },
    { id: 'murmur', label: 'Murmur', step: 'examination' },
    { id: 'anomaly', label: 'Anomaly query', step: 'examination' },
    { id: 'other', label: 'Other', step: 'context' }
  ];

  var PLACES = [
    { value: 'postnatal', label: 'Postnatal ward' },
    { value: 'labour', label: 'Labour ward' },
    { value: 'other', label: 'Other' }
  ];

  var MODES = [
    { value: 'svd', label: 'Normal vaginal birth' },
    { value: 'instrumental', label: 'Instrumental' },
    { value: 'caesarean', label: 'Caesarean' },
    { value: 'other', label: 'Other' }
  ];

  var DIAGNOSES = [
    { id: 'well', label: 'Well baby', text: 'Well baby.' },
    { id: 'sepsis', label: 'Possible early-onset infection', text: 'Possible early-onset infection.' },
    { id: 'feeding', label: 'Feeding difficulty', text: 'Feeding difficulty.' },
    { id: 'hypo', label: 'Hypoglycaemia', text: 'Hypoglycaemia.' },
    { id: 'jaundice', label: 'Jaundice', text: 'Jaundice.' },
    { id: 'resp', label: 'Respiratory symptoms', text: 'Respiratory symptoms.' },
    { id: 'murmur', label: 'Murmur', text: 'Murmur for follow-up.' },
    { id: 'other', label: 'Other', text: '' }
  ];

  var PLAN_PHRASES = [
    { id: 'stay-pn', label: 'Stay on postnatal ward', text: 'Remain with mother on the postnatal ward.' },
    { id: 'stay-lw', label: 'Stay on labour ward', text: 'Remain on the labour ward with mother.' },
    { id: 'tc', label: 'Transitional care', text: 'Admit to transitional care.' },
    { id: 'nnu', label: 'Neonatal unit', text: 'Admit to the neonatal unit.' },
    { id: 'obs', label: 'Observations', text: 'Continue observations and review if they change.' },
    { id: 'bf', label: 'Breastfeeding', text: 'Continue breastfeeding with midwifery support.' },
    { id: 'ebm', label: 'Expressed milk', text: 'Expressed breast milk as the feeding plan.' },
    { id: 'formula', label: 'Formula', text: 'Formula feeds, volume and frequency as charted.' },
    { id: 'topups', label: 'Top-ups', text: 'Top-ups alongside breastfeeding.' },
    { id: 'tube', label: 'Tube feeds', text: 'Tube feeds.' },
    { id: 'npo', label: 'Pause feeds', text: 'Pause enteral feeds.' },
    { id: 'glucose', label: 'Glucose checks', text: 'Continue blood glucose monitoring.' },
    { id: 'bili', label: 'Repeat bilirubin', text: 'Repeat bilirubin as planned.' },
    { id: 'ix', label: 'Investigations', text: 'Investigations sent or to send, as charted.' },
    {
      id: 'safety',
      label: 'Safety-net advice',
      text: 'Safety-net advice given as discussed with the parents.'
    }
  ];

  function opt(value, label, extra) {
    var o = { value: value, label: label };
    if (extra) Object.keys(extra).forEach(function (k) { o[k] = extra[k]; });
    return o;
  }

  var KAISER = [
    { id: 'well', label: 'Well appearing' },
    { id: 'equivocal', label: 'Equivocal' },
    { id: 'unwell', label: 'Unwell appearing' }
  ];

  var RESP_EFFORT = ['mild', 'moderate', 'severe'];

  var EXAM_SYSTEMS = [
    {
      id: 'general',
      label: 'General',
      shortLabel: 'General appearance',
      nad: 'Appears well and handles comfortably.',
      controls: [
        {
          id: 'wellbeing',
          label: 'Appearance',
          type: 'single',
          options: [
            opt('well', 'Well', { normal: true, prose: 'Appears well.' }),
            opt('mild', 'Mildly unwell', { abnormal: true, prose: 'Appears mildly unwell.' }),
            opt('unwell', 'Unwell', { abnormal: true, prose: 'Appears unwell.' })
          ]
        },
        {
          id: 'cry',
          label: 'Cry',
          type: 'single',
          options: [
            opt('normal', 'Usual cry', { normal: true, prose: 'Cry usual.' }),
            opt('high', 'High-pitched', { abnormal: true, prose: 'High-pitched cry.' }),
            opt('weak', 'Weak', { abnormal: true, prose: 'Weak cry.' })
          ]
        },
        {
          id: 'alertness',
          label: 'Behaviour',
          type: 'single',
          guide: 'indicator',
          options: [
            opt('alert', 'Alert', { normal: true, prose: 'Alert.' }),
            opt('sleepy', 'Sleepy but rousable', { normal: true, prose: 'Sleepy but rousable.' }),
            opt('lethargic', 'Lethargic', { abnormal: true, factor: 'altered-behaviour', prose: 'Lethargic.' }),
            opt('irritable', 'Irritable', { abnormal: true, factor: 'altered-behaviour', prose: 'Irritable.' }),
            opt('inconsolable', 'Inconsolable', { abnormal: true, factor: 'altered-behaviour', prose: 'Inconsolable.' })
          ]
        }
      ]
    },
    {
      id: 'respiratory',
      label: 'Respiratory',
      shortLabel: 'Chest',
      nad: 'Chest clear, no increased work of breathing or grunting.',
      controls: [
        {
          id: 'wob',
          label: 'Work of breathing',
          type: 'single',
          guide: 'indicator',
          options: [
            opt('none', 'None', { normal: true, prose: 'No increased work of breathing.' }),
            opt('mild', 'Mild', { abnormal: true, factor: 'resp-distress', prose: 'Mild work of breathing.' }),
            opt('moderate', 'Moderate', { abnormal: true, factor: 'resp-distress', prose: 'Moderate work of breathing.' }),
            opt('severe', 'Severe', { abnormal: true, factor: 'resp-distress', prose: 'Severe work of breathing.' })
          ]
        },
        {
          id: 'grunting',
          label: 'Grunting',
          type: 'yn',
          guide: 'indicator',
          options: [
            opt('yes', 'Yes', { abnormal: true, factor: 'resp-distress', prose: 'Grunting.' }),
            opt('no', 'No', { normal: true, prose: 'No grunting.' })
          ]
        },
        {
          id: 'effortSigns',
          label: 'Signs of increased work',
          type: 'multi',
          sub: true,
          showIf: { control: 'wob', values: RESP_EFFORT },
          options: [
            opt('recessions', 'Recessions', { abnormal: true, prose: 'Recession.', supersededBy: 'recessions' }),
            opt('bobbing', 'Head bobbing', { abnormal: true, prose: 'Head bobbing.' }),
            opt('flaring', 'Nasal flaring', { abnormal: true, prose: 'Nasal flaring.' }),
            opt('accessory', 'Accessory muscle use', { abnormal: true, prose: 'Accessory muscle use.' })
          ]
        },
        {
          id: 'recessions',
          label: 'Recessions',
          type: 'multi',
          sub: true,
          showIf: { control: 'effortSigns', values: ['recessions'] },
          options: [
            opt('subcostal', 'Subcostal', { abnormal: true, prose: 'Subcostal recession.' }),
            opt('intercostal', 'Intercostal', { abnormal: true, prose: 'Intercostal recession.' }),
            opt('sternal', 'Sternal', { abnormal: true, prose: 'Sternal recession.' })
          ]
        },
        {
          id: 'air',
          label: 'Air entry',
          type: 'single',
          options: [
            opt('equal', 'Equal', { normal: true, prose: 'Air entry equal.' }),
            opt('reduced', 'Reduced', { abnormal: true, prose: 'Air entry reduced.' })
          ]
        },
        {
          id: 'sounds',
          label: 'Added sounds',
          type: 'single',
          options: [
            opt('none', 'None', { normal: true, prose: 'No added sounds.' }),
            opt('crackles', 'Crackles', { abnormal: true, prose: 'Crackles.' }),
            opt('wheeze', 'Wheeze', { abnormal: true, prose: 'Wheeze.' })
          ]
        },
        {
          id: 'apnoea',
          label: 'Apnoea',
          type: 'yn',
          guide: 'red',
          options: [
            opt('yes', 'Yes', { abnormal: true, factor: 'apnoea', prose: 'Apnoea.' }),
            opt('no', 'No', { normal: true, prose: 'No apnoea witnessed.' })
          ]
        }
      ]
    },
    {
      id: 'cardiovascular',
      label: 'Cardiovascular',
      shortLabel: 'Cardiovascular',
      nad: 'Heart sounds normal, femorals palpable. CRT under 2 seconds, warm and well perfused. Fontanelle soft.',
      controls: [
        {
          id: 'sounds',
          label: 'Heart sounds',
          type: 'single',
          options: [
            opt('normal', 'Normal', { normal: true, prose: 'Heart sounds normal.' }),
            opt('murmur', 'Murmur', { abnormal: true, prose: 'Murmur present.' })
          ]
        },
        {
          id: 'femorals',
          label: 'Femoral pulses',
          type: 'single',
          options: [
            opt('normal', 'Palpable', { normal: true, prose: 'Femorals palpable.' }),
            opt('weak', 'Weak', { abnormal: true, prose: 'Femoral pulses weak.' }),
            opt('absent', 'Absent', { abnormal: true, prose: 'Femoral pulses absent.' })
          ]
        },
        {
          id: 'crtCentral',
          label: 'Central CRT',
          type: 'single',
          row: 'crt',
          options: [
            opt('<2', '<2s', { normal: true, prose: 'Central CRT under 2 seconds.' }),
            opt('2-3', '2-3s', { abnormal: true, prose: 'Central CRT 2 to 3 seconds.' }),
            opt('>3', '>3s', { abnormal: true, prose: 'Central CRT over 3 seconds.' })
          ]
        },
        {
          id: 'crtPeripheral',
          label: 'Peripheral CRT',
          type: 'single',
          row: 'crt',
          options: [
            opt('<2', '<2s', { normal: true, prose: 'Peripheral CRT under 2 seconds.' }),
            opt('2-3', '2-3s', { abnormal: true, prose: 'Peripheral CRT 2 to 3 seconds.' }),
            opt('>3', '>3s', { abnormal: true, prose: 'Peripheral CRT over 3 seconds.' })
          ]
        },
        {
          id: 'perfusion',
          label: 'Perfusion',
          type: 'single',
          options: [
            opt('warm', 'Warm and well perfused', { normal: true, prose: 'Warm and well perfused.' }),
            opt('cool', 'Cool peripherally', { abnormal: true, prose: 'Cool peripherally.' }),
            opt('shut', 'Shut down', { abnormal: true, prose: 'Peripherally shut down.' })
          ]
        },
        {
          id: 'fontanelle',
          label: 'Fontanelle',
          type: 'single',
          options: [
            opt('soft', 'Soft', { normal: true, prose: 'Fontanelle soft.' }),
            opt('bulging', 'Bulging', { abnormal: true, prose: 'Fontanelle bulging.' }),
            opt('sunken', 'Sunken', { abnormal: true, prose: 'Fontanelle sunken.' })
          ]
        },
        {
          id: 'shock',
          label: 'Signs of shock',
          type: 'yn',
          guide: 'red',
          options: [
            opt('yes', 'Yes', { abnormal: true, factor: 'shock', prose: 'Signs of shock.' }),
            opt('no', 'No', { normal: true, prose: 'No signs of shock.' })
          ]
        }
      ]
    },
    {
      id: 'abdomen',
      label: 'Abdomen',
      shortLabel: 'Abdomen',
      nad: 'Abdomen soft, non-tender, not distended, no organomegaly. Cord healthy. Genitalia normal for sex. Anus patent.',
      controls: [
        {
          id: 'feel',
          label: 'Feel',
          type: 'single',
          options: [
            opt('soft', 'Soft', { normal: true, fragment: true, prose: 'soft' }),
            opt('tense', 'Tense', { abnormal: true, fragment: true, prose: 'tense' })
          ]
        },
        {
          id: 'tenderness',
          label: 'Tenderness',
          type: 'yn',
          options: [
            opt('yes', 'Yes', { abnormal: true, fragment: true, prose: 'tender' }),
            opt('no', 'No', { normal: true, fragment: true, prose: 'non-tender' })
          ]
        },
        {
          id: 'distension',
          label: 'Distension',
          type: 'yn',
          guide: 'indicator',
          options: [
            opt('yes', 'Yes', { abnormal: true, factor: 'feed-intolerance', fragment: true, prose: 'distended' }),
            opt('no', 'No', { normal: true, fragment: true, prose: 'not distended' })
          ]
        },
        {
          id: 'organs',
          label: 'Organomegaly',
          type: 'yn',
          options: [
            opt('yes', 'Yes', { abnormal: true, fragment: true, prose: 'organomegaly' }),
            opt('no', 'No', { normal: true, fragment: true, prose: 'no organomegaly' })
          ]
        },
        {
          id: 'cord',
          label: 'Umbilicus and cord',
          type: 'single',
          options: [
            opt('healthy', 'Healthy', { normal: true, prose: 'Cord healthy.' }),
            opt('red', 'Red', { abnormal: true, prose: 'Umbilicus red.' }),
            opt('discharge', 'Discharge', { abnormal: true, prose: 'Umbilical discharge.' })
          ]
        },
        {
          id: 'genitalia',
          label: 'Genitalia',
          type: 'single',
          options: [
            opt('normal', 'Normal for sex', { normal: true, prose: 'Genitalia normal for sex.' }),
            opt('abnormal', 'Abnormal', { abnormal: true, prose: 'Genitalia abnormal.' })
          ]
        },
        {
          id: 'anus',
          label: 'Anus',
          type: 'single',
          options: [
            opt('patent', 'Patent', { normal: true, prose: 'Anus patent.' }),
            opt('not', 'Not patent', { abnormal: true, prose: 'Anus not patent.' })
          ]
        }
      ]
    },
    {
      id: 'neurology',
      label: 'Neurology',
      shortLabel: 'Neurology',
      nad: 'Tone normal.',
      noteWhen: { control: 'tone', value: 'other' },
      noteLabel: 'Describe the neurological finding',
      controls: [
        {
          id: 'tone',
          label: 'Tone',
          type: 'single',
          guide: 'indicator',
          options: [
            opt('normal', 'Normal', { normal: true, prose: 'Tone normal.' }),
            opt('low', 'Reduced tone', { abnormal: true, factor: 'altered-tone', prose: 'Tone reduced.' }),
            opt('high', 'Increased tone', { abnormal: true, factor: 'altered-tone', prose: 'Tone increased.' }),
            opt('other', 'Other', { abnormal: true, fallback: 'Neurological finding not described.' })
          ]
        }
      ]
    },
    {
      id: 'skin',
      label: 'Skin',
      shortLabel: 'Skin',
      nad: 'Pink, no rash, mottling, or cyanosis.',
      controls: [
        {
          id: 'colour',
          label: 'Colour',
          type: 'single',
          guide: 'indicator',
          options: [
            opt('pink', 'Pink', { normal: true, prose: 'Pink.' }),
            opt('pale', 'Pale', { abnormal: true, prose: 'Pale.' }),
            opt('jaundiced', 'Jaundiced', { abnormal: true, prose: 'Jaundiced.' }),
            opt('mottled', 'Mottled', { abnormal: true, prose: 'Mottled.' }),
            opt('cyanosed', 'Cyanosed', { abnormal: true, factor: 'hypoxia', prose: 'Centrally cyanosed.' })
          ]
        },
        {
          id: 'rash',
          label: 'Rash',
          type: 'single',
          options: [
            opt('none', 'None', { normal: true, prose: 'No rash.' }),
            opt('blanching', 'Blanching', { abnormal: true, prose: 'Blanching rash.' }),
            opt('non', 'Non-blanching', { abnormal: true, prose: 'Non-blanching rash.' })
          ]
        },
        {
          id: 'bruising',
          label: 'Bruising',
          type: 'yn',
          options: [
            opt('yes', 'Yes', { abnormal: true, prose: 'Bruising.' }),
            opt('no', 'No', { normal: true, prose: 'No bruising.' })
          ]
        }
      ]
    }
  ];

  return {
    GUIDE: GUIDE,
    FACTORS: FACTORS,
    NICE_DOC: NICE_DOC,
    STEPS: STEPS,
    REASONS: REASONS,
    PLACES: PLACES,
    MODES: MODES,
    DIAGNOSES: DIAGNOSES,
    PLAN_PHRASES: PLAN_PHRASES,
    EXAM_SYSTEMS: EXAM_SYSTEMS,
    KAISER: KAISER
  };
});
