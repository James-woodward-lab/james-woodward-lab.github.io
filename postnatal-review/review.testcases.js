/*
 * Safety checks for postnatal review as a documentation aid only.
 * Confirms no observation inference, gestation classification, risk counting,
 * threshold statements, or management recommendations are generated.
 * Run: node postnatal-review/review.testcases.js
 */
'use strict';

var assert = require('assert');
var review = require('./review.js');

function sample() {
  return {
    place: 'postnatal',
    gestationAtBirth: '39+2',
    ageMode: 'manual',
    ageHours: '18',
    modeOfBirth: 'svd',
    romHours: '26',
    answers: {
      'rom-term-24': 'yes',
      'gbs-maternal': 'yes',
      chorio: 'no',
      'maternal-sepsis': 'no',
      fever: 'no'
    },
    feedMode: 'breast',
    latch: 'good',
    feedFrequency: 'every 2 to 3 hours',
    multi: { feedProblems: ['none'] },
    stools: 'meconium',
    urine: 'passed',
    parentalConcern: 'none',
    reasons: ['sepsis'],
    exam: {
      general: { status: 'nad', note: '', choices: {} },
      respiratory: { status: 'nad', note: '', choices: {} },
      cardiovascular: { status: 'nad', note: '', choices: {} },
      neurology: { status: 'nad', note: '', choices: {} },
      skin: { status: 'not', note: '', choices: {} }
    },
    obs: { temp: '36.8', hr: '138', rr: '48', sats: '99', oxygen: 'air', fio2: '' },
    glucoses: [{ time: '16:00', value: '3.4', method: 'gas' }],
    bilirubin: { kind: 'none', value: '', ageHours: '', plot: '' },
    impression: 'Well baby.',
    plan: 'Remain with mother on the postnatal ward.',
    antibiotics: 'none'
  };
}

var boxes = review.buildBoxes(sample());

var reviewLines = boxes.review.split('\n');
assert.strictEqual(reviewLines[0], 'Infant born at 39+2 weeks by SVD, now 18 hours old. Reviewed for infection risk.', 'the review opens with the baby and the reason for review');
assert.strictEqual(boxes.review.indexOf('Gestation at birth'), -1, 'Gestation at birth wording is removed');
assert.strictEqual(reviewLines[1], 'No parental concern.', 'concern follows the opening');
assert.strictEqual(reviewLines[2], 'ROM 26 hours before birth.', 'labour follows the presenting history');
assert.strictEqual(reviewLines[3], 'NICE risk factors: maternal GBS colonisation, bacteriuria or infection this pregnancy; confirmed ROM >24 hours before term birth.', 'NICE risk factors follow labour, named once');
assert.strictEqual(reviewLines[4], 'Breastfeeding every 2 to 3 hours, effective latch, no vomiting or feed refusal. Meconium passed, urine passed.', 'feeding and output share the since-birth line');
assert.strictEqual(reviewLines[5], 'Glucose 3.4 mmol/L at 16:00 (blood gas). No bilirubin sent.', 'results close the review');
assert.strictEqual(boxes.review.indexOf('BG:'), -1, 'no BG tag');
assert.strictEqual(boxes.review.indexOf('documented'), -1, 'no repeated documented wording');
assert.strictEqual(boxes.review.indexOf('fever'), -1, 'a No to intrapartum fever is not written');
assert.ok(boxes.review.indexOf('Glucose 3.4') !== -1, 'glucose is transcribed without a band');
assert.strictEqual(boxes.review.indexOf('under 1.0'), -1, 'glucose bands are not generated');
assert.strictEqual(boxes.review.indexOf('2.0 mmol/L or more'), -1, 'glucose categories are not generated');
assert.strictEqual(boxes.review.indexOf('red flag'), -1, 'red-flag language is not generated');
assert.strictEqual(boxes.review.indexOf('risk factors selected'), -1, 'risk counts are not generated');
assert.strictEqual(boxes.review.indexOf('meets NICE threshold'), -1, 'threshold statements are not generated');
assert.strictEqual(boxes.discussion.indexOf('single NICE'), -1, 'discussion does not summarise NICE counts');
assert.strictEqual(boxes.discussion.indexOf('Abnormal findings'), -1, 'discussion does not auto-classify the exam');
assert.strictEqual(boxes.discussion.indexOf('Examination normal'), -1, 'discussion does not invent normality');
assert.ok(boxes.discussion.indexOf('Impression: Well baby.') !== -1, 'clinician impression is transcribed');
assert.ok(boxes.discussion.indexOf('No antibiotics.') !== -1, 'antibiotic choice is transcribed');
assert.strictEqual(boxes.redCount, 0, 'sample has no red flags');
assert.strictEqual(boxes.otherCount, 2, 'GBS and term rupture count as two other factors');
assert.ok(!('framework' in boxes), 'framework management sentence is not returned');

