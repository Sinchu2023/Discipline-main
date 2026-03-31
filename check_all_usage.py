import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

with open('functions_list.txt', 'r', encoding='utf-8') as f:
    funcs = f.read().splitlines()

for func in funcs:
    matches = re.findall(rf'\b{func}\b', content)
    if len(matches) == 1:
        print(f"Unused function: {func}")
