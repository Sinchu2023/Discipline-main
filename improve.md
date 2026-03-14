### 10. Critical Fixes Required

The following issues must be fixed in the application.

---

### Cross-Device Timer Stop Synchronization

Currently the timer starts correctly across devices, but stopping the timer does not synchronize properly.

Requirements:

* When the timer is stopped on **any device**, it must stop immediately on **all other logged-in devices**.
* The stop action must update the timer state in Firebase.
* All devices must listen to the timer state using a realtime listener.
* When the timer state changes to **stopped**, the local timer must stop immediately.

Important rule:

The UI must stop the timer **locally first**, then update Firebase asynchronously.

Example flow:

```
User presses STOP
→ local timer stops instantly
→ Firebase timer state updated
→ other devices receive snapshot
→ their timers stop
```

Do not wait for Firebase before stopping the timer locally.

Ensure snapshot listeners correctly detect changes in timer state.

---

### User-Specific Roadmaps

Each user must have their **own independent roadmap**.

Requirements:

* A user's roadmap must never be visible to other users.
* Roadmap data must be stored using the logged-in user's ID.

Example structure:

```
users/{user.uid}/roadmap
```

When a user logs in:

* Load only the roadmap belonging to that user.
* Never load or display another user's roadmap.

---

### Roadmap Not Generated State

If the user has not generated a roadmap yet, the application must clearly show:

```
Roadmap not generated yet
```

Requirements:

* When no roadmap exists in Firebase for the user, display a placeholder message.
* Show a button allowing the user to generate their roadmap using AI.
* Do not show another user's roadmap.

---

### Firebase Read/Write Optimization

The system must continue to minimize Firebase usage.

Rules:

* Timer must write to Firebase **only on start and stop events**.
* Do not write timer updates every second.
* Calculate elapsed time locally.
* Avoid unnecessary snapshot listeners.
* Ensure roadmap and favorites sync do not trigger excessive reads.

The application must remain efficient enough to run continuously (24×7) within Firebase free tier limits.
