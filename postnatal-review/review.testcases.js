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

assert.ok(boxes.review.indexOf('39+2, born by normal vaginal birth, now 18 hours old.') !== -1, 'gestation and delivery lead the review without a Gestation at birth label');
assert.strictEqual(boxes.review.indexOf('Gestation at birth'), -1, 'Gestation at birth wording is removed');
assert.ok(boxes.review.indexOf('Reason for review: infection history.') !== -1, 'reason for review is written');
assert.ok(boxes.review.indexOf('39+2') < boxes.review.indexOf('Reason for review:'), 'reason follows gestation and delivery');
assert.ok(boxes.review.indexOf('Reason for review:') < boxes.review.indexOf('BG:'), 'BG follows the reason for review');
assert.ok(boxes.review.indexOf('BG: Membranes ruptured for 26 hours.') !== -1, 'background features are prefixed with BG');
assert.ok(boxes.review.indexOf('Meconium passed') !== -1, 'stools are in the review');
assert.ok(boxes.review.indexOf('Urine passed') !== -1, 'urine is in the review');
assert.ok(boxes.review.indexOf('No parental concern') !== -1, 'explicit parental concern is transcribed');
assert.ok(boxes.review.indexOf('breastfeeds') !== -1, 'feeding is in the review');
assert.ok(boxes.review.indexOf('Glucose 3.4') !== -1, 'glucose is transcribed without a band');
assert.strictEqual(boxes.review.indexOf('under 1.0'), -1, 'glucose bands are not generated');
assert.strictEqual(boxes.review.indexOf('2.0 mmol/L or more'), -1, 'glucose categories are not generated');
assert.ok(boxes.review.indexOf('NICE early-onset neonatal infection risk factor documented: prolonged rupture of membranes before term birth.') !== -1, 'NICE label follows explicit rupture button');
assert.ok(boxes.review.indexOf('NICE early-onset neonatal infection risk factor documented: maternal GBS colonisation.') !== -1, 'NICE label follows explicit GBS button');
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
assert.ok(boxes.examination.indexOf('Temperature: 36.8') !== -1, 'temperature is transcribed as entered');
assert.ok(boxes.examination.indexOf('HR: 138') !== -1, 'heart rate is transcribed as entered');
assert.ok(boxes.examination.indexOf('Sats: 99% in air') !== -1, 'saturations are transcribed as entered');
assert.ok(boxes.examination.indexOf('not examined this review') !== -1, 'skipped systems are written');
assert.strictEqual(boxes.examination.indexOf('pyrexial'), -1, 'observation adjectives are not invented');
assert.strictEqual(boxes.examination.indexOf('tachycardic'), -1, 'observation adjectives are not invented');
assert.strictEqual(boxes.examination.indexOf('temperature abnormality'), -1, 'observation risk labels are not invented');

var hot = review.buildBoxes({
  obs: { temp: '38.4', hr: '175', rr: '72', sats: '88', oxygen: 'oxygen', fio2: '40' }
});
assert.ok(hot.examination.indexOf('Temperature: 38.4') !== -1, 'hot temperature is transcribed');
assert.ok(hot.examination.indexOf('HR: 175') !== -1, 'high heart rate is transcribed');
assert.ok(hot.examination.indexOf('RR: 72') !== -1, 'high respiratory rate is transcribed');
assert.strictEqual(hot.redCount, 0, 'abnormal observations do not create red flags');
assert.strictEqual(hot.otherCount, 0, 'abnormal observations do not create other factors');
assert.strictEqual(hot.examination.indexOf('NICE'), -1, 'observations alone do not create NICE labels');
assert.strictEqual(hot.review.indexOf('NICE'), -1, 'observations alone do not create NICE labels in the review');

var lowGlucose = review.buildBoxes({ glucoses: [{ value: '1.4', time: '', method: 'gas' }] });
assert.ok(lowGlucose.review.indexOf('Glucose 1.4 mmol/L') !== -1, 'low glucose is transcribed');
assert.strictEqual(lowGlucose.otherCount, 0, 'glucose values do not become clinical indicators');
assert.strictEqual(lowGlucose.review.indexOf('NICE'), -1, 'glucose values do not create NICE labels');

