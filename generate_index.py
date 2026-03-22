import os

# Folders to ignore
IGNORE = {'.git', '.github', '__pycache__', 'css'}

subfolders = [
    f for f in os.listdir('.')
    if os.path.isdir(f) and f not in IGNORE and not f.startswith('.')
]
subfolders.sort()

links = "\n".join(
    f'      <li><a href="{folder}/index.html">{folder.replace("-", " ").title()}</a></li>'
    for folder in subfolders
)

html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="theme-color" content="#0f1117">
  <title>James Woodward Lab</title>
  <link rel="stylesheet" href="css/app-theme.css">
  <style>
    .index-links {{ list-style: none; padding: 0; margin: 0; }}
    .index-links li {{ margin-bottom: 8px; }}
    .index-links li:last-child {{ margin-bottom: 0; }}
    .index-links a {{
      display: block;
      padding: 12px 14px;
      background: var(--surface2);
      border: 1.5px solid var(--border);
      border-radius: 10px;
      color: var(--text);
      text-decoration: none;
      font-weight: 500;
      transition: border-color 0.2s, background 0.2s;
    }}
    .index-links a:hover {{
      border-color: var(--accent);
      background: rgba(32, 178, 170, 0.08);
      color: var(--accent2);
    }}
  </style>
</head>
<body>
<div class="container">
  <header class="app-header-center">
    <h1>🩺 James Woodward Lab</h1>
    <p>Paediatric clinical tools & calculators</p>
  </header>
  <div class="card">
    <h2>Tools</h2>
    <ul class="index-links">
{links}
    </ul>
  </div>
  <footer class="app-footer">
    For clinical decision support only. Always verify against local guidelines.
  </footer>
</div>
</body>
</html>
"""

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

print(f"Generated index.html with {len(subfolders)} subfolder(s): {subfolders}")