assert.ok(boxes.examination.indexOf('postnatal ward') !== -1, 'place is in the examination');
assert.ok(boxes.examination.indexOf('Temp 36.8\u00B0C, HR 138, RR 48, SpO2 99% in air.') !== -1, 'observations are transcribed as entered on one line');
assert.ok(boxes.examination.indexOf('Not examined: skin.') !== -1, 'skipped systems are written');
assert.strictEqual(boxes.examination.indexOf('pyrexial'), -1, 'observation adjectives are not invented');
assert.strictEqual(boxes.examination.indexOf('tachycardic'), -1, 'observation adjectives are not invented');
assert.strictEqual(boxes.examination.indexOf('temperature abnormality'), -1, 'observation risk labels are not invented');

var hot = review.buildBoxes({
  obs: { temp: '38.4', hr: '175', rr: '72', sats: '88', oxygen: 'oxygen', fio2: '40' }
});
assert.ok(hot.examination.indexOf('Temp 38.4') !== -1, 'hot temperature is transcribed');
assert.ok(hot.examination.indexOf('HR 175') !== -1, 'high heart rate is transcribed');
assert.ok(hot.examination.indexOf('RR 72') !== -1, 'high respiratory rate is transcribed');
assert.strictEqual(hot.redCount, 0, 'abnormal observations do not create red flags');
assert.strictEqual(hot.otherCount, 0, 'abnormal observations do not create other factors');
assert.strictEqual(hot.examination.indexOf('NICE'), -1, 'observations alone do not create NICE labels');
assert.strictEqual(hot.review.indexOf('NICE'), -1, 'observations alone do not create NICE labels in the review');

var lowGlucose = review.buildBoxes({ glucoses: [{ value: '1.4', time: '', method: 'gas' }] });
assert.ok(lowGlucose.review.indexOf('Glucose 1.4 mmol/L') !== -1, 'low glucose is transcribed');
assert.strictEqual(lowGlucose.otherCount, 0, 'glucose values do not become clinical indicators');
assert.strictEqual(lowGlucose.review.indexOf('NICE'), -1, 'glucose values do not create NICE labels');

var acid = review.buildBoxes({ gas: { be: '12' } });
assert.ok(acid.review.indexOf('Blood gas BD 12.') !== -1, 'base deficit is transcribed');
assert.strictEqual(acid.otherCount, 0, 'gas values do not create acidosis factors');
assert.strictEqual(acid.review.indexOf('NICE'), -1, 'gas values do not create NICE labels');
assert.strictEqual(review.buildBoxes({ answers: { 'metabolic-acidosis': 'yes' } }).otherCount, 1, 'explicit metabolic acidosis counts as one indicator');
assert.ok(review.buildBoxes({ answers: { 'metabolic-acidosis': 'yes' } }).review.indexOf('NICE clinical indicators: metabolic acidosis (base deficit 10 mmol/L or more).') !== -1, 'explicit metabolic acidosis uses the NICE label');