var acid = review.buildBoxes({ gas: { be: '12' } });
assert.ok(acid.review.indexOf('base deficit 12') !== -1, 'base deficit is transcribed');
assert.strictEqual(acid.otherCount, 0, 'gas values do not create acidosis factors');
assert.strictEqual(acid.review.indexOf('NICE'), -1, 'gas values do not create NICE labels');

var noGestationCalc = review.buildBoxes({ gestationAtBirth: '35+0' });
assert.ok(noGestationCalc.review.indexOf('35+0.') !== -1, 'preterm-looking free text is transcribed without a label');
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
assert.ok(pretermButton.review.indexOf('Preterm birth after spontaneous labour, before 37 weeks, documented.') !== -1, 'explicit preterm button is transcribed');
assert.ok(pretermButton.review.indexOf('NICE early-onset neonatal infection risk factor documented: preterm birth after spontaneous labour.') !== -1, 'NICE label follows the explicit preterm button');

var unsetNice = review.buildBoxes({ answers: { 'gbs-maternal': 'no' } });
assert.strictEqual(unsetNice.review.indexOf('NICE'), -1, 'a No answer does not create a NICE label');
assert.strictEqual(unsetNice.review.indexOf('No maternal GBS'), -1, 'negative findings are not auto-generated from No');

var siblingSingleton = review.buildBoxes({ answers: { 'sibling-infection': 'yes' } });
assert.strictEqual(siblingSingleton.review.indexOf('NICE'), -1, 'sibling infection without multiple pregnancy is not labelled');

var siblingMultiple = review.buildBoxes({ plurality: 'multiple', answers: { 'sibling-infection': 'yes' } });
assert.ok(siblingMultiple.review.indexOf('NICE early-onset neonatal infection red flag documented: infection in another baby of a multiple pregnancy.') !== -1, 'sibling infection NICE red-flag label needs an explicit yes and multiple pregnancy');

var cpr = review.buildBoxes({ answers: { cpr: 'yes' } });
assert.ok(cpr.review.indexOf('NICE early-onset neonatal infection red flag documented: cardiopulmonary resuscitation.') !== -1, 'CPR uses the red-flag documentation label');
assert.ok(review.buildBoxes({ answers: { thrombocytopenia: 'yes' } }).review.indexOf('NICE early-onset neonatal infection clinical indicator documented: thrombocytopenia.') !== -1, 'thrombocytopenia uses the clinical-indicator label');

var jaundiceYoung = review.buildBoxes({
  ageMode: 'manual',
  ageHours: '10',
  exam: { skin: { status: '', note: '', choices: { colour: 'jaundiced' } } }
});
assert.ok(jaundiceYoung.examination.indexOf('Jaundiced.') !== -1, 'jaundice finding is transcribed');
assert.strictEqual(jaundiceYoung.review.indexOf('within 24 hours'), -1, 'age plus jaundice does not create a clinical indicator');
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
assert.ok(abnormal.examination.indexOf('Respiratory: Grunting.') !== -1, 'grunting is grouped under Respiratory');
assert.ok(abnormal.examination.indexOf('Cardiovascular:') !== -1, 'NAD cardiovascular stays grouped under its system');
assert.ok(abnormal.examination.indexOf('Respiratory:') < abnormal.examination.indexOf('Cardiovascular:'), 'systems with abnormal findings lead');
assert.ok(abnormal.examination.indexOf('Grunting') < abnormal.examination.indexOf('Fontanelle soft'), 'selected abnormal findings lead');

