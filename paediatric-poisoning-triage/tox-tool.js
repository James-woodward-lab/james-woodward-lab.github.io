/**
 * Paediatric Poisoning Triage — application logic (ES5).
 * Depends on global SUBSTANCES from substances-data.js
 */
(function() {
  'use strict';

  var STORAGE_PREFIX = 'peds_tox_';
  var selectedSub = null;
  var witnessedMode = 'witnessed';
  var symptomatic = false;
  var consciousnessMode = 'avpu';
  var avpuVal = 'A';
  var coRows = [];
  var acOpen = false;
  var acIndex = -1;
  var acFiltered = [];

  function $(id) {
    return document.getElementById(id);
  }

  function fmt2sf(x) {
    if (x === null || x === undefined || isNaN(x)) return '—';
    var ax = Math.abs(Number(x));
    if (ax === 0) return '0';
    var mag = Math.floor(Math.log10(ax));
    var round = Math.pow(10, mag - 1);
    var v = Math.round(x / round) * round;
    var s = String(v);
    if (s.indexOf('.') >= 0) {
      s = s.replace(/(\.\d*?[1-9])0+$/, '$1');
      s = s.replace(/\.0+$/, '');
    }
    return s;
  }

  function escapeHtml(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getWeightKg() {
    var w = parseFloat($('weightKg').value, 10);
    if (!w || w <= 0) return null;
    return w;
  }

  function getWitnessedMode() {
    return witnessedMode;
  }

  function setWitnessed(mode, btn) {
    witnessedMode = mode;
    var row = $('witRow');
    var btns = row.querySelectorAll('.wit-opt');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.remove('active');
    }
    btn.classList.add('active');
    updateDoseInputsVisibility();
    onAnyChange();
  }

  function updateDoseInputsVisibility() {
    var w = witnessedMode;
    $('amountInputsWitnessed').classList.toggle('hidden', w !== 'witnessed');
    $('amountInputsFound').classList.toggle('hidden', w !== 'found');
  }

  function estWeight(mode) {
    var w = null;
    if (mode === 1) {
      var mo = parseInt($('estAgeMonths').value, 10);
      if (!mo || mo < 1) return;
      w = mo + 4;
    } else if (mode === 2) {
      var y = parseFloat($('estAgeYears').value, 10);
      if (!y || y < 1 || y > 5) return;
      w = 2 * (y + 4);
    } else {
      var y2 = parseFloat($('estAgeYears').value, 10);
      if (!y2 || y2 < 6 || y2 > 12) return;
      w = 3 * y2;
    }
    $('weightKg').value = String(Math.round(w * 10) / 10);
    $('estFlag').classList.add('show');
    onAnyChange();
  }

  function toggleIngestUnknown() {
    var unk = $('ingestUnknown').checked;
    $('ingestDateTime').disabled = unk;
    onAnyChange();
  }

  function onIngestTimeChange() {
    onAnyChange();
  }

  function applyTimeAgo() {
    var n = parseFloat($('timeAgoNum').value, 10);
    var u = $('timeAgoUnit').value;
    if (!n || n < 0) return;
    var ms = u === 'h' ? n * 3600000 : n * 60000;
    var d = new Date(Date.now() - ms);
    var iso = localDateTimeValue(d);
    $('ingestDateTime').value = iso;
    $('ingestUnknown').checked = false;
    $('ingestDateTime').disabled = false;
    onAnyChange();
  }

  function localDateTimeValue(d) {
    var pad = function(n) {
      return n < 10 ? '0' + n : String(n);
    };
    return (
      d.getFullYear() +
      '-' +
      pad(d.getMonth() + 1) +
      '-' +
      pad(d.getDate()) +
      'T' +
      pad(d.getHours()) +
      ':' +
      pad(d.getMinutes())
    );
  }

  function initDateTimeDefault() {
    if (!$('ingestDateTime').value) {
      $('ingestDateTime').value = localDateTimeValue(new Date());
    }
  }

  function getIngestionMs() {
    if ($('ingestUnknown').checked) return null;
    var v = $('ingestDateTime').value;
    if (!v) return null;
    var t = new Date(v).getTime();
    return isNaN(t) ? null : t;
  }

  function getElapsedHoursFromIngest() {
    var ms = getIngestionMs();
    if (ms === null) return null;
    return (Date.now() - ms) / 3600000;
  }

  function updateElapsedDisplay() {
    var el = $('elapsedLive');
    var ms = getIngestionMs();
    if (ms === null) {
      el.textContent = 'Elapsed: unknown (worst-case assumptions)';
      return;
    }
    var diffMin = Math.floor((Date.now() - ms) / 60000);
    if (diffMin < 0) diffMin = 0;
    var h = Math.floor(diffMin / 60);
    var m = diffMin % 60;
    el.textContent = 'Elapsed since ingestion: ' + h + ' h ' + m + ' min';
  }

  function mgFromFormulation(form, tabletCount, liquidMl) {
    if (!form) return 0;
    if (form.unit === 'tablet') {
      return (tabletCount || 0) * form.strength_mg;
    }
    if (form.unit === 'per_5ml') {
      return ((liquidMl || 0) / 5) * form.strength_mg;
    }
    if (form.unit === 'per_ml') {
      return (liquidMl || 0) * form.strength_mg;
    }
    return 0;
  }

  function getSelectedFormulation() {
    if (!selectedSub) return null;
    var sel = $('formulationSel');
    var idx = parseInt(sel.value, 10);
    if (isNaN(idx)) return null;
    return selectedSub.formulations[idx];
  }

  function computePrimaryDoseMg() {
    if (!selectedSub) return { single: null, min: null, max: null, perKg: null, unknownDose: true };
    var form = getSelectedFormulation();
    var w = getWeightKg();
    if (
      selectedSub.special === 'battery' ||
      selectedSub.special === 'plant' ||
      selectedSub.id === 'magnets'
    ) {
      return { single: null, min: null, max: null, perKg: null, unknownDose: false };
    }
    var wm = getWitnessedMode();
    if (wm === 'witnessed') {
      var tabs = parseFloat($('tabletCount').value, 10) || 0;
      var liq = parseFloat($('liquidMl').value, 10) || 0;
      var isLiq = form && (form.unit === 'per_5ml' || form.unit === 'per_ml');
      var mg = 0;
      if (isLiq) mg = mgFromFormulation(form, 0, liq);
      else mg = mgFromFormulation(form, tabs, 0);
      var perKg = w && w > 0 ? mg / w : null;
      return { single: mg, min: mg, max: mg, perKg: perKg, unknownDose: false };
    }
    if (wm === 'found') {
      var csize = parseFloat($('contSize').value, 10);
      var crem = parseFloat($('contRemain').value, 10);
      if (!csize || crem === undefined || crem === null || isNaN(crem)) {
        return { single: null, min: null, max: null, perKg: null, unknownDose: true };
      }
      var taken = Math.max(0, csize - crem);
      var isLiq2 = form && (form.unit === 'per_5ml' || form.unit === 'per_ml');
      var mgMin = 0;
      var mgMax = 0;
      if (isLiq2) {
        mgMin = mgFromFormulation(form, 0, taken);
        mgMax = mgMin;
      } else {
        mgMin = mgFromFormulation(form, taken, 0);
        mgMax = mgMin;
      }
      var perKg2 = w && w > 0 ? mgMax / w : null;
      return { single: mgMax, min: mgMin, max: mgMax, perKg: perKg2, unknownDose: false };
    }
    return { single: null, min: null, max: null, perKg: null, unknownDose: true };
  }

  function doseForRisk() {
    var d = computePrimaryDoseMg();
    if (d.unknownDose || d.max === null) return { perKg: null, useWorst: getWitnessedMode() === 'unknown' };
    var use = d.max;
    if (getWitnessedMode() === 'unknown') return { perKg: d.perKg ? d.perKg * 2 : null, useWorst: true };
    return { perKg: d.perKg, useWorst: false };
  }

  function calcRisk(sub, dosePerKg, opts) {
    opts = opts || {};
    var level = 'low';
    var pillClass = 'low';
    var message = 'LOW RISK — dose below toxic threshold, context favourable.';
    var actions = [];

    if (!sub) {
      return { level: 'low', pillClass: 'low', message: 'Select a substance.', actions: [] };
    }

    if (sub.npis_immediate || sub.id === 'methadone' || sub.id === 'yew' || sub.tca) {
      level = 'npis';
      pillClass = 'npis';
      message = 'DISCUSS NPIS IMMEDIATELY — high-risk agent or guideline trigger.';
      actions.push('0344 892 0111');
      return { level: level, pillClass: pillClass, message: message, actions: actions };
    }

    if (sub.id === 'unknown_rec' && opts.symptomatic) {
      level = 'npis';
      pillClass = 'npis';
      message = 'DISCUSS NPIS IMMEDIATELY — unknown recreational agent with symptoms.';
      return { level: level, pillClass: pillClass, message: message, actions: actions };
    }

    if (sub.special === 'battery') {
      var loc = opts.batteryLocation || 'unknown';
      if (loc === 'oesophagus' || loc === 'unknown') {
        level = 'npis';
        pillClass = 'npis';
        message = 'DISCUSS NPIS IMMEDIATELY — oesophageal or unknown location button battery.';
        return { level: level, pillClass: pillClass, message: message, actions: ['Endoscopy'] };
      }
    }

    var tox = sub.toxic_dose_mg_per_kg;
    var symp = opts.symptomatic;
    var worst = opts.useWorst;
    var haemo = opts.haemodynamicCompromise;

    if (haemo) {
      level = 'npis';
      pillClass = 'npis';
      message = 'DISCUSS NPIS IMMEDIATELY — haemodynamic or major consciousness compromise.';
      return { level: level, pillClass: pillClass, message: message, actions: [] };
    }

    if (dosePerKg === null || tox === null) {
      if (sub.high_risk_substance || symp) {
        level = 'high';
        pillClass = 'high';
        message = 'HIGH RISK — threshold unavailable or high-risk substance; verify with NPIS/TOXBASE.';
      } else {
        level = 'mod';
        pillClass = 'mod';
        message = 'MODERATE RISK — confirm dose/threshold with TOXBASE/NPIS.';
      }
      return { level: level, pillClass: pillClass, message: message, actions: [] };
    }

    var ratio = dosePerKg / tox;
    if (ratio >= 1 || (symp && ratio > 0.5)) {
      level = 'high';
      pillClass = 'high';
      message = 'HIGH RISK — dose above threshold or symptomatic with significant exposure.';
    } else if (ratio >= 0.7 || worst || symp) {
      level = 'mod';
      pillClass = 'mod';
      message = 'MODERATE RISK — approaching threshold, uncertain quantity, or symptoms.';
    } else {
      level = 'low';
      pillClass = 'low';
      message = 'LOW RISK — dose below toxic threshold on this model.';
    }

    return { level: level, pillClass: pillClass, message: message, actions: actions };
  }

  function isHaemodynamicCompromise() {
    var bp = parseFloat($('obsBP').value, 10);
    if (bp && bp < 70) return true;
    if (consciousnessMode === 'avpu' && (avpuVal === 'P' || avpuVal === 'U')) return true;
    if (consciousnessMode === 'gcs') {
      var t = parseInt($('gcsTotal').textContent, 10) || 15;
      if (t <= 8) return true;
    }
    return false;
  }

  function calcDecontamination(sub, opts) {
    opts = opts || {};
    var results = [];
    var eligible = sub.decontamination_eligible && sub.charcoal_adsorbs !== false;
    var win = sub.decontamination_window_hrs || 1;
    if ($('mrToggle') && $('mrToggle').checked) win = Math.max(win, 2);

    var hrs = getElapsedHoursFromIngest();
    var unk = $('ingestUnknown').checked;
    var inWin = unk ? false : hrs !== null && hrs <= win;

    results.push({
      ok: inWin && !unk,
      text: unk
        ? 'Within decontamination window: unknown (assume window closed)'
        : inWin
          ? 'Within decontamination window (&lt; ' + win + ' h)'
          : 'Outside decontamination window (&gt; ' + win + ' h)'
    });

    var caustic = sub.caustic || sub.special === 'caustic';
    var hydrocarbon = sub.hydrocarbon || sub.special === 'hydrocarbon';
    results.push({
      ok: !caustic && !hydrocarbon,
      text: caustic || hydrocarbon ? 'Caustic/hydrocarbon — charcoal contraindicated' : 'Not caustic/hydrocarbon for this entry'
    });

    var gcsOk = true;
    if (consciousnessMode === 'gcs') {
      var gt = parseInt($('gcsTotal').textContent, 10) || 15;
      gcsOk = gt > 8;
    } else {
      gcsOk = avpuVal === 'A' || avpuVal === 'V';
    }
    results.push({
      ok: gcsOk,
      text: gcsOk ? 'Airway/GCS acceptable for charcoal consideration' : 'Reduced consciousness — aspiration risk; discuss NPIS'
    });

    var ads = sub.charcoal_adsorbs !== false && !sub.caustic && sub.id !== 'lithium' && sub.id !== 'iron' && sub.special !== 'iron';
    if (sub.id === 'iron' || sub.special === 'iron') ads = false;
    results.push({
      ok: ads,
      text: ads ? 'Substance may adsorb to charcoal' : 'Poor/no charcoal adsorption for this substance'
    });

    var allOk = inWin && !unk && eligible && !caustic && !hydrocarbon && gcsOk && ads;
    var summary = '';
    if (allOk) {
      summary =
        'Activated charcoal 1 g/kg (max 50 g) may be appropriate — confirm with NPIS/TOXBASE.';
    } else if (inWin && !ads) {
      summary = 'Within time window but charcoal not appropriate for this substance.';
    } else if (inWin && (caustic || hydrocarbon)) {
      summary = 'Within time window but charcoal contraindicated (caustic/hydrocarbon).';
    } else if (!inWin) {
      summary = 'Activated charcoal unlikely to be indicated based on time window.';
    } else {
      summary = 'Discuss with NPIS/TOXBASE regarding gastrointestinal decontamination.';
    }

    return { lines: results, summary: summary, allMet: allOk };
  }

  var antidoteHandlers = {
    nac: function(weightKg) {
      var w = weightKg;
      var lines = [];
      var vNote = w < 20 ? 'Consider smaller infusion volumes in young children per local PICU/NPIS guidance.' : '';
      var b1 = Math.round(150 * w);
      var b2 = Math.round(50 * w);
      var b3 = Math.round(100 * w);
      lines.push('Bag 1: ' + fmt2sf(b1) + ' mg NAC in 200 ml glucose 5% over 60 minutes');
      lines.push('Bag 2: ' + fmt2sf(b2) + ' mg NAC in 500 ml glucose 5% over 4 hours');
      lines.push('Bag 3: ' + fmt2sf(b3) + ' mg NAC in 1000 ml glucose 5% over 16 hours');
      if (vNote) lines.push(vNote);
      lines.push('Anaphylactoid reactions: pause infusion; treat per resus/NPIS.');
      return lines;
    },
    naloxone: function(weightKg) {
      var d = Math.min(0.01 * weightKg, 0.4);
      return [
        'Naloxone: ' + fmt2sf(d) + ' mg/kg IV/IM/IN (max 0.4 mg initial adult-style ceiling for quick calculator — titrate)',
        'Repeat every 2–3 minutes to effect',
        'Duration of naloxone may be shorter than opioid effect — infusion may be needed (NPIS).'
      ];
    },
    salicylate_note: function() {
      return ['Salicylate poisoning: supportive care; urinary alkalinisation and dialysis per NPIS.', 'See salicylate panel below.'];
    },
    ccb_note: function() {
      return ['CCB poisoning: calcium, high-dose insulin/euglycaemia, lipid emulsion per NPIS.', 'Discuss early with NPIS/PICU.'];
    },
    bb_note: function() {
      return ['Beta-blocker overdose: glucagon, adrenaline, pacing — per NPIS.', 'Glucose monitoring essential.'];
    },
    tca_note: function() {
      return ['TCA: sodium bicarbonate for QRS widening; supportive care.', 'Discuss all significant ingestions with NPIS.'];
    },
    clonidine_note: function() {
      return ['Clonidine: supportive; bradycardia and hypotension may need specific therapy — NPIS.'];
    },
    lithium_note: function() {
      return ['Lithium: poor charcoal binding; whole bowel irrigation may be considered — NPIS.', 'Levels and renal function critical.'];
    },
    valproate_note: function() {
      return ['Severe valproate: consider L-carnitine — NPIS.', 'Monitor ammonia and liver function.'];
    },
    warfarin_note: function() {
      return ['Warfarin: vitamin K and PCC per bleeding risk — NPIS.', 'Delayed INR rise possible.'];
    },
    doac_note: function() {
      return ['DOAC reversal agent-specific — NPIS.', 'Renal function guides risk.'];
    },
    iron_note: function() {
      return ['Iron: desferrioxamine in severe toxicity — NPIS.', 'Serum iron and clinical picture guide management.'];
    },
    ethanol_note: function() {
      return ['Ethanol: supportive; glucose monitoring critical in children.', 'Charcoal not routinely used for ethanol.'];
    },
    digoxin_note: function() {
      return ['Digoxin-specific antibody fragments — NPIS if cardiac glycoside toxicity.'];
    },
    anticholinergic_note: function() {
      return ['Anticholinergic toxidrome: supportive; physostigmine rarely — NPIS only.'];
    },
    cocaine_note: function() {
      return ['Cocaine: benzodiazepines first-line for agitation and seizures.', 'Cooling, BP and ECG monitoring.'];
    }
  };

  function calcAntidote(sub, weightKg) {
    if (!sub || !sub.antidote_fn) return [];
    var fn = antidoteHandlers[sub.antidote_fn];
    if (!fn) return [sub.antidote || 'Discuss with NPIS'];
    return fn(weightKg);
  }

  function nomogramThresholdMgL(tHours) {
    if (tHours < 4) return null;
    if (tHours <= 15) {
      return 100 + ((tHours - 4) * (15 - 100)) / (15 - 4);
    }
    if (tHours <= 24) {
      return 15 + ((tHours - 15) * (0 - 15)) / (24 - 15);
    }
    return 0;
  }

  function plotNomogram(levelMgL, timeHrs) {
    var host = $('nomogramSvg');
    if (!host) return;
    while (host.firstChild) host.removeChild(host.firstChild);
    var W = 400;
    var H = 280;
    var pad = 40;
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', 'auto');

    function xScale(t) {
      return pad + (t / 24) * (W - 2 * pad);
    }
    function yScale(y) {
      return H - pad - (y / 300) * (H - 2 * pad);
    }

    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    var d = '';
    for (var ti = 4; ti <= 24; ti += 0.5) {
      var yl = nomogramThresholdMgL(ti);
      if (yl === null || yl < 0) continue;
      var x = xScale(ti);
      var y = yScale(Math.min(300, Math.max(0, yl)));
      if (!d) d += 'M ' + x + ' ' + y;
      else d += ' L ' + x + ' ' + y;
    }
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#20b2aa');
    path.setAttribute('stroke-width', '2');
    svg.appendChild(path);

    if (levelMgL !== null && timeHrs !== null && timeHrs >= 4) {
      var thresh = nomogramThresholdMgL(timeHrs);
      var px = xScale(timeHrs);
      var py = yScale(levelMgL);
      var above = thresh !== null && levelMgL > thresh;
      var circ = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circ.setAttribute('cx', px);
      circ.setAttribute('cy', py);
      circ.setAttribute('r', '5');
      circ.setAttribute('fill', above ? '#ef4444' : '#22c55e');
      svg.appendChild(circ);

      var lineH = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      lineH.setAttribute('x1', pad);
      lineH.setAttribute('x2', W - pad);
      lineH.setAttribute('y1', py);
      lineH.setAttribute('y2', py);
      lineH.setAttribute('stroke', '#8892a4');
      lineH.setAttribute('stroke-dasharray', '4 4');
      svg.appendChild(lineH);

      var lineV = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      lineV.setAttribute('x1', px);
      lineV.setAttribute('x2', px);
      lineV.setAttribute('y1', pad);
      lineV.setAttribute('y2', H - pad);
      lineV.setAttribute('stroke', '#8892a4');
      lineV.setAttribute('stroke-dasharray', '4 4');
      svg.appendChild(lineV);
    }

    var ax = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    ax.setAttribute('x', W / 2);
    ax.setAttribute('y', H - 8);
    ax.setAttribute('text-anchor', 'middle');
    ax.setAttribute('fill', '#8892a4');
    ax.setAttribute('font-size', '11');
    ax.textContent = 'Hours post-ingestion';
    svg.appendChild(ax);

    var ay = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    ay.setAttribute('x', 12);
    ay.setAttribute('y', H / 2);
    ay.setAttribute('fill', '#8892a4');
    ay.setAttribute('font-size', '11');
    ay.setAttribute('transform', 'rotate(-90 12 ' + H / 2 + ')');
    ay.textContent = 'mg/L';
    svg.appendChild(ay);

    host.appendChild(svg);
  }

  function buildSearchIndex() {
    var map = {};
    for (var i = 0; i < SUBSTANCES.length; i++) {
      var s = SUBSTANCES[i];
      var keys = [s.name.toLowerCase()].concat(s.aliases.map(function(a) {
        return a.toLowerCase();
      }));
      for (var j = 0; j < keys.length; j++) {
        map[keys[j]] = s;
      }
    }
    return map;
  }

  var searchMap = {};

  function filterSubstances(q) {
    q = (q || '').toLowerCase().trim();
    if (!q) return [];
    var out = [];
    var seen = {};
    for (var i = 0; i < SUBSTANCES.length; i++) {
      var s = SUBSTANCES[i];
      var hay = (s.name + ' ' + s.aliases.join(' ')).toLowerCase();
      if (hay.indexOf(q) >= 0) {
        if (!seen[s.id]) {
          seen[s.id] = 1;
          out.push(s);
        }
      }
    }
    return out;
  }

  function onSearchInput() {
    var q = $('substanceSearch').value;
    acFiltered = filterSubstances(q);
    renderAcDropdown();
  }

  function onSearchFocus() {
    onSearchInput();
  }

  function onSearchKey(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      acIndex = Math.min(acIndex + 1, acFiltered.length - 1);
      renderAcDropdown();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      acIndex = Math.max(acIndex - 1, 0);
      renderAcDropdown();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (acFiltered[acIndex]) selectSubstance(acFiltered[acIndex]);
    } else if (e.key === 'Escape') {
      $('acDropdown').classList.remove('open');
    }
  }

  function renderAcDropdown() {
    var dd = $('acDropdown');
    dd.innerHTML = '';
    if (!acFiltered.length) {
      dd.classList.remove('open');
      return;
    }
    var cat = '';
    for (var i = 0; i < acFiltered.length; i++) {
      var s = acFiltered[i];
      if (s.category !== cat) {
        cat = s.category;
        var cdiv = document.createElement('div');
        cdiv.className = 'ac-cat';
        cdiv.textContent = cat;
        dd.appendChild(cdiv);
      }
      var div = document.createElement('div');
      div.className = 'ac-item' + (i === acIndex ? ' hl' : '');
      div.textContent = s.name;
      div.onclick = (function(sub) {
        return function() {
          selectSubstance(sub);
        };
      })(s);
      dd.appendChild(div);
    }
    dd.classList.add('open');
    acIndex = 0;
  }

  function selectSubstance(sub) {
    selectedSub = sub;
    $('substanceSearch').value = sub.name;
    $('acDropdown').classList.remove('open');
    $('selectedSubstanceDisplay').style.display = 'block';
    $('selectedSubstanceDisplay').innerHTML =
      '<strong>Selected:</strong> ' + escapeHtml(sub.name) + ' — ' + escapeHtml(sub.risk_notes || '');
    var hideDose = sub.special === 'battery' || sub.special === 'plant' || sub.id === 'magnets';
    $('cardSec2').classList.toggle('hidden', hideDose);
    if (!hideDose) {
      populateFormulations();
      updateDoseInputsVisibility();
    }
    $('mrField').classList.toggle('hidden', !sub.modified_release_available || hideDose);
    buildConditionalPanels();
    onAnyChange();
  }

  function populateFormulations() {
    var sel = $('formulationSel');
    sel.innerHTML = '';
    if (!selectedSub) return;
    for (var i = 0; i < selectedSub.formulations.length; i++) {
      var f = selectedSub.formulations[i];
      var opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = f.name;
      sel.appendChild(opt);
    }
    sel.onchange = function() {
      updateFormulationTypeUI();
      onAnyChange();
    };
    updateFormulationTypeUI();
  }

  function updateFormulationTypeUI() {
    var form = getSelectedFormulation();
    var isLiq = form && (form.unit === 'per_5ml' || form.unit === 'per_ml');
    $('tabletFields').classList.toggle('hidden', isLiq);
    $('liquidFields').classList.toggle('hidden', !isLiq);
  }

  function buildConditionalPanels() {
    $('paracetamolBlock').classList.add('hidden');
    $('salicylateBlock').classList.add('hidden');
    $('batteryBlock').classList.add('hidden');
    $('plantBlock').classList.add('hidden');
    if (!selectedSub) return;
    if (selectedSub.id === 'paracetamol') {
      $('paracetamolBlock').classList.remove('hidden');
      $('paracetamolBlock').innerHTML = getParacetamolPanelHtml();
      wireParacetamol();
    } else if (selectedSub.special === 'salicylate' || selectedSub.id === 'aspirin') {
      $('salicylateBlock').classList.remove('hidden');
      $('salicylateBlock').innerHTML = getSalicylatePanelHtml();
    } else if (selectedSub.special === 'battery') {
      $('batteryBlock').classList.remove('hidden');
      $('batteryBlock').innerHTML = getBatteryPanelHtml();
      wireBattery();
    } else if (selectedSub.special === 'plant') {
      $('plantBlock').classList.remove('hidden');
      $('plantBlock').innerHTML = getPlantPanelHtml();
      wirePlants();
    }
  }

  function getParacetamolPanelHtml() {
    return (
      '<div class="card" style="margin-top:12px;border-style:dashed;">' +
      '<div class="card-title">Paracetamol nomogram (UK-style single line — verify with local guideline)</div>' +
      '<div class="field"><label>Serum paracetamol</label>' +
      '<div class="row2"><input type="number" id="pamLevel" min="0" step="1" placeholder="Level" oninput="onAnyChange()">' +
      '<select id="pamUnit" onchange="onAnyChange()"><option value="mgl">mg/L</option><option value="umol">µmol/L</option></select></div></div>' +
      '<div class="field"><label>Hours post-ingestion (sample)</label><input type="number" id="pamHours" min="0" max="48" step="0.1" oninput="onAnyChange()"></div>' +
      '<label class="chk-item"><input type="checkbox" id="pamStagger" onchange="onAnyChange()"> Staggered / ongoing ingestion (standard nomogram unreliable)</label>' +
      '<div class="field"><label>High-risk factors (may underestimate line)</label>' +
      '<label class="chk-item"><input type="checkbox" class="hrf" id="hrfInducer" onchange="onAnyChange()"> Enzyme inducer / relevant co-meds</label>' +
      '<label class="chk-item"><input type="checkbox" class="hrf" id="hrfMal" onchange="onAnyChange()"> Malnutrition / eating disorder</label></div>' +
      '<div id="pamOut" class="hint" style="margin-top:8px;"></div>' +
      '<div class="nomogram-box" id="nomogramHost"><div id="nomogramSvg"></div></div>' +
      '</div>'
    );
  }

  function wireParacetamol() {
    var h = getElapsedHoursFromIngest();
    if ($('pamHours') && h !== null && !isNaN(h)) $('pamHours').value = h.toFixed(2);
  }

  function getSalicylatePanelHtml() {
    return (
      '<div class="card" style="margin-top:12px;border-style:dashed;">' +
      '<div class="card-title">Salicylate assessment (simplified — NPIS)</div>' +
      '<div class="row2"><div class="field"><label>Serum salicylate (mg/L)</label><input type="number" id="salLevel" oninput="onAnyChange()"></div>' +
      '<div class="field"><label>Hours post-ingestion</label><input type="number" id="salHours" oninput="onAnyChange()"></div></div>' +
      '<div class="field"><label>Urine pH (if measured)</label><input type="number" id="salUph" step="0.01" min="4" max="8" oninput="onAnyChange()"></div>' +
      '<div id="salOut" class="hint"></div></div>'
    );
  }

  function getBatteryPanelHtml() {
    return (
      '<div class="card" style="margin-top:12px;border-style:dashed;">' +
      '<div class="card-title">Button battery pathway</div>' +
      '<div class="field"><label>Location</label>' +
      '<select id="batLoc" onchange="onAnyChange()"><option value="unknown">Unknown</option><option value="oesophagus">Oesophagus</option><option value="stomach">Stomach</option><option value="beyond">Beyond stomach</option></select></div>' +
      '<div class="row2"><div class="field"><label>Diameter (mm)</label><input type="number" id="batDiam" value="20" oninput="onAnyChange()"></div>' +
      '<div class="field"><label>Voltage</label><select id="batV" oninput="onAnyChange()"><option>3V lithium</option><option>1.5V</option></select></div></div>' +
      '<label class="chk-item"><input type="checkbox" id="batMulti" onchange="onAnyChange()"> Multiple batteries</label>' +
      '<div class="field"><label>Child age (years)</label><input type="number" id="batChildAge" min="0" max="18" step="0.1" oninput="onAnyChange()"></div>' +
      '<div id="batOut" class="hint"></div></div>'
    );
  }

  function wireBattery() {
    var a = $('childAgeYears').value;
    if (a && $('batChildAge')) $('batChildAge').value = a;
  }

  function plantSvgPlaceholder(label, col) {
    return (
      '<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<rect width="80" height="80" rx="8" fill="#242736"/>' +
      '<circle cx="40" cy="40" r="18" fill="' +
      col +
      '"/>' +
      '<text x="40" y="74" text-anchor="middle" fill="#8892a4" font-size="8">' +
      escapeHtml(label) +
      '</text></svg>'
    );
  }

  var PLANT_GRID = [
    { key: 'foxglove', name: 'Foxglove', col: '#ec4899' },
    { key: 'yew', name: 'Yew', col: '#22c55e' },
    { key: 'belladonna', name: 'Nightshade', col: '#a855f7' },
    { key: 'lords_ladies', name: 'Lords & ladies', col: '#f97316' },
    { key: 'monkshood', name: 'Monkshood', col: '#3b82f6' },
    { key: 'laburnum', name: 'Laburnum', col: '#eab308' },
    { key: 'lily_valley', name: 'Lily of valley', col: '#fff' },
    { key: 'elder', name: 'Elder', col: '#6366f1' },
    { key: 'holly', name: 'Holly', col: '#ef4444' },
    { key: 'mistletoe', name: 'Mistletoe', col: '#84cc16' },
    { key: 'hemlock', name: 'Hemlock', col: '#94a3b8' },
    { key: 'black_bryony', name: 'Black bryony', col: '#0f172a' }
  ];

  function getPlantPanelHtml() {
    var html =
      '<div class="card" style="margin-top:12px;border-style:dashed;">' +
      '<div class="card-title">Plant &amp; berry identification aid (illustrative)</div>' +
      '<p class="hint">Does it match any of these? If none match or uncertain — contact NPIS.</p>' +
      '<div class="field"><label>Unknown berries — colour</label><select id="berryColour" onchange="onAnyChange()">' +
      '<option value="">—</option><option value="red">Red</option><option value="black">Black</option><option value="white">White</option></select></div>' +
      '<div class="plant-grid" id="plantGrid"></div>' +
      '<div id="plantSelOut" class="hint" style="margin-top:10px;"></div>' +
      '</div>';
    return html;
  }

  function wirePlants() {
    var grid = $('plantGrid');
    if (!grid) return;
    grid.innerHTML = '';
    for (var i = 0; i < PLANT_GRID.length; i++) {
      var p = PLANT_GRID[i];
      var div = document.createElement('div');
      div.className = 'plant-card';
      div.dataset.key = p.key;
      div.innerHTML = plantSvgPlaceholder(p.name, p.col) + '<div class="pn">' + escapeHtml(p.name) + '</div>';
      div.onclick = (function(key) {
        return function() {
          var cards = grid.querySelectorAll('.plant-card');
          for (var j = 0; j < cards.length; j++) cards[j].classList.remove('selected');
          div.classList.add('selected');
          $('plantSelOut').innerHTML =
            'Selected match: <strong>' +
            escapeHtml(key) +
            '</strong> — still verify with TOXBASE/NPIS; images are illustrative only.';
          onAnyChange();
        };
      })(p.name);
      grid.appendChild(div);
    }
  }

  function setSymptomatic(v, btn) {
    symptomatic = v;
    $('btnAsym').classList.toggle('active', !v);
    $('btnSym').classList.toggle('active', v);
    $('symptomPanel').classList.toggle('show', v);
    onAnyChange();
  }

  function setConsciousnessMode(mode, btn) {
    consciousnessMode = mode;
    $('btnAvpu').classList.toggle('active', mode === 'avpu');
    $('btnGcsMode').classList.toggle('active', mode === 'gcs');
    $('avpuPanel').classList.toggle('hidden', mode !== 'avpu');
    $('gcsPanel').classList.toggle('hidden', mode !== 'gcs');
    onAnyChange();
  }

  function setAvpu(v, btn) {
    avpuVal = v;
    var row = btn.parentNode.querySelectorAll('.avpu-opt');
    for (var i = 0; i < row.length; i++) row[i].classList.remove('active');
    btn.classList.add('active');
    onAnyChange();
  }

  function onGcsChange() {
    var e = parseInt($('gcsE').value, 10);
    var v = parseInt($('gcsV').value, 10);
    var m = parseInt($('gcsM').value, 10);
    $('gcsTotal').textContent = String(e + v + m);
    onAnyChange();
  }

  function updateObsHints() {
    var age = parseFloat($('childAgeYears').value, 10);
    var hrEl = $('hintHR');
    var rrEl = $('hintRR');
    if (!hrEl) return;
    if (!age && age !== 0) {
      hrEl.textContent = '';
      rrEl.textContent = '';
      return;
    }
    var hrMin = 80;
    var hrMax = 160;
    var rrMin = 20;
    var rrMax = 30;
    if (age < 1) {
      hrMin = 110;
      hrMax = 160;
      rrMin = 30;
      rrMax = 40;
    } else if (age < 5) {
      hrMin = 90;
      hrMax = 140;
      rrMin = 25;
      rrMax = 35;
    } else if (age < 12) {
      hrMin = 80;
      hrMax = 120;
      rrMin = 20;
      rrMax = 30;
    }
    hrEl.textContent = 'Typical ~' + hrMin + '–' + hrMax + ' (approximate)';
    rrEl.textContent = 'Typical ~' + rrMin + '–' + rrMax;
    var hr = parseFloat($('obsHR').value, 10);
    var rr = parseFloat($('obsRR').value, 10);
    hrEl.classList.remove('warn-hint');
    rrEl.classList.remove('warn-hint');
    if (hr && (hr < hrMin || hr > hrMax)) hrEl.classList.add('warn-hint');
    if (rr && (rr < rrMin || rr > rrMax)) rrEl.classList.add('warn-hint');
    var spo2 = parseFloat($('obsSpO2').value, 10);
    var hSp = $('hintSpO2');
    if (hSp) {
      hSp.classList.remove('warn-hint');
      hSp.textContent = '';
      if (spo2 && spo2 < 94) {
        hSp.textContent = 'Low — target ≥94%';
        hSp.classList.add('warn-hint');
      }
    }
    var glu = parseFloat($('obsGlu').value, 10);
    var hG = $('hintGlu');
    if (hG) {
      hG.classList.remove('warn-hint');
      hG.textContent = '';
      if (glu && glu < 3.5) {
        hG.textContent = 'Hypoglycaemia — common with several toxins';
        hG.classList.add('warn-hint');
      }
    }
    var te = parseFloat($('obsTemp').value, 10);
    var hT = $('hintTemp');
    if (hT) {
      hT.classList.remove('warn-hint');
      hT.textContent = '';
      if (te && (te > 38.5 || te < 36)) {
        hT.textContent = te > 38.5 ? 'Pyrexia' : 'Hypothermia';
        hT.classList.add('warn-hint');
      }
    }
  }

  function toggleCoIngest() {
    var on = $('coIngestToggle').checked;
    $('coIngestPanel').classList.toggle('hidden', !on);
    $('coAddBtn').classList.toggle('hidden', !on);
    if (on && coRows.length === 0) addCoRow();
    onAnyChange();
  }

  function addCoRow() {
    coRows.push({ subId: '', formIdx: 0, amt: 0 });
    renderCoRows();
  }

  function renderCoRows() {
    var p = $('coIngestPanel');
    p.innerHTML = '';
    for (var i = 0; i < coRows.length; i++) {
      (function(index) {
        var row = document.createElement('div');
        row.className = 'co-row';
        row.innerHTML =
          '<button type="button" class="co-remove" onclick="window.toxCoRemove(' +
          index +
          ')">&times;</button>' +
          '<div class="field"><label>Substance</label><select id="coSub' +
          index +
          '"></select></div>' +
          '<div class="field"><label>Amount (tablets or ml per formulation)</label><input type="number" id="coAmt' +
          index +
          '" min="0" step="0.1"></div>';
        p.appendChild(row);
        var sel = $('coSub' + index);
        for (var j = 0; j < SUBSTANCES.length; j++) {
          var o = document.createElement('option');
          o.value = SUBSTANCES[j].id;
          o.textContent = SUBSTANCES[j].name;
          sel.appendChild(o);
        }
        sel.onchange = onAnyChange;
        $('coAmt' + index).oninput = onAnyChange;
      })(i);
    }
  }

  window.toxCoRemove = function(ix) {
    coRows.splice(ix, 1);
    renderCoRows();
    onAnyChange();
  };

  function checkCoInteractions() {
    var notes = [];
    var ids = [];
    if (selectedSub) ids.push(selectedSub.id);
    for (var i = 0; i < coRows.length; i++) {
      var sid = $('coSub' + i) ? $('coSub' + i).value : '';
      if (sid) ids.push(sid);
    }
    if (ids.indexOf('paracetamol') >= 0 && (ids.indexOf('ethanol') >= 0 || ids.indexOf('unknown_rec') >= 0)) {
      notes.push('Paracetamol + alcohol or unknown sedative: enhanced hepatotoxicity risk — NPIS.');
    }
    if (ids.indexOf('amitriptyline') >= 0 && (ids.indexOf('sertraline') >= 0 || ids.indexOf('fluoxetine') >= 0)) {
      notes.push('TCA + SSRI: seizure and serotonin toxicity risk — NPIS.');
    }
    return notes;
  }

  function salicylateOutput() {
    var lev = parseFloat($('salLevel') && $('salLevel').value, 10);
    var hrs = parseFloat($('salHours') && $('salHours').value, 10);
    var uph = parseFloat($('salUph') && $('salUph').value, 10);
    var out = $('salOut');
    if (!out) return '';
    if (!lev) {
      out.textContent = 'Enter salicylate level and time.';
      return '';
    }
    var sev = 'mild';
    if (lev > 700) sev = 'potentially fatal / critical';
    else if (lev > 500) sev = 'severe';
    else if (lev > 300) sev = 'moderate';
    var html =
      'Classification (simplified): <strong>' +
      sev +
      '</strong>. ' +
      'Urinary alkalinisation: often considered if acidotic / moderate–severe and pH goals per NPIS. ' +
      'Haemodialysis indicators include salicylate &gt;700 mg/L (context-dependent), renal failure, pulmonary oedema, severe CNS — discuss NPIS.';
    if (uph && uph < 7.45 && (sev === 'moderate' || sev === 'severe' || sev.indexOf('fatal') >= 0)) {
      html += ' Consider sodium bicarbonate 1–2 mmol/kg IV for alkalinisation — NPIS.';
    }
    out.innerHTML = html;
    return html;
  }

  function batteryOutput() {
    var out = $('batOut');
    if (!out) return '';
    var loc = $('batLoc') ? $('batLoc').value : 'unknown';
    var age = parseFloat($('batChildAge') && $('batChildAge').value, 10);
    var html = '';
    if (loc === 'oesophagus' || loc === 'unknown') {
      html =
        '<strong>IMMEDIATE endoscopic removal</strong> — do not wait for symptoms. Contact NPIS. ' +
        'Honey: for oesophageal batteries in children <strong>&gt;1 year</strong> not at aspiration risk, 2 teaspoons every 10 minutes (up to 6 doses pre-endoscopy) may reduce injury — <strong>not &lt;1 year</strong> (botulism risk). Evidence context per local NPIS.';
    } else if (loc === 'stomach') {
      html =
        'Gastric location: lower risk if asymptomatic and older infant/child. ' +
        'Serial imaging and NPIS guidance; single battery &lt;20 mm may be observed in selected cases — confirm.';
    } else {
      html = 'Beyond stomach: if passes uneventfully, lower risk — still NPIS if symptoms.';
    }
    if (age && age < 1 && html.indexOf('Honey') >= 0) {
      html += ' <strong>Do not give honey under 1 year.</strong>';
    }
    out.innerHTML = html;
    return html;
  }

  function paracetamolNomogramText() {
    var out = '';
    var pam = $('pamLevel');
    if (!pam) return out;
    var v = parseFloat(pam.value, 10);
    var unit = $('pamUnit').value;
    if (unit === 'umol') v = v / 6.23;
    var th = parseFloat($('pamHours').value, 10);
    var stag = $('pamStagger') && $('pamStagger').checked;
    if (stag) {
      return 'Staggered / ongoing ingestion — standard nomogram unreliable. Discuss with NPIS.';
    }
    if (!v || th === undefined || th === null || isNaN(th)) {
      return 'Enter level and hours post-ingestion.';
    }
    if (th < 4) {
      return 'Sample taken too early — repeat at ≥4 hours post-ingestion (unless protocol states otherwise).';
    }
    var line = nomogramThresholdMgL(th);
    var above = v > line;
    if (above) {
      out = 'N-acetylcysteine indicated by this plot — see antidote panel. Confirm with NPIS/TOXBASE.';
    } else {
      out =
        'NAC not indicated based on this single level vs treatment line. If clinical concern, repeat level or discuss NPIS.';
    }
    if ($('hrfInducer') && $('hrfInducer').checked) {
      out += ' High-risk factors: standard line may underestimate risk — discuss NPIS.';
    }
    plotNomogram(v, th);
    return out;
  }

  function renderRiskPill(risk) {
    var el = $('riskPill');
    el.className = 'risk-pill ' + risk.pillClass;
    var emoji = '🟢';
    if (risk.pillClass === 'mod') emoji = '🟡';
    if (risk.pillClass === 'high') emoji = '🔴';
    if (risk.pillClass === 'npis') emoji = '⚫';
    el.textContent = emoji + ' ' + risk.message;
  }

  function renderFullOutput() {
    var html = '';
    var w = getWeightKg();
    var d = doseForRisk();
    var dpk = d.perKg;
    var opts = {
      symptomatic: symptomatic,
      useWorst: d.useWorst,
      haemodynamicCompromise: isHaemodynamicCompromise(),
      batteryLocation: $('batLoc') ? $('batLoc').value : 'unknown'
    };
    var risk = selectedSub ? calcRisk(selectedSub, dpk, opts) : calcRisk(null, null, {});
    var doseInfo = computePrimaryDoseMg();
    renderRiskPill(risk);

    var npisBanner = $('npisBanner');
    npisBanner.classList.remove('show');
    npisBanner.textContent = '';

    if (risk.level === 'npis') {
      npisBanner.textContent = '⚠ NPIS escalation — contact NPIS now: 0344 892 0111';
      npisBanner.classList.add('show');
    } else if (
      selectedSub &&
      symptomatic &&
      selectedSub.high_risk_substance &&
      doseInfo &&
      doseInfo.perKg !== null &&
      selectedSub.serious_dose_mg_per_kg &&
      doseInfo.perKg >= selectedSub.serious_dose_mg_per_kg
    ) {
      npisBanner.textContent =
        '⚠ NPIS escalation criteria may apply — contact NPIS now: 0344 892 0111';
      npisBanner.classList.add('show');
    }

    var tox = selectedSub ? selectedSub.toxic_dose_mg_per_kg : null;
    var threshMg = tox && w ? tox * w : null;

    html += '<div class="card-title" style="margin-top:0;">Toxic dose summary</div>';
    html +=
      '<p>Ingested dose: ' +
      (doseInfo.single !== null ? fmt2sf(doseInfo.single) + ' mg' : '—') +
      ' → ' +
      (doseInfo.perKg !== null ? fmt2sf(doseInfo.perKg) + ' mg/kg' : '—') +
      '</p>';
    html +=
      '<p>Toxic threshold: ' +
      (tox !== null ? fmt2sf(tox) + ' mg/kg' : '—') +
      (threshMg ? ' (' + fmt2sf(threshMg) + ' mg for this child)' : '') +
      '</p>';
    if (tox && doseInfo.perKg) {
      html +=
        '<p>Current dose vs toxic threshold: ' +
        fmt2sf((doseInfo.perKg / tox) * 100) +
        '%</p>';
    }

    if (selectedSub) {
      var dec = calcDecontamination(selectedSub, opts);
      html += '<div class="card-title">Decontamination</div>';
      for (var i = 0; i < dec.lines.length; i++) {
        var L = dec.lines[i];
        html +=
          '<div class="check-line"><span class="' +
          (L.ok ? 'ok' : 'bad') +
          '">' +
          (L.ok ? '✓' : '✗') +
          '</span> ' +
          L.text +
          '</div>';
      }
      html += '<p class="hint">' + dec.summary + '</p>';

      var ant = calcAntidote(selectedSub, w || 20);
      if (ant.length) {
        html += '<div class="antidote-card"><h4>Antidote / management</h4>';
        for (var a = 0; a < ant.length; a++) html += '<p>' + escapeHtml(ant[a]) + '</p>';
        html += '</div>';
      }

      var obsLow = selectedSub.observation_hrs_low;
      var obsHigh = selectedSub.observation_hrs_high;
      if ($('mrToggle') && $('mrToggle').checked) {
        obsLow *= 2;
        obsHigh *= 2;
      }
      html += '<div class="card-title">Observation</div>';
      html +=
        '<p>Minimum observation period: ' +
        obsLow +
        ' h (guide). Extended if symptomatic, MR, or co-ingestion.</p>';
      html +=
        '<p>Discharge criteria (guide): asymptomatic, haemodynamically stable, eating and drinking — senior review.</p>';

      html += '<div class="card-title">Investigations to consider</div><ul style="margin-left:1.2em;">';
      var inv = getInvestigations(selectedSub);
      for (var j = 0; j < inv.length; j++) html += '<li>' + escapeHtml(inv[j]) + '</li>';
      html += '</ul>';
    }

    var inter = checkCoInteractions();
    if (inter.length) {
      html += '<div class="card-title">Co-ingestion flags</div>';
      for (var k = 0; k < inter.length; k++) html += '<p class="hint">' + escapeHtml(inter[k]) + '</p>';
    }

    if ($('pamOut') && selectedSub && selectedSub.id === 'paracetamol') {
      $('pamOut').textContent = paracetamolNomogramText();
    }
    salicylateOutput();
    batteryOutput();

    $('outputBody').innerHTML = html;

    updateDoseBar();
    buildSummary();
  }

  function getInvestigations(sub) {
    var p = sub.investigation_profile || 'general';
    var map = {
      paracetamol: [
        'Serum paracetamol at ≥4h post-ingestion (or on arrival if later)',
        'LFTs, INR, creatinine, U&E'
      ],
      salicylate: ['Serum salicylate', 'ABG', 'glucose', 'U&E'],
      iron: ['Serum iron', 'TIBC', 'glucose', 'FBC', 'AXR if tablets'],
      tca: ['12-lead ECG (QRS, QTc)', 'ABG'],
      bb: ['12-lead ECG', 'glucose', 'monitoring'],
      ccb: ['12-lead ECG', 'glucose', 'continuous monitoring'],
      opioid: ['Observe RR', 'glucose'],
      general: ['Guided by clinical picture — NPIS'],
      plant: ['As per plant toxin — ECG/electrolytes if indicated'],
      caustic: ['Airway assessment', 'consider endoscopy timing per NPIS'],
      battery: ['XR localisation', 'urgent ENT/surgical as per pathway'],
      ethanol: ['Glucose', 'VBG if reduced GCS'],
      hydrocarbon: ['CXR if respiratory symptoms'],
      anticoag: ['INR / clotting', 'FBC if bleeding'],
      metformin: ['VBG/lactate', 'renal function', 'glucose'],
      valproate: ['LFTs', 'ammonia', 'glucose'],
      anticonvulsant: ['Drug levels if available', 'ECG'],
      sedating: ['ECG', 'observation'],
      stimulant: ['ECG', 'temperature', 'CK', 'sodium'],
      nsaid: ['Renal function', 'FBC if bleeding risk'],
      lithium: ['Serum lithium', 'renal function', 'hydration status']
    };
    return map[p] || map.general;
  }

  function updateDoseBar() {
    var fill = $('doseBarFill');
    var pct = $('doseBarPct');
    var th = $('doseBarThresh');
    if (!selectedSub) {
      fill.style.width = '0%';
      pct.textContent = '—';
      th.textContent = 'Toxic threshold: —';
      $('doseTotalLine').textContent = 'Total dose: —';
      return;
    }
    var d = computePrimaryDoseMg();
    var tox = selectedSub.toxic_dose_mg_per_kg;
    $('doseTotalLine').textContent =
      'Total dose: ' +
      (d.single !== null ? fmt2sf(d.single) + ' mg' : 'unknown') +
      ' → ' +
      (d.perKg !== null ? fmt2sf(d.perKg) + ' mg/kg' : '—');
    th.textContent =
      tox !== null ? 'Toxic threshold: ' + fmt2sf(tox) + ' mg/kg' : 'Toxic threshold: refer NPIS';
    var pctVal = 0;
    if (tox && d.perKg) pctVal = Math.min(100, (d.perKg / tox) * 100);
    fill.style.width = pctVal + '%';
    pct.textContent =
      tox && d.perKg ? fmt2sf((d.perKg / tox) * 100) + '% of toxic threshold' : '—';
  }

  function buildSummary() {
    var lines = [];
    lines.push('POISONING ASSESSMENT SUMMARY');
    lines.push(new Date().toLocaleString('en-GB'));
    lines.push('');
    if (selectedSub) {
      var d = computePrimaryDoseMg();
      lines.push(
        'INGESTION: ' +
          selectedSub.name +
          ' — ' +
          (d.single !== null ? fmt2sf(d.single) + ' mg' : 'dose unknown') +
          (d.perKg ? ' (' + fmt2sf(d.perKg) + ' mg/kg)' : '')
      );
    }
    var hrs = getElapsedHoursFromIngest();
    if (hrs !== null) {
      var hm = Math.floor(hrs) + 'h ' + Math.round((hrs % 1) * 60) + 'm ago';
      lines.push('TIMING: ' + hm + (getIngestionMs() ? ' (ingested ' + new Date(getIngestionMs()).toLocaleString('en-GB') + ')' : ''));
    } else {
      lines.push('TIMING: unknown');
    }
    var w = getWeightKg();
    if (w) lines.push('CHILD: ' + fmt2sf(w) + ' kg');
    var d2 = doseForRisk();
    var dpk = d2.perKg;
    var opts2 = {
      symptomatic: symptomatic,
      useWorst: d2.useWorst,
      haemodynamicCompromise: isHaemodynamicCompromise(),
      batteryLocation: $('batLoc') ? $('batLoc').value : 'unknown'
    };
    var risk = selectedSub ? calcRisk(selectedSub, dpk, opts2) : null;
    if (risk) {
      lines.push('');
      lines.push('RISK: ' + risk.message);
    }
    if (selectedSub) {
      var dec = calcDecontamination(selectedSub, opts2);
      lines.push('');
      lines.push('DECONTAMINATION: ' + dec.summary.replace(/<[^>]+>/g, ''));
    }
    lines.push('');
    lines.push('NPIS: 0344 892 0111 | TOXBASE: toxbase.org');
    lines.push('Verify all doses before administration. Does not replace TOXBASE/NPIS.');
    var name = localStorage.getItem(STORAGE_PREFIX + 'name') || '';
    var grade = localStorage.getItem(STORAGE_PREFIX + 'grade') || '';
    var hosp = localStorage.getItem(STORAGE_PREFIX + 'hospital') || '';
    if (name || grade || hosp) {
      lines.push('');
      lines.push('Clinician: ' + name + ' ' + grade + (hosp ? ' — ' + hosp : ''));
    }
    $('summaryPre').textContent = lines.join('\n');
  }

  function copySummary() {
    var t = $('summaryPre').textContent;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t);
    } else {
      var ta = document.createElement('textarea');
      ta.value = t;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  }

  function updateIronNote() {
    var el = $('ironElementalNote');
    if (!el) return;
    if (selectedSub && selectedSub.special === 'iron') {
      el.classList.remove('hidden');
      el.innerHTML =
        '<p class="hint"><strong>Elemental iron:</strong> toxic ~20 mg/kg; serious ~40 mg/kg — use elemental mg in mg/kg calculations.</p>';
    } else {
      el.classList.add('hidden');
      el.innerHTML = '';
    }
  }

  function onAnyChange() {
    updateElapsedDisplay();
    updateObsHints();
    updateIronNote();
    if ($('mrWarn')) $('mrWarn').classList.toggle('show', $('mrToggle') && $('mrToggle').checked);
    renderFullOutput();
  }

  function openSettings() {
    $('settingsBackdrop').classList.add('open');
    $('settingsPanel').classList.add('open');
    $('setName').value = localStorage.getItem(STORAGE_PREFIX + 'name') || '';
    $('setGrade').value = localStorage.getItem(STORAGE_PREFIX + 'grade') || '';
    $('setHospital').value = localStorage.getItem(STORAGE_PREFIX + 'hospital') || '';
  }

  function closeSettings() {
    $('settingsBackdrop').classList.remove('open');
    $('settingsPanel').classList.remove('open');
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_PREFIX + 'name', $('setName').value);
      localStorage.setItem(STORAGE_PREFIX + 'grade', $('setGrade').value);
      localStorage.setItem(STORAGE_PREFIX + 'hospital', $('setHospital').value);
    } catch (e) {}
    buildSummary();
  }

  function clearAll() {
    if (!confirm('Clear all fields?')) return;
    $('weightKg').value = '';
    $('estFlag').classList.remove('show');
    $('ingestUnknown').checked = false;
    $('ingestDateTime').disabled = false;
    initDateTimeDefault();
    $('substanceSearch').value = '';
    selectedSub = null;
    $('cardSec2').classList.add('hidden');
    $('outputBody').innerHTML = '';
    coRows = [];
    $('coIngestToggle').checked = false;
    toggleCoIngest();
    onAnyChange();
  }

  function initToxidrome() {
    var cbs = document.querySelectorAll('.toxi-cb');
    for (var i = 0; i < cbs.length; i++) {
      cbs[i].onchange = function() {
        var scores = { opioid: 0, anticholinergic: 0, cholinergic: 0, sympathomimetic: 0, serotonin: 0, sedative: 0 };
        for (var j = 0; j < cbs.length; j++) {
          if (cbs[j].checked) {
            var tx = cbs[j].getAttribute('data-tx');
            scores[tx] = (scores[tx] || 0) + 1;
          }
        }
        var best = '';
        var bestv = 0;
        for (var k in scores) {
          if (scores[k] > bestv) {
            bestv = scores[k];
            best = k;
          }
        }
        var tr = $('toxiResult');
        if (bestv === 0) {
          tr.classList.add('hidden');
        } else {
          tr.classList.remove('hidden');
          tr.innerHTML =
            '<strong>Inferred pattern:</strong> ' +
            escapeHtml(best) +
            ' — correlate clinically; supportive care and NPIS as needed.';
        }
        onAnyChange();
      };
    }
  }

  document.addEventListener('DOMContentLoaded', function() {
    searchMap = buildSearchIndex();
    initDateTimeDefault();
    updateElapsedDisplay();
    setInterval(function() {
      updateElapsedDisplay();
      onAnyChange();
    }, 30000);
    $('ingestDateTime').addEventListener('input', onAnyChange);
    $('coIngestToggle').onchange = toggleCoIngest;
    initToxidrome();
    document.addEventListener('click', function(e) {
      var ac = $('acDropdown');
      var wrap = document.querySelector('.ac-wrap');
      if (ac && wrap && !wrap.contains(e.target)) ac.classList.remove('open');
    });
    if ($('gcsE')) onGcsChange();
    onAnyChange();
  });

  window.openSettings = openSettings;
  window.closeSettings = closeSettings;
  window.saveSettings = saveSettings;
  window.clearAll = clearAll;
  window.estWeight = estWeight;
  window.toggleIngestUnknown = toggleIngestUnknown;
  window.applyTimeAgo = applyTimeAgo;
  window.setWitnessed = setWitnessed;
  window.setSymptomatic = setSymptomatic;
  window.setConsciousnessMode = setConsciousnessMode;
  window.setAvpu = setAvpu;
  window.onGcsChange = onGcsChange;
  window.onAnyChange = onAnyChange;
  window.onSearchInput = onSearchInput;
  window.onSearchKey = onSearchKey;
  window.onSearchFocus = onSearchFocus;
  window.copySummary = copySummary;
  window.addCoRow = addCoRow;
  window.onIngestTimeChange = onIngestTimeChange;
  window.updateObsHints = updateObsHints;
  window.toggleCoIngest = toggleCoIngest;
})();