var noGestationCalc = review.buildBoxes({ gestationAtBirth: '35+0' });
assert.ok(noGestationCalc.review.indexOf('Infant born at 35+0 weeks.') !== -1, 'preterm-looking free text is transcribed without a label');
assert.ok(review.buildBoxes({ gestationAtBirth: 'term' }).review.indexOf('Infant born at term.') !== -1, 'worded gestation is kept as typed');
assert.strictEqual(noGestationCalc.review.indexOf('Preterm baby'), -1, 'gestation free text does not classify prematurity');
assert.strictEqual(noGestationCalc.otherCount, 0, 'gestation free text does not invent the preterm labour finding');
assert.strictEqual(typeof review.isPreterm, 'undefined', 'isPreterm is removed');
assert.strictEqual(typeof review.romSuggestion, 'undefined', 'romSuggestion is removed');

assert.strictEqual(review.buildBoxes({ answers: { cpr: 'yes' } }).redCount, 1, 'explicit CPR counts as one red flag');
assert.strictEqual(review.buildBoxes({ answers: { 'gbs-maternal': 'yes', 'gbs-previous': 'yes' } }).otherCount, 1, 'the two GBS questions count as one factor');
assert.strictEqual(review.buildBoxes({
  answers: { 'spontaneous-preterm': 'yes', chorio: 'yes' }
}).otherCount, 2, 'two ordinary factors count separately');
assert.ok(review.buildBoxes({
  exam: { respiratory: { status: '', note: '', choices: { grunting: 'yes' } } }
}).factors.some(function (factor) { return factor.id === 'resp-distress'; }), 'explicit grunting counts as respiratory distress');
assert.strictEqual(review.buildBoxes({
  exam: { respiratory: { status: 'nad', note: '', choices: { grunting: 'yes' } } }
}).otherCount, 0, 'choices left under NAD do not count');

var migrated = review.normalize({ gestationWeeks: '39', gestationDays: '2' });
assert.strictEqual(migrated.gestationAtBirth, '39+2', 'old numeric drafts migrate to free text');
assert.strictEqual(migrated.gestationWeeks, undefined, 'numeric weeks are not kept as active state');

var pretermButton = review.buildBoxes({ answers: { 'spontaneous-preterm': 'yes' } });
assert.strictEqual(pretermButton.review, 'NICE risk factors: preterm birth after spontaneous labour.', 'explicit preterm button is written once under its NICE category');

var unsetNice = review.buildBoxes({ answers: { 'gbs-maternal': 'no' } });
assert.strictEqual(unsetNice.review.indexOf('NICE'), -1, 'a No answer does not create a NICE label');
assert.strictEqual(unsetNice.review.indexOf('No maternal GBS'), -1, 'negative findings are not auto-generated from No');

var sibling = review.buildBoxes({ answers: { 'sibling-infection': 'yes' } });
assert.ok(sibling.review.indexOf('NICE red flag: suspected or confirmed infection in another baby of this multiple pregnancy.') !== -1, 'sibling infection NICE red-flag label follows an explicit yes');
assert.strictEqual(sibling.redCount, 1, 'sibling infection counts as one red-flag risk factor');

var cpr = review.buildBoxes({ answers: { cpr: 'yes' } });
assert.ok(cpr.review.indexOf('NICE red flags: needed CPR.') !== -1, 'CPR uses the red-flag documentation label');
assert.ok(review.buildBoxes({ answers: { thrombocytopenia: 'yes' } }).review.indexOf('NICE clinical indicators: thrombocytopenia.') !== -1, 'thrombocytopenia uses the clinical-indicator label');

