/*
 * Postnatal daily review — state, BadgerNet prose, and the page.
 *
 * Documentation aid only. Pure functions format clinician-entered findings.
 * They must not interpret observations, calculate or classify gestation,
 * apply thresholds, diagnose, or recommend management.
 * Pure functions are exported for review.testcases.js. The page boots only
 * in a browser, on the postnatal daily review document.
 */
(function (root, factory) {
  var content = (typeof module === 'object' && module.exports)
    ? require('./content.js')
    : root.PostnatalDailyReviewContent;
  var api = factory(content);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PostnatalDailyReview = api;
  if (typeof document !== 'undefined' && document.body && document.body.classList.contains('postnatal-daily-review-app')) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { api.mount(); });
    } else {
      api.mount();
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (content) {
  'use strict';

  var DRAFT_KEY = 'postnatal-daily-review-draft';

  function emptyState() {
    return {
      step: 'context',
      place: '',
      placeOther: '',
      gestationAtBirth: '',
      ageMode: 'manual',
      birthAt: '',
      reviewAt: '',
      ageDays: '',
      ageHours: '',
      pathways: [],
      sinceLast: '',
      feedMode: '',
      latch: '',
      feedAmount: '',
      feedFrequency: '',
      feedDuration: '',
      topUpAmount: '',
      lastFeed: '',
      answers: {},
      multi: {},
      hypoReasonOther: '',
      hypoSymptomOther: '',
      parentalConcern: '',
      parentalWords: '',
      midwifeConcern: '',
      midwifeWords: '',
      exam: {},
      obs: { temp: '', hr: '', rr: '', sats: '', oxygen: '', fio2: '' },
      glucoses: [{ time: '', value: '', method: '' }],
      temps: [{ time: '', value: '' }],
      thermalCare: '',
      tempEnvironment: '',
      tempWeaning: '',
      antibioticDay: '',
      antibioticWhat: '',
      cultureStatus: '',
      cultureDetail: '',
      bloodResults: '',
      sepsisCourse: '',
      jaundice: '',
      jaundiceValue: '',
      jaundiceAgeHours: '',
      jaundicePlot: '',
      weightToday: '',
      lpNote: '',
      plan: '',
      reviewWhen: ''
    };
  }

  function normalize(partial) {
    var state = emptyState();
    if (!partial || typeof partial !== 'object') return state;
    var nested = { obs: 1, answers: 1, multi: 1, exam: 1 };
    Object.keys(partial).forEach(function (key) {
      if (partial[key] === undefined) return;
      if (nested[key] && partial[key] && typeof partial[key] === 'object' && !Array.isArray(partial[key])) {
        state[key] = Object.assign({}, state[key], partial[key]);
      } else {
        state[key] = partial[key];
      }
    });
    if (!Array.isArray(state.pathways)) state.pathways = [];
    if (!Array.isArray(state.glucoses) || !state.glucoses.length) {
      state.glucoses = [{ time: '', value: '', method: '' }];
    }
    if (!Array.isArray(state.temps) || !state.temps.length) {
      state.temps = [{ time: '', value: '' }];
    }
    if (!state.answers) state.answers = {};
    if (!state.multi) state.multi = {};
    if (!state.exam) state.exam = {};
    return state;
  }

  function num(value) {
    if (value == null || value === '') return null;
    var n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function ageInHours(partial) {
    var state = partial && (partial.obs || partial.pathways) ? partial : normalize(partial);
    if (state.ageMode === 'manual') {
      if (state.ageDays === '' && state.ageHours === '') return null;
      return (num(state.ageDays) || 0) * 24 + (num(state.ageHours) || 0);
    }
    if (!state.birthAt || !state.reviewAt) return null;
    var born = Date.parse(state.birthAt);
    var seen = Date.parse(state.reviewAt);
    if (!Number.isFinite(born) || !Number.isFinite(seen) || seen < born) return null;
    return (seen - born) / 36e5;
  }

  function hoursWord(hours) {
    var rounded = Math.round(hours * 10) / 10;
    var text = String(rounded);
    return text + (rounded === 1 ? ' hour' : ' hours');
  }

  function shortAge(hours) {
    if (hours == null) return '';
    var totalMinutes = Math.round(hours * 60);
    var days = Math.floor(totalMinutes / (24 * 60));
    var rem = (totalMinutes - days * 24 * 60) / 60;
    if (days <= 0) return hoursWord(totalMinutes / 60);
    if (rem < 0.05) return days + (days === 1 ? ' day' : ' days');
    return days + (days === 1 ? ' day ' : ' days ') + hoursWord(rem);
  }

  function ensurePeriod(text) {
    var trimmed = String(text || '').trim();
    if (!trimmed) return '';
    return /[.!?]$/.test(trimmed) ? trimmed : trimmed + '.';
  }

  function cleanLines(lines) {
    return lines.map(function (line) { return String(line || '').trim(); }).filter(Boolean).join('\n');
  }

  function listPhrase(items) {
    if (!items.length) return '';
    if (items.length === 1) return items[0];
    if (items.length === 2) return items[0] + ' and ' + items[1];
    return items.slice(0, -1).join(', ') + ', and ' + items[items.length - 1];
  }

  function hasPathway(state, id) {
    return Array.isArray(state.pathways) && state.pathways.indexOf(id) !== -1;
  }

  function glucoseOwner(state) {
    var lp = hasPathway(state, 'late-preterm');
    var hypo = hasPathway(state, 'hypoglycaemia');
    if (lp && hypo) return 'both';
    if (lp) return 'late-preterm';
    if (hypo) return 'hypoglycaemia';
    return '';
  }

  function tempOwner(state) {
    if (hasPathway(state, 'temperature')) return 'temperature';
    if (hasPathway(state, 'late-preterm')) return 'late-preterm';
    return '';
  }

  function placeLabel(state) {
    if (state.place === 'postnatal') return 'postnatal ward';
    if (state.place === 'tc') return 'transitional care';
    if (state.place === 'other') return (state.placeOther || '').trim() || 'ward';
    return '';
  }

  function openingLine(state) {
    var place = placeLabel(state);
    var age = ageInHours(state);
    if (!place && age == null) return '';
    var opening = 'Reviewed';
    if (place === 'transitional care') opening += ' on transitional care';
    else if (place) opening += ' on the ' + place;
    if (age != null) opening += ' at ' + shortAge(age) + ' of age';
    return opening + '.';
  }

  function feedingSentence(state) {
    var modes = {
      breast: 'breastfeeds',
      expressed: 'expressed breast milk',
      formula: 'formula',
      mixed: 'mixed feeding',
      tube: 'tube feeds'
    };
    var bits = [];
    if (modes[state.feedMode]) bits.push(modes[state.feedMode]);
    if (state.latch === 'good') bits.push('latching well');
    if (state.latch === 'poor') bits.push('poor latch');
    if (state.feedDuration && state.feedDuration.trim()) bits.push(state.feedDuration.trim());
    if (state.feedAmount) bits.push(state.feedAmount + ' ml');
    if (state.feedFrequency && state.feedFrequency.trim()) bits.push(state.feedFrequency.trim());
    if (state.answers.topUps === 'yes') bits.push('with top-ups' + (state.topUpAmount ? ' (' + state.topUpAmount + ' ml)' : ''));
    var problems = state.multi.feedProblems || [];
    if (problems.indexOf('vomiting') !== -1) bits.push('vomiting');
    if (problems.indexOf('residuals') !== -1) bits.push('large gastric residuals');
    if (problems.indexOf('sleepy') !== -1) bits.push('sleepy at the breast');
    if (problems.indexOf('refusal') !== -1) bits.push('feed refusal');
    if (state.lastFeed && state.lastFeed.trim()) bits.push('last feed ' + state.lastFeed.trim());
    if (!bits.length) return '';
    return 'Feeding: ' + bits.join(', ') + '.';
  }

  function parentConcernSentence(state) {
    if (state.parentalConcern === 'none') return 'No parental concern.';
    if (state.parentalConcern === 'concerned') {
      var words = (state.parentalWords || '').trim();
      return words ? 'Parental concern: ' + words : 'Parents are concerned.';
    }
    return '';
  }

  function midwifeConcernSentence(state) {
    if (state.midwifeConcern === 'yes') {
      return state.midwifeWords && state.midwifeWords.trim()
        ? 'Midwife concern: ' + state.midwifeWords.trim()
        : 'The midwife is concerned.';
    }
    return '';
  }

  function obsSentence(state) {
    var obs = state.obs || {};
    var bits = [];
    if (obs.temp) bits.push('Temperature: ' + obs.temp + '\u00B0C');
    if (obs.hr) bits.push('HR: ' + obs.hr);
    if (obs.rr) bits.push('RR: ' + obs.rr);
    if (obs.sats) {
      var sats = 'Sats: ' + obs.sats + '%';
      if (obs.oxygen === 'air') sats += ' in air';
      if (obs.oxygen === 'oxygen') {
        var fio2 = num(obs.fio2);
        sats += fio2 != null ? ' in ' + fio2 + '% oxygen' : ' in oxygen';
      }
      bits.push(sats);
    } else if (obs.oxygen === 'oxygen') {
      var fio2Only = num(obs.fio2);
      bits.push(fio2Only != null ? 'Oxygen: ' + fio2Only + '%' : 'Oxygen');
    } else if (obs.oxygen === 'air') {
      bits.push('Breathing air');
    }
    if (!bits.length) return '';
    return bits.join('. ') + '.';
  }

  function examRow(state, id) {
    return state.exam && state.exam[id] ? state.exam[id] : null;
  }

  function findingsActive(row) {
    return !!row && row.status !== 'nad' && row.status !== 'not';
  }

  function selectedOptions(control, choices) {
    if (control.type === 'text') {
      var text = choices ? String(choices[control.id] || '').trim() : '';
      if (!text) return [];
      return [{ value: text, prose: ensurePeriod(text), abnormal: !!control.abnormal }];
    }
    var chosen = choices ? choices[control.id] : undefined;
    return (control.options || []).filter(function (option) {
      if (control.type === 'multi') return Array.isArray(chosen) && chosen.indexOf(option.value) !== -1;
      return chosen === option.value;
    });
  }

  function findingsProse(system, row) {
    var abnormal = [];
    var usual = [];
    var note = '';
    var choices = row.choices || {};
    system.controls.forEach(function (control) {
      selectedOptions(control, choices).forEach(function (option) {
        if (!option.prose) return;
        if (option.abnormal) abnormal.push(option.prose);
        else usual.push(option.prose);
      });
    });
    if (row.note && String(row.note).trim()) note = ensurePeriod(row.note);
    return { abnormal: abnormal, usual: usual, note: note };
  }

  function formatExamBlock(system, split) {
    var sentences = split.abnormal.concat(split.usual);
    if (split.note) sentences.push(split.note);
    if (!sentences.length) return '';
    return system.label + ': ' + sentences.join(' ');
  }

  function notExaminedSentence(labels) {
    var phrase = listPhrase(labels);
    return phrase.charAt(0).toUpperCase() + phrase.slice(1) + ' not examined this review.';
  }

  function examinationText(state) {
    var lines = [];
    var abnormalBlocks = [];
    var otherBlocks = [];
    var skipped = [];
    content.EXAM_SYSTEMS.forEach(function (system) {
      var row = examRow(state, system.id);
      if (!row) return;
      if (row.status === 'not') {
        var label = system.shortLabel.charAt(0).toLowerCase() + system.shortLabel.slice(1);
        skipped.push(label);
        return;
      }
      if (row.status === 'nad') {
        otherBlocks.push(system.label + ': ' + system.nad);
        return;
      }
      var split = findingsProse(system, row);
      var block = formatExamBlock(system, split);
      if (!block) return;
      if (split.abnormal.length) abnormalBlocks.push(block);
      else otherBlocks.push(block);
    });
    var observations = obsSentence(state);
    if (observations) lines.push(observations);
    lines = lines.concat(abnormalBlocks).concat(otherBlocks);
    if (skipped.length) lines.push(notExaminedSentence(skipped));
    return cleanLines(lines);
  }

  function formatGlucose(row) {
    var sentence = row.value + ' mmol/L';
    if (row.method === 'gas') sentence += ' on the blood gas';
    if (row.method === 'meter') sentence += ' on a meter';
    if (row.time) sentence += ' at ' + row.time;
    return sentence;
  }

  function filledGlucoses(state) {
    return (state.glucoses || []).filter(function (row) { return row && String(row.value || '').trim(); });
  }

  function glucoseSentence(state, owner) {
    var rows = filledGlucoses(state);
    if (!rows.length) return '';
    var prefix = owner === 'both'
      ? 'Blood glucose, recorded for the late preterm pathway and the hypoglycaemia pathway: '
      : 'Blood glucose: ';
    return prefix + rows.map(formatGlucose).join(', ') + '.';
  }

  function filledTemps(state) {
    return (state.temps || []).filter(function (row) { return row && String(row.value || '').trim(); });
  }

  function temperatureSentence(state) {
    var rows = filledTemps(state);
    if (!rows.length) return '';
    var bits = rows.map(function (row) {
      var bit = row.value + '\u00B0C';
      if (row.time) bit += ' at ' + row.time;
      return bit;
    });
    if (bits.length === 1) return 'Temperature ' + bits[0] + '.';
    return 'Temperatures: ' + bits.join(', ') + '.';
  }

  function thermalCareSentence(state) {
    var match = content.THERMAL_CARE.filter(function (item) { return item.value === state.thermalCare; })[0];
    return match ? match.prose : '';
  }

  function jaundiceSentence(state) {
    if (state.jaundice === 'none') return 'No clinical jaundice.';
    if (state.jaundice === 'clinical') return 'Clinical jaundice documented.';
    if (state.jaundice === 'tcb' || state.jaundice === 'tsb') {
      var name = state.jaundice === 'tcb' ? 'Transcutaneous bilirubin' : 'Serum bilirubin';
      if (!state.jaundiceValue) return name + ' documented.';
      var sentence = name + ' ' + state.jaundiceValue;
      if (state.jaundiceAgeHours) sentence += ' at ' + state.jaundiceAgeHours + ' hours';
      if (state.jaundicePlot === 'below') sentence += ', below the treatment line on the chart used';
      if (state.jaundicePlot === 'on') sentence += ', on the treatment line on the chart used';
      if (state.jaundicePlot === 'above') sentence += ', above the treatment line on the chart used';
      return sentence + '.';
    }
    return '';
  }

  function antibioticSentence(state) {
    var day = String(state.antibioticDay || '').trim();
    var what = String(state.antibioticWhat || '').trim();
    if (!day && !what) return '';
    var bits = [];
    if (day) {
      bits.push(/^day\b/i.test(day) ? 'Antibiotics ' + day : 'Antibiotics day ' + day);
    } else {
      bits.push('Antibiotics');
    }
    if (what) bits.push(what);
    var text = bits.join(', ');
    return ensurePeriod(text);
  }

  function cultureSentence(state) {
    if (state.cultureStatus === 'pending') return 'Blood culture pending.';
    if (state.cultureStatus === 'no-growth') return 'Blood culture no growth to date.';
    if (state.cultureStatus === 'growth') {
      var detail = String(state.cultureDetail || '').trim();
      return detail ? ensurePeriod('Blood culture: ' + detail) : 'Blood culture growth documented.';
    }
    return '';
  }

  function sepsisSection(state) {
    if (!hasPathway(state, 'sepsis')) return [];
    var lines = ['Suspected sepsis.'];
    lines.push(antibioticSentence(state));
    lines.push(cultureSentence(state));
    if (state.bloodResults && state.bloodResults.trim()) lines.push(ensurePeriod(state.bloodResults.trim()));
    if (state.sepsisCourse && state.sepsisCourse.trim()) lines.push(ensurePeriod(state.sepsisCourse.trim()));
    var body = cleanLines(lines.slice(1));
    if (!body) return ['Suspected sepsis.'];
    return ['Suspected sepsis.', body];
  }

  function latePretermSection(state) {
    if (!hasPathway(state, 'late-preterm')) return [];
    var lines = ['Late preterm pathway.'];
    lines.push(jaundiceSentence(state));
    if (state.weightToday && String(state.weightToday).trim()) {
      lines.push('Weight today ' + String(state.weightToday).trim() + (/kg$/i.test(String(state.weightToday).trim()) ? '.' : ' kg.'));
    }
    if (tempOwner(state) === 'temperature') {
      lines.push('Thermal care documented with temperature management below.');
    } else {
      lines.push(thermalCareSentence(state));
      if (tempOwner(state) === 'late-preterm') lines.push(temperatureSentence(state));
    }
    if (glucoseOwner(state) === 'late-preterm') lines.push(glucoseSentence(state, 'late-preterm'));
    if (state.lpNote && state.lpNote.trim()) lines.push(ensurePeriod(state.lpNote.trim()));
    var body = cleanLines(lines.slice(1));
    if (!body) return ['Late preterm pathway.'];
    return ['Late preterm pathway.', body];
  }

  function temperatureSection(state) {
    if (!hasPathway(state, 'temperature')) return [];
    var lines = ['Temperature management.'];
    lines.push(thermalCareSentence(state));
    lines.push(temperatureSentence(state));
    if (state.tempEnvironment && state.tempEnvironment.trim()) {
      lines.push(ensurePeriod(state.tempEnvironment.trim()));
    }
    if (state.tempWeaning && state.tempWeaning.trim()) {
      lines.push(ensurePeriod(state.tempWeaning.trim()));
    }
    var body = cleanLines(lines.slice(1));
    if (!body) return ['Temperature management.'];
    return ['Temperature management.', body];
  }

  function hypoReasonSentences(state) {
    var selected = state.multi.hypoReasons || [];
    var bits = [];
    content.HYPO_REASONS.forEach(function (reason) {
      if (selected.indexOf(reason.value) === -1) return;
      if (reason.value === 'other') {
        var other = String(state.hypoReasonOther || '').trim();
        bits.push(other ? ensurePeriod(other) : 'Other hypoglycaemia reason documented.');
        return;
      }
      bits.push(reason.prose);
    });
    return bits;
  }

  function hypoSymptomSentence(state) {
    var selected = state.multi.hypoSymptoms || [];
    if (!selected.length) return '';
    if (selected.indexOf('none') !== -1) return 'No symptoms documented.';
    var labels = content.HYPO_SYMPTOMS.filter(function (item) {
      return item.value !== 'none' && selected.indexOf(item.value) !== -1;
    }).map(function (item) {
      if (item.value === 'other') return String(state.hypoSymptomOther || '').trim() || 'other';
      return item.label.toLowerCase();
    });
    if (!labels.length) return '';
    return 'Symptoms documented: ' + labels.join(', ') + '.';
  }

  function hypoglycaemiaSection(state) {
    if (!hasPathway(state, 'hypoglycaemia')) return [];
    var lines = ['Hypoglycaemia pathway.'];
    lines = lines.concat(hypoReasonSentences(state));
    lines.push(hypoSymptomSentence(state));
    var owner = glucoseOwner(state);
    if (owner === 'hypoglycaemia' || owner === 'both') lines.push(glucoseSentence(state, owner));
    var body = cleanLines(lines.slice(1));
    if (!body) return ['Hypoglycaemia pathway.'];
    return ['Hypoglycaemia pathway.', body];
  }

  function planItems(state) {
    var bits = [];
    if (state.plan && state.plan.trim()) {
      state.plan.split(/\n+/).forEach(function (line) {
        var trimmed = String(line || '').trim().replace(/^\d+\.\s*/, '');
        if (trimmed) bits.push(ensurePeriod(trimmed));
      });
    }
    if (state.reviewWhen && state.reviewWhen.trim()) bits.push('Review at ' + state.reviewWhen.trim() + '.');
    return bits;
  }

  function planParagraph(state) {
    var bits = planItems(state);
    if (!bits.length) return '';
    if (bits.length === 1) return 'Plan: ' + bits[0];
    return 'Plan:\n' + bits.map(function (bit, index) {
      return (index + 1) + '. ' + bit;
    }).join('\n');
  }

  function buildNote(partial) {
    var state = normalize(partial);
    var blocks = [];
    blocks.push(openingLine(state));
    if (state.gestationAtBirth && String(state.gestationAtBirth).trim()) {
      blocks.push('Gestation at birth ' + String(state.gestationAtBirth).trim() + '.');
    }
    if (state.sinceLast && state.sinceLast.trim()) blocks.push(ensurePeriod(state.sinceLast.trim()));
    blocks.push(feedingSentence(state));
    blocks.push(parentConcernSentence(state));
    blocks.push(midwifeConcernSentence(state));
    blocks.push(examinationText(state));
    blocks = blocks.concat(sepsisSection(state));
    blocks = blocks.concat(latePretermSection(state));
    blocks = blocks.concat(temperatureSection(state));
    blocks = blocks.concat(hypoglycaemiaSection(state));
    blocks.push(planParagraph(state));
    return cleanLines(blocks);
  }

  function missingRequired(state) {
    return {
      context: ageInHours(state) == null,
      pathways: !state.pathways.length
    };
  }

  function visiblePlanPhrases(state) {
    return content.PLAN_PHRASES.filter(function (item) {
      if (!item.pathways || !item.pathways.length) return true;
      return item.pathways.some(function (id) { return hasPathway(state, id); });
    });
  }

  /* ---------------------------------------------------------------- page */

  var state = emptyState();

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function mount() {
    var draft = null;
    try {
      var raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) draft = normalize(JSON.parse(raw));
    } catch (error) { draft = null; }
    if (draft) state = draft;
    var app = document.getElementById('review-app');
    app.addEventListener('click', onClick);
    app.addEventListener('input', onInput);
    window.addEventListener('scroll', onPageScroll, { passive: true });
    paint();
  }

  function persist() {
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(state)); } catch (error) { /* private mode */ }
  }

  function paint() {
    state.noteEdits = {};
    var y = window.scrollY;
    document.getElementById('step-panel').innerHTML = content.STEPS.map(function (step, index) {
      return '<section id="section-' + step.id + '" class="review-section" aria-labelledby="section-title-' + step.id + '">' +
        '<h2 class="section-title" id="section-title-' + step.id + '"><span class="step-index">' + (index + 1) + '</span>' + esc(step.label) + '</h2>' +
        stepHtml(step.id) + '</section>';
    }).join('');
    refreshChrome();
    window.scrollTo(0, y);
    syncCurrentFromScroll();
  }

  function refreshChrome() {
    var bar = document.getElementById('step-bar');
    if (bar) bar.innerHTML = stepBarHtml();
    refreshHints();
    renderStatus();
    renderNote();
    syncVisibility();
  }

  var scrollTick = false;

  function onPageScroll() {
    if (scrollTick) return;
    scrollTick = true;
    window.requestAnimationFrame(function () {
      scrollTick = false;
      syncCurrentFromScroll();
    });
  }

  function syncCurrentFromScroll() {
    var sections = document.querySelectorAll('.review-section');
    if (!sections.length) return;
    var current = sections[0];
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].getBoundingClientRect().top <= 80) current = sections[i];
    }
    var id = current.id.replace(/^section-/, '');
    if (id !== state.step) markCurrent(id);
  }

  function markCurrent(step) {
    state.step = step;
    document.querySelectorAll('.step-link').forEach(function (link) {
      link.classList.toggle('is-current', link.dataset.step === step);
    });
  }

  function stepBarHtml() {
    var missing = missingRequired(state);
    return content.STEPS.map(function (step, index) {
      var className = 'step-link' + (state.step === step.id ? ' is-current' : '');
      if ((step.id === 'context' && missing.context) || (step.id === 'pathways' && missing.pathways)) className += ' is-incomplete';
      return '<button type="button" class="' + className + '" data-step="' + step.id + '"><span class="step-index">' + (index + 1) + '</span>' + esc(step.label) + '</button>';
    }).join('');
  }

  function renderStatus() {
    var el = document.getElementById('status-strip');
    if (!el) return;
    var age = ageInHours(state);
    var place = placeLabel(state);
    var left = 'Documentation draft';
    if (state.gestationAtBirth || age != null || place) {
      left = [String(state.gestationAtBirth || '').trim(), age != null ? shortAge(age) : '', place].filter(Boolean).join(' · ');
    }
    var names = content.PATHWAYS.filter(function (item) {
      return hasPathway(state, item.id);
    }).map(function (item) { return item.label; });
    var pathwayLine = names.length ? names.join(', ') : 'No pathway selected';
    el.innerHTML = '<p class="status-main"><strong>' + esc(left) + '</strong>' +
      '<span>' + esc(pathwayLine) + '</span></p>' +
      '<p class="status-count-note">Selected pathways only. Not a risk score or management recommendation.</p>';
  }

  function renderNote() {
    var el = document.getElementById('out-note');
    if (!el) return;
    if (document.activeElement === el) return;
    var text = state.noteEdits && Object.prototype.hasOwnProperty.call(state.noteEdits, 'note')
      ? state.noteEdits.note
      : buildNote(state);
    el.textContent = text || 'Nothing for this box yet.';
    el.classList.toggle('is-empty', !text);
  }

  function show(id, on) {
    var el = document.getElementById(id);
    if (el) el.hidden = !on;
  }

  function refreshHints() {
    var age = ageInHours(state);
    var ageEl = document.getElementById('age-readout');
    if (ageEl) {
      ageEl.textContent = age == null
        ? 'Age appears here once the times, or a manual age, are filled in.'
        : shortAge(age) + ' old.';
    }
    var missing = missingRequired(state);
    show('context-needed', missing.context);
    show('pathways-needed', missing.pathways);
  }

  function syncVisibility() {
    show('place-other-wrap', state.place === 'other');
    show('age-times', state.ageMode !== 'manual');
    show('age-manual', state.ageMode === 'manual');
    show('feed-latch-wrap', state.feedMode === 'breast' || state.feedMode === 'mixed');
    show('feed-duration-wrap', state.feedMode === 'breast' || state.feedMode === 'mixed');
    show('feed-amount-wrap', state.feedMode === 'formula' || state.feedMode === 'expressed' || state.feedMode === 'mixed' || state.feedMode === 'tube');
    show('topup-amount-wrap', state.answers.topUps === 'yes');
    show('parent-words-wrap', state.parentalConcern === 'concerned');
    show('midwife-words-wrap', state.midwifeConcern === 'yes');
    show('culture-detail-wrap', state.cultureStatus === 'growth');
    show('jaundice-detail', state.jaundice === 'tcb' || state.jaundice === 'tsb');
    show('hypo-reason-other-wrap', (state.multi.hypoReasons || []).indexOf('other') !== -1);
    show('hypo-symptom-other-wrap', (state.multi.hypoSymptoms || []).indexOf('other') !== -1);
  }

  function onInput(event) {
    var target = event.target;
    var noteBox = target.closest ? target.closest('[data-note-box]') : null;
    if (noteBox && noteBox.dataset.noteBox) {
      state.noteEdits = state.noteEdits || {};
      state.noteEdits[noteBox.dataset.noteBox] = noteBox.textContent;
      persist();
      return;
    }
    state.noteEdits = {};
    if (target.dataset.field) state[target.dataset.field] = target.value;
    else if (target.dataset.obs) state.obs[target.dataset.obs] = target.value;
    else if (target.dataset.glucoseField) {
      var glucoseRow = state.glucoses[Number(target.dataset.index)];
      if (glucoseRow) glucoseRow[target.dataset.glucoseField] = target.value;
    } else if (target.dataset.tempField) {
      var tempRow = state.temps[Number(target.dataset.index)];
      if (tempRow) tempRow[target.dataset.tempField] = target.value;
    } else if (target.dataset.examText) {
      var examText = ensureExam(target.dataset.exam);
      if (!examText.choices) examText.choices = {};
      examText.choices[target.dataset.examText] = target.value;
      if (examText.status) examText.status = '';
    } else if (target.dataset.examNote) {
      var exam = ensureExam(target.dataset.examNote);
      exam.note = target.value;
      exam.noteOpen = true;
      if (exam.status && exam.note.trim()) exam.status = '';
    } else return;
    persist();
    refreshChrome();
  }

  function onClick(event) {
    var button = event.target.closest('button');
    if (!button || !document.getElementById('review-app').contains(button)) return;
    if (button.dataset.step) { go(button.dataset.step); return; }
    if (button.dataset.action) { runAction(button.dataset.action, button); return; }
    if (button.dataset.pathway) { togglePathway(button.dataset.pathway); return; }
    if (button.dataset.bind) { toggleBind(button.dataset.bind, button.dataset.value); return; }
    if (button.dataset.answer) { toggleAnswer(button.dataset.answer, button.dataset.value); return; }
    if (button.dataset.multi) { toggleMulti(button.dataset.multi, button.dataset.value); return; }
    if (button.dataset.examStatus) { toggleExamStatus(button.dataset.exam, button.dataset.examStatus); return; }
    if (button.dataset.examNoteToggle) { toggleExamNote(button.dataset.examNoteToggle); return; }
    if (button.hasAttribute('data-exam-choice')) { toggleExamChoice(button); return; }
    if (button.dataset.obsChoice) { toggleObs(button.dataset.obsChoice, button.dataset.value); return; }
    if (button.dataset.glucoseMethod) { toggleGlucoseMethod(button); return; }
    if (button.dataset.copy) { copyText(button); return; }
    if (button.dataset.phrase) { appendPhrase(button.dataset.phrase); return; }
  }

  function go(step) {
    state.step = step;
    var target = document.getElementById('section-' + step);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    markCurrent(step);
  }

  function runAction(action, button) {
    if (action === 'new-baby') document.getElementById('confirm-new').hidden = false;
    if (action === 'keep-baby') document.getElementById('confirm-new').hidden = true;
    if (action === 'clear-baby') {
      state = emptyState();
      try { sessionStorage.removeItem(DRAFT_KEY); } catch (error) { /* ignore */ }
      document.getElementById('confirm-new').hidden = true;
      paint();
      window.scrollTo(0, 0);
    }
    if (action === 'add-glucose') {
      state.glucoses.push({ time: '', value: '', method: '' });
      persist();
      paint();
    }
    if (action === 'remove-glucose' && button) {
      var removeGlucose = Number(button.dataset.index);
      if (state.glucoses.length > 1 && removeGlucose >= 0) state.glucoses.splice(removeGlucose, 1);
      persist();
      paint();
    }
    if (action === 'add-temp') {
      state.temps.push({ time: '', value: '' });
      persist();
      paint();
    }
    if (action === 'remove-temp' && button) {
      var removeTemp = Number(button.dataset.index);
      if (state.temps.length > 1 && removeTemp >= 0) state.temps.splice(removeTemp, 1);
      persist();
      paint();
    }
  }

  function togglePathway(id) {
    var index = state.pathways.indexOf(id);
    if (index === -1) state.pathways.push(id);
    else state.pathways.splice(index, 1);
    persist();
    paint();
  }

  function toggleBind(key, value) {
    if (key === 'ageMode') state.ageMode = value;
    else state[key] = state[key] === value ? '' : value;
    persist();
    paint();
  }

  function toggleAnswer(key, value) {
    state.answers[key] = state.answers[key] === value ? '' : value;
    persist();
    paint();
  }

  function toggleMulti(key, value) {
    var list = Array.isArray(state.multi[key]) ? state.multi[key].slice() : [];
    var index = list.indexOf(value);
    if (index === -1) {
      list.push(value);
      if ((key === 'feedProblems' || key === 'hypoSymptoms') && value !== 'none') {
        list = list.filter(function (item) { return item !== 'none'; });
      }
      if ((key === 'feedProblems' || key === 'hypoSymptoms') && value === 'none') list = ['none'];
    } else list.splice(index, 1);
    state.multi[key] = list;
    persist();
    paint();
  }

  function ensureExam(id) {
    if (!state.exam[id]) state.exam[id] = { status: '', note: '', noteOpen: false, choices: {} };
    if (!state.exam[id].choices) state.exam[id].choices = {};
    if (state.exam[id].noteOpen == null) {
      state.exam[id].noteOpen = !!(state.exam[id].note && String(state.exam[id].note).trim());
    }
    return state.exam[id];
  }

  function toggleExamStatus(id, status) {
    var row = ensureExam(id);
    row.status = row.status === status ? '' : status;
    if (row.status) {
      row.choices = {};
      row.note = '';
      row.noteOpen = false;
    }
    persist();
    paint();
  }

  function toggleExamChoice(button) {
    var row = ensureExam(button.dataset.exam);
    var current = row.choices[button.dataset.control];
    row.choices[button.dataset.control] = current === button.dataset.value ? '' : button.dataset.value;
    row.status = '';
    persist();
    paint();
  }

  function toggleExamNote(id) {
    var row = ensureExam(id);
    row.noteOpen = !row.noteOpen;
    if (row.noteOpen) row.status = '';
    persist();
    paint();
  }

  function toggleObs(key, value) {
    state.obs[key] = state.obs[key] === value ? '' : value;
    if (key === 'oxygen' && state.obs.oxygen !== 'oxygen') state.obs.fio2 = '';
    persist();
    paint();
  }

  function toggleGlucoseMethod(button) {
    var row = state.glucoses[Number(button.dataset.index)];
    if (!row) return;
    row.method = row.method === button.dataset.glucoseMethod ? '' : button.dataset.glucoseMethod;
    persist();
    paint();
  }

  function appendPhrase(id) {
    var phrase = content.PLAN_PHRASES.filter(function (item) { return item.id === id; })[0];
    if (!phrase || !phrase.text) return;
    var line = phrase.text;
    if (state.plan.indexOf(line) === -1) {
      state.plan = state.plan.trim() ? state.plan.trim() + '\n' + line : line;
    }
    persist();
    paint();
  }

  function noteBoxText() {
    var el = document.getElementById('out-note');
    if (!el) return '';
    var text = String(el.textContent || '').trim();
    if (!text || text === 'Nothing for this box yet.') return '';
    return text;
  }

  function copyText(button) {
    var text = noteBoxText();
    if (!text) return;
    var done = function () { flash(button); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, button); });
    } else fallbackCopy(text, button);
  }

  function fallbackCopy(text, button) {
    var area = document.createElement('textarea');
    area.value = text;
    document.body.appendChild(area);
    area.select();
    try { document.execCommand('copy'); flash(button); } catch (error) { /* leave the text visible */ }
    document.body.removeChild(area);
  }

  function flash(button) {
    if (!button) return;
    var previous = button.textContent;
    button.textContent = 'Copied';
    window.setTimeout(function () { button.textContent = previous; }, 1400);
  }

  function fieldLabel(text) {
    return '<span class="field-label">' + esc(text) + '</span>';
  }

  function choiceButtons(attr, name, options, current) {
    return '<div class="choices" role="group" aria-label="' + esc(name) + '">' + options.map(function (option) {
      var on = current === option.value;
      var className = 'choice' + (on ? ' is-selected' : '') + (on && option.abnormal ? ' is-abnormal' : '');
      return '<button type="button" class="' + className + '" ' + attr + '="' + esc(name) + '" data-value="' + esc(option.value) + '">' + esc(option.label) + '</button>';
    }).join('') + '</div>';
  }

  function multiButtons(name, options, current) {
    var selected = current || [];
    return '<div class="choices" role="group" aria-label="' + esc(name) + '">' + options.map(function (option) {
      var on = selected.indexOf(option.value) !== -1;
      var className = 'choice' + (on ? ' is-selected' : '') + (on && option.abnormal ? ' is-abnormal' : '');
      return '<button type="button" class="' + className + '" data-multi="' + esc(name) + '" data-value="' + esc(option.value) + '">' + esc(option.label) + '</button>';
    }).join('') + '</div>';
  }

  function yn(key, label, yes, no) {
    var current = state.answers[key] || '';
    function button(value, text) {
      var on = current === value;
      var className = 'yn-btn' + (on ? ' is-selected' : '') + (on && value === 'no' ? ' is-normal' : '');
      return '<button type="button" class="' + className + '" data-answer="' + esc(key) + '" data-value="' + value + '">' + esc(text) + '</button>';
    }
    return '<div class="ask"><div class="field">' + fieldLabel(label) + '<div class="yn" role="group">' + button('yes', yes || 'Yes') + button('no', no || 'No') + '</div></div></div>';
  }

  function bindChoices(key, label, options) {
    return '<div class="field">' + fieldLabel(label) + choiceButtons('data-bind', key, options, state[key]) + '</div>';
  }

  function input(key, label, value, options) {
    options = options || {};
    return '<label class="field">' + fieldLabel(label) + '<input ' + (options.wide ? '' : 'class="num-input"') + ' type="' + (options.type || 'text') + '" inputmode="' + (options.mode || 'text') + '" data-field="' + esc(key) + '" value="' + esc(value || '') + '" autocomplete="off"' + (options.placeholder ? ' placeholder="' + esc(options.placeholder) + '"' : '') + '></label>';
  }

  function area(key, label, value, rows) {
    return '<label class="field field--stack">' + fieldLabel(label) + '<textarea data-field="' + esc(key) + '" rows="' + (rows || 4) + '" autocomplete="off">' + esc(value || '') + '</textarea></label>';
  }

  function groupCard(title, inner) {
    return '<article class="group-card">' +
      (title ? '<h2 class="group-title">' + esc(title) + '</h2>' : '') +
      '<div class="group-body">' + inner + '</div></article>';
  }

  function half(html) {
    return '<div class="half">' + html + '</div>';
  }

  function stepHtml(step) {
    if (step === 'context') return contextHtml();
    if (step === 'progress') return progressHtml();
    if (step === 'pathways') return pathwaysHtml();
    if (step === 'examination') return examinationHtml();
    return planHtml();
  }

  function contextHtml() {
    return '<section class="step">' +
      '<p id="context-needed" class="quiet-prompt">Age at review is still needed.</p>' +
      groupCard('Where',
        half(bindChoices('place', 'Place', content.PLACES)) +
        '<div id="place-other-wrap" class="half">' + input('placeOther', 'Where', state.placeOther, { wide: true, placeholder: 'For example, recovery' }) + '</div>'
      ) +
      groupCard('Pathways',
        '<div class="field">' + fieldLabel('Select every pathway that applies') +
        '<div class="choices">' + content.PATHWAYS.map(function (item) {
          var on = hasPathway(state, item.id);
          return '<button type="button" class="choice' + (on ? ' is-selected' : '') + '" data-pathway="' + item.id + '">' + esc(item.label) + '</button>';
        }).join('') + '</div></div>'
      ) +
      groupCard('Gestation and age',
        input('gestationAtBirth', 'Gestation at birth (as documented by clinician)', state.gestationAtBirth, { wide: true, placeholder: 'For example, 34+2' }) +
        '<div class="field">' + fieldLabel('Current age') + choiceButtons('data-bind', 'ageMode', [
          { value: 'times', label: 'From times' },
          { value: 'manual', label: 'Enter age' }
        ], state.ageMode) + '</div>' +
        '<div id="age-times" class="num-row num-row--time">' +
          input('birthAt', 'Time of birth', state.birthAt, { type: 'datetime-local', wide: true }) +
          input('reviewAt', 'Time of review', state.reviewAt, { type: 'datetime-local', wide: true }) +
        '</div>' +
        '<div id="age-manual" class="num-row">' +
          input('ageDays', 'Days', state.ageDays, { type: 'number', mode: 'numeric', placeholder: '0' }) +
          input('ageHours', 'Hours', state.ageHours, { type: 'number', mode: 'decimal', placeholder: '18' }) +
        '</div>' +
        '<p id="age-readout" class="readout"></p>'
      ) +
      '</section>';
  }

  function progressHtml() {
    return '<section class="step">' +
      groupCard('Since last review',
        area('sinceLast', 'Progress since last review', state.sinceLast, 4)
      ) +
      groupCard('Feeding',
        bindChoices('feedMode', 'Feeding', [
          { value: 'breast', label: 'Breast' },
          { value: 'expressed', label: 'Expressed milk' },
          { value: 'formula', label: 'Formula' },
          { value: 'mixed', label: 'Mixed' },
          { value: 'tube', label: 'Tube' }
        ]) +
        '<div id="feed-latch-wrap" class="half">' + bindChoices('latch', 'Latch', [
          { value: 'good', label: 'Effective' },
          { value: 'poor', label: 'Poor', abnormal: true },
          { value: 'not', label: 'Not assessed' }
        ]) + '</div>' +
        '<div id="feed-duration-wrap" class="half">' + input('feedDuration', 'Breastfeed length', state.feedDuration, { wide: true, placeholder: '10 to 15 minutes' }) + '</div>' +
        '<div id="feed-amount-wrap" class="half">' + input('feedAmount', 'Amount (ml)', state.feedAmount, { type: 'number', mode: 'decimal' }) + '</div>' +
        half(input('feedFrequency', 'Frequency', state.feedFrequency, { wide: true, placeholder: 'at least every 3 hours' })) +
        half(input('lastFeed', 'Last feed', state.lastFeed, { wide: true, placeholder: '40 minutes ago' })) +
        yn('topUps', 'Top-ups', 'Yes', 'No') +
        '<div id="topup-amount-wrap" class="half">' + input('topUpAmount', 'Top-up amount (ml)', state.topUpAmount, { type: 'number', mode: 'decimal' }) + '</div>' +
        '<div class="field">' + fieldLabel('Feeding problems') + multiButtons('feedProblems', [
          { value: 'none', label: 'None of these' },
          { value: 'vomiting', label: 'Vomiting', abnormal: true },
          { value: 'residuals', label: 'Large residuals', abnormal: true },
          { value: 'sleepy', label: 'Sleepy at the breast', abnormal: true },
          { value: 'refusal', label: 'Feed refusal', abnormal: true }
        ], state.multi.feedProblems || []) + '</div>'
      ) +
      groupCard('Concern',
        half(bindChoices('parentalConcern', 'Parental concern', [
          { value: 'none', label: 'None voiced' },
          { value: 'concerned', label: 'Concerned', abnormal: true }
        ])) +
        half(bindChoices('midwifeConcern', 'Midwife concern', [
          { value: 'no', label: 'None' },
          { value: 'yes', label: 'Concerned', abnormal: true }
        ])) +
        '<div id="parent-words-wrap" class="half">' + area('parentalWords', 'What the parents said', state.parentalWords, 3) + '</div>' +
        '<div id="midwife-words-wrap" class="half">' + area('midwifeWords', 'Midwife concern', state.midwifeWords, 3) + '</div>'
      ) +
      '</section>';
  }

  function glucoseRowsHtml() {
    return state.glucoses.map(function (row, index) {
      return '<div class="glucose-row"><div class="num-row">' +
        '<label class="field">' + fieldLabel('Time') + '<input data-glucose-field="time" data-index="' + index + '" value="' + esc(row.time) + '" autocomplete="off" placeholder="08:00"></label>' +
        '<label class="field">' + fieldLabel('mmol/L') + '<input class="num-input" type="number" inputmode="decimal" data-glucose-field="value" data-index="' + index + '" value="' + esc(row.value) + '" autocomplete="off"></label>' +
        '</div><div class="choices">' +
        glucoseMethod(index, 'gas', 'Blood gas', row.method) +
        glucoseMethod(index, 'meter', 'Meter', row.method) +
        (state.glucoses.length > 1 ? '<button type="button" class="text-button" data-action="remove-glucose" data-index="' + index + '">Remove</button>' : '') +
        '</div></div>';
    }).join('') +
      '<button type="button" class="text-button" data-action="add-glucose">Add another glucose</button>';
  }

  function glucoseMethod(index, value, label, current) {
    var on = current === value;
    return '<button type="button" class="choice' + (on ? ' is-selected' : '') + '" data-glucose-method="' + value + '" data-index="' + index + '">' + label + '</button>';
  }

  function tempRowsHtml() {
    return state.temps.map(function (row, index) {
      return '<div class="glucose-row"><div class="num-row">' +
        '<label class="field">' + fieldLabel('Time') + '<input data-temp-field="time" data-index="' + index + '" value="' + esc(row.time) + '" autocomplete="off" placeholder="08:00"></label>' +
        '<label class="field">' + fieldLabel('\u00B0C') + '<input class="num-input" type="number" inputmode="decimal" data-temp-field="value" data-index="' + index + '" value="' + esc(row.value) + '" autocomplete="off"></label>' +
        '</div>' +
        (state.temps.length > 1 ? '<button type="button" class="text-button" data-action="remove-temp" data-index="' + index + '">Remove</button>' : '') +
        '</div>';
    }).join('') +
      '<button type="button" class="text-button" data-action="add-temp">Add another temperature</button>';
  }

  function sharedGlucoseCard() {
    if (!hasPathway(state, 'late-preterm') && !hasPathway(state, 'hypoglycaemia')) return '';
    return groupCard('Blood glucose',
      '<p class="hint">Entered once. Written under the selected glucose pathways without interpreting the value.</p>' +
      glucoseRowsHtml()
    );
  }

  function sharedTemperatureCard() {
    if (!hasPathway(state, 'late-preterm') && !hasPathway(state, 'temperature')) return '';
    return groupCard('Thermal care',
      bindChoices('thermalCare', 'Setting', content.THERMAL_CARE) +
      tempRowsHtml()
    );
  }

  function pathwaysHtml() {
    var cards = '';
    if (hasPathway(state, 'sepsis')) {
      cards += groupCard('Suspected sepsis',
        input('antibioticDay', 'Antibiotic day', state.antibioticDay, { wide: true, placeholder: '2' }) +
        input('antibioticWhat', 'What is being given', state.antibioticWhat, { wide: true, placeholder: 'Names only. Doses stay on the drug chart.' }) +
        bindChoices('cultureStatus', 'Blood culture', content.CULTURE_STATUS) +
        '<div id="culture-detail-wrap">' + input('cultureDetail', 'Culture detail', state.cultureDetail, { wide: true }) + '</div>' +
        area('bloodResults', 'Blood results', state.bloodResults, 3) +
        area('sepsisCourse', 'Clinical course', state.sepsisCourse, 3)
      );
    }
    if (hasPathway(state, 'late-preterm')) {
      cards += groupCard('Late preterm pathway',
        bindChoices('jaundice', 'Jaundice', content.JAUNDICE) +
        '<div id="jaundice-detail"><div class="num-row">' +
          input('jaundiceValue', 'Value', state.jaundiceValue, { mode: 'decimal' }) +
          input('jaundiceAgeHours', 'Age in hours', state.jaundiceAgeHours, { type: 'number', mode: 'decimal' }) +
        '</div>' +
        bindChoices('jaundicePlot', 'Treatment line, from your chart', [
          { value: 'below', label: 'Below' },
          { value: 'on', label: 'On' },
          { value: 'above', label: 'Above', abnormal: true }
        ]) + '</div>' +
        input('weightToday', 'Weight today', state.weightToday, { wide: true, placeholder: '2.31 kg' }) +
        area('lpNote', 'Other late preterm notes', state.lpNote, 3)
      );
    }
    if (hasPathway(state, 'temperature')) {
      cards += groupCard('Temperature management',
        area('tempEnvironment', 'Environment', state.tempEnvironment, 3) +
        area('tempWeaning', 'Weaning note', state.tempWeaning, 3)
      );
    }
    if (hasPathway(state, 'hypoglycaemia')) {
      cards += groupCard('Hypoglycaemia pathway',
        '<div class="field">' + fieldLabel('Documented reason') + multiButtons('hypoReasons', content.HYPO_REASONS, state.multi.hypoReasons || []) + '</div>' +
        '<div id="hypo-reason-other-wrap">' + input('hypoReasonOther', 'Other reason', state.hypoReasonOther, { wide: true }) + '</div>' +
        '<div class="field">' + fieldLabel('Symptoms') + multiButtons('hypoSymptoms', content.HYPO_SYMPTOMS, state.multi.hypoSymptoms || []) + '</div>' +
        '<div id="hypo-symptom-other-wrap">' + input('hypoSymptomOther', 'Other symptoms', state.hypoSymptomOther, { wide: true }) + '</div>'
      );
    }
    return '<section class="step">' +
      '<p id="pathways-needed" class="quiet-prompt">Select one or more pathways in Context.</p>' +
      sharedGlucoseCard() +
      sharedTemperatureCard() +
      cards +
      '</section>';
  }

  function examinationHtml() {
    return '<section class="step">' +
      groupCard('Observations',
        '<div class="num-row half">' +
          obsInput('temp', 'Temperature', 'decimal') +
          obsInput('hr', 'Heart rate', 'numeric') +
          obsInput('rr', 'Respiratory rate', 'numeric') +
        '</div>' +
        '<div class="sats-field half">' +
          obsInput('sats', 'Saturations (%)', 'numeric') +
          '<div class="field">' + fieldLabel('Breathing') + choiceButtons('data-obs-choice', 'oxygen', [
            { value: 'air', label: 'Air' },
            { value: 'oxygen', label: 'Oxygen', abnormal: true }
          ], state.obs.oxygen) + '</div>' +
          (state.obs.oxygen === 'oxygen' ? obsInput('fio2', '% O2', 'numeric') : '') +
        '</div>'
      ) +
      '<div class="exam-systems">' + content.EXAM_SYSTEMS.map(examRowHtml).join('') + '</div>' +
      '</section>';
  }

  function obsInput(key, label, mode) {
    return '<label class="field">' + fieldLabel(label) + '<input class="num-input" type="number" inputmode="' + mode + '" data-obs="' + key + '" value="' + esc(state.obs[key] || '') + '" autocomplete="off"></label>';
  }

  function examRowHtml(system) {
    var row = state.exam[system.id] || { status: '', note: '', choices: {} };
    function statusButton(status, label) {
      var on = row.status === status;
      var className = 'exam-status' + (on ? ' is-selected' : '') + (on && status === 'nad' ? ' is-normal' : '');
      return '<button type="button" class="' + className + '" data-exam="' + system.id + '" data-exam-status="' + status + '">' + label + '</button>';
    }
    var choices = findingsActive(row) ? row.choices || {} : {};
    var parts = system.controls.map(function (control) {
      return examControlHtml(system.id, control, choices);
    });
    var showNote = !!row.noteOpen;
    var noteBtn = '<button type="button" class="choice' + (showNote || (row.note && String(row.note).trim()) ? ' is-selected' : '') + '" data-exam-note-toggle="' + system.id + '">Other notes</button>';
    var note = showNote
      ? '<label class="exam-note field field--stack">' + fieldLabel('Other notes') + '<textarea data-exam-note="' + system.id + '" rows="2" autocomplete="off">' + esc(findingsActive(row) ? row.note || '' : '') + '</textarea></label>'
      : '';
    var settled = row.status === 'nad' || row.status === 'not';
    return '<article class="exam-row' + (settled ? ' is-settled' : '') + '"><div class="exam-row-head"><h3>' + esc(system.label) + '</h3><div class="exam-actions">' + statusButton('nad', 'NAD') + statusButton('not', 'Not examined') + '</div></div>' +
      '<div class="exam-body">' + parts.join('') + '</div><div class="exam-extra">' + noteBtn + note + '</div></article>';
  }

  function examControlHtml(systemId, control, choices) {
    var current = choices[control.id];
    var buttons = control.options.map(function (option) {
      var on = current === option.value;
      var className = (control.type === 'yn' ? 'yn-btn' : 'choice') + (on ? ' is-selected' : '') + (on && option.abnormal ? ' is-abnormal' : '');
      return '<button type="button" class="' + className + '" data-exam="' + systemId + '" data-control="' + control.id + '" data-exam-choice data-value="' + esc(option.value) + '">' + esc(option.label) + '</button>';
    }).join('');
    return '<div class="field">' + fieldLabel(control.label) + '<div class="' + (control.type === 'yn' ? 'yn' : 'choices') + '">' + buttons + '</div></div>';
  }

  function planHtml() {
    var phrases = visiblePlanPhrases(state);
    return '<section class="step">' +
      groupCard('Plan',
        (phrases.length
          ? '<div class="choices">' + phrases.map(function (item) {
            return '<button type="button" class="choice" data-phrase="' + item.id + '">' + esc(item.label) + '</button>';
          }).join('') + '</div>'
          : '<p class="hint">Select a pathway to see optional plan phrases. Phrases are never added from numbers.</p>') +
        area('plan', 'Plan', state.plan, 4) +
        input('reviewWhen', 'Review at', state.reviewWhen, { wide: true, placeholder: 'tomorrow or 16:00' })
      ) +
      '</section>';
  }

  return {
    emptyState: emptyState,
    normalize: normalize,
    ageInHours: ageInHours,
    buildNote: buildNote,
    glucoseOwner: glucoseOwner,
    tempOwner: tempOwner,
    mount: mount
  };
});
