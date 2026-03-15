### Account Personalization & Per-User Data Isolation

We need to fix two issues in the system:

1. The account dropdown currently shows a fixed name ("Sinchan Chandrashekhar") instead of the logged-in user's name.
2. The productivity graph and daily mission data appear identical across different user accounts instead of showing each user's own data.

---

### 1. Display Logged-In User Name Dynamically

The user profile dropdown must display the currently authenticated user's name instead of a hardcoded value.

Implementation requirements:

• When a user logs in, fetch the user's name from the authentication system or database.
• Replace the static text with the authenticated user's display name.

Example logic:

User Login → Fetch User Data → Display user.name in UI

Example UI binding:

userDropdownName = currentUser.name

The dropdown should display:

Logged-in user's name
Import
Export
Credits
Logout

This ensures the correct name appears for every account.

---

### 2. Store Data Per User (Fix Shared Data Problem)

Currently the productivity graph and daily mission data are shared across all accounts.
We must isolate all user data using the userId.

All user-specific data must be stored under the user's unique ID.

Database structure example:

users
└── userId
├── profile
│    • name
│    • email
│
├── roadmap
│    • roadmapJSON
│
├── productivity
│    • dailyScores
│    • weeklyStats
│
└── missions
• dailyMission
• missionScore

Each logged-in user must read and write data only inside their own userId node.

---

### 3. Load Productivity Data Based on Logged-In User

When a user logs in:

1. Get currentUser.uid
2. Fetch productivity data from:

users/{uid}/productivity

3. Render the graph using only that user's data.

Example flow:

User Login
→ get currentUser.uid
→ fetch users/{uid}/productivity
→ render graph

This ensures each account sees its own statistics.

---

### 4. Save Daily Mission Progress Per User

When a mission checkbox is updated:

Save progress under the current user's record.

Example path:

users/{uid}/missions/dailyMission

Example stored data:

{
"projectWork": true,
"revision": false,
"score": 50
}

This prevents one user's progress from affecting another user.

---

### 5. Reset State When Account Changes

When switching accounts:

• Clear previous user's cached data
• Fetch new user's roadmap
• Fetch new user's productivity stats
• Update UI with the new user's name and data

Flow:

Logout → Clear local state → Login new user → Load new user's data.

---

### Expected Final Behaviour

• The profile dropdown displays the logged-in user's name.
• Each account has its own roadmap, productivity graph, and mission data.
• Switching accounts loads different data.
• No data is shared across users.
• Productivity graphs update based on each user's activity.

### Fix Roadmap Progress Logic (Auto Unlock Next Day)

We need to implement automatic roadmap progression.

When a user completes a day in the roadmap, the next day must automatically become active.

---

### 1. Roadmap Status Rules

Each day has a status field:

completed
active
locked

Rules:

Day 1 → completed
Day 2 → active
Day 3+ → locked

When the user marks a day as completed:

• That day becomes **completed**
• The next day becomes **active**
• Remaining days stay **locked**

Example before completion:

Day 1 → active
Day 2 → locked
Day 3 → locked

After completing Day 1:

Day 1 → completed
Day 2 → active
Day 3 → locked

---

### 2. Update JSON After Completion

When user checks a task:

Update roadmap JSON.

Example update logic:

Find current day
Set status → completed

Then find next day:

Set status → active

---

### 3. Example Roadmap JSON

Example after completing Day 1:

{
"topic": "Analog IC Design",
"modules": [
{
"moduleNumber": 1,
"moduleTitle": "DIODES",
"days": [
{
"day": 1,
"title": "Basic Semiconductor Physics",
"status": "completed"
},
{
"day": 2,
"title": "Different Models of Diodes",
"status": "active"
},
{
"day": 3,
"title": "Operating Point & Small Signal Analysis of Diode",
"status": "locked"
}
]
}
]
}

---

### 4. Algorithm

When checkbox is clicked:

1. Find clicked day
2. Set status = completed
3. Find next day
4. Set status = active
5. Save roadmap to database
6. Re-render roadmap UI

Pseudo code:

currentDay.status = "completed"

nextDay = getNextDay(currentDay)

if nextDay exists:
nextDay.status = "active"

saveRoadmap()

---

### 5. Database Update

Save updated roadmap under:

users/{uid}/roadmap

so progress is stored per user.

---

### Expected Final Behaviour

• Completing Day 1 unlocks Day 2
• Completing Day 2 unlocks Day 3
• Only one day remains active at a time
• Progress is saved for each user
• UI updates instantly
