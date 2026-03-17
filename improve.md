Fix time format inconsistency in the app.

Problem:
Same value is shown differently:

* Cards → 0h 36m
* Graph tooltip → 0.61h

Both represent the same time but in different formats.

Fix:

* Store all time internally as decimal (e.g., 0.61)
* Convert to HH:mm format ONLY for display

Add utility:
function formatTime(h) {
const hr = Math.floor(h);
const min = Math.round((h - hr) * 60);
return `${hr}h ${min}m`;
}

Apply:

* Cards → formatTime(value)
* Tooltip → formatTime(value)
* VS panel → formatTime(value)

Rules:

* Never show decimal (0.61h) in UI
* Use decimal only for calculations
* Keep UI consistent everywhere
