Pending means task time has not passed yet
Active means current time is within that task slot
If time passes and task not done → it becomes expired (grey)
So pending does NOT stay forever — it turns into expired after time
If task is completed anytime → mark as completed ✅

End of day:
Completed tasks → removed
Not completed (expired) → stay in queue

Next day:
Incomplete tasks come again (pending again in new schedule)

Important:
Today → only status changes (pending → active → expired)
Tomorrow → schedule changes (based on what you missed)

Final understanding:
Pending = before time
Expired = missed today
Reappears next day if unfinished

System does NOT auto-detect → you must click
○ = not done
● = done

Replace checkbox with clickable circle button

On click:
○ → ●
save completed = true

Data stored per day:
taskId
date
completed

Status logic:
completed → ●
before time → ○ (pending)
after time → ○ + grey (expired)

UI must update:
on click → instantly
on time change → continuously

Expired tasks:
stay ○
just become grey

System rule:
you mark completion
system handles time

Your bug:
no live time check
no instant re-render