var jaundiceYoung = review.buildBoxes({
  ageMode: 'manual',
  ageHours: '10',
  exam: { skin: { status: '', note: '', choices: { jaundice: 'face' } } }
});
assert.ok(jaundiceYoung.examination.indexOf('Jaundiced to face.') !== -1, 'jaundice finding is transcribed');
assert.strictEqual(jaundiceYoung.review.indexOf('within 24 hours'), -1, 'age plus jaundice does not create a clinical indicator');
assert.ok(review.buildBoxes({ answers: { 'jaundice-24h': 'yes' }, jaundiceNoticedHours: '14' }).review.indexOf('NICE clinical indicators: jaundice within 24 hours of birth (noticed at 14 hours).') !== -1, 'explicit jaundice within 24 hours uses the NICE label');
assert.ok(review.buildBoxes({ answers: { pphn: 'yes' } }).review.indexOf('NICE clinical indicators: PPHN.') !== -1, 'PPHN is transcribed when selected');
assert.ok(review.buildBoxes({ answers: { encephalopathy: 'yes' } }).review.indexOf('NICE clinical indicators: signs of neonatal encephalopathy.') !== -1, 'encephalopathy is transcribed when selected');
assert.strictEqual(review.buildBoxes({ obs: { hr: '180', temp: '38.4' } }).otherCount, 0, 'heart rate and temperature values do not become clinical indicators');
assert.strictEqual(jaundiceYoung.examination.indexOf('NICE'), -1, 'exam findings do not auto-tag NICE');

var abnormal = review.buildBoxes({
  place: 'labour',
  ageMode: 'manual',
  ageHours: '6',
  exam: {
    cardiovascular: { status: 'nad', note: '', choices: {} },
    respiratory: { status: '', note: '', choices: { grunting: 'yes' } },
    skin: { status: 'not', note: '', choices: {} }
  }
});
assert.ok(abnormal.examination.indexOf('\nGrunting.\n') !== -1, 'respiratory findings sit on their own line without a tag');
assert.strictEqual(abnormal.examination.indexOf('Respiratory:'), -1, 'no system tag is written');
assert.strictEqual(abnormal.examination.indexOf('Cardiovascular:'), -1, 'no system tag is written for NAD systems');
assert.ok(abnormal.examination.indexOf('HS I+II+0. Brachials and femorals palpable, CRT <2s, warm peripheries.') !== -1, 'cardiovascular NAD is concise');
assert.ok(abnormal.examination.indexOf('Grunting') < abnormal.examination.indexOf('HS I+II+0'), 'systems keep screen order');

var abdomen = review.buildBoxes({
  exam: {
    abdomen: {
      status: '',
      note: '',
      choices: { palpation: 'soft', tenderness: 'no', distension: 'no', masses: ['none'], cord: ['clean'] }
    }
  }
});
assert.ok(abdomen.examination.indexOf('Abdomen soft, non-tender, non-distended, no organomegaly or masses. Cord clean and dry.') !== -1, 'abdomen findings follow one Abdomen');
assert.strictEqual(abdomen.examination.indexOf('Abdomen soft.'), -1, 'abdomen findings are not written as separate Abdomen sentences');
assert.ok(review.buildBoxes({ exam: { abdomen: { status: '', note: '', choices: { masses: ['liver'] } } } }).examination === 'Hepatomegaly.', 'Abdomen only leads adjectives');

var withNote = review.buildBoxes({
  exam: {
    general: { status: 'nad', note: '', choices: {} },
    respiratory: { status: '', note: 'Louder on handling.', choices: { grunting: 'yes' } },
    cardiovascular: { status: '', note: 'Soft systolic murmur at the left sternal edge.', choices: { sounds: 'murmur' } }
  }
});
assert.ok(withNote.examination.indexOf('Grunting. Louder on handling.') !== -1, 'respiratory free text stays on the respiratory line');
assert.ok(withNote.examination.indexOf('HS I+II + murmur. Soft systolic murmur at the left sternal edge.') !== -1, 'cardiovascular free text stays on the cardiovascular line');
assert.ok(withNote.examination.indexOf('Grunting.') < withNote.examination.indexOf('HS I+II'), 'system order is preserved with free text');

var oxygen = review.buildBoxes({ obs: { sats: '92', oxygen: 'oxygen', fio2: '30' } });
assert.ok(oxygen.examination.indexOf('SpO2 92% in 30% O2') !== -1, 'oxygen requirement is transcribed');

