/*
 * Postnatal review — state, BadgerNet prose, and the page.
 *
 * Documentation aid only. Pure functions format clinician-entered findings.
 * They must not interpret observations, calculate or classify gestation,
 * count risk factors, apply thresholds, diagnose, or recommend management.
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
      gestationAtBirth: '',
      ageMode: 'manual',
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
      seniorDecision: '',
      parentsWho: '',
      parentsExplained: '',
      parentsUnderstanding: '',
      parentsConcerns: '',
      reviewWhen: '',
      seniorOutcome: ''
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
    /* Migrate older drafts that stored numeric weeks/days. Free text only;
     * do not classify or act on the value. */
    if (!state.gestationAtBirth) {
      var weeks = partial.gestationWeeks;
      var days = partial.gestationDays;
      if (weeks != null && weeks !== '') {
        state.gestationAtBirth = String(weeks) + (days != null && days !== '' ? '+' + days : '');
      }
    }
    delete state.gestationWeeks;
    delete state.gestationDays;
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

  function gestationText(state) {
    return String(state.gestationAtBirth || '').trim();
  }

  function examRow(state, id) {
    return state.exam && state.exam[id] ? state.exam[id] : null;
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

  function selectedLabels(system, controlId, choices) {
    var control = findControl(system, controlId);
    if (!control) return [];
    return selectedOptions(control, choices).map(function (option) { return option.label; });
  }

  function murmurProse(system, choices) {
    var details = [];
    selectedLabels(system, 'murmurTiming', choices).forEach(function (label) {
      details.push(label.toLowerCase());
    });
    if (choices.murmurGrade) details.push('grade ' + choices.murmurGrade);
    var loc = selectedLabels(system, 'murmurLocation', choices).map(function (label) { return label.toLowerCase(); });
    if (loc.length) details.push('at ' + loc.join(', '));
    var rad = selectedLabels(system, 'murmurRadiation', choices).map(function (label) { return label.toLowerCase(); });
    if (rad.length) details.push('radiation ' + rad.join(', '));
    var character = selectedLabels(system, 'murmurCharacter', choices).map(function (label) { return label.toLowerCase(); });
    if (character.length) details.push(character.join(', '));
    var pitch = selectedLabels(system, 'murmurPitch', choices).map(function (label) { return label.toLowerCase() + '-pitched'; });
    if (pitch.length) details.push(pitch.join(', '));
    if (!details.length) return 'Murmur present.';
    return 'Murmur present (' + details.join('; ') + ').';
  }

  function niceLines(answerKey, state) {
    if (!state.answers || state.answers[answerKey] !== 'yes') return [];
    var entry = content.NICE_DOC[answerKey];
    if (!entry) return [];
    return [entry.fact, entry.label];
  }

  /* Count only explicitly selected findings. Never infer from observation
   * values, gestation free text, gas results, or glucose numbers. */
  function collectFactors(partial) {
    var state = normalize(partial);
    var byId = {};
    content.FACTORS.forEach(function (factor) { byId[factor.id] = factor; });
    var found = {};
    function add(id) {
      if (!byId[id] || found[id]) return;
      found[id] = byId[id];
    }
    if (state.answers['gbs-maternal'] === 'yes' || state.answers['gbs-previous'] === 'yes') add('gbs');
    [
      'sibling-infection', 'spontaneous-preterm', 'rom-preterm-18', 'rom-term-24',
      'maternal-sepsis', 'chorio', 'cpr', 'ventilation', 'idm', 'beta-blocker', 'sga', 'wasted',
      'apnoea', 'seizures', 'shock', 'altered-behaviour', 'altered-tone', 'feed-refusal',
      'feed-intolerance', 'abnormal-hr', 'resp-distress', 'hypoxia', 'pphn', 'jaundice-24h',
      'encephalopathy', 'temp-abnormal', 'bleeding-coag', 'altered-glucose', 'metabolic-acidosis'
    ].forEach(function (id) {
      if (state.answers[id] === 'yes') add(id);
    });
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
    if (state.answers.thrombocytopenia === 'yes' || state.answers.coagulation === 'yes') add('bleeding-coag');
    if (state.answers.hyperglycaemia === 'yes') add('altered-glucose');
    return Object.keys(found).map(function (id) { return found[id]; });
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

  function findingsProse(system, row) {
    var abnormal = [];
    var normal = [];
    var fragments = [];
    var flagged = false;
    var note = '';
    var choices = row.choices || {};
    var shown = visibleControls(system, choices);
    var shownIds = shown.map(function (control) { return control.id; });
    shown.forEach(function (control) {
      selectedOptions(control, choices).forEach(function (option) {
        if (option.abnormal) flagged = true;
        if (option.compose === 'murmur') {
          var murmur = murmurProse(system, choices);
          if (option.abnormal) abnormal.push(murmur);
          else normal.push(murmur);
          return;
        }
        if (!option.prose) return;
        if (option.supersededBy && shownIds.indexOf(option.supersededBy) !== -1) {
          var detail = choices[option.supersededBy];
          if (Array.isArray(detail) ? detail.length : detail) return;
        }
        if (option.fragment) {
          fragments.push(option.prose);
          return;
        }
        if (option.abnormal) abnormal.push(option.prose);
        else normal.push(option.prose);
      });
    });
    var hasNote = noteVisible(system, choices) && row.note && String(row.note).trim();
    if (hasNote) {
      note = ensurePeriod(row.note);
    } else {
      shown.forEach(function (control) {
        selectedOptions(control, choices).forEach(function (option) {
          if (option.fallback) abnormal.push(option.fallback);
        });
      });
    }
    return { abnormal: abnormal, normal: normal, fragments: fragments, flagged: flagged, note: note };
  }

  function formatExamBlock(system, split, shorter) {
    var sentences = split.abnormal.concat(shorter ? [] : split.normal);
    if (split.note) sentences.push(split.note);
    var chunks = [];
    if (split.fragments && split.fragments.length) {
      chunks.push(ensurePeriod(system.label + ' ' + split.fragments.join(', ')));
    }
    if (sentences.length) {
      if (chunks.length) chunks.push(sentences.join(' '));
      else chunks.push(system.label + ': ' + sentences.join(' '));
    }
    return chunks.join(' ');
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
    var abnormalBlocks = [];
    var normalBlocks = [];
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
        if (!shorter) normalBlocks.push(system.label + ': ' + system.nad);
        return;
      }
      var split = findingsProse(system, row);
      var block = formatExamBlock(system, split, shorter);
      if (!block) return;
      if (split.abnormal.length || split.flagged) abnormalBlocks.push(block);
      else normalBlocks.push(block);
    });
    var observations = obsSentence(state);
    if (observations) lines.push(observations);
    lines = lines.concat(abnormalBlocks);
    if (!shorter) lines = lines.concat(normalBlocks);
    if (skipped.length) lines.push(notExaminedSentence(skipped));
    return cleanLines(lines);
  }

  function impressionParagraph(state) {
    var text = (state.impression || '').trim();
    if (!text) return '';
    if (/^impression:/i.test(text)) return ensurePeriod(text);
    return 'Impression: ' + ensurePeriod(text);
  }

  function planItems(state) {
    var bits = [];
    if (state.plan && state.plan.trim()) {
      state.plan.split(/\n+/).forEach(function (line) {
        var trimmed = String(line || '').trim().replace(/^\d+\.\s*/, '');
        if (trimmed) bits.push(ensurePeriod(trimmed));
      });
    }
    if (state.antibiotics === 'none') bits.push('No antibiotics.');
    if (state.antibiotics === 'senior') {
      var discussed = 'Antibiotics discussed with senior.';
      if (state.seniorDecision && state.seniorDecision.trim()) discussed += ' Senior decision: ' + ensurePeriod(state.seniorDecision.trim());
      bits.push(discussed);
    }
    if (state.antibiotics === 'started') {
      var started = 'Antibiotics started.';
      if (state.antibioticDetail && state.antibioticDetail.trim()) started += ' ' + ensurePeriod(state.antibioticDetail.trim());
      bits.push(started);
    }
    if (state.reviewWhen && state.reviewWhen.trim()) bits.push('Review at ' + state.reviewWhen.trim() + '.');
    if (state.seniorOutcome && state.seniorOutcome.trim()) bits.push('Senior discussion outcome: ' + ensurePeriod(state.seniorOutcome.trim()));
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

  function parentParagraph(state) {
    var bits = [];
    if (state.parentsWho && state.parentsWho.trim()) bits.push('Spoken with ' + state.parentsWho.trim() + '.');
    if (state.parentsExplained && state.parentsExplained.trim()) bits.push(ensurePeriod(state.parentsExplained.trim()));
    if (state.parentsUnderstanding && state.parentsUnderstanding.trim()) bits.push('Understanding: ' + ensurePeriod(state.parentsUnderstanding.trim()));
    if (state.parentsConcerns && state.parentsConcerns.trim()) bits.push('Remaining concerns: ' + ensurePeriod(state.parentsConcerns.trim()));
    return bits.join(' ');
  }

  function discussionText(state) {
    return cleanLines([
      impressionParagraph(state),
      planParagraph(state),
      parentParagraph(state)
    ]);
  }

  function membraneSentence(state) {
    var hours = num(state.romHours);
    if (hours == null) return '';
    return 'Membranes ruptured for ' + hours + ' hours.';
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
      lines.push(sentence + '.');
    });
    if (state.bilirubin.kind === 'none') lines.push('No bilirubin sent.');
    if ((state.bilirubin.kind === 'tcb' || state.bilirubin.kind === 'tsb') && state.bilirubin.value) {
      var name = state.bilirubin.kind === 'tcb' ? 'Transcutaneous bilirubin' : 'Serum bilirubin';
      var sentence = name + ' ' + state.bilirubin.value;
      if (state.bilirubin.ageHours) sentence += ' at ' + state.bilirubin.ageHours + ' hours';
      if (state.bilirubin.plot === 'below') sentence += ', below the treatment line on the chart used';
      if (state.bilirubin.plot === 'on') sentence += ', on the treatment line on the chart used';
      if (state.bilirubin.plot === 'above') sentence += ', above the treatment line on the chart used';
      lines.push(sentence + '.');
    }
    var gasBits = [];
    if (state.gas.ph) gasBits.push('pH ' + state.gas.ph);
    if (state.gas.be) gasBits.push('base deficit ' + state.gas.be);
    if (state.gas.lactate) gasBits.push('lactate ' + state.gas.lactate);
    if (state.gas.glucose) gasBits.push('glucose ' + state.gas.glucose);
    if (gasBits.length) lines.push('Blood gas: ' + gasBits.join(', ') + '.');
    lines = lines.concat(niceLines('thrombocytopenia', state));
    lines = lines.concat(niceLines('coagulation', state));
    if (state.answers.hyperglycaemia === 'yes') lines.push('Hyperglycaemia documented.');
    if (state.resultsNote && state.resultsNote.trim()) lines.push(ensurePeriod(state.resultsNote.trim()));
    return lines;
  }

  function reasonSentence(state) {
    if (!state.reasons || !state.reasons.length) return '';
    var reasonLabels = content.REASONS.filter(function (reason) {
      return state.reasons.indexOf(reason.id) !== -1;
    }).map(function (reason) { return reason.label.toLowerCase(); });
    if (state.reasons.indexOf('other') !== -1 && state.reasonOther && state.reasonOther.trim()) {
      reasonLabels = reasonLabels.filter(function (label) { return label !== 'other'; });
      reasonLabels.push(state.reasonOther.trim());
    }
    if (!reasonLabels.length) return '';
    return 'Reason for review: ' + reasonLabels.join(', ') + '.';
  }

  function backgroundFeatures(state) {
    var bits = [];
    if (state.plurality === 'multiple') bits.push('Multiple pregnancy.');
    if (state.sex) bits.push('Sex: ' + state.sex + '.');
    if (state.centile && state.centile.trim()) bits.push('Birth-weight centile ' + state.centile.trim() + '.');
    bits.push(membraneSentence(state));
    [
      'gbs-maternal', 'gbs-previous', 'spontaneous-preterm', 'rom-preterm-18', 'rom-term-24',
      'maternal-sepsis', 'chorio', 'sibling-infection'
    ].forEach(function (key) {
      bits = bits.concat(niceLines(key, state));
    });
    if (state.answers.idm === 'yes') bits.push('Mother with diabetes, including gestational, documented.');
    if (state.answers['beta-blocker'] === 'yes') bits.push('Beta-blocker in the third trimester or at birth documented.');
    if (state.answers.sga === 'yes') bits.push('Birth weight on or under the 2nd centile documented.');
    if (state.answers.wasted === 'yes') bits.push('Clinically wasted documented.');
    if (state.answers['local-hypothermia'] === 'yes') bits.push('Hypothermia documented.');
    if (state.answers['local-acidosis'] === 'yes') bits.push('Perinatal acidosis documented.');
    if (state.answers['local-polycythaemia'] === 'yes') bits.push('Polycythaemia documented.');
    if (state.answers['local-family'] === 'yes') bits.push('Family history of a hypoglycaemia disorder documented.');
    if (state.answers['local-sepsis'] === 'yes') bits.push('Suspected or confirmed early-onset infection documented.');
    if (state.answers.iap === 'given') bits.push('Intrapartum antibiotics given' + (state.iapTiming && state.iapTiming.trim() ? ' (' + state.iapTiming.trim() + ')' : '') + '.');
    if (state.answers.iap === 'none') bits.push('No intrapartum antibiotics.');
    if (state.answers.fever === 'yes') bits.push('Intrapartum fever documented.');
    if (state.answers.meconium === 'yes') bits.push('Meconium stained liquor.');
    if (state.answers.shoulder === 'yes') bits.push('Shoulder dystocia.');
    if (state.backgroundNote && state.backgroundNote.trim()) bits.push(ensurePeriod(state.backgroundNote.trim()));
    bits.push(kaiserSentence(state));
    return bits.map(function (bit) { return String(bit || '').trim(); }).filter(Boolean);
  }

  function reviewText(state, shorter) {
    var lines = [];
    var birth = '';
    var gestation = gestationText(state);
    var mode = modePhrase(state);
    var age = ageInHours(state);
    if (gestation) birth += gestation;
    if (mode) birth += (birth ? ', born by ' : 'Born by ') + mode;
    if (age != null) birth += (birth ? ', now ' : 'Now ') + shortAge(age) + ' old';
    if (state.apgar1 || state.apgar5) {
      birth += (birth ? '. Apgars ' : 'Apgars ') + (state.apgar1 || '?') + ' at 1 minute and ' + (state.apgar5 || '?') + ' at 5 minutes';
    }
    if (birth) lines.push(/[.!?]$/.test(birth) ? birth : birth + '.');
    var reason = reasonSentence(state);
    if (reason) lines.push(reason);
    var bg = backgroundFeatures(state);
    if (bg.length) lines.push('BG: ' + bg.join(' '));
    if (state.historyNote && state.historyNote.trim()) lines.push(ensurePeriod(state.historyNote.trim()));
    lines.push(feedingSentence(state, shorter));
    lines.push(stoolSentence(state));
    lines.push(urineSentence(state));
    lines.push(parentConcernSentence(state));
    if (state.midwifeConcern === 'yes') {
      lines.push(state.midwifeWords && state.midwifeWords.trim()
        ? 'Midwife concern: ' + state.midwifeWords.trim()
        : 'The midwife is concerned.');
    }
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
    [
      'apnoea', 'seizures', 'cpr', 'ventilation', 'shock',
      'altered-behaviour', 'altered-tone', 'feed-refusal', 'feed-intolerance',
      'abnormal-hr', 'resp-distress', 'hypoxia', 'pphn', 'jaundice-24h',
      'encephalopathy', 'temp-abnormal', 'bleeding-coag', 'altered-glucose', 'metabolic-acidosis'
    ].forEach(function (key) {
      lines = lines.concat(niceLines(key, state));
    });
    if (state.answers['jaundice-24h'] === 'yes' && state.jaundiceNoticedHours) {
      lines.push('Jaundice noticed at ' + state.jaundiceNoticedHours + ' hours.');
    }
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
    var discussion = discussionText(state);
    var review = reviewText(state, !!state.shorter);
    return {
      examination: examination,
      discussion: discussion,
      review: review,
      all: ['Examination', examination, '', 'Discussion', discussion, '', 'Review', review].join('\n').trim(),
      factors: factors,
      redCount: factors.filter(function (factor) { return factor.kind === 'ng195-red'; }).length,
      otherCount: factors.filter(function (factor) { return factor.kind === 'ng195-other'; }).length,
      bapm: factors.filter(function (factor) { return factor.kind === 'bapm'; })
    };
  }

  function missingRequired(state) {
    return {
      context: ageInHours(state) == null,
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
      if ((step.id === 'context' && missing.context) || (step.id === 'history' && missing.history)) className += ' is-incomplete';
      return '<button type="button" class="' + className + '" data-step="' + step.id + '"><span class="step-index">' + (index + 1) + '</span>' + esc(step.label) + '</button>';
    }).join('');
  }

  function renderStatus() {
    var el = document.getElementById('status-strip');
    if (!el) return;
    var boxes = buildBoxes(state);
    var gestation = gestationText(state);
    var age = ageInHours(state);
    var left = 'Documentation draft';
    if (gestation || age != null || placeLabel(state)) {
      left = [gestation || '', age != null ? shortAge(age) : '', placeLabel(state)].filter(Boolean).join(' · ');
    }
    var hypo = boxes.bapm.length
      ? 'Hypoglycaemia items: ' + boxes.bapm.length + ' (' + boxes.bapm.map(function (factor) { return factor.summary; }).join(', ') + ')'
      : 'No BAPM hypoglycaemia items selected';
    el.innerHTML = '<p class="status-main"><strong>' + esc(left) + '</strong>' +
      '<span>NICE: ' + boxes.redCount + ' red flag' + (boxes.redCount === 1 ? '' : 's') + ', ' + boxes.otherCount + ' other</span>' +
      '<span>' + esc(hypo) + '</span></p>' +
      '<p class="status-count-note">Counts selected findings only. Not a risk score or management recommendation.</p>';
  }

  function renderNote() {
    var boxes = buildBoxes(state);
    setBox('out-examination', boxes.examination);
    setBox('out-discussion', boxes.discussion);
    setBox('out-review', boxes.review);
  }

  function setBox(id, text) {
    var el = document.getElementById(id);
    if (!el) return;
    if (document.activeElement === el) return;
    var key = el.dataset.noteBox;
    if (key && state.noteEdits && Object.prototype.hasOwnProperty.call(state.noteEdits, key)) {
      text = state.noteEdits[key];
    }
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
    show('history-needed', missing.history);
  }

  function syncVisibility() {
    show('place-other-wrap', state.place === 'other');
    show('reason-other-wrap', (state.reasons || []).indexOf('other') !== -1);
    show('mode-other-wrap', state.modeOfBirth === 'other');
    show('age-times', state.ageMode !== 'manual');
    show('age-manual', state.ageMode === 'manual');
    show('iap-timing-wrap', state.answers.iap === 'given');
    show('feed-latch-wrap', state.feedMode === 'breast' || state.feedMode === 'mixed');
    show('feed-duration-wrap', state.feedMode === 'breast' || state.feedMode === 'mixed');
    show('feed-amount-wrap', state.feedMode === 'formula' || state.feedMode === 'expressed' || state.feedMode === 'mixed' || state.feedMode === 'tube');
    show('topup-amount-wrap', state.answers.topUps === 'yes');
    show('parent-words-wrap', state.parentalConcern === 'concerned');
    show('midwife-words-wrap', state.midwifeConcern === 'yes');
    show('jaundice-hours-wrap', state.answers['jaundice-24h'] === 'yes' || (state.multi.sinceBirth || []).indexOf('jaundice') !== -1);
    show('antibiotic-detail-wrap', state.antibiotics === 'started');
    show('senior-decision-wrap', state.antibiotics === 'senior');
    show('bili-detail', state.bilirubin.kind === 'tcb' || state.bilirubin.kind === 'tsb');
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
    else if (target.dataset.gas) state.gas[target.dataset.gas] = target.value;
    else if (target.dataset.bili) state.bilirubin[target.dataset.bili] = target.value;
    else if (target.dataset.kaiser) state.kaiser[target.dataset.kaiser] = target.value;
    else if (target.dataset.glucoseField) {
      var row = state.glucoses[Number(target.dataset.index)];
      if (row) row[target.dataset.glucoseField] = target.value;
    } else if (target.dataset.examText) {
      var examText = ensureExam(target.dataset.exam);
      if (!examText.choices) examText.choices = {};
      examText.choices[target.dataset.examText] = target.value;
      if (examText.status) {
        examText.status = '';
        var textArticle = target.closest('.exam-row');
        if (textArticle) {
          textArticle.classList.remove('is-settled');
          textArticle.querySelectorAll('.exam-status').forEach(function (button) {
            button.classList.remove('is-selected', 'is-normal');
          });
        }
      }
    } else if (target.dataset.examNote) {
      var exam = ensureExam(target.dataset.examNote);
      exam.note = target.value;
      exam.noteOpen = true;
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
    if (button.dataset.examNoteToggle) { toggleExamNote(button.dataset.examNoteToggle); return; }
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
    if (!state.exam[id]) state.exam[id] = { status: '', note: '', noteOpen: false, choices: {} };
    if (!state.exam[id].choices) state.exam[id].choices = {};
    if (state.exam[id].noteOpen == null) {
      state.exam[id].noteOpen = !!(state.exam[id].note && String(state.exam[id].note).trim());
    }
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
    if (!phrase || !phrase.text) return;
    var line = phrase.text;
    if (state.plan.indexOf(line) === -1) {
      state.plan = state.plan.trim() ? state.plan.trim() + '\n' + line : line;
    }
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

  function noteBoxText(which) {
    var el = document.getElementById('out-' + which);
    if (!el) return '';
    var text = String(el.textContent || '').trim();
    if (!text || text === 'Nothing for this box yet.') return '';
    return text;
  }

  function copyText(which, button) {
    var text;
    if (which === 'all') {
      text = ['Examination', noteBoxText('examination'), '', 'Discussion', noteBoxText('discussion'), '', 'Review', noteBoxText('review')].join('\n').trim();
    } else {
      text = noteBoxText(which);
    }
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
    if (!key || !content.GUIDE || !content.GUIDE[key]) return '';
    return '<p class="guide-note guide-note--' + key + '">' + esc(content.GUIDE[key]) + '</p>';
  }

  function ask(guide, inner, extraClass) {
    if (typeof guide !== 'string') {
      extraClass = inner;
      inner = guide;
      guide = '';
    }
    return '<div class="ask' + (guide ? ' ask--' + guide : '') + (extraClass ? ' ' + extraClass : '') + '">' +
      inner + guideHtml(guide) + '</div>';
  }

  function half(html) {
    return '<div class="half">' + html + '</div>';
  }

  function groupCard(title, inner) {
    return '<article class="group-card">' +
      (title ? '<h2 class="group-title">' + esc(title) + '</h2>' : '') +
      '<div class="group-body">' + inner + '</div></article>';
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

  function yn(key, label, yes, no, guide) {
    var current = state.answers[key] || '';
    var entry = content.NICE_DOC[key];
    var tone = guide || (entry && entry.kind) || '';
    function button(value, text) {
      var on = current === value;
      var className = 'yn-btn' + (on ? ' is-selected' : '') +
        (on && value === 'yes' && tone ? ' is-abnormal' : '') +
        (on && value === 'no' ? ' is-normal' : '');
      return '<button type="button" class="' + className + '" data-answer="' + esc(key) + '" data-value="' + value + '">' + esc(text) + '</button>';
    }
    return ask(tone, '<div class="field">' + fieldLabel(label) + '<div class="yn" role="group">' + button('yes', yes || 'Yes') + button('no', no || 'No') + '</div></div>');
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
      '<p id="context-needed" class="quiet-prompt">Age at review is still needed.</p>' +
      groupCard('Where and why',
        half(bindChoices('place', 'Place', content.PLACES)) +
        '<div id="place-other-wrap" class="half">' + input('placeOther', 'Where', state.placeOther, { wide: true, placeholder: 'For example, recovery' }) + '</div>' +
        '<div class="field">' + fieldLabel('Reason for review') +
        '<div class="choices">' + content.REASONS.map(function (reason) {
          var on = state.reasons.indexOf(reason.id) !== -1;
          return '<button type="button" class="choice' + (on ? ' is-selected' : '') + '" data-reason="' + reason.id + '">' + esc(reason.label) + '</button>';
        }).join('') + '</div></div>' +
        '<div id="reason-other-wrap">' + input('reasonOther', 'Other reason', state.reasonOther, { wide: true }) + '</div>'
      ) +
      groupCard('Gestation and age',
        input('gestationAtBirth', 'Gestation at birth (as documented by clinician)', state.gestationAtBirth, { wide: true, placeholder: 'For example, 39+2 or term' }) +
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
      groupCard('Baby',
        bindChoices('sex', 'Sex', [
          { value: 'female', label: 'Female' },
          { value: 'male', label: 'Male' },
          { value: 'other', label: 'Other or not recorded' }
        ])
      ) +
      '</section>';
  }

  function backgroundHtml() {
    return '<section class="step">' +
      groupCard('Birth',
        half(bindChoices('modeOfBirth', 'Mode of birth', content.MODES)) +
        '<div id="mode-other-wrap" class="half">' + input('modeOther', 'Mode', state.modeOther, { wide: true }) + '</div>' +
        half(bindChoices('plurality', 'Plurality', [
          { value: 'single', label: 'Singleton' },
          { value: 'multiple', label: 'Twins or more' }
        ])) +
        '<div class="num-row half">' +
          input('apgar1', 'Apgar 1 min', state.apgar1, { type: 'number', mode: 'numeric' }) +
          input('apgar5', 'Apgar 5 min', state.apgar5, { type: 'number', mode: 'numeric' }) +
        '</div>'
      ) +
      groupCard('NICE Box 1: early-onset infection risk factors',
        '<h3 class="group-subhead">Red-flag risk factor</h3>' +
        yn('sibling-infection', 'Suspected or confirmed infection in another baby of a multiple pregnancy', 'Yes', 'No') +
        '<h3 class="group-subhead">Other risk factors</h3>' +
        yn('gbs-previous', 'Invasive group B streptococcal infection in a previous baby', 'Yes', 'No') +
        yn('gbs-maternal', 'Maternal group B streptococcal colonisation, bacteriuria, or infection in this pregnancy', 'Yes', 'No') +
        yn('spontaneous-preterm', 'Preterm birth following spontaneous labour before 37 weeks', 'Yes', 'No') +
        yn('rom-preterm-18', 'Confirmed rupture of membranes for more than 18 hours before a preterm birth', 'Yes', 'No') +
        yn('rom-term-24', 'Confirmed rupture of membranes for more than 24 hours before a term birth', 'Yes', 'No') +
        yn('maternal-sepsis', 'Suspected or confirmed maternal sepsis in the intrapartum or early postpartum period', 'Yes', 'No') +
        yn('chorio', 'Suspected or confirmed chorioamnionitis', 'Yes', 'No')
      ) +
      groupCard('Documented perinatal history',
        half(input('romHours', 'Hours of rupture before birth', state.romHours, { type: 'number', mode: 'decimal' })) +
        yn('fever', 'Intrapartum fever', 'Yes', 'No') +
        '<div class="field half">' + fieldLabel('Intrapartum antibiotics') + choiceButtons('data-answer', 'iap', [
          { value: 'none', label: 'None' },
          { value: 'given', label: 'Given' }
        ], state.answers.iap || '') + '</div>' +
        '<div id="iap-timing-wrap" class="half">' + input('iapTiming', 'First dose timing', state.iapTiming, { wide: true, placeholder: 'For example, 2 hours before birth' }) + '</div>'
      ) +
      groupCard('Kaiser Permanente values',
        content.KAISER.map(function (option) {
          return '<label class="field">' + fieldLabel(option.label) + '<input data-kaiser="' + option.id + '" value="' + esc(state.kaiser[option.id] || '') + '" autocomplete="off"></label>';
        }).join('')
      ) +
      groupCard('Documented hypoglycaemia-related history',
        yn('idm', 'Mother with diabetes, including gestational', 'Yes', 'No', 'bapm') +
        yn('beta-blocker', 'Beta-blocker in the third trimester or at birth', 'Yes', 'No', 'bapm') +
        yn('sga', 'Birth weight on or under the 2nd centile', 'Yes', 'No', 'bapm') +
        yn('wasted', 'Clinically wasted', 'Yes', 'No', 'bapm') +
        half(input('centile', 'Centile, if documented', state.centile, { placeholder: '9th' })) +
        yn('local-hypothermia', 'Hypothermia', 'Yes', 'No', 'local') +
        yn('local-acidosis', 'Perinatal acidosis', 'Yes', 'No', 'local') +
        yn('local-polycythaemia', 'Polycythaemia', 'Yes', 'No', 'local') +
        yn('local-family', 'Family history of a hypoglycaemia disorder', 'Yes', 'No', 'local') +
        yn('local-sepsis', 'Suspected or confirmed early-onset infection', 'Yes', 'No', 'local')
      ) +
      groupCard('Other relevant history',
        yn('meconium', 'Meconium stained liquor', 'Yes', 'No') +
        yn('shoulder', 'Shoulder dystocia', 'Yes', 'No') +
        area('backgroundNote', 'Other relevant history', state.backgroundNote, 4)
      ) +
      '</section>';
  }

  function historyHtml() {
    return '<section class="step">' +
      '<p id="history-needed" class="quiet-prompt">Feeding, stools, urine, and parental concern are still needed.</p>' +
      groupCard('History',
        area('historyNote', 'History', state.historyNote, 4)
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
        half(input('feedFrequency', 'Frequency', state.feedFrequency, { wide: true, placeholder: 'every 2 to 3 hours' })) +
        half(input('lastFeed', 'Last feed', state.lastFeed, { wide: true, placeholder: '40 minutes ago' })) +
        yn('topUps', 'Top-ups', 'Yes', 'No') +
        '<div id="topup-amount-wrap" class="half">' + input('topUpAmount', 'Top-up amount (ml)', state.topUpAmount, { type: 'number', mode: 'decimal' }) + '</div>' +
        ask('indicator', '<div class="field">' + fieldLabel('Feeding problems') + multiButtons('feedProblems', [
          { value: 'none', label: 'None of these' },
          { value: 'vomiting', label: 'Vomiting', abnormal: true },
          { value: 'residuals', label: 'Large residuals', abnormal: true },
          { value: 'sleepy', label: 'Sleepy at the breast', abnormal: true },
          { value: 'refusal', label: 'Feed refusal', abnormal: true }
        ], state.multi.feedProblems || []) + '</div>')
      ) +
      groupCard('Stools, urine, and concern',
        half(bindChoices('stools', 'Stools', [
          { value: 'none', label: 'None yet' },
          { value: 'meconium', label: 'Meconium' },
          { value: 'changing', label: 'Changing' }
        ])) +
        half(input('stoolCount', 'How many', state.stoolCount, { placeholder: '2' })) +
        '<div class="field half">' + fieldLabel('Urine since birth') + choiceButtons('data-bind', 'urine', [
          { value: 'passed', label: 'Passed' },
          { value: 'not', label: 'Not passed', abnormal: true }
        ], state.urine) + '</div>' +
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
      groupCard('NICE Box 2: clinical indicators',
        '<h3 class="group-subhead">Red-flag clinical indicators</h3>' +
        yn('apnoea', 'Apnoea (temporary stopping of breathing)', 'Yes', 'No') +
        yn('seizures', 'Seizures', 'Yes', 'No') +
        yn('cpr', 'Need for cardiopulmonary resuscitation', 'Yes', 'No') +
        yn('ventilation', 'Need for mechanical ventilation', 'Yes', 'No') +
        yn('shock', 'Signs of shock', 'Yes', 'No') +
        '<h3 class="group-subhead">Other clinical indicators</h3>' +
        yn('altered-behaviour', 'Altered behaviour or responsiveness', 'Yes', 'No') +
        yn('altered-tone', 'Altered muscle tone (for example, floppiness)', 'Yes', 'No') +
        yn('feed-refusal', 'Feeding difficulties (for example, feed refusal)', 'Yes', 'No') +
        yn('feed-intolerance', 'Feed intolerance, including vomiting, excessive gastric aspirates, and abdominal distension', 'Yes', 'No') +
        yn('abnormal-hr', 'Abnormal heart rate (bradycardia or tachycardia)', 'Yes', 'No') +
        yn('resp-distress', 'Signs of respiratory distress (including grunting, recession, tachypnoea)', 'Yes', 'No') +
        yn('hypoxia', 'Hypoxia (for example, central cyanosis or reduced oxygen saturation)', 'Yes', 'No') +
        yn('pphn', 'Persistent pulmonary hypertension of the newborn', 'Yes', 'No') +
        yn('jaundice-24h', 'Jaundice within 24 hours of birth', 'Yes', 'No') +
        '<div id="jaundice-hours-wrap" class="half">' + input('jaundiceNoticedHours', 'Jaundice first noticed at (hours)', state.jaundiceNoticedHours, { type: 'number', mode: 'decimal' }) + '</div>' +
        yn('encephalopathy', 'Signs of neonatal encephalopathy', 'Yes', 'No') +
        yn('temp-abnormal', 'Temperature abnormality (lower than 36°C or higher than 38°C) unexplained by environmental factors', 'Yes', 'No') +
        yn('bleeding-coag', 'Unexplained excessive bleeding, thrombocytopenia, or abnormal coagulation', 'Yes', 'No') +
        yn('altered-glucose', 'Altered glucose homeostasis (hypoglycaemia or hyperglycaemia)', 'Yes', 'No') +
        yn('metabolic-acidosis', 'Metabolic acidosis (base deficit of 10 mmol/L or greater)', 'Yes', 'No')
      ) +
      groupCard('Other events since birth',
        ask('', '<div class="field">' + fieldLabel('Other documented events') + multiButtons('sinceBirth', [
          { value: 'colour-change', label: 'Colour change', abnormal: true },
          { value: 'jitteriness', label: 'Jitteriness', abnormal: true }
        ], state.multi.sinceBirth || []) + '</div>') +
        area('historyExtra', 'Anything else', state.historyExtra, 3)
      ) +
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
            { value: 'air', label: 'Air', normal: true },
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
    var controls = visibleControls(system, choices);
    var parts = [];
    for (var i = 0; i < controls.length; i += 1) {
      var control = controls[i];
      if (control.heading) {
        parts.push('<h4 class="exam-heading">' + esc(control.heading) + '</h4>');
      }
      if (control.panel) {
        var panel = [];
        var panelId = control.panel;
        while (i < controls.length && controls[i].panel === panelId) {
          panel.push(examControlHtml(system.id, controls[i], choices));
          i += 1;
        }
        i -= 1;
        parts.push('<div class="exam-panel">' + panel.join('') + '</div>');
      } else if (control.row) {
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
    if (control.type === 'text') {
      var text = choices[control.id] || '';
      var field = '<label class="field field--stack">' + fieldLabel(control.label) +
        '<textarea data-exam="' + systemId + '" data-exam-text="' + control.id + '" rows="2" autocomplete="off">' + esc(text) + '</textarea></label>';
      if (control.sub) return '<div class="exam-sub exam-ctl--wide">' + ask(control.guide || '', field) + '</div>';
      return ask(control.guide || '', field, 'exam-ctl--wide');
    }
    var current = choices[control.id];
    var buttons = control.options.map(function (option) {
      var on = control.type === 'multi' ? Array.isArray(current) && current.indexOf(option.value) !== -1 : current === option.value;
      var className = (control.type === 'yn' ? 'yn-btn' : 'choice') + (control.tight ? ' choice--tight' : '') + (on ? ' is-selected' : '') + (on && option.abnormal ? ' is-abnormal' : '') + (on && option.normal ? ' is-normal' : '');
      var marker = control.type === 'multi' ? 'data-exam-multi' : 'data-exam-choice';
      return '<button type="button" class="' + className + '" data-exam="' + systemId + '" data-control="' + control.id + '" ' + marker + ' data-value="' + esc(option.value) + '">' + esc(option.label) + '</button>';
    }).join('');
    var inner = '<div class="field">' + fieldLabel(control.label) + '<div class="' + (control.type === 'yn' ? 'yn' : 'choices') + '">' + buttons + '</div></div>';
    if (control.sub) return '<div class="exam-sub">' + ask(control.guide || '', inner) + '</div>';
    return ask(control.guide || '', inner, control.row ? '' : 'exam-ctl--' + controlSize(control));
  }

  function controlSize(control) {
    if (control.span) return control.span;
    if (control.type === 'yn' || control.tight) return 'compact';
    var labels = (control.options || []).map(function (option) { return option.label; });
    var chars = labels.reduce(function (total, label) { return total + label.length; }, 0);
    var longest = labels.reduce(function (max, label) { return Math.max(max, label.length); }, 0);
    if (chars <= 14) return 'compact';
    if (longest >= 28 || chars > 60) return 'wide';
    return 'half';
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
        '</div></div>';
    }).join('');
    return '<section class="step">' +
      groupCard('Glucose',
        rows +
        '<button type="button" class="text-button" data-action="add-glucose">Add another glucose</button>' +
        yn('hyperglycaemia', 'Hyperglycaemia', 'Yes', 'No')
      ) +
      groupCard('Bilirubin',
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
        ], state.bilirubin.plot) + '</div></div>'
      ) +
      groupCard('Gas',
        '<div class="num-row">' +
          gasInput('ph', 'pH') + gasInput('be', 'Base deficit') + gasInput('lactate', 'Lactate') + gasInput('glucose', 'Glucose') +
        '</div>' +
        yn('thrombocytopenia', 'Thrombocytopenia', 'Yes', 'No') +
        yn('coagulation', 'Abnormal coagulation', 'Yes', 'No') +
        area('resultsNote', 'Other results', state.resultsNote, 3)
      ) +
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
    return '<section class="step">' +
      groupCard('Impression',
        '<div class="choices">' + content.DIAGNOSES.map(function (item) {
          return '<button type="button" class="choice" data-diagnosis="' + item.id + '">' + esc(item.label) + '</button>';
        }).join('') + '</div>' +
        area('impression', 'Impression', state.impression, 3)
      ) +
      groupCard('Plan',
        '<div class="choices">' + content.PLAN_PHRASES.map(function (item) {
          return '<button type="button" class="choice" data-phrase="' + item.id + '">' + esc(item.label) + '</button>';
        }).join('') + '</div>' +
        area('plan', 'Plan', state.plan, 4) +
        '<div class="field">' + fieldLabel('Antibiotics') + choiceButtons('data-bind', 'antibiotics', [
          { value: 'none', label: 'Not started' },
          { value: 'senior', label: 'Discussed with senior' },
          { value: 'started', label: 'Started' }
        ], state.antibiotics) + '</div>' +
        '<p class="hint">Names and times only. Doses stay on the drug chart.</p>' +
        '<div id="senior-decision-wrap">' + input('seniorDecision', 'Senior decision', state.seniorDecision, { wide: true }) + '</div>' +
        '<div id="antibiotic-detail-wrap">' + input('antibioticDetail', 'Drug names and times', state.antibioticDetail, { wide: true }) + '</div>' +
        '<div class="num-row">' +
          input('reviewWhen', 'Review at', state.reviewWhen, { wide: true, placeholder: '16:00 or sooner if concerned' }) +
          input('seniorOutcome', 'Senior discussion outcome', state.seniorOutcome, { wide: true }) +
        '</div>'
      ) +
      groupCard('Discussion with parents',
        input('parentsWho', 'Who was present', state.parentsWho, { wide: true }) +
        area('parentsExplained', 'What was explained', state.parentsExplained, 3) +
        input('parentsUnderstanding', 'Their understanding', state.parentsUnderstanding, { wide: true }) +
        area('parentsConcerns', 'Concerns remaining', state.parentsConcerns, 2)
      ) +
      '<div class="note-inline" id="note-inline-anchor"></div></section>';
  }

  return {
    emptyState: emptyState,
    normalize: normalize,
    ageInHours: ageInHours,
    buildBoxes: buildBoxes,
    collectFactors: collectFactors,
    mount: mount
  };
});
