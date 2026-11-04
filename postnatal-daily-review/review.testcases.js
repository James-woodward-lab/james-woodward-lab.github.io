/*
 * Safety checks for postnatal daily review as a documentation aid only.
 * Confirms shared glucose and temperature values are written once, unused
 * pathways are omitted, and values are not interpreted.
 * Run: node postnatal-daily-review/review.testcases.js
 */
'use strict';

var assert = require('assert');
var review = require('./review.js');

function sample() {
  return {
    place: 'tc',
    gestationAtBirth: '34+2',
    ageMode: 'manual',
    ageDays: '2',
    pathways: ['late-preterm', 'hypoglycaemia'],
    feedMode: 'breast',
    latch: 'good',
    feedFrequency: 'at least every 3 hours',
    answers: { topUps: 'yes' },
    parentalConcern: 'none',
    exam: {
      general: { status: 'nad', note: '', choices: {} },
      breathing: { status: 'nad', note: '', choices: {} }
    },
    obs: { temp: '36.8', hr: '140', rr: '48', sats: '98', oxygen: 'air', fio2: '' },
    glucoses: [{ time: '08:00', value: '2.8', method: '' }],
    temps: [{ time: '08:00', value: '36.7' }],
    thermalCare: 'cot',
    jaundice: 'none',
    weightToday: '2.31',
    multi: { hypoReasons: ['idm'], hypoSymptoms: ['none'] },
    plan: 'Continue current feeding plan.',
    reviewWhen: 'tomorrow'
  };
}

function forbidden(note) {
  return /\b(low|high|normal|threshold|consider)\b/i.test(note);
}

var note = review.buildNote(sample());

assert.ok(note.indexOf('Reviewed on transitional care at 2 days of age.') !== -1, 'opening uses place and age');
assert.ok(note.indexOf('Gestation at birth 34+2.') !== -1, 'gestation is transcribed as entered');
assert.strictEqual(note.indexOf('Late preterm baby'), -1, 'gestation free text does not classify prematurity');
assert.ok(note.indexOf('Late preterm pathway.') !== -1, 'late preterm heading is written');
assert.ok(note.indexOf('Hypoglycaemia pathway.') !== -1, 'hypoglycaemia heading is written');
assert.strictEqual(note.indexOf('Suspected sepsis'), -1, 'sepsis is omitted when unticked');
assert.strictEqual(note.indexOf('Temperature management.'), -1, 'temperature pathway is omitted when unticked');
assert.ok(note.indexOf('Feeding: breastfeeds, latching well, at least every 3 hours, with top-ups.') !== -1, 'feeding is written once');
assert.ok(note.indexOf('No clinical jaundice.') !== -1, 'jaundice selection is transcribed');
assert.ok(note.indexOf('Weight today 2.31 kg.') !== -1, 'weight is transcribed');
assert.ok(note.indexOf('Cared for in a cot.') !== -1, 'thermal setting is transcribed when temperature pathway is not selected');
assert.ok(note.indexOf('Temperature 36.7°C at 08:00.') !== -1, 'late preterm owns the temperature list when temperature pathway is off');
assert.ok(note.indexOf('Maternal diabetes documented.') !== -1, 'hypoglycaemia reason is transcribed');
assert.ok(note.indexOf('No symptoms documented.') !== -1, 'hypoglycaemia symptoms chip is transcribed');
assert.ok(note.indexOf('Blood glucose, recorded for the late preterm pathway and the hypoglycaemia pathway: 2.8 mmol/L at 08:00.') !== -1, 'shared glucose is labelled for both pathways');
assert.strictEqual(note.split('2.8 mmol/L').length - 1, 1, 'glucose value is written once');
assert.strictEqual(note.indexOf('Blood glucose: 2.8'), -1, 'unlabelled glucose line is not also written');
assert.ok(note.indexOf('Plan: Continue current feeding plan.') !== -1 || note.indexOf('Continue current feeding plan.') !== -1, 'plan is transcribed');
assert.ok(note.indexOf('Next review: tomorrow.') !== -1, 'next review time is transcribed');
assert.ok(note.indexOf('Temperature: 36.8') !== -1, 'examination temperature is transcribed as entered');
assert.ok(note.indexOf('Appears well.') !== -1, 'NAD general is transcribed');
assert.strictEqual(forbidden(note), false, 'combined sample does not generate forbidden words');

