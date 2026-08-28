# AGENTS.md

## Cursor Cloud specific instructions

This is a **pure static website** (vanilla HTML/CSS/JS) with no build step, no package manager, and no external dependencies.

### Running the dev server

```bash
python3 -m http.server 8080
```

Serve from the workspace root. The `.vscode/launch.json` expects `http://localhost:8080`.

### Project structure

- `/index.html` — landing page / app launcher
- `/css/` — shared stylesheets (`app-theme.css`, `style-variants.css`)
- `/js/` — shared scripts (`style-system.js`, `theme-toggle.js`, `quick-links.js`)
- Each tool lives in its own subdirectory (e.g. `fluid-calculator/`, `qtc-calculator/`) with a standalone `index.html`

### Notes

- No linter, test runner, or build command exists. There is nothing to lint, test, or build.
- All computation is client-side. No backend, database, or API keys are needed.
- Google Fonts are loaded via CDN; they degrade gracefully if unavailable.
- User preferences (theme, style variant) are stored in `localStorage`.
