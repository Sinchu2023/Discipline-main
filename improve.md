Redesign the Shadow dashboard UI with this new layout. 
Keep ALL existing color variables exactly as they are — 
do not change any greens, reds, yellows, or blacks. 
Only replace the structure and layout.
refer attacheed image on the message 
New layout structure (top to bottom):

1. HERO ROW — 3 cards side by side: You | Shadow | Gap
   - Each card has: label (top), big time value, small subtitle

2. BADGE STRIP — inline row:
   "standard broken" (red) · "pressure: high" (amber) · 
   "mission 67/100" (neutral) · full-width progress bar 
   showing mission % · percentage label on right

3. VS DUEL — two panels side by side with "VS" divider in middle:
   LEFT (you) — green header, rows: gap vs shadow, need to tie, 
   need to lead, def. target, monthly score, win rate
   RIGHT (shadow) — red header, rows: 7d avg, std, weekly Δ, 
   momentum, consistency, lead margin

4. BOTTOM GRID — 2 columns:
   LEFT col:
     - Daily Mission panel (3 tasks with dot indicators, 
       countdown timer at bottom)
     - Flow State panel (blockers, proneness, triggers, cycle)
   RIGHT col:
     - Penalty panel (red border, big penalty time + pt badge, 
       reason text, distraction budget bar)
     - Monthly Battle panel (YOU 2 vs SHADOW 15 scoreboard, 
       win ladder pills)

Use font-family: 'IBM Plex Mono' for all numbers and times.
Use font-family: 'IBM Plex Sans' for all labels.
All spacing, border-radius, and border widths stay consistent 
with the existing design system.
Do not create new color variables — map to existing ones.

Do not touch the color theme file or any global CSS variables. greens or reds or yellows or blacks are already defined should be same 