var effort = review.buildBoxes({
  exam: { respiratory: { status: '', note: '', choices: { wob: 'moderate', effortSigns: ['subcostal', 'intercostal', 'flaring'], grunting: 'no', airway: ['none'] } } }
});
assert.ok(effort.examination.indexOf('Moderately increased WOB, subcostal and intercostal recession, nasal flaring, no grunting, stridor or stertor.') !== -1, 'work of breathing and effort signs are folded together');
assert.strictEqual(effort.examination.indexOf('NICE'), -1, 'exam findings do not auto-tag NICE');
assert.ok(review.buildBoxes({ exam: { respiratory: { status: '', note: '', choices: { wob: 'none', grunting: 'no' } } } }).examination.indexOf('No increased WOB or grunting.') !== -1, 'repeated "no" is folded');

assert.ok(!/start antibiotics/i.test(review.buildBoxes({ answers: { cpr: 'yes' } }).discussion), 'the note does not recommend starting antibiotics');
assert.ok(!/without waiting for results/i.test(review.buildBoxes({ answers: { cpr: 'yes', chorio: 'yes' } }).discussion), 'threshold management sentences are gone');
assert.ok(!/increased risk/i.test(review.buildBoxes({ answers: { cpr: 'yes' } }).all), 'increased-risk language is gone');

var kaiser = review.buildBoxes({
  shorter: true,
  kaiser: { well: '0.4 per 1000, routine care', equivocal: 'Blood culture.', unwell: '' }
});
assert.ok(kaiser.review.indexOf('Kaiser EOS calculator. Well appearing: 0.4 per 1000, routine care. Equivocal: Blood culture.') !== -1, 'filled Kaiser boxes are transcribed with their labels');
assert.strictEqual(kaiser.review.indexOf('Unwell appearing'), -1, 'an empty Kaiser box is left out');

var senior = review.buildBoxes({ antibiotics: 'senior', seniorDecision: 'observe for 12 hours', seniorOutcome: 'Registrar agrees with plan' });
assert.ok(senior.discussion.indexOf('Antibiotics discussed with senior. Senior decision: observe for 12 hours.') !== -1, 'senior decision follows the antibiotic choice');
assert.ok(senior.discussion.indexOf('Senior discussion outcome: Registrar agrees with plan.') !== -1, 'senior discussion outcome is written');

var numbered = review.buildBoxes({
  plan: 'Remain with mother on the postnatal ward.\nContinue observations and review if they change.',
  antibiotics: 'none',
  reviewWhen: '16:00'
});
assert.ok(numbered.discussion.indexOf('Plan:\n1. Remain with mother on the postnatal ward.\n2. Continue observations and review if they change.\n3. No antibiotics.\n4. Review at 16:00.') !== -1, 'multiple plan items are numbered on separate lines');
assert.ok(review.buildBoxes({ antibiotics: 'none' }).discussion.indexOf('Plan: No antibiotics.') !== -1, 'a single plan item stays on one line');

var perfusion = review.buildBoxes({
  exam: {
    cardiovascular: { status: '', note: '', choices: { crt: '>3', peripheries: 'cool', femorals: 'weak', brachials: 'palpable' } },
    general: { status: '', note: '', choices: { mucosa: 'dry' } },
    head: { status: '', note: '', choices: { fontanelle: 'sunken' } }
  }
});
assert.ok(perfusion.examination.indexOf('Brachials palpable, femorals weak, CRT >3s, cool peripheries.') !== -1, 'perfusion sits on the cardiovascular line');
assert.ok(perfusion.examination.indexOf('Dry mucous membranes.') !== -1, 'mucous membranes sit on the general line');
assert.ok(perfusion.examination.indexOf('AF sunken.') !== -1, 'fontanelle sits on the head line');

