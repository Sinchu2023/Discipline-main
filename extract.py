import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Match function declarations: function foo() or foo() {
pattern = r'(?:function\s+([a-zA-Z0-9_\$]+)\s*\(|([a-zA-Z0-9_\$]+)\s*\([^)]*\)\s*\{)'
matches = re.findall(pattern, content)

results = []
for m in matches:
    name = m[0] or m[1]
    if name and name not in ['if', 'for', 'while', 'switch', 'catch', 'function']:
        results.append(name)

results = sorted(set(results))

with open('functions_list.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(results))
