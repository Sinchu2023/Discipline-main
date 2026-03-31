import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

scripts = re.findall(r'<script>(.*?)</script>', html, re.DOTALL)
with open('extracted.js', 'w', encoding='utf-8') as f:
    f.write('\n\n'.join(scripts))