var auscultation = review.buildBoxes({
  exam: { respiratory: { status: '', note: '', choices: { auscultation: 'clear', expansion: 'good' } } }
});
assert.ok(auscultation.examination.indexOf('Good symmetrical chest expansion, chest clear with equal AE.') !== -1, 'expansion and auscultation share a sentence');

var added = review.buildBoxes({
  exam: { respiratory: { status: '', note: '', choices: { auscultation: 'abnormal', addedSounds: ['crackles', 'wheeze'] } } }
});
assert.ok(added.examination.indexOf('Crackles, wheeze.') !== -1, 'added sounds are listed');
assert.strictEqual(added.examination.indexOf('abnormal breath sounds'), -1, 'generic sentence is dropped once details are chosen');

var murmur = review.buildBoxes({
  exam: {
    cardiovascular: {
      status: '',
      note: '',
      choices: {
        sounds: 'murmur',
        murmurTiming: 'ejection',
        murmurGrade: '2',
        murmurLocation: ['llse'],
        murmurRadiation: ['axilla'],
        murmurCharacter: ['soft']
      }
    }
  }
});
assert.ok(murmur.examination.indexOf('HS I+II + grade 2/6 soft ESM at LLSE, radiating to axilla.') !== -1, 'murmur is written in standard shorthand');

var reflexes = review.buildBoxes({
  exam: { neurology: { status: '', note: '', choices: { tone: 'normal', movements: 'normal', moro: 'present', grasp: 'present', suck: 'present' } } }
});
assert.ok(reflexes.examination.indexOf('Normal tone, no abnormal movements. Moro, grasp and suck present.') !== -1, 'reflexes are folded into one sentence');

var extraNote = review.buildBoxes({
  exam: {
    general: { status: '', note: 'Handles well in the cot.', noteOpen: true, choices: { behaviour: 'alert', cry: 'normal' } }
  }
});
assert.ok(extraNote.examination.indexOf('Alert and active, normal cry. Handles well in the cot.') !== -1, 'other notes follow the system findings');

var allNad = {};
['general', 'head', 'respiratory', 'cardiovascular', 'abdomen', 'genitalia', 'neurology', 'skin', 'limbs'].forEach(function (id) {
  allNad[id] = { status: 'nad', note: '', choices: {} };
});
var male = review.buildBoxes({ sex: 'male', exam: allNad }).examination;
assert.ok(male.indexOf('Normal male genitalia, testes descended bilaterally, anus patent.') !== -1, 'male NAD names testes');
var female = review.buildBoxes({ sex: 'female', exam: allNad }).examination;
assert.ok(female.indexOf('Normal female genitalia, anus patent.') !== -1, 'female NAD leaves out testes');
assert.strictEqual(review.buildBoxes({ exam: allNad }).examination.indexOf('testes'), -1, 'testes are not claimed when sex is not recorded');
assert.strictEqual(male.split('\n').length, 9, 'each system is on its own line');
assert.strictEqual(/[A-Z][a-z]+( and [a-z]+)?: /.test(male), false, 'no system tags are written');
assert.ok(male.indexOf('Not jaundiced, no rash or bruising.') !== -1, 'skin NAD folds repeated words');
assert.ok(male.indexOf('Moving all limbs symmetrically, clavicles and spine intact.') !== -1, 'limbs NAD is concise');

var shortNote = review.buildBoxes({
  shorter: true,
  exam: { respiratory: { status: '', note: '', choices: { wob: 'none', grunting: 'yes' } }, skin: { status: 'nad', note: '', choices: {} } }
}).examination;
assert.strictEqual(shortNote, 'Grunting.', 'shorter note keeps only abnormal findings');

assert.deepStrictEqual(review.collectFactors({
  exam: { general: { status: '', note: '', choices: { colour: 'central', behaviour: 'lethargic' } } }
}).map(function (factor) { return factor.id; }).sort(), ['altered-behaviour', 'hypoxia'], 'explicit exam buttons still map to their NICE items');

