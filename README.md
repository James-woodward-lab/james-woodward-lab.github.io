# James Woodward Lab

A collection of lightweight, single-page paediatric clinical tools and
calculators hosted at **[jameswoodward.co.uk](https://jameswoodward.co.uk)**.

Everything here is pure static HTML/CSS/JS - no build step, no framework,
no tracking. Works offline once loaded. Designed for fast use at the
bedside on a phone or trust PC.

> ⚠️ **For clinical decision support only.** Always verify doses and
> thresholds against the BNFc and your local guidelines before acting.

## Tools

### Top
- **🚨 [WETFLAG Resuscitation Card](wetflag-calculator/)** - APLS weight-based
  emergency doses (Weight, Energy, Tube, Fluids, Lorazepam, Adrenaline,
  Glucose) plus the full resus drug set and a print-friendly layout.
- **🧾 [Examination notes](infant-exam-notes/)** - structured infant
  examination documentation helper.
- **💧 [Fluid Calculator](fluid-calculator/)** - maintenance &
  replacement fluids.
- **🫀 [QTc Calculator](qtc-calculator/)** - Bazett / Fridericia with
  ECG reference.
- **💊 [Simple Analgesia Dosing](bnfc-dose-calculator/)** - paracetamol
  & ibuprofen dosing.
- **💉 [Dosing Calculator](dosing-calculator/)** - universal weight-based
  drug dose calculator with unit-aware volume conversion, max-dose capping
  and live output. A calculation aid only, not a drug database.

### Works in progress
A-E Assessment, Chest X-ray Systematic Review, Developmental Milestones,
Renal Fluid Calculator, Safeguarding Calculator, SBAR Generator, Seizure
Timer, Wound Closure Decision Aid, Paediatric Poisoning Triage,
Bronchiolitis Severity Grader, Blood Gas Interpreter, Head Injury CT
Stratification (NICE NG232 / PECARN).

## Design system

A single token-based theme lives in [`css/app-theme.css`](css/app-theme.css).
All colour, spacing, typography, radii, shadow and motion values are CSS
custom properties defined once in `:root` (dark) and overridden in
`html.theme-light`. The classic teal palette is the only palette; the
light/dark mode toggle is provided by
[`js/theme-toggle.js`](js/theme-toggle.js) and persists in
`localStorage`. Typography uses [Inter](https://fonts.google.com/specimen/Inter)
from Google Fonts with a fluid `clamp()`-based scale.

## Adding a new tool

1. Create a folder `my-tool/` at the repo root with an `index.html`.
2. Include the shared theme in `<head>`:
   ```html
   <link rel="preconnect" href="https://fonts.googleapis.com">
   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
   <link rel="stylesheet" href="../css/app-theme.css">
   <script src="../js/theme-toggle.js"></script>
   ```
3. Add a button to the top tools or works-in-progress grid in
   [`index.html`](index.html).
4. If the tool has bespoke styling, add it to `css/my-tool.css` and
   gate everything behind a body class (e.g. `body.my-tool-app`).

## Local development

No tooling required - just open `index.html` in a browser. For a quick
local server:

```bash
python -m http.server 8000
# then visit http://localhost:8000
```

## Licence

Clinical content is based on publicly available guidance (APLS, NICE,
Resuscitation Council UK, BNFc). This repository is provided as-is for
educational purposes. Always apply senior clinical judgement.

