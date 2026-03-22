import os

# Folders to ignore
IGNORE = {'.git', '.github', '__pycache__', 'css'}

subfolders = [
    f for f in os.listdir('.')
    if os.path.isdir(f) and f not in IGNORE and not f.startswith('.')
]
subfolders.sort()

links = "\n".join(
    f'    <li><a href="{folder}/index.html">{folder.replace("-", " ").title()}</a></li>'
    for folder in subfolders
)

html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My Site</title>
</head>
<body>
  <h1>My Site</h1>
  <ul>
{links}
  </ul>
</body>
</html>
"""

with open("index.html", "w") as f:
    f.write(html)

print(f"Generated index.html with {len(subfolders)} subfolder(s): {subfolders}")