var hours = review.ageInHours({ ageMode: 'times', birthAt: '2026-01-01T00:00', reviewAt: '2026-01-01T18:30' });
assert.ok(Math.abs(hours - 18.5) < 0.02, 'age from clock times is 18.5 hours');
assert.strictEqual(review.ageInHours({ ageMode: 'manual', ageDays: '1', ageHours: '6' }), 30, 'manual age adds days and hours');

var cleared = review.emptyState();
assert.strictEqual(cleared.gestationAtBirth, '', 'a new baby has no gestation text');
assert.strictEqual(cleared.impression, '', 'a new baby has no impression');

assert.ok(boxes.all.indexOf('Examination') !== -1 && boxes.all.indexOf('Discussion') !== -1 && boxes.all.indexOf('Review') !== -1, 'copy all names the three boxes');

var obsOtherState = sample();
obsOtherState.obs = { temp: '36.8', hr: '', rr: '', sats: '', oxygen: '', fio2: '' };
obsOtherState.obsOther = 'Pre- and post-ductal sats 98% and 99%';
var obsOtherBoxes = review.buildBoxes(obsOtherState);
assert.ok(obsOtherBoxes.examination.indexOf('Temp 36.8\u00B0C. Pre- and post-ductal sats 98% and 99%.') !== -1, 'other observations free text follows the observations');
var obsOnlyOther = sample();
obsOnlyOther.obsOther = 'Obs stable on chart';
assert.ok(review.buildBoxes(obsOnlyOther).examination.indexOf('Obs stable on chart.') !== -1, 'other observations text is written on its own');
assert.strictEqual(boxes.review.indexOf('Apgar'), -1, 'Apgars are no longer written');

var full = review.buildBoxes({
  sex: 'male',
  gestationAtBirth: '39+2',
  modeOfBirth: 'instrumental',
  centile: '9',
  ageMode: 'manual',
  ageHours: '18',
  reasons: ['sepsis', 'feeding'],
  historyNote: 'Sleepy overnight',
  parentalConcern: 'concerned',
  parentalWords: 'not waking for feeds',
  midwifeConcern: 'no',
  romHours: '20',
  iapTiming: '2 hours before birth',
  answers: { fever: 'yes', iap: 'given', meconium: 'yes', 'gbs-maternal': 'yes', idm: 'yes', apnoea: 'yes', 'feed-refusal': 'yes', topUps: 'yes' },
  feedMode: 'breast',
  feedDuration: '5 minutes',
  feedFrequency: 'every 3 hours',
  topUpAmount: '15',
  stools: 'meconium',
  stoolCount: '2',
  urine: 'passed',
  multi: { sinceBirth: ['jitteriness'] }
}).review.split('\n');
assert.deepStrictEqual(full, [
  'Male infant born at 39+2 weeks by instrumental delivery, birth weight 9th centile, now 18 hours old. Reviewed for infection risk and feeding.',
  'Sleepy overnight. Parents concerned: not waking for feeds. No midwife concern.',
  'ROM 20 hours before birth, maternal intrapartum pyrexia, intrapartum antibiotics given, first dose 2 hours before birth. Meconium-stained liquor.',
  'NICE risk factors: maternal GBS colonisation, bacteriuria or infection this pregnancy.',
  'Hypoglycaemia risk factors: maternal diabetes.',
  'Breastfeeding 5 minutes every 3 hours, top-ups 15 ml. Meconium passed x2, urine passed.',
  'NICE red flags: apnoea. NICE clinical indicators: feeding difficulties. Jitteriness since birth.'
], 'the review follows the clinical narrative order');
assert.strictEqual(review.buildBoxes({ stools: 'none', urine: 'not' }).review, 'No stool or urine passed since birth.', 'absent output is one sentence');
assert.strictEqual(review.buildBoxes({ parentalConcern: 'none', midwifeConcern: 'no' }).review, 'No parental or midwife concern.', 'explicit no-concern answers are folded');

console.log('postnatal review tests passed');
