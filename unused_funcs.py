
import re
with open('extracted.js', encoding='utf-8') as f:
    js = f.read()

# find all functions/methods
funcs = set(re.findall(r'(?:function\s+([a-zA-Z0-9_\$]+)\s*\(|([a-zA-Z0-9_\$]+)\s*\([^)]*\)\s*\{)', js))
funcs = {f[0] or f[1] for f in funcs if any(f) and f[0] not in ['if', 'for', 'switch', 'catch', 'while']}

for f in sorted(funcs):
    if 'mission' in f.lower():
        occ = len(re.findall(fr'\b{f}\b', js))
        if occ <= 2:
            print(f, occ)
