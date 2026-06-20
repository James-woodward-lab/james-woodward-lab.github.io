/* ============================================================================
 * Rota App
 * ----------------------------------------------------------------------------
 * Fetches the public "SHO CURRENT" Google Sheet as CSV, parses the rota
 * structure (NAME row, change-over rows, date rows, shift cells), and
 * renders a per-person view + a downloadable .ics calendar file.
 *
 * Architecture is a single self-contained IIFE so it can be served as a flat
 * static asset under /js. No build step.
 * ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------------
   * Constants
   * ---------------------------------------------------------------------- */
  var SHEET_ID = '1FHDxM4CDDq3123veURPmwMt_OsAtiDmx0tWLYf0V79U';
  var GID = '1496687482';
  var CSV_URL = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID
              + '/gviz/tq?tqx=out:csv&gid=' + GID;
  // JSONP fallback URL template. Google's gviz JSON endpoint returns
  // `responseHandler(payload)` and works cross-origin via <script> tags
  // (no CORS preflight needed), so it loads from file:// pages too.
  //
  // Note the colon between `responseHandler` and the callback name:
  // sub-parameters inside `tqx` use `:` as the separator, NOT `=`. Using
  // `=` silently falls back to the default handler and our callback
  // never fires (manifests as a 15-second timeout).
  var JSONP_URL_TEMPLATE = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID
              + '/gviz/tq?tqx=out:json;responseHandler:{CB}&headers=0&gid=' + GID;
  var SHEET_VIEW_URL = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID
              + '/edit?gid=' + GID + '#gid=' + GID;

  // Sheet title is "SHO CURRENT Feb-Aug 26" -> all dates are 2026 unless they
  // roll over (Dec -> Jan).
  var BASE_YEAR = 2026;

  // Default shift definitions. Times are local Europe/London wall-clock.
  var SHIFT_DEFS = {
    'D':  { label: 'Day',              start: '08:00', end: '17:30', crossesMidnight: false, category: 'working' },
    'M':  { label: 'Mid',              start: '12:30', end: '22:30', crossesMidnight: false, category: 'working' },
    'T':  { label: 'Twilight',         start: '16:00', end: '02:00', crossesMidnight: true,  category: 'working' },
    'N':  { label: 'Night',            start: '22:00', end: '08:30', crossesMidnight: true,  category: 'working' },
    'S':  { label: 'Self-development', start: '08:00', end: '17:30', crossesMidnight: false, category: 'working' },
    'SL': { label: 'Study leave',      allDay: true,                                          category: 'study-leave' },
    'A/L':{ label: 'Annual leave',     allDay: true,                                          category: 'annual-leave' },
    'TOIL':{label: 'TOIL',             allDay: true,                                          category: 'toil' },
    'SICK':{label: 'Sick',             allDay: true,                                          category: 'sick-off' },
    'OFF': {label: 'Off',              allDay: true,                                          category: 'sick-off' },
    "CARER'S":{label:"Carer's leave",  allDay: true,                                          category: 'sick-off' },
    'STRIKE':{label:'Strike',          allDay: true,                                          category: 'sick-off' }
  };

  // Order matters: longest / most specific codes first so e.g. "A/L" beats "L"
  // and "SL" beats "S".
  var SHIFT_CODE_PRIORITY = [
    "CARER'S", 'STRIKE', 'TOIL', 'SICK', 'A/L', 'SL', 'OFF',
    'D', 'M', 'T', 'N', 'S'
  ];

  // Column-NAME values that aren't real people (counts, instructions, etc.).
  var NAME_BLOCKLIST_RE = /(rolling rota|minimum safe|x1 each|may be swapped|need cover\b|^sho$|^d$|^m$|^t$|^n$|^s$|^psssu$|^pssu$)/i;

  /* ------------------------------------------------------------------------
   * State
   * ---------------------------------------------------------------------- */
  var state = {
    rows: [],            // raw 2-D CSV array
    persons: [],         // unique sorted list of {name, columns: [..] }
    shifts: [],          // { date: Date, dateKey, dow, person, column, raw, codes:[{code, category, start, end, allDay, notes, displayLabel}] }
    minDate: null,
    maxDate: null,
    warnings: [],
    selectedPerson: ''
  };

  /* ------------------------------------------------------------------------
   * DOM refs (assigned in init())
   * ---------------------------------------------------------------------- */
  var $ = {
    statusLine:   null,
    errorBanner:  null,
    errorMessage: null,
    retryBtn:     null,
    openSheet:    null,
    sheetLink:    null,
    personSelect: null,
    personHint:   null,
    shiftStats:   null,
    shiftsTbody:  null,
    catBoxes:     null,
    rangeFrom:    null,
    rangeTo:      null,
    rangeReset:   null,
    downloadBtn:  null,
    exportSum:    null,
    refreshBtn:   null,
    warnings:     null,
    rawDebug:     null
  };

  /* ========================================================================
   * 1. CSV parser - small RFC-4180 implementation
   * ====================================================================== */
  function parseCsv(text) {
    var rows = [];
    var row = [];
    var field = '';
    var inQuotes = false;
    var i = 0;
    // Strip a UTF-8 BOM if present.
    if (text.charCodeAt(0) === 0xFEFF) i = 1;

    while (i < text.length) {
      var c = text.charAt(i);
      if (inQuotes) {
        if (c === '"') {
          if (text.charAt(i + 1) === '"') { field += '"'; i += 2; continue; }
          inQuotes = false; i++; continue;
        }
        field += c; i++; continue;
      }
      if (c === '"') { inQuotes = true; i++; continue; }
      if (c === ',') { row.push(field); field = ''; i++; continue; }
      if (c === '\r') {
        // CRLF or bare CR -> row break
        row.push(field); field = '';
        rows.push(row); row = [];
        if (text.charAt(i + 1) === '\n') i += 2; else i++;
        continue;
      }
      if (c === '\n') {
        row.push(field); field = '';
        rows.push(row); row = [];
        i++; continue;
      }
      field += c; i++;
    }
    // Trailing field / row
    if (field.length || row.length) { row.push(field); rows.push(row); }
    // Drop a single trailing fully-empty row (common artefact)
    if (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') {
      rows.pop();
    }
    return rows;
  }

  /* ========================================================================
   * 2. Structure detection
   * ====================================================================== */
  function normaliseLabel(s) {
    return String(s || '').replace(/\s+/g, ' ').trim();
  }

  function firstCellKey(cell) {
    return normaliseLabel(cell).replace(/\s+/g, '').toUpperCase();
  }

  function isNameRow(rowFirstCell) {
    var k = firstCellKey(rowFirstCell);
    return k === 'NAME';
  }

  function isChangeoverRow(rowFirstCell) {
    var k = firstCellKey(rowFirstCell);
    return k === 'PAEDSCHANGEOVER' || k === 'GPCHANGEOVER' || k.indexOf('CHANGEOVER') !== -1;
  }

  // Recognise dates like "Wednesday 4 Feb" or "Wednesday 4 FebGP Teaching"
  // (the spreadsheet sometimes appends the day's teaching note via a line
  // break, which our CSV parser preserves as a literal newline within the
  // cell; we tolerate both).
  var DATE_RE = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*\s+(\d{1,2})\s+([A-Za-z]+)/;
  var MONTHS = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };

  function parseDateCell(cell, runningYear) {
    if (!cell) return null;
    var first = String(cell).split(/\r?\n/)[0].trim();
    var m = DATE_RE.exec(first);
    if (!m) return null;
    var dom = parseInt(m[2], 10);
    var monIdx = MONTHS[m[3].slice(0, 3).toLowerCase()];
    if (monIdx === undefined) return null;
    return { day: dom, month: monIdx, dow: m[1], year: runningYear };
  }

  /** Strip suffixes like " 80%", " FT", " 10PA", " 9.5PA" from a name. */
  function cleanPersonName(raw) {
    if (!raw) return '';
    var name = String(raw)
      .replace(/\s*\([^)]*\)\s*/g, ' ')         // drop "(Friday)" etc.
      .replace(/\s+\d+(\.\d+)?PA\b/gi, '')      // " 9.5PA"
      .replace(/\s+\d+%\b/g, '')                // " 80%"
      .replace(/\s+FT\b/gi, '')                 // " FT"
      .replace(/\s+LTFT\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    return name;
  }

  /**
   * Parse a NAME-row cell into the "currently-active" name. The sheet uses
   * "(Previous Person) / Next Person" to indicate a rotation; the previous
   * person is the active one until the next change-over row promotes the
   * other. We return *just the previous* name (the parenthesised one or, if
   * no parens, the first segment before " / ").
   */
  function parseInitialNameCell(raw) {
    if (!raw) return '';
    var s = String(raw).replace(/\s+/g, ' ').trim();
    if (!s) return '';
    // Split on " / " (with optional whitespace). Don't split inside "A/L".
    var parts = s.split(/\s\/\s*/);
    // If the first part is "(X)", strip the parens
    var first = parts[0].trim();
    var m = /^\(([^)]+)\)$/.exec(first);
    if (m) return cleanPersonName(m[1]);
    return cleanPersonName(first);
  }

  function isRealPersonName(name) {
    if (!name) return false;
    if (NAME_BLOCKLIST_RE.test(name)) return false;
    // Need at least one letter and one space-ish (most rota names are
    // two words). Allow single-token names just in case.
    if (!/[A-Za-z]/.test(name)) return false;
    return true;
  }

  /**
   * Walk the parsed CSV rows once, threading the "active column -> name"
   * map through change-overs, and produce a list of shift records.
   */
  function buildShifts(rows) {
    var warnings = [];
    var activeNames = {}; // columnIndex -> name (current owner)
    var nameRowSeen = false;
    var shifts = [];
    var runningYear = BASE_YEAR;
    var prevMonth = -1;
    var personColumns = {}; // name -> set of column indices ever owned

    function recordOwnership(colIdx, name) {
      if (!name) return;
      if (!personColumns[name]) personColumns[name] = {};
      personColumns[name][colIdx] = true;
    }

    for (var r = 0; r < rows.length; r++) {
      var row = rows[r];
      if (!row || row.length === 0) continue;
      var firstCell = row[0] || '';

      // ----- Name / Change-over rows ----------------------------------
      if (isNameRow(firstCell) && !nameRowSeen) {
        // Initial NAME row: capture parenthesised "current" people.
        for (var c = 1; c < row.length; c++) {
          var nm = parseInitialNameCell(row[c]);
          if (isRealPersonName(nm)) {
            activeNames[c] = nm;
            recordOwnership(c, nm);
          }
        }
        nameRowSeen = true;
        continue;
      }

      if (isChangeoverRow(firstCell)) {
        for (var cc = 1; cc < row.length; cc++) {
          var raw = row[cc];
          if (raw == null) continue;
          // Change-over rows list one name per column.
          var nmC = cleanPersonName(String(raw).split(/\r?\n/)[0]);
          if (isRealPersonName(nmC)) {
            activeNames[cc] = nmC;
            recordOwnership(cc, nmC);
          } else if (nmC === '') {
            // Empty cell -> keep previous owner.
          }
        }
        continue;
      }

      // ----- Date rows ------------------------------------------------
      var dp = parseDateCell(firstCell, runningYear);
      if (!dp) continue;
      // Roll the running year when month decreases (rota crosses Dec->Jan)
      if (prevMonth !== -1 && dp.month < prevMonth) runningYear++;
      prevMonth = dp.month;
      dp.year = runningYear;

      var jsDate = new Date(Date.UTC(dp.year, dp.month, dp.day));
      var dateKey = formatYmd(jsDate);

      for (var ci = 1; ci < row.length; ci++) {
        var cellRaw = row[ci];
        if (cellRaw == null) continue;
        var cellText = String(cellRaw).trim();
        if (!cellText) continue;
        var person = activeNames[ci];
        if (!person || !isRealPersonName(person)) continue;

        var codes = interpretCell(cellText);
        if (!codes.length) continue;

        shifts.push({
          date: jsDate,
          dateKey: dateKey,
          dow: dp.dow,
          person: person,
          column: ci,
          raw: cellText,
          codes: codes
        });
      }
    }

    // Build sorted, unique persons list (including everyone who ever owned
    // a column, even if they happen to have zero shifts in range).
    var personsSet = {};
    Object.keys(personColumns).forEach(function (n) { personsSet[n] = true; });
    shifts.forEach(function (s) { personsSet[s.person] = true; });
    var persons = Object.keys(personsSet).sort(function (a, b) {
      return a.localeCompare(b);
    });

    return { shifts: shifts, persons: persons, warnings: warnings };
  }

  /* ========================================================================
   * 3. Cell -> [{code, category, start, end, allDay, notes, label}]
   *
   * Examples handled:
   *   "D"                              -> Day 08:00-17:30
   *   "M(11:30-21:30)"                 -> Mid 11:30-21:30
   *   "D (start at 13:00)"             -> Day 13:00-17:30
   *   "D (07:30-15:30)"                -> Day 07:30-15:30
   *   "N (L)(22:00-03:00)"             -> Night 22:00-03:00 (note "L")
   *   "M(swap with 25/02)"             -> Mid default, note "swap with 25/02"
   *   "SL (AM) /D (start at 13:00)"    -> Study leave AM + Day 13:00-17:30
   *   "TOIL(SL on 22/05)"              -> TOIL all-day, note "SL on 22/05"
   *   "A/L"                            -> Annual leave all-day
   *   "Office", "Supervision", "Adults", "Day - Charlotte", "Phil Harbord17:00-22:15"
   *                                    -> category "other", raw passes through
   * ====================================================================== */

  // Split a multi-part cell on " /" only when followed by an upper-case
  // letter (so we don't split inside "A/L").
  function splitParts(text) {
    var s = text.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
    return s.split(/\s\/\s*(?=[A-Z(])/g);
  }

  function interpretCell(text) {
    var parts = splitParts(text);
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i].trim();
      if (!p) continue;
      var info = interpretPart(p);
      if (info) out.push(info);
    }
    return out;
  }

  /** Try to find a known leading code in the part text. */
  function findLeadingCode(text) {
    var upper = text.toUpperCase();
    for (var i = 0; i < SHIFT_CODE_PRIORITY.length; i++) {
      var code = SHIFT_CODE_PRIORITY[i];
      if (upper === code) return { code: code, rest: '' };
      // boundary: next char is space or ( or end
      if (upper.indexOf(code) === 0) {
        var next = upper.charAt(code.length);
        if (next === '' || next === ' ' || next === '(' || next === '\t') {
          return { code: code, rest: text.slice(code.length).trim() };
        }
      }
    }
    return null;
  }

  function interpretPart(part) {
    var found = findLeadingCode(part);
    if (!found) {
      // Not a known code - treat as "other" so it can still appear in the
      // table (and optionally in the .ics). Use the whole cell as label.
      return {
        code: 'OTHER',
        category: 'other',
        label: part,
        allDay: true,
        start: null,
        end: null,
        notes: '',
        raw: part
      };
    }
    var def = SHIFT_DEFS[found.code];
    var info = {
      code: found.code,
      category: def ? def.category : 'other',
      label: def ? def.label : found.code,
      allDay: def ? !!def.allDay : true,
      start: def && def.start ? def.start : null,
      end: def && def.end ? def.end : null,
      crossesMidnight: def ? !!def.crossesMidnight : false,
      notes: '',
      raw: part
    };

    // Extract everything in (...) groups and look for time overrides /
    // free-text notes.
    var noteBits = [];
    var rest = found.rest;
    var parenRe = /\(([^)]*)\)/g;
    var pm;
    while ((pm = parenRe.exec(rest)) !== null) {
      var inside = pm[1].trim();
      if (!inside) continue;
      var override = parseTimeOverride(inside);
      if (override) {
        if (override.start) { info.start = override.start; info.allDay = false; }
        if (override.end)   { info.end = override.end; info.allDay = false; }
        if (override.crossesMidnight !== undefined) info.crossesMidnight = override.crossesMidnight;
      } else {
        noteBits.push(inside);
      }
    }
    // Anything left outside parens (e.g. "(L)") joins the notes too.
    var leftover = rest.replace(parenRe, '').replace(/\s+/g, ' ').trim();
    if (leftover) noteBits.unshift(leftover);
    info.notes = noteBits.join(' · ');

    // Sanity: if a working code somehow has no times, fall back to all-day.
    if (info.category === 'working' && (!info.start || !info.end)) {
      info.allDay = true;
    }

    // If we picked up a time override, recompute crossesMidnight from times.
    if (!info.allDay && info.start && info.end) {
      var sM = toMinutes(info.start), eM = toMinutes(info.end);
      info.crossesMidnight = (eM <= sM);
    }

    return info;
  }

  // Parse strings like "11:30-21:30", "22:00 - 03:00", "start at 13:00",
  // "13:00 start", "finish at 13:00", "13:00 finish".
  function parseTimeOverride(text) {
    var t = text.trim();
    var rangeRe = /^(\d{1,2}):(\d{2})\s*[-\u2013]\s*(\d{1,2}):(\d{2})$/;
    var m = rangeRe.exec(t);
    if (m) {
      return { start: pad2(m[1]) + ':' + m[2], end: pad2(m[3]) + ':' + m[4] };
    }
    var startRe = /^(?:start(?:\s+at)?\s+(\d{1,2}):(\d{2})|(\d{1,2}):(\d{2})\s+start)$/i;
    m = startRe.exec(t);
    if (m) {
      var h = m[1] || m[3], mn = m[2] || m[4];
      return { start: pad2(h) + ':' + mn };
    }
    var finishRe = /^(?:finish(?:\s+at)?\s+(\d{1,2}):(\d{2})|(\d{1,2}):(\d{2})\s+finish)$/i;
    m = finishRe.exec(t);
    if (m) {
      var h2 = m[1] || m[3], mn2 = m[2] || m[4];
      return { end: pad2(h2) + ':' + mn2 };
    }
    return null;
  }

  function pad2(v) { var s = String(v); return s.length < 2 ? '0' + s : s; }
  function toMinutes(hhmm) {
    var parts = hhmm.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }

  function formatYmd(d) {
    return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate());
  }

  /* ========================================================================
   * 4. Fetching the sheet
   *
   * Two transport paths:
   *
   *   (a) Direct CSV fetch via gviz/tq?tqx=out:csv. This is fast and tidy
   *       but Google only returns CORS headers when the page's origin is a
   *       real web origin - a file:// page sends `Origin: null` and the
   *       request is blocked. So we use this on web origins only.
   *
   *   (b) JSONP via gviz/tq?tqx=out:json;responseHandler=CB. We inject a
   *       <script> tag pointing at this URL; Google calls our handler
   *       with the JSON payload. Cross-origin script loads bypass CORS,
   *       so this works on file://, localhost and the deployed site
   *       alike. We then unwrap the JSON table into a 2D string array
   *       matching what the CSV parser would produce.
   *
   * We try (a) on web origins; on failure (or always, when the page is
   * served from file://) we fall back to (b).
   * ====================================================================== */
  function fetchSheetCsv() {
    return fetch(CSV_URL, { cache: 'no-store', redirect: 'follow' }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status + ' from Google Sheets');
      return res.text();
    }).then(parseCsv);
  }

  function fetchSheetJsonp() {
    return new Promise(function (resolve, reject) {
      var cbName = '_rotaJsonp_' + Date.now() + '_' + Math.floor(Math.random() * 1e6);
      var settled = false;
      var script = document.createElement('script');
      var timeout = setTimeout(function () { finish(new Error('Timed out after 15s waiting for the sheet')); }, 15000);

      function cleanup() {
        clearTimeout(timeout);
        try { delete window[cbName]; } catch (_) { window[cbName] = undefined; }
        if (script && script.parentNode) script.parentNode.removeChild(script);
      }
      function finish(err, rows) {
        if (settled) return;
        settled = true;
        cleanup();
        if (err) reject(err); else resolve(rows);
      }

      window[cbName] = function (payload) {
        try {
          if (!payload || payload.status === 'error') {
            var msg = 'Sheet returned an error';
            if (payload && payload.errors && payload.errors[0] && payload.errors[0].detailed_message) {
              msg += ': ' + payload.errors[0].detailed_message.replace(/<[^>]+>/g, '');
            }
            finish(new Error(msg));
            return;
          }
          finish(null, jsonpToRows(payload));
        } catch (e) {
          finish(e);
        }
      };

      script.onerror = function () { finish(new Error('Script-tag fetch failed (sheet may not be publicly viewable)')); };
      script.src = JSONP_URL_TEMPLATE.replace('{CB}', cbName);
      document.head.appendChild(script);
    });
  }

  /** Convert a gviz JSON `table` payload into the same 2D string array we'd
   *  get from parsing the CSV.
   *
   *  Wrinkle: when the sheet's column A is typed as 'date' (true here),
   *  gviz returns null for cells whose content isn't a pure date - so the
   *  "Wednesday 11 Feb\nGP Teaching" and "PAEDSCHANGEOVER" cells in
   *  column A come back empty. We reconstruct them by:
   *    - inferring inter-date rows from `previous_date + 1 day`, gated on
   *      the weekday word the sheet writes into column S (index 18); and
   *    - synthesising a "CHANGEOVER" marker when a date-less row carries
   *      multiple full-name strings instead of shift codes.
   */
  function jsonpToRows(payload) {
    var table = payload && payload.table;
    if (!table) return [];
    var cols = table.cols || [];
    var rowsJ = table.rows || [];
    var colCount = cols.length;

    // Pass 1: raw conversion (cell -> string, blanks -> '').
    var raw = [];
    rowsJ.forEach(function (r) {
      var cells = (r && r.c) || [];
      var row = [];
      var len = Math.max(cells.length, colCount);
      for (var i = 0; i < len; i++) {
        var cell = cells[i];
        if (cell == null) { row.push(''); continue; }
        if (cell.f != null && cell.f !== '') row.push(String(cell.f));
        else if (cell.v != null) row.push(String(cell.v));
        else row.push('');
      }
      raw.push(row);
    });

    // Pass 2: reconstruct missing col-A markers.
    var firstColType = (cols[0] && cols[0].type) || '';
    if (firstColType !== 'date') return raw;

    var WEEKDAY_RE = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/i;
    var FULL_NAME_RE = /^[A-Z][a-zA-Z'\-]{1,}\s+[A-Z][a-zA-Z'\-]{1,}/;
    var SHORT_CODES = { 'D':1,'M':1,'T':1,'N':1,'S':1,'SL':1,'A/L':1,'TOIL':1,'SICK':1,'OFF':1 };
    var SHORT_DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var SHORT_MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    var runningDate = null;
    raw.forEach(function (row) {
      var col0 = (row[0] || '').trim();

      // Already a usable date string? Update runningDate from it.
      if (col0) {
        var firstLine = col0.split(/\r?\n/)[0].trim();
        var m = DATE_RE.exec(firstLine);
        if (m) {
          var dom = parseInt(m[2], 10);
          var monIdx = MONTHS[m[3].slice(0, 3).toLowerCase()];
          if (monIdx != null) {
            // Year handling matches buildShifts: just track month order.
            var year = runningDate
              ? (monIdx < runningDate.getUTCMonth() ? runningDate.getUTCFullYear() + 1 : runningDate.getUTCFullYear())
              : BASE_YEAR;
            runningDate = new Date(Date.UTC(year, monIdx, dom));
          }
        }
        return;
      }

      var col18 = (row[18] || '').trim();
      var hasWeekday = WEEKDAY_RE.test(col18);

      // Count name-like vs code-like cells in the slot columns (1..16).
      var nameLike = 0;
      var codeLike = 0;
      for (var k = 1; k <= 16 && k < row.length; k++) {
        var v = (row[k] || '').replace(/\s+/g, ' ').trim();
        if (!v) continue;
        var firstToken = v.split(/[\s(]/)[0].toUpperCase();
        if (SHORT_CODES[firstToken]) codeLike++;
        else if (FULL_NAME_RE.test(v)) nameLike++;
      }

      if (hasWeekday && runningDate) {
        // Inferred date row: previous date + 1 day.
        runningDate = new Date(Date.UTC(
          runningDate.getUTCFullYear(),
          runningDate.getUTCMonth(),
          runningDate.getUTCDate() + 1));
        row[0] = SHORT_DOW[runningDate.getUTCDay()]
               + ' ' + runningDate.getUTCDate()
               + ' ' + SHORT_MON[runningDate.getUTCMonth()];
        return;
      }

      if (!hasWeekday && nameLike >= 4 && codeLike <= 1) {
        // No weekday, no date, lots of names -> change-over row.
        row[0] = 'CHANGEOVER';
      }
      // else: header / footer / blank row; leave col0 empty so the main
      // pipeline skips it.
    });

    return raw;
  }

  function isFileProtocol() {
    return typeof location !== 'undefined' && location.protocol === 'file:';
  }

  /** Fetch the sheet with automatic CSV -> JSONP fallback. */
  function fetchSheetRows() {
    if (isFileProtocol()) return fetchSheetJsonp();
    return fetchSheetCsv().catch(function (err) {
      // CORS or network failure -> try JSONP transparently.
      return fetchSheetJsonp().catch(function (err2) {
        // Surface the JSONP error since it's more useful (the CSV error
        // is almost always the generic "Failed to fetch").
        throw err2 || err;
      });
    });
  }

  /* ========================================================================
   * 5. UI rendering
   * ====================================================================== */
  var DOW_LONG = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };
  var DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function formatPretty(date) {
    return DOW_SHORT[date.getUTCDay()] + ' ' + date.getUTCDate() + ' ' + MONTH_SHORT[date.getUTCMonth()] + ' ' + date.getUTCFullYear();
  }

  function renderPersons() {
    var sel = $.personSelect;
    sel.textContent = '';
    var optAll = document.createElement('option');
    optAll.value = '__all__';
    optAll.textContent = 'All staff (combined view)';
    sel.appendChild(optAll);

    var optBlank = document.createElement('option');
    optBlank.value = '';
    optBlank.textContent = '-- pick a person --';
    optBlank.disabled = true;
    sel.appendChild(optBlank);

    state.persons.forEach(function (p) {
      var o = document.createElement('option');
      o.value = p;
      o.textContent = p;
      sel.appendChild(o);
    });

    sel.disabled = false;
    sel.value = '';
  }

  function shiftsForPerson(person) {
    if (!person || person === '__all__') return state.shifts.slice();
    return state.shifts.filter(function (s) { return s.person === person; });
  }

  function applyDateRange(shifts) {
    var from = $.rangeFrom.value ? new Date($.rangeFrom.value + 'T00:00:00Z') : null;
    var to   = $.rangeTo.value   ? new Date($.rangeTo.value   + 'T00:00:00Z') : null;
    return shifts.filter(function (s) {
      if (from && s.date < from) return false;
      if (to   && s.date > to)   return false;
      return true;
    });
  }

  function activeCategories() {
    var cats = {};
    $.catBoxes.forEach(function (cb) { if (cb.checked) cats[cb.getAttribute('data-category')] = true; });
    return cats;
  }

  function filterByCategory(shifts) {
    var cats = activeCategories();
    return shifts.filter(function (s) {
      return s.codes.some(function (c) { return cats[c.category]; });
    }).map(function (s) {
      // Trim codes within the shift so we only count/export the selected ones
      return Object.assign({}, s, {
        codes: s.codes.filter(function (c) { return cats[c.category]; })
      });
    });
  }

  function renderShifts() {
    var person = state.selectedPerson;
    var all = shiftsForPerson(person);
    all.sort(function (a, b) { return a.date - b.date; });

    renderStats(all);
    renderTable(all, person);
    renderRawDebug(all);
    updateExportButton(all, person);
  }

  function renderStats(shifts) {
    var counts = {};
    shifts.forEach(function (s) {
      s.codes.forEach(function (c) {
        counts[c.code] = (counts[c.code] || 0) + 1;
      });
    });
    var order = ['D', 'M', 'T', 'N', 'S', 'SL', 'A/L', 'TOIL', 'SICK', 'OFF'];
    var html = '';
    order.forEach(function (code) {
      if (!counts[code]) return;
      var def = SHIFT_DEFS[code];
      html += '<span class="rota-stat"><b>' + counts[code] + '</b> ' + (def ? def.label : code) + '</span>';
    });
    // Include "other" buckets last as a single tally
    var otherTotal = 0;
    Object.keys(counts).forEach(function (k) {
      if (order.indexOf(k) === -1) otherTotal += counts[k];
    });
    if (otherTotal) {
      html += '<span class="rota-stat"><b>' + otherTotal + '</b> Other</span>';
    }
    $.shiftStats.innerHTML = html;
  }

  function renderTable(shifts, person) {
    var tbody = $.shiftsTbody;
    tbody.textContent = '';
    var thFirst = document.getElementById('th-first');
    if (thFirst) thFirst.textContent = (person === '__all__') ? 'Person' : 'Date';
    if (!person) {
      tbody.innerHTML = '<tr class="rota-empty"><td colspan="5">Pick a person to see their shifts.</td></tr>';
      return;
    }
    if (!shifts.length) {
      tbody.innerHTML = '<tr class="rota-empty"><td colspan="5">No shifts found for this person in the rota.</td></tr>';
      return;
    }

    var frag = document.createDocumentFragment();
    var showAll = person === '__all__';
    var lastDateKey = '';

    shifts.forEach(function (s) {
      if (showAll && s.dateKey !== lastDateKey) {
        var groupTr = document.createElement('tr');
        groupTr.className = 'rota-group-row';
        var groupTd = document.createElement('td');
        groupTd.colSpan = 5;
        groupTd.textContent = formatPretty(s.date);
        groupTr.appendChild(groupTd);
        frag.appendChild(groupTr);
        lastDateKey = s.dateKey;
      }

      s.codes.forEach(function (c) {
        var tr = document.createElement('tr');

        var tdDate = document.createElement('td');
        tdDate.className = 'rota-cell-date';
        tdDate.textContent = showAll ? s.person : (s.date.getUTCDate() + ' ' + MONTH_SHORT[s.date.getUTCMonth()]);
        tr.appendChild(tdDate);

        var tdDay = document.createElement('td');
        tdDay.className = 'rota-cell-day';
        tdDay.textContent = DOW_LONG[s.dow] || s.dow;
        tr.appendChild(tdDay);

        var tdShift = document.createElement('td');
        var pill = document.createElement('span');
        pill.className = 'rota-shift-pill';
        pill.setAttribute('data-cat', c.category);
        pill.textContent = c.code === 'OTHER' ? (c.label.length > 18 ? c.label.slice(0, 17) + '…' : c.label) : (c.code + ' · ' + c.label);
        pill.title = c.label;
        tdShift.appendChild(pill);
        tr.appendChild(tdShift);

        var tdTime = document.createElement('td');
        tdTime.className = 'rota-cell-time';
        if (c.allDay) tdTime.textContent = 'All day';
        else if (c.start && c.end) tdTime.textContent = c.start + '-' + c.end + (c.crossesMidnight ? ' (+1d)' : '');
        else tdTime.textContent = '-';
        tr.appendChild(tdTime);

        var tdNotes = document.createElement('td');
        tdNotes.className = 'rota-cell-notes';
        tdNotes.textContent = c.notes || (c.raw && c.raw !== c.code ? c.raw : '');
        tr.appendChild(tdNotes);

        frag.appendChild(tr);
      });
    });

    tbody.appendChild(frag);
  }

  function renderRawDebug(shifts) {
    if (!$.rawDebug) return;
    if (!shifts.length) { $.rawDebug.textContent = '(no shifts)'; return; }
    var lines = shifts.map(function (s) {
      return s.dateKey + '  ' + s.dow + '  col ' + s.column + '  ' + s.person + '  |  ' + s.raw.replace(/\s+/g, ' ');
    });
    $.rawDebug.textContent = lines.join('\n');
  }

  function updateExportButton(shifts, person) {
    var canExport = !!person && person !== '__all__';
    $.downloadBtn.disabled = !canExport;
    if (!person) {
      $.exportSum.textContent = '';
      return;
    }
    if (person === '__all__') {
      $.exportSum.textContent = 'Select a single person to enable the .ics download.';
      return;
    }
    var filtered = applyDateRange(filterByCategory(shifts));
    $.exportSum.textContent = filtered.length
      ? filtered.length + ' event' + (filtered.length === 1 ? '' : 's') + ' will be exported.'
      : 'Nothing matches the current filters - tick a category or widen the date range.';
  }

  /* ========================================================================
   * 6. ICS generation
   * ====================================================================== */
  function escapeIcsText(s) {
    return String(s || '')
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;');
  }

  // Fold lines per RFC 5545: split at 73 chars, continuation lines start
  // with a single space. We split on character boundaries (UTF-8 octet
  // counts may differ slightly, but is OK for the ASCII-dominant content
  // here).
  function foldLine(line) {
    if (line.length <= 73) return line;
    var out = '';
    var i = 0;
    while (i < line.length) {
      var slice = line.substr(i, i === 0 ? 73 : 72);
      out += (i === 0 ? '' : '\r\n ') + slice;
      i += slice.length;
    }
    return out;
  }

  function joinIcs(lines) {
    return lines.map(foldLine).join('\r\n');
  }

  // djb2-ish hash so UIDs are stable across re-exports.
  function hashStr(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) {
      h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    }
    return ('00000000' + (h >>> 0).toString(16)).slice(-8);
  }

  function dtUtcStamp() {
    var d = new Date();
    return d.getUTCFullYear()
      + pad2(d.getUTCMonth() + 1)
      + pad2(d.getUTCDate()) + 'T'
      + pad2(d.getUTCHours())
      + pad2(d.getUTCMinutes())
      + pad2(d.getUTCSeconds()) + 'Z';
  }

  function ymdCompact(date) {
    return date.getUTCFullYear() + pad2(date.getUTCMonth() + 1) + pad2(date.getUTCDate());
  }

  function addDaysUtc(date, days) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
  }

  function buildIcs(shifts, person) {
    var lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//James Woodward Lab//Rota App//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Rota - ' + person,
      'X-WR-TIMEZONE:Europe/London',
      'BEGIN:VTIMEZONE',
      'TZID:Europe/London',
      'X-LIC-LOCATION:Europe/London',
      'BEGIN:STANDARD',
      'DTSTART:19710101T020000',
      'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10',
      'TZOFFSETFROM:+0100',
      'TZOFFSETTO:+0000',
      'TZNAME:GMT',
      'END:STANDARD',
      'BEGIN:DAYLIGHT',
      'DTSTART:19710101T010000',
      'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3',
      'TZOFFSETFROM:+0000',
      'TZOFFSETTO:+0100',
      'TZNAME:BST',
      'END:DAYLIGHT',
      'END:VTIMEZONE'
    ];

    var stamp = dtUtcStamp();

    shifts.forEach(function (s) {
      s.codes.forEach(function (c, idx) {
        var ymd = ymdCompact(s.date);
        var summary = c.code === 'OTHER'
          ? (c.label + ' - ' + person)
          : (c.label + ' (' + c.code + ') - ' + person);
        var descParts = ['Raw cell: ' + s.raw];
        if (c.notes) descParts.push('Notes: ' + c.notes);
        descParts.push('Source: SHO rota (sheet ' + SHEET_ID + ', gid ' + GID + ')');

        var uidSeed = SHEET_ID + '|' + GID + '|' + s.dateKey + '|' + s.column + '|' + c.code + '|' + idx + '|' + person;
        var uid = 'rota-' + hashStr(uidSeed) + '@jameswoodwardlab';

        lines.push('BEGIN:VEVENT');
        lines.push('UID:' + uid);
        lines.push('DTSTAMP:' + stamp);

        if (c.allDay) {
          var endDate = addDaysUtc(s.date, 1);
          lines.push('DTSTART;VALUE=DATE:' + ymd);
          lines.push('DTEND;VALUE=DATE:' + ymdCompact(endDate));
        } else {
          var startHM = (c.start || '08:00').replace(':', '') + '00';
          var endHM = (c.end || '17:30').replace(':', '') + '00';
          var endDateForEvent = s.date;
          if (c.crossesMidnight) {
            endDateForEvent = addDaysUtc(s.date, 1);
          }
          lines.push('DTSTART;TZID=Europe/London:' + ymd + 'T' + startHM);
          lines.push('DTEND;TZID=Europe/London:' + ymdCompact(endDateForEvent) + 'T' + endHM);
        }

        lines.push('SUMMARY:' + escapeIcsText(summary));
        lines.push('DESCRIPTION:' + escapeIcsText(descParts.join('\n')));
        lines.push('CATEGORIES:' + escapeIcsText(c.category));
        lines.push('TRANSP:OPAQUE');
        lines.push('END:VEVENT');
      });
    });

    lines.push('END:VCALENDAR');
    return joinIcs(lines);
  }

  function slugifyName(name) {
    return String(name || 'rota')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function triggerDownload(filename, content) {
    var blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function downloadIcsForCurrent() {
    var person = state.selectedPerson;
    if (!person || person === '__all__') return;
    var shifts = shiftsForPerson(person);
    shifts.sort(function (a, b) { return a.date - b.date; });
    shifts = applyDateRange(filterByCategory(shifts));
    if (!shifts.length) {
      window.alert('No events to export with the current filters.');
      return;
    }
    var fromKey = shifts[0].dateKey.replace(/-/g, '');
    var toKey = shifts[shifts.length - 1].dateKey.replace(/-/g, '');
    var fname = 'rota-' + slugifyName(person) + '-' + fromKey + '-' + toKey + '.ics';
    var ics = buildIcs(shifts, person);
    triggerDownload(fname, ics);
  }

  /* ========================================================================
   * 7. Wiring
   * ====================================================================== */
  function setStatus(text, kind) {
    $.statusLine.textContent = text;
    $.statusLine.classList.remove('is-error', 'is-ok');
    if (kind) $.statusLine.classList.add('is-' + kind);
  }

  function showError(diag) {
    var title = (typeof diag === 'object' && diag.title) ? diag.title : "Couldn't load the rota";
    var body  = (typeof diag === 'object' && diag.body)  ? diag.body  : String(diag || '');
    var titleEl = document.getElementById('error-title');
    if (titleEl) titleEl.textContent = title;
    $.errorMessage.textContent = body;
    $.errorBanner.hidden = false;
    setStatus("Couldn't load rota", 'error');
  }

  function hideError() {
    $.errorBanner.hidden = true;
  }

  function showLoadingSkeleton() {
    $.shiftsTbody.innerHTML = '';
    for (var i = 0; i < 5; i++) {
      var tr = document.createElement('tr');
      tr.className = 'rota-skeleton-row';
      for (var c = 0; c < 5; c++) {
        var td = document.createElement('td');
        var bar = document.createElement('span');
        bar.className = 'rota-skeleton-bar';
        bar.style.width = (40 + Math.random() * 50) + '%';
        td.appendChild(bar);
        tr.appendChild(td);
      }
      $.shiftsTbody.appendChild(tr);
    }
  }

  function renderWarnings() {
    if (!$.warnings) return;
    $.warnings.innerHTML = '';
    if (!state.warnings.length) return;
    state.warnings.forEach(function (w) {
      var d = document.createElement('div');
      d.className = 'alert alert-warn';
      d.textContent = w;
      $.warnings.appendChild(d);
    });
  }

  function setDateRangeBounds() {
    if (!state.shifts.length) return;
    var dates = state.shifts.map(function (s) { return s.date; });
    state.minDate = new Date(Math.min.apply(null, dates));
    state.maxDate = new Date(Math.max.apply(null, dates));
    $.rangeFrom.min = formatYmd(state.minDate);
    $.rangeFrom.max = formatYmd(state.maxDate);
    $.rangeTo.min   = formatYmd(state.minDate);
    $.rangeTo.max   = formatYmd(state.maxDate);
  }

  function loadAndRender() {
    hideError();
    setStatus('Fetching rota from Google Sheets…');
    showLoadingSkeleton();
    $.personSelect.disabled = true;
    $.personSelect.innerHTML = '<option>Loading…</option>';

    fetchSheetRows().then(function (rows) {
      state.rows = rows;
      var built = buildShifts(state.rows);
      state.shifts = built.shifts;
      state.persons = built.persons;
      state.warnings = built.warnings;

      if (!state.shifts.length) {
        showError({
          title: 'Sheet loaded but no shifts found',
          body: 'We parsed the sheet but found no shift rows. The structure may have changed - open the sheet to check.'
        });
        return;
      }

      setDateRangeBounds();
      renderPersons();
      renderWarnings();

      // Restore last-selected person if it still exists.
      var stored = '';
      try { stored = localStorage.getItem('rota-app:person') || ''; } catch (_) { /* ignore */ }
      if (stored && state.persons.indexOf(stored) !== -1) {
        $.personSelect.value = stored;
        state.selectedPerson = stored;
      } else {
        state.selectedPerson = '';
      }

      var fetchedAt = new Date();
      setStatus('Loaded ' + state.shifts.length + ' shift entries across ' + state.persons.length
        + ' people · fetched ' + pad2(fetchedAt.getHours()) + ':' + pad2(fetchedAt.getMinutes()), 'ok');

      renderShifts();
    }).catch(function (err) {
      var msg = (err && err.message) ? err.message : String(err);
      showError({
        title: "Couldn't load the rota",
        body: msg + '. Make sure the sheet is set to "Anyone with the link can view" '
             + '(File → Share → General access in Google Sheets) - it must be publicly '
             + 'viewable for the live fetch to work.'
      });
    });
  }

  function init() {
    $.statusLine   = document.getElementById('status-line');
    $.errorBanner  = document.getElementById('error-banner');
    $.errorMessage = document.getElementById('error-message');
    $.retryBtn     = document.getElementById('retry-btn');
    $.openSheet    = document.getElementById('open-sheet-link');
    $.sheetLink    = document.getElementById('sheet-link');
    $.personSelect = document.getElementById('person-select');
    $.personHint   = document.getElementById('person-hint');
    $.shiftStats   = document.getElementById('shift-stats');
    $.shiftsTbody  = document.getElementById('shifts-tbody');
    $.catBoxes     = Array.prototype.slice.call(document.querySelectorAll('input[type="checkbox"][data-category]'));
    $.rangeFrom    = document.getElementById('range-from');
    $.rangeTo      = document.getElementById('range-to');
    $.rangeReset   = document.getElementById('range-reset');
    $.downloadBtn  = document.getElementById('download-ics');
    $.exportSum    = document.getElementById('export-summary');
    $.refreshBtn   = document.getElementById('refresh-btn');
    $.warnings     = document.getElementById('warnings');
    $.rawDebug     = document.getElementById('raw-debug');

    if ($.openSheet) $.openSheet.href = SHEET_VIEW_URL;
    if ($.sheetLink) $.sheetLink.href = SHEET_VIEW_URL;

    $.personSelect.addEventListener('change', function () {
      state.selectedPerson = $.personSelect.value;
      try { localStorage.setItem('rota-app:person', state.selectedPerson); } catch (_) { /* ignore */ }
      renderShifts();
    });

    $.catBoxes.forEach(function (cb) {
      cb.addEventListener('change', function () {
        updateExportButton(shiftsForPerson(state.selectedPerson), state.selectedPerson);
      });
    });

    $.rangeFrom.addEventListener('change', function () {
      updateExportButton(shiftsForPerson(state.selectedPerson), state.selectedPerson);
    });
    $.rangeTo.addEventListener('change', function () {
      updateExportButton(shiftsForPerson(state.selectedPerson), state.selectedPerson);
    });
    $.rangeReset.addEventListener('click', function () {
      $.rangeFrom.value = '';
      $.rangeTo.value = '';
      updateExportButton(shiftsForPerson(state.selectedPerson), state.selectedPerson);
    });

    $.downloadBtn.addEventListener('click', downloadIcsForCurrent);
    $.retryBtn.addEventListener('click', loadAndRender);
    $.refreshBtn.addEventListener('click', loadAndRender);

    loadAndRender();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
