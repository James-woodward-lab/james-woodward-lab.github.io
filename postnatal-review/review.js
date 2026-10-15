/*
 * Postnatal review — state, guideline counts, BadgerNet prose, and the page.
 * Pure functions are exported for review.testcases.js. The page boots only
 * in a browser, on the postnatal review document.
 */
(function (root, factory) {
  var content = (typeof module === 'object' && module.exports)
    ? require('./content.js')
    : root.PostnatalReviewContent;
  var api = factory(content);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PostnatalReview = api;
  if (typeof document !== 'undefined' && document.body && document.body.classList.contains('postnatal-review-app')) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { api.mount(); });
    } else {
      api.mount();
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (content) {
  'use strict';

  var DRAFT_KEY = 'postnatal-review-draft';

  function emptyState() {
    return {
      step: 'context',
      shorter: false,
      place: '',
      placeOther: '',
      reasons: [],
      reasonOther: '',
      gestationWeeks: '',
      gestationDays: '',
      ageMode: 'times',
      birthAt: '',
      reviewAt: '',
      ageDays: '',
      ageHours: '',
      sex: '',
      modeOfBirth: '',
      modeOther: '',
      plurality: '',
      apgar1: '',
      apgar5: '',
      romHours: '',
      iapTiming: '',
      centile: '',
      backgroundNote: '',
      historyNote: '',
      historyExtra: '',
      kaiser: { well: '', equivocal: '', unwell: '' },
      feedMode: '',
      latch: '',
      feedAmount: '',
      feedFrequency: '',
      feedDuration: '',
      topUpAmount: '',
      lastFeed: '',
      stools: '',
      stoolCount: '',
      urine: '',
      parentalConcern: '',
      parentalWords: '',
      midwifeConcern: '',
      midwifeWords: '',
      jaundiceNoticedHours: '',
      answers: {},
      multi: {},
      exam: {},
      obs: {
        temp: '', hr: '', rr: '', sats: '', oxygen: '', fio2: ''
      },
      glucoses: [{ time: '', value: '', method: '' }],
      bilirubin: { kind: '', value: '', ageHours: '', plot: '' },
      gas: { ph: '', be: '', lactate: '', glucose: '' },
      resultsNote: '',
      impression: '',
      plan: '',
      antibiotics: '',
      antibioticDetail: '',
      parentsWho: '',
      parentsExplained: '',
      parentsUnderstanding: '',
      parentsConcerns: '',
      reviewWhen: '',
      escalateTo: ''
    };
  }

  function normalize(partial) {
    var state = emptyState();
    if (!partial || typeof partial !== 'object') return state;
    var nested = { obs: 1, gas: 1, bilirubin: 1, answers: 1, multi: 1, exam: 1, kaiser: 1 };
    Object.keys(partial).forEach(function (key) {
      if (partial[key] === undefined) return;
      if (nested[key] && partial[key] && typeof partial[key] === 'object' && !Array.isArray(partial[key])) {
        state[key] = Object.assign({}, state[key], partial[key]);
      } else {
        state[key] = partial[key];
      }
    });
    if (!Array.isArray(state.glucoses) || !state.glucoses.length) {
      state.glucoses = [{ time: '', value: '', method: '' }];
    }
    if (!Array.isArray(state.reasons)) state.reasons = [];
    if (!state.answers) state.answers = {};
    if (!state.multi) state.multi = {};
    if (!state.exam) state.exam = {};
    if (!state.kaiser || typeof state.kaiser !== 'object') state.kaiser = { well: '', equivocal: '', unwell: '' };
    return state;
  }

  function num(value) {
    if (value == null || value === '') return null;
    var n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function ageInHours(partial) {
    var state = partial && partial.obs ? partial : normalize(partial);
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

  function isPreterm(partial) {
    var state = partial && partial.obs ? partial : normalize(partial);
    var weeks = num(state.gestationWeeks);
    if (weeks == null) return null;
    return weeks < 37;
  }

  function gestationLabel(state) {
    var weeks = num(state.gestationWeeks);
    if (weeks == null) return '';
    var days = num(state.gestationDays);
    return weeks + '+' + (days == null ? '0' : days);
  }

  function glucoseBand(value) {
    if (value == null) return '';
    if (value < 1) return 'under 1.0 mmol/L';
    if (value < 2) return '1.0 to 1.9 mmol/L';
    return '2.0 mmol/L or more';
  }

  function romSuggestion(partial) {
    var state = normalize(partial);
    var hours = num(state.romHours);
    var preterm = isPreterm(state);
    if (hours == null || preterm == null) return null;
    if (preterm && hours > 18) {
      return {
        id: 'rom-preterm-18',
        label: 'Rupture of ' + hours + ' hours before a preterm birth matches an NICE NG195 risk factor.'
      };
    }
    if (!preterm && hours > 24) {
      return {
        id: 'rom-term-24',
        label: 'Rupture of ' + hours + ' hours before a term birth matches an NICE NG195 risk factor.'
      };
    }
    return null;
  }

  function examRow(state, id) {
    return state.exam && state.exam[id] ? state.exam[id] : null;
  }

  function selectedOptions(control, choices) {
    var chosen = choices ? choices[control.id] : undefined;
    return control.options.filter(function (option) {
      if (control.type === 'multi') return Array.isArray(chosen) && chosen.indexOf(option.value) !== -1;
      return chosen === option.value;
    });
  }

  function findingsActive(row) {
    return !!row && row.status !== 'nad' && row.status !== 'not';
  }

  function findControl(system, controlId) {
    for (var i = 0; i < system.controls.length; i += 1) {
      if (system.controls[i].id === controlId) return system.controls[i];
    }
    return null;
  }

  function controlVisible(system, control, choices) {
    if (!control.showIf) return true;
    var parent = findControl(system, control.showIf.control);
    if (!parent || !controlVisible(system, parent, choices)) return false;
    var chosen = choices ? choices[parent.id] : undefined;
    var list = Array.isArray(chosen) ? chosen : [chosen];
    return list.some(function (value) { return control.showIf.values.indexOf(value) !== -1; });
  }

  function visibleControls(system, choices) {
    return system.controls.filter(function (control) { return controlVisible(system, control, choices); });
  }

  function noteVisible(system, choices) {
    if (!system.noteWhen) return true;
    return !!choices && choices[system.noteWhen.control] === system.noteWhen.value;
  }

  function examChoice(state, systemId, controlId) {
    var row = examRow(state, systemId);
    if (!findingsActive(row) || !row.choices) return '';
    return row.choices[controlId] || '';
  }

  function glucoseValues(state) {
    var values = [];
    (state.glucoses || []).forEach(function (row) {
      var value = num(row.value);
      if (value != null) values.push(value);
    });
    var fromGas = num(state.gas.glucose);
    if (fromGas != null) values.push(fromGas);
    return values;
  }

  function collectFactors(partial) {
    var state = normalize(partial);
    var byId = {};
    content.FACTORS.forEach(function (factor) { byId[factor.id] = factor; });
    var found = {};
    function add(id) {
      if (!byId[id] || found[id]) return;
      if (id === 'sibling-infection' && state.plurality !== 'multiple') return;
      found[id] = byId[id];
    }
    if (state.answers['gbs-maternal'] === 'yes' || state.answers['gbs-previous'] === 'yes') add('gbs');
    [
      'sibling-infection', 'spontaneous-preterm',
      'maternal-sepsis', 'chorio', 'cpr', 'ventilation', 'idm', 'beta-blocker', 'sga', 'wasted'
    ].forEach(function (id) {
      if (state.answers[id] === 'yes') add(id);
    });
    var preterm = isPreterm(state);
    if (state.answers['rom-preterm-18'] === 'yes' && preterm !== false) add('rom-preterm-18');
    if (state.answers['rom-term-24'] === 'yes' && preterm !== true) add('rom-term-24');
    var since = state.multi.sinceBirth || [];
    if (since.indexOf('apnoea') !== -1) add('apnoea');
    if (since.indexOf('seizures') !== -1) add('seizures');
    if (since.indexOf('poor-tone') !== -1) add('altered-tone');
    if (since.indexOf('bleeding') !== -1) add('bleeding-coag');
    var feeds = state.multi.feedProblems || [];
    if (feeds.indexOf('refusal') !== -1) add('feed-refusal');
    if (feeds.indexOf('vomiting') !== -1 || feeds.indexOf('residuals') !== -1) add('feed-intolerance');

    content.EXAM_SYSTEMS.forEach(function (system) {
      var row = examRow(state, system.id);
      if (!findingsActive(row)) return;
      visibleControls(system, row.choices).forEach(function (control) {
        selectedOptions(control, row.choices).forEach(function (option) {
          if (option.factor) add(option.factor);
        });
      });
    });

    var temp = num(state.obs.temp);
    if (temp != null && (temp < 36 || temp > 38)) add('temperature');
    var base = num(state.gas.be);
    if (base != null && base >= 10) add('metabolic-acidosis');
    var glucoses = glucoseValues(state);
    if (glucoses.some(function (value) { return value < 2; })) add('altered-glucose');
    if (state.answers.hyperglycaemia === 'yes') add('altered-glucose');
    if (state.answers.confirmLocalHypo === 'yes' && glucoses.some(function (value) { return value >= 2 && value < 2.6; })) {
      add('altered-glucose');
    }
    var age = ageInHours(state);
    var skin = examChoice(state, 'skin', 'colour');
    var noticed = since.indexOf('jaundice') !== -1;
    var noticedAt = num(state.jaundiceNoticedHours);
    if ((skin === 'jaundiced' && age != null && age < 24) ||
        (noticed && noticedAt != null && noticedAt < 24) ||
        (noticed && noticedAt == null && age != null && age < 24)) {
      add('jaundice-24h');
    }
    var hr = num(state.obs.hr);
    var rr = num(state.obs.rr);
    var sats = num(state.obs.sats);
    if (state.answers.confirmHr === 'yes' && hr != null && (hr < 100 || hr > 160)) add('abnormal-hr');
    if (state.answers.confirmHypoxia === 'yes' && sats != null && sats < 95) add('hypoxia');
    if (state.answers.confirmTachypnoea === 'yes' && rr != null && rr > 60) add('resp-distress');
    if (state.answers.thrombocytopenia === 'yes' || state.answers.coagulation === 'yes') add('bleeding-coag');
    return Object.keys(found).map(function (id) { return found[id]; });
  }

  function frameworkSentence(factors) {
    var red = 0;
    var other = 0;
    factors.forEach(function (factor) {
      if (factor.kind === 'ng195-red') red += 1;
      if (factor.kind === 'ng195-other') other += 1;
    });
    if (red > 0 || other >= 2) {
      return 'NICE NG195: a red flag, or two or more other factors, is the point at which the guideline directs investigation and antibiotic treatment without waiting for results.';
    }
    if (other === 1) {
      return 'NICE NG195: one non-red-flag factor. Whether to withhold antibiotics, and whether to continue early-warning observations for at least 12 hours, is a clinical judgement.';
    }
    return 'NICE NG195: no risk factors or clinical indicators recorded. Routine postnatal care is the guideline path when the baby is well.';
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

  function placeLabel(state) {
    if (state.place === 'postnatal') return 'postnatal ward';
    if (state.place === 'labour') return 'labour ward';
    if (state.place === 'other') return (state.placeOther || '').trim() || 'ward';
    return '';
  }

  function modePhrase(state) {
    if (state.modeOfBirth === 'svd') return 'normal vaginal birth';
    if (state.modeOfBirth === 'instrumental') return 'instrumental birth';
    if (state.modeOfBirth === 'caesarean') return 'caesarean birth';
    if (state.modeOfBirth === 'other') return (state.modeOther || '').trim() || 'another mode of birth';
    return '';
  }

  function obsConcerning(state) {
    var temp = num(state.obs.temp);
    var hr = num(state.obs.hr);
    var rr = num(state.obs.rr);
    var sats = num(state.obs.sats);
    if (temp != null && (temp < 36.5 || temp > 37.5)) return true;
    if (hr != null && (hr < 100 || hr > 160)) return true;
    if (rr != null && (rr < 30 || rr > 60)) return true;
    if (sats != null && sats < 95) return true;
    if (state.obs.oxygen === 'oxygen') return true;
    return false;
  }

  function obsSentence(state) {
    var obs = state.obs || {};
    var bits = [];
    if (obs.temp) bits.push('Temperature ' + obs.temp);
    if (obs.hr) bits.push('HR ' + obs.hr);
    if (obs.rr) bits.push('RR ' + obs.rr);
    if (obs.sats) {
      var sats = 'sats ' + obs.sats + '%';
      if (obs.oxygen === 'air') sats += ' in air';
      if (obs.oxygen === 'oxygen') {
        var fio2 = num(obs.fio2);
        sats += fio2 != null ? ' in ' + fio2 + '% oxygen' : ' in oxygen';
      }
      bits.push(sats);
    } else if (obs.oxygen === 'oxygen') {
      var fio2Only = num(obs.fio2);
      bits.push(fio2Only != null ? 'in ' + fio2Only + '% oxygen' : 'in oxygen');
    }
    if (!bits.length) return '';
    return bits.join(', ') + '.';
  }

  function findingsProse(system, row) {
    var abnormal = [];
    var normal = [];
    var flagged = false;
    var choices = row.choices || {};
    var shown = visibleControls(system, choices);
    var shownIds = shown.map(function (control) { return control.id; });
    shown.forEach(function (control) {
      selectedOptions(control, choices).forEach(function (option) {
        if (option.abnormal) flagged = true;
        if (!option.prose) return;
        if (option.supersededBy && shownIds.indexOf(option.supersededBy) !== -1) {
          var detail = choices[option.supersededBy];
          if (Array.isArray(detail) ? detail.length : detail) return;
        }
        if (option.abnormal) abnormal.push(option.prose);
        else normal.push(option.prose);
      });
    });
    var hasNote = noteVisible(system, choices) && row.note && String(row.note).trim();
    if (hasNote) {
      var note = ensurePeriod(row.note);
      if (flagged) abnormal.push(note);
      else normal.push(note);
    } else {
      shown.forEach(function (control) {
        selectedOptions(control, choices).forEach(function (option) {
          if (option.fallback) abnormal.push(option.fallback);
        });
      });
    }
    return { abnormal: abnormal, normal: normal, flagged: flagged };
  }

  function notExaminedSentence(labels) {
    var phrase = listPhrase(labels);
    return phrase.charAt(0).toUpperCase() + phrase.slice(1) + ' not examined this review.';
  }

  function examinationText(state, shorter) {
    var lines = [];
    var place = placeLabel(state);
    var age = ageInHours(state);
    if (place || age != null) {
      var opening = 'Reviewed';
      if (place) opening += ' on the ' + place;
      if (age != null) opening += ' at ' + shortAge(age) + ' of age';
      lines.push(opening + '.');
    }
    var abnormal = [];
    var normal = [];
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
        normal.push(system.nad);
        return;
      }
      var split = findingsProse(system, row);
      abnormal = abnormal.concat(split.abnormal);
      normal = normal.concat(split.normal);
    });
    var observations = obsSentence(state);
    if (observations) {
      if (obsConcerning(state)) abnormal.unshift(observations);
      else normal.unshift(observations);
    }
    lines = lines.concat(abnormal);
    if (!shorter) lines = lines.concat(normal);
    if (skipped.length) lines.push(notExaminedSentence(skipped));
    return cleanLines(lines);
  }

  function riskClause(factors) {
    var relevant = factors.filter(function (factor) {
      return factor.kind === 'ng195-red' || factor.kind === 'ng195-other';
    });
    if (!relevant.length) return '';
    var reds = relevant.filter(function (factor) { return factor.kind === 'ng195-red'; });
    var others = relevant.filter(function (factor) { return factor.kind === 'ng195-other'; });
    if (reds.length === 1 && !others.length) return 'with ' + reds[0].summary + ' as an NICE NG195 red flag';
    if (!reds.length && others.length === 1) {
      var noun = others[0].box === 'risk' ? 'risk factor' : 'clinical indicator';
      return 'with ' + others[0].summary + ' as a single NICE NG195 ' + noun;
    }
    return 'with NICE NG195 factors (' + relevant.map(function (factor) { return factor.summary; }).join('; ') + ')';
  }

  function examOverview(state) {
    var sawExam = false;
    var abnormal = false;
    content.EXAM_SYSTEMS.forEach(function (system) {
      var row = examRow(state, system.id);
      if (!row || row.status === 'not') return;
      if (row.status === 'nad') { sawExam = true; return; }
      var split = findingsProse(system, row);
      if (split.abnormal.length || split.normal.length || split.flagged) sawExam = true;
      if (split.abnormal.length || split.flagged) abnormal = true;
    });
    if (obsConcerning(state)) abnormal = true;
    if (abnormal) return 'abnormal';
    if (sawExam || obsSentence(state)) return 'normal';
    return '';
  }

  function feedingWell(state) {
    if (!state.feedMode || state.feedMode === 'tube') return false;
    if (state.latch === 'poor') return false;
    var problems = state.multi.feedProblems || [];
    return problems.indexOf('refusal') === -1 && problems.indexOf('vomiting') === -1 && problems.indexOf('residuals') === -1;
  }

  function summaryParagraph(state, factors) {
    var weeks = num(state.gestationWeeks);
    var age = ageInHours(state);
    var first = '';
    if (weeks != null) first += (weeks < 37 ? 'Preterm' : 'Term') + ' baby';
    if (age != null) first += (first ? ' ' : '') + 'at ' + shortAge(age);
    var clause = riskClause(factors);
    if (clause) first += ' ' + clause;
    if (first) first += '.';
    var second = [];
    var overview = examOverview(state);
    if (overview === 'abnormal') second.push('Abnormal findings on examination');
    else if (overview === 'normal') second.push('Examination normal');
    if (feedingWell(state)) second.push('feeding well');
    else if (factors.some(function (factor) { return factor.id === 'feed-refusal'; })) second.push('feed refusal');
    if (state.parentalConcern === 'none') second.push('parents not concerned');
    if (state.parentalConcern === 'concerned') second.push('parents are concerned');
    var secondSentence = '';
    if (second.length) secondSentence = second[0] + (second.length > 1 ? ', ' + second.slice(1).join(', ') : '') + '.';
    return [first, secondSentence].filter(Boolean).join(' ');
  }

  function impressionParagraph(state) {
    var text = (state.impression || '').trim();
    if (!text) return '';
    if (/^impression:/i.test(text)) return ensurePeriod(text);
    return 'Impression: ' + ensurePeriod(text);
  }

  function planParagraph(state) {
    var bits = [];
    if (state.plan && state.plan.trim()) bits.push(ensurePeriod(state.plan.trim()));
    if (state.antibiotics === 'none') bits.push('No antibiotics.');
    if (state.antibiotics === 'senior') bits.push('Antibiotic decision to be made with the senior.');
    if (state.antibiotics === 'started') {
      var started = 'Antibiotics started.';
      if (state.antibioticDetail && state.antibioticDetail.trim()) started += ' ' + ensurePeriod(state.antibioticDetail.trim());
      bits.push(started);
    }
    if (state.reviewWhen && state.reviewWhen.trim()) bits.push('Review at ' + state.reviewWhen.trim() + '.');
    if (state.escalateTo && state.escalateTo.trim()) bits.push('Escalate to ' + state.escalateTo.trim() + '.');
    if (!bits.length) return '';
    return 'Plan: ' + bits.join(' ');
  }

  function parentParagraph(state) {
    var bits = [];
    if (state.parentsWho && state.parentsWho.trim()) bits.push('Spoken with ' + state.parentsWho.trim() + '.');
    if (state.parentsExplained && state.parentsExplained.trim()) bits.push(ensurePeriod(state.parentsExplained.trim()));
    if (state.parentsUnderstanding && state.parentsUnderstanding.trim()) bits.push('Understanding: ' + ensurePeriod(state.parentsUnderstanding.trim()));
    if (state.parentsConcerns && state.parentsConcerns.trim()) bits.push('Remaining concerns: ' + ensurePeriod(state.parentsConcerns.trim()));
    return bits.join(' ');
  }

  function discussionText(state, factors) {
    return cleanLines([
      summaryParagraph(state, factors),
      impressionParagraph(state),
      planParagraph(state),
      parentParagraph(state)
    ]);
  }

  function membraneSentence(state, factors) {
    var hours = num(state.romHours);
    if (hours == null) return '';
    var preterm = isPreterm(state);
    var tagged = factors.some(function (factor) {
      return factor.id === 'rom-preterm-18' || factor.id === 'rom-term-24';
    });
    var sentence = 'Membranes ruptured for ' + hours + ' hours';
    if (preterm === true) sentence += ' before a preterm birth';
    if (preterm === false) sentence += ' before a term birth';
    if (tagged) sentence += ' (NICE NG195 risk factor)';
    return sentence + '.';
  }

  function gbsSentences(state) {
    var maternal = state.answers['gbs-maternal'];
    var previous = state.answers['gbs-previous'];
    if (maternal === 'yes' && previous === 'yes') {
      return 'Maternal group B streptococcal colonisation, bacteriuria, or infection in this pregnancy, and invasive group B streptococcal infection in a previous baby (NICE NG195 risk factor).';
    }
    if (maternal === 'yes') return 'Maternal group B streptococcal colonisation, bacteriuria, or infection in this pregnancy (NICE NG195 risk factor).';
    if (previous === 'yes') return 'Invasive group B streptococcal infection in a previous baby (NICE NG195 risk factor).';
    return '';
  }

  function negativeSentence(state) {
    var items = [];
    if (state.answers['gbs-maternal'] === 'no') items.push('maternal GBS');
    if (state.answers['gbs-previous'] === 'no') items.push('invasive GBS in a previous baby');
    if (state.answers.chorio === 'no') items.push('chorioamnionitis');
    if (state.answers['maternal-sepsis'] === 'no') items.push('maternal sepsis');
    if (state.answers.fever === 'no') items.push('intrapartum fever');
    if (!items.length) return '';
    var phrase = items.length === 1 ? items[0] : items.length === 2 ? items[0] + ' or ' + items[1] : items.slice(0, -1).join(', ') + ', or ' + items[items.length - 1];
    return 'No ' + phrase + '.';
  }

  function feedingSentence(state, shorter) {
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
    if (!shorter && problems.indexOf('none') !== -1) bits.push('no vomiting');
    if (state.lastFeed && state.lastFeed.trim()) bits.push('last feed ' + state.lastFeed.trim());
    if (!bits.length) return '';
    return 'Feeding: ' + bits.join(', ') + '.';
  }

  function stoolSentence(state) {
    if (state.stools === 'none') return 'No stool passed yet.';
    if (state.stools === 'meconium') return state.stoolCount ? 'Meconium passed (' + state.stoolCount + ').' : 'Meconium passed.';
    if (state.stools === 'changing') return state.stoolCount ? 'Changing stool (' + state.stoolCount + ').' : 'Changing stool.';
    return '';
  }

  function urineSentence(state) {
    if (state.urine === 'passed') return 'Urine passed.';
    if (state.urine === 'not') return 'No urine passed since birth.';
    return '';
  }

  function parentConcernSentence(state) {
    if (state.parentalConcern === 'none') return 'No parental concern.';
    if (state.parentalConcern === 'concerned') {
      var words = (state.parentalWords || '').trim();
      return words ? 'Parental concern: ' + words : 'Parents are concerned.';
    }
    return '';
  }

  function resultsSentences(state) {
    var lines = [];
    (state.glucoses || []).forEach(function (row) {
      if (!row.value) return;
      var sentence = 'Glucose ' + row.value + ' mmol/L';
      if (row.method === 'gas') sentence += ' on the blood gas';
      if (row.method === 'meter') sentence += ' on a meter';
      if (row.time) sentence += ' at ' + row.time;
      var band = glucoseBand(num(row.value));
      if (band) sentence += ' (' + band + ')';
      lines.push(sentence + '.');
    });
    if (state.bilirubin.kind === 'none') lines.push('No bilirubin sent.');
    if ((state.bilirubin.kind === 'tcb' || state.bilirubin.kind === 'tsb') && state.bilirubin.value) {
      var name = state.bilirubin.kind === 'tcb' ? 'Transcutaneous bilirubin' : 'Serum bilirubin';
      var sentence = name + ' ' + state.bilirubin.value;
      if (state.bilirubin.ageHours) sentence += ' at ' + state.bilirubin.ageHours + ' hours';
      if (state.bilirubin.plot === 'below') sentence += ', below the treatment line';
      if (state.bilirubin.plot === 'on') sentence += ', on the treatment line';
      if (state.bilirubin.plot === 'above') sentence += ', above the treatment line';
      lines.push(sentence + '.');
    }
    var gasBits = [];
    if (state.gas.ph) gasBits.push('pH ' + state.gas.ph);
    if (state.gas.be) gasBits.push('base deficit ' + state.gas.be);
    if (state.gas.lactate) gasBits.push('lactate ' + state.gas.lactate);
    if (state.gas.glucose) gasBits.push('glucose ' + state.gas.glucose);
    if (gasBits.length) lines.push('Blood gas: ' + gasBits.join(', ') + '.');
    if (state.answers.thrombocytopenia === 'yes') lines.push('Thrombocytopenia (NICE NG195 clinical indicator).');
    if (state.answers.coagulation === 'yes') lines.push('Abnormal coagulation (NICE NG195 clinical indicator).');
    if (state.resultsNote && state.resultsNote.trim()) lines.push(ensurePeriod(state.resultsNote.trim()));
    return lines;
  }

  function reviewText(state, factors, shorter) {
    var lines = [];
    var birth = '';
    var gestation = gestationLabel(state);
    var mode = modePhrase(state);
    var age = ageInHours(state);
    if (gestation) birth += gestation + ' weeks';
    if (mode) birth += (birth ? ', born by ' : 'Born by ') + mode;
    if (age != null) birth += (birth ? ', now ' : 'Now ') + shortAge(age) + ' old';
    if (birth) lines.push(birth + '.');
    if (state.plurality === 'multiple') lines.push('Multiple pregnancy.');
    if (state.sex) lines.push('Sex: ' + state.sex + '.');
    if (state.centile && state.centile.trim()) lines.push('Birth-weight centile ' + state.centile.trim() + '.');
    lines.push(membraneSentence(state, factors));
    lines.push(gbsSentences(state));
    if (state.answers['spontaneous-preterm'] === 'yes') lines.push('Preterm birth following spontaneous labour (NICE NG195 risk factor).');
    if (state.answers['maternal-sepsis'] === 'yes') lines.push('Maternal sepsis in the intrapartum or early postpartum period (NICE NG195 risk factor).');
    if (state.answers.chorio === 'yes') lines.push('Suspected or confirmed chorioamnionitis (NICE NG195 risk factor).');
    if (state.answers['sibling-infection'] === 'yes' && state.plurality === 'multiple') {
      lines.push('Suspected or confirmed infection in another baby of this multiple pregnancy (NICE NG195 red flag).');
    }
    if (state.answers.cpr === 'yes') lines.push('Cardiopulmonary resuscitation was needed (NICE NG195 red flag).');
    if (state.answers.ventilation === 'yes') lines.push('Mechanical ventilation was needed (NICE NG195 red flag).');
    if (state.answers.idm === 'yes') lines.push('Infant of a mother with diabetes (BAPM hypoglycaemia risk factor).');
    if (state.answers['beta-blocker'] === 'yes') lines.push('Mother took a beta-blocker in the third trimester or at birth (BAPM hypoglycaemia risk factor).');
    if (state.answers.sga === 'yes') lines.push('Birth weight on or under the 2nd centile (BAPM hypoglycaemia risk factor).');
    if (state.answers.wasted === 'yes') lines.push('Clinically wasted (BAPM hypoglycaemia risk factor).');
    if (state.answers['local-hypothermia'] === 'yes') lines.push('Hypothermia has been noted.');
    if (state.answers['local-acidosis'] === 'yes') lines.push('Perinatal acidosis.');
    if (state.answers['local-polycythaemia'] === 'yes') lines.push('Polycythaemia.');
    if (state.answers['local-family'] === 'yes') lines.push('Family history of a disorder associated with neonatal hypoglycaemia.');
    if (state.answers['local-sepsis'] === 'yes') lines.push('Suspected or confirmed early-onset infection.');
    if (!shorter) lines.push(negativeSentence(state));
    if (state.answers.iap === 'given') lines.push('Intrapartum antibiotics given' + (state.iapTiming && state.iapTiming.trim() ? ' (' + state.iapTiming.trim() + ')' : '') + '.');
    if (state.answers.iap === 'none') lines.push('No intrapartum antibiotics.');
    if (state.answers.meconium === 'yes') lines.push('Meconium stained liquor.');
    if (state.answers.shoulder === 'yes') lines.push('Shoulder dystocia.');
    if (state.apgar1 || state.apgar5) lines.push('Apgars ' + (state.apgar1 || '?') + ' at 1 minute and ' + (state.apgar5 || '?') + ' at 5 minutes.');
    if (state.reasons && state.reasons.length) {
      var reasonLabels = content.REASONS.filter(function (reason) {
        return state.reasons.indexOf(reason.id) !== -1;
      }).map(function (reason) { return reason.label.toLowerCase(); });
      if (state.reasons.indexOf('other') !== -1 && state.reasonOther && state.reasonOther.trim()) {
        reasonLabels = reasonLabels.filter(function (label) { return label !== 'other'; });
        reasonLabels.push(state.reasonOther.trim());
      }
      if (reasonLabels.length) lines.push('Reason for review: ' + reasonLabels.join(', ') + '.');
    }
    if (state.backgroundNote && state.backgroundNote.trim()) lines.push(ensurePeriod(state.backgroundNote.trim()));
    if (state.historyNote && state.historyNote.trim()) lines.push(ensurePeriod(state.historyNote.trim()));
    lines.push(kaiserSentence(state));
    lines.push(feedingSentence(state, shorter));
    lines.push(stoolSentence(state));
    lines.push(urineSentence(state));
    lines.push(parentConcernSentence(state));
    if (state.midwifeConcern === 'yes') {
      lines.push(state.midwifeWords && state.midwifeWords.trim()
        ? 'Midwife concern: ' + state.midwifeWords.trim()
        : 'The midwife is concerned.');
    } else if (state.midwifeConcern === 'no' && !shorter) lines.push('No midwife concern.');
    var sinceMap = {
      apnoea: 'apnoea',
      seizures: 'seizures',
      'colour-change': 'colour change',
      'temp-instability': 'temperature instability',
      jaundice: 'jaundice noticed',
      jitteriness: 'jitteriness',
      'poor-tone': 'poor tone',
      bleeding: 'unexplained excessive bleeding'
    };
    var since = state.multi.sinceBirth || [];
    if (since.length) {
      var sinceLine = 'Since birth: ' + since.map(function (id) { return sinceMap[id] || id; }).join(', ') + '.';
      if (since.indexOf('jaundice') !== -1 && state.jaundiceNoticedHours) {
        sinceLine += ' Jaundice noticed at ' + state.jaundiceNoticedHours + ' hours.';
      }
      lines.push(sinceLine);
    }
    if (state.historyExtra && state.historyExtra.trim()) lines.push(ensurePeriod(state.historyExtra.trim()));
    return cleanLines(lines.concat(resultsSentences(state)));
  }

  function kaiserSentence(state) {
    var bag = state.kaiser && typeof state.kaiser === 'object' ? state.kaiser : {};
    var parts = content.KAISER.map(function (option) {
      var text = String(bag[option.id] || '').trim();
      return text ? option.label + ': ' + text.replace(/[.\s]+$/, '') : '';
    }).filter(Boolean);
    if (!parts.length) return '';
    return 'Kaiser Permanente. ' + parts.join('. ') + '.';
  }

  function buildBoxes(partial) {
    var state = normalize(partial);
    var factors = collectFactors(state);
    var examination = examinationText(state, !!state.shorter);
    var discussion = discussionText(state, factors);
    var review = reviewText(state, factors, !!state.shorter);
    return {
      examination: examination,
      discussion: discussion,
      review: review,
      all: ['Examination', examination, '', 'Discussion', discussion, '', 'Review', review].join('\n').trim(),
      factors: factors,
      redCount: factors.filter(function (factor) { return factor.kind === 'ng195-red'; }).length,
      otherCount: factors.filter(function (factor) { return factor.kind === 'ng195-other'; }).length,
      bapm: factors.filter(function (factor) { return factor.kind === 'bapm'; }),
      framework: frameworkSentence(factors)
    };
  }

  function missingRequired(state) {
    return {
      context: num(state.gestationWeeks) == null || ageInHours(state) == null,
      history: !state.feedMode || !state.stools || !state.urine || !state.parentalConcern
    };
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
    var shorter = document.getElementById('shorter-note');
    if (shorter) shorter.checked = !!state.shorter;
    var app = document.getElementById('review-app');
    app.addEventListener('click', onClick);
    app.addEventListener('input', onInput);
    app.addEventListener('change', onChange);
    window.addEventListener('scroll', onPageScroll, { passive: true });
    paint();
  }

  function persist() {
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(state)); } catch (error) { /* private mode */ }
  }

  function paint() {
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
      if ((step.id === 'context' && missing.context) || (step.id === 'history' && missing.history)) className += ' is-incomplete';
      return '<button type="button" class="' + className + '" data-step="' + step.id + '"><span class="step-index">' + (index + 1) + '</span>' + esc(step.label) + '</button>';
    }).join('');
  }

  function renderStatus() {
    var el = document.getElementById('status-strip');
    if (!el) return;
    var boxes = buildBoxes(state);
    var gestation = gestationLabel(state);
    var age = ageInHours(state);
    var left = 'Gestation and age come first';
    if (gestation || age != null) {
      left = [gestation, age != null ? shortAge(age) : '', placeLabel(state)].filter(Boolean).join(' · ');
    }
    var hypo = boxes.bapm.length
      ? 'Hypoglycaemia risk: yes (' + boxes.bapm.map(function (factor) { return factor.summary; }).join(', ') + ')'
      : 'No BAPM hypoglycaemia risk factor recorded';
    var preterm = isPreterm(state) === true ? '<p class="status-preterm">' + esc(content.GUIDE.preterm) + '</p>' : '';
    el.innerHTML = '<p class="status-main"><strong>' + esc(left) + '</strong><span>Sepsis: ' + boxes.redCount + ' red flag' + (boxes.redCount === 1 ? '' : 's') + ', ' + boxes.otherCount + ' other</span><span>' + esc(hypo) + '</span></p><p class="status-framework">' + esc(boxes.framework) + '</p>' + preterm;
  }

  function renderNote() {
    var boxes = buildBoxes(state);
    setBox('out-examination', boxes.examination);
    setBox('out-discussion', boxes.discussion);
    setBox('out-review', boxes.review);
    var summary = document.getElementById('summary-preview');
    if (summary) summary.textContent = summaryParagraph(state, boxes.factors) || 'The discussion summary appears here once gestation, age, or the examination is filled in.';
  }

  function setBox(id, text) {
    var el = document.getElementById(id);
    if (!el) return;
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
      if (age == null) ageEl.textContent = 'Age appears here once the times, or a manual age, are filled in.';
      else {
        var bits = [shortAge(age) + ' old.'];
        if (age < 24) bits.push('Under 24 hours: jaundice at this age is pathological.');
        if (age <= 72) bits.push('Within the first 72 hours (BAPM hypoglycaemia window for term babies).');
        ageEl.textContent = bits.join(' ');
      }
    }
    var offer = document.getElementById('rom-offer');
    if (offer) {
      var suggestion = romSuggestion(state);
      if (!suggestion) offer.hidden = true;
      else {
        offer.hidden = false;
        var added = state.answers[suggestion.id] === 'yes';
        offer.innerHTML = '<p>' + esc(suggestion.label) + '</p>' + (added
          ? '<p class="offer-done">Added. Clear it with No on that question if it does not belong.</p>'
          : '<button type="button" data-action="add-rom">Add this risk factor</button>');
      }
    }
    var temp = num(state.obs.temp);
    var hr = num(state.obs.hr);
    var rr = num(state.obs.rr);
    var sats = num(state.obs.sats);
    var warning = [];
    if (temp != null && (temp < 36.5 || temp > 37.5)) warning.push('Temperature is outside the usual newborn range.');
    if (hr != null && (hr < 100 || hr > 160)) warning.push('Heart rate is outside the usual newborn range.');
    if (rr != null && (rr < 30 || rr > 60)) warning.push('Respiratory rate is outside the usual newborn range.');
    if (sats != null && sats < 95) warning.push('Saturations are under 95%.');
    var warningEl = document.getElementById('obs-warning');
    if (warningEl) {
      warningEl.hidden = !warning.length;
      warningEl.textContent = warning.join(' ') + (warning.length ? ' Check the local early-warning chart. This is not a score.' : '');
    }
    show('hr-confirm', hr != null && (hr < 100 || hr > 160));
    show('hypoxia-confirm', sats != null && sats < 95);
    show('rr-confirm', rr != null && rr > 60);
    var glucoses = glucoseValues(state);
    show('local-hypo-confirm', glucoses.some(function (value) { return value >= 2 && value < 2.6; }));
    document.querySelectorAll('[data-band-index]').forEach(function (el) {
      var row = state.glucoses[Number(el.getAttribute('data-band-index'))];
      var value = row ? num(row.value) : null;
      el.textContent = value == null ? '' : glucoseBand(value);
    });
    show('stool-prompt', state.stools === 'none' && age != null && age > 24);
    show('urine-prompt', state.urine === 'not' && age != null && age > 24);
    show('jaundice-flag', age != null && age < 24);
    show('preterm-note', isPreterm(state) === true);
    var missing = missingRequired(state);
    show('context-needed', missing.context);
    show('history-needed', missing.history);
  }

  function syncVisibility() {
    show('place-other-wrap', state.place === 'other');
    show('reason-other-wrap', (state.reasons || []).indexOf('other') !== -1);
    show('mode-other-wrap', state.modeOfBirth === 'other');
    show('age-times', state.ageMode !== 'manual');
    show('age-manual', state.ageMode === 'manual');
    show('sibling-wrap', state.plurality === 'multiple');
    var preterm = isPreterm(state);
    show('rom-preterm-wrap', preterm !== false);
    show('rom-term-wrap', preterm !== true);
    show('iap-timing-wrap', state.answers.iap === 'given');
    show('feed-latch-wrap', state.feedMode === 'breast' || state.feedMode === 'mixed');
    show('feed-duration-wrap', state.feedMode === 'breast' || state.feedMode === 'mixed');
    show('feed-amount-wrap', state.feedMode === 'formula' || state.feedMode === 'expressed' || state.feedMode === 'mixed' || state.feedMode === 'tube');
    show('topup-amount-wrap', state.answers.topUps === 'yes');
    show('parent-words-wrap', state.parentalConcern === 'concerned');
    show('midwife-words-wrap', state.midwifeConcern === 'yes');
    show('jaundice-hours-wrap', (state.multi.sinceBirth || []).indexOf('jaundice') !== -1);
    show('antibiotic-detail-wrap', state.antibiotics === 'started');
    show('bili-detail', state.bilirubin.kind === 'tcb' || state.bilirubin.kind === 'tsb');
  }

  function onInput(event) {
    var target = event.target;
    if (target.dataset.field) {
      state[target.dataset.field] = target.value;
      if (target.dataset.field === 'gestationWeeks' || target.dataset.field === 'gestationDays') presetPretermAnswer();
    }
    else if (target.dataset.obs) state.obs[target.dataset.obs] = target.value;
    else if (target.dataset.gas) state.gas[target.dataset.gas] = target.value;
    else if (target.dataset.bili) state.bilirubin[target.dataset.bili] = target.value;
    else if (target.dataset.kaiser) state.kaiser[target.dataset.kaiser] = target.value;
    else if (target.dataset.glucoseField) {
      var row = state.glucoses[Number(target.dataset.index)];
      if (row) row[target.dataset.glucoseField] = target.value;
    } else if (target.dataset.examNote) {
      var exam = ensureExam(target.dataset.examNote);
      exam.note = target.value;
      if (exam.status && exam.note.trim()) {
        exam.status = '';
        var article = target.closest('.exam-row');
        if (article) {
          article.classList.remove('is-settled');
          article.querySelectorAll('.exam-status').forEach(function (button) {
            button.classList.remove('is-selected', 'is-normal');
          });
        }
      }
    } else return;
    persist();
    refreshChrome();
  }

  function onChange(event) {
    if (event.target.id === 'shorter-note') state.shorter = event.target.checked;
    persist();
    refreshChrome();
  }

  function onClick(event) {
    var button = event.target.closest('button');
    if (!button || !document.getElementById('review-app').contains(button)) return;
    if (button.dataset.step) { go(button.dataset.step); return; }
    if (button.dataset.action) { runAction(button.dataset.action, button); return; }
    if (button.dataset.reason) { toggleReason(button.dataset.reason); return; }
    if (button.dataset.bind) { toggleBind(button.dataset.bind, button.dataset.value); return; }
    if (button.dataset.answer) { toggleAnswer(button.dataset.answer, button.dataset.value); return; }
    if (button.dataset.multi) { toggleMulti(button.dataset.multi, button.dataset.value); return; }
    if (button.dataset.examStatus) { toggleExamStatus(button.dataset.exam, button.dataset.examStatus); return; }
    if (button.hasAttribute('data-exam-choice')) { toggleExamChoice(button); return; }
    if (button.hasAttribute('data-exam-multi')) { toggleExamMulti(button); return; }
    if (button.dataset.obsChoice) { toggleObs(button.dataset.obsChoice, button.dataset.value); return; }
    if (button.dataset.biliChoice) { toggleNested(state.bilirubin, button.dataset.biliChoice, button.dataset.value); return; }
    if (button.dataset.glucoseMethod) { toggleGlucoseMethod(button); return; }
    if (button.dataset.copy) { copyText(button.dataset.copy, button); return; }
    if (button.dataset.phrase) { appendPhrase(button.dataset.phrase); return; }
    if (button.dataset.diagnosis) { appendDiagnosis(button.dataset.diagnosis); return; }
  }

  function go(step) {
    state.step = step;
    var target = document.getElementById('section-' + step);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    markCurrent(step);
  }

  function runAction(action, button) {
    if (action === 'back' || action === 'next' || action === 'open-note' || action === 'close-note') return;
    if (action === 'new-baby') document.getElementById('confirm-new').hidden = false;
    if (action === 'keep-baby') document.getElementById('confirm-new').hidden = true;
    if (action === 'clear-baby') {
      state = emptyState();
      try { sessionStorage.removeItem(DRAFT_KEY); } catch (error) { /* ignore */ }
      document.getElementById('confirm-new').hidden = true;
      var shorter = document.getElementById('shorter-note');
      if (shorter) shorter.checked = false;
      paint();
      window.scrollTo(0, 0);
    }
    if (action === 'add-rom') {
      var suggestion = romSuggestion(state);
      if (suggestion) state.answers[suggestion.id] = 'yes';
      persist();
      paint();
    }
    if (action === 'add-glucose') {
      state.glucoses.push({ time: '', value: '', method: '' });
      persist();
      paint();
    }
    if (action === 'remove-glucose' && button) {
      var removeAt = Number(button.dataset.index);
      if (state.glucoses.length > 1 && removeAt >= 0) state.glucoses.splice(removeAt, 1);
      persist();
      paint();
    }
  }

  function toggleReason(id) {
    var index = state.reasons.indexOf(id);
    if (index === -1) state.reasons.push(id);
    else state.reasons.splice(index, 1);
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

  function presetPretermAnswer() {
    var preterm = isPreterm(state);
    state.answers['spontaneous-preterm'] = preterm == null ? '' : (preterm ? 'yes' : 'no');
    document.querySelectorAll('[data-answer="spontaneous-preterm"]').forEach(function (button) {
      var on = state.answers['spontaneous-preterm'] === button.dataset.value;
      button.classList.toggle('is-selected', on);
      button.classList.toggle('is-abnormal', on && button.dataset.value === 'yes');
      button.classList.toggle('is-normal', on && button.dataset.value === 'no');
    });
  }

  function toggleMulti(key, value) {
    var list = Array.isArray(state.multi[key]) ? state.multi[key].slice() : [];
    var index = list.indexOf(value);
    if (index === -1) {
      list.push(value);
      if (key === 'feedProblems' && value !== 'none') list = list.filter(function (item) { return item !== 'none'; });
      if (key === 'feedProblems' && value === 'none') list = ['none'];
    } else list.splice(index, 1);
    state.multi[key] = list;
    persist();
    paint();
  }

  function ensureExam(id) {
    if (!state.exam[id]) state.exam[id] = { status: '', note: '', choices: {} };
    if (!state.exam[id].choices) state.exam[id].choices = {};
    return state.exam[id];
  }

  function examSystem(id) {
    return content.EXAM_SYSTEMS.filter(function (system) { return system.id === id; })[0];
  }

  function pruneHiddenChoices(id, row) {
    var system = examSystem(id);
    if (!system) return;
    system.controls.forEach(function (control) {
      if (!controlVisible(system, control, row.choices)) delete row.choices[control.id];
    });
  }

  function toggleExamStatus(id, status) {
    var row = ensureExam(id);
    row.status = row.status === status ? '' : status;
    if (row.status) {
      row.choices = {};
      row.note = '';
    }
    persist();
    paint();
  }

  function toggleExamChoice(button) {
    var row = ensureExam(button.dataset.exam);
    var current = row.choices[button.dataset.control];
    row.choices[button.dataset.control] = current === button.dataset.value ? '' : button.dataset.value;
    row.status = '';
    pruneHiddenChoices(button.dataset.exam, row);
    persist();
    paint();
  }

  function toggleExamMulti(button) {
    var row = ensureExam(button.dataset.exam);
    var list = Array.isArray(row.choices[button.dataset.control]) ? row.choices[button.dataset.control].slice() : [];
    var index = list.indexOf(button.dataset.value);
    if (index === -1) list.push(button.dataset.value);
    else list.splice(index, 1);
    row.choices[button.dataset.control] = list;
    row.status = '';
    pruneHiddenChoices(button.dataset.exam, row);
    persist();
    paint();
  }

  function toggleObs(key, value) {
    state.obs[key] = state.obs[key] === value ? '' : value;
    if (key === 'oxygen' && state.obs.oxygen !== 'oxygen') state.obs.fio2 = '';
    persist();
    paint();
  }

  function toggleNested(bag, key, value) {
    bag[key] = bag[key] === value ? '' : value;
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
    if (!phrase) return;
    var factors = collectFactors(state);
    var line = typeof phrase.text === 'function' ? phrase.text(state, factors) : phrase.text;
    if (!line) return;
    if (state.plan.indexOf(line) === -1) state.plan = state.plan.trim() ? state.plan.trim() + ' ' + line : line;
    persist();
    paint();
  }

  function appendDiagnosis(id) {
    var diagnosis = content.DIAGNOSES.filter(function (item) { return item.id === id; })[0];
    if (!diagnosis || !diagnosis.text) return;
    if (state.impression.indexOf(diagnosis.text) === -1) {
      state.impression = state.impression.trim() ? state.impression.trim() + ' ' + diagnosis.text : diagnosis.text;
    }
    persist();
    paint();
  }

  function copyText(which, button) {
    var boxes = buildBoxes(state);
    var text = which === 'all' ? boxes.all : boxes[which];
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

  function guideHtml(key) {
    if (!key || !content.GUIDE[key]) return '';
    return '<p class="guide-note guide-note--' + key + '">' + esc(content.GUIDE[key]) + '</p>';
  }

  function ask(guide, guideAlso, inner, extraClass) {
    var tone = guide || '';
    return '<div class="ask' + (tone ? ' ask--' + tone : '') + (extraClass ? ' ' + extraClass : '') + '">' + inner + guideHtml(guide) + guideHtml(guideAlso) + '</div>';
  }

  function half(html) {
    return '<div class="half">' + html + '</div>';
  }

  function fieldLabel(text) {
    return '<span class="field-label">' + esc(text) + '</span>';
  }

  function choiceButtons(attr, name, options, current, extra) {
    extra = extra || '';
    return '<div class="choices" role="group" aria-label="' + esc(name) + '">' + options.map(function (option) {
      var on = current === option.value;
      var className = 'choice' + (on ? ' is-selected' : '') + (on && option.abnormal ? ' is-abnormal' : '') + (on && option.normal ? ' is-normal' : '');
      return '<button type="button" class="' + className + '" ' + attr + '="' + esc(name) + '" data-value="' + esc(option.value) + '" ' + extra + '>' + esc(option.label) + '</button>';
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

  function yn(key, label, yes, no, guide, abnormalYes) {
    var current = state.answers[key] || '';
    function button(value, text) {
      var on = current === value;
      var className = 'yn-btn' + (on ? ' is-selected' : '') + (on && value === 'yes' && abnormalYes ? ' is-abnormal' : '') + (on && value === 'no' ? ' is-normal' : '');
      return '<button type="button" class="' + className + '" data-answer="' + esc(key) + '" data-value="' + value + '">' + esc(text) + '</button>';
    }
    return ask(guide, '', '<div class="field">' + fieldLabel(label) + '<div class="yn" role="group">' + button('yes', yes || 'Yes') + button('no', no || 'No') + '</div></div>');
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

  function stepHtml(step) {
    if (step === 'context') return contextHtml();
    if (step === 'background') return backgroundHtml();
    if (step === 'history') return historyHtml();
    if (step === 'examination') return examinationHtml();
    if (step === 'results') return resultsHtml();
    return impressionHtml();
  }

  function contextHtml() {
    return '<section class="step">' +
      '<p id="context-needed" class="quiet-prompt">Gestation and age are still needed.</p>' +
      '<h2 class="group-title">Where and why</h2>' +
      half(bindChoices('place', 'Place', content.PLACES)) +
      '<div id="place-other-wrap" class="half">' + input('placeOther', 'Where', state.placeOther, { wide: true, placeholder: 'For example, recovery' }) + '</div>' +
      '<div class="field">' + fieldLabel('Reason for review') +
      '<div class="choices">' + content.REASONS.map(function (reason) {
        var on = state.reasons.indexOf(reason.id) !== -1;
        return '<button type="button" class="choice' + (on ? ' is-selected' : '') + '" data-reason="' + reason.id + '">' + esc(reason.label) + '</button>';
      }).join('') + '</div></div>' +
      '<div id="reason-other-wrap">' + input('reasonOther', 'Other reason', state.reasonOther, { wide: true }) + '</div>' +
      '<h2 class="group-title">Gestation and age</h2>' +
      '<div class="num-row">' +
        input('gestationWeeks', 'Weeks', state.gestationWeeks, { type: 'number', mode: 'numeric', placeholder: '39' }) +
        input('gestationDays', 'Days', state.gestationDays, { type: 'number', mode: 'numeric', placeholder: '2' }) +
      '</div>' +
      '<div class="field">' + fieldLabel('How to enter age') + choiceButtons('data-bind', 'ageMode', [
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
      '<p id="age-readout" class="readout"></p>' +
      '<h2 class="group-title">Baby</h2>' +
      bindChoices('sex', 'Sex', [
        { value: 'female', label: 'Female' },
        { value: 'male', label: 'Male' },
        { value: 'other', label: 'Other or not recorded' }
      ]) +
      '</section>';
  }

  function backgroundHtml() {
    return '<section class="step"><h2 class="group-title">Birth</h2>' +
      half(bindChoices('modeOfBirth', 'Mode of birth', content.MODES)) +
      '<div id="mode-other-wrap" class="half">' + input('modeOther', 'Mode', state.modeOther, { wide: true }) + '</div>' +
      half(bindChoices('plurality', 'Plurality', [
        { value: 'single', label: 'Singleton' },
        { value: 'multiple', label: 'Twins or more' }
      ])) +
      '<div class="num-row half">' +
        input('apgar1', 'Apgar 1 min', state.apgar1, { type: 'number', mode: 'numeric' }) +
        input('apgar5', 'Apgar 5 min', state.apgar5, { type: 'number', mode: 'numeric' }) +
      '</div>' +
      '<h2 class="group-title">Risk Factors for Sepsis</h2>' +
      half(input('romHours', 'Hours of rupture before birth', state.romHours, { type: 'number', mode: 'decimal' })) +
      '<div id="rom-offer" class="offer" hidden></div>' +
      '<div id="rom-preterm-wrap" class="half">' + yn('rom-preterm-18', 'Rupture for more than 18 hours before a preterm birth', 'Yes', 'No', 'ng195', true) + '</div>' +
      '<div id="rom-term-wrap" class="half">' + yn('rom-term-24', 'Rupture for more than 24 hours before a term birth', 'Yes', 'No', 'ng195', true) + '</div>' +
      '<div id="preterm-note" class="guide-note guide-note--preterm" hidden>' + esc(content.GUIDE.preterm) + '</div>' +
      yn('spontaneous-preterm', 'Preterm birth after spontaneous labour, before 37 weeks', 'Yes', 'No', 'ng195', true) +
      '<p class="hint">Set from the gestation. Change it to No if labour was not spontaneous, for example a pre-labour caesarean.</p>' +
      yn('gbs-maternal', 'Maternal GBS colonisation, bacteriuria, or infection this pregnancy', 'Yes', 'No', 'ng195', true) +
      yn('gbs-previous', 'Invasive GBS in a previous baby', 'Yes', 'No', 'ng195', true) +
      '<p class="hint">These two GBS questions count as one NICE NG195 risk factor if either is yes.</p>' +
      '<div id="sibling-wrap">' + yn('sibling-infection', 'Infection in another baby of this multiple pregnancy', 'Suspected or confirmed', 'No', 'red', true) + '</div>' +
      yn('maternal-sepsis', 'Maternal sepsis in labour or the early postpartum period', 'Yes', 'No', 'ng195', true) +
      yn('chorio', 'Suspected or confirmed chorioamnionitis', 'Yes', 'No', 'ng195', true) +
      yn('cpr', 'Cardiopulmonary resuscitation', 'Needed', 'Not needed', 'red', true) +
      yn('ventilation', 'Mechanical ventilation', 'Needed', 'Not needed', 'red', true) +
      yn('fever', 'Intrapartum fever', 'Yes', 'No', '', true) +
      '<p class="hint">Fever is part of the birth story. The current NICE list counts maternal sepsis and chorioamnionitis.</p>' +
      '<div class="field half">' + fieldLabel('Intrapartum antibiotics') + choiceButtons('data-answer', 'iap', [
        { value: 'none', label: 'None' },
        { value: 'given', label: 'Given' }
      ], state.answers.iap || '') + '</div>' +
      '<div id="iap-timing-wrap" class="half">' + input('iapTiming', 'First dose timing', state.iapTiming, { wide: true, placeholder: 'For example, 2 hours before birth' }) + '</div>' +
      '<h2 class="group-title">Kaiser Permanente</h2>' +
      '<p class="hint">Early-onset sepsis calculator. Written into the review, and not added to the NICE count.</p>' +
      content.KAISER.map(function (option) {
        return '<label class="field">' + fieldLabel(option.label) + '<input data-kaiser="' + option.id + '" value="' + esc(state.kaiser[option.id] || '') + '" autocomplete="off"></label>';
      }).join('') +
      '<h2 class="group-title">Hypoglycaemia Risk Factors</h2>' +
      yn('idm', 'Mother with diabetes, including gestational', 'Yes', 'No', 'bapm', true) +
      yn('beta-blocker', 'Beta-blocker in the third trimester or at birth', 'Yes', 'No', 'bapm', true) +
      yn('sga', 'Birth weight on or under the 2nd centile', 'Yes', 'No', 'bapm', true) +
      yn('wasted', 'Clinically wasted', 'Yes', 'No', 'bapm', true) +
      half(input('centile', 'Centile, if you already know it', state.centile, { placeholder: '9th' })) +
      yn('local-hypothermia', 'Hypothermia', 'Yes', 'No', 'local', true) +
      yn('local-acidosis', 'Perinatal acidosis', 'Yes', 'No', 'local', true) +
      yn('local-polycythaemia', 'Polycythaemia', 'Yes', 'No', 'local', true) +
      yn('local-family', 'Family history of a hypoglycaemia disorder', 'Yes', 'No', 'local', true) +
      yn('local-sepsis', 'Suspected or confirmed early-onset infection', 'Yes', 'No', 'local', true) +
      '<h2 class="group-title">Other relevant history</h2>' +
      yn('meconium', 'Meconium stained liquor', 'Yes', 'No', '', true) +
      yn('shoulder', 'Shoulder dystocia', 'Yes', 'No', '', true) +
      area('backgroundNote', 'Other relevant history', state.backgroundNote, 4) +
      '</section>';
  }

  function historyHtml() {
    return '<section class="step">' +
      '<p id="history-needed" class="quiet-prompt">Feeding, stools, urine, and parental concern are still needed.</p>' +
      area('historyNote', 'History', state.historyNote, 4) +
      '<h2 class="group-title">Feeding</h2>' +
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
      half(input('feedFrequency', 'Frequency', state.feedFrequency, { wide: true, placeholder: 'every 2 to 3 hours' })) +
      half(input('lastFeed', 'Last feed', state.lastFeed, { wide: true, placeholder: '40 minutes ago' })) +
      yn('topUps', 'Top-ups', 'Yes', 'No', '', false) +
      '<div id="topup-amount-wrap" class="half">' + input('topUpAmount', 'Top-up amount (ml)', state.topUpAmount, { type: 'number', mode: 'decimal' }) + '</div>' +
      ask('indicator', 'sign', '<div class="field">' + fieldLabel('Feeding problems') + multiButtons('feedProblems', [
        { value: 'none', label: 'None of these' },
        { value: 'vomiting', label: 'Vomiting', abnormal: true },
        { value: 'residuals', label: 'Large residuals', abnormal: true },
        { value: 'sleepy', label: 'Sleepy at the breast', abnormal: true },
        { value: 'refusal', label: 'Feed refusal', abnormal: true }
      ], state.multi.feedProblems || []) + '</div>') +
      '<h2 class="group-title">Stools, urine, and concern</h2>' +
      half(bindChoices('stools', 'Stools', [
        { value: 'none', label: 'None yet' },
        { value: 'meconium', label: 'Meconium' },
        { value: 'changing', label: 'Changing' }
      ])) +
      half(input('stoolCount', 'How many', state.stoolCount, { placeholder: '2' })) +
      '<p id="stool-prompt" class="quiet-prompt" hidden>No stool is recorded and this baby is over 24 hours old.</p>' +
      '<div class="field half">' + fieldLabel('Urine since birth') + choiceButtons('data-bind', 'urine', [
        { value: 'passed', label: 'Passed' },
        { value: 'not', label: 'Not passed', abnormal: true }
      ], state.urine) + '</div>' +
      '<p id="urine-prompt" class="quiet-prompt" hidden>No urine is recorded and this baby is over 24 hours old.</p>' +
      half(bindChoices('parentalConcern', 'Parental concern', [
        { value: 'none', label: 'None voiced' },
        { value: 'concerned', label: 'Concerned', abnormal: true }
      ])) +
      half(bindChoices('midwifeConcern', 'Midwife concern', [
        { value: 'no', label: 'None' },
        { value: 'yes', label: 'Concerned', abnormal: true }
      ])) +
      '<div id="parent-words-wrap" class="half">' + area('parentalWords', 'What the parents said', state.parentalWords, 3) + '</div>' +
      '<div id="midwife-words-wrap" class="half">' + area('midwifeWords', 'Midwife concern', state.midwifeWords, 3) + '</div>' +
      '<h2 class="group-title">Since birth</h2>' +
      '<p id="jaundice-flag" class="quiet-prompt" hidden>Under 24 hours, jaundice is an NICE NG195 clinical indicator and is pathological.</p>' +
      '<div class="field">' + fieldLabel('Events and symptoms') + multiButtons('sinceBirth', [
        { value: 'apnoea', label: 'Apnoea', abnormal: true },
        { value: 'seizures', label: 'Seizures', abnormal: true },
        { value: 'colour-change', label: 'Colour change', abnormal: true },
        { value: 'temp-instability', label: 'Temperature instability', abnormal: true },
        { value: 'jaundice', label: 'Jaundice noticed', abnormal: true },
        { value: 'jitteriness', label: 'Jitteriness', abnormal: true },
        { value: 'poor-tone', label: 'Poor tone', abnormal: true },
        { value: 'bleeding', label: 'Unexplained bleeding', abnormal: true }
      ], state.multi.sinceBirth || []) + '</div>' +
      '<p class="guide-note guide-note--red">Apnoea and seizures are NICE NG195 red flags.</p>' +
      '<p class="guide-note guide-note--indicator">Poor tone, unexplained bleeding, and jaundice under 24 hours are NICE NG195 clinical indicators.</p>' +
      '<p class="guide-note guide-note--sign">Jitteriness can occur with hypoglycaemia.</p>' +
      '<div id="jaundice-hours-wrap" class="half">' + input('jaundiceNoticedHours', 'Jaundice first noticed at (hours)', state.jaundiceNoticedHours, { type: 'number', mode: 'decimal' }) + '</div>' +
      area('historyExtra', 'Anything else', state.historyExtra, 3) +
      '</section>';
  }

  function examinationHtml() {
    return '<section class="step"><h2 class="group-title">Observations</h2>' +
      '<div class="num-row half">' +
        obsInput('temp', 'Temperature', 'decimal') +
        obsInput('hr', 'Heart rate', 'numeric') +
        obsInput('rr', 'Respiratory rate', 'numeric') +
      '</div>' +
      '<div class="sats-field half">' +
        obsInput('sats', 'Saturations (%)', 'numeric') +
        '<div class="field">' + fieldLabel('Breathing') + choiceButtons('data-obs-choice', 'oxygen', [
          { value: 'air', label: 'Air', normal: true },
          { value: 'oxygen', label: 'Oxygen', abnormal: true }
        ], state.obs.oxygen) + '</div>' +
        (state.obs.oxygen === 'oxygen' ? obsInput('fio2', '% O2', 'numeric') : '') +
      '</div>' +
      '<p id="obs-warning" class="quiet-prompt" hidden></p>' +
      '<div id="hr-confirm" class="ask ask--indicator">' + confirmChoice('confirmHr', 'Count the heart rate as an NICE NG195 abnormal heart rate') + guideHtml('indicator') + '</div>' +
      '<div id="rr-confirm" class="ask ask--indicator">' + confirmChoice('confirmTachypnoea', 'Count the respiratory rate as NICE NG195 respiratory distress') + guideHtml('indicator') + '</div>' +
      '<div id="hypoxia-confirm" class="ask ask--indicator">' + confirmChoice('confirmHypoxia', 'Count the saturations as NICE NG195 hypoxia') + guideHtml('indicator') + '</div>' +
      '<h2 class="group-title">Systems</h2>' +
      '<p class="hint">Record findings directly. NAD writes the normal line for that system, and Not examined is written into the note, so a blank is never turned into normal.</p>' +
      content.EXAM_SYSTEMS.map(examRowHtml).join('') +
      '</section>';
  }

  function obsInput(key, label, mode) {
    return '<label class="field">' + fieldLabel(label) + '<input class="num-input" type="number" inputmode="' + mode + '" data-obs="' + key + '" value="' + esc(state.obs[key] || '') + '" autocomplete="off"></label>';
  }

  function confirmChoice(key, label) {
    var on = state.answers[key] === 'yes';
    return '<button type="button" class="choice' + (on ? ' is-selected is-abnormal' : '') + '" data-answer="' + key + '" data-value="yes">' + esc(label) + '</button>';
  }

  function examRowHtml(system) {
    var row = state.exam[system.id] || { status: '', note: '', choices: {} };
    function statusButton(status, label) {
      var on = row.status === status;
      var className = 'exam-status' + (on ? ' is-selected' : '') + (on && status === 'nad' ? ' is-normal' : '');
      return '<button type="button" class="' + className + '" data-exam="' + system.id + '" data-exam-status="' + status + '">' + label + '</button>';
    }
    var choices = findingsActive(row) ? row.choices || {} : {};
    var controls = visibleControls(system, choices);
    var parts = [];
    for (var i = 0; i < controls.length; i += 1) {
      var control = controls[i];
      if (control.row) {
        var group = [];
        while (i < controls.length && controls[i].row === control.row) {
          group.push(examControlHtml(system.id, controls[i], choices));
          i += 1;
        }
        i -= 1;
        parts.push('<div class="control-row">' + group.join('') + '</div>');
      } else {
        parts.push(examControlHtml(system.id, control, choices));
      }
    }
    var noteLabel = system.noteLabel || (system.id === 'cardiovascular' ? 'Murmur site, grade, and radiation, or any other finding' : 'Anything the buttons do not cover');
    var note = noteVisible(system, choices)
      ? '<label class="field field--stack">' + fieldLabel(noteLabel) + '<textarea data-exam-note="' + system.id + '" rows="2" autocomplete="off">' + esc(findingsActive(row) ? row.note || '' : '') + '</textarea></label>'
      : '';
    var settled = row.status === 'nad' || row.status === 'not';
    return '<article class="exam-row' + (settled ? ' is-settled' : '') + '"><div class="exam-row-head"><h3>' + esc(system.label) + '</h3><div class="exam-actions">' + statusButton('nad', 'NAD') + statusButton('not', 'Not examined') + '</div></div>' +
      '<div class="exam-body">' + parts.join('') + note + '</div></article>';
  }

  function examControlHtml(systemId, control, choices) {
    var current = choices[control.id];
    var buttons = control.options.map(function (option) {
      var on = control.type === 'multi' ? Array.isArray(current) && current.indexOf(option.value) !== -1 : current === option.value;
      var className = (control.type === 'yn' ? 'yn-btn' : 'choice') + (on ? ' is-selected' : '') + (on && option.abnormal ? ' is-abnormal' : '') + (on && option.normal ? ' is-normal' : '');
      var marker = control.type === 'multi' ? 'data-exam-multi' : 'data-exam-choice';
      return '<button type="button" class="' + className + '" data-exam="' + systemId + '" data-control="' + control.id + '" ' + marker + ' data-value="' + esc(option.value) + '">' + esc(option.label) + '</button>';
    }).join('');
    var inner = '<div class="field">' + fieldLabel(control.label) + '<div class="' + (control.type === 'yn' ? 'yn' : 'choices') + '">' + buttons + '</div></div>';
    if (control.sub) return '<div class="exam-sub">' + ask(control.guide, control.guideAlso, inner) + '</div>';
    return ask(control.guide, control.guideAlso, inner, control.row ? '' : 'exam-ctl--' + controlSize(control));
  }

  function controlSize(control) {
    var chars = control.options.reduce(function (total, option) { return total + option.label.length; }, 0);
    if (control.type === 'yn' || chars <= 12) return 'compact';
    if (chars <= 30) return 'half';
    return 'wide';
  }

  function resultsHtml() {
    var rows = state.glucoses.map(function (row, index) {
      return '<div class="glucose-row"><div class="num-row">' +
        '<label class="field">' + fieldLabel('Time') + '<input data-glucose-field="time" data-index="' + index + '" value="' + esc(row.time) + '" autocomplete="off" placeholder="16:00"></label>' +
        '<label class="field">' + fieldLabel('mmol/L') + '<input class="num-input" type="number" inputmode="decimal" data-glucose-field="value" data-index="' + index + '" value="' + esc(row.value) + '" autocomplete="off"></label>' +
        '</div><div class="choices">' +
        glucoseMethod(index, 'gas', 'Blood gas', row.method) +
        glucoseMethod(index, 'meter', 'Meter', row.method) +
        (state.glucoses.length > 1 ? '<button type="button" class="text-button" data-action="remove-glucose" data-index="' + index + '">Remove</button>' : '') +
        '</div><p class="readout" data-band-index="' + index + '"></p></div>';
    }).join('');
    return '<section class="step"><h2 class="group-title">Glucose</h2>' +
      '<p class="hint">Bands follow the BAPM September 2024 framework for term babies in the first 72 hours: under 1.0, 1.0 to 1.9, and 2.0 or more. Some units still use 2.6. Follow the local pathway.</p>' +
      rows +
      '<button type="button" class="text-button" data-action="add-glucose">Add another glucose</button>' +
      '<div id="local-hypo-confirm" class="ask ask--indicator">' + confirmChoice('confirmLocalHypo', 'Count a glucose of 2.0 to 2.5 as hypoglycaemia on the local threshold') + guideHtml('indicator') + '</div>' +
      yn('hyperglycaemia', 'Hyperglycaemia', 'Yes', 'No', 'indicator', true) +
      '<h2 class="group-title">Bilirubin</h2>' +
      '<p id="jaundice-flag" class="quiet-prompt" hidden>Under 24 hours, jaundice is an NICE NG195 clinical indicator and is pathological.</p>' +
      '<div class="field half">' + fieldLabel('Bilirubin') + choiceButtons('data-bili-choice', 'kind', [
        { value: 'none', label: 'Not sent' },
        { value: 'tcb', label: 'Transcutaneous' },
        { value: 'tsb', label: 'Serum' }
      ], state.bilirubin.kind) + '</div>' +
      '<div id="bili-detail"><div class="num-row">' +
        '<label class="field">' + fieldLabel('Value') + '<input class="num-input" inputmode="decimal" data-bili="value" value="' + esc(state.bilirubin.value) + '" autocomplete="off"></label>' +
        '<label class="field">' + fieldLabel('Age in hours') + '<input class="num-input" type="number" inputmode="decimal" data-bili="ageHours" value="' + esc(state.bilirubin.ageHours) + '" autocomplete="off"></label>' +
      '</div><div class="field">' + fieldLabel('Treatment line, from your chart') + choiceButtons('data-bili-choice', 'plot', [
        { value: 'below', label: 'Below' },
        { value: 'on', label: 'On' },
        { value: 'above', label: 'Above', abnormal: true }
      ], state.bilirubin.plot) + '</div></div>' +
      '<h2 class="group-title">Gas</h2>' +
      '<div class="num-row">' +
        gasInput('ph', 'pH') + gasInput('be', 'Base deficit') + gasInput('lactate', 'Lactate') + gasInput('glucose', 'Glucose') +
      '</div>' +
      '<p class="hint">A base deficit of 10 mmol/L or more is recorded as an NICE NG195 clinical indicator.</p>' +
      yn('thrombocytopenia', 'Thrombocytopenia', 'Yes', 'No', 'indicator', true) +
      yn('coagulation', 'Abnormal coagulation', 'Yes', 'No', 'indicator', true) +
      area('resultsNote', 'Other results', state.resultsNote, 3) +
      '</section>';
  }

  function glucoseMethod(index, value, label, current) {
    var on = current === value;
    return '<button type="button" class="choice' + (on ? ' is-selected' : '') + '" data-glucose-method="' + value + '" data-index="' + index + '">' + label + '</button>';
  }

  function gasInput(key, label) {
    return '<label class="field">' + fieldLabel(label) + '<input class="num-input" inputmode="decimal" data-gas="' + key + '" value="' + esc(state.gas[key] || '') + '" autocomplete="off"></label>';
  }

  function impressionHtml() {
    return '<section class="step"><h2 class="group-title">Discussion summary</h2>' +
      '<p id="summary-preview" class="summary-preview"></p>' +
      '<p class="hint">This opening is built from the review. Impression and plan below are yours to edit.</p>' +
      '<h2 class="group-title">Impression</h2>' +
      '<div class="choices">' + content.DIAGNOSES.map(function (item) {
        return '<button type="button" class="choice" data-diagnosis="' + item.id + '">' + esc(item.label) + '</button>';
      }).join('') + '</div>' +
      area('impression', 'Impression', state.impression, 3) +
      '<h2 class="group-title">Plan</h2>' +
      '<div class="choices">' + content.PLAN_PHRASES.map(function (item) {
        return '<button type="button" class="choice" data-phrase="' + item.id + '">' + esc(item.label) + '</button>';
      }).join('') + '</div>' +
      area('plan', 'Plan', state.plan, 4) +
      '<div class="field">' + fieldLabel('Antibiotics') + choiceButtons('data-bind', 'antibiotics', [
        { value: 'none', label: 'Not started' },
        { value: 'senior', label: 'Decision with senior' },
        { value: 'started', label: 'Started' }
      ], state.antibiotics) + '</div>' +
      '<p class="hint">Names and times only. Doses stay on the drug chart.</p>' +
      '<div id="antibiotic-detail-wrap">' + input('antibioticDetail', 'Drug names and times', state.antibioticDetail, { wide: true }) + '</div>' +
      '<div class="num-row">' +
        input('reviewWhen', 'Review at', state.reviewWhen, { wide: true, placeholder: '16:00 or sooner if concerned' }) +
        input('escalateTo', 'Escalate to', state.escalateTo, { wide: true, placeholder: 'Registrar' }) +
      '</div>' +
      '<h2 class="group-title">Discussion with parents</h2>' +
      input('parentsWho', 'Who was present', state.parentsWho, { wide: true }) +
      area('parentsExplained', 'What was explained', state.parentsExplained, 3) +
      input('parentsUnderstanding', 'Their understanding', state.parentsUnderstanding, { wide: true }) +
      area('parentsConcerns', 'Concerns remaining', state.parentsConcerns, 2) +
      '<div class="note-inline" id="note-inline-anchor"></div></section>';
  }

  return {
    emptyState: emptyState,
    normalize: normalize,
    ageInHours: ageInHours,
    romSuggestion: romSuggestion,
    collectFactors: collectFactors,
    frameworkSentence: frameworkSentence,
    buildBoxes: buildBoxes,
    isPreterm: isPreterm,
    mount: mount
  };
});