var lpOnly = review.buildNote({
  pathways: ['late-preterm'],
  glucoses: [{ time: '10:00', value: '1.5', method: 'gas' }],
  jaundice: 'none'
});
assert.ok(lpOnly.indexOf('Late preterm pathway.') !== -1, 'late preterm-only heading is written');
assert.ok(lpOnly.indexOf('Blood glucose: 1.5 mmol/L on the blood gas at 10:00.') !== -1, 'late preterm-only glucose sits under that pathway');
assert.strictEqual(lpOnly.indexOf('recorded for the late preterm pathway and the hypoglycaemia pathway'), -1, 'dual glucose label is not used for late preterm alone');
assert.strictEqual(lpOnly.indexOf('Hypoglycaemia pathway.'), -1, 'hypoglycaemia heading is omitted when unticked');
assert.strictEqual(lpOnly.indexOf('low'), -1, 'a glucose of 1.5 is not labelled low');
assert.strictEqual(lpOnly.indexOf('high'), -1, 'a glucose of 1.5 is not labelled high');

var hypoOnly = review.buildNote({
  pathways: ['hypoglycaemia'],
  glucoses: [{ time: '09:00', value: '2.1', method: 'meter' }],
  multi: { hypoReasons: ['beta-blocker'], hypoSymptoms: ['jitteriness'] }
});
assert.ok(hypoOnly.indexOf('Hypoglycaemia pathway.') !== -1, 'hypoglycaemia-only heading is written');
assert.ok(hypoOnly.indexOf('Blood glucose: 2.1 mmol/L on a meter at 09:00.') !== -1, 'hypoglycaemia-only glucose sits under that pathway');
assert.ok(hypoOnly.indexOf('Maternal beta-blocker documented.') !== -1, 'reason is kept with hypoglycaemia');
assert.ok(hypoOnly.indexOf('Symptoms documented: jitteriness.') !== -1, 'symptoms are kept with hypoglycaemia');
assert.strictEqual(hypoOnly.indexOf('Late preterm pathway.'), -1, 'late preterm heading is omitted when unticked');
assert.strictEqual(hypoOnly.indexOf('recorded for the late preterm pathway and the hypoglycaemia pathway'), -1, 'dual glucose label is not used for hypoglycaemia alone');

var bothTemp = review.buildNote({
  pathways: ['late-preterm', 'temperature'],
  thermalCare: 'incubator',
  temps: [{ time: '08:00', value: '36.4' }, { time: '12:00', value: '36.9' }],
  tempEnvironment: 'Hat on',
  tempWeaning: 'Air temperature reduced as charted',
  jaundice: 'none'
});
assert.ok(bothTemp.indexOf('Thermal care documented with temperature management below.') !== -1, 'late preterm points to temperature management when both are selected');
assert.ok(bothTemp.indexOf('Temperature management.') !== -1, 'temperature heading is written');
assert.ok(bothTemp.indexOf('In incubator.') !== -1, 'thermal setting is written under temperature management');
assert.ok(bothTemp.indexOf('Temperatures: 36.4°C at 08:00, 36.9°C at 12:00.') !== -1, 'temperature list is combined once');
assert.strictEqual(bothTemp.split('36.4').length - 1, 1, 'a temperature value is not repeated');
assert.ok(bothTemp.indexOf('Hat on.') !== -1, 'environment note is transcribed');
assert.ok(bothTemp.indexOf('Air temperature reduced as charted.') !== -1, 'weaning note is transcribed');
assert.strictEqual((bothTemp.match(/In incubator/g) || []).length, 1, 'incubator setting is not repeated under late preterm');

