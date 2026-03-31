import re

with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'generateMissions' in line or 'syncMissionFromRoadmap' in line or 'Mission' in line:
        if 'function ' in line or '(' in line and '{' in line:
            pass # just a quick check

# specifically print function definitions containing 'Mission'
for i, line in enumerate(lines):
    if re.search(r'(?:function\s+[a-zA-Z0-9_\$]*Mission[a-zA-Z0-9_\$]*\s*\(|[a-zA-Z0-9_\$]*Mission[a-zA-Z0-9_\$]*\s*\([^)]*\)\s*\{)', line, re.IGNORECASE):
        print(f"Line {i+1}: {line.strip()}")