var abdomen = review.buildBoxes({
  exam: {
    abdomen: {
      status: '',
      note: '',
      choices: { feel: 'soft', tenderness: 'no', distension: 'no', organs: 'no', cord: 'healthy' }
    }
  }
});
assert.ok(abdomen.examination.indexOf('Abdomen soft, non-tender, not distended, no organomegaly. Cord healthy.') !== -1, 'abdomen findings are comma-joined after one Abdomen');
assert.strictEqual(abdomen.examination.indexOf('Abdomen soft.'), -1, 'abdomen findings are not written as separate Abdomen sentences');

var withNote = review.buildBoxes({
  exam: {
    general: { status: 'nad', note: '', choices: {} },
    respiratory: { status: '', note: 'Louder on handling.', choices: { grunting: 'yes' } },
    cardiovascular: { status: '', note: 'Soft systolic murmur at the left sternal edge.', choices: { sounds: 'murmur' } }
  }
});
assert.ok(withNote.examination.indexOf('Respiratory: Grunting. Louder on handling.') !== -1, 'respiratory free text stays under Respiratory');
assert.ok(withNote.examination.indexOf('Cardiovascular: Murmur present. Soft systolic murmur at the left sternal edge.') !== -1, 'cardiovascular free text stays under Cardiovascular');
assert.ok(withNote.examination.indexOf('Respiratory:') < withNote.examination.indexOf('Cardiovascular:'), 'system order is preserved with free text');
assert.strictEqual(withNote.examination.indexOf('Louder on handling.'), withNote.examination.indexOf('Respiratory: Grunting. Louder on handling.') + 'Respiratory: Grunting. '.length, 'custom text is not lifted above its system heading');

var oxygen = review.buildBoxes({ obs: { sats: '92', oxygen: 'oxygen', fio2: '30' } });
assert.ok(oxygen.examination.indexOf('Sats: 92% in 30% oxygen') !== -1, 'oxygen requirement is transcribed');

var effort = review.buildBoxes({
  exam: { respiratory: { status: '', note: '', choices: { wob: 'moderate', effortSigns: ['recessions', 'flaring'], recessions: ['subcostal'] } } }
});
assert.ok(effort.examination.indexOf('Moderate work of breathing') !== -1, 'work of breathing is written');
assert.ok(effort.examination.indexOf('Nasal flaring') !== -1, 'effort signs are written');
assert.strictEqual(effort.examination.indexOf('NICE'), -1, 'exam findings do not auto-tag NICE');

assert.ok(!/start antibiotics/i.test(review.buildBoxes({ answers: { cpr: 'yes' } }).discussion), 'the note does not recommend starting antibiotics');
assert.ok(!/without waiting for results/i.test(review.buildBoxes({ answers: { cpr: 'yes', chorio: 'yes' } }).discussion), 'threshold management sentences are gone');
assert.ok(!/increased risk/i.test(review.buildBoxes({ answers: { cpr: 'yes' } }).all), 'increased-risk language is gone');

var kaiser = review.buildBoxes({
  shorter: true,
  kaiser: { well: '0.4 per 1000, routine care', equivocal: 'Blood culture.', unwell: '' }
});
assert.ok(kaiser.review.indexOf('BG: Kaiser Permanente. Well appearing: 0.4 per 1000, routine care. Equivocal: Blood culture.') !== -1, 'filled Kaiser boxes are transcribed under BG');
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

var hours = review.ageInHours({ ageMode: 'times', birthAt: '2026-01-01T00:00', reviewAt: '2026-01-01T18:30' });
assert.ok(Math.abs(hours - 18.5) < 0.02, 'age from clock times is 18.5 hours');
assert.strictEqual(review.ageInHours({ ageMode: 'manual', ageDays: '1', ageHours: '6' }), 30, 'manual age adds days and hours');

var cleared = review.emptyState();
assert.strictEqual(cleared.gestationAtBirth, '', 'a new baby has no gestation text');
assert.strictEqual(cleared.impression, '', 'a new baby has no impression');

assert.ok(boxes.all.indexOf('Examination') !== -1 && boxes.all.indexOf('Discussion') !== -1 && boxes.all.indexOf('Review') !== -1, 'copy all names the three boxes');

console.log('postnatal review tests passed');