var sepsisOnly = review.buildNote({
  place: 'postnatal',
  ageMode: 'manual',
    ageHours: '18',
  pathways: ['sepsis'],
  antibioticDay: '2',
  antibioticWhat: 'benzylpenicillin and gentamicin',
  cultureStatus: 'pending',
  bloodResults: 'CRP 8',
  sepsisCourse: 'Feeding well',
  glucoses: [{ value: '1.5', time: '08:00', method: '' }],
  plan: 'Continue current antibiotics.'
});
assert.ok(sepsisOnly.indexOf('Reviewed on the postnatal ward at 18 hours of age.') !== -1, 'postnatal ward opening is written');
assert.ok(sepsisOnly.indexOf('Suspected sepsis.') !== -1, 'sepsis heading is written');
assert.ok(sepsisOnly.indexOf('Antibiotics day 2, benzylpenicillin and gentamicin.') !== -1, 'antibiotic day and names are transcribed');
assert.ok(sepsisOnly.indexOf('Blood culture pending.') !== -1, 'culture status is transcribed');
assert.ok(sepsisOnly.indexOf('CRP 8.') !== -1, 'blood results are transcribed');
assert.ok(sepsisOnly.indexOf('Feeding well.') !== -1, 'sepsis course is transcribed');
assert.strictEqual(sepsisOnly.indexOf('Late preterm pathway.'), -1, 'late preterm is omitted from a sepsis-only note');
assert.strictEqual(sepsisOnly.indexOf('Hypoglycaemia pathway.'), -1, 'hypoglycaemia is omitted from a sepsis-only note');
assert.strictEqual(sepsisOnly.indexOf('1.5 mmol/L'), -1, 'glucose is omitted when no glucose pathway is selected');
assert.strictEqual(sepsisOnly.indexOf('low'), -1, 'sepsis-only note does not invent a glucose band');

var unusedSepsisFields = review.buildNote({
  pathways: ['late-preterm'],
  antibioticDay: '3',
  cultureStatus: 'pending',
  jaundice: 'none'
});
assert.strictEqual(unusedSepsisFields.indexOf('Suspected sepsis'), -1, 'filled sepsis fields are omitted when the pathway is unticked');
assert.strictEqual(unusedSepsisFields.indexOf('Antibiotics day 3'), -1, 'antibiotic day is omitted when sepsis is unticked');

var hot = review.buildNote({
  pathways: ['sepsis'],
  obs: { temp: '38.4', hr: '175', rr: '72', sats: '88', oxygen: 'oxygen', fio2: '40' }
});
assert.ok(hot.indexOf('Temperature: 38.4') !== -1, 'hot temperature is transcribed');
assert.ok(hot.indexOf('HR: 175') !== -1, 'high heart rate is transcribed as a number');
assert.ok(hot.indexOf('RR: 72') !== -1, 'high respiratory rate is transcribed as a number');
assert.ok(hot.indexOf('Sats: 88% in 40% oxygen') !== -1, 'saturations are transcribed as entered');
assert.strictEqual(hot.indexOf('pyrexial'), -1, 'observation adjectives are not invented');
assert.strictEqual(hot.indexOf('tachycardic'), -1, 'observation adjectives are not invented');
assert.strictEqual(forbidden(hot), false, 'abnormal observations do not generate forbidden words');

var emptyPathways = review.buildNote({
  place: 'tc',
  ageMode: 'manual',
  ageDays: '1',
  feedMode: 'formula',
  feedAmount: '30',
  feedFrequency: 'every 3 hours'
});
assert.ok(emptyPathways.indexOf('Reviewed on transitional care at 1 day of age.') !== -1, 'opening still writes without a pathway');
assert.strictEqual(emptyPathways.indexOf('Late preterm pathway.'), -1, 'no pathway heading without a selection');
assert.strictEqual(emptyPathways.indexOf('Plan:'), -1, 'empty plan is omitted');
assert.ok(emptyPathways.indexOf('Feeding: formula, 30 ml, every 3 hours.') !== -1, 'feeding still writes without a pathway');

