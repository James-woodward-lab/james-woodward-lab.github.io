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
    { id: 'abnormal-hr', kind: 'ng195-other', box: 'indicator', summary: 'abnormal heart rate' },
    { id: 'pphn', kind: 'ng195-other', box: 'indicator', summary: 'persistent pulmonary hypertension' },
    { id: 'jaundice-24h', kind: 'ng195-other', box: 'indicator', summary: 'jaundice within 24 hours of birth' },
    { id: 'encephalopathy', kind: 'ng195-other', box: 'indicator', summary: 'signs of neonatal encephalopathy' },
    { id: 'temp-abnormal', kind: 'ng195-other', box: 'indicator', summary: 'temperature abnormality' },
    { id: 'bleeding-coag', kind: 'ng195-other', box: 'indicator', summary: 'bleeding, thrombocytopenia, or coagulopathy' },
    { id: 'altered-glucose', kind: 'ng195-other', box: 'indicator', summary: 'altered glucose' },
    { id: 'metabolic-acidosis', kind: 'ng195-other', box: 'indicator', summary: 'metabolic acidosis' },
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

  /* NICE NG195 items: `kind` styles the Yes button; `short` is the wording
   * written into the note when the clinician answers Yes. */
  var NICE_DOC = {
    'gbs-maternal': { kind: 'ng195', short: 'maternal GBS colonisation, bacteriuria or infection this pregnancy' },
    'gbs-previous': { kind: 'ng195', short: 'invasive GBS infection in a previous baby' },
    'spontaneous-preterm': { kind: 'ng195', short: 'preterm birth after spontaneous labour' },
    'rom-preterm-18': { kind: 'ng195', short: 'confirmed ROM >18 hours before preterm birth' },
    'rom-term-24': { kind: 'ng195', short: 'confirmed ROM >24 hours before term birth' },
    'maternal-sepsis': { kind: 'ng195', short: 'suspected or confirmed maternal sepsis' },
    chorio: { kind: 'ng195', short: 'suspected or confirmed chorioamnionitis' },
    'sibling-infection': { kind: 'red', short: 'suspected or confirmed infection in another baby of this multiple pregnancy' },
    cpr: { kind: 'red', short: 'needed CPR' },
    ventilation: { kind: 'red', short: 'needed mechanical ventilation' },
    apnoea: { kind: 'red', short: 'apnoea' },
    seizures: { kind: 'red', short: 'seizures' },
    shock: { kind: 'red', short: 'signs of shock' },
    'altered-behaviour': { kind: 'indicator', short: 'altered behaviour or responsiveness' },
    'altered-tone': { kind: 'indicator', short: 'altered tone' },
    'feed-refusal': { kind: 'indicator', short: 'feeding difficulties' },
    'feed-intolerance': { kind: 'indicator', short: 'feed intolerance' },
    'abnormal-hr': { kind: 'indicator', short: 'abnormal heart rate' },
    'resp-distress': { kind: 'indicator', short: 'respiratory distress' },
    hypoxia: { kind: 'indicator', short: 'hypoxia' },
    pphn: { kind: 'indicator', short: 'PPHN' },
    'jaundice-24h': { kind: 'indicator', short: 'jaundice within 24 hours of birth' },
    encephalopathy: { kind: 'indicator', short: 'signs of neonatal encephalopathy' },
    'temp-abnormal': { kind: 'indicator', short: 'temperature abnormality unexplained by environment' },
    'bleeding-coag': { kind: 'indicator', short: 'unexplained bleeding, thrombocytopenia or abnormal coagulation' },
    'altered-glucose': { kind: 'indicator', short: 'altered glucose homeostasis' },
    'metabolic-acidosis': { kind: 'indicator', short: 'metabolic acidosis (base deficit 10 mmol/L or more)' },
    thrombocytopenia: { kind: 'indicator', short: 'thrombocytopenia' },
    coagulation: { kind: 'indicator', short: 'abnormal coagulation' }
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

  /*
   * Examination systems, in the order they appear on screen and in the note.
   *
   * Each system is written on its own line. Every selected option adds a short
   * prose fragment; fragments that share a `sentence` number are comma-joined
   * into one sentence. `nad` names the option written when the clinician taps
   * NAD for the whole system. `lead` lets a system name open its first
   * sentence (for example "Abdomen soft, non-tender"). `detail` points at a
   * sub-control whose text or choices complete the option's prose.
   * `detailOnly` sub-controls never write on their own.
   */
  function ok(value, label, prose, extra) {
    return opt(value, label, Object.assign({ normal: true, prose: prose }, extra || {}));
  }

  function ab(value, label, prose, extra) {
    return opt(value, label, Object.assign({ abnormal: true, prose: prose }, extra || {}));
  }

  var RESP_EFFORT = ['mild', 'moderate', 'severe'];
  var MALE_OR_UNRECORDED = ['male', 'other', ''];

  var EXAM_SYSTEMS = [
    {
      id: 'general',
      label: 'General',
      shortLabel: 'general appearance',
      controls: [
        {
          id: 'appearance', label: 'Appearance', type: 'single', nad: 'well',
          options: [
            ok('well', 'Looks well', 'looks well'),
            ab('mild', 'Mildly unwell', 'looks mildly unwell'),
            ab('unwell', 'Unwell', 'looks unwell')
          ]
        },
        {
          id: 'colour', label: 'Colour', type: 'single', guide: 'indicator', nad: 'pink',
          options: [
            ok('pink', 'Pink', 'pink'),
            ab('pale', 'Pale', 'pale'),
            ab('plethoric', 'Plethoric', 'plethoric'),
            ab('mottled', 'Mottled', 'mottled'),
            ab('peripheral', 'Peripheral cyanosis', 'peripherally cyanosed'),
            ab('central', 'Central cyanosis', 'centrally cyanosed', { factor: 'hypoxia' })
          ]
        },
        {
          id: 'behaviour', label: 'Behaviour', type: 'single', guide: 'indicator', nad: 'alert',
          options: [
            ok('alert', 'Alert and active', 'alert and active'),
            ok('settled', 'Settled', 'settled'),
            ok('sleepy', 'Sleepy but rousable', 'sleepy but rousable'),
            ab('irritable', 'Irritable', 'irritable', { factor: 'altered-behaviour' }),
            ab('lethargic', 'Lethargic', 'lethargic', { factor: 'altered-behaviour' }),
            ab('inconsolable', 'Inconsolable', 'inconsolable', { factor: 'altered-behaviour' })
          ]
        },
        {
          id: 'cry', label: 'Cry', type: 'single', nad: 'normal',
          options: [
            ok('normal', 'Normal', 'normal cry'),
            ab('high', 'High-pitched', 'high-pitched cry'),
            ab('weak', 'Weak', 'weak cry')
          ]
        },
        {
          id: 'mucosa', label: 'Mucous membranes', type: 'single', nad: 'moist',
          options: [
            ok('moist', 'Moist', 'MMM'),
            ab('dry', 'Dry', 'dry mucous membranes')
          ]
        },
        {
          id: 'dysmorphism', label: 'Dysmorphic features', type: 'yn', sentence: 1, nad: 'no',
          options: [
            ab('yes', 'Yes', 'dysmorphic features', { detail: 'dysmorphismDetail' }),
            ok('no', 'No', 'no dysmorphic features')
          ]
        },
        {
          id: 'dysmorphismDetail', label: 'Describe', type: 'text', sub: true, detailOnly: true,
          showIf: { control: 'dysmorphism', values: ['yes'] }
        }
      ]
    },
    {
      id: 'head',
      label: 'Head and face',
      shortLabel: 'head and face',
      controls: [
        {
          id: 'fontanelle', label: 'Anterior fontanelle', type: 'single', nad: 'soft',
          options: [
            ok('soft', 'Soft and flat', 'AF soft and flat'),
            ab('full', 'Full', 'AF full'),
            ab('bulging', 'Bulging', 'AF bulging'),
            ab('sunken', 'Sunken', 'AF sunken')
          ]
        },
        {
          id: 'sutures', label: 'Sutures', type: 'single', nad: 'normal',
          options: [
            ok('normal', 'Normal', 'sutures normal'),
            ab('overriding', 'Overriding', 'overriding sutures'),
            ab('widened', 'Widened', 'widened sutures')
          ]
        },
        {
          id: 'scalp', label: 'Scalp', type: 'multi', nad: 'none',
          options: [
            ok('none', 'No swelling', 'no scalp swelling', { exclusive: true }),
            ab('caput', 'Caput', 'caput succedaneum'),
            ab('cephalhaematoma', 'Cephalhaematoma', 'cephalhaematoma'),
            ab('subgaleal', 'Subgaleal swelling', 'subgaleal swelling'),
            ab('chignon', 'Chignon', 'chignon'),
            ab('marks', 'Instrument marks', 'instrument marks')
          ]
        },
        {
          id: 'eyes', label: 'Eyes', type: 'multi', sentence: 1,
          options: [
            ok('normal', 'Normal', 'eyes normal', { exclusive: true }),
            ab('sticky', 'Sticky', 'sticky eyes'),
            ab('swollen', 'Red, swollen lids', 'red, swollen eyelids'),
            ab('subconjunctival', 'Subconjunctival haemorrhage', 'subconjunctival haemorrhage')
          ]
        },
        {
          id: 'face', label: 'Face', type: 'single', sentence: 1,
          options: [
            ok('symmetrical', 'Symmetrical', 'face symmetrical'),
            ab('asymmetrical', 'Asymmetrical', 'facial asymmetry')
          ]
        },
        {
          id: 'palate', label: 'Palate', type: 'single', sentence: 1, nad: 'intact',
          options: [
            ok('intact', 'Intact', 'palate intact'),
            ab('cleft-lip', 'Cleft lip', 'cleft lip'),
            ab('cleft-palate', 'Cleft palate', 'cleft palate'),
            ab('cleft-both', 'Cleft lip and palate', 'cleft lip and palate')
          ]
        },
        {
          id: 'tongueTie', label: 'Tongue tie', type: 'yn', sentence: 1,
          options: [
            ab('yes', 'Yes', 'tongue tie'),
            ok('no', 'No', 'no tongue tie')
          ]
        }
      ]
    },
    {
      id: 'respiratory',
      label: 'Respiratory',
      shortLabel: 'respiratory',
      controls: [
        {
          id: 'wob', label: 'Work of breathing', type: 'single', guide: 'indicator', nad: 'none',
          options: [
            ok('none', 'Normal', 'no increased WOB'),
            ab('mild', 'Mildly increased', 'mildly increased WOB', { factor: 'resp-distress' }),
            ab('moderate', 'Moderately increased', 'moderately increased WOB', { factor: 'resp-distress' }),
            ab('severe', 'Severely increased', 'severely increased WOB', { factor: 'resp-distress' })
          ]
        },
        {
          id: 'effortSigns', label: 'Signs', type: 'multi', sub: true,
          showIf: { control: 'wob', values: RESP_EFFORT },
          options: [
            ab('subcostal', 'Subcostal recession', 'subcostal recession'),
            ab('intercostal', 'Intercostal recession', 'intercostal recession'),
            ab('sternal', 'Sternal recession', 'sternal recession'),
            ab('tug', 'Tracheal tug', 'tracheal tug'),
            ab('flaring', 'Nasal flaring', 'nasal flaring'),
            ab('bobbing', 'Head bobbing', 'head bobbing')
          ]
        },
        {
          id: 'grunting', label: 'Grunting', type: 'yn', guide: 'indicator', nad: 'no',
          options: [
            ab('yes', 'Yes', 'grunting', { factor: 'resp-distress' }),
            ok('no', 'No', 'no grunting')
          ]
        },
        {
          id: 'airway', label: 'Upper airway noise', type: 'multi',
          options: [
            ok('none', 'None', 'no stridor or stertor', { exclusive: true }),
            ab('stridor', 'Stridor', 'stridor'),
            ab('stertor', 'Stertor', 'stertor'),
            ab('secretions', 'Secretions', 'audible upper airway secretions')
          ]
        },
        {
          id: 'expansion', label: 'Chest expansion', type: 'single', sentence: 1, nad: 'good',
          options: [
            ok('good', 'Good, symmetrical', 'good symmetrical chest expansion'),
            ab('reduced', 'Reduced', 'reduced chest expansion'),
            ab('asymmetrical', 'Asymmetrical', 'asymmetrical chest expansion')
          ]
        },
        {
          id: 'auscultation', label: 'Auscultation', type: 'single', sentence: 1, nad: 'clear',
          options: [
            ok('clear', 'Clear, equal AE', 'chest clear with equal AE'),
            ab('abnormal', 'Abnormal', 'abnormal breath sounds', { detail: 'addedSounds', detailStyle: 'replace' })
          ]
        },
        {
          id: 'addedSounds', label: 'Findings', type: 'multi', sub: true, detailOnly: true,
          showIf: { control: 'auscultation', values: ['abnormal'] },
          options: [
            ab('crackles', 'Crackles', 'crackles'),
            ab('wheeze', 'Wheeze', 'wheeze'),
            ab('bronchial', 'Bronchial breathing', 'bronchial breathing'),
            ab('reduced-left', 'Reduced AE left', 'reduced AE on left'),
            ab('reduced-right', 'Reduced AE right', 'reduced AE on right')
          ]
        },
        {
          id: 'apnoea', label: 'Apnoea witnessed', type: 'yn', guide: 'red', sentence: 2,
          options: [
            ab('yes', 'Yes', 'apnoea witnessed', { factor: 'apnoea' }),
            ok('no', 'No', 'no apnoea witnessed')
          ]
        }
      ]
    },
    {
      id: 'cardiovascular',
      label: 'Cardiovascular',
      shortLabel: 'cardiovascular',
      controls: [
        {
          id: 'sounds', label: 'Heart sounds', type: 'single', nad: 'normal',
          options: [
            ok('normal', 'I+II+0', 'HS I+II+0'),
            ab('murmur', 'Murmur', '', { compose: 'murmur' })
          ]
        },
        {
          id: 'murmurTiming', label: 'Timing', type: 'single', sub: true, panel: 'murmur', detailOnly: true,
          showIf: { control: 'sounds', values: ['murmur'] },
          options: [
            ab('ejection', 'Ejection systolic', 'ESM'),
            ab('pansystolic', 'Pansystolic', 'PSM'),
            ab('continuous', 'Continuous', 'continuous murmur'),
            ab('diastolic', 'Diastolic', 'diastolic murmur')
          ]
        },
        {
          id: 'murmurGrade', label: 'Grade (/6)', type: 'single', sub: true, panel: 'murmur', tight: true, detailOnly: true,
          showIf: { control: 'sounds', values: ['murmur'] },
          options: [opt('1', '1'), opt('2', '2'), opt('3', '3'), opt('4', '4'), opt('5', '5'), opt('6', '6')]
        },
        {
          id: 'murmurCharacter', label: 'Character', type: 'multi', sub: true, panel: 'murmur', detailOnly: true,
          showIf: { control: 'sounds', values: ['murmur'] },
          options: [
            opt('soft', 'Soft', { prose: 'soft' }),
            opt('harsh', 'Harsh', { prose: 'harsh' }),
            opt('blowing', 'Blowing', { prose: 'blowing' }),
            opt('machinery', 'Machinery', { prose: 'machinery' })
          ]
        },
        {
          id: 'murmurLocation', label: 'Loudest at', type: 'multi', sub: true, panel: 'murmur', detailOnly: true,
          showIf: { control: 'sounds', values: ['murmur'] },
          options: [
            opt('ulse', 'ULSE', { prose: 'ULSE' }),
            opt('urse', 'URSE', { prose: 'URSE' }),
            opt('llse', 'LLSE', { prose: 'LLSE' }),
            opt('apex', 'Apex', { prose: 'apex' })
          ]
        },
        {
          id: 'murmurRadiation', label: 'Radiation', type: 'multi', sub: true, panel: 'murmur', detailOnly: true,
          showIf: { control: 'sounds', values: ['murmur'] },
          options: [
            opt('none', 'None', { prose: 'none', exclusive: true }),
            opt('axilla', 'Axilla', { prose: 'axilla' }),
            opt('back', 'Back', { prose: 'back' }),
            opt('carotids', 'Carotids', { prose: 'carotids' })
          ]
        },
        {
          id: 'brachials', label: 'Brachial pulses', type: 'single', sentence: 1, nad: 'palpable',
          options: [
            ok('palpable', 'Palpable', 'brachials palpable'),
            ab('weak', 'Weak', 'brachials weak'),
            ab('absent', 'Absent', 'brachials absent')
          ]
        },
        {
          id: 'femorals', label: 'Femoral pulses', type: 'single', sentence: 1, nad: 'palpable',
          options: [
            ok('palpable', 'Palpable', 'femorals palpable'),
            ab('weak', 'Weak', 'femorals weak'),
            ab('absent', 'Absent', 'femorals absent')
          ]
        },
        {
          id: 'crt', label: 'Central CRT', type: 'single', tight: true, sentence: 1, nad: '<2',
          options: [
            ok('<2', '<2s', 'CRT <2s'),
            ab('2-3', '2-3s', 'CRT 2-3s'),
            ab('>3', '>3s', 'CRT >3s')
          ]
        },
        {
          id: 'peripheries', label: 'Peripheries', type: 'single', sentence: 1, nad: 'warm',
          options: [
            ok('warm', 'Warm', 'warm peripheries'),
            ab('cool', 'Cool', 'cool peripheries'),
            ab('cold', 'Cold', 'cold peripheries')
          ]
        },
        {
          id: 'oedema', label: 'Oedema', type: 'yn', sentence: 2,
          options: [
            ab('yes', 'Yes', 'oedema'),
            ok('no', 'No', 'no oedema')
          ]
        },
        {
          id: 'shock', label: 'Signs of shock', type: 'yn', guide: 'red', sentence: 2,
          options: [
            ab('yes', 'Yes', 'signs of shock', { factor: 'shock' }),
            ok('no', 'No', 'no signs of shock')
          ]
        }
      ]
    },
    {
      id: 'abdomen',
      label: 'Abdomen',
      shortLabel: 'abdomen',
      lead: 'Abdomen',
      controls: [
        {
          id: 'palpation', label: 'Palpation', type: 'single', nad: 'soft',
          options: [
            ok('soft', 'Soft', 'soft', { lead: true }),
            ab('firm', 'Firm', 'firm', { lead: true }),
            ab('tense', 'Tense', 'tense', { lead: true })
          ]
        },
        {
          id: 'tenderness', label: 'Tender', type: 'yn', nad: 'no',
          options: [
            ab('yes', 'Yes', 'tender', { lead: true }),
            ok('no', 'No', 'non-tender', { lead: true })
          ]
        },
        {
          id: 'distension', label: 'Distended', type: 'yn', guide: 'indicator', nad: 'no',
          options: [
            ab('yes', 'Yes', 'distended', { lead: true, factor: 'feed-intolerance' }),
            ok('no', 'No', 'non-distended', { lead: true })
          ]
        },
        {
          id: 'masses', label: 'Organomegaly or masses', type: 'multi', nad: 'none',
          options: [
            ok('none', 'None', 'no organomegaly or masses', { exclusive: true }),
            ab('liver', 'Hepatomegaly', 'hepatomegaly'),
            ab('spleen', 'Splenomegaly', 'splenomegaly'),
            ab('mass', 'Mass', 'palpable mass')
          ]
        },
        {
          id: 'bowelSounds', label: 'Bowel sounds', type: 'single',
          options: [
            ok('present', 'Present', 'bowel sounds present'),
            ab('absent', 'Absent', 'bowel sounds absent')
          ]
        },
        {
          id: 'cord', label: 'Umbilicus', type: 'multi', sentence: 1, nad: 'clean',
          options: [
            ok('clean', 'Clean and dry', 'cord clean and dry', { exclusive: true }),
            ab('flare', 'Periumbilical flare', 'periumbilical flare'),
            ab('discharge', 'Discharge', 'umbilical discharge'),
            ab('bleeding', 'Bleeding', 'umbilical bleeding'),
            ab('hernia', 'Umbilical hernia', 'umbilical hernia')
          ]
        }
      ]
    },
    {
      id: 'genitalia',
      label: 'Genitalia and anus',
      shortLabel: 'genitalia and anus',
      controls: [
        {
          id: 'genitalia', label: 'Genitalia', type: 'single', nad: 'normal',
          options: [
            ok('normal', 'Normal', 'normal genitalia', {
              proseBySex: { male: 'normal male genitalia', female: 'normal female genitalia' }
            }),
            ab('abnormal', 'Abnormal', 'abnormal genitalia', { detail: 'genitaliaDetail', detailStyle: 'replace' })
          ]
        },
        {
          id: 'genitaliaDetail', label: 'Describe', type: 'text', sub: true, detailOnly: true,
          showIf: { control: 'genitalia', values: ['abnormal'] }
        },
        {
          id: 'testes', label: 'Testes', type: 'single', sexes: MALE_OR_UNRECORDED, nad: 'descended', nadSexes: ['male'],
          options: [
            ok('descended', 'Descended bilaterally', 'testes descended bilaterally'),
            ab('left', 'Left undescended', 'left testis undescended'),
            ab('right', 'Right undescended', 'right testis undescended'),
            ab('both', 'Both undescended', 'bilateral undescended testes')
          ]
        },
        {
          id: 'anus', label: 'Anus', type: 'single', nad: 'patent',
          options: [
            ok('patent', 'Patent', 'anus patent'),
            ab('anterior', 'Anteriorly placed', 'anteriorly placed anus'),
            ab('not', 'Not patent', 'anus not patent')
          ]
        }
      ]
    },
    {
      id: 'neurology',
      label: 'Neurology',
      shortLabel: 'neurology',
      controls: [
        {
          id: 'tone', label: 'Tone', type: 'single', guide: 'indicator', nad: 'normal',
          options: [
            ok('normal', 'Normal', 'normal tone'),
            ab('low', 'Hypotonia', 'hypotonia', { factor: 'altered-tone' }),
            ab('high', 'Hypertonia', 'hypertonia', { factor: 'altered-tone' })
          ]
        },
        {
          id: 'movements', label: 'Movements', type: 'single', nad: 'normal',
          options: [
            ok('normal', 'Normal', 'no abnormal movements'),
            ab('jittery', 'Jittery, stops with restraint', 'jittery, stops with gentle restraint'),
            ab('abnormal', 'Abnormal', 'abnormal movements', { detail: 'movementsDetail' })
          ]
        },
        {
          id: 'movementsDetail', label: 'Describe', type: 'text', sub: true, detailOnly: true,
          showIf: { control: 'movements', values: ['abnormal'] }
        },
        {
          id: 'moro', heading: 'Primitive reflexes', label: 'Moro', type: 'single', sentence: 1, nad: 'present',
          options: [
            ok('present', 'Present', 'Moro present'),
            ab('asymmetrical', 'Asymmetrical', 'asymmetrical Moro'),
            ab('absent', 'Absent', 'Moro absent')
          ]
        },
        {
          id: 'grasp', label: 'Grasp', type: 'single', sentence: 1, nad: 'present',
          options: [
            ok('present', 'Present', 'grasp present'),
            ab('weak', 'Weak', 'grasp weak'),
            ab('absent', 'Absent', 'grasp absent')
          ]
        },
        {
          id: 'suck', label: 'Suck', type: 'single', sentence: 1, nad: 'present',
          options: [
            ok('present', 'Present', 'suck present'),
            ab('weak', 'Weak', 'suck weak'),
            ab('uncoordinated', 'Uncoordinated', 'uncoordinated suck'),
            ab('absent', 'Absent', 'suck absent')
          ]
        }
      ]
    },
    {
      id: 'skin',
      label: 'Skin',
      shortLabel: 'skin',
      controls: [
        {
          id: 'jaundice', label: 'Jaundice', type: 'single', nad: 'none',
          options: [
            ok('none', 'None', 'not jaundiced'),
            ab('face', 'To face', 'jaundiced to face'),
            ab('trunk', 'To trunk', 'jaundiced to trunk'),
            ab('limbs', 'To limbs', 'jaundiced to limbs'),
            ab('palms', 'To palms and soles', 'jaundiced to palms and soles')
          ]
        },
        {
          id: 'rash', label: 'Rash', type: 'multi', nad: 'none',
          options: [
            ok('none', 'None', 'no rash', { exclusive: true }),
            ab('etn', 'Erythema toxicum', 'erythema toxicum'),
            ab('milia', 'Milia', 'milia'),
            ab('pustules', 'Pustules', 'pustules'),
            ab('vesicles', 'Vesicles', 'vesicles'),
            ab('petechiae', 'Petechiae', 'petechiae'),
            ab('other', 'Other', 'rash', { detail: 'rashDetail', detailStyle: 'replace' })
          ]
        },
        {
          id: 'rashDetail', label: 'Describe rash', type: 'text', sub: true, detailOnly: true,
          showIf: { control: 'rash', values: ['other'] }
        },
        {
          id: 'bruising', label: 'Bruising', type: 'yn', nad: 'no',
          options: [
            ab('yes', 'Yes', 'bruising', { detail: 'bruisingDetail' }),
            ok('no', 'No', 'no bruising')
          ]
        },
        {
          id: 'bruisingDetail', label: 'Where', type: 'text', sub: true, detailOnly: true,
          showIf: { control: 'bruising', values: ['yes'] }
        },
        {
          id: 'birthmarks', label: 'Birthmarks', type: 'yn', sentence: 1,
          options: [
            ab('yes', 'Yes', 'birthmarks', { detail: 'birthmarksDetail' }),
            ok('no', 'No', 'no birthmarks')
          ]
        },
        {
          id: 'birthmarksDetail', label: 'Describe', type: 'text', sub: true, detailOnly: true,
          showIf: { control: 'birthmarks', values: ['yes'] }
        }
      ]
    },
    {
      id: 'limbs',
      label: 'Limbs and spine',
      shortLabel: 'limbs and spine',
      controls: [
        {
          id: 'limbMovement', label: 'Limb movements', type: 'single', nad: 'symmetrical',
          options: [
            ok('symmetrical', 'Symmetrical', 'moving all limbs symmetrically'),
            ab('reduced', 'Reduced', 'reduced movement', { detail: 'reducedLimbs', detailJoin: ' of ' })
          ]
        },
        {
          id: 'reducedLimbs', label: 'Which limb', type: 'multi', sub: true, detailOnly: true,
          showIf: { control: 'limbMovement', values: ['reduced'] },
          options: [
            ab('left-arm', 'Left arm', 'left arm'),
            ab('right-arm', 'Right arm', 'right arm'),
            ab('left-leg', 'Left leg', 'left leg'),
            ab('right-leg', 'Right leg', 'right leg')
          ]
        },
        {
          id: 'clavicles', label: 'Clavicles', type: 'single', nad: 'intact',
          options: [
            ok('intact', 'Intact', 'clavicles intact'),
            ab('left', 'Left swelling or crepitus', 'left clavicular swelling or crepitus'),
            ab('right', 'Right swelling or crepitus', 'right clavicular swelling or crepitus')
          ]
        },
        {
          id: 'spine', label: 'Spine', type: 'single', nad: 'intact',
          options: [
            ok('intact', 'Intact', 'spine intact'),
            ab('dimple', 'Sacral dimple', 'sacral dimple'),
            ab('other', 'Other', 'spinal abnormality', { detail: 'spineDetail', detailStyle: 'replace' })
          ]
        },
        {
          id: 'spineDetail', label: 'Describe', type: 'text', sub: true, detailOnly: true,
          showIf: { control: 'spine', values: ['other'] }
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
