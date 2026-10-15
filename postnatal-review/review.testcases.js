/*
 * Plain checks for postnatal review routing and NICE / BAPM counts.
 * Run: node postnatal-review/review.testcases.js
 */
'use strict';

var assert = require('assert');
var review = require('./review.js');

function routingCase() {
  return {
    place: 'postnatal',
    gestationWeeks: '39',
    gestationDays: '2',
    ageMode: 'manual',
    ageHours: '18',
    modeOfBirth: 'svd',
    romHours: '26',
    answers: {
      'rom-term-24': 'yes',
      'gbs-maternal': 'no',
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
    impression: 'well baby, one non-red-flag risk factor',
    plan: 'Remain with mother on the postnatal ward. Early-warning observations for at least 12 hours. Continue breastfeeding with midwifery support.',
    antibiotics: 'none'
  };
}

var boxes = review.buildBoxes(routingCase());

assert.ok(boxes.review.indexOf('39+2') !== -1, 'gestation leads the review');
assert.ok(boxes.review.indexOf('18 hours') !== -1, 'age is in the review');
assert.ok(boxes.review.indexOf('Meconium passed') !== -1, 'stools are in the review');
assert.ok(boxes.review.indexOf('Urine passed') !== -1, 'urine is in the review');
assert.ok(boxes.review.indexOf('No parental concern') !== -1, 'parental concern is in the review');
assert.ok(boxes.review.indexOf('breastfeeds') !== -1, 'feeding is in the review');
assert.strictEqual(boxes.review.indexOf('Kaiser Permanente'), -1, 'an unset Kaiser classification is not written');
assert.ok(boxes.review.indexOf('Glucose 3.4') !== -1, 'glucose is in the review');
assert.ok(boxes.review.indexOf('NICE NG195 risk factor') !== -1, 'the rupture factor is tagged in the review');
assert.ok(boxes.review.indexOf('No maternal GBS') !== -1, 'answered negatives are written');
assert.strictEqual(boxes.review.indexOf('Vitamin K'), -1, 'vitamin K is not written');
assert.strictEqual(boxes.examination.toLowerCase().indexOf('red reflex'), -1, 'red reflex is not written');
assert.strictEqual(boxes.review.indexOf('Heart sounds normal'), -1, 'examination prose stays out of the review');
assert.strictEqual(boxes.review.indexOf('Fontanelle soft'), -1, 'NAD examination stays out of the review');
assert.strictEqual(boxes.review.indexOf('Impression:'), -1, 'impression stays out of the review');

assert.ok(boxes.examination.indexOf('postnatal ward') !== -1, 'place is in the examination');
assert.ok(boxes.examination.indexOf('18 hours') !== -1, 'age is in the examination');
assert.ok(boxes.examination.indexOf('Fontanelle soft') !== -1, 'NAD cardiovascular text includes the fontanelle');
assert.ok(boxes.examination.indexOf('Capillary refill under 2 seconds') !== -1, 'NAD cardiovascular text includes capillary refill');
assert.ok(boxes.examination.indexOf('Temperature 36.8') !== -1, 'observations are in the examination');
assert.ok(boxes.examination.indexOf('sats 99% in air') !== -1, 'saturations name the oxygen');
assert.ok(boxes.examination.indexOf('not examined this review') !== -1, 'skipped systems are written');
assert.strictEqual(boxes.examination.indexOf('Meconium passed'), -1, 'history stays out of the examination');
assert.strictEqual(boxes.examination.indexOf('Glucose 3.4'), -1, 'results stay out of the examination');
assert.strictEqual(boxes.examination.indexOf('Abdomen soft'), -1, 'an untouched system is not called normal');
assert.strictEqual(boxes.examination.indexOf('Genitalia'), -1, 'genitalia sit inside the untouched abdomen');

assert.ok(boxes.discussion.indexOf('single NICE NG195 risk factor') !== -1, 'one ordinary factor is named in the discussion');
assert.ok(boxes.discussion.indexOf('Impression:') !== -1, 'impression is in the discussion');
assert.ok(boxes.discussion.indexOf('Plan:') !== -1, 'plan is in the discussion');
assert.ok(boxes.discussion.indexOf('No antibiotics') !== -1, 'antibiotic choice is in the plan');
assert.ok(boxes.discussion.indexOf('feeding well') !== -1, 'the summary includes feeding');
assert.strictEqual(boxes.discussion.indexOf('Glucose 3.4'), -1, 'results stay out of the discussion');
assert.strictEqual(boxes.redCount, 0, 'the sample has no red flag');
assert.strictEqual(boxes.otherCount, 1, 'prolonged rupture counts as one other factor');
assert.ok(boxes.framework.indexOf('12 hours') !== -1, 'one other factor mentions 12 hours of observations');
assert.strictEqual(boxes.framework.indexOf('without waiting for results'), -1, 'one other factor does not use the red-flag sentence');
assert.ok(boxes.review.indexOf('Membranes ruptured for 26 hours') !== -1, 'rupture hours are written without the old membranes choice');

var pretermGated = review.buildBoxes({ gestationWeeks: '35', answers: { 'rom-term-24': 'yes' } });
assert.strictEqual(pretermGated.otherCount, 0, 'a term rupture answer does not count for a preterm baby');
var termGated = review.buildBoxes({ gestationWeeks: '39', answers: { 'rom-preterm-18': 'yes' } });
assert.strictEqual(termGated.otherCount, 0, 'a preterm rupture answer does not count for a term baby');
assert.strictEqual(review.buildBoxes({ answers: { 'rom-preterm-18': 'yes' } }).otherCount, 1, 'without gestation either rupture answer counts');

var shorter = review.buildBoxes(Object.assign({}, routingCase(), { shorter: true }));
assert.strictEqual(shorter.examination.indexOf('Fontanelle soft'), -1, 'shorter examination drops NAD lines');
assert.ok(shorter.examination.indexOf('not examined this review') !== -1, 'shorter examination keeps not-examined');
assert.strictEqual(shorter.review.indexOf('No maternal GBS'), -1, 'shorter review drops normal filler');
assert.ok(shorter.review.indexOf('NICE NG195 risk factor') !== -1, 'shorter review keeps risk factors');
assert.ok(shorter.review.indexOf('Meconium passed') !== -1, 'shorter review keeps stools');

var abnormal = review.buildBoxes({
  place: 'labour',
  ageMode: 'manual',
  ageHours: '6',
  exam: {
    cardiovascular: { status: 'nad', note: '', choices: {} },
    respiratory: {
      status: '',
      note: '',
      choices: { grunting: 'yes' }
    },
    skin: { status: 'not', note: '', choices: {} }
  }
});
assert.ok(abnormal.examination.indexOf('Grunting') !== -1, 'grunting is written');
assert.ok(abnormal.examination.indexOf('Grunting') < abnormal.examination.indexOf('Fontanelle soft'), 'abnormal findings lead');
var abnormalShort = review.buildBoxes(Object.assign({}, abnormal.factors ? {} : {}, {
  place: 'labour',
  ageMode: 'manual',
  ageHours: '6',
  shorter: true,
  exam: {
    cardiovascular: { status: 'nad', note: '', choices: {} },
    respiratory: { status: '', note: 'Heard on handling.', choices: { grunting: 'yes' } },
    skin: { status: 'not', note: '', choices: {} }
  }
}));
assert.ok(abnormalShort.examination.indexOf('Grunting') !== -1, 'short note keeps grunting');
assert.ok(abnormalShort.examination.indexOf('Heard on handling') !== -1, 'short note keeps the abnormal note');
assert.strictEqual(abnormalShort.examination.indexOf('Fontanelle soft'), -1, 'short note drops the NAD cardiovascular line');
assert.ok(abnormalShort.examination.indexOf('Skin not examined') !== -1, 'short note keeps skin not examined');

var oxygen = review.buildBoxes({ obs: { sats: '92', oxygen: 'oxygen', fio2: '30' } });
assert.ok(oxygen.examination.indexOf('sats 92% in 30% oxygen') !== -1, 'oxygen requirement is written with the percentage');

var effort = review.buildBoxes({
  exam: { respiratory: { status: '', note: '', choices: { wob: 'moderate', effortSigns: ['recessions', 'flaring'], recessions: ['subcostal'] } } }
});
assert.ok(effort.examination.indexOf('Moderate work of breathing') !== -1, 'work of breathing is written');
assert.ok(effort.examination.indexOf('Nasal flaring') !== -1, 'effort signs are written');
assert.ok(effort.examination.indexOf('Subcostal recession') !== -1, 'recession type is written');
assert.strictEqual(effort.examination.indexOf('Recession.'), -1, 'generic recession gives way to the type');
assert.ok(effort.factors.some(function (factor) { return factor.id === 'resp-distress'; }), 'increased work of breathing counts');

var hiddenEffort = review.buildBoxes({
  exam: { respiratory: { status: '', note: '', choices: { wob: 'none', effortSigns: ['bobbing'] } } }
});
assert.strictEqual(hiddenEffort.examination.indexOf('Head bobbing'), -1, 'hidden effort signs are not written');

var crt = review.buildBoxes({
  exam: { cardiovascular: { status: '', note: '', choices: { crtCentral: '<2', crtPeripheral: '>3', perfusion: 'shut' } } }
});
assert.ok(crt.examination.indexOf('Peripheral capillary refill over 3 seconds') !== -1, 'peripheral refill is written');
assert.ok(crt.examination.indexOf('Peripherally shut down') !== -1, 'perfusion is written');

var settled = review.buildBoxes({
  exam: { cardiovascular: { status: 'nad', note: 'old', choices: { shock: 'yes' } } }
});
assert.strictEqual(settled.redCount, 0, 'choices left under NAD do not count');
assert.strictEqual(settled.examination.indexOf('Signs of shock'), -1, 'choices left under NAD are not written');

var neuroOther = review.buildBoxes({
  exam: { neurology: { status: '', note: 'Hypertonic upper limbs', choices: { tone: 'other' } } }
});
assert.ok(neuroOther.examination.indexOf('Hypertonic upper limbs.') !== -1, 'neurology other writes the free text');
assert.ok(review.buildBoxes({
  exam: { neurology: { status: '', note: '', choices: { tone: 'other' } } }
}).examination.indexOf('Neurological finding not described') !== -1, 'neurology other without text is not silent');
assert.strictEqual(review.buildBoxes({
  exam: { neurology: { status: '', note: 'stale', choices: { tone: 'high' } } }
}).examination.indexOf('stale'), -1, 'neurology text only shows with other');
assert.ok(review.buildBoxes({
  exam: { neurology: { status: '', note: '', choices: { tone: 'low' } } }
}).factors.some(function (factor) { return factor.id === 'altered-tone'; }), 'reduced tone counts');

assert.strictEqual(review.buildBoxes({
  answers: { 'spontaneous-preterm': 'yes', chorio: 'yes' }
}).otherCount, 2, 'two ordinary factors');
assert.ok(review.buildBoxes({
  answers: { 'spontaneous-preterm': 'yes', chorio: 'yes' }
}).framework.indexOf('without waiting for results') !== -1, 'two ordinary factors use the treatment threshold sentence');

assert.strictEqual(review.buildBoxes({
  answers: { cpr: 'yes' }
}).redCount, 1, 'CPR is a red flag');

assert.strictEqual(review.buildBoxes({
  plurality: 'multiple',
  answers: { 'sibling-infection': 'yes', 'spontaneous-preterm': 'yes', chorio: 'yes' }
}).redCount, 1, 'sibling infection is one red flag');
assert.strictEqual(review.buildBoxes({
  plurality: 'multiple',
  answers: { 'sibling-infection': 'yes', 'spontaneous-preterm': 'yes', chorio: 'yes' }
}).otherCount, 2, 'the same case still has two ordinary factors');

assert.strictEqual(review.buildBoxes({
  answers: { 'sibling-infection': 'yes' }
}).redCount, 0, 'sibling infection does not count for a singleton');

assert.strictEqual(review.buildBoxes({
  answers: { 'gbs-maternal': 'yes', 'gbs-previous': 'yes' }
}).otherCount, 1, 'the two GBS questions are one risk factor');

assert.strictEqual(review.buildBoxes({
  multi: { sinceBirth: ['apnoea'] },
  exam: { respiratory: { status: '', note: '', choices: { apnoea: 'yes' } } }
}).redCount, 1, 'apnoea in the history and the examination counts once');

assert.strictEqual(review.buildBoxes({ obs: { temp: '35.4' } }).otherCount, 1, 'temperature under 36 is an indicator');
assert.strictEqual(review.buildBoxes({ obs: { temp: '36.8' } }).otherCount, 0, 'a usual temperature is not an indicator');
assert.strictEqual(review.buildBoxes({ gas: { be: '12' } }).factors.some(function (factor) { return factor.id === 'metabolic-acidosis'; }), true, 'base deficit of 10 or more counts');
assert.strictEqual(review.buildBoxes({ gas: { be: '4' } }).factors.some(function (factor) { return factor.id === 'metabolic-acidosis'; }), false, 'a small base deficit does not count');
assert.strictEqual(review.buildBoxes({ glucoses: [{ value: '1.4', time: '', method: 'gas' }] }).factors.some(function (factor) { return factor.id === 'altered-glucose'; }), true, 'glucose under 2 counts');
assert.strictEqual(review.buildBoxes({ glucoses: [{ value: '3.4', time: '', method: 'gas' }] }).factors.some(function (factor) { return factor.id === 'altered-glucose'; }), false, 'a glucose of 3.4 does not count');

assert.strictEqual(review.buildBoxes({
  ageMode: 'manual',
  ageHours: '10',
  exam: { skin: { status: '', note: '', choices: { colour: 'jaundiced' } } }
}).factors.some(function (factor) { return factor.id === 'jaundice-24h'; }), true, 'jaundice under 24 hours counts');
assert.strictEqual(review.buildBoxes({
  ageMode: 'manual',
  ageHours: '30',
  exam: { skin: { status: '', note: '', choices: { colour: 'jaundiced' } } }
}).factors.some(function (factor) { return factor.id === 'jaundice-24h'; }), false, 'jaundice after 24 hours is not that indicator');

assert.strictEqual(review.buildBoxes({ gestationWeeks: '35' }).factors.some(function (factor) { return factor.id === 'spontaneous-preterm'; }), false, 'prematurity alone is not the spontaneous-labour factor');
assert.strictEqual(review.isPreterm({ gestationWeeks: '35' }), true, '35 weeks is preterm');
assert.strictEqual(review.isPreterm({ gestationWeeks: '37', gestationDays: '0' }), false, '37+0 is term');

var termRom = review.romSuggestion({ gestationWeeks: '39', romHours: '26' });
assert.strictEqual(termRom && termRom.id, 'rom-term-24', 'term rupture over 24 hours is offered');
var pretermRom = review.romSuggestion({ gestationWeeks: '35', romHours: '20' });
assert.strictEqual(pretermRom && pretermRom.id, 'rom-preterm-18', 'preterm rupture over 18 hours is offered');
assert.strictEqual(review.romSuggestion({ gestationWeeks: '39', romHours: '20' }), null, 'term rupture under 24 hours is not offered');
assert.strictEqual(review.romSuggestion({ gestationWeeks: '35', romHours: '10' }), null, 'preterm rupture under 18 hours is not offered');

var hours = review.ageInHours({ ageMode: 'times', birthAt: '2026-01-01T00:00', reviewAt: '2026-01-01T18:30' });
assert.ok(Math.abs(hours - 18.5) < 0.02, 'age from clock times is 18.5 hours');
assert.strictEqual(review.ageInHours({ ageMode: 'manual', ageDays: '1', ageHours: '6' }), 30, 'manual age adds days and hours');

assert.ok(review.buildBoxes({ answers: { idm: 'yes' } }).bapm.some(function (factor) { return factor.id === 'idm'; }), 'maternal diabetes is a BAPM factor');
assert.strictEqual(review.buildBoxes({ answers: { idm: 'yes' } }).otherCount, 0, 'a BAPM factor is not an NG195 factor');
assert.ok(review.buildBoxes({}).framework.indexOf('Routine postnatal care') !== -1, 'an empty review states routine care');

var kaiser = review.buildBoxes({
  shorter: true,
  kaiser: { well: '0.4 per 1000, routine care', equivocal: 'Blood culture.', unwell: '' }
});
assert.ok(kaiser.review.indexOf('Kaiser Permanente. Well appearing: 0.4 per 1000, routine care. Equivocal: Blood culture.') !== -1, 'filled Kaiser boxes are kept in the shorter review');
assert.strictEqual(kaiser.review.indexOf('Unwell appearing'), -1, 'an empty Kaiser box is left out');
assert.strictEqual(kaiser.otherCount, 0, 'the Kaiser text is not an NICE factor');
assert.strictEqual(review.buildBoxes({ kaiser: 'equivocal' }).review.indexOf('Kaiser Permanente'), -1, 'an old Kaiser choice is not written');
assert.strictEqual(/start antibiotics/i.test(review.buildBoxes({ answers: { cpr: 'yes' } }).framework), false, 'the strip does not tell the user to start antibiotics');

assert.ok(boxes.all.indexOf('Examination') !== -1 && boxes.all.indexOf('Discussion') !== -1 && boxes.all.indexOf('Review') !== -1, 'copy all names the three boxes');

var cleared = review.emptyState();
assert.strictEqual(cleared.gestationWeeks, '', 'a new baby has no gestation');
assert.strictEqual(cleared.impression, '', 'a new baby has no impression');

console.log('postnatal review tests passed');