var noAutoPlan = review.buildNote({
  pathways: ['hypoglycaemia'],
  glucoses: [{ value: '1.4', time: '', method: '' }]
});
assert.strictEqual(noAutoPlan.indexOf('Continue blood glucose monitoring'), -1, 'plan chips are not added from a glucose value');
assert.strictEqual(noAutoPlan.indexOf('Recheck glucose as planned'), -1, 'glucose plan chips are not inferred');
assert.ok(noAutoPlan.indexOf('Blood glucose: 1.4 mmol/L.') !== -1, 'unlabelled glucose is still transcribed under hypoglycaemia');

assert.strictEqual(review.glucoseOwner({ pathways: ['late-preterm'] }), 'late-preterm', 'late preterm owns glucose when selected alone');
assert.strictEqual(review.glucoseOwner({ pathways: ['hypoglycaemia'] }), 'hypoglycaemia', 'hypoglycaemia owns glucose when selected alone');
assert.strictEqual(review.glucoseOwner({ pathways: ['late-preterm', 'hypoglycaemia'] }), 'both', 'both glucose pathways share one list');
assert.strictEqual(review.tempOwner({ pathways: ['late-preterm'] }), 'late-preterm', 'late preterm owns temperatures when temperature management is off');
assert.strictEqual(review.tempOwner({ pathways: ['late-preterm', 'temperature'] }), 'temperature', 'temperature management owns the list when selected');
assert.strictEqual(review.tempOwner({ pathways: ['sepsis'] }), '', 'sepsis does not own the temperature list');

var migrated = review.normalize({ pathways: 'late-preterm', glucoses: null, temps: null });
assert.deepStrictEqual(migrated.pathways, [], 'a non-array pathways value is cleared');
assert.strictEqual(migrated.glucoses.length, 1, 'missing glucose rows become one empty row');
assert.strictEqual(migrated.temps.length, 1, 'missing temperature rows become one empty row');

/* Problems list and next review: clinician-chosen only. */
var bare = review.buildNote({ gestationAtBirth: '35+1', glucoses: [{ time: '', value: '1.8', method: 'meter' }] });
assert.strictEqual(bare.indexOf('Problems:'), -1, 'no problems are inferred from gestation or glucose');

var migratedPathways = review.normalize({ pathways: ['sepsis', 'hypoglycaemia'] });
assert.deepStrictEqual(migratedPathways.problems.map(function (p) { return p.type; }), ['sepsis', 'hypoglycaemia'], 'ticked pathways appear as problems');

var listed = review.buildNote({
  place: 'postnatal',
  pathways: ['sepsis'],
  problems: [
    { type: 'jaundice', status: 'new', detail: 'SBR below line', plan: 'repeat as planned' },
    { type: 'sepsis', status: 'ongoing', detail: 'day 2 antibiotics', plan: '' },
    { type: 'other', label: 'Tongue tie', status: '', detail: '', plan: '' }
  ],
  reviewWhen: 'tomorrow',
  multi: { pending: ['culture', 'other'] },
  pendingOther: 'repeat SBR',
  escalation: 'temperature unstable'
});
assert.strictEqual(listed.indexOf('Problems:\n1. Jaundice (new): SBR below line. Plan: repeat as planned.\n2. Suspected sepsis (ongoing): day 2 antibiotics.\n3. Tongue tie.'), 0, 'problems lead the note in the chosen order');
assert.ok(listed.indexOf('Suspected sepsis.') > listed.indexOf('3. Tongue tie.'), 'pathway sections still follow below');
assert.ok(listed.indexOf('Next review: tomorrow. Awaiting: Blood culture, repeat SBR. Escalate sooner if: temperature unstable.') !== -1, 'next review line is written');
assert.strictEqual(listed.indexOf('Review at'), -1, 'old review line is replaced');

var dropped = review.normalize({ pathways: [], problems: [{ type: 'sepsis' }, { type: 'murmur' }] });
assert.deepStrictEqual(dropped.problems.map(function (p) { return p.type; }), ['murmur'], 'unticked pathways leave the problems list');

/* Problem templates: prompts only, shared answers, data entered once. */
var content = require('./content.js');
Object.keys(content.TEMPLATES).forEach(function (type) {
  content.TEMPLATES[type].forEach(function (id) {
    assert.ok(content.CHECK_ITEMS[id], 'template item exists: ' + type + ' ' + id);
  });
});
var templateText = JSON.stringify(content.CHECK_ITEMS);
assert.ok(!/mmol|\d\s*%|\d\.\d\s*(kg|\u00B0C)/i.test(templateText.replace(/2\.24 kg/g, '')), 'templates carry no thresholds or targets');

var templated = review.buildNote({
  problems: [{ type: 'jaundice' }, { type: 'hdn' }, { type: 'idm' }],
  jaundice: 'tsb', jaundiceValue: '210', jaundiceAgeHours: '40', jaundicePlot: 'below',
  glucoses: [{ time: '09:00', value: '2.9', method: 'meter' }],
  feedMode: 'breast',
  checks: {
    bloodGroupDat: { text: 'O positive, DAT negative' },
    chartGestation: { status: 'yes' },
    haemPlan: { status: 'no' },
    datLeaflet: { status: 'na' }
  }
});
assert.ok(templated.indexOf('Jaundice.\nSerum bilirubin 210 at 40 hours, below the treatment line on the chart used.') !== -1, 'jaundice data is written once under the first problem that uses it');
assert.strictEqual(templated.split('Baby blood group and DAT: O positive, DAT negative.').length, 2, 'a shared answer prints once');
assert.ok(templated.indexOf('Plotted on the chart for birth gestation.') !== -1, 'confirmed item is written');
assert.ok(templated.indexOf('Antenatal haematology and obstetric plan not yet checked.') !== -1, 'not yet is written');
assert.strictEqual(templated.indexOf('DAT-positive parent leaflet'), -1, 'N/A is left out');
assert.ok(templated.indexOf('Infant of diabetic mother.\nBlood glucose: 2.9 mmol/L on a meter at 09:00.') !== -1, 'glucose is written under the problem that uses it when no glucose pathway is ticked');
assert.strictEqual(templated.split('breastfeeds').length, 2, 'feeding is not repeated under problems');

var emptyTemplate = review.buildNote({ problems: [{ type: 'murmur' }] });
assert.strictEqual(emptyTemplate.split('Murmur.').length, 2, 'an unfilled checklist adds no empty heading below the list');

var lpFirst = review.buildNote({ pathways: ['late-preterm'], problems: [{ type: 'jaundice' }, { type: 'late-preterm' }], jaundice: 'none', weightToday: '2.1' });
assert.ok(lpFirst.indexOf('Jaundice.\nNo clinical jaundice.') !== -1, 'jaundice moves to the jaundice problem when it is listed first');
assert.strictEqual(lpFirst.split('No clinical jaundice.').length, 2, 'jaundice is not repeated under late preterm');
assert.ok(lpFirst.indexOf('Weight today 2.1 kg.') !== -1, 'weight still written once');

assert.strictEqual(review.sourceText(review.normalize({ feedMode: 'formula', feedAmount: '30' }), 'feeding'), 'formula, 30 ml.', 'feeding prompt reads from the feeding panel');
assert.strictEqual(review.sourceText(review.normalize({}), 'glucose'), '', 'empty panels show nothing to autofill');

console.log('postnatal daily review tests passed');
